const SEOUL_RESOLUTION = 8;
const DEFAULT_MAP_ZOOM = 11;

const regionConfigs = [
  {
    id: "seoul",
    name: "서울",
    center: [37.566535, 126.977969],
    bounds: [[37.40, 126.73], [37.72, 127.28]],
  },
  {
    id: "busan",
    name: "부산",
    center: [35.1796, 129.0756],
    bounds: [[34.98, 128.76], [35.40, 129.35]],
  },
  {
    id: "daegu",
    name: "대구",
    center: [35.8714, 128.6014],
    bounds: [[35.70, 128.35], [36.02, 128.78]],
  },
  {
    id: "incheon",
    name: "인천",
    center: [37.4563, 126.7052],
    bounds: [[37.20, 126.35], [37.70, 127.05]],
  },
  {
    id: "gwangju",
    name: "광주",
    center: [35.1595, 126.8526],
    bounds: [[35.05, 126.68], [35.27, 127.02]],
  },
  {
    id: "daejeon",
    name: "대전",
    center: [36.3504, 127.3845],
    bounds: [[36.20, 127.20], [36.50, 127.55]],
  },
  {
    id: "ulsan",
    name: "울산",
    center: [35.5384, 129.3114],
    bounds: [[35.33, 129.00], [35.72, 129.48]],
  },
  {
    id: "sejong",
    name: "세종",
    center: [36.4800, 127.2890],
    bounds: [[36.38, 127.16], [36.62, 127.42]],
  },
  {
    id: "gyeonggi",
    name: "경기",
    center: [37.4138, 127.5183],
    bounds: [[36.85, 126.35], [38.35, 128.00]],
  },
  {
    id: "gangwon",
    name: "강원",
    center: [37.8228, 128.1555],
    bounds: [[37.00, 127.05], [38.65, 129.40]],
  },
  {
    id: "chungbuk",
    name: "충북",
    center: [36.8000, 127.7000],
    bounds: [[36.00, 127.25], [37.35, 128.70]],
  },
  {
    id: "chungnam",
    name: "충남",
    center: [36.5184, 126.8000],
    bounds: [[35.95, 126.05], [37.10, 127.65]],
  },
  {
    id: "jeonbuk",
    name: "전북",
    center: [35.7175, 127.1530],
    bounds: [[35.25, 126.40], [36.20, 127.95]],
  },
  {
    id: "jeonnam",
    name: "전남",
    center: [34.8679, 126.9910],
    bounds: [[33.85, 125.90], [35.45, 128.00]],
  },
  {
    id: "gyeongbuk",
    name: "경북",
    center: [36.4919, 128.8889],
    bounds: [[35.55, 127.70], [37.55, 130.00]],
  },
  {
    id: "gyeongnam",
    name: "경남",
    center: [35.4606, 128.2132],
    bounds: [[34.55, 127.55], [35.95, 129.50]],
  },
  {
    id: "jeju",
    name: "제주",
    center: [33.4996, 126.5312],
    bounds: [[33.10, 126.10], [33.65, 127.05]],
  },
];

const state = {
  data: null,
  maps: [],
  mode: "count",
  resolution: SEOUL_RESOLUTION,
  focusBeforePopup: null,
  periods: [],
  periodIndex: 0,
  animationTimer: null,
  isPlaying: true,
  globalMaxValues: {
    count: 1,
    active: 1,
    closed: 1,
  },
};

const labels = {
  count: "전체",
  active: "영업중",
  closed: "폐업",
};

const regionAliases = {
  "서울특별시": "서울",
  "부산광역시": "부산",
  "대구광역시": "대구",
  "인천광역시": "인천",
  "광주광역시": "광주",
  "대전광역시": "대전",
  "울산광역시": "울산",
  "세종특별자치시": "세종",
  "경기도": "경기",
  "강원특별자치도": "강원",
  "강원도": "강원",
  "충청북도": "충북",
  "충청남도": "충남",
  "전북특별자치도": "전북",
  "전라북도": "전북",
  "전라남도": "전남",
  "경상북도": "경북",
  "경상남도": "경남",
  "제주특별자치도": "제주",
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function cellValue(cell) {
  return temporalCellValue(cell, state.periods[state.periodIndex], state.mode);
}

function resolutionForZoom(zoom) {
  if (zoom <= 10) return 8;
  if (zoom <= 13) return 9;
  return 10;
}

function parsePeriod(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]);
}

