// Halaman Pengaturan: tema, penyimpanan, backup (placeholder), status PWA, data contoh.
import { el, formatBytes, showToast } from './utils.js';
import { getDbStats, resetSampleData, clearAllData } from './store.js';

const THEME_KEY = 'theme';
const THEMES = [['system', 'Sistem'], ['light', 'Terang'], ['dark', 'Gelap']];

export function getTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'light' || mode === 'dark') root.dataset.theme = mode;
  else delete root.dataset.theme;
}

function saveTheme(mode) {
  try {
    if (mode === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, mode);
  } catch {
    // Penyimpanan tidak tersedia: tema tetap berlaku untuk sesi ini.
  }
}

function card(title, ...children) {
  return el('section', { class: 'card' }, el('h2', { text: title }), children);
}

function row(label, valueNode) {
  return [el('dt', { text: label }), valueNode];
}

// ---------- Kartu-kartu ----------
function themeCard() {
  const group = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Tema' });
  function paint() {
    const current = getTheme();
    group.replaceChildren(...THEMES.map(([value, label]) => el('button', {
      type: 'button',
      'aria-pressed': String(current === value),
      onClick: () => {
        saveTheme(value);
        applyTheme(value);
        paint();
      },
    }, label)));
  }
  paint();
  return card('Tampilan', group);
}

function storageCard() {
  const usageDd = el('dd', { text: 'memeriksa...' });
  const persistDd = el('dd', { text: 'memeriksa...' });
  const fill = el('div', { class: 'meter-fill' });

  async function load() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const { usage = 0, quota = 0 } = await navigator.storage.estimate();
        usageDd.textContent = quota ? `${formatBytes(usage)} dari ${formatBytes(quota)}` : formatBytes(usage);
        fill.style.width = quota ? `${Math.min(100, (usage / quota) * 100).toFixed(2)}%` : '0%';
      } catch {
        usageDd.textContent = 'gagal dibaca';
      }
    } else {
      usageDd.textContent = 'tidak didukung';
    }
    if (navigator.storage && navigator.storage.persisted) {
      try {
        persistDd.textContent = (await navigator.storage.persisted()) ? 'ya' : 'tidak';
      } catch {
        persistDd.textContent = 'gagal dibaca';
      }
    } else {
      persistDd.textContent = 'tidak didukung';
    }
  }

  const askButton = el('button', {
    class: 'btn',
    type: 'button',
    text: 'Minta penyimpanan persisten',
    disabled: !(navigator.storage && navigator.storage.persist),
    onClick: async () => {
      try {
        const granted = await navigator.storage.persist();
        showToast(granted ? 'Penyimpanan persisten diberikan' : 'Penyimpanan persisten ditolak browser');
      } catch (error) {
        showToast(`Gagal: ${error.message}`, { error: true });
      }
      load();
    },
  });

  load();
  return el('section', { class: 'card warning' },
    el('h2', { text: 'Penyimpanan' }),
    el('div', { class: 'meter' }, fill),
    el('dl', { class: 'kv' }, row('Dipakai', usageDd), row('Persisten', persistDd)),
    el('p', { text: 'Ebook Anda disimpan di dalam penyimpanan browser perangkat ini. Data dapat hilang jika Anda menghapus aplikasi dari Layar Utama, membersihkan data situs, atau perangkat kehabisan ruang. Lakukan backup secara berkala. File asli Anda tetap aman di aplikasi Files.' }),
    el('p', { text: 'Angka kuota adalah perkiraan dari browser.' }),
    el('div', { class: 'card-actions' }, askButton),
  );
}

function backupCard() {
  return card('Backup',
    el('p', { text: 'Ekspor dan impor backup (metadata, kategori, favorit, progres) akan tersedia di Milestone M8.' }),
    el('div', { class: 'card-actions' },
      el('button', { class: 'btn', type: 'button', text: 'Ekspor backup (JSON)', disabled: true }),
      el('button', { class: 'btn', type: 'button', text: 'Impor backup', disabled: true }),
    ),
  );
}

function pwaCard() {
  const list = el('dl', { class: 'kv' });

  async function load() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    let worker = 'tidak didukung';
    let cacheNames = '-';
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        worker = registration && registration.active ? 'aktif' : 'belum aktif';
      } catch {
        worker = 'gagal dibaca';
      }
    }
    if ('caches' in window) {
      try {
        cacheNames = (await caches.keys()).join(', ') || '(kosong)';
      } catch {
        cacheNames = 'gagal dibaca';
      }
    }
    list.replaceChildren(
      ...row('Terpasang di Layar Utama', el('dd', { text: standalone ? 'ya' : 'tidak' })),
      ...row('Koneksi', el('dd', { text: navigator.onLine ? 'online' : 'offline' })),
      ...row('Service Worker', el('dd', { text: worker })),
      ...row('Cache', el('dd', { text: cacheNames })),
    );
  }

  load();
  return card('Status aplikasi',
    list,
    el('div', { class: 'card-actions' },
      el('button', { class: 'btn', type: 'button', text: 'Segarkan status', onClick: load })),
  );
}

function devCard() {
  const stats = el('dl', { class: 'kv' });

  async function loadStats() {
    try {
      const info = await getDbStats();
      stats.replaceChildren(
        ...row('Versi database', el('dd', { text: String(info.version) })),
        ...row('Buku', el('dd', { text: String(info.books) })),
        ...row('File tersimpan', el('dd', { text: String(info.files) })),
        ...row('Progres baca', el('dd', { text: String(info.progress) })),
        ...row('Kategori', el('dd', { text: String(info.categories) })),
      );
    } catch (error) {
      stats.replaceChildren(el('dd', { text: `gagal dibaca: ${error.message}` }));
    }
  }

  async function perform(task, doneMessage) {
    try {
      await task();
      showToast(doneMessage);
    } catch (error) {
      showToast(`Gagal: ${error.message}`, { error: true });
    }
    loadStats();
  }

  loadStats();
  return card('Database (pengujian)',
    stats,
    el('p', { text: 'Untuk menguji penyimpanan. Bagian ini dihapus setelah impor dan hapus buku sungguhan tersedia.' }),
    el('div', { class: 'card-actions' },
      el('button', {
        class: 'btn',
        type: 'button',
        text: 'Isi ulang data contoh',
        onClick: () => perform(resetSampleData, 'Data contoh diisi ulang'),
      }),
      el('button', {
        class: 'btn btn-danger',
        type: 'button',
        text: 'Hapus semua data',
        onClick: () => {
          if (window.confirm('Hapus semua buku dan progres dari database?')) {
            perform(clearAllData, 'Semua data dihapus');
          }
        },
      }),
    ),
  );
}

export function renderSettings(container) {
  container.append(
    el('header', { class: 'appbar' }, el('h1', { text: 'Pengaturan' })),
    themeCard(),
    storageCard(),
    backupCard(),
    pwaCard(),
    devCard(),
    card('Tentang',
      el('p', { text: 'Personal Ebook Library. Tahap saat ini: M3 (database IndexedDB).' })),
  );
}