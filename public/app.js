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

// ---- Tabs ----
document.querySelectorAll('nav button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('nav button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab').forEach((t) => { t.hidden = true; });
    $('tab-' + btn.dataset.tab).hidden = false;
    $('item-details').hidden = true;
    if (btn.dataset.tab === 'staff') refreshStaff();
  });
});

// ---- Categories (shared by search + report form) ----
async function loadCategories() {
  try {
    const cats = await api('/api/categories');
    const opts = cats.map((c) => `<option>${escapeHtml(c.name)}</option>`).join('');
    $('filter-category').innerHTML = '<option value="">All categories</option>' + opts;
    $('report-category').innerHTML = opts;
  } catch (e) { /* categories load later, after the server is up */ }
}

// ---- Public board (FR-01, FR-02) ----
async function loadBoard() {
  const params = new URLSearchParams({
    q: $('q').value, category: $('filter-category').value,
    date: $('filter-date').value, location: $('filter-location').value,
    type: $('filter-type').value
  });
  try {
    const items = await api('/api/items?' + params.toString());
    $('board').innerHTML = items.length
      ? items.map(cardHtml).join('')
      : '<p>No approved items match your search yet.</p>';
  } catch (e) {
    $('board').innerHTML = `<p>${escapeHtml(e.message)}</p>`;
  }
}
$('search-form').addEventListener('submit', (e) => { e.preventDefault(); loadBoard(); });
$('clear-filters').addEventListener('click', () => {
  $('search-form').reset();
  loadBoard();
});

// ---- Report (FR-03, FR-04) ----
$('report-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try {
    const item = await api('/api/items', { method: 'POST', body: JSON.stringify(data) });
    $('report-result').textContent = `Report submitted! Your reference ID is ${item.referenceId}. Status: Pending — Staff will approve it before it appears on the board.`;
    e.target.reset();
    loadBoard();
  } catch (err) {
    $('report-result').textContent = err.message;
  }
});

// ---- Item details + possible matches + claim (FR-12, FR-09) ----
window.openItem = async function (ref) {
  currentRef = ref;
  document.querySelectorAll('.tab').forEach((t) => { t.hidden = true; });
  $('item-details').hidden = false;
  try {
    const item = await api('/api/items/' + ref);
    $('details-box').innerHTML = cardHtml(item) +
      `<p><strong>Description:</strong> ${escapeHtml(item.description)}</p>
       <p><strong>Photo:</strong> ${escapeHtml(item.photoRef || '—')}</p>`;
    const { matches } = await api(`/api/items/${ref}/matches`);
    $('matches-box').innerHTML = matches.length
      ? matches.map((m) => cardHtml(m.item) + `<p>Match score: ${m.score}/100 — ${escapeHtml(m.reasons.join(', '))}. Suggestion only, not proof of ownership.</p>`).join('')
      : '<p>No possible matches found.</p>';
  } catch (err) {
    $('details-box').textContent = err.message;
    $('matches-box').innerHTML = '';
  }
};
$('back-to-board').addEventListener('click', () => {
  $('item-details').hidden = true;
  $('tab-board').hidden = false;
  loadBoard();
});
$('claim-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try {
    await api(`/api/items/${currentRef}/claims`, { method: 'POST', body: JSON.stringify(data) });
    $('claim-result').textContent = 'Claim submitted! Staff will review your evidence and decide.';
    e.target.reset();
  } catch (err) {
    $('claim-result').textContent = err.message;
  }
});

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
      $('dashboard').innerHTML = `<p>Total items: <strong>${dash.counts.totalItems}</strong> · Pending: <strong>${dash.counts.pendingReports}</strong> · Available: <strong>${dash.counts.availableItems}</strong> · Returned: <strong>${dash.counts.returnedItems}</strong> · Pending claims: <strong>${dash.counts.pendingClaims}</strong> · Open inquiries: <strong>${dash.counts.openInquiries}</strong></p>`;
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

// ---- Contact / Inquiry (FR-16) ----
$('inquiry-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try {
    await api('/api/inquiries', { method: 'POST', body: JSON.stringify(data) });
    $('inquiry-result').textContent = 'Inquiry sent! The Lost & Found team will get back to you.';
    e.target.reset();
  } catch (err) {
    $('inquiry-result').textContent = err.message;
  }
});

// ---- Start ----
refreshLoginUI();
loadCategories();
loadBoard();
