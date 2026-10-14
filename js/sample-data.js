// SEMENTARA: data contoh untuk menguji tampilan dan database. Dihapus di M5.
const DAY = 24 * 60 * 60 * 1000;
const MB = 1024 * 1024;

export function makeSampleData() {
  const now = Date.now();
  const book = (id, title, author, categoryId, format, sizeMb, addedDaysAgo, openedDaysAgo, favorite) => ({
    id,
    title,
    author,
    categoryId,
    format,
    fileSize: Math.round(sizeMb * MB),
    fingerprint: null,
    cover: null,
    dateAdded: now - addedDaysAgo * DAY,
    lastOpened: openedDaysAgo === null ? null : now - openedDaysAgo * DAY,
    favorite,
  });

  const books = [
    book('s1', 'Pemrograman Python untuk Pemula', 'Penulis Contoh A', 'programming', 'pdf', 12.4, 40, 1, 1),
    book('s2', 'Sejarah Nusantara: Dari Kerajaan hingga Republik, Sebuah Tinjauan Panjang', 'Penulis Contoh B', 'history', 'epub', 3.1, 30, 3, 0),
    book('s3', 'Sains Populer Hari Ini', 'Penulis Contoh C', 'science', 'pdf', 48.9, 25, null, 0),
    book('s4', 'Senja di Pelabuhan', 'Penulis Contoh D', 'novel', 'epub', 1.2, 20, 10, 1),
    book('s5', 'Kebiasaan Kecil, Hasil Besar', 'Penulis Contoh E', 'self-improvement', 'epub', 2.4, 15, null, 0),
    book('s6', 'Struktur Data dan Algoritma', 'Penulis Contoh F', 'programming', 'pdf', 21.7, 12, null, 1),
    book('s7', 'Pengantar Basis Data', 'Penulis Contoh G', 'programming', 'pdf', 9.8, 8, null, 0),
    book('s8', 'Catatan Kuliah Jaringan Komputer', 'Penulis Contoh H', 'other', 'pdf', 5.6, 4, null, 0),
    book('s9', 'Kumpulan Cerpen Pilihan', 'Penulis Contoh I', 'novel', 'epub', 0.9, 2, null, 0),
  ];

  const progress = [
    { bookId: 's1', format: 'pdf', position: null, percent: 45, updatedAt: now - 1 * DAY },
    { bookId: 's2', format: 'epub', position: null, percent: 20, updatedAt: now - 3 * DAY },
    { bookId: 's4', format: 'epub', position: null, percent: 80, updatedAt: now - 10 * DAY },
  ];

  return { books, progress };
}