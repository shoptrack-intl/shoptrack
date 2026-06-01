/* ============================================================
   ShopTrack — Utility Functions
   Helper functions used across all modules
   ============================================================ */

const Utils = {

  // Generate a unique ID (e.g., "m1a2b3c4d")
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // Get today's date as YYYY-MM-DD string
  getTodayStr() {
    return new Date().toISOString().split('T')[0];
  },

  // Format date string to MM/DD/YYYY for display
  formatDate(d) {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  },

  // Format date to short display (e.g., "May 16")
  formatDateShort(d) {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  // Format number as currency (e.g., "$1,234.56")
  formatCurrency(n) {
    const num = parseFloat(n) || 0;
    return '$' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  },

  // Get pay period label from a date (e.g., "May 1-15, 2026")
  getPayPeriodLabel(d) {
    const dt = new Date(d + 'T00:00:00');
    const day = dt.getDate();
    const mon = dt.toLocaleDateString('en-US', { month: 'long' });
    const yr = dt.getFullYear();
    const lastDay = new Date(yr, dt.getMonth() + 1, 0).getDate();
    return day <= 15
      ? `${mon} 1-15, ${yr}`
      : `${mon} 16-${lastDay}, ${yr}`;
  },

  // Get day of week abbreviation (e.g., "Mon")
  getDayOfWeek(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  },

  // Filter an array by date range
  filterByDateRange(arr, start, end, dateKey = 'date') {
    if (!start && !end) return arr;
    return arr.filter(item => {
      const d = item[dateKey];
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  },

  // Group an array of objects by a key
  // Returns: { "Julius": [job1, job2], "Arthur": [job3, job4] }
  groupBy(arr, key) {
    return arr.reduce((groups, item) => {
      const val = item[key] || 'Unknown';
      if (!groups[val]) groups[val] = [];
      groups[val].push(item);
      return groups;
    }, {});
  },

  // Sum a numeric property across an array
  sumBy(arr, key) {
    return arr.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0);
  },

  // Sort an array by a key (ascending or descending)
  sortArray(arr, key, dir = 'asc') {
    return [...arr].sort((a, b) => {
      let va = a[key], vb = b[key];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  },

  // Debounce a function (delays execution until user stops typing)
  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // Populate a <select> dropdown with options
  populateDropdown(sel, items, valueKey, textKey, placeholder = '-- Select --') {
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = typeof item === 'string' ? item : item[valueKey];
      opt.textContent = typeof item === 'string' ? item : item[textKey];
      sel.appendChild(opt);
    });
  },

  // Trigger a file download in the browser
  downloadFile(data, filename, type = 'application/json') {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Read and parse a JSON file from a file input
  parseJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try { resolve(JSON.parse(e.target.result)); }
        catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  // Escape HTML to prevent XSS
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
};