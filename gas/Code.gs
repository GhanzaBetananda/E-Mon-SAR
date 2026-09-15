/**
 * E-Mon SAR — Code.gs LENGKAP (tinggal paste ke Apps Script)
 *
 * Cara pakai (pilih SALAH SATU):
 *   A. Gampang: hapus semua file .gs di project > buat 1 file Code.gs > paste SELURUH isi
 *      file ini > Save > Deploy Web app.
 *   B. Kalau Code.gs lama mau dipertahankan: jangan pakai file ini, pakai
 *      gas/ApiRouter.gs saja sebagai file ke-2 di project yang sama.
 *      (Jangan pakai A + B bersamaan karena doPost/doGet jadi dobel.)
 *
 * Deploy:
 *   Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone
 *   Copy URL .../exec ke React (.env VITE_GAS_URL / kolom pengaturan di footer).
 *   Setiap ubah file ini: Deploy > Manage deployments > Edit > Version: New version.
 */

// ==================== KONFIGURASI ====================
const CONFIG = {
  SHEET_CHECK_DATA: 'Data Pengecekan',
  SHEET_MASTER: 'Master Data',
  SHEET_SERVICE: 'Data Service',
  SHEET_BAGIAN1: 'Bagian 1 - Kap Mesin',
  SHEET_BAGIAN2: 'Bagian 2 - Dalam Kabin',
  SHEET_BAGIAN3: 'Bagian 3 - Keliling 1',
  SHEET_BAGIAN4: 'Bagian 4 - Keliling 2',
  SHEET_BAGIAN5: 'Bagian 5 - Roda & Ban',
  SHEET_KESIMPULAN: 'Kesimpulan Pemeriksaan',
  SHEET_MASALAH: 'MASALAH',
  // ID folder Drive untuk foto bukti — ganti dengan ID folder Anda
  FOLDER_ID: '1fWHuACnyNWgd5dq7lASJg38w2A-cuHZ1',
  // HARUS sama persis dengan VEHICLE_FULL di src/lib/gas.js React
  VEHICLE_FULL: 'Rescue Car - P 2006 ABC'
};

// ==================== API ROUTER (jembatan React/Vite <-> Code.gs) ====================

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
    case 'getVehicleInfo':
      return getVehicleInfo();
    case 'getFolderInfo':
      return getFolderInfo();
    case 'ping':
      return { ok: true, vehicle: CONFIG.VEHICLE_FULL };
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
    // Tes cepat di browser: .../exec?method=ping  atau  ?method=getDropdownData
    if (p.method) {
      var params = [];
      if (p.params) {
        try { params = JSON.parse(p.params); } catch (errP) { params = [p.params]; }
      } else if (p.vehicle) {
        params = [p.vehicle];
      } else if (p.filter) {
        try { params = [JSON.parse(p.filter)]; } catch (errF) { params = [{ bulan: p.bulan || '', tahun: p.tahun || '' }]; }
      } else if (p.bulan !== undefined || p.tahun !== undefined) {
        params = [{ bulan: p.bulan || '', tahun: p.tahun || '' }];
      }
      var data = _route(p.method, params);
      return _json({ success: true, data: data });
    }
    try {
      return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('Pengecekan Kendaraan BASARNAS - ' + CONFIG.VEHICLE_FULL)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (errHtml) {
      return _json({ success: true, data: { ok: true, usage: 'Gunakan POST {method, params} atau GET ?method=...' } });
    }
  } catch (err) {
    return _json({ success: false, error: String((err && err.message) || err) });
  }
}

// ==================== FUNGSI UPLOAD FILE ====================

