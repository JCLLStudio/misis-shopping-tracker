const STORAGE_KEY = 'misis-shopping-tracker-v2';
const DEFAULT_STATE = {
  wallet: {
    allocation: 0,
    transactions: [],
    cashCount: { '1000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '1': 0, '0.25': 0 },
    lastBackup: null
  },
  shopping: {
    items: [],
    templates: [],
    favorites: [],
    tripStore: '',
    cashGiven: 0,
    actualChange: 0
  },
  library: [],
  notes: [],
  stock: []
};

function uid() {
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      wallet: { ...structuredClone(DEFAULT_STATE.wallet), ...(parsed.wallet || {}) },
      shopping: { ...structuredClone(DEFAULT_STATE.shopping), ...(parsed.shopping || {}) },
      notes: Array.isArray(parsed.notes) ? parsed.notes : []
    };
  } catch (err) {
    console.warn('Unable to read state:', err);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount);
}

function sumBy(list, key) {
  return list.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function getToday() {
  return new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function ensureStateShape() {
  const state = loadState();
  if (!Array.isArray(state.library)) state.library = [];
  if (!Array.isArray(state.notes)) state.notes = [];
  if (!Array.isArray(state.stock)) state.stock = [];
  if (!state.wallet) state.wallet = structuredClone(DEFAULT_STATE.wallet);
  if (!state.shopping) state.shopping = structuredClone(DEFAULT_STATE.shopping);
  return state;
}

function exportData() {
  const state = ensureStateShape();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'misis-backup-' + Date.now() + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function() {
    try {
      const imported = JSON.parse(reader.result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...structuredClone(DEFAULT_STATE), ...imported }));
      location.reload();
    } catch (e) {
      alert('Invalid backup file.');
    }
  };
  reader.readAsText(file);
}

