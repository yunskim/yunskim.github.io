const formatter = new Intl.NumberFormat("ko-KR");
const priceFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const trendGroups = ["85㎡대", "기타 면적"];
const floorGroups = ["저층(1-5)", "중층(6-15)", "고층(16+)"];
const defaultHawkesTypes = ["상승/유지", "하강"];
const groupColors = {
  "85㎡대": "#0f6b63",
  "기타 면적": "#b45f3a",
  "저층(1-5)": "#7a4fa3",
  "중층(6-15)": "#0f6b63",
  "고층(16+)": "#b45f3a",
  "상승/유지": "#0f6b63",
  "하강": "#b45f3a",
};
const alphaColors = {
  "상승/유지 <- 상승/유지": "#0f6b63",
  "상승/유지 <- 하강": "#7a4fa3",
  "하강 <- 상승/유지": "#b45f3a",
  "하강 <- 하강": "#4f6f9f",
};
let cachedTrendData = null;
let cachedHawkesData = null;
let resizeTimer = null;

function formatAmount(value) {
  if (!Number.isFinite(value)) return "-";
  if (value >= 10000) {
    const eok = Math.floor(value / 10000);
    const remainder = value % 10000;
    return remainder ? `${formatter.format(eok)}억 ${formatter.format(remainder)}만` : `${formatter.format(eok)}억`;
  }
  return `${formatter.format(value)}만`;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function renderSummary(data) {
  const summary = data.summary || {};
  const geocode = data.geocode || {};
  setText("#park-rio-address", data.query_address || "-");
  setText("#park-rio-count", formatter.format(summary.trade_count || 0));
  setText("#park-rio-period", `${summary.first_trade_date || "-"} - ${summary.last_trade_date || "-"}`);
  setText("#park-rio-price-range", `${formatAmount(summary.min_deal_amount_만원)} - ${formatAmount(summary.max_deal_amount_만원)}`);
  setText("#park-rio-geocode", geocode.status === "ok" ? `${geocode.lat.toFixed(6)}, ${geocode.lng.toFixed(6)}` : "지오코딩 실패");
}

function renderMap(data) {
  const mapElement = document.querySelector("#park-rio-map");
  const geocode = data.geocode || {};
  if (!mapElement || geocode.status !== "ok") return;

  const center = [geocode.lat, geocode.lng];
  const map = L.map(mapElement, {
    scrollWheelZoom: false,
  }).setView(center, 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  L.marker(center)
    .addTo(map)
    .bindPopup(`<strong>${data.apartment}</strong><br>${data.query_address}`)
    .openPopup();
}

function trendRows(data) {
  return (data.quarterly_trends || []).map((row) => {
    const [year, quarterLabel] = row.quarter.split("-Q");
    const quarter = Number(quarterLabel);
    const month = (quarter - 1) * 3;
    return {
      date: new Date(Number(year), month, 1),
      label: row.quarter,
      values: trendGroups.map((group) => ({
        group,
        count: row.groups[group].trade_count,
        price: row.groups[group].median_price_per_pyeong_만원,
      })),
    };
  });
}

function renderTrendLegend() {
  const legend = d3.select("#trend-legend");
  legend.selectAll("*").remove();
  trendGroups.forEach((group) => {
    const item = legend.append("span");
    item.append("i").style("background", groupColors[group]);
    item.append("b").text(group);
  });
}

function renderFloorLegend() {
  const legend = d3.select("#standardization-legend");
  legend.selectAll("*").remove();
  floorGroups.forEach((group) => {
    const item = legend.append("span");
    item.append("i").style("background", groupColors[group]);
    item.append("b").text(group);
  });
}

function chartSize(selector) {
  const element = document.querySelector(selector);
  const width = Math.max(320, Math.floor(element.clientWidth));
  const height = Math.max(280, Math.floor(element.clientHeight));
  return { width, height };
}

function setSvgSize(svg, width, height) {
  svg
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", null);
}

function quarterTickEvery(width) {
  if (width < 460) return 12;
  if (width < 760) return 8;
  if (width < 1040) return 6;
  return 4;
}

function yearTickCount(width) {
  if (width < 460) return 4;
  if (width < 760) return 5;
  if (width < 1040) return 7;
  return 9;
}

function countChartMargin(width) {
  return {
    top: 28,
    right: width < 460 ? 34 : 28,
    bottom: 44,
    left: width < 460 ? 42 : 52,
  };
}

function priceChartMargin(width) {
  return {
    top: 28,
    right: width < 460 ? 34 : 28,
    bottom: 44,
    left: width < 460 ? 58 : 66,
  };
}

function showTooltip(event, html) {
  const tooltip = d3.select("#trend-tooltip");
  const panel = document.querySelector(".trend-panel").getBoundingClientRect();
  tooltip
    .attr("hidden", null)
    .style("left", `${event.clientX - panel.left + 14}px`)
    .style("top", `${event.clientY - panel.top + 14}px`)
    .html(html);
}

function hideTooltip() {
  d3.select("#trend-tooltip").attr("hidden", true);
}

function renderTradeCountChart(rows) {
  const selector = "#trade-count-chart";
  const { width, height } = chartSize(selector);
  const margin = countChartMargin(width);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(selector);
  setSvgSize(svg, width, height);
  svg.selectAll("*").remove();

  const x = d3.scaleBand()
    .domain(rows.map((row) => row.label))
    .range([0, innerWidth])
    .padding(0.2);
  const subgroup = d3.scaleBand()
    .domain(trendGroups)
    .range([0, x.bandwidth()])
    .padding(0.08);
  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, (row) => d3.max(row.values, (value) => value.count)) || 1])
    .nice()
    .range([innerHeight, 0]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  g.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("font-weight", 600)
    .attr("fill", "var(--ink)")
    .text("분기별 거래 수");

  const tickEvery = quarterTickEvery(width);
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickValues(rows.filter((_, index) => index % tickEvery === 0).map((row) => row.label)).tickSizeOuter(0));
  g.append("g").call(d3.axisLeft(y).ticks(5));

  const quarter = g.selectAll(".quarter")
    .data(rows)
    .join("g")
    .attr("class", "quarter")
    .attr("transform", (row) => `translate(${x(row.label)},0)`);

  quarter.selectAll("rect")
    .data((row) => row.values.map((value) => ({ ...value, label: row.label })))
    .join("rect")
    .attr("x", (value) => subgroup(value.group))
    .attr("y", (value) => y(value.count))
    .attr("width", subgroup.bandwidth())
    .attr("height", (value) => innerHeight - y(value.count))
    .attr("fill", (value) => groupColors[value.group])
    .on("mousemove", (event, value) => showTooltip(
      event,
      `<strong>${value.label} ${value.group}</strong><span>거래 ${formatter.format(value.count)}건</span>`,
    ))
    .on("mouseleave", hideTooltip);
}

