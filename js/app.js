// Titik masuk aplikasi (M1): status PWA ditampilkan di layar untuk pengujian di iPhone.
const app = document.querySelector('#app');

function addLine(text, isError = false) {
  const line = document.createElement('p');
  line.textContent = text;
  if (isError) line.style.color = 'var(--danger)';
  app.append(line);
  return line;
}

// Error ditampilkan di layar (iPhone tidak punya Console yang bisa dilihat dari Windows)
window.addEventListener('error', (e) => addLine(`Error: ${e.message}`, true));
window.addEventListener('unhandledrejection', (e) => addLine(`Error (promise): ${e.reason}`, true));

const title = document.createElement('h1');
title.textContent = 'Personal Ebook Library';
app.append(title);
addLine('M1: kerangka PWA.');

// Apakah dibuka sebagai aplikasi terpasang (Home Screen)?
const standalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;
addLine(`Dibuka sebagai aplikasi terpasang: ${standalone ? 'ya' : 'tidak'}`);

// Status koneksi (indikasi saja, tidak selalu akurat)
const netLine = addLine('');
function updateNet() {
  netLine.textContent = `Koneksi: ${navigator.onLine ? 'online' : 'offline'}`;
}
updateNet();
window.addEventListener('online', updateNet);
window.addEventListener('offline', updateNet);

// Service Worker
const swLine = addLine('Service Worker: memeriksa...');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      swLine.textContent = 'Service Worker: aktif';
      return caches.keys();
    })
    .then((keys) => addLine(`Cache: ${keys.join(', ') || '(kosong)'}`))
    .catch((err) => {
      swLine.textContent = `Service Worker gagal: ${err.message}`;
      swLine.style.color = 'var(--danger)';
    });
} else {
  swLine.textContent = 'Service Worker: tidak didukung browser ini';
}