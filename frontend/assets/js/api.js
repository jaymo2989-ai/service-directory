// ---------- Configuration ----------
// Point this at your deployed backend once it's live (e.g. Render URL).
const API_BASE = window.API_BASE || 'http://localhost:3000/api';

// ---------- Auth token storage ----------
const Auth = {
  getToken: () => localStorage.getItem('sd_token'),
  setToken: (t) => localStorage.setItem('sd_token', t),
  clearToken: () => localStorage.removeItem('sd_token'),
  getUser: () => JSON.parse(localStorage.getItem('sd_user') || 'null'),
  setUser: (u) => localStorage.setItem('sd_user', JSON.stringify(u)),
  isLoggedIn: () => !!localStorage.getItem('sd_token'),
  logout: () => { localStorage.removeItem('sd_token'); localStorage.removeItem('sd_user'); }
};

const AdminAuth = {
  getToken: () => localStorage.getItem('sd_admin_token'),
  setToken: (t) => localStorage.setItem('sd_admin_token', t),
  isLoggedIn: () => !!localStorage.getItem('sd_admin_token'),
  logout: () => localStorage.removeItem('sd_admin_token')
};

// ---------- Core request helper ----------
async function apiRequest(path, { method = 'GET', body, admin = false, isForm = false } = {}) {
  const headers = {};
  const token = admin ? AdminAuth.getToken() : Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined
    });
  } catch (err) {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let data = {};
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

// ---------- Toast notifications ----------
function ensureToastStack() {
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}
function toast(message, type = 'info') {
  const stack = ensureToastStack();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

// ---------- Category icons (inline SVG, no external icon library) ----------
const ICONS = {
  wrench: '<path d="M14 7a4 4 0 0 1-5.3 3.8L4 15.5 2.5 14l4.7-4.7A4 4 0 1 1 14 7Z"/>',
  droplet: '<path d="M12 2s6 7 6 12a6 6 0 1 1-12 0c0-5 6-12 6-12Z"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
  sparkles: '<path d="M12 3v4M12 17v4M5 12H1M23 12h-4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/><circle cx="12" cy="12" r="3"/>',
  hammer: '<path d="M15 12l-8.5 8.5a1.5 1.5 0 0 1-2-2L13 10"/><path d="M13 3l6 6-3 3-6-6 3-3Z"/>',
  paint: '<path d="M3 21c0-3 2-4 4-4h2v-4H7a4 4 0 0 1-4-4V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a4 4 0 0 1-4 4h-2v4h2c2 0 4 1 4 4"/>',
  saw: '<rect x="3" y="10" width="18" height="4" rx="1"/><path d="M3 10V6l4 4M21 14v4l-4-4"/>',
  truck: '<rect x="1" y="7" width="13" height="9"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 8.5 21 21M8.5 15.5 21 3"/>',
  camera: '<path d="M4 8h3l2-2h6l2 2h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/>',
  computer: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  book: '<path d="M4 4h9a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4Z"/><path d="M20 4h-2a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h3Z"/>',
  utensils: '<path d="M6 2v7a2 2 0 0 0 2 2v11M4 2v7M8 2v7M18 2c-2 0-3 2-3 5v4h3v11M18 2v20"/>',
  leaf: '<path d="M11 21C5 21 3 15 3 10c8 0 13 3 13 11-2 0-3-1-5-3"/><path d="M11 21c0-6 2-9 9-11"/>',
  car: '<path d="M3 13l2-6h14l2 6v6H3Z"/><circle cx="7.5" cy="19" r="1.6"/><circle cx="16.5" cy="19" r="1.6"/>',
  briefcase: '<rect x="2" y="7" width="20" height="13" rx="1"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  tool: '<path d="M14 7a4 4 0 0 1-5.3 3.8L4 15.5 2.5 14l4.7-4.7A4 4 0 1 1 14 7Z"/>'
};
function iconSvg(name, size = 24) {
  const paths = ICONS[name] || ICONS.tool;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
function starIcon() {
  return '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L1.3 7.7l6.1-.6L10 1.5Z"/></svg>';
}

// ---------- Shared helpers ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function formatKsh(min, max) {
  if (!min && !max) return 'Price on request';
  if (min && max) return `KSh ${min.toLocaleString()} – ${max.toLocaleString()}`;
  return `From KSh ${(min || max).toLocaleString()}`;
}

// ---------- Mobile nav toggle (shared header behavior) ----------
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('menuBtn');
  const links = document.getElementById('navLinks');
  if (btn && links) {
    btn.addEventListener('click', () => links.classList.toggle('open'));
  }

  // Reflect login state in header, if present
  const loginArea = document.getElementById('navAuthArea');
  if (loginArea) {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      loginArea.innerHTML = `
        <a href="dashboard.html" class="btn btn-ghost btn-sm">${escapeHtml(user?.name?.split(' ')[0] || 'Account')}</a>
        <button class="btn btn-outline btn-sm" id="logoutBtn">Log out</button>
      `;
      document.getElementById('logoutBtn').addEventListener('click', () => {
        Auth.logout();
        window.location.href = 'index.html';
      });
    } else {
      loginArea.innerHTML = `
        <a href="login.html" class="btn btn-ghost btn-sm">Log in</a>
        <a href="register.html" class="btn btn-primary btn-sm">Sign up</a>
      `;
    }
  }
});
