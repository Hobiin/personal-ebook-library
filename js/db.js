// Satu-satunya pintu ke IndexedDB. Modul lain tidak boleh memakai indexedDB secara langsung.
import { normalizeKey } from './utils.js';

const DB_NAME = 'ebook-library';
const DB_VERSION = 1;

const DEFAULT_CATEGORIES = [
  ['programming', 'Programming'],
  ['novel', 'Novel'],
  ['self-improvement', 'Self Improvement'],
  ['science', 'Science'],
  ['history', 'History'],
  ['other', 'Other'],
];

// ---------- Pembungkus Promise untuk API IndexedDB ----------
function requestToPromise(request) {
  const promise = new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  // Tandai sudah "ditangani" agar tidak muncul galat ganda bila hasilnya tidak ditunggu
  // (misalnya saat transaksi dibatalkan). Pemanggil yang menunggu tetap menerima galatnya.
  promise.catch(() => {});
  return promise;
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Transaksi database dibatalkan'));
  });
}

// ---------- Skema dan migrasi ----------
// Aturan migrasi: jangan pernah mengubah blok versi lama. Perubahan skema baru
// ditambahkan sebagai blok `if (oldVersion < N)` baru, lalu DB_VERSION dinaikkan.
function migrate(db, oldVersion, transaction) {
  if (oldVersion < 1) {
    const books = db.createObjectStore('books', { keyPath: 'id' });
    books.createIndex('titleKey', 'titleKey');
    books.createIndex('authorKey', 'authorKey');
    books.createIndex('categoryId', 'categoryId');
    books.createIndex('dateAdded', 'dateAdded');
    books.createIndex('lastOpened', 'lastOpened');
    books.createIndex('favorite', 'favorite');
    books.createIndex('fingerprint', 'fingerprint');

    db.createObjectStore('files', { keyPath: 'bookId' });
    db.createObjectStore('progress', { keyPath: 'bookId' });
    db.createObjectStore('categories', { keyPath: 'id' });
    db.createObjectStore('settings', { keyPath: 'key' });

    const categories = transaction.objectStore('categories');
    DEFAULT_CATEGORIES.forEach(([id, name], order) => categories.put({ id, name, order }));
  }
}

// ---------- Koneksi ----------
let dbPromise = null;

export function openDatabase() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB tidak tersedia di browser ini'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => migrate(request.result, event.oldVersion, request.transaction);
      request.onsuccess = () => {
        const db = request.result;
        // Jika tab lain meminta upgrade, lepaskan koneksi agar tidak menghalangi.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

/**
 * Menjalankan satu transaksi. Di dalam `work` hanya boleh menunggu request IndexedDB
 * (jangan menunggu hal lain), kalau tidak transaksi bisa selesai lebih dulu.
 */
async function run(storeNames, mode, work) {
  const db = await openDatabase();
  const transaction = db.transaction(storeNames, mode);
  const done = transactionDone(transaction);
  done.catch(() => {}); // kesalahan tetap dilempar lewat await di bawah
  try {
    const result = await work(transaction);
    await done;
    return result;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // transaksi sudah selesai
    }
    throw error;
  }
}

// ---------- Bentuk data ----------
function toRecord(book) {
  const record = { ...book };
  delete record.category; // diturunkan dari categoryId saat dibaca
  delete record.progress; // disimpan di object store 'progress'
  record.titleKey = normalizeKey(book.title);
  record.authorKey = normalizeKey(book.author);
  record.favorite = book.favorite ? 1 : 0; // boolean tidak bisa menjadi index, jadi 0/1
  return record;
}

// ---------- Baca ----------
export function getAllBooks() {
  return run('books', 'readonly', (tx) => requestToPromise(tx.objectStore('books').getAll()));
}

export function getAllProgress() {
  return run('progress', 'readonly', (tx) => requestToPromise(tx.objectStore('progress').getAll()));
}

export function getAllCategories() {
  return run('categories', 'readonly', (tx) => requestToPromise(tx.objectStore('categories').getAll()));
}

export function countBooks() {
  return run('books', 'readonly', (tx) => requestToPromise(tx.objectStore('books').count()));
}

export async function getStats() {
  const db = await openDatabase();
  const counts = await run(['books', 'files', 'progress', 'categories'], 'readonly', async (tx) => {
    const [books, files, progress, categories] = await Promise.all(
      ['books', 'files', 'progress', 'categories'].map((name) => requestToPromise(tx.objectStore(name).count())),
    );
    return { books, files, progress, categories };
  });
  return { version: db.version, ...counts };
}

// ---------- Tulis ----------
/** Menyimpan banyak buku (dan baris progresnya) dalam satu transaksi: semua berhasil atau tidak sama sekali. */
export function saveBooks(books, progressRows = []) {
  return run(['books', 'progress'], 'readwrite', (tx) => {
    const bookStore = tx.objectStore('books');
    const progressStore = tx.objectStore('progress');
    return Promise.all([
      ...books.map((book) => requestToPromise(bookStore.put(toRecord(book)))),
      ...progressRows.map((row) => requestToPromise(progressStore.put(row))),
    ]);
  });
}

export function setFavorite(id, value) {
  return run('books', 'readwrite', async (tx) => {
    const store = tx.objectStore('books');
    const book = await requestToPromise(store.get(id));
    if (!book) return null;
    book.favorite = value ? 1 : 0;
    await requestToPromise(store.put(book));
    return book;
  });
}

/** Menghapus seluruh buku, file, dan progres (kategori dan pengaturan tetap). */
export function clearLibrary() {
  return run(['books', 'files', 'progress'], 'readwrite', (tx) => Promise.all(
    ['books', 'files', 'progress'].map((name) => requestToPromise(tx.objectStore(name).clear())),
  ));
}

// ---------- Pengaturan ----------
export async function getSetting(key, fallback = null) {
  const record = await run('settings', 'readonly', (tx) => requestToPromise(tx.objectStore('settings').get(key)));
  return record ? record.value : fallback;
}

export function setSetting(key, value) {
  return run('settings', 'readwrite', (tx) => requestToPromise(tx.objectStore('settings').put({ key, value })));
}


// ---------- Impor ebook (M4) ----------
/** Menyimpan buku dan file-nya dalam satu transaksi: keduanya berhasil atau tidak sama sekali. */
export function addBook(book, blob) {
  return run(['books', 'files'], 'readwrite', (tx) => Promise.all([
    requestToPromise(tx.objectStore('books').put(toRecord(book))),
    requestToPromise(tx.objectStore('files').put({
      bookId: book.id,
      blob,
      mime: blob.type || '',
      size: blob.size,
    })),
  ]));
}

export function findBookByFingerprint(fingerprint) {
  return run('books', 'readonly', (tx) => requestToPromise(tx.objectStore('books').index('fingerprint').get(fingerprint)));
}

export async function getFileBlob(bookId) {
  const record = await run('files', 'readonly', (tx) => requestToPromise(tx.objectStore('files').get(bookId)));
  return record ? record.blob : null;
}

/** Menghapus satu buku beserta file dan progresnya. */
export function deleteBook(id) {
  return run(['books', 'files', 'progress'], 'readwrite', (tx) => Promise.all(
    ['books', 'files', 'progress'].map((name) => requestToPromise(tx.objectStore(name).delete(id))),
  ));
}