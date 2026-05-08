const API   = 'http://localhost:3000';
let token   = localStorage.getItem('gw_token');
let socket  = null;

// ══════════════════════════════════════════════════════════════
// Auth
// ══════════════════════════════════════════════════════════════
const login = async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.textContent = '';

  try {
    const res  = await fetch(`${API}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || data.data.user.role !== 'admin') {
      errEl.textContent = data.message || 'Admin access required';
      return;
    }

    token = data.data.token;
    localStorage.setItem('gw_token', token);
    showDashboard();

  } catch (err) {
    errEl.textContent = 'Connection failed — is the gateway running?';
  }
};

const authHeaders = () => ({
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${token}`,
});

// ══════════════════════════════════════════════════════════════
// Show dashboard after login
// ══════════════════════════════════════════════════════════════
const showDashboard = () => {
  document.getElementById('login-overlay').style.display  = 'none';
  document.getElementById('main-content').classList.remove('hidden');
  connectSocket();
  loadStats();
  loadRequests();
  loadAbuseEvents();
  setInterval(loadStats, 30000);  // refresh stats every 30s
};

// ══════════════════════════════════════════════════════════════
// Socket.IO — live events
// ══════════════════════════════════════════════════════════════
const connectSocket = () => {
  socket = io(API);

  const dot    = document.getElementById('socket-status-dot');
  const status = document.getElementById('socket-status');

  socket.on('connect', () => {
    dot.className    = 'status-dot connected';
    status.textContent = 'Live';
  });

  socket.on('disconnect', () => {
    dot.className    = 'status-dot disconnected';
    status.textContent = 'Disconnected';
  });

  // ── live traffic ──────────────────────────────────────────
  socket.on('traffic', (data) => {
    addTrafficItem(data);
  });

  // ── abuse events ──────────────────────────────────────────
  socket.on('abuse', (data) => {
    addAbuseItem(data);
    loadStats();
  });

  // ── rate limit events ─────────────────────────────────────
  socket.on('rateLimit', (data) => {
    addTrafficItem({ ...data, statusCode: 429 });
  });
};

// ══════════════════════════════════════════════════════════════
// Traffic feed
// ══════════════════════════════════════════════════════════════
const addTrafficItem = (data) => {
  const feed = document.getElementById('traffic-feed');
  const empty = feed.querySelector('.feed-empty');
  if (empty) empty.remove();

  const status = data.statusCode;
  const cls    = status >= 500 ? 'err' : status >= 400 ? 'warn' : 'ok';
  const time   = new Date(data.timestamp || Date.now()).toLocaleTimeString();

  const item = document.createElement('div');
  item.className = `traffic-item ${cls}`;
  item.innerHTML = `
    <span class="method-badge">${data.method || 'GET'}</span>
    <span class="traffic-path">${data.path || '/'}</span>
    <span class="status-badge ${cls}">${status}</span>
    <span class="traffic-meta">${data.latencyMs || 0}ms · ${data.ip || ''} · ${time}</span>
  `;

  feed.insertBefore(item, feed.firstChild);

  // keep max 50 items
  while (feed.children.length > 50) {
    feed.removeChild(feed.lastChild);
  }
};

// ══════════════════════════════════════════════════════════════
// Abuse feed
// ══════════════════════════════════════════════════════════════
const addAbuseItem = (data) => {
  const feed  = document.getElementById('abuse-feed');
  const empty = feed.querySelector('.feed-empty');
  if (empty) empty.remove();

  const signals = data.signals
    ? Object.entries(data.signals).map(([k, v]) => `${k}:${v}`).join(', ')
    : '';

  const actionCls = data.action === 'blocked' ? 'blocked' : 'throttled';
  const time = new Date(data.timestamp || Date.now()).toLocaleTimeString();

  const item = document.createElement('div');
  item.className = 'abuse-item';
  item.innerHTML = `
    <div class="abuse-header">
      <span class="abuse-ip">${data.ip}</span>
      <span class="abuse-score">Score: ${data.score || '—'}</span>
      <span class="abuse-action ${actionCls}">${data.type || 'event'}</span>
    </div>
    <div class="abuse-signals">${signals} · ${time}</div>
  `;

  feed.insertBefore(item, feed.firstChild);

  while (feed.children.length > 30) {
    feed.removeChild(feed.lastChild);
  }
};