function uploadFileToDrive(base64Data, fileName, fileType, id, itemId) {
  try {
    if (!base64Data) {
      return { success: false, error: 'Data file kosong' };
    }

    var blob;
    try {
      var pureBase64 = base64Data;
      if (base64Data.indexOf(',') !== -1) {
        pureBase64 = base64Data.split(',')[1];
      }
      var decodedBytes = Utilities.base64Decode(pureBase64);
      blob = Utilities.newBlob(decodedBytes, fileType || 'image/jpeg', fileName || ('foto_' + itemId + '.jpg'));
    } catch (e) {
      console.error('Error decoding base64:', e);
      return { success: false, error: 'Gagal mendecode file: ' + e.toString() };
    }

    var folder;
    try {
      if (CONFIG.FOLDER_ID && CONFIG.FOLDER_ID !== '') {
        try {
          folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
        } catch (e2) {
          folder = DriveApp.createFolder('BASARNAS_Bukti_Pengecekan');
        }
      } else {
        folder = DriveApp.createFolder('BASARNAS_Bukti_Pengecekan');
      }
    } catch (e3) {
      folder = DriveApp.createFolder('BASARNAS_Bukti_Pengecekan');
    }

    var timestamp = new Date().getTime();
    var safeFileName = fileName || 'foto.jpg';
    var cleanFileName = safeFileName.replace(/[^a-zA-Z0-9\-_. ]/g, '');
    var parts = String(itemId || '0_0').split('_');
    var uniqueFileName = id + '_bagian' + parts[0] + '_item' + (parts[1] || '0') + '_' + timestamp + '_' + cleanFileName;

    var file;
    try {
      file = folder.createFile(blob);
      file.setName(uniqueFileName);
    } catch (e4) {
      return { success: false, error: 'Gagal upload file: ' + e4.toString() };
    }

    return {
      success: true,
      url: file.getUrl(),
      name: file.getName(),
      id: file.getId(),
      folderId: folder.getId(),
      folderName: folder.getName()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ==================== DROPDOWN & SERVICE ====================

function getDropdownData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var masterSheet = ss.getSheetByName(CONFIG.SHEET_MASTER);

    if (!masterSheet) {
      masterSheet = ss.insertSheet(CONFIG.SHEET_MASTER);
      masterSheet.getRange('A1:C1').setValues([
        ['Nama Pemeriksa', 'Koordinator Pengelola', 'Tipe Kendaraan']
      ]);
      masterSheet.getRange('A2:C4').setValues([
        ['Andi Pratama', 'Budi Santoso', CONFIG.VEHICLE_FULL],
        ['Siti Rahayu', 'Citra Dewi', CONFIG.VEHICLE_FULL],
        ['Dedi Kurniawan', 'Budi Santoso', CONFIG.VEHICLE_FULL]
      ]);
    }

    var lastRow = masterSheet.getLastRow();
    if (lastRow < 2) {
      return getDefaultDropdownData();
    }

    var data = masterSheet.getRange(2, 1, lastRow - 1, 2).getValues();

    var pemeriksaSet = {};
    var koorSet = {};
    data.forEach(function (row) {
      if (row[0]) pemeriksaSet[row[0]] = true;
      if (row[1]) koorSet[row[1]] = true;
    });

    var namaPemeriksa = Object.keys(pemeriksaSet);
    var koorPengelola = Object.keys(koorSet);
    var def = getDefaultDropdownData();

    return {
      namaPemeriksa: namaPemeriksa.length ? namaPemeriksa : def.namaPemeriksa,
      koorPengelola: koorPengelola.length ? koorPengelola : def.koorPengelola
    };
  } catch (error) {
    console.error('Error getDropdownData:', error);
    return getDefaultDropdownData();
  }
}

function getDefaultDropdownData() {
  return {
    namaPemeriksa: ['Andi Pratama', 'Siti Rahayu', 'Dedi Kurniawan', 'Budi Santoso', 'Citra Dewi', 'Eko Prasetyo'],
    koorPengelola: ['Budi Santoso', 'Citra Dewi', 'Eko Prasetyo']
  };
}

function getLastServiceInfo(vehicleFullName) {
  try {
    if (!vehicleFullName) {
      vehicleFullName = CONFIG.VEHICLE_FULL;
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var serviceSheet = ss.getSheetByName(CONFIG.SHEET_SERVICE);

    if (!serviceSheet) {
      serviceSheet = ss.insertSheet(CONFIG.SHEET_SERVICE);
      serviceSheet.getRange('A1:C1').setValues([['Tipe Kendaraan', 'Tanggal Service', 'KM']]);
      var headerRange = serviceSheet.getRange('A1:C1');
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#0d6efd');
      headerRange.setFontColor('white');
      return null;
    }

    var lastRow = serviceSheet.getLastRow();
    if (lastRow < 2) {
      return null;
    }

    var data = serviceSheet.getRange(2, 1, lastRow - 1, 3).getValues();

    var latestService = null;
    var latestDate = new Date(0);
    var target = vehicleFullName.toString().trim();

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var tipe = row[0] ? row[0].toString().trim() : '';
      var tanggalValue = row[1];
      var km = row[2];

      var tanggalObj = null;
      if (tanggalValue) {
        try {
          if (typeof tanggalValue === 'string') {
            tanggalObj = new Date(tanggalValue);
            if (isNaN(tanggalObj.getTime())) {
              var parts = tanggalValue.split('-');
              if (parts.length === 3) {
                tanggalObj = new Date(parts[0], parts[1] - 1, parts[2]);
              }
            }
          } else if (tanggalValue instanceof Date) {
            tanggalObj = tanggalValue;
          } else if (typeof tanggalValue === 'number') {
            tanggalObj = new Date(tanggalValue);
          }
        } catch (e) {
          tanggalObj = null;
        }
      }

      if (tipe === target && tanggalObj && !isNaN(tanggalObj.getTime())) {
        if (tanggalObj > latestDate) {
          latestDate = tanggalObj;
          latestService = {
            tanggalService: Utilities.formatDate(tanggalObj, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
            kmKendaraan: km || '-'
          };
        }
      }
    }

    return latestService;
  } catch (error) {
    console.error('Error getLastServiceInfo:', error);
    return null;
  }
}

// ==================== FORMAT TANGGAL ====================

function formatDateOnly(date) {
  try {
    var dateObj;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return '';
    }
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    var year = dateObj.getFullYear();
    var month = String(dateObj.getMonth() + 1).padStart(2, '0');
    var day = String(dateObj.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  } catch (e) {
    return '';
  }
}

function getTodayDateOnly() {
  return formatDateOnly(new Date());
}

// ==================== SIMPAN BAGIAN ====================

function saveSectionData(formData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var section = Number(formData.section);
    var id = formData.id || ('CHK-' + Date.now());

    var sheetName = '';
    var headers = [];

    switch (section) {
      case 1:
        sheetName = CONFIG.SHEET_BAGIAN1;
        headers = ['ID', 'Tanggal', 'Nama Pemeriksa', 'Koordinator Pengelola', 'Tipe Kendaraan', 'KM Kendaraan', 'Tanggal Service', 'BBM (%)', 'Fan Belt', 'Keterangan Fan Belt', 'Foto Fan Belt', 'Oli Mesin', 'Keterangan Oli Mesin', 'Foto Oli Mesin', 'Oli Power Steering', 'Keterangan Oli Power Steering', 'Foto Oli Power Steering', 'Level Minyak Rem', 'Keterangan Level Minyak Rem', 'Foto Level Minyak Rem', 'Level Cairan Washer', 'Keterangan Level Cairan Washer', 'Foto Level Cairan Washer', 'Baterai/Accu', 'Keterangan Baterai/Accu', 'Foto Baterai/Accu'];
        break;
      case 2:
        sheetName = CONFIG.SHEET_BAGIAN2;
        headers = ['ID', 'Tanggal', 'Nama Pemeriksa', 'Koordinator Pengelola', 'Tipe Kendaraan', 'KM Kendaraan', 'Tanggal Service', 'Gerak Bebas Pedal Rem', 'Keterangan Gerak Bebas Pedal Rem', 'Foto Gerak Bebas Pedal Rem', 'Instrumen Indikator', 'Keterangan Instrumen Indikator', 'Foto Instrumen Indikator', 'Kemudahan Start Engine', 'Keterangan Kemudahan Start Engine', 'Foto Kemudahan Start Engine', 'Langkah Tuas Rem Parkir', 'Keterangan Langkah Tuas Rem Parkir', 'Foto Langkah Tuas Rem Parkir', 'Gerak Bebas Kemudi', 'Keterangan Gerak Bebas Kemudi', 'Foto Gerak Bebas Kemudi', 'Klakson', 'Keterangan Klakson', 'Foto Klakson', 'Level Bahan Bakar', 'Keterangan Level Bahan Bakar', 'Foto Level Bahan Bakar', 'Power Window/Door Lock', 'Keterangan Power Window/Door Lock', 'Foto Power Window/Door Lock', 'Sirine', 'Keterangan Sirine', 'Foto Sirine', 'Radio Komunikasi', 'Keterangan Radio Komunikasi', 'Foto Radio Komunikasi', 'Seat Belt', 'Keterangan Seat Belt', 'Foto Seat Belt', 'Kaca Spion Dalam', 'Keterangan Kaca Spion Dalam', 'Foto Kaca Spion Dalam', 'Kunci Roda dan Tool Kit', 'Keterangan Kunci Roda dan Tool Kit', 'Foto Kunci Roda dan Tool Kit', 'AC', 'Keterangan AC', 'Foto AC'];
        break;
      case 3:
        sheetName = CONFIG.SHEET_BAGIAN3;
        headers = ['ID', 'Tanggal', 'Nama Pemeriksa', 'Koordinator Pengelola', 'Tipe Kendaraan', 'KM Kendaraan', 'Tanggal Service', 'Lampu-Lampu', 'Keterangan Lampu-Lampu', 'Foto Lampu-Lampu', 'Pegas Suspensi', 'Keterangan Pegas Suspensi', 'Foto Pegas Suspensi', 'Kebocoran/Tetesan', 'Keterangan Kebocoran/Tetesan', 'Foto Kebocoran/Tetesan', 'Kondisi Kaca-Kaca', 'Keterangan Kondisi Kaca-Kaca', 'Foto Kondisi Kaca-Kaca', 'Wiper', 'Keterangan Wiper', 'Foto Wiper', 'Bumper', 'Keterangan Bumper', 'Foto Bumper', 'Spion', 'Keterangan Spion', 'Foto Spion'];
        break;
      case 4:
        sheetName = CONFIG.SHEET_BAGIAN4;
        headers = ['ID', 'Tanggal', 'Nama Pemeriksa', 'Koordinator Pengelola', 'Tipe Kendaraan', 'KM Kendaraan', 'Tanggal Service', 'Lightbar', 'Keterangan Lightbar', 'Foto Lightbar', 'Pengeras Suara', 'Keterangan Pengeras Suara', 'Foto Pengeras Suara', 'Snorkel', 'Keterangan Snorkel', 'Foto Snorkel', 'Kain Kanopi Bak Belakang', 'Keterangan Kain Kanopi Bak Belakang', 'Foto Kain Kanopi Bak Belakang', 'Pintu/Engsel Kompartmen', 'Keterangan Pintu/Engsel Kompartmen', 'Foto Pintu/Engsel Kompartmen', 'Kunci Kompartmen', 'Keterangan Kunci Kompartmen', 'Foto Kunci Kompartmen', 'Rak Kompartmen', 'Keterangan Rak Kompartmen', 'Foto Rak Kompartmen', 'Step Tangga Belakang', 'Keterangan Step Tangga Belakang', 'Foto Step Tangga Belakang', 'Atap dan Step Kompartmen', 'Keterangan Atap dan Step Kompartmen', 'Foto Atap dan Step Kompartmen', 'Antenna', 'Keterangan Antenna', 'Foto Antenna'];
        break;
      case 5:
        sheetName = CONFIG.SHEET_BAGIAN5;
        headers = ['ID', 'Tanggal', 'Nama Pemeriksa', 'Koordinator Pengelola', 'Tipe Kendaraan', 'KM Kendaraan', 'Tanggal Service', 'Tekanan Ban', 'Keterangan Tekanan Ban', 'Foto Tekanan Ban', 'Keausan Ban', 'Keterangan Keausan Ban', 'Foto Keausan Ban', 'Ban Serep', 'Keterangan Ban Serep', 'Foto Ban Serep'];
        break;
      default:
        return { success: false, message: 'Bagian tidak valid' };
    }

    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#0d6efd')
        .setFontColor('white');
    }

    // Sheet MASALAH: 8 kolom tetap [ID, Tanggal, Nama, Bagian, Item, Status, Keterangan, Foto]
    var sheetMasalah = ss.getSheetByName(CONFIG.SHEET_MASALAH);
    if (!sheetMasalah) {
      sheetMasalah = ss.insertSheet(CONFIG.SHEET_MASALAH);
      var headerMasalah = ['ID', 'Tanggal', 'Nama Pemeriksa', 'Bagian', 'Item', 'Status', 'Keterangan', 'Foto'];
      sheetMasalah.getRange(1, 1, 1, headerMasalah.length).setValues([headerMasalah]);
      sheetMasalah.getRange(1, 1, 1, headerMasalah.length)
        .setFontWeight('bold')
        .setBackground('#dc3545')
        .setFontColor('white');
    }

    var rowData = [];
    var tglPemeriksaan = formatDateOnly(formData.tanggal);

    rowData.push(id);
    rowData.push(tglPemeriksaan);
    rowData.push(formData.namaPemeriksa || '');
    rowData.push(formData.koorPengelola || '');
    rowData.push(CONFIG.VEHICLE_FULL);
    rowData.push(formData.kmKendaraan || '');
    rowData.push(formatDateOnly(formData.tanggalService));

    // Kolom BBM hanya untuk Bagian 1 (agar sejajar dengan header)
    if (section === 1) {
      rowData.push(formData.bbm || '');
    }

    var items = formData.items || [];
    var itemLabels = getItemLabelsForSection(sheetName);

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var fotoUrl = '';

      if (item.fileData) {
        var uploadResult = uploadFileToDrive(
          item.fileData,
          item.fileName || ('foto_' + section + '_' + i + '.jpg'),
          item.fileType || 'image/jpeg',
          id,
          section + '_' + i
        );
        if (uploadResult.success) fotoUrl = uploadResult.url;
      }

      var status = item.status || '';
      var keterangan = item.keterangan || '';

      rowData.push(status);
      rowData.push(keterangan);
      rowData.push(fotoUrl);

      if (status === 'Tidak Standart' || status === 'Rusak') {
        var namaItem = itemLabels[i] || ('Item ' + (i + 1));
        sheetMasalah.appendRow([
          id,
          tglPemeriksaan,
          formData.namaPemeriksa || '',
          sheetName,
          namaItem,
          status,
          keterangan,
          fotoUrl
        ]);
      }
    }

    var totalColumns = sheet.getLastColumn();
    if (!totalColumns || totalColumns < headers.length) {
      totalColumns = headers.length;
    }

    if (!rowData || rowData.length === 0) throw new Error('rowData kosong, tidak bisa disimpan');
    while (rowData.length < totalColumns) rowData.push('');
    if (rowData.length > totalColumns) rowData.splice(totalColumns);

    sheet.appendRow(rowData);

    return {
      success: true,
      id: id,
      nextSection: section < 5 ? section + 1 : null,
      isComplete: section === 5,
      message: 'Bagian ' + section + ' berhasil disimpan'
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: error.toString() };
  }
}

