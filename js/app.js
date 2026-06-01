/* ============================================================
   ShopTrack — Main Application
   Runs on every page: sidebar, toasts, modals, dashboard
   ============================================================ */

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  Storage.init();
  setActiveNav();
  checkBackupReminder();

  // If we're on the dashboard, load stats
  const page = location.pathname.split('/').pop() || 'index.html';
  if (page === 'index.html' || page === '') {
    initDashboard();
  }
});

// ============================================================
// SIDEBAR — Highlight the active page
// ============================================================
function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
}

// ============================================================
// SIDEBAR — Toggle for mobile (hamburger menu)
// ============================================================
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// ============================================================
// TOAST NOTIFICATIONS — Slide-in messages
// ============================================================
function showToast(msg, type = 'success', duration = 3500) {
  // Create container if it doesn't exist
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Add icon based on type
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  toast.innerHTML = `<span>${icons[type] || ''}</span> <span>${msg}</span>`;

  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);

  // Click to dismiss early
  toast.addEventListener('click', () => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  });
}

// ============================================================
// MODAL — Popup dialog system
// ============================================================
function showModal(title, bodyHtml, buttons = []) {
  // Create modal overlay if it doesn't exist
  let overlay = document.getElementById('modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 id="modal-title"></h3>
          <button class="modal-close" onclick="hideModal()">&times;</button>
        </div>
        <div class="modal-body" id="modal-body"></div>
        <div class="modal-footer" id="modal-footer"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Close when clicking outside the modal
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hideModal();
    });
  }

  // Set content
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;

  // Build buttons
  const footer = document.getElementById('modal-footer');
  footer.innerHTML = '';
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = `btn ${b.class || 'btn-secondary'}`;
    btn.textContent = b.text;
    btn.onclick = b.onclick;
    footer.appendChild(btn);
  });

  // Show the modal
  overlay.classList.add('show');
}

function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('show');
}

// Shortcut: Confirmation dialog
function showConfirm(msg, onConfirm) {
  showModal(
    'Are you sure?',
    `<p style="font-size: 16px; line-height: 1.7;">${msg}</p>`,
    [
      {
        text: 'Cancel',
        class: 'btn-secondary',
        onclick: hideModal
      },
      {
        text: 'Yes, I am sure',
        class: 'btn-danger',
        onclick() {
          hideModal();
          onConfirm();
        }
      }
    ]
  );
}

// ============================================================
// DASHBOARD — Calculate and display stats
// ============================================================
function initDashboard() {
  const jobs = Storage.getAll(KEYS.jobs);
  const parts = Storage.getAll(KEYS.parts);
  const techs = Storage.getAll(KEYS.techs).filter(t => t.status === 'active');

  // Calculate totals
  const totalHours = Utils.sumBy(jobs, 'hours');
  const totalPartsCost = Utils.sumBy(parts.filter(p => !p.returned), 'price');

  // Update stat cards
  const el = id => document.getElementById(id);
  if (el('stat-jobs')) el('stat-jobs').textContent = jobs.length;
  if (el('stat-hours')) el('stat-hours').textContent = totalHours.toFixed(1);
  if (el('stat-parts-cost')) el('stat-parts-cost').textContent = Utils.formatCurrency(totalPartsCost);
  if (el('stat-techs')) el('stat-techs').textContent = techs.length;

  // Render recent jobs table
  const recentDiv = el('recent-jobs');
  if (recentDiv) {
    const recent = Utils.sortArray(jobs, 'date', 'desc').slice(0, 8);

    if (recent.length === 0) {
      recentDiv.innerHTML = `
        <div class="empty-state">
          <div class="es-icon">📋</div>
          <p>No job entries yet. Click "Add New Job" to get started!</p>
        </div>
      `;
    } else {
      let html = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice #</th>
                <th>Vehicle</th>
                <th>Job Performed</th>
                <th style="text-align:right">Hours</th>
                <th>Technician</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
      `;
      recent.forEach(j => {
        const vehicle = [j.vehicleYear, j.vehicleMake, j.vehicleModel].filter(Boolean).join(' ');
        const badgeClass = j.custType === 'Fleet' ? 'badge-fleet' : 'badge-customer';
        html += `
          <tr>
            <td>${Utils.formatDate(j.date)}</td>
            <td>${Utils.escapeHtml(j.invoiceNum)}</td>
            <td>${Utils.escapeHtml(vehicle)}</td>
            <td>${Utils.escapeHtml(j.jobPerformed)}</td>
            <td style="text-align:right">${parseFloat(j.hours).toFixed(2)}</td>
            <td>${Utils.escapeHtml(j.techName)}</td>
            <td><span class="badge ${badgeClass}">${j.custType || 'Customer'}</span></td>
          </tr>
        `;
      });
      html += '</tbody></table></div>';
      recentDiv.innerHTML = html;
    }
  }
}

// ============================================================
// BACKUP REMINDER — Shows notice on dashboard
// ============================================================
function checkBackupReminder() {
  const last = Storage.getLastBackup();
  const notice = document.getElementById('backup-notice');
  if (!notice) return;

  if (!last) {
    // Never backed up
    notice.innerHTML = `
      <span class="bn-icon">⚠️</span>
      <span>You have <b>never</b> backed up your data. Please go to
      settings.htmlvar(--warning);text-decoration:underline;">Settings</a>
      and export a backup!</span>
    `;
    notice.style.display = 'flex';
    notice.style.background = 'var(--warning-light)';
    notice.style.borderColor = 'var(--warning)';
  } else {
    // Check how many days since last backup
    const days = Math.floor((Date.now() - new Date(last + 'T00:00:00').getTime()) / 86400000);

    if (days >= 3) {
      // Overdue backup
      notice.innerHTML = `
        <span class="bn-icon">⚠️</span>
        <span>Your last backup was <b>${days} days ago</b> (${Utils.formatDate(last)}).
        Please export a new backup in
        settings.htmlwarning);text-decoration:underline;">Settings</a>!</span>
      `;
      notice.style.display = 'flex';
      notice.style.background = 'var(--warning-light)';
      notice.style.borderColor = 'var(--warning)';
    } else {
      // All good
      notice.innerHTML = `
        <span class="bn-icon">✅</span>
        <span>Last backup: <b>${Utils.formatDate(last)}</b>. You are up to date!</span>
      `;
      notice.style.display = 'flex';
      notice.style.background = 'var(--primary-light)';
      notice.style.borderColor = 'var(--primary-bright)';
    }
  }
}