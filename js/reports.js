/* ============================================================
   ShopTrack — Reports Module
   6 report types with date range filtering and print
   ============================================================ */

let selectedReport = '';

// Initialize when reports.html loads
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('report-output')) return;
  initReportsPage();
});

function initReportsPage() {
  // Load technician dropdown for report filters
  const techs = Storage.getAll(KEYS.techs).filter(t => t.status === 'active');
  const sel = document.getElementById('rpt-tech');
  if (sel) {
    Utils.populateDropdown(sel, techs, 'name', 'name', '-- All Technicians --');
  }

  // Report card click handlers
  document.querySelectorAll('.report-card').forEach(card => {
    card.addEventListener('click', () => selectReport(card.dataset.report));
  });

  // Generate button
  const genBtn = document.getElementById('btn-generate');
  if (genBtn) genBtn.addEventListener('click', generateReport);
}

// ============================================================
// Select a report type (highlight the card)
// ============================================================
function selectReport(type) {
  selectedReport = type;

  // Highlight selected card
  document.querySelectorAll('.report-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.report === type);
  });

  // Show/hide technician filter (only for tech-specific reports)
  const techFilter = document.getElementById('tech-filter-group');
  if (techFilter) {
    const needsTech = (type === 'tech-hours' || type === 'tech-sheet');
    techFilter.style.display = needsTech ? 'flex' : 'none';
  }

  // Get the title of selected report
  const titleEl = document.querySelector(`.report-card[data-report="${type}"] .rc-title`);
  const title = titleEl ? titleEl.textContent : type;
  showToast(`Selected: ${title}`, 'info', 2000);
}

// ============================================================
// Generate the selected report
// ============================================================
function generateReport() {
  if (!selectedReport) {
    showToast('Please select a report type first!', 'error');
    return;
  }

  const start = document.getElementById('rpt-start').value;
  const end = document.getElementById('rpt-end').value;
  const tech = document.getElementById('rpt-tech').value;

  if (!start || !end) {
    showToast('Please select both "From" and "To" dates.', 'error');
    return;
  }

  if (start > end) {
    showToast('The "From" date cannot be after the "To" date.', 'error');
    return;
  }

  // Build shop header for the report
  const settings = Storage.getSettings();
  let html = '<div class="shop-header">';
  html += `<h3>${Utils.escapeHtml(settings.shopName)}</h3>`;
  if (settings.shopAddress) html += `<p>${Utils.escapeHtml(settings.shopAddress)}</p>`;
  if (settings.shopPhone) html += `<p>Phone: ${Utils.escapeHtml(settings.shopPhone)}</p>`;
  html += '</div>';

  // Generate the right report
  switch (selectedReport) {
    case 'tech-hours':
      html += buildTechHoursReport(tech, start, end);
      break;
    case 'all-techs':
      html += buildAllTechsSummary(start, end);
      break;
    case 'parts':
      html += buildPartsReport(start, end);
      break;
    case 'fleet':
      html += buildFleetReport(start, end);
      break;
    case 'sales':
      html += buildSalesSummary(start, end);
      break;
    case 'tech-sheet':
      html += buildTechSheet(tech, start, end);
      break;
    default:
      html += '<p style="text-align:center; padding:20px;">Unknown report type.</p>';
  }

  // Output the report
  document.getElementById('report-output').innerHTML = html;

  // Show the print button
  const printSection = document.getElementById('print-section');
  if (printSection) printSection.style.display = 'flex';

  showToast('Report generated!', 'success');
}