function renderPriceChart(rows) {
  const selector = "#price-chart";
  const { width, height } = chartSize(selector);
  const margin = priceChartMargin(width);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(selector);
  setSvgSize(svg, width, height);
  svg.selectAll("*").remove();

  const x = d3.scaleTime()
    .domain(d3.extent(rows, (row) => row.date))
    .range([0, innerWidth]);
  const allPrices = rows.flatMap((row) => row.values.map((value) => value.price).filter((price) => price !== null));
  const y = d3.scaleLinear()
    .domain(d3.extent(allPrices))
    .nice()
    .range([innerHeight, 0]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  g.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("font-weight", 600)
    .attr("fill", "var(--ink)")
    .text("분기별 평당가 중앙값");

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(yearTickCount(width)).tickFormat(d3.timeFormat("%Y")));
  g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((value) => `${priceFormatter.format(value)}`));

  trendGroups.forEach((group) => {
    const series = rows
      .map((row) => ({
        date: row.date,
        label: row.label,
        price: row.values.find((value) => value.group === group).price,
      }))
      .filter((row) => row.price !== null);

    const line = d3.line()
      .x((row) => x(row.date))
      .y((row) => y(row.price));

    g.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", groupColors[group])
      .attr("stroke-width", 2)
      .attr("d", line);

    g.selectAll(`circle[data-group="${group}"]`)
      .data(series)
      .join("circle")
      .attr("data-group", group)
      .attr("cx", (row) => x(row.date))
      .attr("cy", (row) => y(row.price))
      .attr("r", 2.8)
      .attr("fill", groupColors[group])
      .on("mousemove", (event, row) => showTooltip(
        event,
        `<strong>${row.label} ${group}</strong><span>평당 ${priceFormatter.format(row.price)}만원</span>`,
      ))
      .on("mouseleave", hideTooltip);
  });
}

function annualFloorRows(data) {
  return (data.standardization?.annual_floor_trends || []).map((row) => ({
    date: new Date(Number(row.year), 0, 1),
    label: row.year,
    yearMedian: row.year_median_price_per_pyeong_만원,
    values: floorGroups.map((group) => ({
      group,
      count: row.groups[group].trade_count,
      p10: row.groups[group].p10_vs_year_median_만원,
      p25: row.groups[group].p25_vs_year_median_만원,
      median: row.groups[group].median_vs_year_median_만원,
      p75: row.groups[group].p75_vs_year_median_만원,
      p90: row.groups[group].p90_vs_year_median_만원,
    })),
  }));
}