function periodValue(period) {
  return period ? period.value : null;
}

function temporalCellValue(cell, period, mode) {
  const value = periodValue(period);
  if (!value) return cell[mode] || 0;
  return cell.stores.reduce((count, store) => {
    const opened = parsePeriod(store.opened);
    const closed = parsePeriod(store.closed);
    if (!opened) return count;
    if (mode === "closed") return count + (closed && closed <= value ? 1 : 0);
    if (mode === "active") return count + (opened <= value && (!closed || closed > value) ? 1 : 0);
    return count + (opened <= value ? 1 : 0);
  }, 0);
}

function cellsForResolution(resolution) {
  return state.data.resolutions[String(resolution)] || [];
}

function cellsForCurrentResolution() {
  return cellsForResolution(state.resolution);
}

function colorFor(value, maxValue) {
  if (value <= 0) return "transparent";
  const t = Math.min(1, Math.log1p(value) / Math.log1p(maxValue));
  if (t > 0.78) return "#260404";
  if (t > 0.58) return "#5a0d0d";
  if (t > 0.38) return "#8f241d";
  if (t > 0.22) return "#c45a42";
  return "#f0b8a6";
}

function edgeLengthForResolution(resolution) {
  const edgeMeters = {
    6: 3724.5,
    7: 1406.5,
    8: 531.4,
    9: 200.8,
    10: 75.9,
  };
  return edgeMeters[resolution];
}

