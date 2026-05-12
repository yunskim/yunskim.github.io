(() => {
  const width = 920;
  const height = 540;
  const margin = { top: 28, right: 32, bottom: 54, left: 58 };
  const gap = 48;
  const innerWidth = width - margin.left - margin.right;
  const topHeight = 300;
  const bottomHeight = height - margin.top - margin.bottom - topHeight - gap;
  const xDomain = [-2.2, 2.2];
  const tangentXValues = [0, 1, 2];

  function renderExponentialDemo({
    chartSelector,
    valuesSelector,
    fn,
    derivative,
    ratioDomain,
    ratioTicks,
    curveLabel,
    ratioLabel,
    valueLabel,
    derivativeLabel,
    tangentSpan,
  }) {
    const svg = d3.select(chartSelector);
    const values = document.querySelector(valuesSelector);
    if (svg.empty() || !values) return;

    const x = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, Math.exp(2.2)]).nice().range([topHeight, 0]);
    const ratioY = d3.scaleLinear().domain(ratioDomain).range([bottomHeight, 0]);
    const curvePoints = d3.range(xDomain[0], xDomain[1] + 0.001, 0.04).map((xValue) => {
      const yValue = fn(xValue);
      return {
        x: xValue,
        y: yValue,
        ratio: derivative(xValue) / yValue,
      };
    });
    const tangentAt = tangentXValues.map((xValue) => {
      const yValue = fn(xValue);
      const slope = derivative(xValue);
      const span = tangentSpan(xValue);
      return {
        x: xValue,
        y: yValue,
        slope,
        ratio: slope / yValue,
        line: [
          { x: xValue - span, y: yValue + slope * -span },
          { x: xValue + span, y: yValue + slope * span },
        ],
      };
    });

    svg.attr("viewBox", `0 0 ${width} ${height}`).selectAll("*").remove();
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const ratioG = svg.append("g").attr("transform", `translate(${margin.left},${margin.top + topHeight + gap})`);
    const line = d3.line().x((d) => x(d.x)).y((d) => y(d.y));
    const ratioLine = d3.line().x((d) => x(d.x)).y((d) => ratioY(d.ratio));

    g.append("g")
      .attr("class", "exponential-grid")
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
    g.append("g")
      .attr("class", "exponential-grid")
      .attr("transform", `translate(0,${topHeight})`)
      .call(d3.axisBottom(x).ticks(7).tickSize(-topHeight).tickFormat(""));
    g.append("g")
      .attr("class", "exponential-axis")
      .attr("transform", `translate(0,${topHeight})`)
      .call(d3.axisBottom(x).ticks(7));
    g.append("g")
      .attr("class", "exponential-axis")
      .call(d3.axisLeft(y).ticks(5));

    g.append("path")
      .datum(curvePoints)
      .attr("class", "exponential-curve")
      .attr("d", line);

    const tangent = g.append("g")
      .selectAll("g")
      .data(tangentAt)
      .join("g");

    tangent.append("path")
      .attr("class", "exponential-tangent")
      .attr("d", (d) => line(d.line));
    tangent.append("circle")
      .attr("class", "exponential-point")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", 4.5);
    tangent.append("text")
      .attr("class", "exponential-label")
      .attr("x", (d) => x(d.x) + 8)
      .attr("y", (d) => y(d.y) - 8)
      .text((d) => `x=${d.x}, slope=${d.slope.toFixed(3)}`);

    g.append("text")
      .attr("class", "exponential-label")
      .attr("x", innerWidth)
      .attr("y", topHeight + 34)
      .attr("text-anchor", "end")
      .text("x");
    g.append("text")
      .attr("class", "exponential-label")
      .attr("x", 0)
      .attr("y", -10)
      .text(curveLabel);

    ratioG.append("g")
      .attr("class", "exponential-grid")
      .call(d3.axisLeft(ratioY).tickValues(ratioTicks).tickSize(-innerWidth).tickFormat(""));
    ratioG.append("g")
      .attr("class", "exponential-grid")
      .attr("transform", `translate(0,${bottomHeight})`)
      .call(d3.axisBottom(x).ticks(7).tickSize(-bottomHeight).tickFormat(""));
    ratioG.append("g")
      .attr("class", "exponential-axis")
      .attr("transform", `translate(0,${bottomHeight})`)
      .call(d3.axisBottom(x).ticks(7));
    ratioG.append("g")
      .attr("class", "exponential-axis")
      .call(d3.axisLeft(ratioY).tickValues(ratioTicks));
    ratioG.append("path")
      .datum(curvePoints)
      .attr("class", "exponential-ratio-line")
      .attr("d", ratioLine);
    ratioG.selectAll("circle")
      .data(tangentAt)
      .join("circle")
      .attr("class", "exponential-ratio-point")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => ratioY(d.ratio))
      .attr("r", 4.5);
    ratioG.append("text")
      .attr("class", "exponential-label")
      .attr("x", 0)
      .attr("y", -10)
      .text(ratioLabel);

    values.innerHTML = tangentAt.map((d) => `
      <div class="exponential-value-card">
        <strong>x = ${d.x}</strong>
        <span>${valueLabel} = ${d.y.toFixed(6)}</span>
        <span>${derivativeLabel} = ${d.slope.toFixed(6)}</span>
        <span>f'(x) / f(x) = ${d.ratio.toFixed(6)}</span>
      </div>
    `).join("");
  }

  renderExponentialDemo({
    chartSelector: "#exponential-slope-chart",
    valuesSelector: "#exponential-slope-values",
    fn: Math.exp,
    derivative: Math.exp,
    ratioDomain: [0.4, 1.6],
    ratioTicks: [0.5, 1, 1.5],
    curveLabel: "y = e^x",
    ratioLabel: "f'(x) / f(x) = 1",
    valueLabel: "e^x",
    derivativeLabel: "f'(x)",
    tangentSpan: (xValue) => (xValue === 2 ? 0.28 : 0.48),
  });

  renderExponentialDemo({
    chartSelector: "#exponential-decay-chart",
    valuesSelector: "#exponential-decay-values",
    fn: (xValue) => Math.exp(-xValue),
    derivative: (xValue) => -Math.exp(-xValue),
    ratioDomain: [-1.6, -0.4],
    ratioTicks: [-1.5, -1, -0.5],
    curveLabel: "y = e^-x",
    ratioLabel: "f'(x) / f(x) = -1",
    valueLabel: "e^-x",
    derivativeLabel: "f'(x)",
    tangentSpan: () => 0.48,
  });

  function renderEulerCircleDemo({ kind, chartSelector, thetaSelector, toggleSelector, valuesSelector }) {
    const svg = d3.select(chartSelector);
    const thetaInput = document.querySelector(thetaSelector);
    const toggle = document.querySelector(toggleSelector);
    const values = document.querySelector(valuesSelector);
    if (svg.empty() || !thetaInput || !toggle || !values) return;

    const demoWidth = 920;
    const demoHeight = 430;
    const plane = { cx: 210, cy: 215, r: 145 };
    const result = { x: 470, y: 70, width: 360, height: 260 };
    const valueScale = d3.scaleLinear().domain([-1.15, 1.15]).range([result.x + 34, result.x + result.width - 34]);
    const verticalValueScale = d3.scaleLinear().domain([-1.15, 1.15]).range([result.y + 230, result.y + 22]);
    const twoScale = d3.scaleLinear().domain([-2.3, 2.3]).range([result.x + 34, result.x + result.width - 34]);
    const verticalTwoScale = d3.scaleLinear().domain([-2.3, 2.3]).range([result.y + 122, result.y + 10]);
    const numberFormat = d3.format("+.3f");
    const thetaFormat = d3.format(".3f");
    const isSin = kind === "sin";
    let playing = true;
    let theta = Number(thetaInput.value);
    let lastTime = null;

    svg.attr("viewBox", `0 0 ${demoWidth} ${demoHeight}`).selectAll("*").remove();

    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", `${kind}-arrow`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("class", "circle-arrow-head");

    const planeG = svg.append("g").attr("class", "circle-plane");
    planeG.append("circle")
      .attr("class", "circle-unit")
      .attr("cx", plane.cx)
      .attr("cy", plane.cy)
      .attr("r", plane.r);
    planeG.append("line")
      .attr("class", "circle-axis")
      .attr("x1", plane.cx - plane.r - 28)
      .attr("x2", plane.cx + plane.r + 28)
      .attr("y1", plane.cy)
      .attr("y2", plane.cy);
    planeG.append("line")
      .attr("class", "circle-axis")
      .attr("x1", plane.cx)
      .attr("x2", plane.cx)
      .attr("y1", plane.cy - plane.r - 28)
      .attr("y2", plane.cy + plane.r + 28);
    planeG.append("text")
      .attr("class", "circle-label")
      .attr("x", plane.cx + plane.r + 32)
      .attr("y", plane.cy + 4)
      .text("Re");
    planeG.append("text")
      .attr("class", "circle-label")
      .attr("x", plane.cx + 7)
      .attr("y", plane.cy - plane.r - 32)
      .text("Im");

    const upperVector = planeG.append("line").attr("class", "circle-vector circle-positive-vector");
    const lowerVector = planeG.append("line").attr("class", "circle-vector circle-negative-vector");
    const upperPoint = planeG.append("circle").attr("class", "circle-point circle-positive-point").attr("r", 5.5);
    const lowerPoint = planeG.append("circle").attr("class", "circle-point circle-negative-point").attr("r", 5.5);
    const connector = planeG.append("line").attr("class", "circle-connector");
    const thetaArc = planeG.append("path").attr("class", "circle-theta-arc");
    const thetaArcEnd = planeG.append("circle").attr("class", "circle-theta-arc-end").attr("r", 3.5);
    const thetaArcLabel = planeG.append("text").attr("class", "circle-theta-arc-label");
    const resultProjection = planeG.append("line").attr("class", "circle-result-projection");
    const resultHalo = planeG.append("circle").attr("class", "circle-result-halo").attr("r", 12);
    const resultPoint = planeG.append("circle").attr("class", "circle-point circle-result-point circle-plane-result-point").attr("r", 7.5);
    const upperLabel = planeG.append("text").attr("class", "circle-label");
    const lowerLabel = planeG.append("text").attr("class", "circle-label");
    const resultLabel = planeG.append("text").attr("class", "circle-result-label");

    const resultG = svg.append("g").attr("class", "circle-result-panel");
    resultG.append("line")
      .attr("class", "circle-axis")
      .attr("x1", isSin ? result.x + result.width / 2 : valueScale(-1))
      .attr("x2", isSin ? result.x + result.width / 2 : valueScale(1))
      .attr("y1", isSin ? verticalValueScale(-1) : result.y + 190)
      .attr("y2", isSin ? verticalValueScale(1) : result.y + 190);
    resultG.selectAll(".circle-tick")
      .data([-1, -0.5, 0, 0.5, 1])
      .join("g")
      .attr("class", "circle-tick")
      .attr("transform", (d) => isSin
        ? `translate(${result.x + result.width / 2},${verticalValueScale(d)})`
        : `translate(${valueScale(d)},${result.y + 190})`)
      .call((g) => {
        g.append("line")
          .attr("x1", isSin ? -6 : 0)
          .attr("x2", isSin ? 6 : 0)
          .attr("y1", isSin ? 0 : -6)
          .attr("y2", isSin ? 0 : 6);
        g.append("text")
          .attr("x", isSin ? 16 : 0)
          .attr("y", isSin ? 4 : 24)
          .attr("text-anchor", isSin ? "start" : "middle")
          .text((d) => d);
      });
    resultG.append("text")
      .attr("class", "circle-label")
      .attr("x", result.x + result.width / 2)
      .attr("y", isSin ? result.y + result.height + 26 : result.y + 228)
      .attr("text-anchor", "middle")
      .text(kind === "cos" ? "real result: cos(theta)" : "real result: sin(theta)");

    const numeratorLine = resultG.append("line")
      .attr("class", "circle-numerator-line");
    const numeratorLabel = resultG.append("text").attr("class", "circle-label");
    const resultBar = resultG.append("line")
      .attr("class", "circle-result-bar");
    const resultDotHalo = resultG.append("circle").attr("class", "circle-result-halo").attr("r", 12);
    const resultDot = resultG.append("circle").attr("class", "circle-point circle-result-point circle-panel-result-point").attr("r", 7.5);
    const currentValueLabel = resultG.append("text").attr("class", "circle-current-value");

    function pointFor(angle) {
      return {
        re: Math.cos(angle),
        im: Math.sin(angle),
        x: plane.cx + plane.r * Math.cos(angle),
        y: plane.cy - plane.r * Math.sin(angle),
      };
    }

    function formatComplex(re, im) {
      const sign = im < 0 ? "-" : "+";
      return `${numberFormat(re)} ${sign} ${Math.abs(im).toFixed(3)}i`;
    }

    function update(nextTheta, fromInput = false) {
      theta = ((nextTheta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (!fromInput) thetaInput.value = theta.toFixed(3);

      const upper = pointFor(theta);
      const lower = pointFor(-theta);
      const cosValue = Math.cos(theta);
      const sinValue = Math.sin(theta);
      const finalValue = kind === "cos" ? cosValue : sinValue;
      const numeratorValue = kind === "cos" ? 2 * cosValue : 2 * sinValue;
      const planeResult = kind === "cos"
        ? { x: plane.cx + plane.r * cosValue, y: plane.cy, label: "average" }
        : { x: plane.cx, y: plane.cy - plane.r * sinValue, label: "difference / 2i" };
      const arcRadius = 42;
      const arcEndX = plane.cx + arcRadius * Math.cos(theta);
      const arcEndY = plane.cy - arcRadius * Math.sin(theta);
      const largeArc = theta > Math.PI ? 1 : 0;
      const arcPath = `M ${plane.cx + arcRadius} ${plane.cy} A ${arcRadius} ${arcRadius} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}`;

      upperVector
        .attr("x1", plane.cx)
        .attr("y1", plane.cy)
        .attr("x2", upper.x)
        .attr("y2", upper.y)
        .attr("marker-end", `url(#${kind}-arrow)`);
      lowerVector
        .attr("x1", plane.cx)
        .attr("y1", plane.cy)
        .attr("x2", lower.x)
        .attr("y2", lower.y)
        .attr("marker-end", `url(#${kind}-arrow)`);
      upperPoint.attr("cx", upper.x).attr("cy", upper.y);
      lowerPoint.attr("cx", lower.x).attr("cy", lower.y);
      connector
        .attr("x1", upper.x)
        .attr("y1", upper.y)
        .attr("x2", lower.x)
        .attr("y2", lower.y);
      thetaArc
        .attr("d", arcPath);
      thetaArcEnd
        .attr("cx", arcEndX)
        .attr("cy", arcEndY);
      thetaArcLabel
        .attr("x", plane.cx + (arcRadius + 18) * Math.cos(theta / 2))
        .attr("y", plane.cy - (arcRadius + 18) * Math.sin(theta / 2))
        .text(`${thetaFormat(theta)} rad`);
      resultProjection
        .attr("x1", plane.cx)
        .attr("y1", plane.cy)
        .attr("x2", planeResult.x)
        .attr("y2", planeResult.y);
      resultHalo.attr("cx", planeResult.x).attr("cy", planeResult.y);
      resultPoint.attr("cx", planeResult.x).attr("cy", planeResult.y);
      upperLabel
        .attr("x", upper.x + 10)
        .attr("y", upper.y - 8)
        .text("e^{i theta}");
      lowerLabel
        .attr("x", lower.x + 10)
        .attr("y", lower.y + 18)
        .text("e^{-i theta}");
      resultLabel
        .attr("x", planeResult.x + 10)
        .attr("y", planeResult.y - 10)
        .text(planeResult.label);

      numeratorLine
        .attr("x1", isSin ? result.x + result.width / 2 - 70 : twoScale(0))
        .attr("x2", isSin ? result.x + result.width / 2 - 70 : twoScale(numeratorValue))
        .attr("y1", isSin ? verticalTwoScale(0) : result.y + 66)
        .attr("y2", isSin ? verticalTwoScale(numeratorValue) : result.y + 66);
      numeratorLabel
        .attr("x", isSin ? result.x + result.width / 2 - 58 : twoScale(numeratorValue))
        .attr("y", isSin ? verticalTwoScale(numeratorValue) : result.y + 50)
        .attr("text-anchor", isSin ? "start" : numeratorValue >= 0 ? "start" : "end")
        .text(kind === "cos" ? `e^{i theta} + e^{-i theta} = ${numberFormat(numeratorValue)}` : `e^{i theta} - e^{-i theta} = ${numberFormat(numeratorValue)}i`);
      resultBar
        .attr("x1", isSin ? result.x + result.width / 2 : valueScale(0))
        .attr("x2", isSin ? result.x + result.width / 2 : valueScale(finalValue))
        .attr("y1", isSin ? verticalValueScale(0) : result.y + 190)
        .attr("y2", isSin ? verticalValueScale(finalValue) : result.y + 190);
      resultDot
        .attr("cx", isSin ? result.x + result.width / 2 : valueScale(finalValue))
        .attr("cy", isSin ? verticalValueScale(finalValue) : result.y + 190);
      resultDotHalo
        .attr("cx", isSin ? result.x + result.width / 2 : valueScale(finalValue))
        .attr("cy", isSin ? verticalValueScale(finalValue) : result.y + 190);
      currentValueLabel
        .attr("x", isSin ? result.x + result.width / 2 + 14 : valueScale(finalValue))
        .attr("y", isSin ? verticalValueScale(finalValue) + 4 : result.y + 168)
        .attr("text-anchor", isSin ? "start" : finalValue >= 0 ? "start" : "end")
        .text(`${kind}(theta) = ${numberFormat(finalValue)}`);

      values.innerHTML = `
        <div class="exponential-value-card">
          <strong>theta</strong>
          <span>${thetaFormat(theta)} rad</span>
          <span>${thetaFormat(theta * 180 / Math.PI)} degrees</span>
        </div>
        <div class="exponential-value-card">
          <strong>e^{i theta}</strong>
          <span>${formatComplex(upper.re, upper.im)}</span>
          <span>e^{-i theta}: ${formatComplex(lower.re, lower.im)}</span>
        </div>
        <div class="exponential-value-card">
          <strong>${kind === "cos" ? "cos theta" : "sin theta"}</strong>
          <span>${kind === "cos" ? "(e^{i theta} + e^{-i theta}) / 2" : "(e^{i theta} - e^{-i theta}) / 2i"}</span>
          <span>${numberFormat(finalValue)}</span>
        </div>
      `;
    }

    function animate(timestamp) {
      if (lastTime === null) lastTime = timestamp;
      const elapsed = timestamp - lastTime;
      lastTime = timestamp;
      if (playing) update(theta + elapsed * 0.00045);
      requestAnimationFrame(animate);
    }

    thetaInput.addEventListener("input", () => update(Number(thetaInput.value), true));
    toggle.addEventListener("click", () => {
      playing = !playing;
      toggle.textContent = playing ? "pause" : "play";
    });

    update(theta);
    requestAnimationFrame(animate);
  }

  function renderComplexHelixDemo() {
    const container = document.querySelector("#complex-helix-scene");
    const thetaInput = document.querySelector("#complex-helix-theta");
    const toggle = document.querySelector("#complex-helix-toggle");
    const values = document.querySelector("#complex-helix-values");
    const viewButtons = Array.from(document.querySelectorAll(".circle-view-buttons [data-view]"));
    if (!container || !thetaInput || !toggle || !values || !window.THREE) return;

    const three = window.THREE;
    const thetaMax = Math.PI * 6;
    const xScale = 0.52;
    const xMax = thetaMax * xScale;
    const xMid = xMax / 2;
    const numberFormat = d3.format("+.3f");
    const thetaFormat = d3.format(".3f");
    let theta = Number(thetaInput.value);
    let playing = true;
    let lastTime = null;
    let viewMode = "auto";
    let cameraTransition = null;

    const scene = new three.Scene();

    const camera = new three.OrthographicCamera(-10, 10, 4, -4, 0.1, 1000);
    const renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const world = new three.Group();
    scene.add(world);
    scene.add(new three.AmbientLight(0xffffff, 0.38));
    const keyLight = new three.DirectionalLight(0xffffff, 1.08);
    keyLight.position.set(xMid - 3, 6.5, 8.5);
    scene.add(keyLight);
    const fillLight = new three.DirectionalLight(0xf3ead8, 0.28);
    fillLight.position.set(xMid + 6, -4, -5);
    scene.add(fillLight);
    const rimLight = new three.DirectionalLight(0xd8f0ff, 0.62);
    rimLight.position.set(xMid + 2, 2, -8);
    scene.add(rimLight);

    const colors = {
      axis: 0xb8b0a4,
      grid: 0xd8d1c6,
      real: 0x2f6f68,
      imaginary: 0x8a6f3d,
      point: 0xc7472f,
    };

    function makeLine(points, color, opacity = 1) {
      const geometry = new three.BufferGeometry().setFromPoints(points);
      const material = new three.LineBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
      });
      return new three.Line(geometry, material);
    }

    function makeTrailGeometry(points, radius) {
      const curve = new three.CatmullRomCurve3(points);
      const tubularSegments = Math.max(16, points.length * 2);
      const radialSegments = 20;
      const geometry = new three.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
      const colorAttribute = [];
      const startColor = new three.Color(0x2b6f9c);
      const endColor = new three.Color(0x162f52);
      for (let i = 0; i <= tubularSegments; i += 1) {
        const color = startColor.clone().lerp(endColor, i / tubularSegments);
        for (let j = 0; j <= radialSegments; j += 1) {
          colorAttribute.push(color.r, color.g, color.b);
        }
      }
      geometry.setAttribute("color", new three.Float32BufferAttribute(colorAttribute, 3));
      return geometry;
    }

    function makeLabel(text, position, color = "#736b60", scale = [1.9, 0.54]) {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 72;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = "600 28px Gill Sans, Calibri, Noto Sans KR, sans-serif";
      context.fillStyle = color;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, canvas.width / 2, canvas.height / 2);
      const texture = new three.CanvasTexture(canvas);
      const material = new three.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new three.Sprite(material);
      sprite.position.copy(position);
      sprite.scale.set(scale[0], scale[1], 1);
      return sprite;
    }

    const helixMaterial = new three.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.34,
      metalness: 0.12,
    });
    const trailMesh = new three.Mesh(new three.BufferGeometry(), helixMaterial);
    const trailHighlight = makeLine([new three.Vector3(), new three.Vector3()], 0xf3ead8, 0.72);
    world.add(trailMesh, trailHighlight);

    world.add(makeLine([new three.Vector3(0, 0, 0), new three.Vector3(xMax, 0, 0)], colors.axis));
    world.add(makeLine([new three.Vector3(0, -1.25, 0), new three.Vector3(0, 1.25, 0)], colors.real));
    world.add(makeLine([new three.Vector3(0, 0, -1.25), new three.Vector3(0, 0, 1.25)], colors.imaginary));

    for (let t = 0; t <= thetaMax + 0.001; t += Math.PI) {
      const xPosition = t * xScale;
      world.add(makeLine([new three.Vector3(xPosition, -1.1, 0), new three.Vector3(xPosition, 1.1, 0)], colors.grid, 0.65));
      world.add(makeLine([new three.Vector3(xPosition, 0, -1.1), new three.Vector3(xPosition, 0, 1.1)], colors.grid, 0.65));
    }
    [-1, 1].forEach((v) => {
      world.add(makeLine([new three.Vector3(0, v, 0), new three.Vector3(xMax, v, 0)], colors.grid, 0.5));
      world.add(makeLine([new three.Vector3(0, 0, v), new three.Vector3(xMax, 0, v)], colors.grid, 0.5));
    });

    world.add(makeLabel("theta", new three.Vector3(xMax + 0.65, -0.08, 0)));
    const realAxisLabel = makeLabel("real axis", new three.Vector3(0, 1.05, -0.46), "#2f6f68");
    const imaginaryAxisLabel = makeLabel("imaginary axis", new three.Vector3(0, -0.34, 1.16), "#8a6f3d");
    const cosViewLabel = makeLabel("cos(theta)", new three.Vector3(xMid, -1.62, 0), "#2f6f68", [2.1, 0.58]);
    const sinViewLabel = makeLabel("sin(theta)", new three.Vector3(xMid, 0, -1.62), "#8a6f3d", [2.1, 0.58]);
    world.add(realAxisLabel, imaginaryAxisLabel, cosViewLabel, sinViewLabel);

    const pointGeometry = new three.SphereGeometry(0.13, 24, 16);
    const activePoint = new three.Mesh(pointGeometry, new three.MeshStandardMaterial({
      color: colors.point,
      roughness: 0.35,
      metalness: 0.08,
    }));
    world.add(activePoint);

    function pointForTheta(angle) {
      return new three.Vector3(angle * xScale, Math.cos(angle), Math.sin(angle));
    }

    function updateTrailGeometry(currentTheta) {
      const visibleTheta = Math.max(0.035, currentTheta);
      const segmentCount = Math.max(4, Math.ceil(visibleTheta / thetaMax * 360));
      const trailPoints = [];
      for (let i = 0; i <= segmentCount; i += 1) {
        const t = visibleTheta * i / segmentCount;
        trailPoints.push(pointForTheta(t));
      }
      trailMesh.geometry.dispose();
      trailMesh.geometry = makeTrailGeometry(trailPoints, 0.056);
      const highlightPoints = trailPoints.map((point) => point.clone().add(new three.Vector3(0.018, 0.038, 0.03)));
      trailHighlight.geometry.dispose();
      trailHighlight.geometry = new three.BufferGeometry().setFromPoints(highlightPoints);
    }

    function resize() {
      const rect = container.getBoundingClientRect();
      const widthPx = Math.max(320, Math.floor(rect.width));
      const heightPx = Math.max(300, Math.floor(rect.height));
      renderer.setSize(widthPx, heightPx, false);
      const aspect = widthPx / heightPx;
      const neededWidth = xMax + 1.5;
      const fittedHeight = neededWidth / aspect;
      const isOverview = viewMode === "auto" || viewMode === "space";
      const viewHeight = isOverview
        ? Math.max(7.8, fittedHeight * 1.28)
        : Math.max(3.4, fittedHeight);
      const viewWidth = viewHeight * aspect;
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
    }

    function cameraPose(mode) {
      if (mode === "cos") {
        return {
          position: new three.Vector3(xMid, 0, 24),
          up: new three.Vector3(0, 1, 0),
        };
      }
      if (mode === "sin") {
        return {
          position: new three.Vector3(xMid, -24, 0),
          up: new three.Vector3(0, 0, 1),
        };
      }
      return {
        position: new three.Vector3(xMid + 7.6, 6.8, 6.2),
        up: new three.Vector3(0, 1, 0),
      };
    }

    function currentCameraPose() {
      return {
        position: camera.position.clone(),
        up: camera.up.clone(),
      };
    }

    function mixPose(from, to, progress) {
      const eased = progress * progress * (3 - 2 * progress);
      return {
        position: from.position.clone().lerp(to.position, eased),
        up: from.up.clone().lerp(to.up, eased).normalize(),
      };
    }

    function autoCameraPose(timestamp) {
      const cycle = 21000;
      const phase = (timestamp % cycle) / cycle;
      const space = cameraPose("space");
      const real = cameraPose("cos");
      const imaginary = cameraPose("sin");

      if (phase < 0.22) return space;
      if (phase < 0.38) return mixPose(space, real, (phase - 0.22) / 0.16);
      if (phase < 0.50) return real;
      if (phase < 0.62) return mixPose(real, space, (phase - 0.50) / 0.12);
      if (phase < 0.80) return mixPose(space, imaginary, (phase - 0.62) / 0.18);
      if (phase < 0.92) return imaginary;
      return mixPose(imaginary, space, (phase - 0.92) / 0.08);
    }

    function autoViewPhase(timestamp) {
      const phase = (timestamp % 21000) / 21000;
      if (phase >= 0.30 && phase < 0.62) return "cos";
      if (phase >= 0.70 && phase < 0.92) return "sin";
      return "space";
    }

    function updateAxisLabels(activeView) {
      realAxisLabel.visible = activeView !== "sin";
      imaginaryAxisLabel.visible = activeView !== "cos";
      cosViewLabel.visible = activeView === "cos";
      sinViewLabel.visible = activeView === "sin";
      trailHighlight.visible = activeView === "space";
    }

    function applyCameraPose(pose) {
      camera.position.copy(pose.position);
      camera.up.copy(pose.up);
      camera.lookAt(xMid, 0, 0);
    }

    function setCamera(timestamp) {
      if (viewMode === "auto") {
        applyCameraPose(autoCameraPose(timestamp));
        updateAxisLabels(autoViewPhase(timestamp));
        return;
      }
      if (cameraTransition) {
        const progress = Math.min(1, (timestamp - cameraTransition.start) / 950);
        applyCameraPose(mixPose(cameraTransition.from, cameraTransition.to, progress));
        if (progress >= 1) cameraTransition = null;
        updateAxisLabels(progress >= 0.72 ? viewMode : "space");
        return;
      }
      applyCameraPose(cameraPose(viewMode));
      updateAxisLabels(viewMode);
    }

    function update(nextTheta, fromInput = false) {
      theta = ((nextTheta % thetaMax) + thetaMax) % thetaMax;
      if (!fromInput) thetaInput.value = theta.toFixed(3);

      const re = Math.cos(theta);
      const im = Math.sin(theta);
      activePoint.position.copy(pointForTheta(theta));
      updateTrailGeometry(theta);

      values.innerHTML = `
        <div class="exponential-value-card">
          <strong>theta</strong>
          <span>${thetaFormat(theta)} rad</span>
          <span>${thetaFormat(theta * 180 / Math.PI)} degrees</span>
        </div>
        <div class="exponential-value-card">
          <strong>e^{i theta}</strong>
          <span>${numberFormat(re)} ${im < 0 ? "-" : "+"} ${Math.abs(im).toFixed(3)}i</span>
          <span>(theta, Re, Im)</span>
        </div>
        <div class="exponential-value-card">
          <strong>same path</strong>
          <span>real view: cos(theta) = ${numberFormat(re)}</span>
          <span>imaginary view: sin(theta) = ${numberFormat(im)}</span>
        </div>
      `;
    }

    function animate(timestamp) {
      if (lastTime === null) lastTime = timestamp;
      const elapsed = timestamp - lastTime;
      lastTime = timestamp;
      if (playing) update(theta + elapsed * 0.0011);
      setCamera(timestamp);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    thetaInput.addEventListener("input", () => update(Number(thetaInput.value), true));
    toggle.addEventListener("click", () => {
      playing = !playing;
      toggle.textContent = playing ? "pause" : "play";
    });
    viewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        viewMode = button.dataset.view;
        cameraTransition = viewMode === "auto"
          ? null
          : {
              from: currentCameraPose(),
              to: cameraPose(viewMode),
              start: performance.now(),
            };
        viewButtons.forEach((candidate) => {
          candidate.setAttribute("aria-pressed", String(candidate === button));
        });
        resize();
      });
    });
    window.addEventListener("resize", resize);

    resize();
    applyCameraPose(cameraPose("space"));
    update(theta);
    requestAnimationFrame(animate);
  }

  async function renderHomerEpicycleDemo() {
    const svg = d3.select("#homer-epicycle-chart");
    const countInput = document.querySelector("#homer-epicycle-count");
    const speedInput = document.querySelector("#homer-epicycle-speed");
    const toggle = document.querySelector("#homer-epicycle-toggle");
    const values = document.querySelector("#homer-epicycle-values");
    if (svg.empty() || !countInput || !speedInput || !toggle || !values) return;

    const demoWidth = 920;
    const demoHeight = 560;
    const center = { x: 430, y: 278 };
    const thetaFormat = d3.format(".2f");
    const numberFormat = d3.format(".3f");
    let playing = true;
    let theta = 0;
    let lastTime = null;
    let pathPoints = [];

    svg.attr("viewBox", `0 0 ${demoWidth} ${demoHeight}`).selectAll("*").remove();
    svg.append("rect")
      .attr("class", "homer-stage")
      .attr("width", demoWidth)
      .attr("height", demoHeight);

    const axisG = svg.append("g").attr("class", "homer-axis");
    axisG.append("line").attr("x1", 70).attr("x2", 790).attr("y1", center.y).attr("y2", center.y);
    axisG.append("line").attr("x1", center.x).attr("x2", center.x).attr("y1", 58).attr("y2", 498);
    axisG.append("text").attr("x", 795).attr("y", center.y - 8).text("Re");
    axisG.append("text").attr("x", center.x + 10).attr("y", 55).text("Im");

    const targetPath = svg.append("path").attr("class", "homer-target-path");
    const reconstructionPath = svg.append("path").attr("class", "homer-reconstruction-path");
    const trailPath = svg.append("path").attr("class", "homer-trail-path");
    const epicycleG = svg.append("g").attr("class", "homer-epicycle-chain");
    const vectorG = svg.append("g").attr("class", "homer-vector-chain");
    const activePoint = svg.append("circle").attr("class", "homer-active-point").attr("r", 5.5);
    let reconstructionCache = { count: null, path: "" };

    function screenPoint(z, scale) {
      return {
        x: center.x + z.re * scale,
        y: center.y - z.im * scale,
      };
    }

    function complexAdd(a, b) {
      return { re: a.re + b.re, im: a.im + b.im };
    }

    function complexRotate(c, frequency, angle) {
      const phase = frequency * angle;
      const cos = Math.cos(phase);
      const sin = Math.sin(phase);
      return {
        re: c.re * cos - c.im * sin,
        im: c.re * sin + c.im * cos,
      };
    }

    async function loadHomerData() {
      const response = await fetch("./assets/homer-fourier.json");
      if (!response.ok) throw new Error(`Could not load Homer Fourier data: ${response.status}`);
      const data = await response.json();
      return {
        points: data.points.map(([re, im]) => ({ re, im })),
        coefficients: data.coefficients.map(([frequency, re, im]) => ({ frequency, re, im })),
      };
    }

    function makeLinePath(points) {
      return d3.line()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(d3.curveLinear)(points);
    }

    const homerData = await loadHomerData();
    const homerPoints = homerData.points;
    const coefficients = homerData.coefficients
      .map((coefficient) => ({
        ...coefficient,
        radius: Math.hypot(coefficient.re, coefficient.im),
      }))
      .sort((a, b) => b.radius - a.radius);
    if (!homerPoints.length) return;

    countInput.max = String(coefficients.length);
    countInput.value = String(Math.min(Number(countInput.value), coefficients.length));
    const scale = Math.min(3.25, 390 / d3.max(homerPoints, (d) => Math.hypot(d.re, d.im)));
    targetPath.attr("d", makeLinePath(homerPoints.map((point) => screenPoint(point, scale))) + "Z");

    function partialSum(angle, count) {
      let sum = { re: 0, im: 0 };
      const circles = [];
      const visibleCount = Math.min(count, coefficients.length);
      for (let i = 0; i < visibleCount; i += 1) {
        const start = sum;
        const vector = complexRotate(coefficients[i], coefficients[i].frequency, angle);
        sum = complexAdd(sum, vector);
        circles.push({ start, end: sum, radius: coefficients[i].radius });
      }
      return { point: sum, circles };
    }

    function update(nextTheta, fromAnimation = false) {
      theta = nextTheta % (Math.PI * 2);
      const count = Number(countInput.value);
      const state = partialSum(theta, count);
      const point = screenPoint(state.point, scale);

      if (reconstructionCache.count !== count) {
        const samples = 960;
        const reconstructionPoints = d3.range(samples + 1).map((index) => {
          const angle = Math.PI * 2 * index / samples;
          return screenPoint(partialSum(angle, count).point, scale);
        });
        reconstructionCache = {
          count,
          path: makeLinePath(reconstructionPoints),
        };
      }
      reconstructionPath.attr("d", reconstructionCache.path);

      if (fromAnimation) {
        if (theta < 0.03) pathPoints = [];
        pathPoints.push(point);
        if (pathPoints.length > 720) pathPoints.shift();
      } else {
        pathPoints = d3.range(0, theta + 0.001, 0.018).map((angle) => screenPoint(partialSum(angle, count).point, scale));
      }

      const visibleCircles = state.circles
        .filter((circle) => circle.radius * scale >= 0.9)
        .slice(1, 181);

      epicycleG.selectAll("circle")
        .data(visibleCircles)
        .join("circle")
        .attr("class", "homer-epicycle-circle")
        .attr("cx", (d) => screenPoint(d.start, scale).x)
        .attr("cy", (d) => screenPoint(d.start, scale).y)
        .attr("r", (d) => Math.max(0.35, d.radius * scale));

      vectorG.selectAll("line")
        .data(visibleCircles)
        .join("line")
        .attr("class", "homer-epicycle-vector")
        .attr("x1", (d) => screenPoint(d.start, scale).x)
        .attr("y1", (d) => screenPoint(d.start, scale).y)
        .attr("x2", (d) => screenPoint(d.end, scale).x)
        .attr("y2", (d) => screenPoint(d.end, scale).y);

      trailPath.attr("d", makeLinePath(pathPoints));
      activePoint.attr("cx", point.x).attr("cy", point.y);
      values.innerHTML = `
        <div class="exponential-value-card">
          <strong>samples</strong>
          <span>${homerPoints.length} outline points</span>
          <span>${count} epicycles</span>
          <span>${visibleCircles.length} visible circles</span>
        </div>
        <div class="exponential-value-card">
          <strong>theta</strong>
          <span>${thetaFormat(theta)} rad</span>
          <span>${thetaFormat(theta * 180 / Math.PI)} degrees</span>
        </div>
        <div class="exponential-value-card">
          <strong>current point</strong>
          <span>Re ${numberFormat(state.point.re)}</span>
          <span>Im ${numberFormat(state.point.im)}</span>
        </div>
      `;
    }

    function animate(timestamp) {
      if (lastTime === null) lastTime = timestamp;
      const elapsed = timestamp - lastTime;
      lastTime = timestamp;
      if (playing) {
        update(theta + elapsed * 0.00075 * Number(speedInput.value), true);
      }
      requestAnimationFrame(animate);
    }

    countInput.addEventListener("input", () => update(theta));
    speedInput.addEventListener("input", () => update(theta));
    toggle.addEventListener("click", () => {
      playing = !playing;
      toggle.textContent = playing ? "pause" : "play";
    });

    update(theta);
    requestAnimationFrame(animate);
  }

  renderEulerCircleDemo({
    kind: "cos",
    chartSelector: "#cos-euler-chart",
    thetaSelector: "#cos-euler-theta",
    toggleSelector: "#cos-euler-toggle",
    valuesSelector: "#cos-euler-values",
  });

  renderEulerCircleDemo({
    kind: "sin",
    chartSelector: "#sin-euler-chart",
    thetaSelector: "#sin-euler-theta",
    toggleSelector: "#sin-euler-toggle",
    valuesSelector: "#sin-euler-values",
  });

  renderHomerEpicycleDemo();
  renderComplexHelixDemo();
})();