function renderStandardizationSummary(data) {
  const container = d3.select("#standardization-summary");
  if (container.empty()) return;

  const coverage = data.standardization?.coverage || {};
  const aptDongCounts = data.standardization?.apt_dong_counts || [];
  const rows = [
    ["85㎡대 거래", `${formatter.format(coverage.trade_count || 0)}건`],
    ["층 정보", `${formatter.format(coverage.floor_filled_count || 0)}건`],
    ["동 정보", `${formatter.format(coverage.apt_dong_filled_count || 0)}건`],
    ["동별 최다 표본", aptDongCounts.length ? `${aptDongCounts[0].apt_dong}동 ${formatter.format(aptDongCounts[0].count)}건` : "-"],
  ];
  container.selectAll("*").remove();
  const item = container.selectAll(":scope > div")
    .data(rows)
    .join("div");
  item.append("dt").text((row) => row[0]);
  item.append("dd").text((row) => row[1]);
}

function renderFloorPriceChart(data) {
  const rows = annualFloorRows(data);
  const selector = "#floor-price-chart";
  const element = document.querySelector(selector);
  if (!element || !rows.length) return;

  const { width, height } = chartSize(selector);
  const margin = priceChartMargin(width);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(selector);
  setSvgSize(svg, width, height);
  svg.selectAll("*").remove();

  const x = d3.scaleBand()
    .domain(rows.map((row) => row.label))
    .range([0, innerWidth]);
  const subgroup = d3.scaleBand()
    .domain(floorGroups)
    .range([0, x.bandwidth()])
    .padding(0.22);
  const allValues = rows.flatMap((row) => row.values.flatMap((value) => [value.p10, value.p90]).filter((value) => value !== null));
  const maxAbs = d3.max(allValues, (value) => Math.abs(value)) || 1;
  const y = d3.scaleLinear()
    .domain([-maxAbs, maxAbs])
    .nice()
    .range([innerHeight, 0]);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("font-weight", 600)
    .attr("fill", "var(--ink)")
    .text("85㎡대 층별 평당가 분포: 연도 중앙값 대비");

  const tickEvery = Math.max(1, Math.ceil(rows.length / yearTickCount(width)));
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickValues(rows.filter((_, index) => index % tickEvery === 0).map((row) => row.label)).tickSizeOuter(0));
  g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((value) => `${value > 0 ? "+" : ""}${priceFormatter.format(value)}`));

  g.append("line")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", y(0))
    .attr("y2", y(0))
    .attr("stroke", "var(--ink)")
    .attr("stroke-opacity", 0.45);

  const year = g.selectAll(".floor-year")
    .data(rows)
    .join("g")
    .attr("class", "floor-year")
    .attr("transform", (row) => `translate(${x(row.label)},0)`);

  const distributionRows = (row) => row.values
    .filter((value) => value.p10 !== null && value.p90 !== null)
    .map((value) => ({ ...value, year: row.label }));

  year.selectAll(".floor-range-outer")
    .data(distributionRows)
    .join("line")
    .attr("class", "floor-range-outer")
    .attr("x1", (value) => subgroup(value.group) + subgroup.bandwidth() / 2)
    .attr("x2", (value) => subgroup(value.group) + subgroup.bandwidth() / 2)
    .attr("y1", (value) => y(value.p10))
    .attr("y2", (value) => y(value.p90))
    .attr("stroke", (value) => groupColors[value.group])
    .attr("stroke-width", Math.max(2, subgroup.bandwidth() * 0.35))
    .attr("stroke-opacity", 0.22);

  year.selectAll(".floor-range-inner")
    .data(distributionRows)
    .join("line")
    .attr("class", "floor-range-inner")
    .attr("x1", (value) => subgroup(value.group) + subgroup.bandwidth() / 2)
    .attr("x2", (value) => subgroup(value.group) + subgroup.bandwidth() / 2)
    .attr("y1", (value) => y(value.p25))
    .attr("y2", (value) => y(value.p75))
    .attr("stroke", (value) => groupColors[value.group])
    .attr("stroke-width", Math.max(2, subgroup.bandwidth() * 0.55))
    .attr("stroke-opacity", 0.72);

  year.selectAll(".floor-median")
    .data(distributionRows)
    .join("circle")
      .attr("class", "floor-median")
      .attr("cx", (value) => subgroup(value.group) + subgroup.bandwidth() / 2)
      .attr("cy", (value) => y(value.median))
      .attr("r", 2.8)
      .attr("fill", (value) => groupColors[value.group])
      .attr("stroke", "var(--paper)")
      .attr("stroke-width", 1);
}

