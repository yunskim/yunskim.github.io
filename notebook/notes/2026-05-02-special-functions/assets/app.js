(() => {
  const input = document.querySelector("#sample-app-value");
  const bar = document.querySelector("#sample-app-bar");
  const label = document.querySelector("#sample-app-label");
  if (!input || !bar || !label) return;

  const render = () => {
    const value = Number(input.value);
    bar.setAttribute("width", String(value * 24));
    label.setAttribute("x", String(value * 24 + 66));
    label.textContent = String(value);
  };

  input.addEventListener("input", render);
  render();
})();
