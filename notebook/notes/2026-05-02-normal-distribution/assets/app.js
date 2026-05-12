(() => {
  const svg = d3.select("#normal-score-chart");
  const values = document.querySelector("#normal-score-values");
  if (svg.empty() || !values) return;

  const width = 920;
  const height = 620;
  const margin = { top: 34, right: 34, bottom: 54, left: 62 };
  const gap = 70;
  const innerWidth = width - margin.left - margin.right;
  const densityHeight = 300;
  const scoreHeight = height - margin.top - margin.bottom - densityHeight - gap;
  const xDomain = [-3.5, 3.5];
  const scoreDomain = [-3.5, 3.5];
  const markerXValues = [-2, -1, 0, 1, 2];
  const normalPdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const format = d3.format(".3f");

  const x = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
  const densityY = d3.scaleLinear().domain([0, 0.42]).range([densityHeight, 0]);
  const scoreY = d3.scaleLinear().domain(scoreDomain).range([scoreHeight, 0]);
  const densityPoints = d3.range(xDomain[0], xDomain[1] + 0.001, 0.025).map((xValue) => ({
    x: xValue,
    density: normalPdf(xValue),
    score: xValue,
  }));
  const markerPoints = markerXValues.map((xValue) => ({
    x: xValue,
    density: normalPdf(xValue),
    score: xValue,
  }));
  const densityLine = d3.line()
    .x((d) => x(d.x))
    .y((d) => densityY(d.density));
  const scoreLine = d3.line()
    .x((d) => x(d.x))
    .y((d) => scoreY(d.score));

  svg.attr("viewBox", `0 0 ${width} ${height}`).selectAll("*").remove();

  const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const densityG = root.append("g");
  const scoreG = root.append("g").attr("transform", `translate(0,${densityHeight + gap})`);

  function addAxes(group, yScale, panelHeight, ticks) {
    group.append("g")
      .attr("class", "normal-grid")
      .call(d3.axisLeft(yScale).ticks(ticks).tickSize(-innerWidth).tickFormat(""));
    group.append("g")
      .attr("class", "normal-grid")
      .attr("transform", `translate(0,${panelHeight})`)
      .call(d3.axisBottom(x).ticks(7).tickSize(-panelHeight).tickFormat(""));
    group.append("g")
      .attr("class", "normal-axis")
      .attr("transform", `translate(0,${panelHeight})`)
      .call(d3.axisBottom(x).ticks(7));
    group.append("g")
      .attr("class", "normal-axis")
      .call(d3.axisLeft(yScale).ticks(ticks));
  }

  addAxes(densityG, densityY, densityHeight, 5);
  addAxes(scoreG, scoreY, scoreHeight, 7);

  densityG.append("path")
    .datum(densityPoints)
    .attr("class", "normal-density-line")
    .attr("d", densityLine);

  scoreG.append("line")
    .attr("class", "normal-zero-line")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", scoreY(0))
    .attr("y2", scoreY(0));

  scoreG.append("path")
    .datum(densityPoints)
    .attr("class", "normal-score-line")
    .attr("d", scoreLine);

  densityG.selectAll(".normal-marker-line")
    .data(markerPoints)
    .join("line")
    .attr("class", "normal-marker-line")
    .attr("x1", (d) => x(d.x))
    .attr("x2", (d) => x(d.x))
    .attr("y1", (d) => densityY(d.density))
    .attr("y2", densityHeight);

  scoreG.selectAll(".normal-marker-line")
    .data(markerPoints)
    .join("line")
    .attr("class", "normal-marker-line")
    .attr("x1", (d) => x(d.x))
    .attr("x2", (d) => x(d.x))
    .attr("y1", scoreY(0))
    .attr("y2", (d) => scoreY(d.score));

  densityG.selectAll(".normal-point")
    .data(markerPoints)
    .join("circle")
    .attr("class", "normal-point")
    .attr("cx", (d) => x(d.x))
    .attr("cy", (d) => densityY(d.density))
    .attr("r", 4.5);

  scoreG.selectAll(".normal-score-point")
    .data(markerPoints)
    .join("circle")
    .attr("class", "normal-score-point")
    .attr("cx", (d) => x(d.x))
    .attr("cy", (d) => scoreY(d.score))
    .attr("r", 4.5);

  densityG.append("text")
    .attr("class", "normal-label")
    .attr("x", 0)
    .attr("y", -12)
    .text("standard normal density: phi(x)");

  scoreG.append("text")
    .attr("class", "normal-label")
    .attr("x", 0)
    .attr("y", -14)
    .text("location score function: S_mu(x) = x");

  scoreG.append("text")
    .attr("class", "normal-label")
    .attr("x", innerWidth)
    .attr("y", scoreHeight + 38)
    .attr("text-anchor", "end")
    .text("x");

  const focus = root.append("g").attr("class", "normal-focus").style("display", "none");
  focus.append("line")
    .attr("class", "normal-focus-line")
    .attr("y1", 0)
    .attr("y2", densityHeight + gap + scoreHeight);
  focus.append("circle").attr("class", "normal-focus-point normal-focus-density").attr("r", 5);
  focus.append("circle").attr("class", "normal-focus-point normal-focus-score").attr("r", 5);
  focus.append("text").attr("class", "normal-focus-label").attr("x", 10).attr("y", 18);

  const overlay = root.append("rect")
    .attr("class", "normal-overlay")
    .attr("width", innerWidth)
    .attr("height", densityHeight + gap + scoreHeight)
    .attr("tabindex", 0)
    .attr("role", "slider")
    .attr("aria-valuemin", xDomain[0])
    .attr("aria-valuemax", xDomain[1])
    .attr("aria-label", "x value for standard normal density and score function");

  function updateReadout(xValue, showFocus = true) {
    const clampedX = Math.max(xDomain[0], Math.min(xDomain[1], xValue));
    const density = normalPdf(clampedX);
    const score = clampedX;
    const screenX = x(clampedX);
    focus.style("display", showFocus ? null : "none");
    focus.select(".normal-focus-line")
      .attr("x1", screenX)
      .attr("x2", screenX);
    focus.select(".normal-focus-density")
      .attr("cx", screenX)
      .attr("cy", densityY(density));
    focus.select(".normal-focus-score")
      .attr("cx", screenX)
      .attr("cy", densityHeight + gap + scoreY(score));
    focus.select(".normal-focus-label")
      .attr("x", screenX > innerWidth - 180 ? screenX - 172 : screenX + 10)
      .attr("y", 20)
      .text(`x=${format(clampedX)}, phi(x)=${format(density)}, score=${format(score)}`);

    overlay.attr("aria-valuenow", format(clampedX));
    values.innerHTML = `
      <div class="normal-score-value-card">
        <strong>x = ${format(clampedX)}</strong>
        <span>phi(x) = ${format(density)}</span>
        <span>S_mu(x) = ${format(score)}</span>
      </div>
    `;
  }

  overlay
    .on("pointerenter pointermove", (event) => {
      const [mx] = d3.pointer(event, root.node());
      updateReadout(x.invert(mx));
    })
    .on("pointerleave", () => focus.style("display", "none"))
    .on("focus", () => updateReadout(0))
    .on("keydown", (event) => {
      const current = Number(overlay.attr("aria-valuenow")) || 0;
      const step = event.shiftKey ? 0.5 : 0.1;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        updateReadout(current - step);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        updateReadout(current + step);
      }
    });

  updateReadout(0, false);
})();