function renderStandardization(data) {
  renderStandardizationSummary(data);
  renderFloorLegend();
  renderFloorPriceChart(data);
}

function renderTrends(data) {
  cachedTrendData = data;
  const rows = trendRows(data);
  if (!rows.length || typeof d3 === "undefined") return;
  renderTrendLegend();
  renderTradeCountChart(rows);
  renderPriceChart(rows);
  renderStandardization(data);
}

function renderHawkesSummary(data) {
  const container = d3.select("#hawkes-summary");
  if (container.empty()) return;
  const fit = data.fit || {};
  const counts = data.event_counts || {};
  const hawkesTypes = data.event_types || defaultHawkesTypes;
  container.selectAll("*").remove();
  const rows = [
    ["기간", `${data.period?.start || "-"} - ${data.period?.end || "-"}`],
    [`${hawkesTypes[0]} 이벤트`, `${formatter.format(counts[hawkesTypes[0]] || 0)}건`],
    [`${hawkesTypes[1]} 이벤트`, `${formatter.format(counts[hawkesTypes[1]] || 0)}건`],
    ["half-life", `${fit.half_life_days ?? "-"}일`],
    ["log likelihood", `${fit.log_likelihood ?? "-"}`],
  ];
  const item = container.selectAll(":scope > div")
    .data(rows)
    .join("div");
  item.append("dt").text((row) => row[0]);
  item.append("dd").text((row) => row[1]);
}

function renderOneTypeSummary(data) {
  const container = d3.select("#one-type-summary");
  if (container.empty()) return;

  const oneType = data.one_type || {};
  const fit = oneType.fit || {};
  const rows = [
    ["기간", `${oneType.period?.start || "-"} - ${oneType.period?.end || "-"}`],
    ["거래 이벤트", `${formatter.format(oneType.event_count || 0)}건`],
    ["branching ratio", `${fit.branching_ratio ?? "-"}`],
    ["half-life", `${fit.half_life_days ?? "-"}일`],
    ["log likelihood", `${fit.log_likelihood ?? "-"}`],
  ];
  container.selectAll("*").remove();
  const item = container.selectAll(":scope > div")
    .data(rows)
    .join("div");
  item.append("dt").text((row) => row[0]);
  item.append("dd").text((row) => row[1]);
}

function renderHawkesAlphaChart(data) {
  const selector = "#hawkes-alpha-chart";
  const { width, height } = chartSize(selector);
  const margin = { top: 46, right: 28, bottom: 58, left: width < 460 ? 84 : 104 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(selector);
  setSvgSize(svg, width, height);
  svg.selectAll("*").remove();

  const alpha = data.fit?.alpha || {};
  const hawkesTypes = data.event_types || defaultHawkesTypes;
  const cells = hawkesTypes.flatMap((target) => hawkesTypes.map((source) => ({
    target,
    source,
    value: alpha[target]?.[source] ?? 0,
  })));
  const x = d3.scaleBand().domain(hawkesTypes).range([0, innerWidth]).padding(0.12);
  const y = d3.scaleBand().domain(hawkesTypes).range([0, innerHeight]).padding(0.12);
  const color = d3.scaleLinear()
    .domain([0, d3.max(cells, (cell) => cell.value) || 1])
    .range(["#f4efe7", "#0f6b63"]);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  g.append("text")
    .attr("x", 0)
    .attr("y", -16)
    .attr("font-weight", 600)
    .attr("fill", "var(--ink)")
    .text("Excitation matrix alpha[target, source]");

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));

  g.selectAll("rect")
    .data(cells)
    .join("rect")
    .attr("x", (cell) => x(cell.source))
    .attr("y", (cell) => y(cell.target))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", (cell) => color(cell.value));

  g.selectAll(".alpha-label-bg")
    .data(cells)
    .join("rect")
    .attr("class", "alpha-label-bg")
    .attr("x", (cell) => x(cell.source) + x.bandwidth() / 2 - 24)
    .attr("y", (cell) => y(cell.target) + y.bandwidth() / 2 - 12)
    .attr("width", 48)
    .attr("height", 22)
    .attr("rx", 2)
    .attr("fill", "var(--paper)")
    .attr("fill-opacity", 0.9);

  g.selectAll(".alpha-label")
    .data(cells)
    .join("text")
    .attr("class", "alpha-label")
    .attr("x", (cell) => x(cell.source) + x.bandwidth() / 2)
    .attr("y", (cell) => y(cell.target) + y.bandwidth() / 2 + 5)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--ink)")
    .attr("font-weight", 700)
    .text((cell) => cell.value.toFixed(3));

  svg.append("text")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", height - 12)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--muted)")
    .text("source event");
  svg.append("text")
    .attr("x", 16)
    .attr("y", margin.top + innerHeight / 2)
    .attr("transform", `rotate(-90,16,${margin.top + innerHeight / 2})`)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--muted)")
    .text("target intensity");
}

