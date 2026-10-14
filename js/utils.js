// Helper kecil yang dipakai di banyak tempat: pembuat elemen, ikon, sampul, toast, sheet.

/** Membuat elemen DOM dengan aman (selalu lewat textContent, tanpa innerHTML). */
export function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) node.setAttribute(key, '');
      else node.setAttribute(key, value);
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }
  
  // ---------- Ikon (garis sederhana, gaya Lucide, lisensi ISC) ----------
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    library: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20',
    heart: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
    settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    plus: 'M12 5v14M5 12h14',
    search: 'M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  };
  
  export function icon(name, size = 24) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', ICONS[name] || '');
    svg.append(path);
    return svg;
  }
  
  // ---------- Sampul buku ----------
  const COVER_COLORS = ['#2F6B5E', '#8A5A44', '#4A5D7A', '#7A4E6B', '#6B6F3A', '#9A6B2F'];
  
  function coverColor(title) {
    let hash = 0;
    for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return COVER_COLORS[hash % COVER_COLORS.length];
  }
  
  /** Sampul tipografi (dipakai selama belum ada cover asli dari ebook). */
  export function createCover(book) {
    return el('div', { class: 'cover', style: `--cover:${coverColor(book.title)}`, 'aria-hidden': 'true' },
      el('span', { class: 'cover-title', text: book.title }),
      el('span', { class: 'cover-author', text: book.author }),
    );
  }
  
  // ---------- Format ----------
  export function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i += 1;
    }
    return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
  }
  
  export function formatDate(timestamp) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(timestamp);
  }

  /** Teks pembanding untuk pencarian: huruf kecil, tanpa aksen, tanpa spasi tepi. */
export function normalizeKey(text) {
  return String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
  
  // ---------- Toast ----------
  let toastTimer;
  
  export function showToast(message, { error = false } = {}) {
    let toast = document.querySelector('#toast');
    if (!toast) {
      toast = el('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.toggle('error', error);
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), error ? 6000 : 2500);
  }
  
  // ---------- Bottom sheet ----------
  let activeSheet = null;
  
  export function openSheet(content, label = 'Detail') {
    closeSheet();
    const backdrop = el('div', { class: 'sheet-backdrop', onClick: closeSheet });
    const sheet = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': label, tabindex: '-1' },
      el('div', { class: 'sheet-handle' }),
      content,
    );
    document.body.append(backdrop, sheet);
    document.body.classList.add('sheet-open');
  
    const onKey = (event) => {
      if (event.key === 'Escape') closeSheet();
    };
    document.addEventListener('keydown', onKey);
    activeSheet = { backdrop, sheet, onKey, previousFocus: document.activeElement };
  
    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      sheet.classList.add('open');
      sheet.focus({ preventScroll: true });
    });
  }
  
  export function closeSheet() {
    if (!activeSheet) return;
    const { backdrop, sheet, onKey, previousFocus } = activeSheet;
    activeSheet = null;
    document.removeEventListener('keydown', onKey);
    document.body.classList.remove('sheet-open');
    backdrop.classList.remove('open');
    sheet.classList.remove('open');
    setTimeout(() => {
      backdrop.remove();
      sheet.remove();
    }, 250);
    if (previousFocus && previousFocus.focus) previousFocus.focus({ preventScroll: true });
  }