// ============================================================
// REPORT 1: Tech Hours by Individual Technician
// ============================================================
function buildTechHoursReport(tech, start, end) {
  let jobs = Utils.filterByDateRange(Storage.getAll(KEYS.jobs), start, end);

  // Filter by technician if selected
  if (tech) {
    jobs = jobs.filter(j => j.techName === tech);
  }

  // Sort by date ascending
  jobs = Utils.sortArray(jobs, 'date', 'asc');

  // Title
  let html = `<h2>Tech Hours Report${tech ? ' — ' + Utils.escapeHtml(tech) : ''}</h2>`;
  html += `<p class="report-subtitle">${Utils.formatDate(start)} to ${Utils.formatDate(end)}</p>`;

  if (jobs.length === 0) {
    return html + '<p style="text-align:center; padding:30px; color:var(--gray);">No entries found for this period.</p>';
  }

  // If no specific tech selected, group by technician
  if (!tech) {
    const grouped = Utils.groupBy(jobs, 'techName');
    const sortedNames = Object.keys(grouped).sort();

    sortedNames.forEach(name => {
      const techJobs = grouped[name];
      const totalHrs = Utils.sumBy(techJobs, 'hours');

      html += `<h3 style="margin-top:24px; color:var(--primary); border-bottom:2px solid var(--primary-light); padding-bottom:6px;">
        ${Utils.escapeHtml(name)} — ${totalHrs.toFixed(2)} hours
      </h3>`;
      html += buildJobsTable(techJobs);
    });

    const grandTotal = Utils.sumBy(jobs, 'hours');
    html += `<div class="report-total">GRAND TOTAL: ${grandTotal.toFixed(2)} hours | ${jobs.length} jobs</div>`;
  } else {
    html += buildJobsTable(jobs);
    const totalHrs = Utils.sumBy(jobs, 'hours');
    html += `<div class="report-total">TOTAL HOURS: ${totalHrs.toFixed(2)} | ${jobs.length} jobs</div>`;
  }

  return html;
}

// Helper: Build a jobs table (reused by multiple reports)
function buildJobsTable(jobs) {
  let html = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Inv #</th>
          <th>Vehicle</th>
          <th>Job Performed</th>
          <th style="text-align:right">Hours</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
  `;

  jobs.forEach(j => {
    const vehicle = [j.vehicleYear, j.vehicleMake, j.vehicleModel].filter(Boolean).join(' ');
    const badgeClass = j.custType === 'Fleet' ? 'badge-fleet' : 'badge-customer';

    html += `
      <tr>
        <td>${Utils.formatDate(j.date)}</td>
        <td>${Utils.escapeHtml(j.invoiceNum)}</td>
        <td>${Utils.escapeHtml(vehicle)}</td>
        <td>${Utils.escapeHtml(j.jobPerformed)}</td>
        <td style="text-align:right">${parseFloat(j.hours).toFixed(2)}</td>
        <td><span class="badge ${badgeClass}">${j.custType || 'Customer'}</span></td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  return html;
}

