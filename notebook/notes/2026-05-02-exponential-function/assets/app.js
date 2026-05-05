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

  function renderSalaryGrowthDemo() {
    const chart = d3.select("#salary-growth-chart");
    const chartNode = chart.node();
    const entryInput = document.querySelector("#salary-entry");
    const seniorInput = document.querySelector("#salary-senior");
    const rateInput = document.querySelector("#salary-rate");
    const values = document.querySelector("#salary-growth-values");
    if (!chartNode || !entryInput || !seniorInput || !rateInput || !values) return;

    const width = 920;
    const height = 430;
    const margin = { top: 34, right: 46, bottom: 62, left: 72 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const x = d3.scaleBand().padding(0.28).range([0, innerWidth]);
    const y = d3.scaleLinear().range([innerHeight, 0]);

    chart.attr("viewBox", `0 0 ${width} ${height}`).selectAll("*").remove();
    const root = chart.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const yGrid = root.append("g").attr("class", "exponential-grid");
    const xAxis = root.append("g")
      .attr("class", "exponential-axis")
      .attr("transform", `translate(0,${innerHeight})`);
    const yAxis = root.append("g").attr("class", "exponential-axis");
    const baseLine = root.append("line").attr("class", "salary-base-line");
    const baseLabel = root.append("text").attr("class", "exponential-label salary-base-label");

    root.append("text")
      .attr("class", "exponential-label")
      .attr("x", 0)
      .attr("y", -12)
      .text("monthly salary after raise");

    function formatMoney(value) {
      return d3.format(",.0f")(value);
    }

    function update() {
      const entrySalary = Number(entryInput.value) || 0;
      const seniorSalary = Number(seniorInput.value) || 0;
      const rate = (Number(rateInput.value) || 0) / 100;
      const comparison = [
        {
          label: "신입",
          base: entrySalary,
          growth: entrySalary * rate,
          finalValue: entrySalary * (1 + rate),
        },
        {
          label: "고위직",
          base: seniorSalary,
          growth: seniorSalary * rate,
          finalValue: seniorSalary * (1 + rate),
        },
      ];
      const difference = comparison[1].growth - comparison[0].growth;

      x.domain(comparison.map((d) => d.label));
      y.domain([0, d3.max(comparison, (d) => d.finalValue)]).nice();
      yGrid.call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
      yAxis.call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".2s")));
      xAxis.call(d3.axisBottom(x));

      root.selectAll(".salary-base-bar")
        .data(comparison, (d) => d.label)
        .join("rect")
        .attr("class", "salary-base-bar")
        .attr("x", (d) => x(d.label))
        .attr("y", (d) => y(d.base))
        .attr("width", x.bandwidth())
        .attr("height", (d) => innerHeight - y(d.base));

      root.selectAll(".salary-growth-bar")
        .data(comparison, (d) => d.label)
        .join("rect")
        .attr("class", "salary-growth-bar")
        .attr("x", (d) => x(d.label))
        .attr("y", (d) => y(d.finalValue))
        .attr("width", x.bandwidth())
        .attr("height", (d) => y(d.base) - y(d.finalValue));

      root.selectAll(".salary-growth-label")
        .data(comparison, (d) => d.label)
        .join("text")
        .attr("class", "exponential-label salary-growth-label")
        .attr("x", (d) => x(d.label) + x.bandwidth() / 2)
        .attr("y", (d) => y(d.finalValue) - 8)
        .attr("text-anchor", "middle")
        .text((d) => `증가액 ${formatMoney(d.growth)}`);

      baseLine
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", y(entrySalary))
        .attr("y2", y(entrySalary));
      baseLabel
        .attr("x", innerWidth)
        .attr("y", y(entrySalary) - 8)
        .attr("text-anchor", "end")
        .text(`신입 기준 월급: ${formatMoney(entrySalary)}`);

      values.innerHTML = `
        <div class="exponential-value-card">
          <strong>신입</strong>
          <span>인상 후 월급 = ${formatMoney(comparison[0].finalValue)}</span>
          <span>증가액 = ${formatMoney(comparison[0].growth)}</span>
        </div>
        <div class="exponential-value-card">
          <strong>고위직</strong>
          <span>인상 후 월급 = ${formatMoney(comparison[1].finalValue)}</span>
          <span>증가액 = ${formatMoney(comparison[1].growth)}</span>
        </div>
        <div class="exponential-value-card">
          <strong>증가액 차이</strong>
          <span>${formatMoney(difference)}</span>
        </div>
      `;
    }

    entryInput.addEventListener("input", update);
    seniorInput.addEventListener("input", update);
    rateInput.addEventListener("input", update);

    update();
  }

  renderSalaryGrowthDemo();

  function renderCaffeineDecayDemo() {
    const chart = d3.select("#caffeine-decay-chart");
    const chartNode = chart.node();
    const initialInput = document.querySelector("#caffeine-initial");
    const halfLifeInput = document.querySelector("#caffeine-half-life");
    const thresholdInput = document.querySelector("#caffeine-threshold");
    const values = document.querySelector("#caffeine-decay-values");
    if (!chartNode || !initialInput || !halfLifeInput || !thresholdInput || !values) return;

    const width = 920;
    const height = 430;
    const margin = { top: 34, right: 46, bottom: 58, left: 66 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const x = d3.scaleLinear().domain([0, 24]).range([0, innerWidth]);
    const y = d3.scaleLinear().range([innerHeight, 0]);
    const line = d3.line()
      .x((d) => x(d.hour))
      .y((d) => y(d.amount));

    chart.attr("viewBox", `0 0 ${width} ${height}`).selectAll("*").remove();
    const root = chart.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const yGrid = root.append("g").attr("class", "exponential-grid");
    const xGrid = root.append("g")
      .attr("class", "exponential-grid")
      .attr("transform", `translate(0,${innerHeight})`);
    const xAxis = root.append("g")
      .attr("class", "exponential-axis")
      .attr("transform", `translate(0,${innerHeight})`);
    const yAxis = root.append("g").attr("class", "exponential-axis");
    const curve = root.append("path").attr("class", "caffeine-decay-line");
    const thresholdLine = root.append("line").attr("class", "caffeine-threshold-line");
    const thresholdLabel = root.append("text").attr("class", "exponential-label caffeine-threshold-label");
    const crossingLine = root.append("line").attr("class", "caffeine-crossing-line");
    const crossingPoint = root.append("circle").attr("class", "caffeine-crossing-point").attr("r", 4.5);
    const crossingLabel = root.append("text").attr("class", "exponential-label");

    root.append("text")
      .attr("class", "exponential-label")
      .attr("x", innerWidth)
      .attr("y", innerHeight + 38)
      .attr("text-anchor", "end")
      .text("hours after caffeine intake");
    root.append("text")
      .attr("class", "exponential-label")
      .attr("x", 0)
      .attr("y", -12)
      .text("remaining caffeine (mg)");

    function format(value) {
      return d3.format(".1f")(value);
    }

    function amountAt(hour, initial, halfLife) {
      return initial * Math.pow(0.5, hour / halfLife);
    }

    function update() {
      const initial = Number(initialInput.value) || 0;
      const halfLife = Number(halfLifeInput.value) || 5;
      const threshold = Number(thresholdInput.value) || 0;
      const points = d3.range(0, 24.001, 0.25).map((hour) => ({
        hour,
        amount: amountAt(hour, initial, halfLife),
      }));
      const crossingHour = threshold > 0 && threshold < initial
        ? halfLife * Math.log(threshold / initial) / Math.log(0.5)
        : null;

      y.domain([0, Math.max(initial, threshold)]).nice();
      yGrid.call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
      xGrid.call(d3.axisBottom(x).ticks(8).tickSize(-innerHeight).tickFormat(""));
      xAxis.call(d3.axisBottom(x).ticks(8));
      yAxis.call(d3.axisLeft(y).ticks(5));
      curve.datum(points).attr("d", line);

      thresholdLine
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", y(threshold))
        .attr("y2", y(threshold));
      thresholdLabel
        .attr("x", innerWidth)
        .attr("y", y(threshold) - 8)
        .attr("text-anchor", "end")
        .text(`effect threshold: ${format(threshold)}mg`);

      if (crossingHour !== null && crossingHour <= 24) {
        crossingLine.style("display", null)
          .attr("x1", x(crossingHour))
          .attr("x2", x(crossingHour))
          .attr("y1", y(threshold))
          .attr("y2", innerHeight);
        crossingPoint.style("display", null)
          .attr("cx", x(crossingHour))
          .attr("cy", y(threshold));
        crossingLabel.style("display", null)
          .attr("x", x(crossingHour) + 8)
          .attr("y", y(threshold) + 18)
          .text(`${format(crossingHour)} hours`);
      } else {
        crossingLine.style("display", "none");
        crossingPoint.style("display", "none");
        crossingLabel.style("display", "none");
      }

      values.innerHTML = `
        <div class="exponential-value-card">
          <strong>0 hours</strong>
          <span>${format(initial)}mg</span>
        </div>
        <div class="exponential-value-card">
          <strong>${format(halfLife)} hours</strong>
          <span>${format(amountAt(halfLife, initial, halfLife))}mg</span>
        </div>
        <div class="exponential-value-card">
          <strong>threshold</strong>
          <span>${crossingHour !== null ? `${format(crossingHour)} hours` : "not below initial dose"}</span>
        </div>
      `;
    }

    initialInput.addEventListener("input", update);
    halfLifeInput.addEventListener("input", update);
    thresholdInput.addEventListener("input", update);
    update();
  }

  renderCaffeineDecayDemo();

  function renderPikettyGrowthDemo() {
    const chart = d3.select("#piketty-growth-chart");
    const chartNode = chart.node();
    const rInput = document.querySelector("#piketty-r");
    const gInput = document.querySelector("#piketty-g");
    const yearsInput = document.querySelector("#piketty-years");
    const values = document.querySelector("#piketty-growth-values");
    if (!chartNode || !rInput || !gInput || !yearsInput || !values) return;

    const width = 920;
    const height = 460;
    const margin = { top: 34, right: 96, bottom: 58, left: 66 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const x = d3.scaleLinear().range([0, innerWidth]);
    const y = d3.scaleLinear().range([innerHeight, 0]);
    const line = d3.line()
      .x((d) => x(d.year))
      .y((d) => y(d.value));

    chart.attr("viewBox", `0 0 ${width} ${height}`).selectAll("*").remove();
    const root = chart.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const yGrid = root.append("g").attr("class", "exponential-grid");
    const xGrid = root.append("g")
      .attr("class", "exponential-grid")
      .attr("transform", `translate(0,${innerHeight})`);
    const xAxis = root.append("g")
      .attr("class", "exponential-axis")
      .attr("transform", `translate(0,${innerHeight})`);
    const yAxis = root.append("g").attr("class", "exponential-axis");
    const capitalPath = root.append("path").attr("class", "piketty-capital-line");
    const economyPath = root.append("path").attr("class", "piketty-economy-line");
    const capitalLabel = root.append("text").attr("class", "exponential-label piketty-capital-label");
    const economyLabel = root.append("text").attr("class", "exponential-label piketty-economy-label");

    root.append("text")
      .attr("class", "exponential-label")
      .attr("x", innerWidth)
      .attr("y", innerHeight + 38)
      .attr("text-anchor", "end")
      .text("years");
    root.append("text")
      .attr("class", "exponential-label")
      .attr("x", 0)
      .attr("y", -12)
      .text("index, start = 100");

    function formatIndex(value) {
      return d3.format(",.1f")(value);
    }

    function formatRate(value) {
      return d3.format(".1f")(value);
    }

    function update() {
      const r = (Number(rInput.value) || 0) / 100;
      const g = (Number(gInput.value) || 0) / 100;
      const years = Math.max(10, Math.min(100, Math.round(Number(yearsInput.value) || 10)));
      const capital = d3.range(0, years + 1).map((year) => ({
        year,
        value: 100 * Math.pow(1 + r, year),
      }));
      const economy = d3.range(0, years + 1).map((year) => ({
        year,
        value: 100 * Math.pow(1 + g, year),
      }));
      const capitalEnd = capital[capital.length - 1];
      const economyEnd = economy[economy.length - 1];
      const ratio = capitalEnd.value / economyEnd.value;

      x.domain([0, years]);
      y.domain([0, Math.max(capitalEnd.value, economyEnd.value)]).nice();
      yGrid.call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
      xGrid.call(d3.axisBottom(x).ticks(8).tickSize(-innerHeight).tickFormat(""));
      xAxis.call(d3.axisBottom(x).ticks(8));
      yAxis.call(d3.axisLeft(y).ticks(5));

      capitalPath.datum(capital).attr("d", line);
      economyPath.datum(economy).attr("d", line);
      capitalLabel
        .attr("x", innerWidth + 8)
        .attr("y", y(capitalEnd.value) + 4)
        .text(`capital r=${formatRate(r * 100)}%`);
      economyLabel
        .attr("x", innerWidth + 8)
        .attr("y", y(economyEnd.value) + 4)
        .text(`economy g=${formatRate(g * 100)}%`);

      values.innerHTML = `
        <div class="exponential-value-card">
          <strong>capital</strong>
          <span>100(1+r)^${years} = ${formatIndex(capitalEnd.value)}</span>
        </div>
        <div class="exponential-value-card">
          <strong>economy</strong>
          <span>100(1+g)^${years} = ${formatIndex(economyEnd.value)}</span>
        </div>
        <div class="exponential-value-card">
          <strong>capital / economy</strong>
          <span>${d3.format(".2f")(ratio)}x</span>
        </div>
      `;
    }

    rInput.addEventListener("input", update);
    gInput.addEventListener("input", update);
    yearsInput.addEventListener("input", update);
    update();
  }

  renderPikettyGrowthDemo();

  function renderCovidGrowthDemo() {
    const chart = d3.select("#covid-growth-chart");
    const chartNode = chart.node();
    const rInput = document.querySelector("#covid-growth-r");
    const values = document.querySelector("#covid-growth-values");
    const tooltip = document.querySelector("#covid-growth-tooltip");
    if (!chartNode || !rInput || !values || !tooltip) return;

    const parseDate = d3.timeParse("%-m/%-d/%y");
    const width = 920;
    const height = 500;
    const margin = { top: 34, right: 92, bottom: 54, left: 74 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const generationDays = 5;
    const horizonDays = 70;

    function formatCount(value) {
      return d3.format(",.0f")(value);
    }

    function formatR(value) {
      return d3.format(".2f")(value);
    }

    d3.csv("./assets/time_series_covid19_confirmed_global.csv").then((rows) => {
      if (!rows.length) return;

      const dateColumns = rows.columns.slice(4);
      const totals = dateColumns.map((column) => ({
        date: parseDate(column),
        total: d3.sum(rows, (row) => Number(row[column]) || 0),
      }));
      const startIndex = totals.findIndex((d) => d.total >= 1000);
      if (startIndex < 0) return;

      const actual = totals.slice(startIndex, startIndex + horizonDays + 1)
        .map((d, index) => ({
          day: index,
          date: d.date,
          total: d.total,
        }));
      const start = actual[0];
      const end = actual[actual.length - 1];

      chart.attr("viewBox", `0 0 ${width} ${height}`).selectAll("*").remove();

      const root = chart.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
      const x = d3.scaleLinear().domain([0, horizonDays]).range([0, innerWidth]);
      const y = d3.scaleLinear().range([innerHeight, 0]);
      const line = d3.line()
        .x((d) => x(d.day))
        .y((d) => y(d.total));

      const yGrid = root.append("g").attr("class", "exponential-grid");
      const yAxis = root.append("g").attr("class", "exponential-axis");
      root.append("g")
        .attr("class", "exponential-grid")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(7).tickSize(-innerHeight).tickFormat(""));
      root.append("g")
        .attr("class", "exponential-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(7));

      const actualPath = root.append("path")
        .datum(actual)
        .attr("class", "covid-actual-line");
      const projectionGroup = root.append("g");
      const labelGroup = root.append("g");
      const hoverGroup = root.append("g")
        .attr("class", "covid-hover")
        .style("display", "none");
      const hoverLine = hoverGroup.append("line")
        .attr("class", "covid-hover-line")
        .attr("y1", 0)
        .attr("y2", innerHeight);
      const hoverPoints = hoverGroup.append("g");
      const hoverOverlay = root.append("rect")
        .attr("class", "covid-hover-overlay")
        .attr("width", innerWidth)
        .attr("height", innerHeight);
      let currentSeries = [];

      root.append("text")
        .attr("class", "exponential-label")
        .attr("x", innerWidth)
        .attr("y", innerHeight + 38)
        .attr("text-anchor", "end")
        .text("days since global confirmed cases passed 1,000");
      root.append("text")
        .attr("class", "exponential-label")
        .attr("x", 0)
        .attr("y", -12)
        .text("global cumulative confirmed cases");

      function projectionFor(rValue) {
        return d3.range(0, horizonDays + 1).map((day) => ({
          day,
          total: start.total * Math.pow(rValue, day / generationDays),
          r: rValue,
        }));
      }

      function update() {
        const selectedR = Number(rInput.value);
        const scenarios = [
          { label: `x${formatR(Math.max(1, selectedR - 0.2))}`, r: Math.max(1, selectedR - 0.2), className: "covid-projection-low" },
          { label: `x${formatR(selectedR)}`, r: selectedR, className: "covid-projection-main" },
          { label: `x${formatR(Math.min(3.5, selectedR + 0.2))}`, r: Math.min(3.5, selectedR + 0.2), className: "covid-projection-high" },
        ];
        const projections = scenarios.map((scenario) => ({
          ...scenario,
          points: projectionFor(scenario.r),
        }));
        const maxProjected = d3.max(projections, (scenario) => d3.max(scenario.points, (d) => d.total));
        y.domain([0, Math.max(d3.max(actual, (d) => d.total), maxProjected)]).nice();

        yGrid.call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(""));
        yAxis.call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".2s")));
        actualPath.attr("d", line);

        projectionGroup.selectAll("path")
          .data(projections, (d) => d.label)
          .join("path")
          .attr("class", (d) => `covid-projection-line ${d.className}`)
          .attr("d", (d) => line(d.points));

        const labels = [
          {
            label: `actual ${formatCount(end.total)}`,
            day: end.day,
            total: end.total,
            className: "covid-actual-label",
          },
          ...projections.map((scenario) => ({
            label: scenario.label,
            day: horizonDays,
            total: scenario.points[scenario.points.length - 1].total,
            className: scenario.className,
          })),
        ];

        labelGroup.selectAll("text")
          .data(labels, (d) => d.label)
          .join("text")
          .attr("class", (d) => `exponential-label ${d.className}`)
          .attr("x", (d) => x(d.day) + 8)
          .attr("y", (d) => y(d.total) + 4)
          .text((d) => d.label);

        currentSeries = [
          { label: "actual", className: "covid-actual-label", points: actual },
          ...projections,
        ];

        const selectedProjection = projections[1].points[projections[1].points.length - 1].total;
        values.innerHTML = `
          <div class="exponential-value-card">
            <strong>start</strong>
            <span>${d3.timeFormat("%Y-%m-%d")(start.date)}</span>
            <span>${formatCount(start.total)} confirmed</span>
          </div>
          <div class="exponential-value-card">
            <strong>5-day growth factor = x${formatR(selectedR)}</strong>
            <span>generation interval = ${generationDays} days</span>
            <span>after ${horizonDays} days: ${formatCount(selectedProjection)}</span>
          </div>
          <div class="exponential-value-card">
            <strong>actual after ${end.day} days</strong>
            <span>${d3.timeFormat("%Y-%m-%d")(end.date)}</span>
            <span>${formatCount(end.total)} confirmed</span>
          </div>
        `;
      }

      function updateTooltip(event) {
        if (!currentSeries.length) return;
        const [mouseX] = d3.pointer(event, root.node());
        const day = Math.max(0, Math.min(horizonDays, Math.round(x.invert(mouseX))));
        const actualDatum = actual[Math.min(day, actual.length - 1)];
        const rows = currentSeries.map((series) => {
          const point = series.points[Math.min(day, series.points.length - 1)];
          return {
            label: series.label || "actual",
            className: series.className,
            point,
          };
        });

        hoverGroup.style("display", null);
        hoverLine
          .attr("x1", x(day))
          .attr("x2", x(day));
        hoverPoints.selectAll("circle")
          .data(rows, (d) => d.label)
          .join("circle")
          .attr("class", (d) => `covid-hover-point ${d.className}`)
          .attr("cx", (d) => x(d.point.day))
          .attr("cy", (d) => y(d.point.total))
          .attr("r", 4);

        tooltip.setAttribute("aria-hidden", "false");
        tooltip.style.display = "block";
        tooltip.style.left = `${margin.left + x(day) + 12}px`;
        tooltip.style.top = `${margin.top + 12}px`;
        tooltip.innerHTML = `
          <strong>day ${day}</strong>
          <span>${d3.timeFormat("%Y-%m-%d")(actualDatum.date)}</span>
          ${rows.map((row) => `
            <span>${row.label}: ${formatCount(row.point.total)}</span>
          `).join("")}
        `;
      }

      function hideTooltip() {
        hoverGroup.style("display", "none");
        tooltip.setAttribute("aria-hidden", "true");
        tooltip.style.display = "none";
      }

      rInput.addEventListener("input", update);
      hoverOverlay
        .on("mousemove", updateTooltip)
        .on("mouseenter", updateTooltip)
        .on("mouseleave", hideTooltip);
      update();
    });
  }

  renderCovidGrowthDemo();
})();
