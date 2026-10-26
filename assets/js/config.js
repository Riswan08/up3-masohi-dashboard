// =====================================================================
//  Pengaturan aplikasi — satu-satunya file yang perlu diubah.
// =====================================================================
window.DASH_CONFIG = {
  // ID Google Sheet (bagian di antara /d/ dan /edit pada alamat sheet).
  // Sheet harus dibagikan: "Siapa saja yang memiliki link" → Viewer.
  sheetId: '1izDGlhPCtGAFR7JBkXXk59XWvxA4ejgO8H8-dWecmys',

  // Nama unit induk (ditampilkan di judul dan dipakai untuk pintasan "Hanya UP3")
  up3Name: 'UP3 MASOHI',

  // Muat ulang otomatis setiap n menit (0 = mati)
  autoRefreshMinutes: 5,

  // Posisi kolom pada tab berformat panjang (DB ...): 0 = A, 1 = B, ...
  columns: { date: 0, unit: 1, target: 2, real: 3 },

  // Tiap KPI: daftar tab kandidat, urut prioritas. Tab pertama yang terbaca dan berisi data yang dipakai.
  // Tab input (format lebar: tanggal ke samping, baris Target/Realisasi per unit) ditaruh lebih dulu
  // karena itulah tab yang tidak terkunci; tab DB (format panjang) hanya cadangan.
  // kind: 'target' = realisasi dibanding target; 'limit' = realisasi adalah batas yang tidak boleh dilampaui.
  kpis: [
    { key: 'p2tl',      tabs: ['P2TL', 'DB P2TL'],                                         label: 'Perolehan kWh P2TL di AP2T',     unit: 'kWh',  kind: 'target', decimals: 0, icon: 'bolt' },
    { key: 'meter',     tabs: ['GANTI METER', 'DB GANTI METER'],                           label: 'Penggantian kWh meter tua/rusak', unit: 'plg',  kind: 'target', decimals: 0, icon: 'meter' },
    { key: 'permanen',  tabs: ['GANGGUAN PENYULANG PERMANEN', 'DB GGN PENYULANG PERMNEN'], label: 'Gangguan penyulang permanen',    unit: 'kali', kind: 'limit',  decimals: 0, icon: 'towerP' },
    { key: 'temporer',  tabs: ['GANGGUAN PENYULANG TEMPORER', 'DB GGN PENYULANG TEMPORER'], label: 'Gangguan penyulang temporer',   unit: 'kali', kind: 'limit',  decimals: 0, icon: 'towerT' },
    { key: 'pelanggan', tabs: ['Delta Pelanggan', 'DB DELTA PELANGGAN'],                   label: 'Penambahan jumlah pelanggan',    unit: 'plg',  kind: 'target', decimals: 1, icon: 'people' },
    { key: 'daya',      tabs: ['Delta Daya', 'DB DELTA DAYA'],                             label: 'Penambahan daya tersambung',     unit: 'kVA',  kind: 'target', decimals: 2, icon: 'plug' }
  ]
};
