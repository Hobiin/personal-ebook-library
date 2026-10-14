// Halaman Library dan Favorites, kartu buku, dan bottom sheet detail buku.
import { el, icon, createCover, openSheet, closeSheet, showToast, formatBytes, formatDate, normalizeKey } from './utils.js';
import { getBooks, getCategoryNames, toggleFavorite } from './store.js';

// Disimpan di level modul agar pencarian/filter tetap ada saat pindah tab.
const viewState = { query: '', category: 'all', sort: 'dateAdded' };

const SORTS = [
  ['dateAdded', 'Terbaru ditambahkan'],
  ['lastOpened', 'Terakhir dibaca'],
  ['title', 'Judul A-Z'],
];

function sortBooks(list, sort) {
  const copy = [...list];
  if (sort === 'title') {
    copy.sort((a, b) => a.title.localeCompare(b.title, 'id', { sensitivity: 'base' }));
  } else if (sort === 'lastOpened') {
    copy.sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0));
  } else {
    copy.sort((a, b) => b.dateAdded - a.dateAdded);
  }
  return copy;
}

function matchesQuery(book, query) {
  return normalizeKey(book.title).includes(query) || normalizeKey(book.author).includes(query);
}

function createFab() {
  return el('button', {
    class: 'fab',
    type: 'button',
    'aria-label': 'Tambah ebook',
    onClick: () => showToast('Impor ebook tersedia di Milestone M4'),
  }, icon('plus', 28));
}

function createEmptyState({ iconName, title, text, action }) {
  return el('div', { class: 'empty' },
    icon(iconName, 48),
    el('h2', { text: title }),
    el('p', { text }),
    action,
  );
}

function createBookCard(book, { onOpen, showProgressLabel = false }) {
  const cover = createCover(book);
  if (book.favorite) cover.append(el('span', { class: 'fav-badge' }, icon('heart', 14)));
  if (book.progress > 0) {
    cover.append(el('div', { class: 'cover-progress' },
      el('div', { class: 'cover-progress-fill', style: `width:${book.progress}%` })));
  }
  return el('button', {
    type: 'button',
    class: 'book-card',
    'aria-label': `${book.title}, ${book.author}`,
    onClick: () => onOpen(book),
  },
    cover,
    el('div', { class: 'book-title', text: book.title }),
    el('div', { class: 'book-author', text: book.author }),
    showProgressLabel ? el('div', { class: 'book-progress-label', text: `${book.progress}%` }) : null,
  );
}

function openBookSheet(book, onChange) {
  const favLabel = () => (book.favorite ? 'Hapus dari favorit' : 'Tambah ke favorit');
  const favButton = el('button', {
    class: 'btn',
    type: 'button',
    text: favLabel(),
    onClick: async () => {
      try {
        await toggleFavorite(book.id);
      } catch (error) {
        showToast(`Gagal menyimpan: ${error.message}`, { error: true });
        return;
      }
      favButton.textContent = favLabel();
      onChange();
    },
  });

  const meta = [
    ['Kategori', book.category],
    ['Format', book.format.toUpperCase()],
    ['Ukuran', formatBytes(book.fileSize)],
    ['Ditambahkan', formatDate(book.dateAdded)],
    ['Terakhir dibaca', book.lastOpened ? formatDate(book.lastOpened) : 'Belum pernah'],
    ['Progres', book.progress > 0 ? `${book.progress}%` : '-'],
  ];

  const content = el('div', {},
    el('div', { class: 'detail-head' },
      createCover(book),
      el('div', {},
        el('h2', { class: 'detail-title', text: book.title }),
        el('p', { text: book.author }),
      ),
    ),
    el('dl', { class: 'detail-meta' },
      meta.map(([label, value]) => [el('dt', { text: label }), el('dd', { text: value })]),
    ),
    el('div', { class: 'detail-actions' },
      el('button', {
        class: 'btn btn-primary',
        type: 'button',
        text: book.progress > 0 ? 'Lanjutkan membaca' : 'Baca',
        onClick: () => showToast('Pembaca tersedia di Milestone M6'),
      }),
      favButton,
      el('button', { class: 'btn', type: 'button', text: 'Edit informasi', onClick: () => showToast('Edit metadata tersedia di Milestone M5') }),
      el('button', { class: 'btn btn-danger', type: 'button', text: 'Hapus dari perpustakaan', onClick: () => showToast('Hapus tersedia di Milestone M5') }),
      el('button', { class: 'btn', type: 'button', text: 'Tutup', onClick: closeSheet }),
    ),
  );
  openSheet(content, book.title);
}

