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
})();