function updateMasterServiceData(tipeKendaraan, tanggalService, kmKendaraan) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var masterSheet = ss.getSheetByName(CONFIG.SHEET_MASTER);
    if (!masterSheet) return;

    var lastRow = masterSheet.getLastRow();
    if (lastRow >= 2) {
      var data = masterSheet.getRange(2, 1, lastRow - 1, 3).getValues();
      for (var i = 0; i < data.length; i++) {
        var tipe = data[i][2] ? data[i][2].toString().trim() : '';
        if (tipe === tipeKendaraan.toString().trim()) {
          var rowIndex = i + 2;
          var headers = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
          var serviceCol = headers.indexOf('Service Terakhir') + 1;
          var kmCol = headers.indexOf('KM Terakhir') + 1;

          if (serviceCol === 0) {
            var currentCols = masterSheet.getLastColumn();
            masterSheet.getRange(1, currentCols + 1).setValue('Service Terakhir');
            masterSheet.getRange(1, currentCols + 2).setValue('KM Terakhir');
            serviceCol = currentCols + 1;
            kmCol = currentCols + 2;
          }

          masterSheet.getRange(rowIndex, serviceCol).setValue(tanggalService);
          masterSheet.getRange(rowIndex, kmCol).setValue(kmKendaraan);
          return;
        }
      }
    }
  } catch (error) {
    console.error('Error updateMasterServiceData:', error);
  }
}