function pointInBounds(lat, lng, bounds) {
  const [[minLat, minLng], [maxLat, maxLng]] = bounds;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

function cellInBounds(cell, bounds) {
  return cell.boundary.some(([lat, lng]) => pointInBounds(lat, lng, bounds));
}

function regionFromAddress(address) {
  const token = String(address || "").split(" ", 1)[0];
  return regionAliases[token] || token;
}

function cellForRegion(cell, regionName) {
  const stores = cell.stores.filter((store) => regionFromAddress(store.address) === regionName);
  if (!stores.length) return null;
  return {
    ...cell,
    stores,
    count: stores.length,
  };
}

function cellsForCity(config, resolution = state.resolution) {
  return cellsForResolution(resolution)
    .map((cell) => cellForRegion(cell, config.name))
    .filter((cell) => cell && cellValue(cell) > 0);
}

function allCellsForCity(config, resolution = state.resolution) {
  return cellsForResolution(resolution)
    .map((cell) => cellForRegion(cell, config.name))
    .filter(Boolean);
}

function maxTemporalValueForCells(cells, mode) {
  let maxValue = 1;
  for (const cell of cells) {
    for (const period of state.periods) {
      maxValue = Math.max(maxValue, temporalCellValue(cell, period, mode));
    }
  }
  return maxValue;
}

function computeGlobalMaxValues() {
  state.globalMaxValues = {
    count: 1,
    active: 1,
    closed: 1,
  };
  for (const resolution of [8, 9, 10]) {
    const cells = cellsForResolution(resolution);
    state.globalMaxValues.count = Math.max(state.globalMaxValues.count, maxTemporalValueForCells(cells, "count"));
    state.globalMaxValues.active = Math.max(state.globalMaxValues.active, maxTemporalValueForCells(cells, "active"));
    state.globalMaxValues.closed = Math.max(state.globalMaxValues.closed, maxTemporalValueForCells(cells, "closed"));
  }
}

function cellCenter(cell) {
  const sums = cell.boundary.reduce(
    (acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 }
  );
  return [sums.lat / cell.boundary.length, sums.lng / cell.boundary.length];
}

function clusteredCenterForCity(config) {
  const cells = cellsForCity(config, state.resolution);
  if (!cells.length) return config.center;
  const densestCell = cells.reduce((best, cell) => (cell.count > best.count ? cell : best), cells[0]);
  return cellCenter(densestCell);
}

function renderSummary() {
  document.querySelector("#time-year").textContent = state.periods[state.periodIndex]?.label || "-";
  document.querySelector("#time-slider").value = state.periodIndex;
}

function cellToFeature(cell) {
  return {
    type: "Feature",
    properties: cell,
    geometry: {
      type: "Polygon",
      coordinates: [cell.boundary.map(([lat, lng]) => [lng, lat])],
    },
  };
}

function renderCityMap(cityState) {
  if (cityState.layer) {
    cityState.layer.remove();
  }

  const visibleCells = cellsForCity(cityState.config, cityState.resolution);
  const maxValue = state.globalMaxValues[state.mode] || 1;
  const features = visibleCells.map(cellToFeature);

  cityState.layer = L.geoJSON(
    { type: "FeatureCollection", features },
    {
      style(feature) {
        const value = cellValue(feature.properties);
        return {
          color: "#4a2520",
          weight: Math.min(2.2, 0.7 + Math.log1p(value) * 0.35),
          fillColor: colorFor(value, maxValue),
          fillOpacity: Math.min(0.92, 0.3 + (Math.log1p(value) / Math.log1p(maxValue)) * 0.62),
        };
      },
      onEachFeature(feature, layer) {
        const cell = feature.properties;
        layer.on("click", () => {
          state.focusBeforePopup = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          layer.closeTooltip();
        });
        layer.bindPopup(cellPopupHtml(cell), {
          maxWidth: 300,
          className: "cell-popup",
          autoPan: false,
          keepInView: false,
          offset: [0, 28],
        });
        layer.on("popupopen", (event) => {
          const popupElement = event.popup.getElement();
          const closeButton = popupElement?.querySelector(".popup-close-inline");
          closeButton?.addEventListener("click", () => cityState.map.closePopup(), { once: true });
        });
        layer.bindTooltip(`${labels[state.mode]} ${formatNumber(cellValue(cell))}개`, {
          sticky: true,
          direction: "top",
        });
      },
    }
  ).addTo(cityState.map);

}

function restoreFocusAfterPopup() {
  const target = state.focusBeforePopup;
  state.focusBeforePopup = null;
  if (!target || !document.contains(target)) return;
  window.setTimeout(() => target.focus({ preventScroll: true }), 0);
}

function resetCityMap(cityState) {
  const previousResolution = cityState.resolution;
  cityState.resolution = state.resolution;
  cityState.map.setView(cityState.initialCenter, DEFAULT_MAP_ZOOM);
  if (previousResolution === state.resolution) {
    renderCityMap(cityState);
  }
}

function renderAllMaps() {
  state.maps.forEach(renderCityMap);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cellPopupHtml(cell) {
  const period = state.periods[state.periodIndex];
  const currentValue = cellValue(cell);
  const stores = cell.stores
    .map((store) => {
      const closed = store.closed ? `폐업 ${escapeHtml(store.closed)}` : "영업중";
      const address = store.address ? `<span>${escapeHtml(store.address)}</span>` : "";
      return `
        <li>
          <strong>${escapeHtml(store.name)}</strong>
          <span>인허가 ${escapeHtml(store.opened || "-")} · ${closed}</span>
          ${address}
        </li>
      `;
    })
    .join("");

  return `
    <section class="popup-content">
      <div class="popup-scroll">
        <button type="button" class="popup-close-inline" aria-label="팝업 닫기">닫기</button>
        <p class="popup-meta">${period?.label || "-"} · ${labels[state.mode]} ${formatNumber(currentValue)}개</p>
        <code>${escapeHtml(cell.cell)}</code>
        <ol>${stores}</ol>
      </div>
    </section>
  `;
}

function renderYearChart() {
  const chart = document.querySelector("#year-chart");
  const years = state.data.years.filter((row) => row.opened || row.closed);
  const maxValue = Math.max(1, ...years.map((row) => Math.max(row.opened, row.closed)));
  let cumulative = 0;
  chart.innerHTML = years
    .map((row) => {
      const openedWidth = (row.opened / maxValue) * 100;
      const closedWidth = (row.closed / maxValue) * 100;
      const net = row.opened - row.closed;
      cumulative += net;
      const tooltip = `${row.year}년 신규 ${formatNumber(row.opened)}개, 폐업 ${formatNumber(row.closed)}개, 순증 ${formatNumber(net)}개, 누적 ${formatNumber(cumulative)}개`;
      return `
        <div class="year-row" tabindex="0" aria-label="${escapeHtml(tooltip)}" data-tooltip="${escapeHtml(tooltip)}">
          <span>${row.year}</span>
          <div class="year-bars">
            <div class="bar-track"><div class="bar opened" style="width:${openedWidth}%"></div></div>
            <div class="bar-track"><div class="bar closed" style="width:${closedWidth}%"></div></div>
          </div>
          <span>${formatNumber(net)} (${formatNumber(cumulative)})</span>
        </div>
      `;
    })
    .join("");
}

function buildMonthlyPeriods() {
  let startValue = Infinity;
  let endValue = -Infinity;
  for (const cell of cellsForCurrentResolution()) {
    for (const store of cell.stores) {
      for (const value of [parsePeriod(store.opened), parsePeriod(store.closed)]) {
        if (!value) continue;
        startValue = Math.min(startValue, value);
        endValue = Math.max(endValue, value);
      }
    }
  }
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) return [];
  const startYear = Math.floor((startValue - 1) / 12);
  const startMonth = ((startValue - 1) % 12) + 1;
  const endYear = Math.floor((endValue - 1) / 12);
  const endMonth = ((endValue - 1) % 12) + 1;
  const periods = [];
  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      if (year === startYear && month < startMonth) continue;
      if (year === endYear && month > endMonth) continue;
      periods.push({
        label: `${year}-${String(month).padStart(2, "0")}`,
        value: year * 12 + month,
      });
    }
  }
  return periods;
}

