(() => {
  function renderComplexRotationDemo() {
    const chart = d3.select("#complex-rotation-chart");
    const chartNode = chart.node();
    const thetaInput = document.querySelector("#complex-rotation-theta");
    const dthetaInput = document.querySelector("#complex-rotation-dtheta");
    const playButton = document.querySelector("#complex-rotation-play");
    const values = document.querySelector("#complex-rotation-values");
    if (!chartNode || !thetaInput || !dthetaInput || !playButton || !values) return;

    const width = 760;
    const height = 560;
    const margin = { top: 34, right: 42, bottom: 44, left: 42 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;
    const radius = Math.min(innerWidth, innerHeight) * 0.36;
    let frameId = null;
    let playStart = null;

    chart.attr("viewBox", `0 0 ${width} ${height}`).selectAll("*").remove();
    const root = chart.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const defs = chart.append("defs");
    defs.append("marker")
      .attr("id", "complex-rotation-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 9)
      .attr("refY", 0)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("class", "complex-rotation-arrow-head");

    root.append("circle")
      .attr("class", "complex-rotation-unit-circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", radius);
    root.append("line")
      .attr("class", "complex-rotation-axis")
      .attr("x1", centerX - radius - 32)
      .attr("x2", centerX + radius + 32)
      .attr("y1", centerY)
      .attr("y2", centerY);
    root.append("line")
      .attr("class", "complex-rotation-axis")
      .attr("x1", centerX)
      .attr("x2", centerX)
      .attr("y1", centerY + radius + 32)
      .attr("y2", centerY - radius - 32);
    root.append("text")
      .attr("class", "complex-rotation-label")
      .attr("x", centerX + radius + 18)
      .attr("y", centerY - 8)
      .text("1");
    root.append("text")
      .attr("class", "complex-rotation-label")
      .attr("x", centerX + 8)
      .attr("y", centerY - radius - 14)
      .text("i");

    const radiusLine = root.append("line").attr("class", "complex-rotation-radius");
    const tangentArrow = root.append("line")
      .attr("class", "complex-rotation-tangent")
      .attr("marker-end", "url(#complex-rotation-arrow)");
    const stepArrow = root.append("line")
      .attr("class", "complex-rotation-step")
      .attr("marker-end", "url(#complex-rotation-arrow)");
    const arcPath = root.append("path").attr("class", "complex-rotation-arc");
    const actualPoint = root.append("circle").attr("class", "complex-rotation-actual").attr("r", 5.5);
    const nextPoint = root.append("circle").attr("class", "complex-rotation-next").attr("r", 5);
    const approxPoint = root.append("circle").attr("class", "complex-rotation-approx").attr("r", 5);
    const labelGroup = root.append("g");
    const hitGroup = root.append("g").attr("class", "complex-rotation-hit-points");
    const tooltipGroup = root.append("g")
      .attr("class", "complex-rotation-tooltip")
      .attr("aria-hidden", "true")
      .style("display", "none");
    const tooltipBox = tooltipGroup.append("rect").attr("class", "complex-rotation-tooltip-box");
    const tooltipText = tooltipGroup.append("text").attr("class", "complex-rotation-tooltip-text");
    let activeTooltipKey = null;
    let latestPointData = [];

    function point(theta) {
      return {
        re: Math.cos(theta),
        im: Math.sin(theta),
        x: centerX + radius * Math.cos(theta),
        y: centerY - radius * Math.sin(theta),
      };
    }

    function screenPoint(re, im) {
      return {
        x: centerX + radius * re,
        y: centerY - radius * im,
      };
    }

    function arc(theta, dtheta) {
      const start = point(theta);
      const end = point(theta + dtheta);
      const largeArc = Math.abs(dtheta) > Math.PI ? 1 : 0;
      const sweep = dtheta >= 0 ? 0 : 1;
      return `M${start.x},${start.y}A${radius},${radius} 0 ${largeArc},${sweep} ${end.x},${end.y}`;
    }

    function format(value) {
      return d3.format(".3f")(value);
    }

    function complexText(re, im) {
      const sign = im < 0 ? "-" : "+";
      return `${format(re)} ${sign} ${format(Math.abs(im))}i`;
    }

    function tooltipPosition(point) {
      const padding = 10;
      const boxWidth = 180;
      const boxHeight = 66;
      let x = point.x + 14;
      let y = point.y - boxHeight - 14;
      if (x + boxWidth > innerWidth) x = point.x - boxWidth - 14;
      if (y < 0) y = point.y + 14;
      x = Math.max(padding, Math.min(x, innerWidth - boxWidth - padding));
      y = Math.max(padding, Math.min(y, innerHeight - boxHeight - padding));
      return { x, y };
    }

    function renderTooltip(point) {
      if (!point) return;
      const lines = [
        point.label,
        point.value,
        point.detail,
      ];
      const position = tooltipPosition(point);
      tooltipGroup
        .attr("transform", `translate(${position.x},${position.y})`)
        .attr("aria-hidden", "false")
        .style("display", null);
      tooltipText.selectAll("tspan")
        .data(lines)
        .join("tspan")
        .attr("x", 10)
        .attr("dy", (_d, index) => (index === 0 ? "1.1em" : "1.35em"))
        .attr("class", (_d, index) => (index === 0 ? "complex-rotation-tooltip-title" : null))
        .text((d) => d);
      const box = tooltipText.node().getBBox();
      tooltipBox
        .attr("x", box.x - 8)
        .attr("y", box.y - 6)
        .attr("width", box.width + 16)
        .attr("height", box.height + 12);
    }

    function hideTooltip() {
      activeTooltipKey = null;
      tooltipGroup
        .attr("aria-hidden", "true")
        .style("display", "none");
    }

    function update(theta = Number(thetaInput.value)) {
      const dtheta = Number(dthetaInput.value);
      const current = point(theta);
      const derivative = { re: -Math.sin(theta), im: Math.cos(theta) };
      const actualNext = point(theta + dtheta);
      const approxValue = {
        re: current.re + derivative.re * dtheta,
        im: current.im + derivative.im * dtheta,
      };
      const approx = screenPoint(approxValue.re, approxValue.im);
      const tangentEnd = screenPoint(current.re + derivative.re * 0.55, current.im + derivative.im * 0.55);

      radiusLine
        .attr("x1", centerX)
        .attr("y1", centerY)
        .attr("x2", current.x)
        .attr("y2", current.y);
      tangentArrow
        .attr("x1", current.x)
        .attr("y1", current.y)
        .attr("x2", tangentEnd.x)
        .attr("y2", tangentEnd.y);
      stepArrow
        .attr("x1", current.x)
        .attr("y1", current.y)
        .attr("x2", approx.x)
        .attr("y2", approx.y);
      arcPath.attr("d", arc(theta, dtheta));
      actualPoint.attr("cx", current.x).attr("cy", current.y);
      nextPoint.attr("cx", actualNext.x).attr("cy", actualNext.y);
      approxPoint.attr("cx", approx.x).attr("cy", approx.y);
      latestPointData = [
        {
          key: "current",
          label: "f(θ)",
          value: complexText(current.re, current.im),
          detail: `θ = ${format(theta)} rad`,
          x: current.x,
          y: current.y,
        },
        {
          key: "next",
          label: "f(θ + dθ)",
          value: complexText(actualNext.re, actualNext.im),
          detail: `θ + dθ = ${format(theta + dtheta)} rad`,
          x: actualNext.x,
          y: actualNext.y,
        },
        {
          key: "approx",
          label: "linear approx",
          value: complexText(approxValue.re, approxValue.im),
          detail: `f(θ) + f'(θ)dθ`,
          x: approx.x,
          y: approx.y,
        },
      ];

      hitGroup.selectAll("circle")
        .data(latestPointData, (d) => d.key)
        .join("circle")
        .attr("class", "complex-rotation-hit-point")
        .attr("r", 13)
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .on("mouseenter", (_event, d) => {
          activeTooltipKey = d.key;
          renderTooltip(d);
        })
        .on("mousemove", (_event, d) => {
          activeTooltipKey = d.key;
          renderTooltip(d);
        })
        .on("mouseleave", hideTooltip);
      if (activeTooltipKey !== null) {
        renderTooltip(latestPointData.find((d) => d.key === activeTooltipKey));
      }

      const labels = [
        { label: "f(θ)", x: current.x + 10, y: current.y - 10, className: "complex-rotation-label" },
        { label: "f(θ + dθ)", x: actualNext.x + 10, y: actualNext.y + 16, className: "complex-rotation-next-label" },
        { label: "linear approx", x: approx.x + 10, y: approx.y - 10, className: "complex-rotation-approx-label" },
        {
          label: "i f(θ)",
          x: tangentEnd.x + derivative.re * 24 + 10,
          y: tangentEnd.y - derivative.im * 24 - 10,
          className: "complex-rotation-tangent-label",
        },
      ];
      const labelItems = labelGroup.selectAll("g")
        .data(labels, (d) => d.label)
        .join((enter) => {
          const item = enter.append("g");
          item.append("rect").attr("class", "complex-rotation-label-bg");
          item.append("text").attr("class", (d) => `complex-rotation-label ${d.className}`);
          return item;
        });

      labelItems
        .attr("transform", (d) => `translate(${d.x},${d.y})`);
      labelItems.select("text")
        .text((d) => d.label);
      labelItems.each(function () {
        const item = d3.select(this);
        const textNode = item.select("text").node();
        if (!textNode) return;
        const box = textNode.getBBox();
        item.select("rect")
          .attr("x", box.x - 5)
          .attr("y", box.y - 3)
          .attr("width", box.width + 10)
          .attr("height", box.height + 6);
      });

      values.innerHTML = `
        <div class="exponential-value-card">
          <strong>current point</strong>
          <span>f(θ) = ${format(current.re)} + ${format(current.im)}i</span>
          <span>θ = ${format(theta)} rad</span>
        </div>
        <div class="exponential-value-card">
          <strong>derivative</strong>
          <span>f'(θ) = i f(θ)</span>
          <span>= ${format(derivative.re)} + ${format(derivative.im)}i</span>
        </div>
        <div class="exponential-value-card">
          <strong>small step</strong>
          <span>dθ = ${format(dtheta)}</span>
          <span>f(θ) + f'(θ)dθ</span>
        </div>
      `;
    }

    function stop() {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      playStart = null;
    }

    function play(timestamp) {
      if (playStart === null) playStart = timestamp;
      const elapsed = (timestamp - playStart) / 1000;
      const theta = (Number(thetaInput.value) + elapsed * 0.85) % (Math.PI * 2);
      update(theta);
      frameId = requestAnimationFrame(play);
    }

    thetaInput.addEventListener("input", () => {
      stop();
      update();
    });
    dthetaInput.addEventListener("input", () => update());
    playButton.addEventListener("click", () => {
      if (frameId !== null) {
        stop();
        update();
        return;
      }
      frameId = requestAnimationFrame(play);
    });
    update();
  }

  renderComplexRotationDemo();

  function renderPhyllotaxisDemo() {
    const chart = d3.select("#phyllotaxis-chart");
    const chartNode = chart.node();
    const angleInput = document.querySelector("#phyllotaxis-angle");
    const countInput = document.querySelector("#phyllotaxis-count");
    const hoverModeInput = document.querySelector("#phyllotaxis-mode-hover");
    const pathModeInput = document.querySelector("#phyllotaxis-mode-path");
    const replayButton = document.querySelector("#phyllotaxis-replay");
    const values = document.querySelector("#phyllotaxis-values");
    if (!chartNode || !angleInput || !countInput || !hoverModeInput || !pathModeInput || !replayButton || !values) return;

    const width = 720;
    const height = 720;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = 318;
    const seedRadius = 4.2;
    const goldenAngle = 180 * (3 - Math.sqrt(5));
    let frameId = null;
    let currentStep = 0;
    let activeSeedIndex = null;

    chart.attr("viewBox", `0 0 ${width} ${height}`).selectAll("*").remove();
    const root = chart.append("g");
    root.append("circle")
      .attr("class", "phyllotaxis-boundary")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", maxRadius + 16);
    const pathLayer = root.append("g").attr("class", "phyllotaxis-path-layer");
    const pathGuide = pathLayer.append("polyline")
      .attr("class", "phyllotaxis-path-guide")
      .style("display", "none");
    const pathLabelLayer = root.append("g")
      .attr("class", "phyllotaxis-path-labels")
      .style("display", "none");
    const seedLayer = root.append("g").attr("class", "phyllotaxis-seeds");
    const radialLine = root.append("line").attr("class", "phyllotaxis-radius-line");
    const activeSeed = root.append("circle")
      .attr("class", "phyllotaxis-active-seed")
      .attr("r", seedRadius + 2);
    const angleLabel = root.append("text")
      .attr("class", "phyllotaxis-label")
      .attr("x", 28)
      .attr("y", 34);
    const tooltipGroup = root.append("g")
      .attr("class", "phyllotaxis-tooltip")
      .attr("aria-hidden", "true")
      .style("display", "none");
    const tooltipBox = tooltipGroup.append("rect").attr("class", "phyllotaxis-tooltip-box");
    const tooltipText = tooltipGroup.append("text").attr("class", "phyllotaxis-tooltip-text");

    function format(value) {
      return d3.format(".3f")(value);
    }

    function tooltipPosition(seed) {
      const padding = 14;
      const boxWidth = 192;
      const boxHeight = 82;
      let x = seed.x + 12;
      let y = seed.y - boxHeight - 12;
      if (x + boxWidth > width) x = seed.x - boxWidth - 12;
      if (y < 0) y = seed.y + 12;
      x = Math.max(padding, Math.min(x, width - boxWidth - padding));
      y = Math.max(padding, Math.min(y, height - boxHeight - padding));
      return { x, y };
    }

    function renderTooltip(seed) {
      if (!seed) return;
      const angleDegrees = Number(angleInput.value);
      const turns = seed.theta / (Math.PI * 2);
      const lines = [
        `seed n = ${seed.index + 1}`,
        `z = ${format(seed.re)} ${seed.im < 0 ? "-" : "+"} ${format(Math.abs(seed.im))}i`,
        `r = ${format(seed.radius)}, turns = ${format(turns)}`,
        `step angle = ${d3.format(".1f")(angleDegrees)} degrees`,
      ];
      const position = tooltipPosition(seed);
      tooltipGroup
        .attr("transform", `translate(${position.x},${position.y})`)
        .attr("aria-hidden", "false")
        .style("display", null);
      tooltipText.selectAll("tspan")
        .data(lines)
        .join("tspan")
        .attr("x", 10)
        .attr("dy", (_d, index) => (index === 0 ? "1.1em" : "1.3em"))
        .attr("class", (_d, index) => (index === 0 ? "phyllotaxis-tooltip-title" : null))
        .text((d) => d);
      const box = tooltipText.node().getBBox();
      tooltipBox
        .attr("x", box.x - 8)
        .attr("y", box.y - 6)
        .attr("width", box.width + 16)
        .attr("height", box.height + 12);
    }

    function hideTooltip() {
      activeSeedIndex = null;
      tooltipGroup
        .attr("aria-hidden", "true")
        .style("display", "none");
    }

    function seedData(angleDegrees, count) {
      const angleRadians = angleDegrees * Math.PI / 180;
      const scale = maxRadius / Math.sqrt(count);
      return d3.range(count).map((index) => {
        const radius = scale * Math.sqrt(index + 0.5);
        const theta = index * angleRadians;
        const re = radius * Math.cos(theta);
        const im = radius * Math.sin(theta);
        return {
          index,
          radius,
          theta,
          re,
          im,
          x: centerX + re,
          y: centerY + im,
        };
      });
    }

    function updateValues(angleDegrees, count) {
      const scale = maxRadius / Math.sqrt(count);
      values.innerHTML = `
        <div class="exponential-value-card">
          <strong>rotation</strong>
          <span>θ = ${d3.format(".1f")(angleDegrees)} degrees</span>
          <span>golden angle = ${d3.format(".3f")(goldenAngle)} degrees</span>
        </div>
        <div class="exponential-value-card">
          <strong>position rule</strong>
          <span>z_n = c sqrt(n + 0.5) e^(i n θ)</span>
          <span>c = ${format(scale)} px</span>
        </div>
        <div class="exponential-value-card">
          <strong>scale algorithm</strong>
          <span>c = maxRadius / sqrt(seeds)</span>
          <span>${maxRadius} / sqrt(${count}) = ${format(scale)}</span>
        </div>
        <div class="exponential-value-card">
          <strong>seeds</strong>
          <span>${count} points</span>
          <span>outer radius stays near ${maxRadius}px</span>
        </div>
      `;
    }

    function renderPathOverlay(visible) {
      if (!pathModeInput.checked) {
        pathGuide.style("display", "none");
        pathLabelLayer.style("display", "none");
        pathLabelLayer.selectAll("text").remove();
        return;
      }

      pathGuide
        .attr("points", visible.map((point) => `${point.x},${point.y}`).join(" "))
        .style("display", null);

      pathLabelLayer
        .style("display", null)
        .selectAll("text")
        .data(visible, (d) => d.index)
        .join(
          (enter) => enter.append("text")
            .attr("class", "phyllotaxis-path-label")
            .attr("x", (d) => d.x + 5)
            .attr("y", (d) => d.y - 5)
            .text((d) => d.index + 1),
          (update) => update
            .attr("x", (d) => d.x + 5)
            .attr("y", (d) => d.y - 5)
            .text((d) => d.index + 1),
          (exit) => exit.remove(),
        );
    }

    function drawFrame(points, step) {
      const visible = points.slice(0, step);
      seedLayer.selectAll("circle")
        .data(visible, (d) => d.index)
        .join(
          (enter) => enter.append("circle")
            .attr("class", "phyllotaxis-seed")
            .attr("cx", centerX)
            .attr("cy", centerY)
            .attr("r", 0)
            .call((selection) => selection.transition()
              .duration(220)
              .attr("cx", (d) => d.x)
              .attr("cy", (d) => d.y)
              .attr("r", seedRadius)),
          (update) => update
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", seedRadius),
          (exit) => exit.remove(),
        )
        .attr("fill", (d) => d3.interpolateYlGnBu(0.18 + 0.68 * d.index / points.length))
        .on("mouseenter", (_event, d) => {
          activeSeedIndex = d.index;
          renderTooltip(d);
        })
        .on("mousemove", (_event, d) => {
          activeSeedIndex = d.index;
          renderTooltip(d);
        })
        .on("mouseleave", hideTooltip);

      if (activeSeedIndex !== null) {
        const activeSeedData = visible.find((d) => d.index === activeSeedIndex);
        if (activeSeedData) {
          renderTooltip(activeSeedData);
        } else {
          hideTooltip();
        }
      }

      renderPathOverlay(visible);

      const latest = points[Math.max(0, Math.min(step - 1, points.length - 1))];
      radialLine
        .attr("x1", centerX)
        .attr("y1", centerY)
        .attr("x2", latest.x)
        .attr("y2", latest.y);
      activeSeed
        .attr("cx", latest.x)
        .attr("cy", latest.y);
      angleLabel.text(`n = ${latest.index + 1}, angle = ${d3.format(".1f")(Number(angleInput.value))} degrees`);
    }

    function stopAnimation() {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    }

    function startAnimation() {
      stopAnimation();
      hideTooltip();
      seedLayer.selectAll("circle").remove();
      const angleDegrees = Number(angleInput.value);
      const count = Number(countInput.value);
      const points = seedData(angleDegrees, count);
      currentStep = 1;
      updateValues(angleDegrees, count);

      function tick() {
        drawFrame(points, currentStep);
        currentStep = Math.min(points.length, currentStep + 2);
        if (currentStep < points.length) {
          frameId = requestAnimationFrame(tick);
        } else {
          drawFrame(points, points.length);
          frameId = null;
        }
      }

      tick();
    }

    angleInput.addEventListener("input", startAnimation);
    countInput.addEventListener("input", startAnimation);
    hoverModeInput.addEventListener("change", () => {
      if (hoverModeInput.checked) renderPathOverlay([]);
    });
    pathModeInput.addEventListener("change", () => {
      const visible = seedLayer.selectAll("circle").data();
      renderPathOverlay(visible);
    });
    replayButton.addEventListener("click", startAnimation);
    startAnimation();
  }

  renderPhyllotaxisDemo();
})();
