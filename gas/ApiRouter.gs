/**
 * ApiRouter.gs — ALTERNATIF kalau Code.gs lama mau dipertahankan.
 * PENTING: jangan pakai file ini BERSAMAAN dengan gas/Code.gs yang baru,
 * karena keduanya punya doPost/doGet (bentrok). Pilih SALAH SATU:
 *   A. Pakai gas/Code.gs lengkap (disarankan, sudah termasuk router ini), ATAU
 *   B. Pertahankan Code.gs lama Anda + tambah file ini sebagai file ke-2.
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
