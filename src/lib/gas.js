/**
 * Klien backend Google Apps Script (Sheet) untuk React.
 * URL Web App dipaten di sini — tidak ada lagi kolom tempel URL di UI.
 */

const LOCAL_KEY = "emon_sar_local_v1";

export const VEHICLES = [
  {
    fullName: "Rescue Truck - W 8653 NP",
    shortName: "W 8653 NP",
    unit: "Rescue Truck",
  },
  {
    fullName: "Rescue Car Carrier - W 8656 NP",
    shortName: "W 8656 NP",
    unit: "Rescue Car Carrier",
  },
  {
    fullName: "Rescue Car - W 8658 NP",
    shortName: "W 8658 NP",
    unit: "Rescue Car",
  },
  {
    fullName: "Motor Trail - B 3269 PDO",
    shortName: "B 3269 PDO",
    unit: "Motor Trail",
  },
  {
    fullName: "Motor Trail - B 3838 PFO",
    shortName: "B 3838 PFO",
    unit: "Motor Trail",
  },
];

export const VEHICLE_FULL = VEHICLES[0].fullName;

// Nomor WhatsApp pimpinan (format internasional tanpa "+", tanpa spasi).
// Contoh: 085930088301 -> 6285930088301. Ganti dengan nomor WA pimpinan.
// Dipakai tombol "Ajukan ke Pimpinan" — chat terbuka dengan pesan terisi otomatis.
export const PIMPINAN_WA_NUMBER = "6285930088301";

// URL Web App Apps Script (paten). Ganti di sini kalau deploy ulang dengan URL baru.
export const GAS_URL =
  import.meta.env?.VITE_GAS_URL ||
  "https://script.google.com/macros/s/AKfycbykYyMaSFhxcTZQCPs6Z_QCu-tBxdnn30lYvmE1nvIVeq7CVNBtweg8WaIjG_viSbPqGA/exec";

export function isEmbedded() {
  return Boolean(window.google?.script?.run);
}

export function getGasUrl() {
  return (GAS_URL || "").trim();
}

export function getConnectionMode() {
  if (isEmbedded()) return "embedded";
  if (getGasUrl()) return "webapp";
  return "local";
}

function callEmbedded(method, args) {
  return new Promise((resolve, reject) => {
    try {
      window.google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        [method](...args);
    } catch (e) {
      reject(e);
    }
  });
}

async function callWebApp(gasUrl, method, args) {
  const res = await fetch(gasUrl, {
    method: "POST",
    // text/plain agar tidak kena preflight CORS di Apps Script
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ method, params: args }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `Respon Web App bukan JSON (HTTP ${res.status}). Pastikan URL /exec benar & deployment "Anyone".`,
    );
  }
  if (!json?.success) throw new Error(json?.error || `GAS error: ${method}`);
  return json.data;
}

// ---------- Mock lokal (dev tanpa Sheet) ----------
function readLocal() {
  try {
    return (
      JSON.parse(
        localStorage.getItem(LOCAL_KEY) || '{"saves":[],"history":[]}',
      ) || {}
    );
  } catch {
    return { saves: [], history: [] };
  }
}
function writeLocal(data) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {
    /* abaikan */
  }
}