// ══════════════════════════════════════════════════════════════
// Load stats from API
// ══════════════════════════════════════════════════════════════
const loadStats = async () => {
  try {
    const res  = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) return;

    const s = data.data;
    document.getElementById('stat-requests').textContent = s.totalRequests  ?? '—';
    document.getElementById('stat-errors').textContent   = s.errorRate      ?? '—';
    document.getElementById('stat-latency').textContent  = s.avgLatencyMs   ? `${s.avgLatencyMs}ms` : '—';
    document.getElementById('stat-abuse').textContent    = s.totalAbuse     ?? '—';
    document.getElementById('stat-keys').textContent     = s.activeKeys     ?? '—';
    document.getElementById('stat-users').textContent    = s.totalUsers     ?? '—';

  } catch (err) {
    console.error('Stats load failed', err);
  }
};

// ══════════════════════════════════════════════════════════════
// Load recent requests
// ══════════════════════════════════════════════════════════════
const loadRequests = async () => {
  try {
    const res  = await fetch(`${API}/admin/requests?limit=20`, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) return;

    const tbody = document.getElementById('requests-tbody');
    tbody.innerHTML = '';

    if (!data.data.logs.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No requests yet</td></tr>';
      return;
    }

    data.data.logs.forEach((log) => {
      const status = log.statusCode;
      const cls    = status >= 500 ? 'err' : status >= 400 ? 'warn' : 'ok';
      const time   = new Date(log.createdAt).toLocaleTimeString();

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${time}</td>
        <td><span class="method-badge">${log.method}</span></td>
        <td>${log.path}</td>
        <td><span class="status-badge ${cls}">${status}</span></td>
        <td>${log.latencyMs}ms</td>
        <td>${log.ip}</td>
        <td>${log.userId?.email || '—'}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error('Requests load failed', err);
  }
};

// ══════════════════════════════════════════════════════════════
// Load abuse events
// ══════════════════════════════════════════════════════════════
const loadAbuseEvents = async () => {
  try {
    const res  = await fetch(`${API}/admin/abuse?limit=20`, { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) return;

    const feed = document.getElementById('abuse-feed');
    feed.innerHTML = '';

    if (!data.data.events.length) {
      feed.innerHTML = '<div class="feed-empty">No abuse events</div>';
      return;
    }

    data.data.events.forEach((event) => {
      const signals = event.signals
        ? Object.entries(event.signals).map(([k, v]) => `${k}:${v}`).join(', ')
        : '';

      const actionCls = event.action === 'blocked' ? 'blocked' : 'throttled';
      const time = new Date(event.createdAt).toLocaleTimeString();

      const item = document.createElement('div');
      item.className = 'abuse-item';
      item.innerHTML = `
        <div class="abuse-header">
          <span class="abuse-ip">${event.ip}</span>
          <span class="abuse-score">Score: ${event.score}</span>
          <span class="abuse-action ${actionCls}">${event.action}</span>
        </div>
        <div class="abuse-signals">${signals} · ${time}</div>
      `;
      feed.appendChild(item);
    });

  } catch (err) {
    console.error('Abuse events load failed', err);
  }
};

// ══════════════════════════════════════════════════════════════
// IP block / unblock
// ══════════════════════════════════════════════════════════════
const blockIP = async () => {
  const ip  = document.getElementById('ip-input').value.trim();
  const msg = document.getElementById('ip-message');

  if (!ip) { showIPMessage('Enter an IP address', 'error'); return; }

  try {
    const res  = await fetch(`${API}/admin/block`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ ip }),
    });
    const data = await res.json();

    showIPMessage(
      res.ok ? `✓ ${ip} blocked successfully` : data.message,
      res.ok ? 'success' : 'error'
    );
  } catch (err) {
    showIPMessage('Failed to block IP', 'error');
  }
};

const unblockIP = async () => {
  const ip = document.getElementById('ip-input').value.trim();
  if (!ip) { showIPMessage('Enter an IP address', 'error'); return; }

  try {
    const res  = await fetch(`${API}/admin/unblock`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ ip }),
    });
    const data = await res.json();

    showIPMessage(
      res.ok ? `✓ ${ip} unblocked successfully` : data.message,
      res.ok ? 'success' : 'error'
    );
  } catch (err) {
    showIPMessage('Failed to unblock IP', 'error');
  }
};

const showIPMessage = (msg, type) => {
  const el = document.getElementById('ip-message');
  el.textContent  = msg;
  el.className    = `ip-message ${type}`;
  setTimeout(() => { el.textContent = ''; }, 4000);
};

// ══════════════════════════════════════════════════════════════
// Clock
// ══════════════════════════════════════════════════════════════
const updateClock = () => {
  document.getElementById('current-time').textContent =
    new Date().toLocaleTimeString();
};
setInterval(updateClock, 1000);
updateClock();

// ══════════════════════════════════════════════════════════════
// Auto-login if token exists
// ══════════════════════════════════════════════════════════════
if (token) showDashboard();