function saveKesimpulan(formData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_KESIMPULAN);

    var headers = ['ID', 'Tanggal', 'Nama Pemeriksa', 'Koordinator Pengelola',
      'Tipe Kendaraan', 'KM Kendaraan', 'Tanggal Service',
      'Kesimpulan', 'Catatan', 'Timestamp'];

    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_KESIMPULAN);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#0d6efd');
      headerRange.setFontColor('white');
      headerRange.setHorizontalAlignment('center');
    }

    var rowData = [
      formData.id,
      formatDateOnly(formData.tanggal),
      formData.namaPemeriksa,
      formData.koorPengelola,
      CONFIG.VEHICLE_FULL,
      formData.kmKendaraan,
      formatDateOnly(formData.tanggalService),
      formData.kesimpulan,
      formData.catatan || '',
      getTodayDateOnly()
    ];

    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, rowData.length).setValues([rowData]);
    sheet.autoResizeColumns(1, rowData.length);

    return { success: true, message: 'Kesimpulan berhasil disimpan' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ==================== HISTORY (sudah diperbaiki mapping kolom MASALAH) ====================

function getHistoryData(filterData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var grouped = {};

    function safeDate(value) {
      if (!value) return null;
      if (value instanceof Date) return value;
      if (typeof value === 'string') {
        var d = new Date(value);
        if (!isNaN(d.getTime())) return d;
        var parts = value.split(/[-/]/);
        if (parts.length === 3) {
          var p0 = parts[0].trim(), p1 = parts[1].trim(), p2 = parts[2].trim();
          if (p0.length === 4) return new Date(p0, p1 - 1, p2);
          if (p2.length === 4) return new Date(p2, p1 - 1, p0);
        }
      }
      if (typeof value === 'number') {
        var dn = new Date(value);
        if (!isNaN(dn.getTime())) return dn;
      }
      return null;
    }

    function formatDMY(dateObj) {
      if (!dateObj) return '-';
      var d = String(dateObj.getDate()).padStart(2, '0');
      var m = String(dateObj.getMonth() + 1).padStart(2, '0');
      var y = dateObj.getFullYear();
      return d + '-' + m + '-' + y;
    }

    // 1. Data dasar dari Bagian 1 & Kesimpulan
    var baseSheets = [CONFIG.SHEET_BAGIAN1, CONFIG.SHEET_KESIMPULAN];

    baseSheets.forEach(function (sheetName) {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return;
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;

      var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

      data.forEach(function (row) {
        var id = row[0] ? String(row[0]).trim() : '';
        if (!id) return;

        if (!grouped[id]) {
          var tanggalObj = safeDate(row[1]);
          grouped[id] = {
            id: id,
            tanggalObj: tanggalObj,
            tanggal: formatDMY(tanggalObj),
            namaPemeriksa: row[2] || '-',
            koorPengelola: row[3] || '-',
            tipeKendaraan: row[4] ? String(row[4]).trim() : CONFIG.VEHICLE_FULL,
            kmKendaraan: row[5] || '-',
            tanggalService: row[6] ? formatDMY(safeDate(row[6])) : '-',
            issues: [],
            kesimpulan: '-',
            catatan: '-'
          };
        }

        if (sheetName === CONFIG.SHEET_KESIMPULAN) {
          grouped[id].kesimpulan = row[7] || '-';
          grouped[id].catatan = row[8] || '-';
        }
      });
    });

    // 2. Issue dari sheet MASALAH — 8 kolom: [ID,Tanggal,Nama,Bagian,Item,Status,Keterangan,Foto]
    var sheetMasalah = ss.getSheetByName(CONFIG.SHEET_MASALAH);
    if (sheetMasalah && sheetMasalah.getLastRow() >= 2) {
      var dataMasalah = sheetMasalah.getRange(2, 1, sheetMasalah.getLastRow() - 1, 8).getValues();
      dataMasalah.forEach(function (row) {
        var id = row[0] ? String(row[0]).trim() : '';
        if (!id || !grouped[id]) return;

        grouped[id].issues.push({
          bagian: row[3] && String(row[3]).trim() !== '' ? String(row[3]).trim() : '-',
          item: row[4] && String(row[4]).trim() !== '' ? String(row[4]).trim() : '-',
          status: row[5] && String(row[5]).trim() !== '' ? String(row[5]).trim() : '-',
          keterangan: row[6] && String(row[6]).trim() !== '' ? String(row[6]).trim() : '-',
          foto: row[7] && String(row[7]).trim() !== '' ? String(row[7]).trim() : '-'
        });
      });
    }

    var filterBulan = (filterData && filterData.bulan && filterData.bulan !== 'undefined' && filterData.bulan !== 'null') ? String(filterData.bulan).trim() : '';
    var filterTahun = (filterData && filterData.tahun && filterData.tahun !== 'undefined' && filterData.tahun !== 'null') ? String(filterData.tahun).trim() : '';

    var result = Object.keys(grouped).map(function (k) { return grouped[k]; }).filter(function (r) {
      var vTarget = CONFIG.VEHICLE_FULL.toLowerCase().trim();
      var vCurrent = String(r.tipeKendaraan || '').toLowerCase().trim();
      if (vCurrent.indexOf(vTarget) === -1 && vTarget.indexOf(vCurrent) === -1) return false;

      if (filterBulan && filterBulan !== '' && filterBulan !== 'all' && !isNaN(filterBulan)) {
        if (!r.tanggalObj) return false;
        var m = String(r.tanggalObj.getMonth() + 1).padStart(2, '0');
        if (m !== String(filterBulan).padStart(2, '0')) return false;
      }

      if (filterTahun && filterTahun !== '' && filterTahun !== 'all' && !isNaN(filterTahun)) {
        if (!r.tanggalObj) return false;
        if (String(r.tanggalObj.getFullYear()) !== String(filterTahun)) return false;
      }
      return true;
    });

    result.sort(function (a, b) {
      var timeA = a.tanggalObj ? a.tanggalObj.getTime() : 0;
      var timeB = b.tanggalObj ? b.tanggalObj.getTime() : 0;
      return timeB - timeA;
    });

    return result;
  } catch (err) {
    console.error('getHistoryData ERROR:', err);
    return [];
  }
}

