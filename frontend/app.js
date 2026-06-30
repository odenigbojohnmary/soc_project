/**
 * app.js
 * ------
 * Frontend logic for the SOC Incident Log.
 * All communication with the backend uses the Fetch API (no page refreshes).
 * Author: Student — see ATTRIBUTIONS.md for referenced resources.
 */

const API = "http://localhost:5000"; // Base URL for all API calls


// ====================================================================
// UTILITY FUNCTIONS
// ====================================================================

/** Switch visible tab section */
function showTab(tabId) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
  event.target.classList.add("active");

  // Load data when switching to a tab
  if (tabId === "dashboard") loadDashboard();
  if (tabId === "incidents") loadIncidents();
  if (tabId === "staff")     loadStaff();
  if (tabId === "assets")    loadAssets();
  if (tabId === "uptime")    loadUptime();
}

/** Show a message (success or error) in a target element */
function showMsg(elementId, text, isError = false) {
  const el = document.getElementById(elementId);
  el.className = isError ? "msg err" : "msg";
  el.textContent = text;
}

/** Clear a message element */
function clearMsg(elementId) {
  document.getElementById(elementId).textContent = "";
}

/**
 * Generic fetch wrapper.
 * Returns parsed JSON on success, throws on network/API error.
 */
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/** Build a simple HTML table from an array of objects */
function buildTable(rows, columns) {
  if (!rows.length) return "<p>No records found.</p>";
  const headers = columns.map(c => `<th>${c.label}</th>`).join("");
  const body = rows.map(row =>
    `<tr>${columns.map(c => `<td>${row[c.key] ?? ""}</td>`).join("")}</tr>`
  ).join("");
  return `<table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Populate a <select> element with options from an array */
function populateSelect(selectId, items, valueKey, labelKey, placeholder = "-- None --") {
  const sel = document.getElementById(selectId);
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item[valueKey];
    opt.textContent = item[labelKey];
    sel.appendChild(opt);
  });
}


// ====================================================================
// DASHBOARD
// ====================================================================

async function loadDashboard() {
  document.getElementById("dashboard-stats").innerHTML = "<p>Loading...</p>";
  try {
    const d = await apiFetch("/api/dashboard");
    const t = d.totals;
    document.getElementById("dashboard-stats").innerHTML = `
      <table>
        <tr><th>Total Incidents</th><td>${t.total}</td>
            <th>Open</th><td>${t.open}</td>
            <th>Investigating</th><td>${t.investigating}</td>
            <th>Resolved</th><td>${t.resolved}</td></tr>
        <tr><th>Avg Resolution</th><td colspan="3">${d.avg_resolution_hours != null ? d.avg_resolution_hours + ' hrs' : 'N/A'}</td>
            <th>Critical Open</th><td>${d.by_severity.critical || 0}</td></tr>
      </table>
      <p><strong>By Severity:</strong>
        Critical: ${d.by_severity.critical||0} |
        High: ${d.by_severity.high||0} |
        Medium: ${d.by_severity.medium||0} |
        Low: ${d.by_severity.low||0}
      </p>
      <p><strong>By Type:</strong>
        Breach: ${d.by_type.breach||0} |
        Alert: ${d.by_type.alert||0} |
        Outage: ${d.by_type.outage||0} |
        Vulnerability: ${d.by_type.vulnerability||0}
      </p>`;

    const cols = [
      { key: "id",            label: "ID"       },
      { key: "title",         label: "Title"    },
      { key: "severity",      label: "Severity" },
      { key: "status",        label: "Status"   },
      { key: "assigned_name", label: "Assigned" },
      { key: "created_at",    label: "Created"  },
    ];
    document.getElementById("dashboard-recent").innerHTML = buildTable(d.recent, cols);
  } catch (e) {
    document.getElementById("dashboard-stats").innerHTML = `<p class="err">Error: ${e.message}</p>`;
  }
}


// ====================================================================
// INCIDENTS
// ====================================================================

let currentPage = 1;

async function loadIncidents(page = 1) {
  currentPage = page;
  const status   = document.getElementById("filter-status").value;
  const severity = document.getElementById("filter-severity").value;
  const q        = document.getElementById("filter-q").value.trim();

  const params = [`page=${page}`, `limit=10`];
  if (status)   params.push(`status=${encodeURIComponent(status)}`);
  if (severity) params.push(`severity=${encodeURIComponent(severity)}`);
  if (q)        params.push(`q=${encodeURIComponent(q)}`);

  try {
    const result = await apiFetch("/api/incidents?" + params.join("&"));
    const incidents = result.incidents;
    const cols = [
      { key: "id",            label: "ID"          },
      { key: "title",         label: "Title"        },
      { key: "type",          label: "Type"         },
      { key: "severity",      label: "Severity"     },
      { key: "status",        label: "Status"       },
      { key: "cve_id",        label: "CVE ID"       },
      { key: "asset_name",    label: "Asset"        },
      { key: "assigned_name", label: "Assigned To"  },
      { key: "created_at",    label: "Created"      },
    ];
    document.getElementById("incidents-table").innerHTML = buildTable(incidents, cols);

    // Pagination controls
    const pages = result.pages;
    let pagHtml = `<p>Page ${page} of ${pages} (${result.total} total) &nbsp;`;
    if (page > 1)     pagHtml += `<button onclick="loadIncidents(${page-1})">Prev</button> `;
    if (page < pages) pagHtml += `<button onclick="loadIncidents(${page+1})">Next</button>`;
    pagHtml += "</p>";
    document.getElementById("incidents-pagination").innerHTML = pagHtml;
  } catch (e) {
    document.getElementById("incidents-table").innerHTML = `<p class="err">Error: ${e.message}</p>`;
  }

  // Refresh staff and asset dropdowns whenever incidents are loaded
  await refreshDropdowns();
}

function exportCSV() {
  // Trigger CSV download directly from the browser
  window.location.href = API + "/api/incidents/export";
}

/** Keep all incident-form dropdowns in sync */
async function refreshDropdowns() {
  try {
    const staff  = await apiFetch("/api/staff");
    const assets = await apiFetch("/api/assets");
    populateSelect("inc-asset",       assets, "id", "name");
    populateSelect("inc-assignee",    staff,  "id", "name", "-- Unassigned --");
    populateSelect("upd-inc-assignee",staff,  "id", "name", "-- Unassigned --");
  } catch (_) { /* silently ignore if backend not up */ }
}

async function createIncident() {
  clearMsg("inc-msg");
  const body = {
    title:       document.getElementById("inc-title").value.trim(),
    type:        document.getElementById("inc-type").value,
    severity:    document.getElementById("inc-severity").value,
    description: document.getElementById("inc-desc").value.trim(),
    cve_id:      document.getElementById("inc-cve").value.trim() || null,
    cvss_score:  parseFloat(document.getElementById("inc-cvss").value) || null,
    asset_id:    parseInt(document.getElementById("inc-asset").value)  || null,
    assigned_to: parseInt(document.getElementById("inc-assignee").value) || null,
  };

  try {
    const created = await apiFetch("/api/incidents", {
      method: "POST",
      body: JSON.stringify(body)
    });
    showMsg("inc-msg", `✓ Incident #${created.id} logged: "${created.title}"`);
    // Clear form fields
    ["inc-title","inc-desc","inc-cve","inc-cvss"].forEach(id =>
      document.getElementById(id).value = ""
    );
    loadIncidents();
  } catch (e) {
    showMsg("inc-msg", `Error: ${e.message}`, true);
  }
}

