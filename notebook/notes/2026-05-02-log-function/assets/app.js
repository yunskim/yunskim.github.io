(() => {
  const svg = d3.select("#log-calculator-chart");
  const transformSvg = d3.select("#log-transform-chart");
  const aInput = document.querySelector("#log-a-input");
  const bInput = document.querySelector("#log-b-input");
  const values = document.querySelector("#log-calculator-values");

  if (svg.empty() || !aInput || !bInput || !values) return;

  const width = 960;
  const height = 360;
  const rule = { x: 44, y: 66, width: 872, height: 218 };
  const scaleWidth = rule.width - 76;
  const scaleX = rule.x + 38;
  const scale = d3.scaleLog().domain([1, 9000]).range([0, scaleWidth]);
  const slideScale = d3.scaleLog().domain([1, 90]).range([0, scale(90)]);
  const formatNumber = d3.format(",.2~f");
  const formatLog = d3.format(".4f");
  let activeDrag = null;
  let isDraggingSlide = false;
  let isDraggingCursor = false;

  const ticks = [];
  [1, 10, 100, 1000].forEach((base) => {
    for (let n = 1; n < 10; n += 1) {
      const value = base * n;
      if (value <= 9000) ticks.push(value);
    }
  });

  const slideTicks = [];
  [1, 10].forEach((base) => {
    for (let n = 1; n < 10; n += 1) {
      const value = base * n;
      if (value <= 90) slideTicks.push(value);
    }
  });

  svg.attr("viewBox", `0 0 ${width} ${height}`).selectAll("*").remove();
  const root = svg.append("g");
  const shadow = root.append("g").attr("class", "slide-rule-shadow-layer");
  const fixed = root.append("g").attr("class", "slide-rule-fixed-layer");
  const slide = root.append("g").attr("class", "slide-rule-slide-layer");
  const cursor = root.append("g").attr("class", "slide-rule-cursor");

  shadow.append("rect")
    .attr("class", "slide-rule-shadow")
    .attr("x", rule.x + 8)
    .attr("y", rule.y + 10)
    .attr("width", rule.width)
    .attr("height", rule.height)
    .attr("rx", 10);

  fixed.append("rect")
    .attr("class", "slide-rule-body")
    .attr("x", rule.x)
    .attr("y", rule.y)
    .attr("width", rule.width)
    .attr("height", rule.height)
    .attr("rx", 10);

  fixed.append("rect")
    .attr("class", "slide-rule-channel")
    .attr("x", rule.x + 18)
    .attr("y", rule.y + 82)
    .attr("width", rule.width - 36)
    .attr("height", 76)
    .attr("rx", 4);

  fixed.append("rect")
    .attr("class", "slide-rule-slide-plate")
    .attr("x", rule.x + 22)
    .attr("y", rule.y + 94)
    .attr("width", rule.width - 44)
    .attr("height", 52)
    .attr("rx", 4);

  const slideHitArea = fixed.append("rect")
    .attr("class", "slide-rule-slide-hit-area")
    .attr("x", rule.x + 22)
    .attr("y", rule.y + 88)
    .attr("width", rule.width - 44)
    .attr("height", 64)
    .attr("rx", 4);

  fixed.append("text")
    .attr("class", "slide-rule-brand")
    .attr("x", rule.x + 28)
    .attr("y", rule.y + 16)
    .text("LOG SLIDE RULE");

  fixed.append("text")
    .attr("class", "slide-rule-brand small")
    .attr("x", rule.x + rule.width - 184)
    .attr("y", rule.y + 16)
    .text("C / D LOGARITHMIC SCALES");

  fixed.selectAll("circle.slide-rule-rivet")
    .data([
      [rule.x + 18, rule.y + 18],
      [rule.x + rule.width - 18, rule.y + 18],
      [rule.x + 18, rule.y + rule.height - 18],
      [rule.x + rule.width - 18, rule.y + rule.height - 18],
    ])
    .join("circle")
    .attr("class", "slide-rule-rivet")
    .attr("cx", (d) => d[0])
    .attr("cy", (d) => d[1])
    .attr("r", 5);

  function labelFor(value) {
    return value >= 1000 ? `${value / 1000}k` : `${value}`;
  }

  function drawScale(group, options) {
    const { className, label, y, tickSet, tickScale, red = false, invert = false, maxValue = 9000 } = options;
    const scaleGroup = group.append("g").attr("class", `slide-rule-scale ${className}${red ? " red" : ""}`);

    scaleGroup.append("text")
      .attr("class", "slide-rule-scale-name")
      .attr("x", scaleX - 22)
      .attr("y", y + 4)
      .text(label);

    scaleGroup.append("line")
      .attr("class", "slide-rule-scale-line")
      .attr("x1", scaleX)
      .attr("x2", scaleX + tickScale(maxValue))
      .attr("y1", y)
      .attr("y2", y);

    scaleGroup.selectAll("line.slide-rule-tick")
      .data(tickSet)
      .join("line")
      .attr("class", (d) => {
        const mantissa = d / 10 ** Math.floor(Math.log10(d));
        return `slide-rule-tick ${mantissa === 1 ? "major" : "minor"}`;
      })
      .attr("x1", (d) => scaleX + tickScale(d))
      .attr("x2", (d) => scaleX + tickScale(d))
      .attr("y1", y)
      .attr("y2", (d) => {
        const mantissa = d / 10 ** Math.floor(Math.log10(d));
        const length = mantissa === 1 ? 22 : mantissa <= 5 ? 16 : 10;
        return invert ? y - length : y + length;
      });

    scaleGroup.selectAll("text.slide-rule-number")
      .data(tickSet.filter((d) => {
        const mantissa = d / 10 ** Math.floor(Math.log10(d));
        return mantissa === 1 || mantissa === 2 || mantissa === 5;
      }))
      .join("text")
      .attr("class", "slide-rule-number")
      .attr("x", (d) => scaleX + tickScale(d))
      .attr("y", invert ? y - 27 : y + 34)
      .attr("text-anchor", "middle")
      .text(labelFor);
  }

  drawScale(fixed, { className: "a-scale", label: "A", y: rule.y + 58, tickSet: ticks, tickScale: scale, invert: true });
  drawScale(fixed, { className: "d-scale", label: "D", y: rule.y + 170, tickSet: ticks, tickScale: scale });

  const slidePlate = slide.append("g").attr("class", "slide-rule-slide");
  drawScale(slidePlate, { className: "c-scale", label: "C", y: rule.y + 112, tickSet: slideTicks, tickScale: slideScale, maxValue: 90, invert: true });
  drawScale(slidePlate, { className: "ci-scale", label: "CI", y: rule.y + 134, tickSet: slideTicks, tickScale: slideScale, maxValue: 90, red: true });

  fixed.append("text")
    .attr("class", "slide-rule-help")
    .attr("x", rule.x + 28)
    .attr("y", rule.y + rule.height + 28)
    .text("가운데 슬라이드를 끌어 C의 1을 a에 맞추고, 투명 커서를 끌어 C의 b 아래 D 값을 읽는다.");

  function update() {
    const a = Number(aInput.value);
    const b = Number(bInput.value);
    const product = a * b;
    const slideOffset = scale(a);
    const productX = scale(product);

    slide.attr("transform", `translate(${slideOffset},0)`);
    cursor.attr("transform", `translate(${scaleX + productX},0)`);

    cursor.selectAll("*").remove();
    cursor.append("rect")
      .attr("class", "slide-rule-cursor-glass")
      .attr("x", -24)
      .attr("y", rule.y + 40)
      .attr("width", 48)
      .attr("height", 166)
      .attr("rx", 4);
    cursor.append("rect")
      .attr("class", "slide-rule-cursor-frame")
      .attr("x", -24)
      .attr("y", rule.y + 40)
      .attr("width", 48)
      .attr("height", 166)
      .attr("rx", 4);
    cursor.append("line")
      .attr("class", "slide-rule-hairline")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", rule.y + 34)
      .attr("y2", rule.y + 198);
    cursor.append("text")
      .attr("class", "slide-rule-cursor-label")
      .attr("x", 0)
      .attr("y", rule.y + 16)
      .attr("text-anchor", "middle")
      .text(`읽기: ${formatNumber(product)}`);

    slide.classed("is-dragging", isDraggingSlide);
    cursor.classed("is-dragging", isDraggingCursor);

    values.innerHTML = `
      <div><strong>a</strong><span>${formatNumber(a)}</span></div>
      <div><strong>b</strong><span>${formatNumber(b)}</span></div>
      <div><strong>D에서 읽는 값</strong><span>${formatNumber(product)}</span></div>
      <div><strong>log10(a) + log10(b)</strong><span>${formatLog(Math.log10(a) + Math.log10(b))}</span></div>
      <div><strong>10^(합)</strong><span>${formatNumber(10 ** (Math.log10(a) + Math.log10(b)))}</span></div>
    `;

    renderTransformChart(a, b);
  }

  function renderTransformChart(a, b) {
    if (transformSvg.empty()) return;

    const chartWidth = 960;
    const chartHeight = 460;
    const chartMargin = { top: 62, right: 46, bottom: 58, left: 64 };
    const innerWidth = chartWidth - chartMargin.left - chartMargin.right;
    const innerHeight = 300;
    const chartTop = chartMargin.top + 38;
    const logA = Math.log10(a);
    const logB = Math.log10(b);
    const logProduct = logA + logB;
    const product = a * b;
    const xMax = Math.max(100, product * 1.12);
    const yMax = Math.max(3, logProduct + 0.45);

    transformSvg.attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`).selectAll("*").remove();

    const defs = transformSvg.append("defs");
    defs.append("marker")
      .attr("id", "log-flow-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 9)
      .attr("refY", 0)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#3b7ea1");

    const x = d3.scaleLinear().domain([0, xMax]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);
    const g = transformSvg.append("g").attr("transform", `translate(${chartMargin.left},${chartTop})`);
    const line = d3.line().x((d) => x(d.x)).y((d) => y(d.y));
    const logPoints = d3.range(1, xMax + 0.001, xMax / 700).map((xValue) => ({ x: xValue, y: Math.log10(xValue) }));
    const xTicks = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 5000].filter((tick) => tick <= xMax);
    if (!xTicks.includes(Math.round(product))) xTicks.push(Math.round(product));
    const yTicks = d3.range(0, Math.ceil(yMax) + 1, 1);

    g.append("rect")
      .attr("class", "log-transform-panel")
      .attr("width", innerWidth)
      .attr("height", innerHeight);
    g.append("g")
      .attr("class", "log-transform-grid")
      .call(d3.axisLeft(y).tickValues(yTicks).tickSize(-innerWidth).tickFormat(""));
    g.append("g")
      .attr("class", "log-transform-grid")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickValues(xTicks.sort((left, right) => left - right)).tickSize(-innerHeight).tickFormat(""));
    g.append("g")
      .attr("class", "log-transform-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickValues(xTicks).tickFormat((d) => d3.format("~s")(d)));
    g.append("g")
      .attr("class", "log-transform-axis")
      .call(d3.axisLeft(y).tickValues(yTicks).tickFormat((d) => d3.format(".1~f")(d)));

    g.append("text")
      .attr("class", "log-transform-title")
      .attr("x", 0)
      .attr("y", -46)
      .text("실수 x축 위에서 log10(x)를 따라가는 곱셈");
    g.append("text")
      .attr("class", "log-transform-axis-label")
      .attr("x", innerWidth)
      .attr("y", innerHeight + 42)
      .attr("text-anchor", "end")
      .text("입력 x");
    g.append("text")
      .attr("class", "log-transform-axis-label")
      .attr("x", 0)
      .attr("y", -26)
      .text("로그값 y");

    g.append("path").datum(logPoints).attr("class", "log-transform-curve").attr("d", line);

    const legend = transformSvg.append("g").attr("transform", `translate(${chartMargin.left + 520},${chartMargin.top})`);
    legend.append("line").attr("class", "log-transform-curve").attr("x1", 0).attr("x2", 38).attr("y1", 0).attr("y2", 0);
    legend.append("text").attr("class", "log-transform-label").attr("x", 46).attr("y", 4).text("y = log10(x)");

    function plotPoint(pxValue, pyValue, className, label, dx = 8, dy = -8) {
      const px = x(pxValue);
      const py = y(pyValue);
      g.append("circle").attr("class", `log-transform-dot ${className}`).attr("cx", px).attr("cy", py).attr("r", 5);
      g.append("text").attr("class", "log-transform-label").attr("x", px + dx).attr("y", py + dy).text(label);
      return { x: px, y: py };
    }

    const aOnAxis = plotPoint(a, 0, "a", `a=${formatNumber(a)}`, 8, -10);
    const bOnAxis = plotPoint(b, 0, "b", `b=${formatNumber(b)}`, 8, -10);
    const aLog = plotPoint(a, logA, "a", `(a, log(a))`, 8, 16);
    const bLog = plotPoint(b, logB, "b", `(b, log(b))`, 8, -8);
    const aLogProduct = plotPoint(a, logProduct, "product", `(a, log(ab))`, 8, -8);
    const productOnCurve = plotPoint(product, logProduct, "product", `(ab, log(ab))`, 8, -8);
    const productOnAxis = plotPoint(product, 0, "product", `10^log(ab)=ab=${formatNumber(product)}`, 8, -10);

    function yBracket(y0Value, y1Value, label, className, xOffset) {
      const xPos = xOffset;
      const y0 = y(y0Value);
      const y1 = y(y1Value);
      g.append("path")
        .attr("class", `log-transform-bracket ${className}`)
        .attr("d", `M${xPos + 8},${y0}H${xPos}V${y1}H${xPos + 8}`);
      g.append("text")
        .attr("class", "log-transform-bracket-label")
        .attr("x", xPos - 6)
        .attr("y", (y0 + y1) / 2 + 4)
        .attr("text-anchor", "end")
        .text(label);
    }

    yBracket(0, logA, `log(a)=${formatLog(logA)}`, "a", -18);
    yBracket(logA, logProduct, `log(b)=${formatLog(logB)}`, "b", -42);
    yBracket(0, logProduct, "log(a)+log(b)=log(ab)", "sum", -68);

    [aLog, bLog, aLogProduct, productOnCurve, productOnAxis].forEach((point) => {
      g.append("line")
        .attr("class", "log-transform-guide")
        .attr("x1", point.x)
        .attr("x2", point.x)
        .attr("y1", innerHeight)
        .attr("y2", point.y);
      g.append("line")
        .attr("class", "log-transform-guide")
        .attr("x1", 0)
        .attr("x2", point.x)
        .attr("y1", point.y)
        .attr("y2", point.y);
    });

    const sumBoxX = Math.min(x(a) + 176, innerWidth - 148);
    const sumBoxY = Math.max(y(logProduct) - 34, 24);
    g.append("rect")
      .attr("class", "log-transform-sum-box")
      .attr("x", sumBoxX - 128)
      .attr("y", sumBoxY - 20)
      .attr("width", 256)
      .attr("height", 42)
      .attr("rx", 6);
    g.append("text")
      .attr("class", "log-transform-sum-label")
      .attr("x", sumBoxX)
      .attr("y", sumBoxY - 3)
      .attr("text-anchor", "middle")
      .text(`log(a)+log(b)=log(ab)`);
    g.append("text")
      .attr("class", "log-transform-sum-label secondary")
      .attr("x", sumBoxX)
      .attr("y", sumBoxY + 13)
      .attr("text-anchor", "middle")
      .text(`${formatLog(logA)} + ${formatLog(logB)} = ${formatLog(logProduct)}`);

    function arrow(points) {
      g.append("path")
        .attr("class", "log-transform-arrow")
        .attr("marker-end", "url(#log-flow-arrow)")
        .attr("d", d3.line().curve(d3.curveBumpX)(points));
    }

    arrow([[aOnAxis.x, aOnAxis.y - 8], [aLog.x, aLog.y + 10]]);
    arrow([[bOnAxis.x, bOnAxis.y - 8], [bLog.x, bLog.y + 10]]);
    arrow([[bLog.x + 10, bLog.y], [aLogProduct.x + 10, aLogProduct.y]]);
    arrow([[aLog.x, aLog.y - 10], [aLogProduct.x, aLogProduct.y + 10]]);
    arrow([[aLogProduct.x + 10, aLogProduct.y], [sumBoxX - 130, sumBoxY]]);
    arrow([[sumBoxX + 130, sumBoxY], [productOnCurve.x - 10, productOnCurve.y]]);
    arrow([[productOnCurve.x, productOnCurve.y + 10], [productOnAxis.x, productOnAxis.y - 10]]);
  }

  function svgPoint(event) {
    const point = svg.node().createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.node().getScreenCTM().inverse());
  }

  function pointerX(event) {
    return svgPoint(event).x - scaleX;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setAFromPointer(event) {
    const x = clamp(pointerX(event), scale(1), scale(90));
    aInput.value = formatNumber(scale.invert(x));
    update();
  }

  function setBFromPointer(event) {
    const a = Number(aInput.value);
    const x = clamp(pointerX(event), scale(a), scale(a * 90));
    bInput.value = formatNumber(scale.invert(x) / a);
    update();
  }

  function beginDrag(event) {
    const point = svgPoint(event);
    const a = Number(aInput.value);
    const b = Number(bInput.value);
    const cursorX = scaleX + scale(a * b);
    const isOnCursor = Math.abs(point.x - cursorX) <= 34 && point.y >= rule.y + 36 && point.y <= rule.y + 212;
    const isOnSlide = point.x >= rule.x + 22 && point.x <= rule.x + rule.width - 22 && point.y >= rule.y + 88 && point.y <= rule.y + 152;

    if (!isOnCursor && !isOnSlide) return;

    activeDrag = isOnCursor ? "cursor" : "slide";
    isDraggingCursor = activeDrag === "cursor";
    isDraggingSlide = activeDrag === "slide";
    svg.node().setPointerCapture(event.pointerId);
    event.preventDefault();

    if (activeDrag === "cursor") {
      setBFromPointer(event);
    } else {
      setAFromPointer(event);
    }
  }

  function moveDrag(event) {
    if (!activeDrag) return;
    event.preventDefault();

    if (activeDrag === "cursor") {
      setBFromPointer(event);
    } else {
      setAFromPointer(event);
    }
  }

  function endDrag(event) {
    if (!activeDrag) return;
    if (svg.node().hasPointerCapture(event.pointerId)) {
      svg.node().releasePointerCapture(event.pointerId);
    }
    activeDrag = null;
    isDraggingCursor = false;
    isDraggingSlide = false;
    update();
  }

  svg
    .on("pointerdown", beginDrag)
    .on("pointermove", moveDrag)
    .on("pointerup", endDrag)
    .on("pointercancel", endDrag)
    .on("lostpointercapture", endDrag);
  aInput.addEventListener("input", update);
  bInput.addEventListener("input", update);
  update();
})();
