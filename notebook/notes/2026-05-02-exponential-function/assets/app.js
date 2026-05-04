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
  const c = 0.7;

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
    const y = d3.scaleLinear().domain([0, Math.exp(c * 2.2)]).nice().range([topHeight, 0]);
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
    fn: (xValue) => Math.exp(c * xValue),
    derivative: (xValue) => c * Math.exp(c * xValue),
    ratioDomain: [0.1, 1.1],
    ratioTicks: [0.3, 0.7, 1.1],
    curveLabel: "y = e^(0.7x)",
    ratioLabel: "f'(x) / f(x) = 0.7",
    valueLabel: "e^(0.7x)",
    derivativeLabel: "f'(x)",
    tangentSpan: (xValue) => (xValue === 2 ? 0.28 : 0.48),
  });

  renderExponentialDemo({
    chartSelector: "#exponential-decay-chart",
    valuesSelector: "#exponential-decay-values",
    fn: (xValue) => Math.exp(-c * xValue),
    derivative: (xValue) => -c * Math.exp(-c * xValue),
    ratioDomain: [-1.1, -0.1],
    ratioTicks: [-1.1, -0.7, -0.3],
    curveLabel: "y = e^(-0.7x)",
    ratioLabel: "f'(x) / f(x) = -0.7",
    valueLabel: "e^(-0.7x)",
    derivativeLabel: "f'(x)",
    tangentSpan: () => 0.48,
  });

  function renderShiftDemo() {
    const chart = d3.select("#exponential-shift-chart");
    const chartNode = chart.node();
    const xInput = document.querySelector("#exponential-shift-x");
    const dxInput = document.querySelector("#exponential-shift-dx");
    const values = document.querySelector("#exponential-shift-values");
    if (!chartNode || !xInput || !dxInput || !values) return;

    const shiftWidth = 920;
    const shiftHeight = 430;
    const shiftMargin = { top: 28, right: 34, bottom: 58, left: 62 };
    const shiftInnerWidth = shiftWidth - shiftMargin.left - shiftMargin.right;
    const shiftInnerHeight = shiftHeight - shiftMargin.top - shiftMargin.bottom;
    const shiftXDomain = [-2, 3.2];
    const shiftX = d3.scaleLinear().domain(shiftXDomain).range([0, shiftInnerWidth]);
    const shiftY = d3.scaleLinear().range([shiftInnerHeight, 0]);
    const curvePoints = d3.range(shiftXDomain[0], shiftXDomain[1] + 0.001, 0.04)
      .map((xValue) => ({ x: xValue, y: Math.exp(xValue) }));
    const line = d3.line()
      .x((d) => shiftX(d.x))
      .y((d) => shiftY(d.y));

    chart.attr("viewBox", `0 0 ${shiftWidth} ${shiftHeight}`).selectAll("*").remove();

    const root = chart.append("g")
      .attr("transform", `translate(${shiftMargin.left},${shiftMargin.top})`);

    chart.append("defs")
      .append("clipPath")
      .attr("id", "exponential-shift-clip")
      .append("rect")
      .attr("width", shiftInnerWidth)
      .attr("height", shiftInnerHeight);

    const yGrid = root.append("g")
      .attr("class", "exponential-grid");
    root.append("g")
      .attr("class", "exponential-grid")
      .attr("transform", `translate(0,${shiftInnerHeight})`)
      .call(d3.axisBottom(shiftX).ticks(7).tickSize(-shiftInnerHeight).tickFormat(""));
    root.append("g")
      .attr("class", "exponential-axis")
      .attr("transform", `translate(0,${shiftInnerHeight})`)
      .call(d3.axisBottom(shiftX).ticks(7));
    const yAxis = root.append("g")
      .attr("class", "exponential-axis");

    const curve = root.append("path")
      .datum(curvePoints)
      .attr("class", "exponential-curve")
      .attr("clip-path", "url(#exponential-shift-clip)");

    const segment = root.append("line").attr("class", "exponential-shift-segment");
    const xGuide = root.append("line").attr("class", "exponential-shift-guide");
    const xDxGuide = root.append("line").attr("class", "exponential-shift-guide");
    const multiplierGuide = root.append("line").attr("class", "exponential-shift-multiplier");
    const xPoint = root.append("circle").attr("class", "exponential-point").attr("r", 5);
    const xDxPoint = root.append("circle").attr("class", "exponential-ratio-point").attr("r", 5);
    const xValueGuide = root.append("line").attr("class", "exponential-shift-leader");
    const xDxValueGuide = root.append("line").attr("class", "exponential-shift-leader");
    const xLabel = root.append("text").attr("class", "exponential-label");
    const xDxLabel = root.append("text").attr("class", "exponential-label");
    const xAxisLabel = root.append("text").attr("class", "exponential-shift-axis-label");
    const xDxAxisLabel = root.append("text").attr("class", "exponential-shift-axis-label");

    root.append("text")
      .attr("class", "exponential-label")
      .attr("x", shiftInnerWidth)
      .attr("y", shiftInnerHeight + 38)
      .attr("text-anchor", "end")
      .text("input");
    root.append("text")
      .attr("class", "exponential-label")
      .attr("x", 0)
      .attr("y", -10)
      .text("y = exp(input)");

    function format(value) {
      return d3.format(".4f")(value);
    }

    function update() {
      const xValue = Number(xInput.value);
      const dxValue = Number(dxInput.value);
      const xDxValue = xValue + dxValue;
      const expX = Math.exp(xValue);
      const expDx = Math.exp(dxValue);
      const expXDx = Math.exp(xDxValue);
      const linearApprox = expX * (1 + dxValue);
      const difference = Math.abs(expXDx - expX);
      const lower = Math.min(expX, expXDx);
      const upper = Math.max(expX, expXDx);
      const padding = Math.max(difference * 1.4, upper * 0.035, 0.05);
      shiftY.domain([Math.max(0, lower - padding), upper + padding]).nice();

      yGrid.call(d3.axisLeft(shiftY).ticks(5).tickSize(-shiftInnerWidth).tickFormat(""));
      yAxis.call(d3.axisLeft(shiftY).ticks(5));
      curve.attr("d", line);

      const baseY = shiftInnerHeight;
      segment
        .attr("x1", shiftX(xValue))
        .attr("x2", shiftX(xDxValue))
        .attr("y1", baseY)
        .attr("y2", baseY);
      xGuide
        .attr("x1", shiftX(xValue))
        .attr("x2", shiftX(xValue))
        .attr("y1", shiftY(expX))
        .attr("y2", baseY);
      xDxGuide
        .attr("x1", shiftX(xDxValue))
        .attr("x2", shiftX(xDxValue))
        .attr("y1", shiftY(expXDx))
        .attr("y2", baseY);
      multiplierGuide
        .attr("x1", shiftX(xValue))
        .attr("x2", shiftX(xDxValue))
        .attr("y1", shiftY(expX))
        .attr("y2", shiftY(expXDx));
      xPoint
        .attr("cx", shiftX(xValue))
        .attr("cy", shiftY(expX));
      xDxPoint
        .attr("cx", shiftX(xDxValue))
        .attr("cy", shiftY(expXDx));
      xValueGuide
        .attr("x1", 0)
        .attr("y1", shiftY(expX))
        .attr("x2", shiftX(xValue))
        .attr("y2", shiftY(expX));
      xDxValueGuide
        .attr("x1", 0)
        .attr("y1", shiftY(expXDx))
        .attr("x2", shiftX(xDxValue))
        .attr("y2", shiftY(expXDx));
      xLabel
        .attr("x", 8)
        .attr("y", shiftY(expX) - 6)
        .text(`f(x) = ${format(expX)}`);
      xDxLabel
        .attr("x", 8)
        .attr("y", shiftY(expXDx) - 6)
        .text(`f(x + dx) = f(x)f(dx) = ${format(expXDx)} ≈ f(x)(1 + dx) = ${format(linearApprox)}`);
      xAxisLabel
        .attr("x", shiftX(xValue))
        .attr("y", shiftInnerHeight + 28)
        .attr("text-anchor", "middle")
        .text(`x = ${format(xValue)}`);
      xDxAxisLabel
        .attr("x", shiftX(xDxValue))
        .attr("y", shiftInnerHeight + 46)
        .attr("text-anchor", "middle")
        .text(`x + dx = ${format(xDxValue)}`);

      values.innerHTML = `
        <div class="exponential-value-card">
          <strong>x = ${format(xValue)}</strong>
          <span>exp(x) = ${format(expX)}</span>
        </div>
        <div class="exponential-value-card">
          <strong>dx = ${format(dxValue)}</strong>
          <span>exp(dx) = ${format(expDx)}</span>
        </div>
        <div class="exponential-value-card">
          <strong>x + dx = ${format(xDxValue)}</strong>
          <span>exp(x + dx) = ${format(expXDx)}</span>
          <span>exp(x) * exp(dx) = ${format(expX * expDx)}</span>
          <span>difference = ${format(difference)}</span>
        </div>
      `;
    }

    xInput.addEventListener("input", update);
    dxInput.addEventListener("input", update);
    update();
  }

  renderShiftDemo();
})();
