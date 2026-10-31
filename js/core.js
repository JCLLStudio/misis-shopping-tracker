const state = getState();

function seedLibrary() {
  const defaults = [
    { id: uid(), name: 'Rice', category: 'Groceries', price: 50, stock: 5 },
    { id: uid(), name: 'Soap', category: 'Home', price: 35, stock: 3 },
    { id: uid(), name: 'Toothpaste', category: 'Personal Care', price: 42, stock: 2 }
  ];

  if (!state.library.length) {
    state.library = defaults;
    saveState(state);
  }
}

seedLibrary();
