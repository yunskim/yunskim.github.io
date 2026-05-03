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

  function renderNormalGammaDiscount() {
    const svg = d3.select("#normal-gamma-discount-chart");
    if (svg.empty()) return;

    const chartWidth = 920;
    const chartHeight = 760;
    const chartMargin = { top: 42, right: 36, bottom: 58, left: 58 };
    const rowGap = 82;
    const columnGap = 54;
    const rowHeight = (chartHeight - chartMargin.top - chartMargin.bottom - rowGap) / 2;
    const panelWidth = (chartWidth - chartMargin.left - chartMargin.right - columnGap) / 2;
    const densityHeight = rowHeight;
    const discountHeight = rowHeight;
    const normalX = d3.scaleLinear().domain([-3.2, 3.2]).range([0, panelWidth]);
    const normalDensityY = d3.scaleLinear().domain([0, 0.42]).range([densityHeight, 0]);
    const normalDiscountY = d3.scaleLinear().domain([-3.2, 3.2]).range([discountHeight, 0]);
    const gammaRawX = d3.scaleLinear().domain([0, 9.6]).range([0, panelWidth]);
    const gammaRatioX = d3.scaleLinear().domain([0, 3.2]).range([0, panelWidth]);
    const gammaDensityY = d3.scaleLinear().domain([0, 0.23]).range([densityHeight, 0]);
    const gammaDiscountY = d3.scaleLinear().domain([-3.2, 6.8]).range([discountHeight, 0]);
    const normalDensityLine = d3.line()
      .x((d) => normalX(d.x))
      .y((d) => normalDensityY(d.density));
    const normalDiscountLine = d3.line()
      .x((d) => normalX(d.x))
      .y((d) => normalDiscountY(d.discount));
    const gammaDensityLine = d3.line()
      .x((d) => gammaRawX(d.x))
      .y((d) => gammaDensityY(d.density));
    const gammaDiscountLine = d3.line()
      .x((d) => gammaRatioX(d.ratio))
      .y((d) => gammaDiscountY(d.discount));
    const normalDensityPoints = d3.range(-3.2, 3.201, 0.05).map((xValue) => ({
      x: xValue,
      density: Math.exp(-0.5 * xValue * xValue) / Math.sqrt(2 * Math.PI),
    }));
    const normalPoints = d3.range(-3, 3.01, 0.05).map((distance) => ({
      x: distance,
      discount: distance,
    }));
    const gammaShape = 4;
    const gammaRate = 1;
    const gammaMode = (gammaShape - 1) / gammaRate;
    const gammaDensityPoints = d3.range(0.05, 9.601, 0.05).map((xValue) => ({
      x: xValue,
      density: Math.pow(gammaRate, gammaShape) * Math.pow(xValue, gammaShape - 1) * Math.exp(-gammaRate * xValue) / 6,
    }));
    const gammaPoints = d3.range(0.05, 3.201, 0.05).map((ratio) => ({
      ratio,
      discount: 3 * (ratio - 1),
    }));
    const normalExamples = [-3, -2, -1, 0, 1, 2, 3].map((distance) => ({
      x: distance,
      discount: distance,
      density: Math.exp(-0.5 * distance * distance) / Math.sqrt(2 * Math.PI),
    }));
    const gammaExamples = [0.5, 1, 2, 3].map((ratio) => ({
      ratio,
      x: gammaMode * ratio,
      discount: 3 * (ratio - 1),
      density: Math.pow(gammaMode * ratio, gammaShape - 1) * Math.exp(-gammaMode * ratio) / 6,
    }));

    svg.attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`).selectAll("*").remove();
    const normalDensityPanel = svg.append("g").attr("transform", `translate(${chartMargin.left},${chartMargin.top})`);
    const normalDiscountPanel = svg.append("g").attr("transform", `translate(${chartMargin.left + panelWidth + columnGap},${chartMargin.top})`);
    const gammaDensityPanel = svg.append("g").attr("transform", `translate(${chartMargin.left},${chartMargin.top + rowHeight + rowGap})`);
    const gammaDiscountPanel = svg.append("g").attr("transform", `translate(${chartMargin.left + panelWidth + columnGap},${chartMargin.top + rowHeight + rowGap})`);

    normalDensityPanel.append("g")
      .attr("class", "exponential-grid")
      .call(d3.axisLeft(normalDensityY).ticks(4).tickSize(-panelWidth).tickFormat(""));
    normalDensityPanel.append("g")
      .attr("class", "exponential-grid")
      .attr("transform", `translate(0,${densityHeight})`)
      .call(d3.axisBottom(normalX).ticks(7).tickSize(-densityHeight).tickFormat(""));
    normalDensityPanel.append("g")
      .attr("class", "exponential-axis")
      .attr("transform", `translate(0,${densityHeight})`)
      .call(d3.axisBottom(normalX).ticks(7));
    normalDensityPanel.append("g")
      .attr("class", "exponential-axis")
      .call(d3.axisLeft(normalDensityY).ticks(4));
    normalDensityPanel.append("path")
      .datum(normalDensityPoints)
      .attr("class", "distribution-density-line")
      .attr("d", normalDensityLine);
    normalDensityPanel.selectAll(".distribution-marker-line")
      .data(normalExamples)
      .join("line")
      .attr("class", "distribution-marker-line")
      .attr("x1", (d) => normalX(d.x))
      .attr("x2", (d) => normalX(d.x))
      .attr("y1", (d) => normalDensityY(d.density))
      .attr("y2", densityHeight);
    normalDensityPanel.selectAll("circle")
      .data(normalExamples)
      .join("circle")
      .attr("class", "distribution-discount-point")
      .attr("cx", (d) => normalX(d.x))
      .attr("cy", (d) => normalDensityY(d.density))
      .attr("r", 4);
    normalDensityPanel.append("text")
      .attr("class", "exponential-label")
      .attr("x", 0)
      .attr("y", -16)
      .text("Normal density");
    normalDensityPanel.selectAll(".distribution-marker-label")
      .data(normalExamples.filter((d) => [-2, 0, 2].includes(d.x)))
      .join("text")
      .attr("class", "distribution-marker-label")
      .attr("x", (d) => normalX(d.x))
      .attr("y", densityHeight + 28)
      .attr("text-anchor", "middle")
      .text((d) => `x=${d.x}`);

    normalDiscountPanel.append("g")
      .attr("class", "exponential-grid")
      .call(d3.axisLeft(normalDiscountY).ticks(7).tickSize(-panelWidth).tickFormat(""));
    normalDiscountPanel.append("g")
      .attr("class", "exponential-grid")
      .attr("transform", `translate(0,${discountHeight})`)
      .call(d3.axisBottom(normalX).ticks(7).tickSize(-discountHeight).tickFormat(""));
    normalDiscountPanel.append("g")
      .attr("class", "exponential-axis")
      .attr("transform", `translate(0,${normalDiscountY(0)})`)
      .call(d3.axisBottom(normalX).ticks(7));
    normalDiscountPanel.append("g")
      .attr("class", "exponential-axis")
      .call(d3.axisLeft(normalDiscountY).ticks(7));
    normalDiscountPanel.append("path")
      .datum(normalPoints)
      .attr("class", "distribution-discount-line")
      .attr("d", normalDiscountLine);
    normalDiscountPanel.selectAll(".distribution-marker-line")
      .data(normalExamples)
      .join("line")
      .attr("class", "distribution-marker-line")
      .attr("x1", (d) => normalX(d.x))
      .attr("x2", (d) => normalX(d.x))
      .attr("y1", normalDiscountY(0))
      .attr("y2", (d) => normalDiscountY(d.discount));
    normalDiscountPanel.selectAll("circle")
      .data(normalExamples)
      .join("circle")
      .attr("class", "distribution-discount-point")
      .attr("cx", (d) => normalX(d.x))
      .attr("cy", (d) => normalDiscountY(d.discount))
      .attr("r", 4);
    normalDiscountPanel.append("text")
      .attr("class", "exponential-label")
      .attr("x", 0)
      .attr("y", -16)
      .text("Normal discount force");
    normalDiscountPanel.append("text")
      .attr("class", "exponential-label")
      .attr("x", panelWidth)
      .attr("y", discountHeight + 42)
      .attr("text-anchor", "end")
      .text("x - mu");
    normalDiscountPanel.append("text")
      .attr("class", "exponential-label")
      .attr("x", 8)
      .attr("y", normalDiscountY(3) + 14)
      .text("discount = x - mu");
    normalDiscountPanel.selectAll(".distribution-marker-label")
      .data(normalExamples.filter((d) => [-2, 0, 2].includes(d.x)))
      .join("text")
      .attr("class", "distribution-marker-label")
      .attr("x", (d) => normalX(d.x))
      .attr("y", (d) => normalDiscountY(d.discount) + (d.discount >= 0 ? -10 : 18))
      .attr("text-anchor", "middle")
      .text((d) => `x=${d.x}`);

    gammaDensityPanel.append("g")
      .attr("class", "exponential-grid")
      .call(d3.axisLeft(gammaDensityY).ticks(4).tickSize(-panelWidth).tickFormat(""));
    gammaDensityPanel.append("g")
      .attr("class", "exponential-grid")
      .attr("transform", `translate(0,${densityHeight})`)
      .call(d3.axisBottom(gammaRawX).tickValues([0, 3, 6, 9]).tickSize(-densityHeight).tickFormat(""));
    gammaDensityPanel.append("g")
      .attr("class", "exponential-axis")
      .attr("transform", `translate(0,${densityHeight})`)
      .call(d3.axisBottom(gammaRawX).tickValues([0, 3, 6, 9]));
    gammaDensityPanel.append("g")
      .attr("class", "exponential-axis")
      .call(d3.axisLeft(gammaDensityY).ticks(4));
    gammaDensityPanel.append("path")
      .datum(gammaDensityPoints)
      .attr("class", "distribution-density-line")
      .attr("d", gammaDensityLine);
    gammaDensityPanel.selectAll(".distribution-marker-line")
      .data(gammaExamples)
      .join("line")
      .attr("class", "distribution-marker-line")
      .attr("x1", (d) => gammaRawX(d.x))
      .attr("x2", (d) => gammaRawX(d.x))
      .attr("y1", (d) => gammaDensityY(d.density))
      .attr("y2", densityHeight);
    gammaDensityPanel.selectAll("circle")
      .data(gammaExamples)
      .join("circle")
      .attr("class", "distribution-discount-point")
      .attr("cx", (d) => gammaRawX(d.x))
      .attr("cy", (d) => gammaDensityY(d.density))
      .attr("r", 4);
    gammaDensityPanel.append("text")
      .attr("class", "exponential-label")
      .attr("x", 0)
      .attr("y", -16)
      .text("Gamma density");
    gammaDensityPanel.selectAll(".distribution-marker-label")
      .data(gammaExamples)
      .join("text")
      .attr("class", "distribution-marker-label")
      .attr("x", (d) => gammaRawX(d.x))
      .attr("y", densityHeight + 28)
      .attr("text-anchor", "middle")
      .text((d) => `${d.ratio}x`);

    gammaDiscountPanel.append("g")
      .attr("class", "exponential-grid")
      .call(d3.axisLeft(gammaDiscountY).ticks(6).tickSize(-panelWidth).tickFormat(""));
    gammaDiscountPanel.append("g")
      .attr("class", "exponential-grid")
      .attr("transform", `translate(0,${discountHeight})`)
      .call(d3.axisBottom(gammaRatioX).tickValues([0, 0.5, 1, 2, 3]).tickSize(-discountHeight).tickFormat(""));
    gammaDiscountPanel.append("g")
      .attr("class", "exponential-axis")
      .attr("transform", `translate(0,${gammaDiscountY(0)})`)
      .call(d3.axisBottom(gammaRatioX).tickValues([0, 0.5, 1, 2, 3]));
    gammaDiscountPanel.append("g")
      .attr("class", "exponential-axis")
      .call(d3.axisLeft(gammaDiscountY).ticks(6));
    gammaDiscountPanel.append("path")
      .datum(gammaPoints)
      .attr("class", "distribution-discount-line")
      .attr("d", gammaDiscountLine);
    gammaDiscountPanel.selectAll(".distribution-marker-line")
      .data(gammaExamples)
      .join("line")
      .attr("class", "distribution-marker-line")
      .attr("x1", (d) => gammaRatioX(d.ratio))
      .attr("x2", (d) => gammaRatioX(d.ratio))
      .attr("y1", gammaDiscountY(0))
      .attr("y2", (d) => gammaDiscountY(d.discount));
    gammaDiscountPanel.selectAll("circle")
      .data(gammaExamples)
      .join("circle")
      .attr("class", "distribution-discount-point")
      .attr("cx", (d) => gammaRatioX(d.ratio))
      .attr("cy", (d) => gammaDiscountY(d.discount))
      .attr("r", 4);
    gammaDiscountPanel.append("text")
      .attr("class", "exponential-label")
      .attr("x", 0)
      .attr("y", -16)
      .text("Gamma discount force");
    gammaDiscountPanel.append("text")
      .attr("class", "exponential-label")
      .attr("x", panelWidth)
      .attr("y", discountHeight + 42)
      .attr("text-anchor", "end")
      .text("x / mode");
    gammaDiscountPanel.append("text")
      .attr("class", "exponential-label")
      .attr("x", 8)
      .attr("y", gammaDiscountY(5.4))
      .text("discount = 3(r - 1)");
    gammaDiscountPanel.selectAll(".distribution-marker-label")
      .data(gammaExamples)
      .join("text")
      .attr("class", "distribution-marker-label")
      .attr("x", (d) => gammaRatioX(d.ratio))
      .attr("y", (d) => gammaDiscountY(d.discount) + (d.discount >= 0 ? -10 : 18))
      .attr("text-anchor", "middle")
      .text((d) => `${d.ratio}x`);
  }

  renderNormalGammaDiscount();
})();
