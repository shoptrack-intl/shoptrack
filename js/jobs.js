/* ============================================================
   ShopTrack — Tech Hours (Jobs) Module
   Data entry, table view, edit, delete, filter, search
   ============================================================ */

let editingJobId = null;

// Initialize when jobs.html loads
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('job-form')) return;
  initJobsPage();
});

function initJobsPage() {
  // Load technician dropdowns
  loadTechDropdowns();

  // Render existing jobs
  renderJobsTable();

  // Form submit handler
  document.getElementById('job-form').addEventListener('submit', handleJobSubmit);

  // Search box (debounced)
  const search = document.getElementById('job-search');
  if (search) search.addEventListener('input', Utils.debounce(filterJobs, 300));

  // Filter button
  const filterBtn = document.getElementById('btn-filter-jobs');
  if (filterBtn) filterBtn.addEventListener('click', filterJobs);

  // Clear filters button
  const clearBtn = document.getElementById('btn-clear-filter');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    document.getElementById('filter-start').value = '';
    document.getElementById('filter-end').value = '';
    document.getElementById('filter-tech').value = '';
    document.getElementById('job-search').value = '';
    renderJobsTable();
  });

  // Set default date to today
  document.getElementById('job-date').value = Utils.getTodayStr();
}

// ============================================================
// Load technician names into all dropdowns on this page
// ============================================================
function loadTechDropdowns() {
  const techs = Storage.getAll(KEYS.techs).filter(t => t.status === 'active');
  const selects = document.querySelectorAll('.tech-dropdown');
  selects.forEach(sel => {
    Utils.populateDropdown(sel, techs, 'name', 'name', '-- Select Technician --');
  });
}

// ============================================================
// Handle form submission (Add or Update)
// ============================================================
function handleJobSubmit(e) {
  e.preventDefault();
  const form = e.target;

  // Gather form data
  const data = {
    date: form.date.value,
    invoiceNum: form.invoiceNum.value.trim(),
    vehicleYear: form.vehicleYear.value.trim(),
    vehicleMake: form.vehicleMake.value.trim(),
    vehicleModel: form.vehicleModel.value.trim(),
    jobPerformed: form.jobPerformed.value.trim(),
    hours: parseFloat(form.hours.value) || 0,
    techName: form.techName.value,
    custType: form.custType.value,
    paymentMethod: form.paymentMethod.value,
    paymentAmount: parseFloat(form.paymentAmount.value) || 0
  };

  // Validation — make sure required fields are filled
  if (!data.date) {
    showToast('Please select a date.', 'error');
    return;
  }
  if (!data.invoiceNum) {
    showToast('Please enter an invoice number.', 'error');
    return;
  }
  if (!data.jobPerformed) {
    showToast('Please describe the job performed.', 'error');
    return;
  }
  if (!data.hours || data.hours <= 0) {
    showToast('Please enter the number of hours worked.', 'error');
    return;
  }
  if (!data.techName) {
    showToast('Please select a technician.', 'error');
    return;
  }

  // Save (add new or update existing)
  if (editingJobId) {
    Storage.update(KEYS.jobs, editingJobId, data);
    showToast('Job entry updated successfully!', 'success');
    editingJobId = null;
    document.getElementById('form-title').textContent = '➕ Add New Job Entry';
    document.getElementById('btn-submit-job').textContent = '💾 Save Entry';
  } else {
    Storage.add(KEYS.jobs, data);
    showToast('New job entry saved!', 'success');
  }

  clearJobForm();
  renderJobsTable();
}

// ============================================================
// Clear the form and reset to "Add" mode
// ============================================================
function clearJobForm() {
  const form = document.getElementById('job-form');
  form.reset();
  form.date.value = Utils.getTodayStr();
  // Reset the Customer radio button as default
  const custRadio = document.getElementById('cust-customer');
  if (custRadio) custRadio.checked = true;
  editingJobId = null;
  document.getElementById('form-title').textContent = '➕ Add New Job Entry';
  document.getElementById('btn-submit-job').textContent = '💾 Save Entry';
}

// ============================================================
// "Add Another Job to This Invoice" — keeps invoice info
// ============================================================
function addAnotherJob() {
  const form = document.getElementById('job-form');

  // Save the fields we want to keep
  const keep = {
    date: form.date.value,
    invoiceNum: form.invoiceNum.value,
    vehicleYear: form.vehicleYear.value,
    vehicleMake: form.vehicleMake.value,
    vehicleModel: form.vehicleModel.value,
    custType: form.custType.value
  };

  // Reset the form
  form.reset();

  // Restore the kept fields
  form.date.value = keep.date;
  form.invoiceNum.value = keep.invoiceNum;
  form.vehicleYear.value = keep.vehicleYear;
  form.vehicleMake.value = keep.vehicleMake;
  form.vehicleModel.value = keep.vehicleModel;
  form.custType.value = keep.custType;

  // Re-check the correct radio button
  if (keep.custType === 'Fleet') {
    const fleetRadio = document.getElementById('cust-fleet');
    if (fleetRadio) fleetRadio.checked = true;
  } else {
    const custRadio = document.getElementById('cust-customer');
    if (custRadio) custRadio.checked = true;
  }

  // Focus on the job description field
  form.jobPerformed.focus();
  editingJobId = null;

  showToast('Invoice info kept! Enter the next job for the same invoice.', 'info');
}

