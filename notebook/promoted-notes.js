(() => {
  const APPS_URL = "/notebook/notes/apps.json";
  const NOTEBOOK_HREF = "/notebook/";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function currentPath() {
    return window.location.pathname.replace(/index\.html$/, "");
  }

  function addNavLinks(apps) {
    document.querySelectorAll(".site-nav").forEach((nav) => {
      const notebookLink = nav.querySelector(`a[href="${NOTEBOOK_HREF}"]`);
      apps.forEach((app) => {
        if (!app.href || nav.querySelector(`a[href="${app.href}"]`)) return;
        const isCurrent = currentPath() === app.href;
        const link = document.createElement("a");
        link.href = app.href;
        link.textContent = app.label || app.title;
        if (isCurrent) {
          link.setAttribute("aria-current", "page");
          notebookLink?.removeAttribute("aria-current");
        }
        if (notebookLink) {
          nav.insertBefore(link, notebookLink);
        } else {
          nav.appendChild(link);
        }
      });
    });
  }

  function renderRootApps(apps) {
    const container = document.querySelector("[data-promoted-note-apps]");
    if (!container || !apps.length) return;
    container.innerHTML = apps.map((app) => `
      <h3>${escapeHtml(app.label || app.title)}</h3>
      <p>
        <a href="${escapeHtml(app.href)}">${escapeHtml(app.title)}</a>${app.summary ? `는 ${escapeHtml(app.summary)}` : ""}.
      </p>
    `).join("");
  }

  async function loadApps() {
    const response = await fetch(APPS_URL);
    if (!response.ok) return [];
    const apps = await response.json();
    return Array.isArray(apps) ? apps : [];
  }

  loadApps()
    .then((apps) => {
      addNavLinks(apps);
      renderRootApps(apps);
    })
    .catch(() => {});
})();
