(() => {
  const svg = d3.select("#function-equation-chart");
  const node = svg.node();
  if (!node) return;

  const cells = [
    {
      row: 0,
      column: 0,
      family: "Linear",
      formula: "f(x) = cx",
      equation: "f(x + y) = f(x) + f(y)",
      transferFrom: "addition",
      transferTo: "addition",
      accent: "#2f6f68",
    },
    {
      row: 0,
      column: 1,
      family: "Log",
      formula: "f(x) = c log(x)",
      equation: "f(xy) = f(x) + f(y)",
      transferFrom: "multiplication",
      transferTo: "addition",
      accent: "#8a4f3d",
    },
    {
      row: 1,
      column: 0,
      family: "Exponential",
      formula: "f(x) = e^(cx)",
      equation: "f(x + y) = f(x)f(y)",
      transferFrom: "addition",
      transferTo: "multiplication",
      accent: "#8a4f3d",
    },
    {
      row: 1,
      column: 1,
      family: "Power",
      formula: "f(x) = x^c",
      equation: "f(xy) = f(x)f(y)",
      transferFrom: "multiplication",
      transferTo: "multiplication",
      accent: "#2f6f68",
    },
  ];

  const columnLabels = ["input: x + y", "input: xy"];
  const rowLabels = ["output: f(x) + f(y)", "output: f(x)f(y)"];

  function render() {
    const availableWidth = Math.max(320, node.clientWidth || 920);
    const compact = availableWidth < 620;
    const width = compact ? 560 : 920;
    const height = compact ? 520 : 500;
    const margin = compact
      ? { top: 64, right: 18, bottom: 26, left: 94 }
      : { top: 68, right: 36, bottom: 28, left: 164 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const cellWidth = innerWidth / 2;
    const cellHeight = innerHeight / 2;

    svg.attr("viewBox", `0 0 ${width} ${height}`).selectAll("*").remove();

    svg.append("defs")
      .append("marker")
      .attr("id", "function-equation-arrowhead")
      .attr("viewBox", "0 0 8 8")
      .attr("refX", 7)
      .attr("refY", 4)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("class", "function-equation-arrowhead")
      .attr("d", "M 0 0 L 8 4 L 0 8 z");

    const root = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    root.append("rect")
      .attr("class", "function-equation-frame")
      .attr("width", innerWidth)
      .attr("height", innerHeight);

    root.append("line")
      .attr("class", "function-equation-rule")
      .attr("x1", cellWidth)
      .attr("x2", cellWidth)
      .attr("y1", 0)
      .attr("y2", innerHeight);

    root.append("line")
      .attr("class", "function-equation-rule")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", cellHeight)
      .attr("y2", cellHeight);

    root.selectAll(".function-equation-column-label")
      .data(columnLabels)
      .join("text")
      .attr("class", "function-equation-label function-equation-column-label")
      .attr("x", (_, index) => index * cellWidth + cellWidth / 2)
      .attr("y", -28)
      .attr("text-anchor", "middle")
      .text((d) => d);

    root.selectAll(".function-equation-row-label")
      .data(rowLabels)
      .join("text")
      .attr("class", "function-equation-label function-equation-row-label")
      .attr("x", compact ? -14 : -22)
      .attr("y", (_, index) => index * cellHeight + cellHeight / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .text((d) => d);

    const cell = root.selectAll(".function-equation-cell")
      .data(cells)
      .join("g")
      .attr("class", "function-equation-cell")
      .attr("transform", (d) => `translate(${d.column * cellWidth},${d.row * cellHeight})`);

    cell.append("rect")
      .attr("class", "function-equation-cell-bg")
      .attr("x", 0.5)
      .attr("y", 0.5)
      .attr("width", cellWidth - 1)
      .attr("height", cellHeight - 1);

    cell.append("line")
      .attr("class", "function-equation-accent")
      .attr("x1", 18)
      .attr("x2", cellWidth - 18)
      .attr("y1", 18)
      .attr("y2", 18)
      .attr("stroke", (d) => d.accent);

    cell.append("text")
      .attr("class", "function-equation-family")
      .attr("x", 18)
      .attr("y", compact ? 50 : 54)
      .text((d) => d.family);

    cell.append("text")
      .attr("class", "function-equation-formula")
      .attr("x", 18)
      .attr("y", compact ? 82 : 90)
      .text((d) => d.formula);

    cell.append("text")
      .attr("class", "function-equation-equation")
      .attr("x", 18)
      .attr("y", compact ? 112 : 126)
      .text((d) => d.equation);

    const transfer = cell.append("g")
      .attr("class", "function-equation-transfer")
      .attr("transform", `translate(0,${cellHeight - 24})`);

    transfer.append("text")
      .attr("class", "function-equation-transfer-text")
      .attr("x", 18)
      .attr("y", 0)
      .text((d) => d.transferFrom);

    transfer.append("line")
      .attr("class", "function-equation-transfer-arrow")
      .attr("x1", cellWidth * 0.48)
      .attr("x2", cellWidth * 0.57)
      .attr("y1", -4)
      .attr("y2", -4)
      .attr("marker-end", "url(#function-equation-arrowhead)");

    transfer.append("text")
      .attr("class", "function-equation-transfer")
      .attr("x", cellWidth - 18)
      .attr("y", 0)
      .attr("text-anchor", "end")
      .text((d) => d.transferTo);
  }

  let resizeFrame = null;
  window.addEventListener("resize", () => {
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(render);
  });

  render();
})();