// ============================================================
// Render the jobs data table
// ============================================================
function renderJobsTable(jobsList) {
  const jobs = jobsList || Storage.getAll(KEYS.jobs);
  const sorted = Utils.sortArray(jobs, 'date', 'desc');
  const tbody = document.getElementById('jobs-tbody');
  if (!tbody) return;

  // Update count
  const countEl = document.getElementById('jobs-count');

  if (sorted.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center; padding:40px; color:var(--gray);">
          No job entries found. Add your first entry using the form above!
        </td>
      </tr>
    `;
    if (countEl) countEl.textContent = '0 entries';
    return;
  }

  // Show count and total hours
  const totalHrs = Utils.sumBy(sorted, 'hours');
  if (countEl) countEl.textContent = `${sorted.length} entries | ${totalHrs.toFixed(1)} total hours`;

  // Build table rows
  tbody.innerHTML = sorted.map(j => {
    const vehicle = [j.vehicleYear, j.vehicleMake, j.vehicleModel].filter(Boolean).join(' ');
    const badgeClass = j.custType === 'Fleet' ? 'badge-fleet' : 'badge-customer';

    return `
      <tr>
        <td>${Utils.formatDate(j.date)}</td>
        <td>${Utils.escapeHtml(j.invoiceNum)}</td>
        <td>${Utils.escapeHtml(vehicle)}</td>
        <td>${Utils.escapeHtml(j.jobPerformed)}</td>
        <td style="text-align:right">${parseFloat(j.hours).toFixed(2)}</td>
        <td>${Utils.escapeHtml(j.techName)}</td>
        <td><span class="badge ${badgeClass}">${j.custType || 'Customer'}</span></td>
        <td>${j.paymentMethod || '-'}</td>
        <td style="text-align:right">${j.paymentAmount ? Utils.formatCurrency(j.paymentAmount) : '-'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-info" onclick="editJob('${j.id}')" title="Edit this entry">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteJob('${j.id}')" title="Delete this entry">Del</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// Edit a job — populate form with existing data
// ============================================================
function editJob(id) {
  const job = Storage.getById(KEYS.jobs, id);
  if (!job) return;

  editingJobId = id;
  const form = document.getElementById('job-form');

  // Fill in all form fields
  form.date.value = job.date;
  form.invoiceNum.value = job.invoiceNum;
  form.vehicleYear.value = job.vehicleYear;
  form.vehicleMake.value = job.vehicleMake;
  form.vehicleModel.value = job.vehicleModel;
  form.jobPerformed.value = job.jobPerformed;
  form.hours.value = job.hours;
  form.techName.value = job.techName;
  form.custType.value = job.custType || 'Customer';
  form.paymentMethod.value = job.paymentMethod || '';
  form.paymentAmount.value = job.paymentAmount || '';

  // Check the correct radio button
  if (job.custType === 'Fleet') {
    const fleetRadio = document.getElementById('cust-fleet');
    if (fleetRadio) fleetRadio.checked = true;
  } else {
    const custRadio = document.getElementById('cust-customer');
    if (custRadio) custRadio.checked = true;
  }

  // Change form title and button
  document.getElementById('form-title').textContent = '✏️ Editing Job Entry';
  document.getElementById('btn-submit-job').textContent = '✅ Update Entry';

  // Scroll to form
  form.scrollIntoView({ behavior: 'smooth' });

  showToast('Editing job — make your changes and click "Update Entry".', 'info');
}

// ============================================================
// Delete a job — with confirmation
// ============================================================
function deleteJob(id) {
  showConfirm(
    'Are you sure you want to delete this job entry? This cannot be undone.',
    () => {
      Storage.remove(KEYS.jobs, id);
      renderJobsTable();
      showToast('Job entry deleted.', 'warning');
    }
  );
}

// ============================================================
// Filter jobs by date range, technician, and search text
// ============================================================
function filterJobs() {
  let jobs = Storage.getAll(KEYS.jobs);

  // Date range filter
  const start = document.getElementById('filter-start').value;
  const end = document.getElementById('filter-end').value;
  jobs = Utils.filterByDateRange(jobs, start, end);

  // Technician filter
  const tech = document.getElementById('filter-tech').value;
  if (tech) {
    jobs = jobs.filter(j => j.techName === tech);
  }

  // Search text filter
  const search = (document.getElementById('job-search').value || '').toLowerCase();
  if (search) {
    jobs = jobs.filter(j =>
      (j.jobPerformed || '').toLowerCase().includes(search) ||
      (j.vehicleMake || '').toLowerCase().includes(search) ||
      (j.vehicleModel || '').toLowerCase().includes(search) ||
      (j.invoiceNum || '').toLowerCase().includes(search) ||
      (j.techName || '').toLowerCase().includes(search)
    );
  }

  renderJobsTable(jobs);
}