async function updateIncident() {
  clearMsg("upd-inc-msg");
  const id = document.getElementById("upd-inc-id").value;
  if (!id) { showMsg("upd-inc-msg", "Enter an Incident ID", true); return; }

  const body = {
    status:      document.getElementById("upd-inc-status").value,
    assigned_to: parseInt(document.getElementById("upd-inc-assignee").value) || null,
  };

  try {
    const updated = await apiFetch(`/api/incidents/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
    showMsg("upd-inc-msg", `✓ Incident #${updated.id} updated to "${updated.status}"`);
    loadIncidents();
  } catch (e) {
    showMsg("upd-inc-msg", `Error: ${e.message}`, true);
  }
}

async function deleteIncident() {
  clearMsg("upd-inc-msg");
  const id = document.getElementById("upd-inc-id").value;
  if (!id) { showMsg("upd-inc-msg", "Enter an Incident ID", true); return; }
  if (!confirm(`Delete incident #${id}? This cannot be undone.`)) return;

  try {
    const res = await apiFetch(`/api/incidents/${id}`, { method: "DELETE" });
    showMsg("upd-inc-msg", `✓ ${res.message}`);
    loadIncidents();
  } catch (e) {
    showMsg("upd-inc-msg", `Error: ${e.message}`, true);
  }
}

// ====================================================================
// INCIDENT NOTES
// ====================================================================

async function loadNotes() {
  const id = document.getElementById("notes-inc-id").value;
  if (!id) { showMsg("note-msg", "Enter an Incident ID", true); return; }

  try {
    const notes = await apiFetch(`/api/incidents/${id}/notes`);
    if (!notes.length) {
      document.getElementById("notes-list").innerHTML = "<p>No notes yet for this incident.</p>";
      return;
    }
    let html = "<table><thead><tr><th>ID</th><th>Author</th><th>Note</th><th>Time</th><th>Del</th></tr></thead><tbody>";
    notes.forEach(n => {
      html += `<tr>
        <td>${n.id}</td>
        <td>${n.author_name || "Unknown"}</td>
        <td>${n.note}</td>
        <td>${n.created_at}</td>
        <td><button onclick="deleteNote(${id},${n.id})">X</button></td>
      </tr>`;
    });
    html += "</tbody></table>";
    document.getElementById("notes-list").innerHTML = html;
  } catch (e) {
    showMsg("note-msg", `Error: ${e.message}`, true);
  }
}

async function addNote() {
  clearMsg("note-msg");
  const id   = document.getElementById("notes-inc-id").value;
  const note = document.getElementById("note-text").value.trim();
  const authorId = document.getElementById("note-author").value;

  if (!id)   { showMsg("note-msg", "Enter an Incident ID", true); return; }
  if (!note) { showMsg("note-msg", "Note text is required", true); return; }

  try {
    await apiFetch(`/api/incidents/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note, author_id: parseInt(authorId) || null })
    });
    document.getElementById("note-text").value = "";
    showMsg("note-msg", "Note added.");
    loadNotes();
  } catch (e) {
    showMsg("note-msg", `Error: ${e.message}`, true);
  }
}

async function deleteNote(incidentId, noteId) {
  if (!confirm("Delete this note?")) return;
  try {
    await apiFetch(`/api/incidents/${incidentId}/notes/${noteId}`, { method: "DELETE" });
    loadNotes();
  } catch (e) {
    showMsg("note-msg", `Error: ${e.message}`, true);
  }
}


/**
 * Fetch CVE details from NVD and auto-fill the incident form.
 * This is the integration between Option A and Option B.
 */
async function fetchCVEForIncident() {
  const cveId = document.getElementById("inc-cve").value.trim();
  if (!cveId) { showMsg("inc-msg", "Enter a CVE ID first", true); return; }

  try {
    showMsg("inc-msg", `Looking up ${cveId}...`);
    const cve = await apiFetch(`/api/cve/${cveId}`);

    // Auto-fill form fields with NVD data
    document.getElementById("inc-cvss").value     = cve.cvss_score || "";
    document.getElementById("inc-severity").value = cve.severity   || "medium";
    document.getElementById("inc-desc").value     = cve.description || "";
    document.getElementById("inc-type").value     = "vulnerability";

    showMsg("inc-msg",
      `✓ CVE found: CVSS ${cve.cvss_score} (${cve.severity}). Description auto-filled.`
    );
  } catch (e) {
    showMsg("inc-msg", `CVE lookup failed: ${e.message}`, true);
  }
}


// ====================================================================
// STAFF
// ====================================================================

async function loadStaff() {
  try {
    const staff = await apiFetch("/api/staff");
    const cols = [
      { key: "id",         label: "ID"       },
      { key: "name",       label: "Name"     },
      { key: "role",       label: "Role"     },
      { key: "email",      label: "Email"    },
      { key: "created_at", label: "Added"    },
    ];
    document.getElementById("staff-table").innerHTML = buildTable(staff, cols);
  } catch (e) {
    document.getElementById("staff-table").innerHTML = `<p class="err">Error: ${e.message}</p>`;
  }
}

async function createStaff() {
  clearMsg("st-msg");
  const body = {
    name:  document.getElementById("st-name").value.trim(),
    email: document.getElementById("st-email").value.trim(),
    role:  document.getElementById("st-role").value,
  };

  try {
    const created = await apiFetch("/api/staff", {
      method: "POST",
      body: JSON.stringify(body)
    });
    showMsg("st-msg", `✓ Staff member "${created.name}" added (ID: ${created.id})`);
    document.getElementById("st-name").value  = "";
    document.getElementById("st-email").value = "";
    loadStaff();
  } catch (e) {
    showMsg("st-msg", `Error: ${e.message}`, true);
  }
}

async function updateStaff() {
  clearMsg("upd-st-msg");
  const id = document.getElementById("upd-st-id").value;
  if (!id) { showMsg("upd-st-msg", "Enter a Staff ID", true); return; }

  const body = {};
  const name  = document.getElementById("upd-st-name").value.trim();
  const email = document.getElementById("upd-st-email").value.trim();
  const role  = document.getElementById("upd-st-role").value;
  if (name)  body.name  = name;
  if (email) body.email = email;
  if (role)  body.role  = role;

  try {
    const updated = await apiFetch(`/api/staff/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
    showMsg("upd-st-msg", `✓ Staff member #${updated.id} updated`);
    loadStaff();
  } catch (e) {
    showMsg("upd-st-msg", `Error: ${e.message}`, true);
  }
}

async function deleteStaff() {
  clearMsg("upd-st-msg");
  const id = document.getElementById("upd-st-id").value;
  if (!id) { showMsg("upd-st-msg", "Enter a Staff ID", true); return; }
  if (!confirm(`Delete staff member #${id}?`)) return;

  try {
    const res = await apiFetch(`/api/staff/${id}`, { method: "DELETE" });
    showMsg("upd-st-msg", `✓ ${res.message}`);
    loadStaff();
  } catch (e) {
    showMsg("upd-st-msg", `Error: ${e.message}`, true);
  }
}


// ====================================================================
// ASSETS
// ====================================================================

async function loadAssets() {
  try {
    const assets = await apiFetch("/api/assets");
    const cols = [
      { key: "id",         label: "ID"    },
      { key: "name",       label: "Name"  },
      { key: "url",        label: "URL"   },
      { key: "type",       label: "Type"  },
      { key: "owner",      label: "Owner" },
    ];
    document.getElementById("assets-table").innerHTML = buildTable(assets, cols);
  } catch (e) {
    document.getElementById("assets-table").innerHTML = `<p class="err">Error: ${e.message}</p>`;
  }
}

async function createAsset() {
  clearMsg("as-msg");
  const body = {
    name:  document.getElementById("as-name").value.trim(),
    url:   document.getElementById("as-url").value.trim()  || null,
    type:  document.getElementById("as-type").value,
    owner: document.getElementById("as-owner").value.trim() || null,
  };

  try {
    const created = await apiFetch("/api/assets", {
      method: "POST",
      body: JSON.stringify(body)
    });
    showMsg("as-msg", `✓ Asset "${created.name}" registered (ID: ${created.id})`);
    ["as-name","as-url","as-owner"].forEach(id =>
      document.getElementById(id).value = ""
    );
    loadAssets();
  } catch (e) {
    showMsg("as-msg", `Error: ${e.message}`, true);
  }
}

async function updateAsset() {
  clearMsg("upd-as-msg");
  const id = document.getElementById("upd-as-id").value;
  if (!id) { showMsg("upd-as-msg", "Enter an Asset ID", true); return; }

  const body = {};
  const name  = document.getElementById("upd-as-name").value.trim();
  const url   = document.getElementById("upd-as-url").value.trim();
  const owner = document.getElementById("upd-as-owner").value.trim();
  if (name)  body.name  = name;
  if (url)   body.url   = url;
  if (owner) body.owner = owner;

  try {
    const updated = await apiFetch(`/api/assets/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
    showMsg("upd-as-msg", `✓ Asset #${updated.id} updated`);
    loadAssets();
  } catch (e) {
    showMsg("upd-as-msg", `Error: ${e.message}`, true);
  }
}

async function deleteAsset() {
  clearMsg("upd-as-msg");
  const id = document.getElementById("upd-as-id").value;
  if (!id) { showMsg("upd-as-msg", "Enter an Asset ID", true); return; }
  if (!confirm(`Delete asset #${id}?`)) return;

  try {
    const res = await apiFetch(`/api/assets/${id}`, { method: "DELETE" });
    showMsg("upd-as-msg", `✓ ${res.message}`);
    loadAssets();
  } catch (e) {
    showMsg("upd-as-msg", `Error: ${e.message}`, true);
  }
}


// ====================================================================
// UPTIME STATUS
// ====================================================================

async function loadUptime() {
  document.getElementById("uptime-results").innerHTML = "<p>Checking status...</p>";
  try {
    const results = await apiFetch("/api/uptime/status");
    let html = "<table><thead><tr><th>Service</th><th>Status</th><th>Indicator</th></tr></thead><tbody>";
    results.forEach(r => {
      const cls = r.ok ? "ok" : (r.indicator === "minor" ? "warn" : "crit");
      html += `<tr>
        <td>${r.name}</td>
        <td>${r.status}</td>
        <td class="${cls}">${r.indicator.toUpperCase()}</td>
      </tr>`;
    });
    html += "</tbody></table>";
    document.getElementById("uptime-results").innerHTML = html;
  } catch (e) {
    document.getElementById("uptime-results").innerHTML =
      `<p class="err">Error fetching uptime status: ${e.message}</p>`;
  }
}

async function pingUrl() {
  const url = document.getElementById("ping-url").value.trim();
  if (!url) { showMsg("ping-result", "Enter a URL to check", true); return; }

  document.getElementById("ping-result").textContent = "Pinging...";
  try {
    const res = await apiFetch(`/api/uptime/check?url=${encodeURIComponent(url)}`);
    const cls = res.ok ? "ok" : "crit";
    document.getElementById("ping-result").innerHTML =
      `<span class="${cls}">${res.message}</span> — HTTP ${res.status_code || "N/A"}`;
  } catch (e) {
    showMsg("ping-result", `Error: ${e.message}`, true);
  }
}


// ====================================================================
// CVE LOOKUP
// ====================================================================

async function lookupCVE() {
  const cveId = document.getElementById("cve-input").value.trim();
  if (!cveId) { document.getElementById("cve-result").textContent = "Enter a CVE ID."; return; }

  document.getElementById("cve-result").textContent = "Looking up...";
  try {
    const cve = await apiFetch(`/api/cve/${cveId}`);
    const refs = cve.references.map(r => `<a href="${r}" target="_blank">${r}</a>`).join("<br>");
    document.getElementById("cve-result").innerHTML = `
      <table>
        <tr><th>CVE ID</th>       <td>${cve.cve_id}</td></tr>
        <tr><th>Severity</th>     <td>${cve.severity.toUpperCase()}</td></tr>
        <tr><th>CVSS Score</th>   <td>${cve.cvss_score ?? "N/A"}</td></tr>
        <tr><th>Published</th>    <td>${cve.published}</td></tr>
        <tr><th>Description</th>  <td>${cve.description}</td></tr>
        <tr><th>References</th>   <td>${refs || "None"}</td></tr>
      </table>
    `;
  } catch (e) {
    document.getElementById("cve-result").innerHTML =
      `<p class="err">Error: ${e.message}</p>`;
  }
}


// ====================================================================
// INIT — load dashboard on page open
// ====================================================================
window.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
});
