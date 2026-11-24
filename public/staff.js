// Frontend for Smart Campus Lost & Found.
// Plain JavaScript, no framework. Talks ONLY to the Express API
// (never to MongoDB directly — SRS 3.1.3).
const $ = (id) => document.getElementById(id);
const msg = $('message');
let token = localStorage.getItem('lf_token') || '';
let myRole = localStorage.getItem('lf_role') || '';
let myName = localStorage.getItem('lf_name') || '';
let currentRef = '';

function showMessage(text, isError = false) {
  msg.hidden = false;
  msg.textContent = text;
  msg.className = isError ? 'message error' : 'message';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function authHeaders() {
  return token ? { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { ...(options.headers || {}), ...authHeaders() }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function cardHtml(item) {
  return `<article class="card">
    <h3>${escapeHtml(item.title)}</h3>
    <p><span class="badge">${escapeHtml(item.referenceId)}</span> <span class="badge">${escapeHtml(item.status)}</span></p>
    <p><strong>${escapeHtml(item.category)}</strong> · ${escapeHtml(item.location)}</p>
    <p>${escapeHtml(item.description)}</p>
    <p>Date: ${escapeHtml(String(item.date || '').slice(0, 10))}</p>
    <button type="button" onclick="openItem('${escapeHtml(item.referenceId)}')">Details</button>
  </article>`;
}

// ---- Staff / Admin login ----
function refreshLoginUI() {
  $('login-box').hidden = !!token;
  $('staff-area').hidden = !token;
  if (token) {
    $('staff-name').textContent = myName;
    $('staff-role').textContent = myRole;
    $('admin-area').hidden = myRole !== 'Admin';
  }
}
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ pin: $('pin').value }) });
    token = data.token; myRole = data.role; myName = data.name;
    localStorage.setItem('lf_token', token);
    localStorage.setItem('lf_role', myRole);
    localStorage.setItem('lf_name', myName);
    showMessage(`Welcome, ${myName} (${myRole}).`);
    refreshLoginUI();
    refreshStaff();
  } catch (err) {
    showMessage(err.message, true);
  }
});
$('logout-btn').addEventListener('click', () => {
  token = ''; myRole = ''; myName = '';
  localStorage.removeItem('lf_token');
  localStorage.removeItem('lf_role');
  localStorage.removeItem('lf_name');
  refreshLoginUI();
});

async function refreshStaff() {
  if (!token) { refreshLoginUI(); return; }
  refreshLoginUI();
  try {
    const items = await api('/api/items/staff/all?status=Pending');
    $('pending-list').innerHTML = items.length ? items.map((it) => `<article class="card">
      <h3>${escapeHtml(it.title)}</h3>
      <p><span class="badge">${escapeHtml(it.referenceId)}</span> <span class="badge">${escapeHtml(it.status)}</span></p>
      <p>${escapeHtml(it.category)} · ${escapeHtml(it.location)} · ${escapeHtml(String(it.date || '').slice(0, 10))}</p>
      <p>Reporter: ${escapeHtml(it.reporterName)} — ${escapeHtml(it.reporterContact)}</p>
      <button type="button" onclick="setStatus('${escapeHtml(it.referenceId)}','Available')">Approve</button>
      <button type="button" onclick="setStatus('${escapeHtml(it.referenceId)}','Closed')">Close</button>
    </article>`).join('') : '<p>No pending reports.</p>';

    const claims = await api('/api/staff/claims?status=Pending');
    $('claims-list').innerHTML = claims.length ? claims.map((c) => `<article class="card">
      <h3>Claim for ${escapeHtml(c.referenceId)}</h3>
      <p>Claimant: ${escapeHtml(c.claimantName)} — ${escapeHtml(c.claimantContact)}</p>
      <p>Evidence: ${escapeHtml(c.evidence)}</p>
      <button type="button" onclick="decideClaim('${c._id}','Approved')">Approve — Return Item</button>
      <button type="button" onclick="decideClaim('${c._id}','Rejected')">Reject</button>
    </article>`).join('') : '<p>No pending claims.</p>';

    if (myRole === 'Admin') {
      const dash = await api('/api/admin/dashboard');
      const c = dash.counts;
      const stat = (n, l) => `<div class="stat-card"><div class="stat-num">${n}</div><div class="stat-label">${l}</div></div>`;
      $('dashboard').innerHTML = `<div class="stat-grid">`
        + stat(c.totalItems, 'Total Items')
        + stat(c.pendingReports, 'Pending Reports')
        + stat(c.availableItems, 'Available Items')
        + stat(c.returnedItems, 'Returned Items')
        + stat(c.pendingClaims, 'Pending Claims')
        + stat(c.openInquiries, 'Open Inquiries')
        + `</div>`;
      $('activity-list').innerHTML = dash.recentActivity.map((a) => `<li>${escapeHtml(a.action)} — ${escapeHtml(a.details || '')} (${new Date(a.createdAt).toLocaleString()})</li>`).join('');
      const cats = await api('/api/admin/categories');
      $('category-list').innerHTML = cats.map((c) => `<li>${escapeHtml(c.name)} <button type="button" onclick="deleteCategory('${c._id}')">Delete</button></li>`).join('');
      const staff = await api('/api/admin/staff-accounts');
      $('staff-list').innerHTML = staff.map((s) => `<li>${escapeHtml(s.name)} (${escapeHtml(s.role)}) — ${s.active ? 'active' : 'deactivated'}</li>`).join('');
      const inqs = await api('/api/inquiries/staff/all');
      $('inquiry-list').innerHTML = inqs.map((q) => `<li><strong>${escapeHtml(q.name)}</strong> (${escapeHtml(q.status)}): ${escapeHtml(q.message)} — ${escapeHtml(q.contact)}</li>`).join('');
    }
  } catch (err) {
    showMessage(err.message, true);
  }
}

