# Prompt untuk Claude Code

Buka Claude Code di folder hasil ekstrak `up3-masohi-dashboard`, lalu tempel pesan ini:

---

Proyek di folder ini adalah dashboard statis (baca CLAUDE.md dulu). Tolong deploy ke GitHub Pages
dengan deploy otomatis:

1. Pastikan `git` dan GitHub CLI `gh` terpasang; kalau `gh` belum ada, pasangkan (macOS: `brew install gh`,
   Windows: `winget install GitHub.cli`, Ubuntu: `sudo apt install gh`). Lalu `gh auth status`;
   kalau belum login jalankan `gh auth login` dan beri tahu saya kalau perlu saya menyelesaikan
   login di browser.
2. Jalankan `./deploy.sh up3-masohi-dashboard`. Kalau nama repo sudah dipakai, pakai nama lain dan
   beri tahu saya.
3. Setelah workflow selesai, cek `curl -sI <URL>` mengembalikan 200, lalu laporkan URL dashboard-nya.
4. Jika ada yang gagal (misalnya Pages belum aktif), perbaiki lewat `gh api` atau beri tahu saya langkah
   manual di Settings → Pages. Jangan menambah build tool atau mengubah isi `assets/js/config.js`.

---
