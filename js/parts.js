/* ============================================================
   ShopTrack — Purchased Parts Module
   Data entry, table view, edit, delete, filter
   ============================================================ */

let editingPartId = null;

// Initialize when parts.html loads
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('part-form')) return;
  initPartsPage();
});

function initPartsPage() {
  // Load supplier dropdowns
  loadSupplierDropdowns();

  // Render existing parts
  renderPartsTable();

  // Form submit handler
  document.getElementById('part-form').addEventListener('submit', handlePartSubmit);

  // Returned checkbox toggle
  const retCheck = document.getElementById('part-returned');
  if (retCheck) retCheck.addEventListener('change', toggleReturnFields);

  // Filter button
  const filterBtn = document.getElementById('btn-filter-parts');
  if (filterBtn) filterBtn.addEventListener('click', filterParts);

  // Clear filters button
  const clearBtn = document.getElementById('btn-clear-parts-filter');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    document.getElementById('pf-start').value = '';
    document.getElementById('pf-end').value = '';
    document.getElementById('pf-supplier').value = '';
    renderPartsTable();
  });

  // Set default date to today
  document.getElementById('part-date').value = Utils.getTodayStr();

  // Make sure return notes field is hidden initially
  toggleReturnFields();
}

// ============================================================
// Load supplier names into all dropdowns on this page
// ============================================================
function loadSupplierDropdowns() {
  const suppliers = Storage.getAll(KEYS.suppliers);
  const selects = document.querySelectorAll('.supplier-dropdown');
  selects.forEach(sel => {
    Utils.populateDropdown(sel, suppliers, null, null, '-- Select Supplier --');
  });
}

// ============================================================
// Show/Hide the "Return Notes" field based on checkbox
// ============================================================
function toggleReturnFields() {
  const isReturned = document.getElementById('part-returned').checked;
  const notesGroup = document.getElementById('return-notes-group');
  if (notesGroup) {
    notesGroup.style.display = isReturned ? 'flex' : 'none';
  }
}

// ============================================================
// Handle form submission (Add or Update)
// ============================================================
function handlePartSubmit(e) {
  e.preventDefault();
  const form = e.target;

  // Gather form data
  const data = {
    date: form.date.value,
    partNumber: form.partNumber.value.trim(),
    description: form.description.value.trim(),
    quantity: parseInt(form.quantity.value) || 1,
    invoiceNum: form.invoiceNum.value.trim(),
    price: parseFloat(form.price.value) || 0,
    supplier: form.supplier.value,
    chargedTo: form.chargedTo.value.trim(),
    returned: form.returned.checked,
    returnNotes: form.returnNotes ? form.returnNotes.value.trim() : ''
  };

  // Validation
  if (!data.date) {
    showToast('Please select a date.', 'error');
    return;
  }
  if (!data.description) {
    showToast('Please enter a part description.', 'error');
    return;
  }

  // Save (add new or update existing)
  if (editingPartId) {
    Storage.update(KEYS.parts, editingPartId, data);
    showToast('Part entry updated!', 'success');
    editingPartId = null;
    document.getElementById('parts-form-title').textContent = '➕ Add New Part Entry';
    document.getElementById('btn-submit-part').textContent = '💾 Save Part';
  } else {
    Storage.add(KEYS.parts, data);
    showToast('New part entry saved!', 'success');
  }

  clearPartForm();
  renderPartsTable();
}

// ============================================================
// Clear the form and reset to "Add" mode
// ============================================================
function clearPartForm() {
  const form = document.getElementById('part-form');
  form.reset();
  form.date.value = Utils.getTodayStr();
  editingPartId = null;
  document.getElementById('parts-form-title').textContent = '➕ Add New Part Entry';
  document.getElementById('btn-submit-part').textContent = '💾 Save Part';
  toggleReturnFields();
}

