// Tampilan proses impor: lembar (sheet) berisi status tiap file.
import { el, openSheet, closeSheet, showToast } from './utils.js';
import { pickFiles, importFiles, importOne } from './import.js';
import { refreshFromDb } from './store.js';

let importing = false;

function paint(item, result) {
  const tone = result.status === 'ok' ? (result.warning ? 'warn' : 'ok')
    : result.status === 'duplicate' ? 'warn'
      : result.status === 'working' ? 'busy'
        : 'error';
  item.status.className = `import-status ${tone}`;
  item.status.textContent = result.message;
}

function addForceButton(item, onFinished) {
  const button = el('button', {
    class: 'btn',
    type: 'button',
    text: 'Impor tetap',
    onClick: async () => {
      button.disabled = true;
      paint(item, { status: 'working', message: 'Memproses...' });
      const result = await importOne(item.file, { allowDuplicate: true });
      paint(item, result);
      if (result.status === 'ok') {
        button.remove();
        await finish(onFinished);
      } else {
        button.disabled = false;
      }
    },
  });
  item.row.append(button);
}

async function finish(onFinished) {
  try {
    await refreshFromDb();
    onFinished();
  } catch (error) {
    showToast(`Gagal memuat ulang data: ${error.message}`, { error: true });
  }
}

/** Dipanggil dari penanganan ketukan (tombol +). `onFinished` menyegarkan tampilan Library. */
export async function startImport(onFinished) {
  if (importing) {
    showToast('Impor sedang berjalan');
    return;
  }
  const files = await pickFiles(); // dipanggil sinkron agar iOS mengizinkan pemilih file
  if (files.length === 0) return;

  importing = true;
  const items = files.map((file) => {
    const status = el('span', { class: 'import-status busy', text: 'Menunggu' });
    const row = el('li', { class: 'import-item' },
      el('div', { class: 'import-name', text: file.name }),
      status,
    );
    return { file, row, status };
  });
  const summary = el('p', { text: `Memproses ${files.length} file...` });

  openSheet(el('div', {},
    el('h2', { class: 'detail-title', text: 'Impor ebook' }),
    summary,
    el('ul', { class: 'import-list' }, items.map((item) => item.row)),
    el('div', { class: 'detail-actions' },
      el('button', { class: 'btn btn-primary', type: 'button', text: 'Selesai', onClick: closeSheet })),
  ), 'Impor ebook');

  try {
    const results = await importFiles(files, (index, result) => paint(items[index], result));
    results.forEach((result, index) => {
      if (result.status === 'duplicate') addForceButton(items[index], onFinished);
    });
    const succeeded = results.filter((result) => result.status === 'ok').length;
    summary.textContent = `${succeeded} dari ${results.length} file berhasil diimpor.`;
  } finally {
    importing = false;
  }
  await finish(onFinished);
}