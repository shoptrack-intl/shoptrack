/* ============================================================
   ShopTrack — Settings Module
   Manage technicians, suppliers, shop info, backup/restore
   ============================================================ */

// Initialize when settings.html loads
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('settings-page')) return;
  initSettingsPage();
});

function initSettingsPage() {
  // Render lists
  renderTechs();
  renderSuppliers();
  loadShopInfo();

  // Form handlers
  document.getElementById('add-tech-form').addEventListener('submit', addTech);
  document.getElementById('add-supplier-form').addEventListener('submit', addSupplier);
  document.getElementById('shop-info-form').addEventListener('submit', saveShopInfo);

  // Export button
  document.getElementById('btn-export').addEventListener('click', handleExport);

  // Import button (triggers hidden file input)
  document.getElementById('btn-import-trigger').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  // Import file change handler
  document.getElementById('import-file').addEventListener('change', handleImport);

  // Clear all button
  document.getElementById('btn-clear-all').addEventListener('click', handleClearAll);
}

// ============================================================
// TECHNICIANS — Render the list
// ============================================================
function renderTechs() {
  const techs = Storage.getAll(KEYS.techs);
  const list = document.getElementById('techs-list');
  if (!list) return;

  if (techs.length === 0) {
    list.innerHTML = '<p style="color:var(--gray); padding:20px; text-align:center;">No technicians added yet.</p>';
    return;
  }

  // Sort: active first, then alphabetical
  const sorted = [...techs].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  list.innerHTML = sorted.map(t => {
    const badgeClass = t.status === 'active' ? 'badge-active' : 'badge-inactive';
    const btnClass = t.status === 'active' ? 'btn-warning' : 'btn-primary';
    const btnText = t.status === 'active' ? 'Deactivate' : 'Activate';

    return `
      <div class="list-item">
        <div>
          <span style="font-weight:600; font-size:1rem;">${Utils.escapeHtml(t.name)}</span>
          <span class="badge ${badgeClass}" style="margin-left:10px;">${t.status}</span>
          ${t.rate ? `<span style="margin-left:10px; color:var(--gray); font-size:0.85rem;">Rate: ${Utils.formatCurrency(t.rate)}/hr</span>` : ''}
          ${t.notes ? `<br><small style="color:var(--gray);">${Utils.escapeHtml(t.notes)}</small>` : ''}
        </div>
        <div class="table-actions">
          <button class="btn btn-sm ${btnClass}" onclick="toggleTechStatus('${t.id}')">${btnText}</button>
        </div>
      </div>
    `;
  }).join('');

  // Show count
  const activeCount = techs.filter(t => t.status === 'active').length;
  const countEl = document.getElementById('techs-count');
  if (countEl) countEl.textContent = `${activeCount} active / ${techs.length} total`;
}

// ============================================================
// TECHNICIANS — Add a new technician
// ============================================================
function addTech(e) {
  e.preventDefault();

  const nameInput = document.getElementById('new-tech-name');
  const name = nameInput.value.trim();

  if (!name) {
    showToast('Please enter a technician name.', 'error');
    return;
  }

  // Check for duplicates
  const existing = Storage.getAll(KEYS.techs);
  if (existing.find(t => t.name.toLowerCase() === name.toLowerCase())) {
    showToast(`Technician "${name}" already exists!`, 'error');
    return;
  }

  // Add the new technician
  Storage.add(KEYS.techs, {
    name: name,
    status: 'active',
    rate: '',
    notes: ''
  });

  nameInput.value = '';
  renderTechs();
  showToast(`Technician "${name}" added!`, 'success');
}

// ============================================================
// TECHNICIANS — Toggle active/inactive status
// ============================================================
function toggleTechStatus(id) {
  const tech = Storage.getById(KEYS.techs, id);
  if (!tech) return;

  const newStatus = tech.status === 'active' ? 'inactive' : 'active';

  if (newStatus === 'inactive') {
    // Confirm before deactivating
    showConfirm(
      `Deactivate "${tech.name}"? They will no longer appear in dropdown menus for new entries. Their existing data will NOT be deleted.`,
      () => {
        Storage.update(KEYS.techs, id, { status: newStatus });
        renderTechs();
        showToast(`${tech.name} has been deactivated.`, 'warning');
      }
    );
  } else {
    // Activate immediately (no confirmation needed)
    Storage.update(KEYS.techs, id, { status: newStatus });
    renderTechs();
    showToast(`${tech.name} has been activated!`, 'success');
  }
}

