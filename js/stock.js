if (!window.Stock) window.Stock = {};

window.Stock.render = renderStock;
window.Stock.restockAll = function() {
  const state = getState();
  state.stock = (state.stock.length ? state.stock : (state.library || []).map(item => ({
    id: uid(),
    name: item.name,
    category: item.category || 'General',
    stock: Number(item.stock || 0),
    target: Number(item.stock || 0) + 2
  })));

  state.stock = state.stock.map(item => ({ ...item, stock: Number(item.stock || 0), target: Number(item.target || 0) || Number(item.stock || 0) + 2 }));
  saveState(state);
  updateAll();
};
