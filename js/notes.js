if (!window.Notes) window.Notes = {};

window.Notes.add = function() {
  const title = document.getElementById('noteTitle').value || '';
  const text = document.getElementById('noteText').value || '';
  const pinned = document.getElementById('notePin').checked;
  if (!title && !text) return;
  const state = getState();
  state.notes.push({ id: uid(), title, text, pinned, date: getToday() });
  saveState(state);
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteText').value = '';
  document.getElementById('notePin').checked = false;
  updateAll();
};

window.Notes.render = renderNotes;
