let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentEditDate = null;
// Default admin credentials (can be customized)
const ADMIN_CREDENTIALS = { username: "admin", password: "admin123" };

// --------------------------
// Notification System Logic
// --------------------------
function createNotificationSystem() {
  const notificationContainer = document.createElement('div');
  notificationContainer.id = 'notification-container';
  document.body.appendChild(notificationContainer);

  const style = document.createElement('style');
  style.textContent = `
    #notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .notification {
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transform: translateX(120%);
      animation: slideIn 0.3s forwards, fadeOut 0.3s 3s forwards;
      max-width: 300px;
      word-wrap: break-word;
    }
    @keyframes slideIn { to { transform: translateX(0); } }
    @keyframes fadeOut { to { opacity: 0; transform: translateX(0); } }
    .notification.success { background: #4CAF50; }
    .notification.error { background: #f44336; }
  `;
  document.head.appendChild(style);
}

function showNotification(message, type = 'success') {
  const container = document.getElementById('notification-container');
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  container.appendChild(notification);
  setTimeout(() => notification.remove(), 3500);
}

// --------------------------
// Admin Login/Logout Logic
// --------------------------
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value.trim();

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    showNotification('Login successful! Welcome admin.');
  } else {
    showNotification('Invalid username or password!', 'error');
  }
}

function handleLogout() {
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('login-form').reset();
  showNotification('Logged out successfully.');
}

// --------------------------
// Description Validation Logic
// --------------------------
function validateDescription(description) {
  const hasNumbers = /\d/.test(description);
  const errorElement = document.getElementById('desc-error');
  
  if (hasNumbers) {
    errorElement.style.display = 'block';
    return false;
  } else {
    errorElement.style.display = 'none';
    return true;
  }
}

// --------------------------
// Existing Budget Logic
// --------------------------
function populateFilters() {
  const monthSelect = document.getElementById('month');
  const yearSelect = document.getElementById('year');

  monthSelect.innerHTML = '<option value="">All Months</option>';
  yearSelect.innerHTML = '<option value="">All Years</option>';

  let monthsSet = new Set();
  let yearsSet = new Set();

  transactions.forEach(tx => {
    const date = new Date(tx.date);
    monthsSet.add(date.getMonth());
    yearsSet.add(date.getFullYear());
  });

  [...monthsSet].sort().forEach(month => {
    const option = document.createElement('option');
    option.value = month;
    option.textContent = new Date(2025, month, 1).toLocaleString('en-US', { month: 'long' });
    monthSelect.appendChild(option);
  });

  [...yearsSet].sort().forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
}

function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

function updateSummary() {
  const selectedMonth = document.getElementById('month').value;
  const selectedYear = document.getElementById('year').value;

  let totalIncome = 0, totalExpense = 0;

  transactions.filter(tx => {
    const date = new Date(tx.date);
    return (selectedYear === "" || date.getFullYear() == selectedYear) &&
           (selectedMonth === "" || date.getMonth() == selectedMonth);
  }).forEach(tx => {
    if (tx.type === 'income') totalIncome += tx.amount;
    else totalExpense += tx.amount;
  });

  document.getElementById('total-income').textContent = `₱${totalIncome.toFixed(2)}`;
  document.getElementById('total-expense').textContent = `₱${totalExpense.toFixed(2)}`;
  document.getElementById('net-balance').textContent = `₱${(totalIncome - totalExpense).toFixed(2)}`;
}

function renderTransactions() {
  const selectedMonth = document.getElementById('month').value;
  const selectedYear = document.getElementById('year').value;
  const tbody = document.getElementById('transaction-list');
  tbody.innerHTML = '';

  document.getElementById('transaction-form').reset();
  document.querySelector('#transaction-form button[type="submit"]').textContent = 'Add Transaction';
  currentEditDate = null;
  document.getElementById('desc-error').style.display = 'none'; // Hide error on render

  transactions.filter(tx => {
    const date = new Date(tx.date);
    return (selectedYear === "" || date.getFullYear() == selectedYear) &&
           (selectedMonth === "" || date.getMonth() == selectedMonth);
  }).forEach(tx => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(tx.date).toLocaleDateString()}</td>
      <td>${tx.description}</td>
      <td>${tx.type}</td>
      <td>${tx.amount.toFixed(2)}</td>
      <td>
        <button class="edit-btn" onclick="editTransaction('${tx.date}')">Edit</button>
        <button class="delete-btn" onclick="deleteTransaction('${tx.date}')">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });

  updateSummary();
}

function deleteTransaction(date) {
  const transaction = transactions.find(tx => tx.date === date);
  if (!transaction) {
    showNotification('Error: Transaction not found!', 'error');
    return;
  }

  transactions = transactions.filter(tx => tx.date !== date);
  saveTransactions();
  populateFilters();
  renderTransactions();
  showNotification(`Deleted: ${transaction.description} (₱${transaction.amount.toFixed(2)})`);
}

function editTransaction(date) {
  const transaction = transactions.find(tx => tx.date === date);
  if (!transaction) {
    showNotification('Error: Transaction not found!', 'error');
    return;
  }

  currentEditDate = date;
  document.getElementById('description').value = transaction.description;
  document.getElementById('amount').value = transaction.amount;
  document.getElementById('type').value = transaction.type;
  document.querySelector('#transaction-form button[type="submit"]').textContent = 'Update Transaction';
  showNotification(`Editing: ${transaction.description} (₱${transaction.amount.toFixed(2)})`);
}

// Updated Form Submit with Validation
document.getElementById('transaction-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const description = document.getElementById('description').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const type = document.getElementById('type').value;

  // Validate description
  if (!validateDescription(description)) {
    showNotification('Description cannot contain numbers!', 'error');
    return;
  }

  if (currentEditDate) {
    const index = transactions.findIndex(tx => tx.date === currentEditDate);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], description, amount, type };
      saveTransactions();
      populateFilters();
      renderTransactions();
      showNotification(`Updated: ${description} (₱${amount.toFixed(2)})`);
    } else {
      showNotification('Error updating transaction!', 'error');
    }
  } else {
    transactions.push({ description, amount, type, date: new Date().toISOString() });
    saveTransactions();
    populateFilters();
    renderTransactions();
    showNotification(`Added: ${description} (₱${amount.toFixed(2)})`);
  }
  this.reset();
});

// Add input listener for real-time description validation
document.getElementById('description').addEventListener('input', function() {
  validateDescription(this.value.trim());
});

// Event Listeners
document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('logout-btn').addEventListener('click', handleLogout);
document.getElementById('filter-btn').addEventListener('click', renderTransactions);
document.getElementById('view-all-btn').addEventListener('click', () => {
  document.getElementById('month').value = "";
  document.getElementById('year').value = "";
  renderTransactions();
});

// Initialize App
createNotificationSystem();
populateFilters();
