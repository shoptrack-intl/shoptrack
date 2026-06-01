/* ============================================================
   ShopTrack — Storage Engine
   All data lives in localStorage (browser)
   Export/Import as JSON files for backup
   ============================================================ */

// Storage keys — these are the "table names" in localStorage
const KEYS = {
  jobs: 'shoptrack_jobs',
  parts: 'shoptrack_parts',
  techs: 'shoptrack_technicians',
  suppliers: 'shoptrack_suppliers',
  settings: 'shoptrack_settings',
  lastBackup: 'shoptrack_last_backup'
};

// Default technicians (pre-loaded on first use)
const DEFAULT_TECHS = [
  { id: 't1',  name: 'Julius',   status: 'active', rate: '', notes: '' },
  { id: 't2',  name: 'Arthur',   status: 'active', rate: '', notes: '' },
  { id: 't3',  name: 'Rommel',   status: 'active', rate: '', notes: '' },
  { id: 't4',  name: 'Ramzy',    status: 'active', rate: '', notes: '' },
  { id: 't5',  name: 'Gerry',    status: 'active', rate: '', notes: '' },
  { id: 't6',  name: 'Ramadan',  status: 'active', rate: '', notes: '' },
  { id: 't7',  name: 'Junryl',   status: 'active', rate: '', notes: '' },
  { id: 't8',  name: 'Alex',     status: 'active', rate: '', notes: '' },
  { id: 't9',  name: 'Marvin',   status: 'active', rate: '', notes: '' },
  { id: 't10', name: 'Mahomed',  status: 'active', rate: '', notes: '' },
  { id: 't11', name: 'Briones',  status: 'active', rate: '', notes: '' }
];

// Default suppliers (pre-loaded on first use)
const DEFAULT_SUPPLIERS = [
  'PATS',
  'NAPA',
  'Windsor Ford',
  'Nor-Lan',
  'Princess Auto',
  'Northern Metalic',
  'Canadian Tire',
  'Ken Sargent',
  'Sean Sargent',
  'Rock Auto',
  'Lindle',
  'GP Honda',
  'GP Nissan'
];

// Default shop settings
const DEFAULT_SETTINGS = {
  shopName: 'Auto Repair Shop',
  shopAddress: '',
  shopPhone: ''
};

// ============================================================
// Storage Object — All CRUD operations
// ============================================================
const Storage = {

  // Initialize storage with defaults (runs on every page load)
  init() {
    if (!localStorage.getItem(KEYS.techs)) {
      localStorage.setItem(KEYS.techs, JSON.stringify(DEFAULT_TECHS));
    }
    if (!localStorage.getItem(KEYS.suppliers)) {
      localStorage.setItem(KEYS.suppliers, JSON.stringify(DEFAULT_SUPPLIERS));
    }
    if (!localStorage.getItem(KEYS.settings)) {
      localStorage.setItem(KEYS.settings, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(KEYS.jobs)) {
      localStorage.setItem(KEYS.jobs, '[]');
    }
    if (!localStorage.getItem(KEYS.parts)) {
      localStorage.setItem(KEYS.parts, '[]');
    }
  },

  // ---- READ ----

  // Get all items from a storage key
  getAll(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  },

  // Get a single item by ID
  getById(key, id) {
    return this.getAll(key).find(item => item.id === id) || null;
  },

  // ---- CREATE ----

  // Add a new item to a storage key
  add(key, item) {
    const data = this.getAll(key);
    item.id = item.id || Utils.generateId();
    item.createdAt = new Date().toISOString();
    data.push(item);
    localStorage.setItem(key, JSON.stringify(data));
    return item;
  },

  // ---- UPDATE ----

  // Update an existing item by ID
  update(key, id, updates) {
    const data = this.getAll(key);
    const idx = data.findIndex(item => item.id === id);
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(data));
    return data[idx];
  },

  // ---- DELETE ----

  // Remove an item by ID
  remove(key, id) {
    const data = this.getAll(key).filter(item => item.id !== id);
    localStorage.setItem(key, JSON.stringify(data));
  },

  // ---- SETTINGS ----

  // Get shop settings
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.settings)) || DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  // Save shop settings
  saveSettings(settings) {
    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
  },

  // ---- BACKUP ----

  // Get last backup date
  getLastBackup() {
    return localStorage.getItem(KEYS.lastBackup) || '';
  },

  // Set last backup date to today
  setLastBackup() {
    localStorage.setItem(KEYS.lastBackup, Utils.getTodayStr());
  },

  // ---- EXPORT ----

  // Export ALL data as a downloadable JSON file
  exportAll() {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      jobs: this.getAll(KEYS.jobs),
      parts: this.getAll(KEYS.parts),
      technicians: this.getAll(KEYS.techs),
      suppliers: this.getAll(KEYS.suppliers),
      settings: this.getSettings()
    };
    const filename = `shoptrack-backup-${Utils.getTodayStr()}.json`;
    Utils.downloadFile(JSON.stringify(data, null, 2), filename);
    this.setLastBackup();
    return filename;
  },

  // ---- IMPORT ----

  // Import data from a JSON backup file
  importAll(data) {
    if (data.jobs) localStorage.setItem(KEYS.jobs, JSON.stringify(data.jobs));
    if (data.parts) localStorage.setItem(KEYS.parts, JSON.stringify(data.parts));
    if (data.technicians) localStorage.setItem(KEYS.techs, JSON.stringify(data.technicians));
    if (data.suppliers) localStorage.setItem(KEYS.suppliers, JSON.stringify(data.suppliers));
    if (data.settings) localStorage.setItem(KEYS.settings, JSON.stringify(data.settings));
  },

  // ---- CLEAR ALL ----

  // Delete everything and reset to defaults
  clearAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    this.init();
  }
};