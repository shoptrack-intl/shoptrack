// ============================================================
// ShopTrack - app.js (Main Application)
// ============================================================

// --- Sidebar Toggle ---
function toggleSidebar() {
  var sb = document.querySelector(".sidebar");
  if (sb) sb.classList.toggle("collapsed");
}

// --- Toast Notification ---
function showToast(message, type, duration) {
  type = type || "info";
  duration = duration || 3000;
  var toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.style.cssText = "position:fixed;top:20px;right:20px;z-index:9999;padding:14px 24px;border-radius:8px;color:white;font-size:0.95rem;box-shadow:0 4px 20px rgba(0,0,0,0.2);transition:opacity 0.3s,transform 0.3s;opacity:0;transform:translateY(-10px);max-width:400px;";
  if (type === "success") toast.style.background = "#2e7d32";
  else if (type === "error" || type === "danger") toast.style.background = "#c62828";
  else if (type === "warning") toast.style.background = "#e65100";
  else toast.style.background = "#1565c0";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() { toast.style.opacity = "1"; toast.style.transform = "translateY(0)"; }, 50);
  setTimeout(function() {
    toast.style.opacity = "0"; toast.style.transform = "translateY(-10px)";
    setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, duration);
}

// --- Confirmation Modal ---
function showConfirm(message) {
  return new Promise(function(resolve) {
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;";
    var card = document.createElement("div");
    card.style.cssText = "background:white;border-radius:12px;padding:32px;max-width:400px;width:90%;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.3);";
    var msg = document.createElement("div");
    msg.style.cssText = "font-size:1.05rem;color:#333;margin-bottom:24px;";
    // Support both string and DOM node
    if (typeof message === "string") {
      msg.textContent = message;
    } else if (message && message.nodeType) {
      msg.appendChild(message);
    }
    card.appendChild(msg);
    var btnGroup = document.createElement("div");
    btnGroup.style.cssText = "display:flex;gap:12px;justify-content:center;";
    var btnYes = document.createElement("button");
    btnYes.textContent = "Yes, Confirm";
    btnYes.style.cssText = "padding:10px 24px;background:#c62828;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.95rem;font-weight:600;";
    btnYes.onclick = function() { document.body.removeChild(overlay); resolve(true); };
    var btnNo = document.createElement("button");
    btnNo.textContent = "Cancel";
    btnNo.style.cssText = "padding:10px 24px;background:#e0e0e0;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:0.95rem;font-weight:600;";
    btnNo.onclick = function() { document.body.removeChild(overlay); resolve(false); };
    btnGroup.appendChild(btnYes);
    btnGroup.appendChild(btnNo);
    card.appendChild(btnGroup);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}


// --- Populate Tech & Supplier Dropdowns ---
function populateDropdowns() {
  var techs = [];
  var suppliers = [];
  try { techs = JSON.parse(localStorage.getItem("shoptrack_technicians")) || []; } catch(e) {}
  try { suppliers = JSON.parse(localStorage.getItem("shoptrack_suppliers")) || []; } catch(e) {}

  var techDropdowns = document.querySelectorAll(".tech-dropdown");
  techDropdowns.forEach(function(sel) {
    var val = sel.value;
    var firstOption = sel.querySelector("option");
    sel.innerHTML = "";
    if (firstOption) sel.appendChild(firstOption);
    techs.forEach(function(t) {
      if (t.status === "active") {
        var opt = document.createElement("option");
        opt.value = t.name;
        opt.textContent = t.name;
        sel.appendChild(opt);
      }
    });
    if (val) sel.value = val;
  });

  var suppDropdowns = document.querySelectorAll(".supplier-dropdown");
  suppDropdowns.forEach(function(sel) {
    var val = sel.value;
    var firstOption = sel.querySelector("option");
    sel.innerHTML = "";
    if (firstOption) sel.appendChild(firstOption);
    suppliers.forEach(function(s) {
      var name = typeof s === "string" ? s : s.name;
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
    if (val) sel.value = val;
  });
}

// --- Helper: get data from localStorage ---
function getData(name) {
  var key = "shoptrack_" + name;
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch(e) { return []; }
}


// --- Load Dashboard Stats ---
function loadDashboard() {
  var jobs = getData("jobs");
  var parts = getData("parts");
  var techs = getData("technicians") || getData("techs");

  var totalJobs = jobs.length;
  var totalHours = 0;
  jobs.forEach(function(j) { totalHours += parseFloat(j.hours) || 0; });

  var partsCost = 0;
  parts.forEach(function(p) { if (!p.returned) partsCost += parseFloat(p.price) || 0; });

  var activeTechs = techs.filter(function(t) { return t.status === "active"; }).length;

  var el;
  el = document.getElementById("stat-jobs");
  if (el) el.textContent = totalJobs.toLocaleString();
  el = document.getElementById("stat-hours");
  if (el) el.textContent = totalHours.toFixed(1);
  el = document.getElementById("stat-parts-cost");
  if (el) el.textContent = Utils.formatCurrency(partsCost);
  el = document.getElementById("stat-techs");
  if (el) el.textContent = activeTechs;
}

// --- Load Recent Jobs ---
function loadRecentJobs() {
  var container = document.getElementById("recent-jobs");
  if (!container) return;

  var jobs = [];
  try { jobs = JSON.parse(localStorage.getItem("shoptrack_jobs")) || []; } catch(e) {}

  container.innerHTML = "";

  if (jobs.length === 0) {
    var empty = document.createElement("div");
    empty.style.cssText = "text-align:center;padding:40px 20px;color:#999;";
    var icon = document.createElement("div");
    icon.style.fontSize = "2.5rem";
    icon.textContent = "\u{1F4CB}";
    empty.appendChild(icon);
    var p1 = document.createElement("p");
    p1.style.cssText = "margin-top:8px;font-size:1rem;";
    p1.textContent = "No job entries yet. ";
    var addLink = document.createElement("a");
    addLink.href = "jobs.html";
    addLink.textContent = "Add your first job!";
    addLink.style.color = "#2e7d32";
    addLink.style.fontWeight = "bold";
    addLink.style.textDecoration = "underline";
    p1.appendChild(addLink);
    empty.appendChild(p1);
    container.appendChild(empty);
    return;
  }

  var sorted = jobs.slice().sort(function(a, b) {
    return new Date(b.date) - new Date(a.date) || (b.createdAt || "").localeCompare(a.createdAt || "");
  });
  var recent = sorted.slice(0, 10);

  recent.forEach(function(j) {
    var row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee;flex-wrap:wrap;gap:6px;";
    var left = document.createElement("div");
    var dateSpan = document.createElement("span");
    dateSpan.style.cssText = "font-size:0.85rem;color:#888;margin-right:12px;";
    dateSpan.textContent = Utils.formatDate(j.date);
    left.appendChild(dateSpan);
    var invSpan = document.createElement("span");
    invSpan.style.cssText = "font-weight:600;margin-right:8px;";
    invSpan.textContent = "#" + (j.invoiceNum || "N/A");
    left.appendChild(invSpan);
    var jobSpan = document.createElement("span");
    jobSpan.style.color = "#555";
    var jobText = j.jobPerformed || "";
    jobSpan.textContent = jobText.length > 50 ? jobText.substring(0, 50) + "..." : jobText;
    left.appendChild(jobSpan);
    row.appendChild(left);
    var right = document.createElement("div");
    right.style.cssText = "display:flex;gap:12px;align-items:center;";
    var hrsSpan = document.createElement("span");
    hrsSpan.style.cssText = "font-weight:600;color:#1b5e20;";
    hrsSpan.textContent = (parseFloat(j.hours) || 0).toFixed(1) + "h";
    right.appendChild(hrsSpan);
    var techSpan = document.createElement("span");
    techSpan.style.cssText = "font-size:0.85rem;color:#666;";
    techSpan.textContent = j.techName || "";
    right.appendChild(techSpan);
    var badge = document.createElement("span");
    badge.style.cssText = "font-size:0.75rem;padding:2px 8px;border-radius:4px;font-weight:600;";
    if (j.custType === "Fleet") {
      badge.style.background = "#e3f2fd"; badge.style.color = "#1565c0";
      badge.textContent = "Fleet";
    } else {
      badge.style.background = "#e8f5e9"; badge.style.color = "#2e7d32";
      badge.textContent = "Customer";
    }
    right.appendChild(badge);
    row.appendChild(right);
    container.appendChild(row);
  });
}

// --- Backup Reminder (uses DOM methods - NO innerHTML with anchor tags) ---
function checkBackupReminder() {
  var noticeEl = document.getElementById("backup-notice");
  if (!noticeEl) return;

  var lastBackup = localStorage.getItem("shoptrack_lastBackup");

  function buildSettingsLink() {
    var link = document.createElement("a");
    link.href = "settings.html";
    link.textContent = "Settings";
    link.style.color = "#e65100";
    link.style.textDecoration = "underline";
    link.style.fontWeight = "bold";
    return link;
  }

  function applyWarningStyle() {
    noticeEl.style.display = "block";
    noticeEl.style.background = "#fff3e0";
    noticeEl.style.border = "2px solid #ff9800";
    noticeEl.style.borderRadius = "8px";
    noticeEl.style.padding = "16px 20px";
    noticeEl.style.marginBottom = "20px";
    noticeEl.style.fontSize = "0.95rem";
    noticeEl.style.color = "#e65100";
  }

  if (!lastBackup) {
    applyWarningStyle();
    noticeEl.innerHTML = "";
    noticeEl.appendChild(document.createTextNode("\u26A0\uFE0F You have "));
    var bold = document.createElement("strong");
    bold.textContent = "never";
    noticeEl.appendChild(bold);
    noticeEl.appendChild(document.createTextNode(" backed up your data. Please go to "));
    noticeEl.appendChild(buildSettingsLink());
    noticeEl.appendChild(document.createTextNode(" and export a backup!"));
  } else {
    var lastDate = new Date(lastBackup);
    var now = new Date();
    var diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 7) {
      applyWarningStyle();
      noticeEl.innerHTML = "";
      noticeEl.appendChild(document.createTextNode("\u26A0\uFE0F Your last backup was "));
      var bold2 = document.createElement("strong");
      bold2.textContent = diffDays + " days ago";
      noticeEl.appendChild(bold2);
      noticeEl.appendChild(document.createTextNode(". Please go to "));
      noticeEl.appendChild(buildSettingsLink());
      noticeEl.appendChild(document.createTextNode(" and export a fresh backup!"));
    } else {
      noticeEl.style.display = "block";
      noticeEl.style.background = "#e8f5e9";
      noticeEl.style.border = "2px solid #4caf50";
      noticeEl.style.borderRadius = "8px";
      noticeEl.style.padding = "16px 20px";
      noticeEl.style.marginBottom = "20px";
      noticeEl.style.fontSize = "0.95rem";
      noticeEl.style.color = "#2e7d32";
      var formatted = lastDate.toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric"
      });
      noticeEl.textContent = "\u2705 Last backup: " + formatted + ". Your data is safe!";
    }
  }
}

// --- DOMContentLoaded: Initialize ---
document.addEventListener("DOMContentLoaded", function() {
  populateDropdowns();

  var page = window.location.pathname.split("/").pop() || "index.html";
  if (page === "index.html" || page === "" || page === "shoptrack" || page.endsWith("shoptrack/")) {
    loadDashboard();
    loadRecentJobs();
    checkBackupReminder();
  }
});