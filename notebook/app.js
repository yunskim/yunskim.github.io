document.documentElement.dataset.project = "notebook";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function tagHref(tag) {
  return `/notebook/?tag=${encodeURIComponent(tag)}`;
}

function selectedTag() {
  return new URLSearchParams(window.location.search).get("tag") || "";
}

function allTags(notes) {
  return [...new Set(notes.flatMap((note) => note.tags || []))].sort((a, b) => a.localeCompare(b, "ko-KR"));
}

function renderTagFilter(notes, activeTag) {
  const container = document.querySelector("#tag-filter");
  if (!container) return;
  const tags = allTags(notes);
  if (!tags.length) {
    container.innerHTML = "";
    return;
  }
  const activeSummary = activeTag
    ? `<p><strong>${escapeHtml(activeTag)}</strong> 태그의 노트만 보고 있습니다. <a href="/notebook/">전체 보기</a></p>`
    : "";
  container.innerHTML = `
    ${activeSummary}
    <div class="tag-list" role="list" aria-label="노트 태그">
      ${tags.map((tag) => `
        <a href="${tagHref(tag)}" class="${tag === activeTag ? "is-active" : ""}" role="listitem">${escapeHtml(tag)}</a>
      `).join("")}
    </div>
  `;
}

function filterNotes(notes, activeTag) {
  if (!activeTag) return notes;
  return notes.filter((note) => (note.tags || []).includes(activeTag));
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
      ${note.publish === false ? '<strong class="note-draft-badge">Draft</strong>' : ""}
      <span>${escapeHtml(note.date)}</span>
      <small>${escapeHtml(note.summary)}</small>
      ${(note.tags || []).length ? `<div class="note-list-tags">${note.tags.map((tag) => `
        <a href="${tagHref(tag)}">${escapeHtml(tag)}</a>
      `).join("")}</div>` : ""}
    </li>
  `).join("");
}

async function loadNotes() {
  const list = document.querySelector("#notes-list");
  if (!list) return;
  try {
    const response = await fetch("/notebook/notes/index.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const notes = await response.json();
    const tag = selectedTag();
    renderTagFilter(notes, tag);
    renderNotes(filterNotes(notes, tag));
  } catch (error) {
    list.innerHTML = "<li>노트 목록을 불러오지 못했습니다.</li>";
  }
}

loadNotes();
