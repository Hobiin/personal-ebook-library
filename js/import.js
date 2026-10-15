// Alur impor ebook: pilih file, validasi, fingerprint, cek duplikat dan ruang, simpan, verifikasi.
import * as db from './db.js';
import { formatBytes } from './utils.js';

const HEAD_BYTES = 1024;
const TAIL_BYTES = 2048;
const CHUNK = 1024 * 1024;              // bagian awal/akhir file yang di-hash untuk fingerprint
const SPACE_MARGIN = 50 * 1024 * 1024;  // cadangan ruang di luar ukuran file

// Jika di iPhone file EPUB tampak abu-abu dan tidak bisa dipilih, kosongkan nilai ini.
export const ACCEPT = '.pdf,.epub,application/pdf,application/epub+zip';

/**
 * Membuka pemilih file. Harus dipanggil langsung dari penanganan ketukan pengguna
 * (tanpa menunggu apa pun sebelumnya), kalau tidak iOS menolak membukanya.
 */
export function pickFiles() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = ACCEPT;
    input.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      input.remove();
      resolve(files);
    });
    input.addEventListener('cancel', () => {
      input.remove();
      resolve([]);
    });
    document.body.append(input);
    input.click();
  });
}

// ---------- Pemeriksaan file ----------
function extensionOf(name) {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function titleFromFilename(name) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return base.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim() || 'Tanpa judul';
}

async function readBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

function asciiOf(bytes) {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return text;
}

/** Validasi ekstensi dan byte awal. Validasi isi EPUB yang lebih dalam dilakukan di M4b. */
export async function inspectFile(file) {
  if (!file.size) return { ok: false, message: 'File kosong' };

  const extension = extensionOf(file.name);
  if (extension !== 'pdf' && extension !== 'epub') {
    return { ok: false, message: 'Format tidak didukung (hanya PDF dan EPUB)' };
  }

  const head = await readBytes(file.slice(0, HEAD_BYTES));
  if (extension === 'pdf') {
    if (!asciiOf(head).includes('%PDF-')) return { ok: false, message: 'Isi file bukan PDF yang valid' };
    const tail = asciiOf(await readBytes(file.slice(Math.max(0, file.size - TAIL_BYTES))));
    const warning = tail.includes('%%EOF') ? null : 'Akhir file PDF tidak lengkap, kemungkinan terpotong';
    return { ok: true, format: 'pdf', warning };
  }

  const isZip = head[0] === 0x50 && head[1] === 0x4B && head[2] === 0x03 && head[3] === 0x04;
  if (!isZip) return { ok: false, message: 'Isi file bukan EPUB yang valid' };
  return { ok: true, format: 'epub', warning: null };
}

/** Sidik jari ringan: ukuran + SHA-256 dari 1 MB awal dan 1 MB akhir (tanpa membaca seluruh file). */
export async function computeFingerprint(file) {
  const head = await readBytes(file.slice(0, CHUNK));
  const tail = file.size > CHUNK ? await readBytes(file.slice(Math.max(CHUNK, file.size - CHUNK))) : new Uint8Array(0);
  const joined = new Uint8Array(head.length + tail.length);
  joined.set(head, 0);
  joined.set(tail, head.length);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', joined));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${file.size}-${hex}`;
}

async function checkSpace(size) {
  if (!navigator.storage || !navigator.storage.estimate) return { ok: true };
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (!quota) return { ok: true };
    const free = quota - usage;
    const needed = size * 1.2 + SPACE_MARGIN;
    if (free < needed) return { ok: false, free, needed };
  } catch {
    // Perkiraan tidak tersedia: lanjutkan, kegagalan nyata ditangani saat menyimpan.
  }
  return { ok: true };
}

function bytesEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Membaca ulang file dari database dan membandingkannya dengan aslinya. */
async function verifyStored(bookId, source) {
  const stored = await db.getFileBlob(bookId);
  if (!stored || stored.size !== source.size) throw new Error('ukuran file tersimpan berbeda');
  const probe = Math.min(16, source.size);
  const [storedHead, sourceHead, storedTail, sourceTail] = await Promise.all([
    readBytes(stored.slice(0, probe)),
    readBytes(source.slice(0, probe)),
    readBytes(stored.slice(source.size - probe)),
    readBytes(source.slice(source.size - probe)),
  ]);
  if (!bytesEqual(storedHead, sourceHead) || !bytesEqual(storedTail, sourceTail)) {
    throw new Error('isi file tersimpan berbeda');
  }
}

// ---------- Impor ----------
/** Mengimpor satu file. Selalu mengembalikan hasil (tidak melempar galat). */
export async function importOne(file, { allowDuplicate = false } = {}) {
  const base = { name: file.name, size: file.size };
  try {
    const info = await inspectFile(file);
    if (!info.ok) return { ...base, status: 'invalid', message: info.message };

    const fingerprint = await computeFingerprint(file);
    if (!allowDuplicate) {
      const existing = await db.findBookByFingerprint(fingerprint);
      if (existing) return { ...base, status: 'duplicate', message: `Sudah ada di perpustakaan: ${existing.title}` };
    }

    const space = await checkSpace(file.size);
    if (!space.ok) {
      return {
        ...base,
        status: 'error',
        message: `Ruang penyimpanan tidak cukup (tersedia sekitar ${formatBytes(space.free)}, dibutuhkan sekitar ${formatBytes(space.needed)})`,
      };
    }

    const book = {
      id: crypto.randomUUID(),
      title: titleFromFilename(file.name),
      author: '',
      categoryId: 'other',
      format: info.format,
      fileSize: file.size,
      fingerprint,
      cover: null,
      dateAdded: Date.now(),
      lastOpened: null,
      favorite: 0,
      hasFile: true,
      originalName: file.name,
    };

    await db.addBook(book, file);
    try {
      await verifyStored(book.id, file);
    } catch (error) {
      await db.deleteBook(book.id).catch(() => {});
      return { ...base, status: 'error', message: `Verifikasi gagal: ${error.message}` };
    }

    return {
      ...base,
      status: 'ok',
      warning: Boolean(info.warning),
      message: info.warning || 'Berhasil diimpor',
      bookId: book.id,
    };
  } catch (error) {
    if (error && error.name === 'QuotaExceededError') {
      return { ...base, status: 'error', message: 'Penyimpanan penuh. Kosongkan ruang di perangkat atau hapus ebook lain' };
    }
    return { ...base, status: 'error', message: (error && error.message) || 'Terjadi kesalahan yang tidak diketahui' };
  }
}

/** Mengimpor beberapa file satu per satu (hemat memori). */
export async function importFiles(files, onUpdate = () => {}) {
  const results = [];
  for (let index = 0; index < files.length; index += 1) {
    onUpdate(index, { status: 'working', message: 'Memproses...' });
    const result = await importOne(files[index]);
    results.push(result);
    onUpdate(index, result);
  }
  return results;
}