// ============================================================
// Render the parts data table
// ============================================================
function renderPartsTable(list) {
  const parts = list || Storage.getAll(KEYS.parts);
  const sorted = Utils.sortArray(parts, 'date', 'desc');
  const tbody = document.getElementById('parts-tbody');
  if (!tbody) return;

  // Update count
  const countEl = document.getElementById('parts-count');

  if (sorted.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding:40px; color:var(--gray);">
          No parts entries found. Add your first part using the form above!
        </td>
      </tr>
    `;
    if (countEl) countEl.textContent = '0 entries';
    return;
  }

  // Calculate total cost (excluding returned items)
  const totalCost = Utils.sumBy(sorted.filter(p => !p.returned), 'price');
  const returnedCount = sorted.filter(p => p.returned).length;

  if (countEl) {
    countEl.textContent = `${sorted.length} entries | Total: ${Utils.formatCurrency(totalCost)}${returnedCount > 0 ? ` | ${returnedCount} returned` : ''}`;
  }

  // Build table rows
  tbody.innerHTML = sorted.map(p => {
    // Style returned items with line-through and reduced opacity
    const rowStyle = p.returned ? 'style="opacity:0.6; text-decoration:line-through;"' : '';

    return `
      <tr ${rowStyle}>
        <td>${Utils.formatDate(p.date)}</td>
        <td>${Utils.escapeHtml(p.partNumber)}</td>
        <td>${Utils.escapeHtml(p.description)}</td>
        <td style="text-align:center">${p.quantity}</td>
        <td>${Utils.escapeHtml(p.invoiceNum)}</td>
        <td style="text-align:right">${Utils.formatCurrency(p.price)}</td>
        <td>${Utils.escapeHtml(p.supplier)}</td>
        <td>
          ${p.returned
            ? '<span class="badge badge-returned">Returned</span>'
            : ''
          }
          ${p.chargedTo
            ? `<br><small style="color:var(--gray)">Charged: ${Utils.escapeHtml(p.chargedTo)}</small>`
            : ''
          }
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-info" onclick="editPart('${p.id}')" title="Edit">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deletePart('${p.id}')" title="Delete">Del</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// Edit a part — populate form with existing data
// ============================================================
function editPart(id) {
  const p = Storage.getById(KEYS.parts, id);
  if (!p) return;

  editingPartId = id;
  const form = document.getElementById('part-form');

  // Fill in all form fields
  form.date.value = p.date;
  form.partNumber.value = p.partNumber;
  form.description.value = p.description;
  form.quantity.value = p.quantity;
  form.invoiceNum.value = p.invoiceNum;
  form.price.value = p.price;
  form.supplier.value = p.supplier;
  form.chargedTo.value = p.chargedTo || '';
  form.returned.checked = p.returned;
  if (form.returnNotes) form.returnNotes.value = p.returnNotes || '';

  // Show/hide return notes field
  toggleReturnFields();

  // Change form title and button
  document.getElementById('parts-form-title').textContent = '✏️ Editing Part Entry';
  document.getElementById('btn-submit-part').textContent = '✅ Update Part';

  // Scroll to form
  form.scrollIntoView({ behavior: 'smooth' });

  showToast('Editing part — make changes and click "Update Part".', 'info');
}

// ============================================================
// Delete a part — with confirmation
// ============================================================
function deletePart(id) {
  showConfirm(
    'Delete this part entry? This cannot be undone.',
    () => {
      Storage.remove(KEYS.parts, id);
      renderPartsTable();
      showToast('Part entry deleted.', 'warning');
    }
  );
}

// ============================================================
// Filter parts by date range and supplier
// ============================================================
function filterParts() {
  let parts = Storage.getAll(KEYS.parts);

  // Date range filter
  const start = document.getElementById('pf-start').value;
  const end = document.getElementById('pf-end').value;
  parts = Utils.filterByDateRange(parts, start, end);

  // Supplier filter
  const supplier = document.getElementById('pf-supplier').value;
  if (supplier) {
    parts = parts.filter(p => p.supplier === supplier);
  }

  renderPartsTable(parts);
}