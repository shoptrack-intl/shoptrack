// ============================================================
// ShopTrack Authentication Guard (js/auth.js)
// ============================================================
// Add this script to ALL pages (index, jobs, parts, reports, settings)
// AFTER app.js:
//   <script src="js/auth.js"></script>
//
// Default credentials: admin / shoptrack2026
// ============================================================

(function() {
  "use strict";

  // --- Check if user is authenticated ---
  function checkAuth() {
    var isLoggedIn = sessionStorage.getItem("shoptrack_auth") === "true";
    var currentPage = window.location.pathname.split("/").pop() || "index.html";

    // If not logged in and not already on login page, redirect
    if (!isLoggedIn && currentPage !== "login.html") {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  // --- Logout function ---
  function logout() {
    sessionStorage.removeItem("shoptrack_auth");
    sessionStorage.removeItem("shoptrack_user");

    // Show toast if available
    if (typeof showToast === "function") {
      showToast("Logged out successfully!", "info", 1500);
      setTimeout(function() { window.location.href = "login.html"; }, 800);
    } else {
      window.location.href = "login.html";
    }
  }

  // --- Add logout button to sidebar ---
  function renderLogoutButton() {
    var footer = document.querySelector(".sidebar-footer");
    if (!footer) return;

    var user = sessionStorage.getItem("shoptrack_user") || "admin";

    // Create the logout section
    var logoutDiv = document.createElement("div");
    logoutDiv.style.cssText = "margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.15); text-align:center;";

    var userSpan = document.createElement("div");
    userSpan.style.cssText = "font-size:0.8rem; color:rgba(255,255,255,0.6); margin-bottom:6px;";
    userSpan.textContent = "Logged in as: " + user;

    var logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.textContent = "Logout";
    logoutBtn.style.cssText = "background:rgba(255,255,255,0.15); color:white; border:1px solid rgba(255,255,255,0.3); padding:6px 20px; border-radius:6px; cursor:pointer; font-size:0.85rem; transition:background 0.2s;";
    logoutBtn.onmouseover = function() { this.style.background = "rgba(255,255,255,0.25)"; };
    logoutBtn.onmouseout = function() { this.style.background = "rgba(255,255,255,0.15)"; };
    logoutBtn.onclick = logout;

    logoutDiv.appendChild(userSpan);
    logoutDiv.appendChild(logoutBtn);
    footer.appendChild(logoutDiv);
  }

  // --- Initialize on DOM ready ---
  document.addEventListener("DOMContentLoaded", function() {
    if (checkAuth()) {
      renderLogoutButton();
    }
  });

  // Expose logout globally so it can be called from buttons
  window.shoptrackLogout = logout;

})();