function getItemLabelsForSection(sheetName) {
  var itemMap = {};
  itemMap[CONFIG.SHEET_BAGIAN1] = [
    'Fan Belt', 'Oli Mesin', 'Oli Power Steering',
    'Level Minyak Rem', 'Level Cairan Washer', 'Baterai/Accu'
  ];
  itemMap[CONFIG.SHEET_BAGIAN2] = [
    'Gerak Bebas Pedal Rem', 'Instrumen Indikator', 'Kemudahan Start Engine',
    'Langkah Tuas Rem Parkir', 'Gerak Bebas Kemudi', 'Klakson',
    'Level Bahan Bakar', 'Power Window/Door Lock', 'Sirine',
    'Radio Komunikasi', 'Seat Belt', 'Kaca Spion Dalam',
    'Kunci Roda dan Tool Kit', 'AC'
  ];
  itemMap[CONFIG.SHEET_BAGIAN3] = [
    'Lampu-Lampu', 'Pegas Suspensi', 'Kebocoran/Tetesan',
    'Kondisi Kaca-Kaca', 'Wiper', 'Bumper', 'Spion'
  ];
  itemMap[CONFIG.SHEET_BAGIAN4] = [
    'Lightbar', 'Pengeras Suara', 'Snorkel',
    'Kain Kanopi Bak Belakang', 'Pintu/Engsel Kompartmen',
    'Kunci Kompartmen', 'Rak Kompartmen', 'Step Tangga Belakang',
    'Atap dan Step Kompartmen', 'Antenna'
  ];
  itemMap[CONFIG.SHEET_BAGIAN5] = [
    'Tekanan Ban', 'Keausan Ban', 'Ban Serep'
  ];
  return itemMap[sheetName] || [];
}

