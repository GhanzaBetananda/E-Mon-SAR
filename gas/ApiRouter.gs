/**
 * ApiRouter.gs — TEMPEL file ini ke project Apps Script yang SAMA dengan Code.gs Anda.
 * Jangan hapus / ubah Code.gs yang sudah ada. File ini hanya menambahkan
 * jembatan JSON agar React (Vite) bisa memanggil fungsi Code.gs via fetch.
 *
 * Fungsi Code.gs yang dipakai React (nama HARUS sama persis):
 *   getDropdownData() | getLastServiceInfo(vehicle) | saveSectionData(formData)
 *   saveKesimpulan(formData) | getHistoryData(filter)
 *
 * Cara deploy:
 *  1. Extensions > Apps Script > tambah file ApiRouter.gs > paste isi ini > Save
 *  2. Deploy > New deployment > type: Web app
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  3. Copy URL .../exec ke React: .env (VITE_GAS_URL) atau kolom
 *     "Pengaturan koneksi Sheet" di footer aplikasi.
 *  4. Setiap ubah Code.gs: Deploy > Manage deployments > Edit > Version: New version.
 */

function _json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function _route(method, params) {
  params = params || [];
  switch (method) {
    case 'getDropdownData':
      return getDropdownData();
    case 'getLastServiceInfo':
      return getLastServiceInfo(params[0]);
    case 'saveSectionData':
      return saveSectionData(params[0]);
    case 'saveKesimpulan':
      return saveKesimpulan(params[0]);
    case 'getHistoryData':
      return getHistoryData(params[0]);
    case 'ping':
      return { ok: true, vehicle: (typeof CONFIG !== 'undefined' ? CONFIG.VEHICLE_FULL : null) };
    default:
      throw new Error('Method tidak dikenal: ' + method);
  }
}

function doPost(e) {
  try {
    var body = (e && e.postData && e.postData.contents) || '{}';
    var req = JSON.parse(body);
    var data = _route(req.method, req.params);
    return _json({ success: true, data: data });
  } catch (err) {
    return _json({ success: false, error: String((err && err.message) || err) });
  }
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    // Mode API via GET: /exec?method=getDropdownData  (untuk tes cepat di browser)
    if (p.method) {
      var params = [];
      if (p.params) {
        try { params = JSON.parse(p.params); } catch (err) { params = [p.params]; }
      } else if (p.vehicle) {
        params = [p.vehicle];
      } else if (p.filter) {
        try { params = [JSON.parse(p.filter)]; } catch (err) { params = [{ bulan: p.bulan || '', tahun: p.tahun || '' }]; }
      } else if (p.bulan !== undefined || p.tahun !== undefined) {
        params = [{ bulan: p.bulan || '', tahun: p.tahun || '' }];
      }
      var data = _route(p.method, params);
      return _json({ success: true, data: data });
    }
    // Tanpa ?method=... : tetap sajikan HTML lama (HtmlService) bila ada file Index
    try {
      return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('Pengecekan Kendaraan BASARNAS')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (errHtml) {
      return _json({ success: true, data: { ok: true, usage: 'Gunakan POST {method, params} atau GET ?method=...' } });
    }
  } catch (err) {
    return _json({ success: false, error: String((err && err.message) || err) });
  }
}
