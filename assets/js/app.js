// Lapisan tampilan: dua halaman (UP3 dan ULP), kontrol filter, dan render kartu/tabel.
(function () {
  'use strict';
  var C = window.DashCore, CONFIG = C.CONFIG;
  var $ = function (id) { return document.getElementById(id); };

  var ICONS = {
    bolt: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#4fb3d9"/><path d="M13 30l7-7 5 5 10-11" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="10" y="33" width="28" height="8" rx="2" fill="#1f3a5f"/><text x="24" y="39.5" font-size="7" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial">KWH</text></svg>',
    meter: '<svg viewBox="0 0 48 48"><rect x="10" y="4" width="28" height="40" rx="4" fill="#9fd2f3" stroke="#1f3a5f" stroke-width="2"/><rect x="14" y="8" width="20" height="12" rx="2" fill="#f2c94c" stroke="#1f3a5f" stroke-width="1.5"/><path d="M24 10l-2 4h3l-2 4" fill="none" stroke="#1f3a5f" stroke-width="1.5"/><g fill="#1f3a5f"><circle cx="17" cy="26" r="1.5"/><circle cx="21" cy="26" r="1.5"/><circle cx="25" cy="26" r="1.5"/><circle cx="29" cy="26" r="1.5"/><circle cx="17" cy="31" r="1.5"/><circle cx="21" cy="31" r="1.5"/><circle cx="25" cy="31" r="1.5"/><circle cx="29" cy="31" r="1.5"/></g><rect x="14" y="36" width="8" height="4" rx="1" fill="#e94b3c"/></svg>',
    towerP: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#fff" stroke="#222" stroke-width="2"/><path d="M24 8v32M15 14h18M12 20h24M18 40l6-16 6 16" fill="none" stroke="#222" stroke-width="2.2" stroke-linecap="round"/><text x="33" y="38" font-size="10" font-weight="700" fill="#222" font-family="Arial">P</text></svg>',
    towerT: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#fff" stroke="#222" stroke-width="2"/><path d="M24 8v32M15 14h18M12 20h24M18 40l6-16 6 16" fill="none" stroke="#222" stroke-width="2.2" stroke-linecap="round"/><text x="33" y="38" font-size="10" font-weight="700" fill="#222" font-family="Arial">T</text></svg>',
    people: '<svg viewBox="0 0 48 48"><circle cx="24" cy="22" r="20" fill="#4a90e2"/><path d="M24 2a20 20 0 0 1 20 20H24z" fill="#1f3a5f"/><path d="M24 22l14-14a20 20 0 0 1 6 14z" fill="#9fc5f0"/><circle cx="17" cy="36" r="5" fill="#f7c59f"/><circle cx="30" cy="36" r="5" fill="#f7c59f"/><path d="M9 46a8 8 0 0 1 16 0zM22 46a8 8 0 0 1 16 0z" fill="#e94b3c"/></svg>',
    plug: '<svg viewBox="0 0 48 48"><path d="M4 22h6M4 26h8M4 30h6" stroke="#1f3a5f" stroke-width="2" stroke-linecap="round"/><rect x="14" y="14" width="26" height="20" rx="4" fill="#5ab7e2" stroke="#1f3a5f" stroke-width="2"/><rect x="40" y="20" width="4" height="8" rx="1" fill="#1f3a5f"/><path d="M28 12l-7 11h6l-3 12 9-13h-6z" fill="#e94b3c" stroke="#1f3a5f" stroke-width="1"/></svg>'
  };
  var SHEET_ICON = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M6 2h8l5 5v15H6z" fill="#1e8e3e"/><path d="M14 2v5h5" fill="#5fcf80"/><rect x="8" y="10" width="8" height="7" fill="#fff"/><path d="M8 13.5h8M12 10v7" stroke="#1e8e3e" stroke-width="1"/></svg>';

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function fmtDate(iso) { if (!iso) return '—'; var p = iso.split('-'); return (+p[2]) + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0]; }
  function fmtNum(n, dec) { if (n === null || n === undefined || !isFinite(n)) return '—'; return new Intl.NumberFormat('id-ID', { maximumFractionDigits: dec }).format(n); }
  function fmtPct(p, dec, suffix) { if (p === null || p === undefined || !isFinite(p)) return '—'; return new Intl.NumberFormat('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(p) + (suffix === false ? '' : '%'); }
  function cls(p) { return p === null ? 'none' : (p >= 100 ? 'good' : 'bad'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  function lastDayOfMonth(iso) { var d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7), 0)); return d.toISOString().slice(0, 10); }
  function barHtml(p) {
    if (p === null) return '<div class="bar"><div class="fill"></div></div>';
    var tick = p > 100 ? '<div class="tick" style="left:' + (100 / p * 100).toFixed(1) + '%"></div>' : '';
    return '<div class="bar"><div class="fill ' + cls(p) + '" style="width:' + Math.min(100, p).toFixed(1) + '%"></div>' + tick + '</div>';
  }

  // ---------- State: dua halaman dengan filter masing-masing ----------
  var state = {
    data: null, units: [], bounds: null, latest: null, loadedAt: null, page: 'up3',
    f: { up3: { sel: {}, d1: null, d2: null }, ulp: { sel: {}, d1: null, d2: null } }
  };

  function setStatus(html) { $('status').innerHTML = html; }
  function showNotice(html, isError) { var n = $('notice'); n.innerHTML = html; n.hidden = false; n.classList.toggle('error', !!isError); }

  function load() {
    $('reload').disabled = true;
    $('notice').hidden = true;
    document.body.classList.add('loading');
    setStatus('Mengambil data dari Google Sheet…');
    C.fetchAll().then(function (res) {
      document.body.classList.remove('loading');
      $('reload').disabled = false;
      if (Object.keys(res.data).length === 0) {
        showNotice('<h2>Data tidak bisa diambil dari Google Sheet</h2>' +
          '<p>Pesan: <code>' + esc(res.failed[0].error) + '</code></p>' +
          '<p>Periksa: (1) sheet dibagikan sebagai <em>Siapa saja yang memiliki link → Viewer</em>; ' +
          '(2) <code>sheetId</code> di <code>assets/js/config.js</code> benar; (3) nama tab di sheet masih sama dengan daftar <code>tabs</code> di config.</p>', true);
        setStatus('Gagal memuat'); return;
      }
      var notes = [];
      if (res.failed.length) notes.push('<h2>Sebagian KPI gagal dimuat</h2><p>' + res.failed.map(function (f) { return '<code>' + esc(f.tab) + '</code>: ' + esc(f.error); }).join('<br>') + '</p>');
      if (notes.length) showNotice(notes.join(''), res.failed.length > 0);
      applyData(res.data);
    }).catch(function (err) {
      document.body.classList.remove('loading');
      $('reload').disabled = false;
      showNotice('<h2>Data tidak bisa diambil</h2><p><code>' + esc(err && err.message || String(err)) + '</code></p>', true);
      setStatus('Gagal memuat');
    });
  }

  function applyData(data) {
    state.data = data;
    state.units = C.unitsOrdered(data);
    state.bounds = C.dateBounds(data);
    state.latest = C.latestFilledDate(data) || state.bounds.max;
    state.loadedAt = new Date();
    var ulps = state.units.filter(function (u) { return u !== CONFIG.up3Name; });
    if (!state.f.up3.d1) { // halaman UP3: unit UP3 saja, satu hari terakhir
      state.units.forEach(function (u) { state.f.up3.sel[u] = u === CONFIG.up3Name; });
      if (!state.f.up3.sel[CONFIG.up3Name]) state.f.up3.sel[state.units[0]] = true;
      state.f.up3.d1 = state.f.up3.d2 = state.latest;
    }
    if (!state.f.ulp.d1) { // halaman ULP: semua ULP, bulan penuh
      state.units.forEach(function (u) { state.f.ulp.sel[u] = u !== CONFIG.up3Name; });
      if (!ulps.length) state.units.forEach(function (u) { state.f.ulp.sel[u] = true; });
      state.f.ulp.d1 = C.monthStart(state.latest); state.f.ulp.d2 = lastDayOfMonth(state.latest);
    }
    $('src-link').href = C.sheetUrl();
    render();
  }

  // ---------- Kontrol bergaya Looker ----------
  function filt() { return state.f[state.page]; }
  function selected() { return state.units.filter(function (u) { return filt().sel[u]; }); }
  function unitControlLabel() {
    var s = selected(), f = filt();
    var ulps = state.units.filter(function (u) { return u !== CONFIG.up3Name; });
    var excludeUp3 = state.units.length > 1 && s.length === ulps.length && s.every(function (u) { return u !== CONFIG.up3Name; });
    if (state.page === 'ulp' && excludeUp3) return 'Kecualikan ' + CONFIG.up3Name + ' (1)';
    if (s.length === state.units.length) return 'Semua (' + s.length + ')';
    return s.join(', ') + ' (' + s.length + ')';
  }
  function buildUnitPop() {
    var f = filt();
    $('unit-list').innerHTML = state.units.map(function (u) {
      return '<label><input type="checkbox" value="' + esc(u) + '"' + (f.sel[u] ? ' checked' : '') + '><span>' + esc(u) + '</span></label>';
    }).join('');
    $('unit-list').querySelectorAll('input').forEach(function (cb) {
      cb.addEventListener('change', function () {
        f.sel[cb.value] = cb.checked;
        if (!selected().length) { f.sel[cb.value] = true; cb.checked = true; }
        render();
      });
    });
  }
  function togglePop(id, btn) {
    var pop = $(id), open = pop.hidden;
    closePops();
    if (open) { pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
  }
  function closePops() {
    ['unit-pop', 'date-pop'].forEach(function (id) { $(id).hidden = true; });
    ['unit-btn', 'date-btn'].forEach(function (id) { $(id).setAttribute('aria-expanded', 'false'); });
  }
  $('unit-btn').addEventListener('click', function (e) { e.stopPropagation(); buildUnitPop(); togglePop('unit-pop', this); });
  $('date-btn').addEventListener('click', function (e) { e.stopPropagation(); $('d1').value = filt().d1; $('d2').value = filt().d2; togglePop('date-pop', this); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.ctl')) closePops(); });
  document.querySelectorAll('[data-quick]').forEach(function (b) {
    b.addEventListener('click', function () {
      var q = b.getAttribute('data-quick'), f = filt();
      state.units.forEach(function (u) { f.sel[u] = q === 'all' ? true : q === 'up3' ? u === CONFIG.up3Name : u !== CONFIG.up3Name; });
      if (!selected().length) state.units.forEach(function (u) { f.sel[u] = true; });
      buildUnitPop(); render();
    });
  });
  function applyDates() {
    var a = $('d1').value, b = $('d2').value, f = filt();
    if (!a || !b) return;
    if (a > b) { var t = a; a = b; b = t; }
    f.d1 = a; f.d2 = b; render();
  }
  $('d1').addEventListener('change', applyDates);
  $('d2').addEventListener('change', applyDates);
  document.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = b.getAttribute('data-preset'), base = state.latest, f = filt();
      if (!base) return;
      if (p === 'latest') { f.d1 = f.d2 = base; }
      else if (p === 'mtd') { f.d1 = C.monthStart(base); f.d2 = base; }
      else { f.d1 = C.monthStart(base); f.d2 = lastDayOfMonth(base); }
      $('d1').value = f.d1; $('d2').value = f.d2; render();
    });
  });
  $('reload').addEventListener('click', load);
  document.querySelectorAll('[data-page]').forEach(function (b) {
    b.addEventListener('click', function () { state.page = b.getAttribute('data-page'); closePops(); render(); });
  });

  // ---------- Render ----------
  function render() {
    if (!state.data) return;
    var page = state.page, f = filt(), sel = selected(), selMap = {};
    sel.forEach(function (u) { selMap[u] = true; });
    document.body.setAttribute('data-page', page);
    document.querySelectorAll('[data-page]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-page') === page)); });
    $('title').textContent = page === 'up3' ? 'LAPORAN HARIAN KINERJA ' + CONFIG.up3Name : 'LAPORAN HARIAN KINERJA ULP';
    $('unit-prefix').textContent = page === 'up3' ? 'UP3/ULP: ' : 'ULP: ';
    $('unit-val').textContent = unitControlLabel();
    $('date-val').textContent = fmtDate(f.d1) + ' - ' + fmtDate(f.d2);
    $('d1').min = $('d2').min = state.bounds.min; $('d1').max = $('d2').max = state.bounds.max;
    var when = state.loadedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setStatus('Data terakhir diperbarui ' + when + ' · realisasi terisi s/d ' + fmtDate(state.latest) + (window.DASH_SNAPSHOT ? ' · PRATINJAU: data salinan, bukan langsung dari sheet' : ' · sumber: Google Sheet'));

    var single = f.d1 === f.d2;
    var kpiHtml = '', tblHtml = '';
    CONFIG.kpis.forEach(function (k) {
      var rows = state.data[k.key];
      if (!rows) return;
      var s = C.summarize(k, rows, selMap, f.d1, f.d2);
      var label = (k.label + ' (' + k.unit + ')').toUpperCase();
      if (page === 'up3') {
        kpiHtml +=
          '<div class="krow">' +
            '<div class="kicon">' + ICONS[k.icon] + '</div>' +
            card('TARGET HARIAN', fmtNum(s.period.t, k.decimals)) +
            card('REALISASI HARIAN', fmtNum(s.period.r, k.decimals)) +
            pcard('PENCAPAIAN HARIAN', s.period.pct) +
            card('TARGET KOMULATIF', fmtNum(s.cum.t, k.decimals)) +
            card('REALISASI KOMULATIF', fmtNum(s.cum.r, k.decimals)) +
            card('GAP KOMULATIF', fmtNum(s.cum.gap, k.decimals)) +
            pcard('REALISASI (%)', s.cum.pct) +
            '<div class="klabel">' + esc(label) + '</div>' +
          '</div>';
        tblHtml +=
          '<div class="tbl"><h3>' + esc(label) + '</h3><div class="scroll"><table>' +
          '<thead><tr><th class="n"></th><th class="l">UIW/UP</th><th>TARGET <span class="sort">▾</span></th><th>REALISASI</th><th>PENCAPAIAN</th></tr></thead><tbody>' +
          s.perUnit.map(function (p, i) {
            return '<tr><td class="n">' + (i + 1) + '.</td><td class="l">' + esc(p.unit) + '</td><td>' + fmtNum(p.t, k.decimals) + '</td><td>' + fmtNum(p.r, k.decimals) + '</td><td>' + fmtPct(p.pct, 2) + '</td></tr>';
          }).join('') + '</tbody></table></div></div>';
      } else {
        kpiHtml +=
          '<div class="kblock">' +
            '<div class="kicon">' + ICONS[k.icon] + '</div>' +
            card('TARGET', fmtNum(s.period.t, k.decimals)) +
            card('REALISASI', fmtNum(s.period.r, k.decimals)) +
            pcard('KOMULATIF', s.period.pct) +
            '<div class="klabel">' + esc(label) + '</div>' +
          '</div>';
        tblHtml +=
          '<div class="tbl"><h3>' + esc(label) + '</h3><div class="scroll"><table class="ulp">' +
          '<thead><tr><th class="n"></th><th class="l">UIW/UP</th><th>TARGET <span class="sort">▾</span></th><th>REALISASI</th><th>GAP</th><th>PENCAPAIAN (%)</th></tr></thead><tbody>' +
          s.perUnit.map(function (p, i) {
            return '<tr><td class="n">' + (i + 1) + '.</td><td class="l">' + esc(p.unit) + '</td><td>' + fmtNum(p.t, k.decimals) + '</td><td>' + fmtNum(p.r, k.decimals) + '</td><td>' + fmtNum(p.gap, k.decimals) + '</td><td class="pc ' + cls(p.pct) + '">' + fmtPct(p.pct, 2, false) + '</td></tr>';
          }).join('') + '</tbody></table></div></div>';
      }
    });
    $('kpi').innerHTML = kpiHtml;
    $('tables').innerHTML = tblHtml;
  }
  function card(label, value) { return '<div class="card"><div class="lbl">' + label + '</div><div class="val">' + value + '</div></div>'; }
  function pcard(label, p) { return '<div class="card pct"><div class="lbl">' + label + '</div><div class="pv ' + cls(p) + '">' + fmtPct(p, 1) + '</div>' + barHtml(p) + '</div>'; }

  // ---------- Kirim ke WhatsApp: screenshot satu halaman + teks laporan ----------
  // Screenshot dibuat di browser dengan html2canvas (dimuat dari CDN hanya saat tombol ditekan).
  var H2C_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  var MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  // Teks pesan per halaman; {tanggal} diganti tanggal laporan. Bisa diubah di dialog sebelum dikirim.
  // "UP3 MASOHI" -> "UP3 Masohi" untuk teks pesan.
  var UNIT_NAME = CONFIG.up3Name.replace(/\b\w+/g, function (w) { return w === 'UP3' ? w : w.charAt(0) + w.slice(1).toLowerCase(); });
  var WA_TEXT = {
    up3: 'Semangat Pagi\nYth. Bapak GM UIW MMU\nYth. Bapak dan Ibu SRM\nBerikut kami laporkan kinerja harian Distribusi, ' + UNIT_NAME + ' tgl {tanggal}.\uD83D\uDE4F',
    ulp: 'Berikut kami laporkan kinerja harian Distribusi, ' + UNIT_NAME + ' dan Unit Layanan tgl {tanggal}.\nDemikian terimakasih'
  };
  function fmtDateFull(iso) { var p = iso.split('-'); return (+p[2]) + ' ' + MONTHS_FULL[+p[1] - 1] + ' ' + p[0]; }
  function reportDate() { // tanggal laporan: hari yang dipilih, atau hari terakhir terisi di dalam rentang
    var f = filt();
    if (f.d1 === f.d2) return f.d2;
    return (state.latest && state.latest >= f.d1 && state.latest <= f.d2) ? state.latest : f.d2;
  }
  function waMessage() { return WA_TEXT[state.page].replace('{tanggal}', fmtDateFull(reportDate())); }
  function waFileName() { return 'laporan-kinerja-' + (state.page === 'up3' ? CONFIG.up3Name.toLowerCase().replace(/\s+/g, '-') : 'ulp') + '-' + reportDate() + '.png'; }

  var h2cPromise = null;
  function loadHtml2canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (!h2cPromise) h2cPromise = new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = H2C_URL; sc.async = true;
      sc.onload = function () { resolve(window.html2canvas); };
      sc.onerror = function () { h2cPromise = null; reject(new Error('Pustaka screenshot tidak bisa dimuat (periksa koneksi internet)')); };
      document.head.appendChild(sc);
    });
    return h2cPromise;
  }
  function capturePage() {
    closePops();
    document.body.classList.add('capturing');
    var target = document.querySelector('.page');
    return loadHtml2canvas().then(function (h2c) {
      return h2c(target, {
        scale: Math.max(2, window.devicePixelRatio || 1), useCORS: true, logging: false,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        ignoreElements: function (el) { return el.matches && el.matches('.pages, .board-foot, .notice, dialog'); }
      });
    }).then(function (canvas) {
      document.body.classList.remove('capturing');
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error('Gagal membuat gambar')); }, 'image/png');
      });
    }, function (err) { document.body.classList.remove('capturing'); throw err; });
  }

  var share = { blob: null, url: null };
  var dlg = $('share-dlg');
  function shareStatus(msg, isErr) { var el = $('share-status'); el.textContent = msg || ''; el.style.color = isErr ? 'var(--bad)' : ''; }
  function shareFile() { return new File([share.blob], waFileName(), { type: 'image/png' }); }
  function canNativeShare() {
    try { return !!(navigator.share && navigator.canShare && share.blob && navigator.canShare({ files: [shareFile()] })); } catch (e) { return false; }
  }
  function setShareButtons(ready) {
    ['share-copy-img', 'share-download'].forEach(function (id) { $(id).disabled = !ready; });
    var nat = $('share-native'); nat.hidden = !(ready && canNativeShare()); nat.disabled = !ready;
    $('share-hint').textContent = nat.hidden
      ? 'Di komputer: tekan "Salin gambar", buka grup WhatsApp, tempel (Ctrl/Cmd+V) di kolom pesan, lalu tempel teks sebagai keterangan. Atau unduh gambar dan kirim sebagai foto.'
      : 'Tekan "Bagikan gambar + teks", lalu pilih grup WhatsApp tujuan.';
  }
  function openShare() {
    if (!state.data) return;
    share.blob = null; if (share.url) { URL.revokeObjectURL(share.url); share.url = null; }
    $('share-text').value = waMessage();
    $('share-img').hidden = true; $('share-img').removeAttribute('src');
    $('share-wait').hidden = false; $('share-wait').textContent = 'Membuat screenshot laporan…';
    shareStatus(''); setShareButtons(false);
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    capturePage().then(function (blob) {
      share.blob = blob; share.url = URL.createObjectURL(blob);
      $('share-img').src = share.url; $('share-img').hidden = false; $('share-wait').hidden = true;
      setShareButtons(true);
    }).catch(function (err) {
      $('share-wait').textContent = 'Screenshot gagal: ' + (err && err.message || err);
      shareStatus('Teks tetap bisa disalin atau dibuka di WhatsApp.', true);
    });
  }
  function copyBlob(blob) {
    if (!navigator.clipboard || !window.ClipboardItem) return Promise.reject(new Error('Browser tidak mendukung salin gambar; gunakan "Unduh gambar".'));
    return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  }
  $('share-wa').addEventListener('click', openShare);
  $('share-native').addEventListener('click', function () {
    if (!share.blob) return;
    navigator.share({ files: [shareFile()], text: $('share-text').value, title: $('title').textContent })
      .then(function () { shareStatus('Dibagikan.'); })
      .catch(function (err) { if (err && err.name !== 'AbortError') shareStatus('Gagal membagikan: ' + err.message, true); });
  });
  $('share-copy-img').addEventListener('click', function () {
    if (!share.blob) return;
    copyBlob(share.blob).then(function () { shareStatus('Gambar disalin. Tempel di kolom pesan grup WhatsApp (Ctrl/Cmd+V).'); })
      .catch(function (err) { shareStatus(err.message, true); });
  });
  $('share-copy-text').addEventListener('click', function () {
    var t = $('share-text').value;
    var p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject(new Error('Browser tidak mendukung salin otomatis'));
    p.then(function () { shareStatus('Teks disalin.'); }).catch(function () { $('share-text').select(); shareStatus('Teks dipilih; tekan Ctrl/Cmd+C untuk menyalin.'); });
  });
  $('share-download').addEventListener('click', function () {
    if (!share.url) return;
    var a = document.createElement('a'); a.href = share.url; a.download = waFileName(); document.body.appendChild(a); a.click(); a.remove();
    shareStatus('Gambar diunduh: ' + waFileName());
  });
  $('share-open').addEventListener('click', function () {
    window.open('https://wa.me/?text=' + encodeURIComponent($('share-text').value), '_blank', 'noopener');
    shareStatus('WhatsApp dibuka dengan teks; pilih grup tujuan, lalu tempel atau lampirkan gambarnya.');
  });
  dlg.addEventListener('close', function () { if (share.url) { URL.revokeObjectURL(share.url); share.url = null; } share.blob = null; });

  load();
  if (CONFIG.autoRefreshMinutes > 0) setInterval(load, CONFIG.autoRefreshMinutes * 60 * 1000);
})();
