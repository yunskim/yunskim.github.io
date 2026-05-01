document.documentElement.dataset.project = "mathematics";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function renderNotes(notes) {
  const list = document.querySelector("#notes-list");
  if (!list) return;
  if (!notes.length) {
    list.innerHTML = "<li>아직 공개된 노트가 없습니다.</li>";
    return;
  }
  list.innerHTML = notes.map((note) => `
    <li>
      <a href="${escapeHtml(note.href)}">${escapeHtml(note.title)}</a>
      <span>${escapeHtml(note.date)}</span>
      <small>${escapeHtml(note.summary)}</small>
    </li>
  `).join("");
}

async function loadNotes() {
  const list = document.querySelector("#notes-list");
  if (!list) return;
  try {
    const response = await fetch("/mathematics/notes/index.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderNotes(await response.json());
  } catch (error) {
    list.innerHTML = "<li>노트 목록을 불러오지 못했습니다.</li>";
  }
}

loadNotes();