function renderOneTypeIntensityChart(data) {
  const selector = "#one-type-intensity-chart";
  const element = document.querySelector(selector);
  if (!element) return;

  const { width, height } = chartSize(selector);
  const margin = {
    top: 34,
    right: width < 460 ? 58 : 72,
    bottom: 42,
    left: width < 460 ? 52 : 62,
  };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(selector);
  setSvgSize(svg, width, height);
  svg.selectAll("*").remove();

  const rows = (data.one_type?.intensity_series || []).map((row) => ({
    date: new Date(row.date),
    intensity: row.intensity,
    events: row.events,
  }));
  const priceRows = (data.one_type?.price_series || []).map((row) => ({
    date: new Date(row.date),
    price: row.median_price_per_pyeong_만원,
  })).filter((row) => Number.isFinite(row.price));
  if (!rows.length) return;

  const x = d3.scaleTime()
    .domain(d3.extent(rows, (row) => row.date))
    .range([0, innerWidth]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, (row) => row.intensity) || 1])
    .nice()
    .range([innerHeight, 0]);
  const priceY = d3.scaleLinear()
    .domain(priceRows.length ? d3.extent(priceRows, (row) => row.price) : [0, 1])
    .nice()
    .range([innerHeight, 0]);
  const line = d3.line()
    .x((row) => x(row.date))
    .y((row) => y(row.intensity));
  const priceLine = d3.line()
    .defined((row) => Number.isFinite(row.price))
    .x((row) => x(row.date))
    .y((row) => priceY(row.price))
    .curve(d3.curveMonotoneX);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(yearTickCount(width)).tickFormat(d3.timeFormat("%Y")));
  g.append("g").call(d3.axisLeft(y).ticks(5));
  if (priceRows.length) {
    g.append("g")
      .attr("transform", `translate(${innerWidth},0)`)
      .call(d3.axisRight(priceY).ticks(5).tickFormat((value) => `${priceFormatter.format(value)}`));
  }

  g.append("path")
    .datum(rows)
    .attr("fill", "none")
    .attr("stroke", groupColors["85㎡대"])
    .attr("stroke-width", 2)
    .attr("d", line);

  if (priceRows.length) {
    g.append("path")
      .datum(priceRows)
      .attr("fill", "none")
      .attr("stroke", alphaColors["하강 <- 하강"])
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.88)
      .attr("d", priceLine);
  }

  const eventRows = rows.filter((row) => row.events > 0);
  g.selectAll("line[data-one-type-event]")
    .data(eventRows)
    .join("line")
    .attr("data-one-type-event", "trade")
    .attr("x1", (row) => x(row.date))
    .attr("x2", (row) => x(row.date))
    .attr("y1", innerHeight)
    .attr("y2", innerHeight - 10)
    .attr("stroke", groupColors["85㎡대"])
    .attr("stroke-opacity", 0.35);

  const legend = g.append("g")
    .attr("transform", `translate(${Math.max(0, innerWidth - 172)},${width < 460 ? 2 : 0})`);
  [
    ["강도", groupColors["85㎡대"]],
    ["평당가 중앙값", alphaColors["하강 <- 하강"]],
  ].forEach(([label, color], index) => {
    const item = legend.append("g").attr("transform", `translate(0,${index * 18})`);
    item.append("line")
      .attr("x1", 0)
      .attr("x2", 16)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", color)
      .attr("stroke-width", 2);
    item.append("text")
      .attr("x", 22)
      .attr("y", 4)
      .attr("fill", "var(--muted)")
      .text(label);
  });

  g.append("text")
    .attr("x", 0)
    .attr("y", -12)
    .attr("font-weight", 600)
    .attr("fill", "var(--ink)")
    .text("1-type fitted daily intensity and observed price");
}