async function callLocalMock(method, args) {
  const store = readLocal();
  store.saves = store.saves || [];
  store.history = store.history || [];

  if (method === "getDropdownData") {
    return {
      namaPemeriksa: [
        "Andi Irawan",
        "Wahyu Setia Budi",
        "Edi Suryono",
        "Dyan Susetyo Wibowo",
        "Dekky Haeroel R",
        "Kurniawan",
      ],
      koorPengelola: ["Nur Kholis Majid", "Jefriyanzah Putra"],
      _local: true,
    };
  }
  if (method === "getLastServiceInfo") {
    return null; // belum ada data service di mode lokal
  }
  if (method === "saveSectionData") {
    const formData = args[0] || {};
    const id = formData.id || `CHK-${Date.now()}`;
    store.saves.push({ ...formData, id, _at: new Date().toISOString() });
    writeLocal(store);
    const section = Number(formData.section);
    return {
      success: true,
      id,
      nextSection: section < 5 ? section + 1 : null,
      isComplete: section === 5,
      message: `Bagian ${section} tersimpan (mode lokal)`,
      _local: true,
    };
  }
  if (method === "saveKesimpulan") {
    const formData = args[0] || {};
    const rec = {
      id: formData.id || `CHK-${Date.now()}`,
      tanggal: formData.tanggal || new Date().toISOString().slice(0, 10),
      namaPemeriksa: formData.namaPemeriksa || "-",
      koorPengelola: formData.koorPengelola || "-",
      kmKendaraan: formData.kmKendaraan || "-",
      tanggalService: formData.tanggalService || "-",
      kesimpulan: formData.kesimpulan || "-",
      catatan: formData.catatan || "",
      issues: [],
    };
    store.history.unshift(rec);
    writeLocal(store);
    return {
      success: true,
      message: "Kesimpulan tersimpan (mode lokal)",
      _local: true,
    };
  }
  if (method === "getHistoryData") {
    const f = args[0] || {};
    return store.history.filter((r) => {
      if (
        f.bulan &&
        r.tanggal?.slice(5, 7) !== String(f.bulan).padStart(2, "0")
      )
        return false;
      if (f.tahun && r.tanggal?.slice(0, 4) !== String(f.tahun)) return false;
      return true;
    });
  }
  if (method === "submitPengajuan") {
    const d = args[0] || {};
    store.pengajuan = store.pengajuan || [];
    const now = new Date().toISOString().slice(0, 10);
    const i = store.pengajuan.findIndex((p) => p.id === d.id);
    if (i >= 0) {
      store.pengajuan[i] = {
        ...store.pengajuan[i],
        status: "Menunggu",
        tanggalPengajuan: now,
        validator: "",
        tanggalValidasi: "",
        catatan: "",
      };
    } else {
      store.pengajuan.unshift({
        id: d.id,
        tanggalPengajuan: now,
        tipeKendaraan: d.tipeKendaraan || "",
        tanggalPeriksa: d.tanggal || "",
        namaPemeriksa: d.namaPemeriksa || "",
        kmKendaraan: d.kmKendaraan || "",
        kesimpulan: d.kesimpulan || "",
        status: "Menunggu",
        validator: "",
        tanggalValidasi: "",
        catatan: "",
      });
    }
    writeLocal(store);
    return { success: true, id: d.id, status: "Menunggu", _local: true };
  }
  if (method === "getPengajuan") {
    store.pengajuan = store.pengajuan || [];
    return store.pengajuan;
  }
  if (method === "validasiPengajuan") {
    const d = args[0] || {};
    store.pengajuan = store.pengajuan || [];
    const rec = store.pengajuan.find((p) => p.id === d.id);
    if (!rec) throw new Error(`Pengajuan tidak ditemukan: ${d.id}`);
    rec.status = d.status;
    rec.validator = d.validator || "";
    rec.tanggalValidasi = new Date().toISOString().slice(0, 10);
    rec.catatan = d.catatan || "";
    writeLocal(store);
    return { success: true, id: d.id, status: d.status, _local: true };
  }
  throw new Error(
    `Method ${method} belum didukung mock lokal. Isi URL Web App untuk data Sheet asli.`,
  );
}

/**
 * Panggil fungsi Code.gs dengan nama yang SAMA PERSIS:
 * getDropdownData | getLastServiceInfo | saveSectionData | saveKesimpulan | getHistoryData
 */
export async function callGas(method, ...args) {
  if (isEmbedded()) return callEmbedded(method, args);
  const url = getGasUrl();
  if (url) return callWebApp(url, method, args);
  const err = new Error(
    "Backend Sheet belum tersambung. Isi URL Web App (/exec) di pengaturan bawah, atau deploy Code.gs dulu.",
  );
  err.code = "NO_BACKEND";
  // Untuk read-only (dropdown/service/history) fallback ke mock agar form tetap bisa dibuka.
  // Untuk save, tetap lempar error supaya user tidak mengira data masuk Sheet.
  if (
    method === "getDropdownData" ||
    method === "getLastServiceInfo" ||
    method === "getHistoryData"
  ) {
    try {
      const data = await callLocalMock(method, args);
      console.warn(
        `[E-Mon SAR] ${method} memakai data lokal (belum tersambung ke Sheet).`,
      );
      return data;
    } catch {
      throw err;
    }
  }
  throw err;
}

/**
 * Kompres foto sebelum dikirim ke GAS (base64 bisa jebol limit kalau 4-8MB).
 * Output: dataURL JPEG max 1280px, kualitas 0.72.
 */
export function fileToCompressedDataUrl(file, maxDim = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          const scale = Math.min(1, maxDim / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