function exportCSV() {
  const state = ensureStateShape();
  const rows = [['Date', 'Type', 'Amount', 'Category', 'Note']];
  for (const tx of state.wallet.transactions || []) {
    rows.push([tx.date || '', tx.type || '', tx.amount || 0, tx.category || '', tx.note || '']);
  }
  const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'misis-transactions-' + Date.now() + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function exportLib() {
  const state = ensureStateShape();
  const payload = { library: state.library || [], stock: state.stock || [] };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'misis-library-' + Date.now() + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importLib(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function() {
    try {
      const imported = JSON.parse(reader.result);
      const state = ensureStateShape();
      state.library = Array.isArray(imported.library) ? imported.library : state.library;
      state.stock = Array.isArray(imported.stock) ? imported.stock : state.stock;
      saveState(state);
      location.reload();
    } catch (e) {
      alert('Invalid library file.');
    }
  };
  reader.readAsText(file);
}

function getState() {
  return ensureStateShape();
}

function setState(nextState) {
  saveState(nextState);
}

function getWalletSummary() {
  const state = getState();
  const tx = state.wallet.transactions || [];
  const totalIn = sumBy(tx.filter(t => t.type === 'in'), 'amount');
  const totalOut = sumBy(tx.filter(t => t.type === 'out'), 'amount');
  const shopping = tx.filter(t => t.type === 'out' && (t.category === 'Shopping' || /shop|shopping|groceries/i.test(t.note || ''))).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const other = totalOut - shopping;
  const balance = totalIn - totalOut;
  return { totalIn, totalOut, shopping, other, balance };
}

function renderWalletTransactions() {
  const state = getState();
  const tx = [...(state.wallet.transactions || [])].slice(-8).reverse();
  const el = document.getElementById('walletTransactions');
  if (!el) return;
  if (!tx.length) {
    el.innerHTML = '<div class="status warning">Walang wallet transactions pa.</div>';
    return;
  }

  el.innerHTML = tx.map(t => `
    <div class="history-item">
      <div class="item-row">
        <strong>${escapeHtml(t.category || 'Transaction')}</strong>
        <span class="tag">${t.type === 'in' ? 'CASH IN' : 'CASH OUT'}</span>
      </div>
      <div class="summary-line"><span>${escapeHtml(t.note || 'No note')}</span><strong>${t.type === 'in' ? '+' : '-'}${formatCurrency(t.amount)}</strong></div>
      <small>${escapeHtml(t.date || '')}</small>
    </div>
  `).join('');
}

function renderDenominations() {
  const el = document.getElementById('denominations');
  if (!el) return;
  const state = getState();
  const cash = state.wallet.cashCount || { '1000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '1': 0, '0.25': 0 };
  const denomList = [
    { label: '₱1000', key: '1000' },
    { label: '₱500', key: '500' },
    { label: '₱200', key: '200' },
    { label: '₱100', key: '100' },
    { label: '₱50', key: '50' },
    { label: '₱20', key: '20' },
    { label: '₱10', key: '10' },
    { label: '₱5', key: '5' },
    { label: '₱1', key: '1' },
    { label: '₱0.25', key: '0.25' }
  ];

  const total = denomList.reduce((sum, item) => sum + (Number(cash[item.key]) || 0) * Number(item.key), 0);
  const expected = Number(document.getElementById('walletBalance')?.dataset?.balance || 0);
  document.getElementById('denomTotal').textContent = formatCurrency(total);
  document.getElementById('denomExpected').textContent = formatCurrency(expected);

  const status = document.getElementById('denomStatus');
  if (total === expected) {
    status.className = 'status success';
    status.textContent = 'Tugma ang physical cash at wallet balance.';
  } else {
    status.className = 'status warning';
    status.textContent = 'May pagkakaiba sa physical cash vs wallet balance.';
  }

  el.innerHTML = denomList.map(item => `
    <div class="summary-line">
      <span>${item.label}</span>
      <strong>${(cash[item.key] || 0)} pcs</strong>
    </div>
  `).join('');
}

function renderAllWallet() {
  const state = getState();
  const summary = getWalletSummary();
  const walletBalance = document.getElementById('walletBalance');
  if (walletBalance) {
    walletBalance.textContent = formatCurrency(summary.balance);
    walletBalance.dataset.balance = summary.balance;
  }

  const totalInEl = document.getElementById('totalIn');
  const totalOutEl = document.getElementById('totalOut');
  const totalShopping = document.getElementById('totalShopping');
  const totalOther = document.getElementById('totalOther');
  const walletDetail = document.getElementById('walletDetail');
  const reservedDisplay = document.getElementById('reservedDisplay');
  const availableDisplay = document.getElementById('availableDisplay');
  const walletStatus = document.getElementById('walletStatus');
  const allocationInput = document.getElementById('allocation');

  if (totalInEl) totalInEl.textContent = formatCurrency(summary.totalIn);
  if (totalOutEl) totalOutEl.textContent = formatCurrency(summary.totalOut);
  if (totalShopping) totalShopping.textContent = formatCurrency(summary.shopping);
  if (totalOther) totalOther.textContent = formatCurrency(summary.other);
  if (walletDetail) walletDetail.textContent = formatCurrency(summary.balance);

  const allocation = Number(state.wallet.allocation || 0);
  const beforeAllocation = Math.max(summary.balance - allocation, 0);
  const afterAllocation = Math.max(summary.balance - allocation, 0);

  if (reservedDisplay) reservedDisplay.textContent = formatCurrency(allocation);
  if (availableDisplay) availableDisplay.textContent = formatCurrency(Math.max(summary.balance - allocation, 0));
  if (walletStatus) {
    walletStatus.className = summary.balance > 0 ? 'status success' : 'status warning';
    walletStatus.textContent = summary.balance > 0 ? 'May available funds na para sa shopping.' : 'Mag-Cash In muna para magkaroon ng funds.';
  }
  if (allocationInput) allocationInput.value = allocation;

  const beforeAllocEl = document.getElementById('beforeAllocation');
  const allocationDisplay = document.getElementById('allocationDisplay');
  const afterAllocEl = document.getElementById('afterAllocation');
  const allocStatus = document.getElementById('allocationStatus');

  if (beforeAllocEl) beforeAllocEl.textContent = formatCurrency(Math.max(summary.balance, 0));
  if (allocationDisplay) allocationDisplay.textContent = formatCurrency(allocation);
  if (afterAllocEl) afterAllocEl.textContent = formatCurrency(Math.max(summary.balance - allocation, 0));
  if (allocStatus) {
    if (allocation > 0) {
      allocStatus.className = 'status success';
      allocStatus.textContent = 'Naka-reserve na ang shopping budget.';
    } else {
      allocStatus.className = 'status warning';
      allocStatus.textContent = 'Wala pang allocated shopping budget.';
    }
  }

  renderWalletTransactions();
  renderDenominations();
}

function showPage(id, el) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
  if (el) el.classList.add('active');
}

function openTransaction(type) {
  const title = document.getElementById('modalTitle');
  const modal = document.getElementById('transactionModal');
  const amount = document.getElementById('transactionAmount');
  const category = document.getElementById('transactionCategory');
  const note = document.getElementById('transactionNote');
  const warning = document.getElementById('modalWarning');
  if (title) title.textContent = type === 'in' ? 'CASH IN' : 'CASH OUT';
  if (amount) amount.value = '';
  if (category) category.value = type === 'in' ? 'Money from Misis' : 'Other';
  if (note) note.value = '';
  if (warning) warning.textContent = type === 'in' ? 'Add funds to your wallet.' : 'Use this for expenses and shopping.';
  if (modal) {
    modal.style.display = 'flex';
    modal.dataset.type = type;
  }
}

function closeTransaction() {
  const modal = document.getElementById('transactionModal');
  if (modal) modal.style.display = 'none';
}

function submitTransaction() {
  const modal = document.getElementById('transactionModal');
  const amount = Number(document.getElementById('transactionAmount')?.value || 0);
  const category = document.getElementById('transactionCategory')?.value || 'Other';
  const note = document.getElementById('transactionNote')?.value || '';
  const type = modal?.dataset?.type || 'in';

  if (!amount || amount <= 0) {
    alert('Please enter a valid amount.');
    return;
  }

  const state = getState();
  const tx = {
    id: uid(),
    type,
    amount,
    category,
    note,
    date: getToday()
  };

  state.wallet.transactions.push(tx);
  saveState(state);
  closeTransaction();
  updateAll();
}

function applyAllocation() {
  const amount = Number(document.getElementById('allocation')?.value || 0);
  const state = getState();
  const balance = getWalletSummary().balance;

  if (amount < 0) {
    alert('Allocation cannot be negative.');
    return;
  }
  if (amount > balance) {
    alert('Allocation exceeds available wallet balance.');
    return;
  }

  state.wallet.allocation = amount;
  saveState(state);
  updateAll();
}

function releaseAllocation() {
  const state = getState();
  state.wallet.allocation = 0;
  saveState(state);
  updateAll();
}

function addItem() {
  const state = getState();
  const itemName = prompt('Item name:', '');
  if (!itemName) return;

  const item = {
    id: uid(),
    name: itemName,
    price: 0,
    quantity: 1,
    purchased: false,
    category: 'General'
  };

  state.shopping.items.push(item);
  saveState(state);
  updateAll();
}

function saveTemplate() {
  const state = getState();
  const name = prompt('Name for your shopping list:', 'Weekly Essentials');
  if (!name) return;
  state.shopping.templates.push({ id: uid(), name, items: [...state.shopping.items] });
  saveState(state);
  updateAll();
}

function openTemplates() {
  const state = getState();
  const box = document.getElementById('templatesBox');
  box.style.display = state.shopping.templates.length ? 'block' : 'none';
  const list = document.getElementById('templatesList');
  list.innerHTML = state.shopping.templates.length
    ? state.shopping.templates.map(t => `<div class="item-card"><div class="item-row"><strong>${escapeHtml(t.name)}</strong><button class="btn secondary" onclick="loadTemplate('${t.id}')">Load</button></div></div>`).join('')
    : '<div class="status warning">No saved templates yet.</div>';
}

function loadTemplate(id) {
  const state = getState();
  const template = state.shopping.templates.find(t => t.id === id);
  if (!template) return;
  state.shopping.items = template.items.map(item => ({ ...item }));
  saveState(state);
  updateAll();
}

function updateAll() {
  const state = getState();
  const shoppingTotal = sumBy(state.shopping.items || [], 'price');
  const allocation = Number(state.wallet.allocation || 0);
  const summary = getWalletSummary();

  document.getElementById('shoppingBudgetDisplay').textContent = formatCurrency(allocation);
  document.getElementById('shoppingExpense').textContent = formatCurrency(summary.shopping);
  document.getElementById('unusedAllocation').textContent = formatCurrency(Math.max(allocation - summary.shopping, 0));
  document.getElementById('shoppingTotal').textContent = formatCurrency(shoppingTotal);
  document.getElementById('shoppingBalance').textContent = formatCurrency(Math.max(allocation - shoppingTotal, 0));
  document.getElementById('progress').textContent = `${(state.shopping.items || []).filter(i => i.purchased).length} / ${(state.shopping.items || []).length}`;
  const progress = (state.shopping.items || []).length ? ((state.shopping.items.filter(i => i.purchased).length / state.shopping.items.length) * 100) : 0;
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = `${progress}%`;

  const tripStore = document.getElementById('tripStore');
  if (tripStore) tripStore.value = state.shopping.tripStore || '';

  const cashGiven = Number(document.getElementById('cashGiven')?.value || 0);
  const actualChange = Number(document.getElementById('actualChange')?.value || 0);
  const expected = Math.max((cashGiven || 0) - shoppingTotal, 0);
  const diff = Number(actualChange) - expected;
  document.getElementById('cashDisplay').textContent = formatCurrency(cashGiven || 0);
  document.getElementById('expectedChange').textContent = formatCurrency(expected);
  document.getElementById('actualDisplay').textContent = actualChange ? formatCurrency(actualChange) : '—';
  document.getElementById('difference').textContent = actualChange ? formatCurrency(diff) : '—';

  const verification = document.getElementById('verification');
  if (verification) {
    if (actualChange || cashGiven) {
      verification.className = 'status ' + (Math.abs(diff) < 0.01 ? 'success' : 'warning');
      verification.textContent = Math.abs(diff) < 0.01 ? 'Magaling! Nakatugma ang change.' : 'May kaunting pagkakaiba sa actual change.';
    } else {
      verification.className = 'status warning';
      verification.textContent = 'Maglagay ng cash given at actual change.';
    }
  }

  renderShoppingList();
  renderFavoriteItems();
  renderHistory();
  renderWalletTransactions();
  renderAllWallet();
  renderLibrary();
  renderNotes();
  renderStock();
}

function renderShoppingList() {
  const state = getState();
  const items = state.shopping.items || [];
  const itemsList = document.getElementById('itemsList');
  if (!itemsList) return;
  if (!items.length) {
    itemsList.innerHTML = '<div class="status warning">Walang item sa shopping checklist.</div>';
    return;
  }
  itemsList.innerHTML = items.map(item => `
    <div class="item-card">
      <div class="item-row">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="tag">${formatCurrency(item.price || 0)}</span>
      </div>
      <div class="checkbox-row">
        <input type="checkbox" ${item.purchased ? 'checked' : ''} onchange="togglePurchased('${item.id}', this.checked)">
        <label>Purchased</label>
      </div>
    </div>
  `).join('');
}

function togglePurchased(id, purchased) {
  const state = getState();
  const item = state.shopping.items.find(i => i.id === id);
  if (!item) return;
  item.purchased = purchased;
  saveState(state);
  updateAll();
}

function renderFavoriteItems() {
  const state = getState();
  const list = document.getElementById('favoritesList');
  if (!list) return;
  if (!state.library.length) {
    list.innerHTML = '<div class="status warning">Walang naka-save na favorite items.</div>';
    return;
  }
  list.innerHTML = state.library.slice(0, 6).map(item => `
    <div class="item-card"><div class="item-row"><strong>${escapeHtml(item.name || 'Unnamed item')}</strong><span class="tag">${escapeHtml(item.category || 'General')}</span></div></div>
  `).join('');
}

function renderHistory() {
  const state = getState();
  const list = document.getElementById('historyList');
  if (!list) return;
  if (!state.wallet.transactions.length) {
    list.innerHTML = '<div class="status warning">No transaction history yet.</div>';
    return;
  }
  list.innerHTML = [...state.wallet.transactions].slice(-10).reverse().map(tx => `
    <div class="history-item">
      <div class="item-row">
        <strong>${escapeHtml(tx.category || 'Transaction')}</strong>
        <strong>${tx.type === 'in' ? '+' : '-'}${formatCurrency(tx.amount)}</strong>
      </div>
      <small>${escapeHtml(tx.note || 'No note')}</small>
      <div><small>${escapeHtml(tx.date || '')}</small></div>
    </div>
  `).join('');
}

function renderLibrary() {
  const state = getState();
  const libCount = document.getElementById('libCount');
  const libCat = document.getElementById('libCat');
  const libList = document.getElementById('libList');
  if (!libList) return;

  if (libCat) {
    const categories = ['All', ...new Set((state.library || []).map(item => item.category || 'General'))];
    libCat.innerHTML = categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
  }

  const query = (document.getElementById('libSearch')?.value || '').toLowerCase();
  const selectedCat = (document.getElementById('libCat')?.value || 'All');
  const filtered = (state.library || []).filter(item => {
    const matchesQuery = !query || (item.name || '').toLowerCase().includes(query);
    const matchesCat = selectedCat === 'All' || (item.category || 'General') === selectedCat;
    return matchesQuery && matchesCat;
  });

  if (libCount) libCount.textContent = `(${filtered.length})`;

  libList.innerHTML = filtered.length
    ? filtered.map(item => `
        <div class="item-card">
          <div class="item-row"><strong>${escapeHtml(item.name || 'Item')}</strong><span class="tag">${escapeHtml(item.category || 'General')}</span></div>
          <div class="summary-line"><span>Price</span><strong>${formatCurrency(item.price || 0)}</strong></div>
          <div class="summary-line"><span>Stock</span><strong>${Number(item.stock || 0)}</strong></div>
          <div class="row">
            <button class="btn secondary" onclick="Lib.edit('${item.id}')">Edit</button>
            <button class="btn primary" onclick="Lib.addToShop('${item.id}')">Add to Shop</button>
          </div>
        </div>
      `).join('')
    : '<div class="status warning">No matching library items.</div>';
}

function renderNotes() {
  const state = getState();
  const notes = state.notes || [];
  const list = document.getElementById('notesList');
  if (!list) return;
  const query = (document.getElementById('noteSearch')?.value || '').toLowerCase();
  const filtered = notes.filter(n => (n.title + ' ' + n.text).toLowerCase().includes(query));
  if (!filtered.length) {
    list.innerHTML = '<div class="status warning">Walang notes.</div>';
    return;
  }
  list.innerHTML = filtered.map(note => `
    <div class="note-card">
      <div class="item-row"><strong>${escapeHtml(note.title || 'Untitled')}</strong>${note.pinned ? '<span class="tag">Pinned</span>' : ''}</div>
      <p>${escapeHtml(note.text || '')}</p>
      <small>${escapeHtml(note.date || '')}</small>
    </div>
  `).join('');
}

function renderStock() {
  const state = getState();
  const list = document.getElementById('stockList');
  if (!list) return;
  const filter = document.getElementById('stockFilter')?.value || 'all';
  const items = (state.stock || []).filter(item => filter === 'all' || Number(item.stock || 0) <= Number(item.target || 1));
  const summary = document.getElementById('stockSummary');
  if (summary) {
    summary.innerHTML = `
      <div class="wallet-stat"><small>Tracked</small><strong>${items.length}</strong></div>
      <div class="wallet-stat"><small>Need Buy</small><strong>${items.filter(item => Number(item.stock || 0) <= Number(item.target || 1)).length}</strong></div>
    `;
  }

  if (!items.length) {
    list.innerHTML = '<div class="status warning">No inventory tracked yet.</div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="stock-card">
      <div class="item-row"><strong>${escapeHtml(item.name || 'Item')}</strong><span class="tag">${escapeHtml(item.category || 'General')}</span></div>
      <div class="summary-line"><span>Stock</span><strong>${Number(item.stock || 0)}</strong></div>
      <div class="summary-line"><span>Target</span><strong>${Number(item.target || 0)}</strong></div>
    </div>
  `).join('');
}

window.addEventListener('load', () => {
  const state = ensureStateShape();
  const currentDate = new Date();
  if (!state.wallet.lastBackup) state.wallet.lastBackup = currentDate.toISOString();
  saveState(state);
  updateAll();
});

window.calcDigit = function(value) { /* no-op placeholder for calculator */ };
window.calcClear = function() { /* no-op placeholder */ };
window.calcBack = function() { /* no-op placeholder */ };
window.calcPercent = function() { /* no-op placeholder */ };
window.calcOperator = function(value) { /* no-op placeholder */ };
window.calcEquals = function() { /* no-op placeholder */ };
window.calcSign = function() { /* no-op placeholder */ };
window.calcDecimal = function() { /* no-op placeholder */ };
window.calcUseBudget = function() { /* no-op placeholder */ };
window.calcUseCash = function() { /* no-op placeholder */ };
window.saveTrip = function() { /* no-op placeholder */ };
window.exportData = exportData;
window.importData = importData;
window.exportCSV = exportCSV;
window.exportLib = exportLib;
window.importLib = importLib;
window.showPage = showPage;
window.openTransaction = openTransaction;
window.closeTransaction = closeTransaction;
window.submitTransaction = submitTransaction;
window.applyAllocation = applyAllocation;
window.releaseAllocation = releaseAllocation;
window.addItem = addItem;
window.saveTemplate = saveTemplate;
window.openTemplates = openTemplates;
window.loadTemplate = loadTemplate;
window.updateAll = updateAll;
window.togglePurchased = togglePurchased;

window.Lib = {
  render: renderLibrary,
  edit: function(id) { alert('Library editor is available in the full app build.'); },
  shopSearch: function() { /* no-op placeholder */ },
  addToShop: function(id) {
    const state = getState();
    const item = (state.library || []).find(x => x.id === id);
    if (!item) return;
    state.shopping.items.push({ id: uid(), name: item.name || 'Item', price: Number(item.price || 0), quantity: 1, purchased: false, category: item.category || 'General' });
    saveState(state);
    updateAll();
  }
};

window.Stock = {
  render: renderStock,
  restockAll: function() {
    const state = getState();
    state.stock = (state.stock || []).map(item => ({ ...item, stock: Number(item.target || item.stock || 0) }));
    saveState(state);
    updateAll();
  }
};

window.Notes = {
  add: function() {
    const state = getState();
    const title = document.getElementById('noteTitle')?.value || '';
    const text = document.getElementById('noteText')?.value || '';
    const pinned = document.getElementById('notePin')?.checked || false;
    if (!title && !text) return;
    state.notes.push({ id: uid(), title, text, pinned, date: getToday() });
    saveState(state);
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteText').value = '';
    document.getElementById('notePin').checked = false;
    updateAll();
  },
  render: renderNotes
};

window.saveTrip = function() {
  const state = getState();
  const total = sumBy(state.shopping.items || [], 'price');
  const cashGiven = Number(document.getElementById('cashGiven')?.value || 0);
  const actualChange = Number(document.getElementById('actualChange')?.value || 0);
  const store = document.getElementById('tripStore')?.value || 'General';
  state.shopping.tripStore = store;
  state.wallet.transactions.push({ id: uid(), type: 'out', amount: total, category: 'Shopping', note: `Trip at ${store}`, date: getToday() });
  state.wallet.transactions.push({ id: uid(), type: 'in', amount: cashGiven, category: 'Cash Tendered', note: `Cash from trip at ${store}`, date: getToday() });
  saveState(state);
  updateAll();
};
