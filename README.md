# Dashboard Kinerja Harian UP3 Masohi — aplikasi web

Aplikasi web statis (HTML + CSS + JavaScript) yang menampilkan laporan harian kinerja
UP3 Masohi dan ULP-nya, meniru tampilan dashboard Looker Studio. Datanya dibaca
langsung dari Google Sheet oleh browser pengunjung: tidak ada server, database,
maupun Apps Script.

## Struktur

```
index.html              halaman utama (dua tampilan: UP3 MASOHI dan ULP)
assets/css/style.css    gaya tampilan
assets/js/config.js     PENGATURAN: ID sheet, daftar KPI dan tab, auto-refresh
assets/js/data.js       membaca Google Sheet, mengenali format tab, menghitung agregat
assets/js/app.js        kontrol filter, perpindahan halaman, render kartu dan tabel
assets/img/             taruh logo-kiri.png dan logo-kanan.png di sini (opsional)
```

## Deploy ke GitHub Pages (gratis, tanpa server)

**Otomatis (disarankan)** — butuh git dan GitHub CLI (`gh`) yang sudah login:

```bash
./deploy.sh            # atau: ./deploy.sh nama-repo-lain
```
Skrip membuat repo publik, push, mengaktifkan Pages lewat GitHub Actions
(`.github/workflows/deploy-pages.yml`), menunggu deploy, dan mencetak alamat situs.
Setelah itu setiap push ke `main` otomatis memperbarui situs.


**Lewat browser saja**

1. Masuk ke github.com → tombol **+** (kanan atas) → **New repository**. Nama misalnya
   `up3-masohi-dashboard`, pilih **Public**, klik **Create repository**.
2. Di halaman repo baru, klik **uploading an existing file**, seret seluruh isi folder ini
   (`index.html`, folder `assets`, `README.md`, `.nojekyll`), lalu **Commit changes**.
3. Buka **Settings → Pages**. Pada *Build and deployment* pilih **Source: Deploy from a branch**,
   **Branch: main** dan folder **/ (root)**, klik **Save**.
4. Tunggu ±1 menit, muat ulang halaman Settings → Pages: alamat dashboard muncul, berbentuk
   `https://NAMA-AKUN.github.io/up3-masohi-dashboard/`.

**Lewat git (baris perintah)**

```bash
cd up3-masohi-dashboard
git init
git add .
git commit -m "Dashboard kinerja harian UP3 Masohi"
git branch -M main
git remote add origin https://github.com/NAMA-AKUN/up3-masohi-dashboard.git
git push -u origin main
```
Lalu aktifkan Pages seperti langkah 3 di atas.

Setiap perubahan berikutnya (mis. ganti logo, ubah `config.js`) cukup di-commit/upload lagi;
Pages memperbarui situs otomatis dalam ±1 menit.

## Menjalankan secara lokal

1. Google Sheet harus dibagikan **Siapa saja yang memiliki link → Viewer**
   (Bagikan → Akses umum). Proteksi tab tidak berpengaruh pada pembacaan.
2. Buka `index.html` di browser, atau unggah seluruh folder ke hosting statis
   mana pun: GitHub Pages, Netlify, Vercel, Cloudflare Pages, Firebase Hosting,
   atau server web kantor (Apache/Nginx/IIS). Tidak perlu build.
3. Untuk sheet lain, ubah `sheetId` dan daftar `tabs` di `assets/js/config.js`.

## Sumber data per KPI

Tiap KPI punya dua tab kandidat di `config.js`, urut prioritas. Tab input
(P2TL, GANTI METER, …; tanggal melebar ke kanan dengan baris Target/Realisasi
per unit) dibaca lebih dulu; tab `DB …` (format TANGGAL, UIW/UP, TARGET,
REALISASI) dipakai bila tab input tidak terbaca atau kosong. Format tab dikenali
otomatis, dan dashboard memberi keterangan bila sebuah KPI dibaca dari tab cadangan.

## Perhitungan

- Harian / periode: jumlah TARGET dan REALISASI pada rentang tanggal terpilih.
- Komulatif: jumlah dari tanggal 1 bulan tanggal-akhir sampai tanggal akhir.
- Pencapaian: realisasi ÷ target. Untuk gangguan penyulang dihitung terbalik,
  (2 − realisasi ÷ batas) × 100, dibatasi 0–200 %.
- Gap: target − realisasi.
- Tanggal awal saat dibuka: hari terakhir yang realisasinya sudah terisi.

## Catatan

- Google Fonts (Roboto) dimuat dari internet; tanpa internet, font sistem dipakai.
- Pembacaan memakai endpoint `gviz` Google Sheets; kuota wajarnya cukup untuk
  puluhan pengguna sekaligus. Auto-refresh bawaan 5 menit (`autoRefreshMinutes`).