function renderOneTypePriceChangeChart(data) {
  const selector = "#one-type-price-change-chart";
  const element = document.querySelector(selector);
  if (!element) return;

  const { width, height } = chartSize(selector);
  const margin = {
    top: 34,
    right: width < 460 ? 58 : 72,
    bottom: 42,
    left: width < 460 ? 52 : 62,
  };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(selector);
  setSvgSize(svg, width, height);
  svg.selectAll("*").remove();

  const rows = (data.one_type?.intensity_series || []).map((row) => ({
    date: new Date(row.date),
    intensity: row.intensity,
    events: row.events,
  }));
  const changeRows = (data.one_type?.price_series || []).map((row) => ({
    date: new Date(row.date),
    changeRate: row.price_change_180d_pct,
  })).filter((row) => Number.isFinite(row.changeRate));
  if (!rows.length) return;

  const x = d3.scaleTime()
    .domain(d3.extent(rows, (row) => row.date))
    .range([0, innerWidth]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, (row) => row.intensity) || 1])
    .nice()
    .range([innerHeight, 0]);
  const changeMax = d3.max(changeRows, (row) => Math.abs(row.changeRate)) || 1;
  const changeY = d3.scaleLinear()
    .domain([-changeMax, changeMax])
    .nice()
    .range([innerHeight, 0]);
  const line = d3.line()
    .x((row) => x(row.date))
    .y((row) => y(row.intensity));
  const changeLine = d3.line()
    .defined((row) => Number.isFinite(row.changeRate))
    .x((row) => x(row.date))
    .y((row) => changeY(row.changeRate))
    .curve(d3.curveMonotoneX);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(yearTickCount(width)).tickFormat(d3.timeFormat("%Y")));
  g.append("g").call(d3.axisLeft(y).ticks(5));
  if (changeRows.length) {
    g.append("g")
      .attr("transform", `translate(${innerWidth},0)`)
      .call(d3.axisRight(changeY).ticks(5).tickFormat((value) => `${value > 0 ? "+" : ""}${priceFormatter.format(value)}%`));
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", changeY(0))
      .attr("y2", changeY(0))
      .attr("stroke", alphaColors["하강 <- 하강"])
      .attr("stroke-opacity", 0.28)
      .attr("stroke-dasharray", "4 4");
  }

  g.append("path")
    .datum(rows)
    .attr("fill", "none")
    .attr("stroke", groupColors["85㎡대"])
    .attr("stroke-width", 2)
    .attr("d", line);

  if (changeRows.length) {
    g.append("path")
      .datum(changeRows)
      .attr("fill", "none")
      .attr("stroke", alphaColors["하강 <- 하강"])
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.88)
      .attr("d", changeLine);
  }

  const eventRows = rows.filter((row) => row.events > 0);
  g.selectAll("line[data-one-type-event]")
    .data(eventRows)
    .join("line")
    .attr("data-one-type-event", "trade")
    .attr("x1", (row) => x(row.date))
    .attr("x2", (row) => x(row.date))
    .attr("y1", innerHeight)
    .attr("y2", innerHeight - 10)
    .attr("stroke", groupColors["85㎡대"])
    .attr("stroke-opacity", 0.35);

  const legend = g.append("g")
    .attr("transform", `translate(${Math.max(0, innerWidth - 172)},${width < 460 ? 2 : 0})`);
  [
    ["강도", groupColors["85㎡대"]],
    ["180일 변화율", alphaColors["하강 <- 하강"]],
  ].forEach(([label, color], index) => {
    const item = legend.append("g").attr("transform", `translate(0,${index * 18})`);
    item.append("line")
      .attr("x1", 0)
      .attr("x2", 16)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", color)
      .attr("stroke-width", 2);
    item.append("text")
      .attr("x", 22)
      .attr("y", 4)
      .attr("fill", "var(--muted)")
      .text(label);
  });

  g.append("text")
    .attr("x", 0)
    .attr("y", -12)
    .attr("font-weight", 600)
    .attr("fill", "var(--ink)")
    .text("1-type fitted daily intensity and 180-day price change");
}

function formatCorrelation(value) {
  return Number.isFinite(value) ? value.toFixed(3) : "-";
}

