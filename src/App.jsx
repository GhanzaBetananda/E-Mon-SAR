import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  VEHICLE_FULL,
  callGas,
  fileToCompressedDataUrl,
  getConnectionMode,
} from "./lib/gas.js";

const VEHICLE_DATA = {
  // HARUS sama persis dengan CONFIG.VEHICLE_FULL di Code.gs
  fullName: VEHICLE_FULL,
  shortName: "P 2006 ABC",
  unit: "Rescue Car",
};

const SECTIONS = {
  1: {
    title: "Kap Mesin",
    desc: "Pemeriksaan ruang mesin & cairan utama",
    items: [
      "Fan Belt",
      "Oli Mesin",
      "Oli Power Steering",
      "Level Minyak Rem",
      "Level Cairan Washer",
      "Baterai / Accu",
    ],
  },
  2: {
    title: "Dalam Kabin",
    desc: "Kontrol, indikator & kelengkapan kabin",
    items: [
      "Gerak Bebas Pedal Rem",
      "Instrumen Indikator",
      "Kemudahan Start Engine",
      "Langkah Tuas Rem Parkir",
      "Gerak Bebas Kemudi",
      "Klakson",
      "Level Bahan Bakar",
      "Power Window / Door Lock",
      "Sirine",
      "Radio Komunikasi",
      "Seat Belt",
      "Kaca Spion Dalam",
      "Kunci Roda dan Tool Kit",
      "AC",
    ],
  },
  3: {
    title: "Keliling Kendaraan I",
    desc: "Eksterior, lampu & kaki-kaki",
    items: [
      "Lampu-Lampu",
      "Pegas Suspensi",
      "Kebocoran / Tetesan",
      "Kondisi Kaca-Kaca",
      "Wiper",
      "Bumper",
      "Spion",
    ],
  },
  4: {
    title: "Keliling Kendaraan II",
    desc: "Kompartemen, atap & perangkat SAR",
    items: [
      "Lightbar",
      "Pengeras Suara",
      "Snorkel",
      "Kain Kanopi Bak Belakang",
      "Pintu / Engsel Kompartmen",
      "Kunci Kompartmen",
      "Rak Kompartmen",
      "Step Tangga Belakang",
      "Atap dan Step Kompartmen",
      "Antenna",
    ],
  },
  5: {
    title: "Roda dan Ban",
    desc: "Tekanan, keausan & ban cadangan",
    items: ["Tekanan Ban", "Keausan Ban", "Ban Serep"],
  },
};

const STEPS = [1, 2, 3, 4, 5];

const STATUS_OPTIONS = [
  { value: "Baik", hint: "OK" },
  { value: "Tidak Standart", hint: "Perlu perhatian" },
  { value: "Rusak", hint: "Perlu perbaikan" },
];

const MONTHS = [
  ["01", "Januari"],
  ["02", "Februari"],
  ["03", "Maret"],
  ["04", "April"],
  ["05", "Mei"],
  ["06", "Juni"],
  ["07", "Juli"],
  ["08", "Agustus"],
  ["09", "September"],
  ["10", "Oktober"],
  ["11", "November"],
  ["12", "Desember"],
];

const emptyItem = () => ({
  status: "",
  keterangan: "",
  fileData: null,
  fileName: null,
  fileType: null,
  preview: null,
});

