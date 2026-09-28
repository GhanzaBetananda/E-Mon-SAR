import { useEffect, useState } from "react";
import "./App.css";
import Pimpinan from "./Pimpinan.jsx";
import {
  VEHICLES,
  callGas,
  fileToCompressedDataUrl,
  getConnectionMode,
} from "./lib/gas.js";
import {
  confirmIncomplete,
  confirmSave,
  showAlert,
  showError,
  showSuccess,
  showSuccessToast,
} from "./lib/swal.js";

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

function defaultAllItems() {
  return {
    1: defaultItems(1),
    2: defaultItems(2),
    3: defaultItems(3),
    4: defaultItems(4),
    5: defaultItems(5),
  };
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

const PIMPINAN_CODE = "181115";

function App() {
  const [view, setView] = useState("form"); // "form" | "pimpinan"
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [currentSection, setCurrentSection] = useState(1);
  const [checkId, setCheckId] = useState(null);
  const [namaPemeriksa, setNamaPemeriksa] = useState("");
  const [koorPengelola, setKoorPengelola] = useState("");
  const [tanggalPengecekan, setTanggalPengecekan] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [kmKendaraan, setKmKendaraan] = useState("");
  const [bbm, setBbm] = useState("");
  const [tanggalService, setTanggalService] = useState("");
  const [itemsBySection, setItemsBySection] = useState(defaultAllItems);
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
  const [connMode] = useState(() => getConnectionMode());

  const vehicle = VEHICLES[vehicleIndex] || VEHICLES[0];
  const currentItems = itemsBySection[currentSection];

  useEffect(() => {
    loadDropdownData();
    loadLastServiceInfo(VEHICLES[0].fullName);
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

  async function loadLastServiceInfo(vehicleFullName) {
    setServiceInfo({ text: "Memuat data service...", tone: "loading", km: null });
    try {
      const data = await callGas("getLastServiceInfo", vehicleFullName);
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

  function handleVehicleChange(index) {
    if (index === vehicleIndex) return;
    setVehicleIndex(index);
    // Ganti kendaraan = mulai pengecekan baru untuk kendaraan tsb
    setCurrentSection(1);
    setCheckId(null);
    setKesimpulan("");
    setCatatan("");
    setItemsBySection(defaultAllItems());
    loadLastServiceInfo(VEHICLES[index].fullName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getEmptyItems(section) {
    const labels = SECTIONS[section].items;
    const data = itemsBySection[section];
    return labels.filter((_, index) => !data?.[index]?.status);
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

  // Navigasi bebas: boleh pindah ke bagian mana pun.
  // Kalau bagian saat ini masih ada yang belum diisi -> popup konfirmasi dulu.
  async function goToSection(section) {
    if (section === currentSection) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const empty = getEmptyItems(currentSection);
    if (empty.length > 0) {
      const yakin = await confirmIncomplete(
        `Bagian ${currentSection} belum lengkap`,
        `Masih ada ${empty.length} item belum dinilai: ${empty.join(", ")}. Yakin lanjut ke Bagian ${section} (${SECTIONS[section].title})?`
      );
      if (!yakin) return;
    }
    setCurrentSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openPin() {
    setPin("");
    setPinError("");
    setShowPin(true);
  }

  function submitPin(e) {
    e?.preventDefault?.();
    if (pin.trim() === PIMPINAN_CODE) {
      setShowPin(false);
      setPin("");
      setPinError("");
      setView("pimpinan");
      window.scrollTo({ top: 0 });
    } else {
      setPinError("Kode salah. Masukkan 6 digit yang benar.");
    }
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
    const emptyItems = getEmptyItems(currentSection);
    // Tidak lagi diblokir: kalau ada yang kosong, tampilkan popup konfirmasi dulu
    if (emptyItems.length > 0) {
      const yakin = await confirmIncomplete(
        `Bagian ${currentSection} belum lengkap`,
        `Masih ada ${emptyItems.length} item belum dinilai: ${emptyItems.join(", ")}. Yakin simpan dan lanjut dengan kondisi ini?`
      );
      if (!yakin) return;
    }
    if (currentSection === 5 && !kesimpulan) {
      await showAlert("Belum lengkap", "Pilih kesimpulan pemeriksaan.");
      return;
    }

    const currentItemData = itemsBySection[currentSection];
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
      tipeKendaraan: vehicle.fullName,
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
        ? `Selesaikan pemeriksaan ${vehicle.unit} (${vehicle.shortName})?`
        : `Simpan Bagian ${currentSection} untuk ${vehicle.shortName}, lalu lanjut ke bagian berikutnya.`;
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
        await showSuccessToast(`Bagian ${currentSection} tersimpan`, "Lanjut ke bagian berikutnya.");
        if (result.nextSection) {
          setCurrentSection(result.nextSection);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    } catch (error) {
      console.error(error);
      await showError("Gagal menyimpan", error?.message || "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  async function saveKesimpulan(data) {
    try {
      const result = await callGas("saveKesimpulan", data);
      if (!result?.success) throw new Error(result?.message || "Gagal menyimpan kesimpulan");
      await showSuccess(
        "Pemeriksaan selesai",
        `Semua bagian ${vehicle.unit} (${vehicle.shortName}) berhasil disimpan.`
      );
      resetForm();
    } catch (error) {
      console.error(error);
      await showError("Gagal menyimpan", error?.message || "Terjadi kesalahan");
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
    setItemsBySection(defaultAllItems());
    loadLastServiceInfo(vehicle.fullName);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  if (view === "pimpinan") {
    return <Pimpinan onExit={() => setView("form")} />;
  }

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
          <div className="topbar-actions">
            <span className={`live-pill conn-${connMode}`} title="Status koneksi ke Google Sheet">
              <span className="live-dot" />
              {connMode === "local" ? "Mode lokal" : "Terhubung: Sheet"}
            </span>
            <button type="button" className="lead-btn" onClick={openPin}>
              Masuk Pimpinan
            </button>
          </div>
        </div>
      </header>

      <div className="wrap">
        <section className="hero">
          <div>
            <div className="eyebrow">Kendaraan operasional &middot; Kantor Tipe B</div>
            <h1>
              {vehicle.unit} <span className="plate">{vehicle.shortName}</span>
            </h1>
            <p className="hero-desc">
              Formulir pengecekan berkala 5 bagian. Pilih kendaraan, nilai setiap item,
              lalu simpan per bagian. Bebas pindah bagian kapan saja.
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

        <main>
          <form id="checkForm" onSubmit={handleSubmit}>
            <section className="card">
              <div className="card-head">
                <div>
                  <h2>Pilih kendaraan</h2>
                  <p>Kendaraan yang akan dicek saat ini.</p>
                </div>
                <span className="card-no">◎</span>
              </div>
              <div className="vehicle-grid" role="radiogroup" aria-label="Pilih kendaraan">
                {VEHICLES.map((v, idx) => (
                  <button
                    key={v.fullName}
                    type="button"
                    role="radio"
                    aria-checked={idx === vehicleIndex}
                    className={`vehicle-btn ${idx === vehicleIndex ? "is-on" : ""}`}
                    onClick={() => handleVehicleChange(idx)}
                  >
                    <span className="vehicle-unit">{v.unit}</span>
                    <span className="vehicle-plate">{v.shortName}</span>
                  </button>
                ))}
              </div>
            </section>

            <ol className="stepper">
              {STEPS.map((n) => {
                const filled = SECTIONS[n].items.filter(
                  (_, i) => itemsBySection[n]?.[i]?.status
                ).length;
                const total = SECTIONS[n].items.length;
                const state =
                  n === currentSection ? "active" : filled === total ? "done" : filled > 0 ? "half" : "todo";
                return (
                  <li key={n} className={`step ${state}`}>
                    <button
                      type="button"
                      className="step-btn"
                      onClick={() => goToSection(n)}
                      title={`${SECTIONS[n].title} (${filled}/${total})`}
                    >
                      <span className="step-num">
                        {filled === total && n !== currentSection ? (
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
                          {n === currentSection
                            ? "Sedang diisi"
                            : filled === total
                              ? "Lengkap"
                              : filled > 0
                                ? `${filled}/${total} diisi`
                                : `Bagian ${n}`}
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
                  <p>Data pemeriksa dan kondisi awal {vehicle.unit}.</p>
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

        <footer className="foot">
          E-Mon SAR &middot; {vehicle.unit} {vehicle.shortName} &middot; BASARNAS Banyuwangi
        </footer>
      </div>

      {showPin && (
        <div className="modal-overlay" onClick={() => setShowPin(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Login pimpinan">
            <h2>Kode Pimpinan</h2>
            <p>Masukkan kode 6 digit untuk membuka panel pimpinan.</p>
            <form onSubmit={submitPin}>
              <input
                className="pin-input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                maxLength={6}
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              {pinError && <div className="pin-error">{pinError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setShowPin(false)}>
                  Batal
                </button>
                <button type="submit" className="btn primary" disabled={pin.length !== 6}>
                  Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default App;
