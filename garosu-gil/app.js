(function () {
  function initGarosuMap() {
    var container = document.getElementById("garosu-map");
    if (!container || typeof L === "undefined") {
      return;
    }

    var route = [
      [37.5164, 127.0206],
      [37.5177, 127.0214],
      [37.5193, 127.0224],
      [37.5212, 127.0235],
      [37.5233, 127.0247]
    ];

    var map = L.map(container, {
      scrollWheelZoom: false,
      zoomControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var routeLine = L.polyline(route, {
      color: "#2f625d",
      weight: 6,
      opacity: 0.84
    }).addTo(map);

    L.circle([37.5199, 127.0227], {
      radius: 360,
      color: "#2f625d",
      weight: 1,
      fillColor: "#2f625d",
      fillOpacity: 0.1
    }).addTo(map);

    L.marker(route[0]).addTo(map).bindPopup("신사역 인근");
    L.marker(route[route.length - 1]).addTo(map).bindPopup("현대고등학교 방향");
    L.marker([37.5199, 127.0227]).addTo(map).bindPopup("가로수길 연구 구역 중심");

    map.fitBounds(routeLine.getBounds(), {
      padding: [28, 28]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGarosuMap);
  } else {
    initGarosuMap();
  }
})();