export function renderLibrary(container) {
  container.append(el('header', { class: 'appbar' }, el('h1', { text: 'Library' })));

  if (getBooks().length === 0) {
    container.append(createEmptyState({
      iconName: 'library',
      title: 'Perpustakaan Anda masih kosong',
      text: 'Tambahkan ebook PDF atau EPUB dari penyimpanan perangkat.',
      action: el('button', {
        class: 'btn btn-primary',
        type: 'button',
        text: 'Tambah ebook',
        onClick: () => showToast('Impor ebook tersedia di Milestone M4'),
      }),
    }));
    return;
  }

  const chipsEl = el('div', { class: 'chips', role: 'group', 'aria-label': 'Filter kategori' });
  const countEl = el('span', { class: 'count' });
  const continueEl = el('section');
  const gridEl = el('section');

  function renderChips() {
    const all = getBooks();
    const used = getCategoryNames().filter((name) => all.some((book) => book.category === name));
    if (viewState.category !== 'all' && !used.includes(viewState.category)) viewState.category = 'all';
    const items = [['all', 'Semua'], ...used.map((name) => [name, name])];
    chipsEl.replaceChildren(...items.map(([value, label]) => el('button', {
      type: 'button',
      class: 'chip',
      'aria-pressed': String(viewState.category === value),
      onClick: () => {
        viewState.category = value;
        renderChips();
        refresh();
      },
    }, label)));
  }

  function refresh() {
    const all = getBooks();
    const query = normalizeKey(viewState.query);
    const filtered = all.filter((book) =>
      (viewState.category === 'all' || book.category === viewState.category)
      && (!query || matchesQuery(book, query)));
    const list = sortBooks(filtered, viewState.sort);
    countEl.textContent = `${list.length} buku`;

    // Lanjutkan Membaca: hanya data progres nyata, dan hanya saat tidak sedang mencari/memfilter
    const reading = (!query && viewState.category === 'all')
      ? all.filter((book) => book.progress > 0 && book.progress < 100)
        .sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0))
        .slice(0, 10)
      : [];

    continueEl.replaceChildren();
    if (reading.length > 0) {
      continueEl.append(
        el('h2', { class: 'section-title', text: 'Lanjutkan Membaca' }),
        el('div', { class: 'row' },
          reading.map((book) => createBookCard(book, { onOpen: (b) => openBookSheet(b, refresh), showProgressLabel: true }))),
      );
    }

    gridEl.replaceChildren();
    if (list.length === 0) {
      gridEl.append(el('div', { class: 'empty' }, el('p', {
        text: query ? `Tidak ada hasil untuk "${viewState.query.trim()}".` : 'Tidak ada buku di kategori ini.',
      })));
    } else {
      gridEl.append(
        reading.length > 0 ? el('h2', { class: 'section-title', text: 'Semua Buku' }) : null,
        el('div', { class: 'grid' },
          list.map((book) => createBookCard(book, { onOpen: (b) => openBookSheet(b, refresh) }))),
      );
    }
  }

  const searchInput = el('input', {
    type: 'search',
    placeholder: 'Cari judul atau penulis',
    value: viewState.query,
    enterkeyhint: 'search',
    autocomplete: 'off',
    'aria-label': 'Cari ebook',
    onInput: (event) => {
      viewState.query = event.target.value;
      refresh();
    },
  });

  const sortSelect = el('select', {
    class: 'sort',
    'aria-label': 'Urutkan',
    onChange: (event) => {
      viewState.sort = event.target.value;
      refresh();
    },
  }, SORTS.map(([value, label]) => el('option', { value, text: label, selected: viewState.sort === value })));

  container.append(
    el('div', { class: 'controls' },
      el('label', { class: 'searchbar' }, icon('search', 20), searchInput),
      chipsEl,
      el('div', { class: 'toolbar' }, countEl, sortSelect),
    ),
    continueEl,
    gridEl,
    createFab(),
  );

  renderChips();
  refresh();
}

export function renderFavorites(container) {
  const favorites = sortBooks(getBooks().filter((book) => book.favorite), 'title');
  const rerender = () => {
    container.replaceChildren();
    renderFavorites(container);
  };

  container.append(el('header', { class: 'appbar' },
    el('h1', { text: 'Favorit' }),
    el('span', { class: 'count', text: `${favorites.length} buku` }),
  ));

  if (favorites.length === 0) {
    container.append(createEmptyState({
      iconName: 'heart',
      title: 'Belum ada favorit',
      text: 'Buka detail sebuah buku lalu pilih "Tambah ke favorit".',
    }));
    return;
  }

  container.append(el('div', { class: 'grid' },
    favorites.map((book) => createBookCard(book, { onOpen: (b) => openBookSheet(b, rerender) }))));
}