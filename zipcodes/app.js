const state = {
  map: null,
  layer: null,
  addressRequestId: 0,
  shapeRequestId: 0,
};

const palette = [
  "#1f77b4",
  "#d62728",
  "#2ca02c",
  "#9467bd",
  "#ff7f0e",
  "#17becf",
  "#e377c2",
  "#bcbd22",
  "#8c564b",
  "#4c78a8",
  "#f58518",
  "#54a24b",
  "#b279a2",
  "#e45756",
  "#72b7b2",
  "#9d755d",
];

function normalizePrefix(value) {
  return value.replace(/\D/g, "").slice(0, 5);
}

function shapeDataPrefix(prefix) {
  if (prefix.length === 5) return prefix.slice(0, 4);
  return prefix;
}

function shapeDataUrl(prefix) {
  const dataPrefix = shapeDataPrefix(prefix);
  if (!dataPrefix) return "/zipcodes/data/h3_prefix/root.json";
  return `/zipcodes/data/h3_prefix/${dataPrefix.length}/${dataPrefix}.json`;
}

async function loadShapeData(prefix) {
  const response = await fetch(shapeDataUrl(prefix));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function visibleShapes(prefix, data) {
  if (prefix.length === 5) {
    return data.children.filter((shape) => shape.prefix === prefix);
  }
  return data.children;
}

function polygonStyle(index, prefix) {
  const color = palette[index % palette.length];
  return {
    color,
    fillColor: color,
    fillOpacity: prefix.length >= 4 ? 0.58 : 0.44,
    opacity: 0.95,
    weight: prefix.length >= 4 ? 1.5 : 1,
  };
}

function selectPrefix(prefix) {
  const input = document.querySelector("#prefix-input");
  input.value = prefix;
  drawRegions(prefix);
  input.focus();
}

async function drawRegions(prefix) {
  const requestId = state.shapeRequestId + 1;
  state.shapeRequestId = requestId;
  if (prefix.length !== 5) {
    state.addressRequestId += 1;
    document.querySelector("#address-summary").innerHTML = "";
    document.querySelector("#address-details").innerHTML = "";
  }

  if (state.layer) {
    state.layer.remove();
  }
  state.layer = L.layerGroup().addTo(state.map);

  try {
    const data = await loadShapeData(prefix);
    if (requestId !== state.shapeRequestId) return;
    const shapes = visibleShapes(prefix, data);
    const bounds = [];

    shapes.forEach((shape, index) => {
      shape.cells.forEach((cell) => {
        L.polygon(cell.boundary, polygonStyle(index, prefix))
          .on("click", () => selectPrefix(shape.prefix))
          .bindTooltip(`${shape.prefix} · ${shape.count.toLocaleString("ko-KR")}개 좌표`, { sticky: true })
          .addTo(state.layer);
        bounds.push(...cell.boundary);
      });
    });

    if (bounds.length) {
      state.map.fitBounds(bounds, { padding: [36, 36] });
    } else {
      state.map.setView([36.4, 127.8], 7);
    }

    renderSummary(prefix, shapes, data);
    renderAddressDetails(prefix);
  } catch (error) {
    if (requestId !== state.shapeRequestId) return;
    state.map.setView([36.4, 127.8], 7);
    renderSummary(prefix, [], null, error);
    renderQuickPrefixes(prefix, []);
    renderAddressDetails(prefix);
  }
}

function renderSummary(prefix, shapes, data, error) {
  const summary = document.querySelector("#prefix-summary");
  const label = prefix || "전체";
  if (error) {
    summary.textContent = `${label}: H3 데이터를 불러오지 못했습니다.`;
    return;
  }
  const count = shapes.reduce((sum, shape) => sum + shape.count, 0);
  const resolution = data ? data.child_resolution : "-";
  summary.textContent = `${label}: H3 해상도 ${resolution} · ${shapes.length.toLocaleString("ko-KR")}개 prefix · ${count.toLocaleString("ko-KR")}개 좌표`;
  renderQuickPrefixes(prefix, shapes);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function quickPrefixes(shapes) {
  return shapes.map((shape) => shape.prefix).slice(0, 16);
}

function renderQuickPrefixes(prefix, shapes) {
  const container = document.querySelector("#quick-prefixes");
  const candidates = quickPrefixes(shapes);
  const previousPrefix = prefix.slice(0, -1);
  const previousControl = prefix
    ? `<button class="quick-prefix-back" type="button" data-prefix="${previousPrefix}" aria-label="이전 입력 단계">${previousPrefix || "전체"}</button><span class="quick-prefix-divider" aria-hidden="true"></span>`
    : "";
  container.innerHTML = previousControl + candidates
    .map((candidate) => `<button type="button" data-prefix="${candidate}">${candidate}</button>`)
    .join("");
}

async function renderAddressDetails(prefix) {
  const summary = document.querySelector("#address-summary");
  const container = document.querySelector("#address-details");
  const requestId = state.addressRequestId + 1;
  state.addressRequestId = requestId;

  if (prefix.length !== 5) {
    summary.innerHTML = "";
    container.innerHTML = "";
    return;
  }

  summary.textContent = "주소를 불러오는 중입니다.";
  container.innerHTML = "";

  try {
    const response = await fetch(`/zipcodes/data/zipcode_addresses/${prefix.slice(0, 2)}/${prefix}.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const details = await response.json();
    if (requestId !== state.addressRequestId) return;
    const addresses = details.addresses || [];
    const noteId = `sn-representative-address-${prefix}`;

    summary.innerHTML = `${escapeHtml(prefix)}: ${addresses.length.toLocaleString("ko-KR")}개 주소<label for="${noteId}" class="margin-toggle sidenote-number"></label><input type="checkbox" id="${noteId}" class="margin-toggle"><span class="sidenote">지오코딩 좌표는 이 목록 전체가 아니라 대표 주소 하나로 만들었습니다. 대표 주소는 건물명이나 다량배달처명이 있는 행을 우선하고, 그다음 도로명과 건물번호가 있는 행, 지번 본번이 있는 행 순서로 선택했습니다. 같은 조건에서는 원본에서 먼저 나온 행을 사용합니다.</span>`;
    container.innerHTML = addresses.map((address) => `
      <li>
        <strong>${escapeHtml(address.road_address || address.jibun_address)}</strong>
        ${address.jibun_address ? `<span>${escapeHtml(address.jibun_address)}</span>` : ""}
        ${address.building_name ? `<small>${escapeHtml(address.building_name)}</small>` : ""}
      </li>
    `).join("");
  } catch (error) {
    if (requestId !== state.addressRequestId) return;
    summary.textContent = `주소 목록을 불러오지 못했습니다: ${error.message}`;
    container.innerHTML = "";
  }
}

function configureControls() {
  const input = document.querySelector("#prefix-input");
  input.addEventListener("input", () => {
    const prefix = normalizePrefix(input.value);
    input.value = prefix;
    drawRegions(prefix);
  });

  document.querySelector("#quick-prefixes").addEventListener("click", (event) => {
    const button = event.target.closest("[data-prefix]");
    if (!button) return;
    const prefix = button.dataset.prefix || "";
    selectPrefix(prefix);
  });
}

async function init() {
  state.map = L.map("map", {
    scrollWheelZoom: true,
    zoomControl: true,
    zoomSnap: 0.25,
    zoomDelta: 0.25,
    preferCanvas: true,
  });
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  }).addTo(state.map);
  configureControls();
  await drawRegions(normalizePrefix(document.querySelector("#prefix-input").value));
}

init().catch((error) => {
  document.querySelector("#prefix-summary").textContent = `데이터를 불러오지 못했습니다: ${error.message}`;
});
