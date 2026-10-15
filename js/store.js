// Lapisan data untuk tampilan: memuat dari IndexedDB ke memori (cache) agar tampilan tetap sinkron.
// Semua perubahan ditulis ke database dulu, baru cache diperbarui.
import * as db from './db.js';
import { makeSampleData } from './sample-data.js';

let books = [];
let categoryNames = [];

async function reload() {
  const [bookRows, progressRows, categoryRows] = await Promise.all([
    db.getAllBooks(),
    db.getAllProgress(),
    db.getAllCategories(),
  ]);
  const names = new Map(categoryRows.map((row) => [row.id, row.name]));
  const percents = new Map(progressRows.map((row) => [row.bookId, row.percent]));

  categoryNames = [...categoryRows].sort((a, b) => a.order - b.order).map((row) => row.name);
  // Bidang `category` (nama) dan `progress` (persen) diturunkan untuk kebutuhan tampilan.
  books = bookRows.map((row) => ({
    ...row,
    category: names.get(row.categoryId) ?? 'Other',
    progress: percents.get(row.id) ?? null,
  }));
}

/** Dipanggil sekali saat aplikasi mulai. Pada pemakaian pertama, mengisi data contoh. */
export async function initStore() {
  await db.openDatabase();
  const seeded = await db.getSetting('sampleSeeded', false);
  if (!seeded) {
    if ((await db.countBooks()) === 0) {
      const sample = makeSampleData();
      await db.saveBooks(sample.books, sample.progress);
    }
    await db.setSetting('sampleSeeded', true);
  }
  await reload();
}

export function getBooks() {
  return books;
}

export function getCategoryNames() {
  return categoryNames;
}

export async function toggleFavorite(id) {
  const book = books.find((item) => item.id === id);
  if (!book) return null;
  const next = book.favorite ? 0 : 1;
  await db.setFavorite(id, next); // simpan dulu; cache hanya diperbarui bila berhasil
  book.favorite = next;
  return book;
}

export async function resetSampleData() {
  await db.clearLibrary();
  const sample = makeSampleData();
  await db.saveBooks(sample.books, sample.progress);
  await db.setSetting('sampleSeeded', true);
  await reload();
}

export async function clearAllData() {
  await db.clearLibrary();
  await db.setSetting('sampleSeeded', true);
  await reload();
}

export function getDbStats() {
  return db.getStats();
}


/** Memuat ulang cache dari database (dipanggil setelah impor). */
export const refreshFromDb = reload;

/** Total ukuran ebook yang benar-benar tersimpan sebagai file (tanpa data contoh). */
export function getImportedBytes() {
  return books.filter((book) => book.hasFile).reduce((sum, book) => sum + (book.fileSize || 0), 0);
}