function defaultItems(section) {
  return SECTIONS[section].items.reduce((acc, _, index) => {
    acc[index] = emptyItem();
    return acc;
  }, {});
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]} ${monthNames[Number(parts[1]) - 1] || parts[1]} ${parts[0]}`;
  }
  if (parts.length === 3) {
    return `${parts[0]} ${monthNames[Number(parts[1]) - 1] || parts[1]} ${parts[2]}`;
  }
  return dateStr;
}

function App() {
  const [activeTab, setActiveTab] = useState("form");
  const [currentSection, setCurrentSection] = useState(1);
  const [checkId, setCheckId] = useState(null);
  const [namaPemeriksa, setNamaPemeriksa] = useState("");
  const [koorPengelola, setKoorPengelola] = useState("");
  const [tanggalPengecekan, setTanggalPengecekan] = useState("");
  const [kmKendaraan, setKmKendaraan] = useState("");
  const [bbm, setBbm] = useState("");
  const [tanggalService, setTanggalService] = useState("");
  const [itemsBySection, setItemsBySection] = useState({
    1: defaultItems(1),
    2: defaultItems(2),
    3: defaultItems(3),
    4: defaultItems(4),
    5: defaultItems(5),
  });
  const [kesimpulan, setKesimpulan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [pemeriksaOptions, setPemeriksaOptions] = useState([]);
  const [koordinatorOptions, setKoordinatorOptions] = useState([]);
  const [serviceInfo, setServiceInfo] = useState({
    text: "Memuat data service...",
    tone: "loading",
    km: null,
  });
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [connMode] = useState(() => getConnectionMode());

  const currentItems = itemsBySection[currentSection];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
  }, []);

  useEffect(() => {
    setTanggalPengecekan(new Date().toISOString().split("T")[0]);
    loadDropdownData();
    loadLastServiceInfo();
  }, []);

  async function loadDropdownData() {
    try {
      const data = await callGas("getDropdownData");
      setPemeriksaOptions(data?.namaPemeriksa || []);
      setKoordinatorOptions(data?.koorPengelola || []);
    } catch (error) {
      console.error("Error load dropdown:", error);
    }
  }

  async function loadLastServiceInfo() {
    setServiceInfo({ text: "Memuat data service...", tone: "loading", km: null });
    try {
      const data = await callGas("getLastServiceInfo", VEHICLE_DATA.fullName);
      if (data?.tanggalService) {
        setTanggalService(data.tanggalService);
        setServiceInfo({
          text: `Service terakhir ${formatDateDisplay(data.tanggalService)}`,
          tone: "success",
          km: data.kmKendaraan || "-",
        });
      } else {
        setTanggalService("");
        setServiceInfo({
          text: "Belum ada data service untuk kendaraan ini",
          tone: "info",
          km: null,
        });
      }
    } catch (error) {
      console.error("Error loadLastServiceInfo:", error);
      setTanggalService("");
      setServiceInfo({
        text: `Gagal memuat data service`,
        tone: "error",
        km: null,
      });
    }
  }

  function updateItem(index, field, value) {
    setItemsBySection((previous) => ({
      ...previous,
      [currentSection]: {
        ...previous[currentSection],
        [index]: { ...previous[currentSection][index], [field]: value },
      },
    }));
  }

  function removeFile(index) {
    updateItem(index, "fileData", null);
    updateItem(index, "fileName", null);
    updateItem(index, "fileType", null);
    updateItem(index, "preview", null);
  }

  async function handleFileChange(index, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      // Kompres dulu supaya payload ke Sheet/Drive tidak jebol limit GAS
      const dataUrl = await fileToCompressedDataUrl(file);
      updateItem(index, "fileData", dataUrl);
      updateItem(index, "fileName", file.name);
      updateItem(index, "fileType", "image/jpeg");
      updateItem(index, "preview", dataUrl);
    } catch (e) {
      console.error("Gagal memproses foto:", e);
      await showAlert("Gagal memproses foto", "Coba foto lain atau ukuran lebih kecil.", "error");
    }
  }

  function goToSection(section) {
    setCurrentSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showAlert(title, text, icon = "warning") {
    if (window.Swal) {
      return window.Swal.fire({ title, text, icon, confirmButtonColor: "#ea580c" });
    }
    window.alert(`${title}\n\n${text}`);
    return Promise.resolve();
  }

  async function confirmSave(message) {
    if (window.Swal) {
      const result = await window.Swal.fire({
        title: "Simpan bagian ini?",
        text: message,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#0f172a",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Ya, simpan",
        cancelButtonText: "Batal",
      });
      return result.isConfirmed;
    }
    return window.confirm(message);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!namaPemeriksa || !koorPengelola) {
      await showAlert("Belum lengkap", "Pilih nama pemeriksa dan koordinator terlebih dahulu.");
      return;
    }
    if (!kmKendaraan) {
      await showAlert("Belum lengkap", "Masukkan KM kendaraan.");
      return;
    }
    if (currentSection === 1 && !bbm) {
      await showAlert("Belum lengkap", "Masukkan persentase BBM.");
      return;
    }
    if (!tanggalService) {
      await showAlert("Belum lengkap", "Masukkan tanggal service terakhir.");
      return;
    }
    const sectionItems = SECTIONS[currentSection].items;
    const currentItemData = itemsBySection[currentSection];
    const emptyItems = sectionItems.filter((_, index) => !currentItemData[index]?.status);
    if (emptyItems.length > 0) {
      await showAlert("Status belum lengkap", `Masih ada ${emptyItems.length} item belum dinilai: ${emptyItems.join(", ")}`);
      return;
    }
    if (currentSection === 5 && !kesimpulan) {
      await showAlert("Belum lengkap", "Pilih kesimpulan pemeriksaan.");
      return;
    }

    const items = sectionItems.map((label, index) => {
      const item = currentItemData[index] || emptyItem();
      return {
        label,
        status: item.status,
        keterangan: item.keterangan,
        fileData: item.fileData,
        fileName: item.fileName,
        fileType: item.fileType,
      };
    });

    const saveData = {
      section: currentSection,
      id: checkId,
      namaPemeriksa,
      koorPengelola,
      tanggal: tanggalPengecekan,
      kmKendaraan,
      tanggalService,
      items,
    };
    if (currentSection === 1) saveData.bbm = bbm;
    if (currentSection === 5) {
      saveData.kesimpulan = kesimpulan;
      saveData.catatan = catatan;
    }

    const message =
      currentSection === 5
        ? "Seluruh hasil 5 bagian akan diselesaikan."
        : `Bagian ${currentSection} tersimpan, lanjut ke bagian berikutnya.`;
    const confirmed = await confirmSave(message);
    if (!confirmed) return;

    setSaving(true);
    try {
      const result = await callGas("saveSectionData", saveData);
      if (!result?.success) throw new Error(result?.message || "Gagal menyimpan data");
      setCheckId(result.id);
      if (currentSection === 5) {
        await saveKesimpulan(saveData);
      } else {
        if (window.Swal) {
          await window.Swal.fire({
            icon: "success",
            title: `Bagian ${currentSection} tersimpan`,
            text: "Lanjut ke bagian berikutnya.",
            timer: 1400,
            showConfirmButton: false,
          });
        }
        if (result.nextSection) {
          setCurrentSection(result.nextSection);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    } catch (error) {
      console.error(error);
      await showAlert("Gagal menyimpan", error?.message || "Terjadi kesalahan", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveKesimpulan(data) {
    try {
      const result = await callGas("saveKesimpulan", data);
      if (!result?.success) throw new Error(result?.message || "Gagal menyimpan kesimpulan");
      if (window.Swal) {
        await window.Swal.fire({
          icon: "success",
          title: "Pemeriksaan selesai",
          text: "Semua bagian berhasil disimpan.",
          confirmButtonColor: "#0f172a",
        });
      } else {
        window.alert("Pemeriksaan selesai! Semua bagian telah berhasil disimpan.");
      }
      resetForm();
    } catch (error) {
      console.error(error);
      await showAlert("Gagal menyimpan", error?.message || "Terjadi kesalahan", "error");
    }
  }

  function resetForm() {
    const initialDate = new Date().toISOString().split("T")[0];
    setCurrentSection(1);
    setCheckId(null);
    setNamaPemeriksa("");
    setKoorPengelola("");
    setTanggalPengecekan(initialDate);
    setKmKendaraan("");
    setBbm("");
    setTanggalService("");
    setKesimpulan("");
    setCatatan("");
    setItemsBySection({
      1: defaultItems(1),
      2: defaultItems(2),
      3: defaultItems(3),
      4: defaultItems(4),
      5: defaultItems(5),
    });
    loadLastServiceInfo();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryLoaded(true);
    try {
      const data = await callGas("getHistoryData", {
        bulan: filterBulan,
        tahun: filterTahun,
      });
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setHistory([]);
      await showAlert("Gagal memuat", error?.message || "Terjadi kesalahan", "error");
    } finally {
      setHistoryLoading(false);
    }
  }

  const sectionFilled = SECTIONS[currentSection].items.filter(
    (_, i) => currentItems[i]?.status
  ).length;
  const sectionTotal = SECTIONS[currentSection].items.length;
  const overallDone = Object.keys(SECTIONS).reduce((acc, key) => {
    const list = SECTIONS[key].items;
    const filled = list.filter((_, i) => itemsBySection[key]?.[i]?.status).length;
    return acc + filled / list.length;
  }, 0);
  const overallPct = Math.round((overallDone / 5) * 100);

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-marks">
              <img
                src="https://drive.google.com/thumbnail?id=1rHgTRxcaGXoVqdPfhL0o6tvuQIElBdw-&sz=w200"
                alt="BASARNAS"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <img
                src="https://drive.google.com/thumbnail?id=1F8f2vLI7oDd1EBCIXU9TU-d4_yV5cEUI&sz=w200"
                alt="Banyuwangi"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
            <div>
              <div className="brand-title">BASARNAS Banyuwangi</div>
              <div className="brand-sub">E-Mon SAR &middot; Avignam Jagat Samagram</div>
            </div>
          </div>
          <span className={`live-pill conn-${connMode}`} title="Status koneksi ke Google Sheet">
            <span className="live-dot" />
            {connMode === "embedded"
              ? "Terhubung: Sheet"
              : connMode === "webapp"
                ? "Terhubung: Sheet"
                : "Mode lokal"}
          </span>
        </div>
      </header>

      <div className="wrap">
        <section className="hero">
          <div>
            <div className="eyebrow">Kendaraan operasional &middot; Kantor Tipe B</div>
            <h1>
              {VEHICLE_DATA.unit} <span className="plate">{VEHICLE_DATA.shortName}</span>
            </h1>
            <p className="hero-desc">
              Formulir pengecekan berkala 5 bagian. Nilai setiap item, lampirkan foto bila ada temuan,
              lalu simpan per bagian.
            </p>
          </div>
          <div className="hero-side">
            <div className="hero-progress">
              <div className="hero-progress-top">
                <span>Progres keseluruhan</span>
                <strong>{overallPct}%</strong>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${overallPct}%` }} />
              </div>
              <div className="hero-meta">
                Bagian {currentSection} dari 5 &middot; {sectionFilled}/{sectionTotal} item dinilai
              </div>
            </div>
          </div>
        </section>

        <nav className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={activeTab === "form" ? "tab is-active" : "tab"}
            onClick={() => setActiveTab("form")}
          >
            Formulir pengecekan
          </button>
          <button
            type="button"
            role="tab"
            className={activeTab === "history" ? "tab is-active" : "tab"}
            onClick={() => setActiveTab("history")}
          >
            Riwayat
            {historyLoaded && history.length > 0 ? (
              <span className="tab-count">{history.length}</span>
            ) : null}
          </button>
        </nav>

        {activeTab === "form" ? (
          <main>
            <form id="checkForm" onSubmit={handleSubmit}>
              <ol className="stepper">
                {STEPS.map((n) => {
                  const state =
                    n < currentSection ? "done" : n === currentSection ? "active" : "todo";
                  return (
                    <li key={n} className={`step ${state}`}>
                      <button
                        type="button"
                        className="step-btn"
                        onClick={() => n <= currentSection && goToSection(n)}
                        disabled={n > currentSection}
                        title={SECTIONS[n].title}
                      >
                        <span className="step-num">
                          {n < currentSection ? (
                            <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
                              <path
                                d="M3 8.5l3.2 3.2L13 5"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : (
                            n
                          )}
                        </span>
                        <span className="step-text">
                          <span className="step-name">{SECTIONS[n].title}</span>
                          <span className="step-sub">
                            {state === "done" ? "Tersimpan" : state === "active" ? "Sedang diisi" : `Bagian ${n}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              <section className="card">
                <div className="card-head">
                  <div>
                    <h2>Informasi umum</h2>
                    <p>Data pemeriksa dan kondisi awal kendaraan.</p>
                  </div>
                  <span className="card-no">01</span>
                </div>

                <div className="field-grid cols-2">
                  <label className="field">
                    <span>Nama pemeriksa</span>
                    <select
                      value={namaPemeriksa}
                      onChange={(e) => setNamaPemeriksa(e.target.value)}
                      required
                    >
                      <option value="">Pilih nama…</option>
                      {pemeriksaOptions.map((name) => (
                        <option value={name} key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Koordinator pengelola</span>
                    <select
                      value={koorPengelola}
                      onChange={(e) => setKoorPengelola(e.target.value)}
                      required
                    >
                      <option value="">Pilih koordinator…</option>
                      {koordinatorOptions.map((name) => (
                        <option value={name} key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="field-grid cols-3">
                  <label className="field">
                    <span>Tanggal pengecekan</span>
                    <input
                      type="date"
                      value={tanggalPengecekan}
                      onChange={(e) => setTanggalPengecekan(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>KM kendaraan</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="cth. 45210"
                      value={kmKendaraan}
                      onChange={(e) => setKmKendaraan(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>BBM (%)</span>
                    <input
                      type="number"
                      placeholder="0–100"
                      min="0"
                      max="100"
                      value={bbm}
                      onChange={(e) => setBbm(e.target.value)}
                      required={currentSection === 1}
                    />
                  </label>
                </div>

                <div className="service-row">
                  <label className="field grow">
                    <span>Tanggal service terakhir</span>
                    <input
                      type="date"
                      value={tanggalService}
                      onChange={(e) => setTanggalService(e.target.value)}
                      required
                    />
                  </label>
                  <div className={`service-note ${serviceInfo.tone}`}>
                    <span className="service-dot" />
                    <div>
                      <div className="service-text">{serviceInfo.text}</div>
                      {serviceInfo.km !== null && (
                        <div className="service-km">KM service: {serviceInfo.km}</div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="card">
                <div className="card-head">
                  <div>
                    <div className="eyebrow small">
                      Bagian {currentSection} &middot; {sectionFilled}/{sectionTotal} selesai
                    </div>
                    <h2>{SECTIONS[currentSection].title}</h2>
                    <p>{SECTIONS[currentSection].desc}</p>
                  </div>
                  <span className="card-no">02</span>
                </div>

                <div className="check-list">
                  {SECTIONS[currentSection].items.map((item, index) => {
                    const itemData = currentItems[index] || emptyItem();
                    const inputId = `file_${currentSection}_${index}`;
                    return (
                      <div
                        key={item}
                        className={`check-item ${itemData.status ? `is-${slug(itemData.status)}` : ""}`}
                      >
                        <div className="check-top">
                          <span className="check-num">{String(index + 1).padStart(2, "0")}</span>
                          <div className="check-title">
                            <strong>{item}</strong>
                            <span className="check-state">
                              {itemData.status || "Belum dinilai"}
                            </span>
                          </div>
                          {itemData.preview && (
                            <img src={itemData.preview} alt="" className="check-thumb" />
                          )}
                        </div>

                        <div
                          className="seg"
                          role="radiogroup"
                          aria-label={`Status ${item}`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={itemData.status === opt.value}
                              className={`seg-btn seg-${slug(opt.value)} ${itemData.status === opt.value ? "is-on" : ""}`}
                              onClick={() => updateItem(index, "status", opt.value)}
                            >
                              {opt.value}
                            </button>
                          ))}
                        </div>

                        <div className="check-bottom">
                          <input
                            type="text"
                            className="ghost-input"
                            placeholder="Keterangan (opsional)…"
                            value={itemData.keterangan}
                            onChange={(e) => updateItem(index, "keterangan", e.target.value)}
                          />
                          <label className="upload-btn" htmlFor={inputId}>
                            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                              <path
                                d="M8 10V2M5 5l3-3 3 3M2.5 11v2.5A1 1 0 003.5 14.5h9a1 1 0 001-1V11"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            {itemData.fileName ? "Ganti foto" : "Foto"}
                            <input
                              id={inputId}
                              type="file"
                              hidden
                              accept="image/*"
                              onChange={(e) => handleFileChange(index, e)}
                            />
                          </label>
                        </div>

                        {itemData.fileName && (
                          <div className="file-line">
                            <span className="file-name">{itemData.fileName}</span>
                            <button type="button" className="link-danger" onClick={() => removeFile(index)}>
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {currentSection === 5 && (
                  <div className="conclusion">
                    <h3>Kesimpulan pemeriksaan</h3>
                    <div className="field-grid cols-2">
                      <label className="field">
                        <span>Hasil akhir</span>
                        <select
                          value={kesimpulan}
                          onChange={(e) => setKesimpulan(e.target.value)}
                          required
                        >
                          <option value="">Pilih kesimpulan…</option>
                          <option value="Layak Operasi">Layak operasi</option>
                          <option value="Layak Operasi dengan Perbaikan">
                            Layak operasi dengan perbaikan
                          </option>
                          <option value="Tidak Layak Operasi">Tidak layak operasi</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Catatan tambahan</span>
                        <input
                          type="text"
                          placeholder="cth. Perlu ganti wiper depan…"
                          value={catatan}
                          onChange={(e) => setCatatan(e.target.value)}
                        />
                      </label>
                    </div>
                    {catatan === "" && (
                      <textarea
                        rows="2"
                        placeholder="Atau tulis catatan panjang di sini… (opsional)"
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                      />
                    )}
                  </div>
                )}
              </section>

              <div className="action-bar">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={currentSection === 1}
                  onClick={() => goToSection(currentSection - 1)}
                >
                  ← Kembali
                </button>
                <div className="action-hint">
                  {sectionTotal - sectionFilled === 0
                    ? "Semua item sudah dinilai"
                    : `${sectionTotal - sectionFilled} item belum dinilai`}
                </div>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving
                    ? "Menyimpan…"
                    : currentSection === 5
                      ? "Selesaikan pemeriksaan"
                      : `Simpan bagian ${currentSection} →`}
                </button>
              </div>
            </form>
          </main>
        ) : (
          <main>
            <section className="card">
              <div className="card-head">
                <div>
                  <h2>Riwayat pengecekan</h2>
                  <p>Filter berdasarkan bulan dan tahun, lalu tampilkan.</p>
                </div>
                <span className="card-no">⟡</span>
              </div>
              <div className="field-grid cols-3">
                <label className="field">
                  <span>Bulan</span>
                  <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}>
                    <option value="">Semua bulan</option>
                    {MONTHS.map(([value, label]) => (
                      <option value={value} key={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Tahun</span>
                  <select value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}>
                    <option value="">Semua tahun</option>
                    {years.map((year) => (
                      <option value={year} key={year}>{year}</option>
                    ))}
                  </select>
                </label>
                <div className="field field-btn">
                  <span>&nbsp;</span>
                  <button
                    className="btn primary full"
                    type="button"
                    onClick={loadHistory}
                    disabled={historyLoading}
                  >
                    {historyLoading ? "Memuat…" : "Tampilkan"}
                  </button>
                </div>
              </div>
            </section>

            <div className="history-list">
              {!historyLoaded ? (
                <div className="empty">
                  <strong>Belum ada data ditampilkan</strong>
                  <p>Pilih filter lalu klik “Tampilkan”.</p>
                </div>
              ) : historyLoading ? (
                <div className="empty">
                  <strong>Memuat riwayat…</strong>
                  <p>Mohon tunggu sebentar.</p>
                </div>
              ) : history.length === 0 ? (
                <div className="empty">
                  <strong>Tidak ada data</strong>
                  <p>Tidak ditemukan riwayat untuk filter tersebut.</p>
                </div>
              ) : (
                history.map((record, index) => (
                  <HistoryCard record={record} key={record.id || index} />
                ))
              )}
            </div>
          </main>
        )}

        <footer className="foot">
          E-Mon SAR &middot; Rescue Car {VEHICLE_DATA.shortName} &middot; BASARNAS Banyuwangi
        </footer>
      </div>
    </div>
  );
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function HistoryCard({ record }) {
  const issues = record?.issues || [];
  return (
    <article className="card history">
      <div className="history-top">
        <div>
          <strong className="history-name">{record?.namaPemeriksa || "-"}</strong>
          <div className="history-date">
            {record?.tanggal ? formatDateDisplay(record.tanggal) : "-"}
          </div>
        </div>
        <span className={`status-pill ${slug(record?.kesimpulan || "baik")}`}>
          {record?.kesimpulan || "-"}
        </span>
      </div>

      <dl className="history-grid">
        <div><dt>Koordinator</dt><dd>{record?.koorPengelola || "-"}</dd></div>
        <div><dt>KM</dt><dd>{record?.kmKendaraan || "-"}</dd></div>
        <div><dt>Service</dt><dd>{record?.tanggalService ? formatDateDisplay(record.tanggalService) : "-"}</dd></div>
      </dl>

      {record?.catatan && <p className="history-note">“{record.catatan}”</p>}

      {issues.length === 0 ? (
        <div className="ok-line">
          <span className="ok-dot" /> Tidak ada temuan — semua item baik.
        </div>
      ) : (
        <ul className="issue-list">
          {issues.map((issue, i) => (
            <li key={issue.id || i} className="issue">
              <span className="issue-part">{issue.bagian || "-"}</span>
              <span className="issue-item">{issue.item || "-"}</span>
              <span className={`issue-status st-${slug(issue.status || "")}`}>
                {issue.status || "-"}
              </span>
              {issue.keterangan && <span className="issue-note">{issue.keterangan}</span>}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default App;
