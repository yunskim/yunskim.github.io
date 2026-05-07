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
})();
