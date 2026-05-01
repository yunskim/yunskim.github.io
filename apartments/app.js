const formatter = new Intl.NumberFormat("ko-KR");
const priceFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const groups = ["85㎡대", "기타 면적"];
const groupColors = {
  "85㎡대": "#0f6b63",
  "기타 면적": "#b45f3a",
};
let cachedTrendData = null;
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
      values: groups.map((group) => ({
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
  groups.forEach((group) => {
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
    .domain(groups)
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

  groups.forEach((group) => {
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

function renderTrends(data) {
  cachedTrendData = data;
  const rows = trendRows(data);
  if (!rows.length || typeof d3 === "undefined") return;
  renderTrendLegend();
  renderTradeCountChart(rows);
  renderPriceChart(rows);
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

window.addEventListener("resize", () => {
  if (!cachedTrendData) return;
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => renderTrends(cachedTrendData), 150);
});
