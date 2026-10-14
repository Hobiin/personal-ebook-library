// SEMENTARA (M2): data contoh di memori. Di M3 file ini digantikan oleh db.js (IndexedDB).
// Bentuk datanya sengaja sama dengan rancangan skema: favorite = 0/1, progress = persen atau null.

export const CATEGORIES = ['Programming', 'Novel', 'Self Improvement', 'Science', 'History', 'Other'];

const DAY = 24 * 60 * 60 * 1000;
const MB = 1024 * 1024;
const now = Date.now();

function makeSample() {
  return [
    { id: 's1', title: 'Pemrograman Python untuk Pemula', author: 'Penulis Contoh A', category: 'Programming', format: 'pdf', fileSize: 12.4 * MB, dateAdded: now - 40 * DAY, lastOpened: now - 1 * DAY, progress: 45, favorite: 1 },
    { id: 's2', title: 'Sejarah Nusantara: Dari Kerajaan hingga Republik, Sebuah Tinjauan Panjang', author: 'Penulis Contoh B', category: 'History', format: 'epub', fileSize: 3.1 * MB, dateAdded: now - 30 * DAY, lastOpened: now - 3 * DAY, progress: 20, favorite: 0 },
    { id: 's3', title: 'Sains Populer Hari Ini', author: 'Penulis Contoh C', category: 'Science', format: 'pdf', fileSize: 48.9 * MB, dateAdded: now - 25 * DAY, lastOpened: null, progress: null, favorite: 0 },
    { id: 's4', title: 'Senja di Pelabuhan', author: 'Penulis Contoh D', category: 'Novel', format: 'epub', fileSize: 1.2 * MB, dateAdded: now - 20 * DAY, lastOpened: now - 10 * DAY, progress: 80, favorite: 1 },
    { id: 's5', title: 'Kebiasaan Kecil, Hasil Besar', author: 'Penulis Contoh E', category: 'Self Improvement', format: 'epub', fileSize: 2.4 * MB, dateAdded: now - 15 * DAY, lastOpened: null, progress: null, favorite: 0 },
    { id: 's6', title: 'Struktur Data dan Algoritma', author: 'Penulis Contoh F', category: 'Programming', format: 'pdf', fileSize: 21.7 * MB, dateAdded: now - 12 * DAY, lastOpened: null, progress: null, favorite: 1 },
    { id: 's7', title: 'Pengantar Basis Data', author: 'Penulis Contoh G', category: 'Programming', format: 'pdf', fileSize: 9.8 * MB, dateAdded: now - 8 * DAY, lastOpened: null, progress: null, favorite: 0 },
    { id: 's8', title: 'Catatan Kuliah Jaringan Komputer', author: 'Penulis Contoh H', category: 'Other', format: 'pdf', fileSize: 5.6 * MB, dateAdded: now - 4 * DAY, lastOpened: null, progress: null, favorite: 0 },
    { id: 's9', title: 'Kumpulan Cerpen Pilihan', author: 'Penulis Contoh I', category: 'Novel', format: 'epub', fileSize: 0.9 * MB, dateAdded: now - 2 * DAY, lastOpened: null, progress: null, favorite: 0 },
  ];
}

let books = makeSample();
let sampleEnabled = true;

export function getBooks() {
  return books;
}

export function hasSampleData() {
  return sampleEnabled;
}

export function setSampleData(enabled) {
  sampleEnabled = enabled;
  books = enabled ? makeSample() : [];
}

export function toggleFavorite(id) {
  const book = books.find((item) => item.id === id);
  if (book) book.favorite = book.favorite ? 0 : 1;
  return book;
}