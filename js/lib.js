if (!window.Lib) window.Lib = {};

window.Lib.render = renderLibrary;
window.Lib.edit = function(id) {
  const state = getState();
  let entry = null;
  if (id) entry = state.library.find(item => item.id === id);
  const name = prompt('Item name:', entry ? entry.name : 'New item');
  if (!name) return;

  if (entry) {
    entry.name = name;
    entry.price = Number(prompt('Price:', entry.price || 0) || 0);
    entry.category = prompt('Category:', entry.category || 'General') || 'General';
    entry.stock = Number(prompt('Stock count:', entry.stock || 0) || 0);
  } else {
    state.library.push({ id: uid(), name, category: prompt('Category:', 'General') || 'General', price: Number(prompt('Price:', 0) || 0), stock: Number(prompt('Stock count:', 0) || 0) });
  }

  saveState(state);
  updateAll();
};

window.Lib.shopSearch = function() {
  const query = document.getElementById('shopSearch')?.value || '';
  const state = getState();
  const list = document.getElementById('shopResults');
  const filtered = (state.library || []).filter(item => (item.name || '').toLowerCase().includes(query.toLowerCase()));

  list.innerHTML = filtered.length
    ? filtered.slice(0, 8).map(item => `
      <div class="item-card">
        <div class="item-row"><strong>${escapeHtml(item.name || 'Item')}</strong><span class="tag">${escapeHtml(item.category || 'General')}</span></div>
        <div class="summary-line"><span>Price</span><strong>${formatCurrency(item.price || 0)}</strong></div>
        <button class="btn secondary full" onclick="Lib.addToShop('${item.id}')">Add to shopping list</button>
      </div>
    `).join('')
    : '<div class="status warning">No matching library items found.</div>';
};