// ============================================================
// SUPPLIERS — Render the list
// ============================================================
function renderSuppliers() {
  const suppliers = Storage.getAll(KEYS.suppliers);
  const list = document.getElementById('suppliers-list');
  if (!list) return;

  if (suppliers.length === 0) {
    list.innerHTML = '<p style="color:var(--gray); padding:20px; text-align:center;">No suppliers added yet.</p>';
    return;
  }

  // Sort alphabetically
  const sorted = [...suppliers].sort((a, b) => a.localeCompare(b));

  list.innerHTML = sorted.map((s, idx) => {
    // Find the original index (before sorting) for deletion
    const originalIdx = suppliers.indexOf(s);

    return `
      <div class="list-item">
        <span style="font-weight:500; font-size:1rem;">${Utils.escapeHtml(s)}</span>
        <button class="btn btn-sm btn-danger" onclick="deleteSupplier(${originalIdx})" title="Remove supplier">Remove</button>
      </div>
    `;
  }).join('');

  // Show count
  const countEl = document.getElementById('suppliers-count');
  if (countEl) countEl.textContent = `${suppliers.length} suppliers`;
}

// ============================================================
// SUPPLIERS — Add a new supplier
// ============================================================
function addSupplier(e) {
  e.preventDefault();

  const nameInput = document.getElementById('new-supplier-name');
  const name = nameInput.value.trim();

  if (!name) {
    showToast('Please enter a supplier name.', 'error');
    return;
  }

  // Check for duplicates
  const suppliers = Storage.getAll(KEYS.suppliers);
  if (suppliers.find(s => s.toLowerCase() === name.toLowerCase())) {
    showToast(`Supplier "${name}" already exists!`, 'error');
    return;
  }

  // Add the new supplier
  suppliers.push(name);
  localStorage.setItem(KEYS.suppliers, JSON.stringify(suppliers));

  nameInput.value = '';
  renderSuppliers();
  showToast(`Supplier "${name}" added!`, 'success');
}

// ============================================================
// SUPPLIERS — Delete a supplier
// ============================================================
function deleteSupplier(idx) {
  const suppliers = Storage.getAll(KEYS.suppliers);
  const name = suppliers[idx];

  showConfirm(
    `Remove supplier "${name}"? This will NOT affect existing part entries that reference this supplier.`,
    () => {
      suppliers.splice(idx, 1);
      localStorage.setItem(KEYS.suppliers, JSON.stringify(suppliers));
      renderSuppliers();
      showToast(`Supplier "${name}" removed.`, 'warning');
    }
  );
}

// ============================================================
// SHOP INFO — Load existing settings into form
// ============================================================
function loadShopInfo() {
  const s = Storage.getSettings();
  document.getElementById('shop-name').value = s.shopName || '';
  document.getElementById('shop-address').value = s.shopAddress || '';
  document.getElementById('shop-phone').value = s.shopPhone || '';
}

// ============================================================
// SHOP INFO — Save settings
// ============================================================
function saveShopInfo(e) {
  e.preventDefault();

  const settings = {
    shopName: document.getElementById('shop-name').value.trim(),
    shopAddress: document.getElementById('shop-address').value.trim(),
    shopPhone: document.getElementById('shop-phone').value.trim()
  };

  Storage.saveSettings(settings);
  showToast('Shop information saved! This will appear on printed reports.', 'success');
}

// ============================================================
// EXPORT — Download all data as JSON
// ============================================================
function handleExport() {
  const filename = Storage.exportAll();
  showToast(`Data exported as "${filename}". Save this file somewhere safe!`, 'success', 5000);
}

// ============================================================
// IMPORT — Restore data from a JSON backup file
// ============================================================
async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const data = await Utils.parseJsonFile(file);

    // Validate the file format
    if (!data.version) {
      showToast('Invalid backup file. Please select a valid ShopTrack backup (.json).', 'error');
      return;
    }

    // Show confirmation before overwriting
    const jobCount = (data.jobs || []).length;
    const partCount = (data.parts || []).length;

    showConfirm(
      `This will REPLACE all current data with the backup file:<br><br>
       <b>Jobs:</b> ${jobCount} entries<br>
       <b>Parts:</b> ${partCount} entries<br>
       <b>Exported on:</b> ${data.exportDate ? new Date(data.exportDate).toLocaleString() : 'Unknown'}<br><br>
       Are you sure you want to continue?`,
      () => {
        Storage.importAll(data);
        showToast('Data imported successfully! Refreshing page...', 'success', 3000);
        setTimeout(() => location.reload(), 1500);
      }
    );
  } catch (err) {
    showToast('Error reading file: ' + err.message, 'error');
  }

  // Reset the file input so the same file can be selected again
  e.target.value = '';
}

// ============================================================
// CLEAR ALL — Delete everything (double confirmation!)
// ============================================================
function handleClearAll() {
  showConfirm(
    '⚠️ This will <b>DELETE ALL</b> your data — jobs, parts, technicians, suppliers, everything.<br><br>This action <b>CANNOT be undone</b>!<br><br>Are you absolutely sure?',
    () => {
      // Second confirmation — extra safety
      showConfirm(
        '🚨 <b>LAST WARNING</b>: ALL data will be permanently deleted.<br><br>Have you exported a backup? If not, click "Cancel" and export first.<br><br>Continue with deletion?',
        () => {
          Storage.clearAll();
          showToast('All data has been cleared. Page will refresh...', 'warning', 3000);
          setTimeout(() => location.reload(), 1500);
        }
      );
    }
  );
}