// ==================== DEBUG & ADMIN ====================

function debugAllSheets() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var allSheets = ss.getSheets();
    var result = { sheets: [], totalData: 0 };

    for (var s = 0; s < allSheets.length; s++) {
      var sheet = allSheets[s];
      var name = sheet.getName();
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var sampleData = null;
      if (lastRow >= 2) {
        sampleData = sheet.getRange(2, 1, Math.min(lastRow - 1, 3), Math.min(lastCol, 10)).getValues();
        result.totalData += (lastRow - 1);
      }
      result.sheets.push({ name: name, lastRow: lastRow, lastCol: lastCol, hasData: lastRow >= 2, sampleData: sampleData });
    }
    return result;
  } catch (error) {
    return { error: error.toString() };
  }
}

function debugHistoryData() {
  try {
    var result = getHistoryData({ bulan: '', tahun: '' });
    return {
      totalData: result.length,
      sampleData: result.slice(0, 3),
      allIds: result.map(function (r) { return r.id; })
    };
  } catch (error) {
    return { error: error.toString() };
  }
}

function debugSheetData(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return 'Sheet "' + sheetName + '" tidak ditemukan!';
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return 'Sheet "' + sheetName + '" tidak memiliki data (hanya header)';
    var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    return { sheetName: sheetName, totalRows: data.length, totalCols: sheet.getLastColumn(), data: data.slice(0, 5) };
  } catch (error) {
    return { error: error.toString() };
  }
}

function resetAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var targets = [CONFIG.SHEET_CHECK_DATA, CONFIG.SHEET_MASTER, CONFIG.SHEET_SERVICE,
    CONFIG.SHEET_BAGIAN1, CONFIG.SHEET_BAGIAN2, CONFIG.SHEET_BAGIAN3,
    CONFIG.SHEET_BAGIAN4, CONFIG.SHEET_BAGIAN5, CONFIG.SHEET_KESIMPULAN];
  for (var i = 0; i < sheets.length; i++) {
    if (targets.indexOf(sheets[i].getName()) !== -1) {
      ss.deleteSheet(sheets[i]);
    }
  }
  getDropdownData();
  return { success: true, message: 'Semua data telah direset' };
}

function exportDataToCSV() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_CHECK_DATA);
    if (!sheet) return null;
    var data = sheet.getDataRange().getValues();
    return data.map(function (row) { return row.join(','); }).join('\n');
  } catch (error) {
    return null;
  }
}

function backupData() {
  try {
    var backupFolderId = CONFIG.FOLDER_ID;
    if (!backupFolderId || backupFolderId === '') {
      return { success: false, message: 'Folder backup tidak ditemukan. Setup FOLDER_ID dulu.' };
    }
    var folder = DriveApp.getFolderById(backupFolderId);
    var backupFile = folder.createFile(
      'Backup_Data_Pengecekan_' + CONFIG.VEHICLE_FULL + '_' + getTodayDateOnly() + '.csv',
      exportDataToCSV(),
      'text/csv'
    );
    return { success: true, message: 'Backup berhasil dibuat', fileUrl: backupFile.getUrl() };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function testUploadFunction() {
  try {
    var testContent = 'Test file - BASARNAS Banyuwangi\nTanggal: ' + getTodayDateOnly();
    var blob = Utilities.newBlob(testContent, 'text/plain', 'test.txt');
    var folder;
    if (CONFIG.FOLDER_ID && CONFIG.FOLDER_ID !== '') {
      try {
        folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
      } catch (e) {
        folder = DriveApp.createFolder('BASARNAS_Bukti_Pengecekan');
      }
    } else {
      folder = DriveApp.createFolder('BASARNAS_Bukti_Pengecekan');
    }
    var file = folder.createFile(blob);
    file.setName('test_' + new Date().getTime() + '.txt');
    return {
      success: true,
      url: file.getUrl(),
      folderId: folder.getId(),
      folderName: folder.getName(),
      fileName: file.getName(),
      message: 'Test file berhasil diupload ke folder: ' + folder.getName()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFolderInfo() {
  try {
    if (CONFIG.FOLDER_ID && CONFIG.FOLDER_ID !== '') {
      try {
        var folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
        return {
          success: true,
          folderId: folder.getId(),
          folderName: folder.getName(),
          folderUrl: 'https://drive.google.com/drive/folders/' + folder.getId(),
          isConfigured: true
        };
      } catch (e) {
        return { success: false, error: 'Folder tidak ditemukan', folderId: CONFIG.FOLDER_ID, isConfigured: true };
      }
    }
    return { success: false, error: 'FOLDER_ID belum dikonfigurasi', isConfigured: false };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getVehicleInfo() {
  return { full: CONFIG.VEHICLE_FULL };
}

function initializeData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var masterSheet = ss.getSheetByName(CONFIG.SHEET_MASTER);
    if (!masterSheet) {
      masterSheet = ss.insertSheet(CONFIG.SHEET_MASTER);
      masterSheet.getRange('A1:C1').setValues([
        ['Nama Pemeriksa', 'Koordinator Pengelola', 'Tipe Kendaraan']
      ]);
      masterSheet.getRange('A2:C4').setValues([
        ['Andi Pratama', 'Budi Santoso', CONFIG.VEHICLE_FULL],
        ['Siti Rahayu', 'Citra Dewi', CONFIG.VEHICLE_FULL],
        ['Dedi Kurniawan', 'Budi Santoso', CONFIG.VEHICLE_FULL]
      ]);
    }

    var serviceSheet = ss.getSheetByName(CONFIG.SHEET_SERVICE);
    if (!serviceSheet) {
      serviceSheet = ss.insertSheet(CONFIG.SHEET_SERVICE);
      serviceSheet.getRange('A1:C1').setValues([['Tipe Kendaraan', 'Tanggal Service', 'KM']]);
      var headerRange = serviceSheet.getRange('A1:C1');
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#0d6efd');
      headerRange.setFontColor('white');
    }

    var checkSheet = ss.getSheetByName(CONFIG.SHEET_CHECK_DATA);
    if (!checkSheet) {
      checkSheet = ss.insertSheet(CONFIG.SHEET_CHECK_DATA);
      var headers = ['ID', 'Tanggal', 'Nama Pemeriksa', 'Koordinator Pengelola',
        'Tipe Kendaraan', 'KM Kendaraan', 'Tanggal Service',
        'Item Pengecekan', 'Status', 'Keterangan', 'Foto URL', 'File ID', 'Timestamp'];
      checkSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      var hr = checkSheet.getRange(1, 1, 1, headers.length);
      hr.setFontWeight('bold');
      hr.setBackground('#0d6efd');
      hr.setFontColor('white');
      hr.setHorizontalAlignment('center');
    }

    return {
      success: true,
      message: 'Data berhasil diinisialisasi untuk ' + CONFIG.VEHICLE_FULL,
      folderInfo: getFolderInfo()
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}