// ============================================================
// REPORT 2: All Technicians Summary
// ============================================================
function buildAllTechsSummary(start, end) {
  const jobs = Utils.filterByDateRange(Storage.getAll(KEYS.jobs), start, end);
  const grouped = Utils.groupBy(jobs, 'techName');

  let html = '<h2>All Technicians Summary</h2>';
  html += `<p class="report-subtitle">${Utils.formatDate(start)} to ${Utils.formatDate(end)}</p>`;

  if (jobs.length === 0) {
    return html + '<p style="text-align:center; padding:30px; color:var(--gray);">No entries found for this period.</p>';
  }

  html += `
    <table>
      <thead>
        <tr>
          <th>Technician</th>
          <th style="text-align:right">Total Hours</th>
          <th style="text-align:right"># of Jobs</th>
          <th style="text-align:right">Customer Hrs</th>
          <th style="text-align:right">Fleet Hrs</th>
          <th style="text-align:right">Total Payment</th>
        </tr>
      </thead>
      <tbody>
  `;

  let grandHours = 0, grandJobs = 0, grandPayment = 0;

  // Sort technician names alphabetically
  Object.keys(grouped).sort().forEach(name => {
    const techJobs = grouped[name];
    const hrs = Utils.sumBy(techJobs, 'hours');
    const custHrs = Utils.sumBy(techJobs.filter(j => j.custType !== 'Fleet'), 'hours');
    const fleetHrs = Utils.sumBy(techJobs.filter(j => j.custType === 'Fleet'), 'hours');
    const payment = Utils.sumBy(techJobs, 'paymentAmount');

    grandHours += hrs;
    grandJobs += techJobs.length;
    grandPayment += payment;

    html += `
      <tr>
        <td><b>${Utils.escapeHtml(name)}</b></td>
        <td style="text-align:right"><b>${hrs.toFixed(2)}</b></td>
        <td style="text-align:right">${techJobs.length}</td>
        <td style="text-align:right">${custHrs.toFixed(2)}</td>
        <td style="text-align:right">${fleetHrs.toFixed(2)}</td>
        <td style="text-align:right">${Utils.formatCurrency(payment)}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  html += `<div class="report-total">GRAND TOTAL: ${grandHours.toFixed(2)} hours | ${grandJobs} jobs | ${Utils.formatCurrency(grandPayment)}</div>`;

  return html;
}

// ============================================================
// REPORT 3: Purchased Parts List
// ============================================================
function buildPartsReport(start, end) {
  const parts = Utils.sortArray(
    Utils.filterByDateRange(Storage.getAll(KEYS.parts), start, end),
    'date', 'asc'
  );

  let html = '<h2>Purchased Parts Report</h2>';
  html += `<p class="report-subtitle">${Utils.formatDate(start)} to ${Utils.formatDate(end)}</p>`;

  if (parts.length === 0) {
    return html + '<p style="text-align:center; padding:30px; color:var(--gray);">No parts found for this period.</p>';
  }

  html += `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Part #</th>
          <th>Description</th>
          <th style="text-align:center">Qty</th>
          <th>Invoice</th>
          <th style="text-align:right">Price</th>
          <th>Supplier</th>
          <th>Charged To</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  parts.forEach(p => {
    const rowStyle = p.returned ? 'style="opacity:0.6; text-decoration:line-through;"' : '';

    html += `
      <tr ${rowStyle}>
        <td>${Utils.formatDate(p.date)}</td>
        <td>${Utils.escapeHtml(p.partNumber)}</td>
        <td>${Utils.escapeHtml(p.description)}</td>
        <td style="text-align:center">${p.quantity}</td>
        <td>${Utils.escapeHtml(p.invoiceNum)}</td>
        <td style="text-align:right">${Utils.formatCurrency(p.price)}</td>
        <td>${Utils.escapeHtml(p.supplier)}</td>
        <td>${Utils.escapeHtml(p.chargedTo || '-')}</td>
        <td>${p.returned ? '<span class="badge badge-returned">Returned</span>' : '-'}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';

  // Calculate totals
  const totalCost = Utils.sumBy(parts, 'price');
  const returnedCost = Utils.sumBy(parts.filter(p => p.returned), 'price');
  const netCost = totalCost - returnedCost;
  const returnedCount = parts.filter(p => p.returned).length;

  html += `<div class="report-total">
    TOTAL: ${Utils.formatCurrency(totalCost)} |
    Returned (${returnedCount}): ${Utils.formatCurrency(returnedCost)} |
    NET COST: ${Utils.formatCurrency(netCost)}
  </div>`;

  return html;
}

// ============================================================
// REPORT 4: Fleet Jobs Only
// ============================================================
function buildFleetReport(start, end) {
  const jobs = Utils.sortArray(
    Utils.filterByDateRange(Storage.getAll(KEYS.jobs), start, end)
      .filter(j => j.custType === 'Fleet'),
    'date', 'asc'
  );

  let html = '<h2>Fleet Jobs Report</h2>';
  html += `<p class="report-subtitle">${Utils.formatDate(start)} to ${Utils.formatDate(end)}</p>`;

  if (jobs.length === 0) {
    return html + '<p style="text-align:center; padding:30px; color:var(--gray);">No fleet entries found for this period.</p>';
  }

  html += `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Inv #</th>
          <th>Vehicle</th>
          <th>Job Performed</th>
          <th style="text-align:right">Hours</th>
          <th>Technician</th>
          <th style="text-align:right">Payment</th>
        </tr>
      </thead>
      <tbody>
  `;

  jobs.forEach(j => {
    const vehicle = [j.vehicleYear, j.vehicleMake, j.vehicleModel].filter(Boolean).join(' ');

    html += `
      <tr>
        <td>${Utils.formatDate(j.date)}</td>
        <td>${Utils.escapeHtml(j.invoiceNum)}</td>
        <td>${Utils.escapeHtml(vehicle)}</td>
        <td>${Utils.escapeHtml(j.jobPerformed)}</td>
        <td style="text-align:right">${parseFloat(j.hours).toFixed(2)}</td>
        <td>${Utils.escapeHtml(j.techName)}</td>
        <td style="text-align:right">${j.paymentAmount ? Utils.formatCurrency(j.paymentAmount) : '-'}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';

  const totalHrs = Utils.sumBy(jobs, 'hours');
  const totalPayment = Utils.sumBy(jobs, 'paymentAmount');

  html += `<div class="report-total">
    TOTAL FLEET HOURS: ${totalHrs.toFixed(2)} |
    TOTAL PAYMENT: ${Utils.formatCurrency(totalPayment)} |
    ${jobs.length} jobs
  </div>`;

  return html;
}

// ============================================================
// REPORT 5: Sales Summary (Daily Breakdown)
// ============================================================
function buildSalesSummary(start, end) {
  const jobs = Utils.filterByDateRange(Storage.getAll(KEYS.jobs), start, end);
  const byDate = Utils.groupBy(jobs, 'date');
  const sortedDates = Object.keys(byDate).sort();

  let html = '<h2>Sales Summary</h2>';
  html += `<p class="report-subtitle">${Utils.formatDate(start)} to ${Utils.formatDate(end)}</p>`;

  if (jobs.length === 0) {
    return html + '<p style="text-align:center; padding:30px; color:var(--gray);">No sales data found for this period.</p>';
  }

  html += `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th style="text-align:right">Debit</th>
          <th style="text-align:right">Cash</th>
          <th style="text-align:right">Fleet</th>
          <th style="text-align:right">Daily Total</th>
        </tr>
      </thead>
      <tbody>
  `;

  let gDebit = 0, gCash = 0, gFleet = 0, gTotal = 0;

  sortedDates.forEach(date => {
    const dayJobs = byDate[date];

    // Calculate each payment category
    const debit = Utils.sumBy(
      dayJobs.filter(j => j.paymentMethod === 'Debit' && j.custType !== 'Fleet'),
      'paymentAmount'
    );
    const cash = Utils.sumBy(
      dayJobs.filter(j => j.paymentMethod === 'Cash' && j.custType !== 'Fleet'),
      'paymentAmount'
    );
    const fleet = Utils.sumBy(
      dayJobs.filter(j => j.custType === 'Fleet'),
      'paymentAmount'
    );
    const total = debit + cash + fleet;

    gDebit += debit;
    gCash += cash;
    gFleet += fleet;
    gTotal += total;

    html += `
      <tr>
        <td>${Utils.formatDate(date)}</td>
        <td>${Utils.getDayOfWeek(date)}</td>
        <td style="text-align:right">${Utils.formatCurrency(debit)}</td>
        <td style="text-align:right">${Utils.formatCurrency(cash)}</td>
        <td style="text-align:right">${Utils.formatCurrency(fleet)}</td>
        <td style="text-align:right"><b>${Utils.formatCurrency(total)}</b></td>
      </tr>
    `;
  });

  html += '</tbody></table>';

  html += `<div class="report-total">
    GRAND TOTAL —
    Debit: ${Utils.formatCurrency(gDebit)} |
    Cash: ${Utils.formatCurrency(gCash)} |
    Fleet: ${Utils.formatCurrency(gFleet)} |
    TOTAL: ${Utils.formatCurrency(gTotal)}
  </div>`;

  return html;
}

// ============================================================
// REPORT 6: Individual Tech Hour Sheet
// ============================================================
function buildTechSheet(tech, start, end) {
  if (!tech) {
    return '<p style="text-align:center; padding:30px; color:var(--gray);">Please select a technician to generate this report.</p>';
  }

  // Get jobs for this tech in the date range
  let jobs = Utils.filterByDateRange(Storage.getAll(KEYS.jobs), start, end)
    .filter(j => j.techName === tech);
  jobs = Utils.sortArray(jobs, 'date', 'asc');

  let html = `<h2>Tech Hour Sheet — ${Utils.escapeHtml(tech)}</h2>`;
  html += `<p class="report-subtitle">${Utils.formatDate(start)} to ${Utils.formatDate(end)}</p>`;

  if (jobs.length === 0) {
    return html + '<p style="text-align:center; padding:30px; color:var(--gray);">No entries found for this technician in this period.</p>';
  }

  // Group by date for a day-by-day breakdown
  const byDate = Utils.groupBy(jobs, 'date');
  const sortedDates = Object.keys(byDate).sort();

  html += `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th>Inv #</th>
          <th>Vehicle</th>
          <th>Job Performed</th>
          <th style="text-align:right">Hours</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
  `;

  let grandTotal = 0;

  sortedDates.forEach(date => {
    const dayJobs = byDate[date];
    const dayTotal = Utils.sumBy(dayJobs, 'hours');
    grandTotal += dayTotal;

    dayJobs.forEach((j, idx) => {
      const vehicle = [j.vehicleYear, j.vehicleMake, j.vehicleModel].filter(Boolean).join(' ');
      const badgeClass = j.custType === 'Fleet' ? 'badge-fleet' : 'badge-customer';

      html += `
        <tr>
          ${idx === 0
            ? `<td rowspan="${dayJobs.length}"><b>${Utils.formatDate(date)}</b></td>
               <td rowspan="${dayJobs.length}">${Utils.getDayOfWeek(date)}</td>`
            : ''
          }
          <td>${Utils.escapeHtml(j.invoiceNum)}</td>
          <td>${Utils.escapeHtml(vehicle)}</td>
          <td>${Utils.escapeHtml(j.jobPerformed)}</td>
          <td style="text-align:right">${parseFloat(j.hours).toFixed(2)}</td>
          <td><span class="badge ${badgeClass}">${j.custType || 'Customer'}</span></td>
        </tr>
      `;
    });

    // Daily subtotal row
    html += `
      <tr style="background: var(--primary-light) !important; font-weight: 600;">
        <td colspan="5" style="text-align:right; color:var(--primary);">
          Day Total (${Utils.formatDateShort(date)}):
        </td>
        <td style="text-align:right; color:var(--primary);">${dayTotal.toFixed(2)}</td>
        <td></td>
      </tr>
    `;
  });

  html += '</tbody></table>';

  // Summary section
  const custHrs = Utils.sumBy(jobs.filter(j => j.custType !== 'Fleet'), 'hours');
  const fleetHrs = Utils.sumBy(jobs.filter(j => j.custType === 'Fleet'), 'hours');
  const daysWorked = sortedDates.length;

  html += `<div class="report-total">
    TOTAL HOURS: ${grandTotal.toFixed(2)} |
    Customer: ${custHrs.toFixed(2)} |
    Fleet: ${fleetHrs.toFixed(2)} |
    Days Worked: ${daysWorked} |
    ${jobs.length} jobs
  </div>`;

  return html;
}

// ============================================================
// PRINT — Opens the browser print dialog
// ============================================================
function printReport() {
  window.print();
}