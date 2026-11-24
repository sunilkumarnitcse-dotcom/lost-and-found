// Frontend for Smart Campus Lost & Found.
// Plain JavaScript, no framework. Talks ONLY to the Express API
// (never to MongoDB directly).
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

// ---- Public board ----
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


// ---- Track my report: reporter sees only their own report ----
$('track-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const ref = $('track-ref').value.trim();
  if (ref) openItem(ref);
});

// ---- Report ----
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

// ---- Item details + possible matches + claim ----
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

// ---- Contact / Inquiry ----
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
