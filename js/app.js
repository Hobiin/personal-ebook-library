// Titik masuk aplikasi: router berbasis hash, bottom navigation, dan Service Worker.
import { el, icon, showToast, closeSheet } from './utils.js';
import { renderLibrary, renderFavorites } from './library.js';
import { renderSettings, getTheme, applyTheme } from './settings.js';
import { initStore } from './store.js';

const ROUTES = {
  '/': { title: 'Library', render: renderLibrary },
  '/favorites': { title: 'Favorit', render: renderFavorites },
  '/settings': { title: 'Pengaturan', render: renderSettings },
};

const NAV_ITEMS = [
  ['/', 'Library', 'library'],
  ['/favorites', 'Favorit', 'heart'],
  ['/settings', 'Pengaturan', 'settings'],
];

const viewEl = document.querySelector('#view');
const navEl = document.querySelector('#bottom-nav');

// Error ditampilkan di layar (iPhone tidak punya Console yang bisa dilihat dari Windows)
window.addEventListener('error', (event) => showToast(`Error: ${event.message}`, { error: true }));
window.addEventListener('unhandledrejection', (event) => showToast(`Error: ${event.reason}`, { error: true }));

function buildNav() {
  navEl.replaceChildren(...NAV_ITEMS.map(([path, label, iconName]) => el('a', {
    href: `#${path}`,
    dataset: { route: path },
  }, icon(iconName, 24), el('span', { text: label }))));
}

function currentPath() {
  const hash = window.location.hash.replace(/^#/, '');
  return ROUTES[hash] ? hash : '/';
}

function render() {
  const path = currentPath();
  closeSheet();
  viewEl.replaceChildren();
  ROUTES[path].render(viewEl);
  navEl.querySelectorAll('a').forEach((link) => {
    if (link.dataset.route === path) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `${ROUTES[path].title} | Personal Ebook Library`;
  window.scrollTo(0, 0);
}

async function start() {
  applyTheme(getTheme());
  buildNav();
  viewEl.replaceChildren(el('div', { class: 'empty' }, el('p', { text: 'Memuat perpustakaan...' })));

  try {
    await initStore();
  } catch (error) {
    viewEl.replaceChildren(el('div', { class: 'empty' },
      el('h2', { text: 'Database tidak dapat dibuka' }),
      el('p', { text: `${error.message}. Tutup lalu buka kembali aplikasi.` }),
    ));
    return;
  }

  window.addEventListener('hashchange', render);
  render();
}

start();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch((error) => {
      showToast(`Service Worker gagal: ${error.message}`, { error: true });
    });
  });
}