function formatLag(value) {
  return Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value}일` : "-";
}

function renderOneTypeCorrelationSummary(data) {
  const container = d3.select("#one-type-correlation-summary");
  if (container.empty()) return;

  const correlation = data.one_type?.price_change_correlation || {};
  const sameDay = correlation.same_day || {};
  const strongest = correlation.strongest_abs_pearson || {};
  const lags = (correlation.lags || []).filter((row) => Number.isFinite(row.pearson));
  const pearsonValues = lags.map((row) => row.pearson);
  const positiveLags = lags.filter((row) => row.lag_days > 0);
  const negativeLags = lags.filter((row) => row.lag_days < 0);
  const bestPositive = d3.max(positiveLags, (row) => row.pearson);
  const bestNegative = d3.min(negativeLags, (row) => row.pearson);
  const rows = [
    ["조사 lag", `${formatter.format(lags.length)}개`],
    ["lag 범위", lags.length ? `${formatLag(d3.min(lags, (row) => row.lag_days))} - ${formatLag(d3.max(lags, (row) => row.lag_days))}` : "-"],
    ["same-day Pearson", formatCorrelation(sameDay.pearson)],
    ["same-day Spearman", formatCorrelation(sameDay.spearman)],
    ["Pearson 범위", pearsonValues.length ? `${formatCorrelation(d3.min(pearsonValues))} - ${formatCorrelation(d3.max(pearsonValues))}` : "-"],
    ["양수 lag 최고", formatCorrelation(bestPositive)],
    ["음수 lag 최저", formatCorrelation(bestNegative)],
    ["max |Pearson| lag", formatLag(strongest.lag_days)],
    ["max |Pearson|", formatCorrelation(strongest.pearson)],
  ];

  container.selectAll("*").remove();
  const item = container.selectAll(":scope > div")
    .data(rows)
    .join("div");
  item.append("dt").text((row) => row[0]);
  item.append("dd").text((row) => row[1]);
}

function renderOneTypeCorrelationChart(data) {
  const selector = "#one-type-correlation-chart";
  const element = document.querySelector(selector);
  if (!element) return;

  const { width, height } = chartSize(selector);
  const margin = {
    top: 42,
    right: width < 460 ? 24 : 30,
    bottom: 48,
    left: width < 460 ? 52 : 62,
  };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(selector);
  setSvgSize(svg, width, height);
  svg.selectAll("*").remove();

  const rows = (data.one_type?.price_change_correlation?.lags || [])
    .map((row) => ({
      lag: row.lag_days,
      pearson: row.pearson,
      spearman: row.spearman,
      pairCount: row.pair_count,
    }))
    .filter((row) => Number.isFinite(row.lag) && Number.isFinite(row.pearson));
  if (!rows.length) return;

  const x = d3.scaleLinear()
    .domain(d3.extent(rows, (row) => row.lag))
    .nice()
    .range([0, innerWidth]);
  const y = d3.scaleLinear()
    .domain([-1, 1])
    .range([innerHeight, 0]);
  const line = d3.line()
    .x((row) => x(row.lag))
    .y((row) => y(row.pearson));
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(width < 460 ? 5 : 7).tickFormat((value) => `${value > 0 ? "+" : ""}${value}`));
  g.append("g").call(d3.axisLeft(y).ticks(5));

  g.append("line")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", y(0))
    .attr("y2", y(0))
    .attr("stroke", "var(--rule)");
  g.append("line")
    .attr("x1", x(0))
    .attr("x2", x(0))
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", "var(--rule)")
    .attr("stroke-dasharray", "4 4");

  g.append("path")
    .datum(rows)
    .attr("fill", "none")
    .attr("stroke", alphaColors["하강 <- 하강"])
    .attr("stroke-width", 2)
    .attr("d", line);

  g.selectAll("circle")
    .data(rows)
    .join("circle")
    .attr("cx", (row) => x(row.lag))
    .attr("cy", (row) => y(row.pearson))
    .attr("r", 3)
    .attr("fill", alphaColors["하강 <- 하강"]);

  g.append("text")
    .attr("x", 0)
    .attr("y", -16)
    .attr("font-weight", 600)
    .attr("fill", "var(--ink)")
    .text("Lag correlation: intensity(t) vs 180-day price change(t + lag)");
  svg.append("text")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", height - 12)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--muted)")
    .text("lag days");
}

function renderHawkesIntensityChart(data) {
  const selector = "#hawkes-intensity-chart";
  const { width, height } = chartSize(selector);
  const margin = {
    top: 34,
    right: width < 460 ? 34 : 28,
    bottom: 42,
    left: width < 460 ? 52 : 62,
  };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(selector);
  setSvgSize(svg, width, height);
  svg.selectAll("*").remove();

  const rows = (data.intensity_series || []).map((row) => ({
    date: new Date(row.date),
    intensity: row.intensity,
    events: row.events,
  }));
  if (!rows.length) return;
  const hawkesTypes = data.event_types || defaultHawkesTypes;

  const x = d3.scaleTime()
    .domain(d3.extent(rows, (row) => row.date))
    .range([0, innerWidth]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, (row) => d3.max(hawkesTypes, (type) => row.intensity[type])) || 1])
    .nice()
    .range([innerHeight, 0]);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(yearTickCount(width)).tickFormat(d3.timeFormat("%Y")));
  g.append("g").call(d3.axisLeft(y).ticks(5));

  hawkesTypes.forEach((group) => {
    const line = d3.line()
      .x((row) => x(row.date))
      .y((row) => y(row.intensity[group]));
    g.append("path")
      .datum(rows)
      .attr("fill", "none")
      .attr("stroke", groupColors[group])
      .attr("stroke-width", 2)
      .attr("d", line);

    const eventRows = rows.filter((row) => row.events[group] > 0);
    g.selectAll(`line[data-hawkes-event="${group}"]`)
      .data(eventRows)
      .join("line")
      .attr("data-hawkes-event", group)
      .attr("x1", (row) => x(row.date))
      .attr("x2", (row) => x(row.date))
      .attr("y1", innerHeight)
      .attr("y2", innerHeight - 10)
      .attr("stroke", groupColors[group])
      .attr("stroke-opacity", 0.35);
  });

  g.append("text")
    .attr("x", 0)
    .attr("y", -12)
    .attr("font-weight", 600)
    .attr("fill", "var(--ink)")
    .text("Fitted daily intensity and observed event rug");
}

function renderMovingWindowChart(data) {
  const selector = "#hawkes-moving-window-chart";
  const element = document.querySelector(selector);
  if (!element) return;

  const { width, height } = chartSize(selector);
  const margin = {
    top: 42,
    right: width < 560 ? 24 : 170,
    bottom: width < 560 ? 118 : 44,
    left: width < 460 ? 48 : 58,
  };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(selector);
  setSvgSize(svg, width, height);
  svg.selectAll("*").remove();

  const hawkesTypes = data.event_types || defaultHawkesTypes;
  const windows = data.moving_windows?.fits || [];
  if (!windows.length) return;

  const series = hawkesTypes.flatMap((target) => hawkesTypes.map((source) => {
    const label = `${target} <- ${source}`;
    return {
      label,
      values: windows.map((window) => ({
        date: new Date(window.midpoint),
        value: window.fit?.alpha?.[target]?.[source] ?? 0,
      })),
    };
  }));
  const allValues = series.flatMap((item) => item.values);
  const x = d3.scaleTime()
    .domain(d3.extent(allValues, (row) => row.date))
    .range([0, innerWidth]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(allValues, (row) => row.value) || 1])
    .nice()
    .range([innerHeight, 0]);
  const line = d3.line()
    .x((row) => x(row.date))
    .y((row) => y(row.value));
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("text")
    .attr("x", 0)
    .attr("y", -16)
    .attr("font-weight", 600)
    .attr("fill", "var(--ink)")
    .text("Moving window alpha estimates");

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(yearTickCount(width)).tickFormat(d3.timeFormat("%Y")));
  g.append("g").call(d3.axisLeft(y).ticks(5));

  series.forEach((item) => {
    g.append("path")
      .datum(item.values)
      .attr("fill", "none")
      .attr("stroke", alphaColors[item.label] || "var(--ink)")
      .attr("stroke-width", 2)
      .attr("d", line);

    g.selectAll(`circle[data-alpha-series="${item.label}"]`)
      .data(item.values)
      .join("circle")
      .attr("data-alpha-series", item.label)
      .attr("cx", (row) => x(row.date))
      .attr("cy", (row) => y(row.value))
      .attr("r", 2.6)
      .attr("fill", alphaColors[item.label] || "var(--ink)");
  });

  const legend = width < 560
    ? svg.append("g").attr("transform", `translate(${margin.left},${height - 78})`)
    : svg.append("g").attr("transform", `translate(${margin.left + innerWidth + 18},${margin.top + 4})`);
  series.forEach((item, index) => {
    const row = legend.append("g").attr("transform", `translate(0,${index * 20})`);
    row.append("line")
      .attr("x1", 0)
      .attr("x2", 16)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", alphaColors[item.label] || "var(--ink)")
      .attr("stroke-width", 2);
    row.append("text")
      .attr("x", 22)
      .attr("y", 4)
      .attr("fill", "var(--muted)")
      .text(item.label);
  });
}

function renderHawkes(data) {
  cachedHawkesData = data;
  if (typeof d3 === "undefined") return;
  renderOneTypeSummary(data);
  renderOneTypeIntensityChart(data);
  renderOneTypePriceChangeChart(data);
  renderOneTypeCorrelationSummary(data);
  renderOneTypeCorrelationChart(data);
  renderHawkesSummary(data);
  renderHawkesAlphaChart(data);
  renderHawkesIntensityChart(data);
  renderMovingWindowChart(data);
}

async function initHawkes() {
  try {
    const response = await fetch("/apartments/data/park_rio_hawkes_2type.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderHawkes(await response.json());
  } catch (error) {
    setText("#hawkes-summary", "Hawkes 결과 데이터를 불러오지 못했습니다.");
  }
}

async function initParkRioMap() {
  try {
    const response = await fetch("/apartments/data/park_rio_location.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    renderSummary(data);
    renderMap(data);
    renderTrends(data);
  } catch (error) {
    setText("#park-rio-address", "파크리오 위치 데이터를 불러오지 못했습니다.");
  }
}

initParkRioMap();
initHawkes();

window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (cachedTrendData) renderTrends(cachedTrendData);
    if (cachedHawkesData) renderHawkes(cachedHawkesData);
  }, 150);
});