function configureTimeControls() {
  state.periods = buildMonthlyPeriods();
  state.periodIndex = Math.max(0, state.periods.length - 1);
  const slider = document.querySelector("#time-slider");
  slider.min = 0;
  slider.max = Math.max(0, state.periods.length - 1);
  slider.value = state.periodIndex;

  slider.addEventListener("input", () => {
    pauseAnimation();
    state.periodIndex = Number(slider.value);
    renderSummary();
    renderAllMaps();
  });

  document.querySelector("#resume-animation").addEventListener("click", () => {
    toggleAnimation();
  });
}

function updateAnimationButton() {
  const button = document.querySelector("#resume-animation");
  button.textContent = state.isPlaying ? "재생 중" : "재생";
  button.setAttribute("aria-pressed", state.isPlaying ? "true" : "false");
}

function pauseAnimation() {
  state.isPlaying = false;
  if (state.animationTimer) {
    window.clearInterval(state.animationTimer);
    state.animationTimer = null;
  }
  updateAnimationButton();
}

function resumeAnimation() {
  if (state.animationTimer) return;
  state.isPlaying = true;
  updateAnimationButton();
  state.animationTimer = window.setInterval(() => {
    state.periodIndex = (state.periodIndex + 1) % state.periods.length;
    renderSummary();
    renderAllMaps();
  }, 220);
}

function toggleAnimation() {
  if (state.isPlaying) {
    pauseAnimation();
  } else {
    resumeAnimation();
  }
}

function regionCountMap() {
  return new Map(state.data.regions.map((region) => [region.name, region.count]));
}

function sortedRegionConfigs() {
  const counts = regionCountMap();
  return [...regionConfigs].sort((a, b) => (counts.get(b.name) || 0) - (counts.get(a.name) || 0));
}

function createCityMap(config) {
  const count = regionCountMap().get(config.name) || 0;
  const figure = document.createElement("figure");
  figure.className = "city-map fullwidth";
  figure.innerHTML = `
    <div class="city-map-header">
      <h2>${config.name} <span>${formatNumber(count)}개</span></h2>
      <button type="button" class="map-reset-button">초기 위치</button>
    </div>
    <div id="map-${config.id}" class="map-canvas" aria-label="${config.name} 스타벅스 H3 지도"></div>
  `;
  document.querySelector("#city-maps").append(figure);

  const map = L.map(`map-${config.id}`, {
    scrollWheelZoom: true,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  }).addTo(map);

  const initialCenter = clusteredCenterForCity(config);
  map.setView(initialCenter, DEFAULT_MAP_ZOOM);
  map.on("popupclose", restoreFocusAfterPopup);
  const cityState = {
    config,
    map,
    layer: null,
    initialCenter,
    resolution: state.resolution,
  };
  map.on("zoomend", () => {
    const nextResolution = resolutionForZoom(map.getZoom());
    if (nextResolution === cityState.resolution) return;
    cityState.resolution = nextResolution;
    renderCityMap(cityState);
  });
  figure.querySelector(".map-reset-button").addEventListener("click", () => resetCityMap(cityState));
  return cityState;
}

async function init() {
  const response = await fetch("/starbucks/data/h3_heatmap.json");
  state.data = await response.json();
  configureTimeControls();
  computeGlobalMaxValues();
  state.maps = sortedRegionConfigs().map(createCityMap);

  renderSummary();
  renderAllMaps();
  renderYearChart();
  resumeAnimation();
}

init().catch((error) => {
  document.querySelector("#city-maps").textContent = `데이터를 불러오지 못했습니다: ${error.message}`;
});
