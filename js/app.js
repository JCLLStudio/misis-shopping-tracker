window.addEventListener('DOMContentLoaded', () => {
  const state = ensureStateShape();
  if (!state.library.length) {
    state.library = [
      { id: uid(), name: 'Rice', category: 'Groceries', price: 50, stock: 5 },
      { id: uid(), name: 'Soap', category: 'Home', price: 35, stock: 3 },
      { id: uid(), name: 'Toothpaste', category: 'Personal Care', price: 42, stock: 2 }
    ];
  }
  saveState(state);
  updateAll();
});
