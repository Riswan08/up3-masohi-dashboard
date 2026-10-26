# Dashboard Kinerja Harian UP3 Masohi

Situs statis (HTML/CSS/JS murni, tanpa build, tanpa server) yang menampilkan laporan harian
kinerja UP3 Masohi dan ULP-nya. Data dibaca langsung oleh browser dari Google Sheet publik
(endpoint gviz) sesuai `assets/js/config.js`.

## Struktur
- `index.html` — halaman tunggal, dua tampilan (UP3 MASOHI dan ULP)
- `assets/js/config.js` — pengaturan: `sheetId`, daftar KPI dan tab kandidatnya, auto-refresh
- `assets/js/data.js` — baca sheet, kenali format tab (lebar/panjang), agregasi.
  Judul tanggal tab lebar datang dari gviz sebagai angka seri spreadsheet dan dikonversi di sini.
  Semua tab kandidat diambil: data harian dari tab pertama yang terisi (tab input, sejak Feb 2026),
  target komulatif dari kolom F tab DB (TARGET KOMULATIF bulanan per unit, sama untuk semua tanggal
  dalam sebulan; bulan tanpa tab DB memakai jumlah target harian). Target harian/periode dan tabel
  per unit = jumlah target harian.
- `assets/js/app.js` — filter, perpindahan halaman, render, dan fitur "Kirim ke WhatsApp"
  (screenshot satu halaman dengan html2canvas yang dimuat dari CDN hanya saat tombol ditekan;
  teks pesan per halaman ada di konstanta `WA_TEXT`, bisa diedit pengguna di dialog sebelum dikirim)
- `assets/css/style.css` — gaya; `assets/img/` — logo opsional (`logo-kiri.png`, `logo-kanan.png`)
- `.github/workflows/deploy-pages.yml` — deploy otomatis ke GitHub Pages pada setiap push ke `main`
- `deploy.sh` — pembuatan repo + push + aktivasi Pages dalam satu perintah (butuh `gh` yang sudah login)

## Deploy
Jalankan `./deploy.sh [nama-repo]`. Skrip memakai GitHub CLI: membuat repo publik bila belum ada,
push ke `main`, mengatur Pages ke sumber GitHub Actions, menunggu workflow, lalu mencetak URL
`https://<akun>.github.io/<repo>/`. Setelah itu, setiap `git push` ke `main` memperbarui situs.

## Aturan kerja
- Jangan menambahkan proses build, bundler, atau dependensi npm: situs harus tetap bisa dibuka
  langsung dari `index.html`.
- Jangan mengubah nama tab atau rumus di `config.js` tanpa diminta; nama tab mengikuti sheet.
- Sheet harus dibagikan "Siapa saja yang memiliki link → Viewer"; jika dashboard gagal memuat,
  cek itu dulu sebelum mengubah kode.
- Uji lokal cukup dengan `python3 -m http.server 8000` lalu buka `http://localhost:8000/`.
