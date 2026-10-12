// Titik masuk aplikasi. Untuk M0 hanya memastikan modul JavaScript berjalan.
const app = document.querySelector('#app');

const title = document.createElement('h1');
title.textContent = 'Personal Ebook Library';

const status = document.createElement('p');
status.textContent = 'M0 berhasil: HTML, CSS, dan JavaScript terhubung.';

app.append(title, status);

console.log('app.js dimuat sebagai ES Module');