window.setStatus = async function (ref, status) {
  try {
    await api(`/api/items/staff/${ref}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    showMessage(`${ref} is now ${status}.`);
    refreshStaff(); loadBoard();
  } catch (err) { showMessage(err.message, true); }
};
window.decideClaim = async function (id, decision) {
  try {
    await api(`/api/staff/claims/${id}/decision`, { method: 'PATCH', body: JSON.stringify({ decision }) });
    showMessage(`Claim ${decision}.`);
    refreshStaff(); loadBoard();
  } catch (err) { showMessage(err.message, true); }
};
window.deleteCategory = async function (id) {
  try {
    await api(`/api/admin/categories/${id}`, { method: 'DELETE' });
    refreshStaff(); loadCategories();
  } catch (err) { showMessage(err.message, true); }
};

// ---- Search-Sweep Tracker (FR-17 to FR-20) ----
$('sweep-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ref = $('sweep-ref').value.trim();
  try {
    const data = await api(`/api/items/${ref}/sweep`);
    $('sweep-area').innerHTML = `<p><strong>${escapeHtml(data.item.title)}</strong> (${escapeHtml(data.item.referenceId)}) — Last known: ${escapeHtml(data.item.lastKnownLocation || '—')} — Progress: ${data.progress}%</p>` +
      (data.tasks.length ? data.tasks.map((t) => `<p>${escapeHtml(t.area)} — <strong>${escapeHtml(t.status)}</strong> ${t.assignedTo ? '(' + escapeHtml(t.assignedTo) + ')' : ''} ${escapeHtml(t.outcome || '')}
        <button type="button" onclick="setSweep('${t._id}','Checked')">Mark Checked</button>
        <button type="button" onclick="setSweep('${t._id}','Found')">Mark Found</button></p>`).join('') : '<p>No areas on the checklist yet.</p>') +
      `<p>Suggested areas: ${data.suggestedAreas.join(', ')}</p>
       <form id="add-sweep-form"><input id="new-sweep-area" placeholder="Area name" required>
       <input id="new-sweep-assignee" placeholder="Assigned to (staff / volunteer)">
       <button type="submit">Add Area</button></form>`;
    $('add-sweep-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      try {
        await api(`/api/items/${ref}/sweep`, { method: 'POST', body: JSON.stringify({ area: $('new-sweep-area').value, assignedTo: $('new-sweep-assignee').value }) });
        $('sweep-form').dispatchEvent(new Event('submit'));
      } catch (err) { showMessage(err.message, true); }
    });
  } catch (err) {
    $('sweep-area').textContent = err.message;
  }
});
window.setSweep = async function (id, status) {
  try {
    await api(`/api/sweep/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    $('sweep-form').dispatchEvent(new Event('submit'));
  } catch (err) { showMessage(err.message, true); }
};

// ---- Admin forms ----
$('category-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name: $('new-category').value }) });
    e.target.reset(); refreshStaff(); loadCategories();
  } catch (err) { showMessage(err.message, true); }
});
$('staff-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/admin/staff-accounts', { method: 'POST', body: JSON.stringify({ name: $('new-staff-name').value, role: $('new-staff-role').value, pin: $('new-staff-pin').value }) });
    e.target.reset(); refreshStaff();
  } catch (err) { showMessage(err.message, true); }
});


// ---- Start ----
refreshLoginUI();
