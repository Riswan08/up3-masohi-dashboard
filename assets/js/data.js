// Lapisan data: membaca Google Sheet (gviz), mengenali format tab, dan menghitung agregat.
(function (root) {
  'use strict';
  var CONFIG = root.DASH_CONFIG;
  if (!CONFIG) throw new Error('config.js belum dimuat');

  CONFIG.kpis.forEach(function (k) { k.tab = k.tabs[0]; });

  function gvizUrl(tab) {
    return 'https://docs.google.com/spreadsheets/d/' + CONFIG.sheetId +
      '/gviz/tq?tqx=out:json&headers=0&sheet=' + encodeURIComponent(tab);
  }

  function sheetUrl() {
    return 'https://docs.google.com/spreadsheets/d/' + CONFIG.sheetId + '/edit';
  }




  // Google Visualization API membungkus JSON dalam pemanggilan fungsi; ambil objeknya saja.
  function parseGviz(text) {
    var start = text.indexOf('{');
    var end = text.lastIndexOf('}');
    if (start < 0 || end < 0) throw new Error('Respons bukan format gviz');
    var obj = JSON.parse(text.slice(start, end + 1));
    if (obj.status === 'error') {
      var msg = (obj.errors && obj.errors[0] && (obj.errors[0].detailed_message || obj.errors[0].message)) || 'gviz error';
      throw new Error(msg);
    }
    return obj.table;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }

  // "Date(2026,9,25)" -> "2026-10-25" (bulan gviz berbasis 0)
  function cellToIso(cell) {
    if (!cell) return null;
    var v = cell.v;
    if (typeof v === 'string') {
      var m = /Date\((\d+),(\d+),(\d+)/.exec(v);
      if (m) return iso(+m[1], +m[2] + 1, +m[3]);
      var m2 = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(v.trim()); // dd/mm/yyyy
      if (m2) return iso(+m2[3], +m2[2], +m2[1]);
      var m3 = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.trim());
      if (m3) return v.slice(0, 10);
      return null;
    }
    if (v instanceof Date) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
    return null;
  }

  // Angka bisa datang sebagai number, atau teks berformat Indonesia ("8.471,5")
  function cellToNum(cell) {
    if (!cell || cell.v === null || cell.v === undefined || cell.v === '') return null;
    var v = cell.v;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).trim();
    if (!s) return null;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  // Tabel gviz -> kisi nilai (tanggal sebagai ISO, angka sebagai number, teks apa adanya)
  function gridFromGviz(table) {
    return (table.rows || []).map(function (r) {
      return (r.c || []).map(function (cell) {
        if (!cell || cell.v === null || cell.v === undefined) return '';
        var iso = cellToIso(cell);
        return iso || cell.v;
      });
    });
  }
  function isIso(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); }
  // Judul tanggal pada tab format lebar sering dikirim gviz sebagai angka seri spreadsheet
  // (hari sejak 1899-12-30, mis. 46320 = 2026-10-25), bukan sebagai tanggal.
  function isSerial(v) { return typeof v === 'number' && v === Math.floor(v) && v >= 36526 && v <= 73050; }
  function serialToIso(n) { return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10); }
  function cellDate(v) { return isIso(v) ? v : (isSerial(v) ? serialToIso(v) : null); }
  // Baris judul format lebar: >= 5 sel tanggal, dan bila berupa angka seri harus berurutan
  // (menghindari baris angka biasa yang kebetulan masuk rentang seri).
  function headerRow(grid) {
    for (var i = 0; i < Math.min(15, grid.length); i++) {
      var dates = 0, run = 0, prev = null;
      for (var j = 0; j < grid[i].length; j++) {
        var v = grid[i][j];
        if (isIso(v)) { dates++; prev = null; continue; }
        if (isSerial(v)) { run = (prev !== null && v === prev + 1) ? run + 1 : 1; prev = v; if (run >= 5) dates = Math.max(dates, 5); }
        else prev = null;
      }
      if (dates >= 5) return i;
    }
    return -1;
  }
  function detectGrid(grid) { return headerRow(grid) >= 0 ? 'wide' : 'long'; }
  function numOf(v) { if (v === '' || v === null || v === undefined) return null; if (typeof v === 'number') return isFinite(v) ? v : null; return cellToNum({ v: v }); }
  // Format panjang: TANGGAL | UIW/UP | TARGET | REALISASI | ... (baris judul dilewati otomatis)
  // Kolom F pada tab DB berisi TARGET KOMULATIF bulan berjalan per unit (nilainya sama untuk semua
  // tanggal dalam satu bulan). Ini yang dipakai sebagai target komulatif, bukan jumlah target harian.
  var MONTH_TARGET_COL = 5;
  function longGridToRows(grid) {
    var c = CONFIG.columns, out = [];
    grid.forEach(function (r) {
      var d = isIso(r[c.date]) ? r[c.date] : null, u = r[c.unit] != null ? String(r[c.unit]).trim() : '';
      if (!d || !u) return;
      var real = numOf(r[c.real]);
      out.push({ d: d, u: u, t: numOf(r[c.target]) || 0, r: real === null ? 0 : real, has: real !== null, mt: numOf(r[MONTH_TARGET_COL]) });
    });
    return out;
  }
  // Format lebar: baris header berisi tanggal; kolom B = unit, kolom C = Target/Realisasi
  function wideGridToRows(grid) {
    var hdr = headerRow(grid), i, j;
    if (hdr < 0) return [];
    var cols = [];
    for (j = 0; j < grid[hdr].length; j++) { var d = cellDate(grid[hdr][j]); if (d) cols.push({ c: j, d: d }); }
    var byKey = {}, order = [], unit = '';
    for (i = hdr + 1; i < grid.length; i++) {
      var row = grid[i];
      if (row[1] !== '' && row[1] !== null && row[1] !== undefined) unit = String(row[1]).trim();
      var comp = String(row[2] || '').trim().toLowerCase();
      if (!unit || (comp !== 'target' && comp !== 'realisasi')) continue;
      for (var k = 0; k < cols.length; k++) {
        var key = unit + '|' + cols[k].d;
        if (!byKey[key]) { byKey[key] = { d: cols[k].d, u: unit, t: 0, r: 0, has: false }; order.push(key); }
        var v = numOf(row[cols[k].c]);
        if (comp === 'target') byKey[key].t = v || 0;
        else { byKey[key].r = v === null ? 0 : v; byKey[key].has = v !== null; }
      }
    }
    order.sort();
    return order.map(function (k) { return byKey[k]; });
  }
  function gridToRows(grid) { return detectGrid(grid) === 'wide' ? wideGridToRows(grid) : longGridToRows(grid); }

  function tableToRows(table) {
    var c = CONFIG.columns, out = [];
    (table.rows || []).forEach(function (r) {
      var cells = r.c || [];
      var d = cellToIso(cells[c.date]);
      var u = cells[c.unit] && cells[c.unit].v != null ? String(cells[c.unit].v).trim() : '';
      if (!d || !u) return;
      var real = cellToNum(cells[c.real]);
      out.push({ d: d, u: u, t: cellToNum(cells[c.target]) || 0, r: real === null ? 0 : real, has: real !== null });
    });
    return out;
  }

  // ---------- Agregasi ----------
  function sumRange(rows, units, d1, d2) {
    var t = 0, r = 0, n = 0, i, x;
    for (i = 0; i < rows.length; i++) {
      x = rows[i];
      if (x.d < d1 || x.d > d2 || !units[x.u]) continue;
      t += x.t; r += x.r; if (x.has) n++;
    }
    return { t: t, r: r, n: n };
  }

  // null = tidak bisa dihitung (target 0 dan realisasi 0)
  function pct(kind, t, r) {
    if (kind === 'limit') {
      if (t > 0) return Math.max(0, Math.min(200, (2 - r / t) * 100));
      return r > 0 ? 0 : null;
    }
    if (t > 0) return (r / t) * 100;
    return r > 0 ? 100 : null;
  }

  function monthStart(isoDate) { return isoDate.slice(0, 8) + '01'; }
  function monthEnd(isoDate) { var d = new Date(Date.UTC(+isoDate.slice(0, 4), +isoDate.slice(5, 7), 0)); return d.toISOString().slice(0, 10); }

  // Jumlah target bulanan (kolom F tab DB) unit terpilih pada bulan tanggal `ref`.
  // null bila tidak ada satu pun unit yang punya target bulanan (mis. data dari tab format lebar).
  function monthTarget(rows, units, ref) {
    var a = monthStart(ref), b = monthEnd(ref), got = {}, any = false, i, x;
    for (i = 0; i < rows.length; i++) {
      x = rows[i];
      if (x.d < a || x.d > b || !units[x.u] || x.mt === null || x.mt === undefined) continue;
      if (!(x.u in got)) { got[x.u] = x.mt; any = true; }
    }
    if (!any) return null;
    var t = 0; Object.keys(got).forEach(function (u) { t += got[u]; });
    return t;
  }

  function unitsOrdered(data) {
    var seen = {}, order = [];
    Object.keys(data).forEach(function (k) {
      data[k].forEach(function (x) { if (!seen[x.u]) { seen[x.u] = 1; order.push(x.u); } });
    });
    order.sort(function (a, b) {
      var au = a === CONFIG.up3Name ? 0 : 1, bu = b === CONFIG.up3Name ? 0 : 1;
      return au - bu || a.localeCompare(b, 'id');
    });
    return order;
  }

  // Tanggal terakhir yang benar-benar sudah ada realisasinya (bukan sekadar 0 bawaan formula)
  function latestFilledDate(data) {
    var best = null;
    Object.keys(data).forEach(function (k) {
      data[k].forEach(function (x) { if (x.has && x.r !== 0 && (!best || x.d > best)) best = x.d; });
    });
    return best;
  }

  function dateBounds(data) {
    var min = null, max = null;
    Object.keys(data).forEach(function (k) {
      data[k].forEach(function (x) { if (!min || x.d < min) min = x.d; if (!max || x.d > max) max = x.d; });
    });
    return { min: min, max: max };
  }

  // Hasil siap render untuk satu KPI
  // Target periode (dan tabel per unit) = jumlah target harian pada rentang, sama seperti sheet.
  // Target komulatif = TARGET KOMULATIF bulan `d2` dari kolom F tab DB; bila kolom itu tidak ada
  // (mis. data dari tab format lebar), jatuh ke jumlah target harian dari awal bulan s/d d2.
  function summarize(kpi, rows, unitSel, d1, d2) {
    var c1 = monthStart(d2);
    var per = sumRange(rows, unitSel, d1, d2);
    var cum = sumRange(rows, unitSel, c1, d2);
    var mt = monthTarget(rows, unitSel, d2);
    if (mt !== null) cum.t = mt;
    var perUnit = Object.keys(unitSel).filter(function (u) { return unitSel[u]; }).map(function (u) {
      var one = {}; one[u] = true;
      var s = sumRange(rows, one, d1, d2);
      return { unit: u, t: s.t, r: s.r, n: s.n, gap: s.t - s.r, pct: pct(kpi.kind, s.t, s.r) };
    });
    perUnit.sort(function (a, b) { return b.t - a.t || a.unit.localeCompare(b.unit, 'id'); });
    return {
      key: kpi.key,
      period: { t: per.t, r: per.r, n: per.n, pct: pct(kpi.kind, per.t, per.r) },
      cum: { t: cum.t, r: cum.r, gap: cum.t - cum.r, pct: pct(kpi.kind, cum.t, cum.r), from: c1 },
      perUnit: perUnit
    };
  }

  // ---------- Pengambilan data: satu permintaan per tab kandidat, langsung ke Google Sheet ----------
  function fetchTab(tab) {
    return fetch(gvizUrl(tab), { cache: 'no-store' })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.text(); })
      .then(function (txt) { return gridToRows(gridFromGviz(parseGviz(txt))); });
  }
  // Hasil: { data: {kpiKey: rows}, failed: [...], fallback: [...], total }
  function fetchAll() {
    // Mode pratinjau/offline: bila window.DASH_SNAPSHOT berisi {kpiKey: [[tanggal, unit, target, realisasi|null], ...]}
    // data diambil dari situ tanpa menghubungi Google Sheet.
    if (root.DASH_SNAPSHOT) {
      var data = {};
      Object.keys(root.DASH_SNAPSHOT).forEach(function (key) {
        data[key] = root.DASH_SNAPSHOT[key].map(function (r) {
          var real = (r[3] === null || r[3] === undefined) ? null : +r[3];
          return { d: r[0], u: r[1], t: +r[2] || 0, r: real === null ? 0 : real, has: real !== null };
        });
      });
      return Promise.resolve({ data: data, failed: [], fallback: [], total: CONFIG.kpis.length, snapshot: true });
    }
    // Semua tab kandidat diambil: data harian dari tab pertama yang terisi (urutan config),
    // target bulanan (kolom F tab DB) dilengkapi dari tab mana pun yang memilikinya.
    var jobs = CONFIG.kpis.map(function (k) {
      return Promise.all(k.tabs.map(function (tab) {
        return fetchTab(tab).then(function (rows) { return { tab: tab, rows: rows, error: rows.length ? null : 'kosong' }; })
          .catch(function (err) { return { tab: tab, rows: [], error: err.message || String(err) }; });
      })).then(function (got) {
        var main = null, i;
        for (i = 0; i < got.length && !main; i++) if (got[i].rows.length) main = got[i];
        if (!main) return { key: k.key, error: got.map(function (g) { return g.tab + ': ' + g.error; }).join('; '), tab: k.tabs.join(' / ') };
        var mt = {};
        got.forEach(function (g) { g.rows.forEach(function (x) { if (x.mt !== null && x.mt !== undefined) { var key = x.u + '|' + x.d.slice(0, 7); if (!(key in mt)) mt[key] = x.mt; } }); });
        main.rows.forEach(function (x) { if (x.mt === null || x.mt === undefined) { var m = mt[x.u + '|' + x.d.slice(0, 7)]; x.mt = m === undefined ? null : m; } });
        return { key: k.key, rows: main.rows, tab: main.tab };
      });
    });
    return Promise.all(jobs).then(function (results) {
      var data = {}, failed = [], fallback = [];
      results.forEach(function (r, i) {
        var k = CONFIG.kpis[i];
        if (r.error) failed.push(r);
        else { data[r.key] = r.rows; if (r.tab !== k.tabs[0]) fallback.push({ key: k.key, label: k.label, tab: r.tab, instead: k.tabs[0] }); }
      });
      return { data: data, failed: failed, fallback: fallback, total: results.length };
    });
  }

  root.DashCore = {
    CONFIG: CONFIG, gvizUrl: gvizUrl, sheetUrl: sheetUrl, parseGviz: parseGviz, tableToRows: tableToRows,
    gridFromGviz: gridFromGviz, detectGrid: detectGrid, gridToRows: gridToRows, serialToIso: serialToIso, fetchTab: fetchTab, fetchAll: fetchAll,
    sumRange: sumRange, pct: pct, monthStart: monthStart, monthEnd: monthEnd, monthTarget: monthTarget, unitsOrdered: unitsOrdered,
    latestFilledDate: latestFilledDate, dateBounds: dateBounds, summarize: summarize
  };
})(typeof window !== 'undefined' ? window : globalThis);
