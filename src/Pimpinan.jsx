import { useEffect, useMemo, useState } from "react";
import "./Pimpinan.css";
import { callGas, VEHICLES } from "./lib/gas.js";
import { SECTIONS, REPORT_COLUMNS } from "./lib/sections.js";
import Swal, { showError, showSuccessToast } from "./lib/swal.js";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "DD-MM-YYYY" (dari GAS) -> "YYYY-MM-DD". Kalau sudah ISO, kembalikan apa adanya. */
function toISO(tgl) {
  if (!tgl || typeof tgl !== "string") return "";
  const s = tgl.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return "";
}

function displayDate(tgl) {
  const iso = toISO(tgl);
  if (!iso) return tgl || "-";
  const [y, mo, d] = iso.split("-");
  return `${d} ${MONTH_NAMES[Number(mo) - 1] || mo} ${y}`;
}

function displayMonth(ym) {
  if (!ym) return "";
  const [y, mo] = ym.split("-");
  return `${MONTH_NAMES[Number(mo) - 1] || mo} ${y}`;
}

function matchVehicle(recordVehicle, filter) {
  if (!filter || filter === "semua") return true;
  const a = String(recordVehicle || "").toLowerCase().trim();
  const b = String(filter || "").toLowerCase().trim();
  return a.includes(b) || b.includes(a);
}

function slug(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function pfStatusLabel(v) {
  if (v === "menunggu") return "Menunggu";
  if (v === "disetujui") return "Disetujui";
  if (v === "ditolak") return "Ditolak";
  if (v === "belum") return "Belum diajukan";
  return v;
}

/** Pecah "Rescue Truck - W 8653 NP" -> { unit, plate, full }. */
function parseVehicle(record) {
  const full = String(record?.tipeKendaraan || "").trim();
  const found = VEHICLES.find((v) => v.fullName.toLowerCase() === full.toLowerCase());
  if (found) return { unit: found.unit, plate: found.shortName, full: found.fullName };
  const dash = full.indexOf(" - ");
  if (dash > 0) {
    return { unit: full.slice(0, dash).trim(), plate: full.slice(dash + 3).trim(), full };
  }
  return { unit: full || "-", plate: "-", full: full || "-" };
}

/** Status satu item (kolom checklist) dari data sections backend. */
function sectionStatus(record, sectionNo, itemIdx) {
  const secs = record?.sections || {};
  const sec = secs[sectionNo] ?? secs[String(sectionNo)];
  const st = sec?.statuses?.[itemIdx];
  return String(st || "").trim();
}

function SectionCheckTable({ no, record }) {
  const items = SECTIONS[no].items;
  return (
    <table className="report-table check-table">
      <thead>
        <tr>
          <th colSpan={4} className="sec-title">
            Bagian {no} — {SECTIONS[no].title}
          </th>
        </tr>
        <tr>
          <th>Nama Bagian</th>
          <th className="center st-col">Baik</th>
          <th className="center st-col">Tidak Standart</th>
          <th className="center st-col">Rusak</th>
        </tr>
      </thead>
      <tbody>
        {items.map((label, i) => {
          const st = sectionStatus(record, no, i);
          return (
            <tr key={label}>
              <td>{label}</td>
              <td className="center">{st === "Baik" ? "✓" : ""}</td>
              <td className="center">{st === "Tidak Standart" ? "✓" : ""}</td>
              <td className="center">{st === "Rusak" ? "✓" : ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function InspectionPage({ record }) {
  const v = parseVehicle(record);
  const catatan = record?.catatan && record.catatan !== "-" ? record.catatan : "";
  const bbm =
    record?.bbm && String(record.bbm).trim() !== "" ? `${record.bbm} %` : "........";
  return (
    <section className="report-page" aria-label="Formulir pemeriksaan harian">
      <div className="kop kop-form">
        <div className="kop-text">
          <div className="kop-form-title">
            FORMAT PEMERIKSAAN HARIAN {v.unit.toUpperCase()}
          </div>
          <div className="kop-form-sub">BADAN NASIONAL PENCARIAN DAN PERTOLONGAN</div>
        </div>
        <div className="kop-logos">
          <img
            src="/456.png"
            alt=""
            className="kop-logo"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <img
            src="/472.png"
            alt=""
            className="kop-logo"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>
      </div>
      <div className="kop-rule" />

      <div className="ident">
        <div className="ident-item"><span>Jenis Kendaraan</span><b>{v.unit}</b></div>
        <div className="ident-item"><span>Tanggal Pemeriksaan</span><b>{displayDate(record.tanggal)}</b></div>
        <div className="ident-item"><span>Tipe Kendaraan</span><b>{v.full}</b></div>
        <div className="ident-item"><span>Nomor Polisi</span><b>{v.plate}</b></div>
        <div className="ident-item"><span>Tahun Pengadaan</span><b>........</b></div>
        <div className="ident-item"><span>BBM (%)</span><b>{bbm}</b></div>
        <div className="ident-item"><span>KM</span><b>{record.kmKendaraan || "-"}</b></div>
      </div>

      <div className="check-cols">
        {REPORT_COLUMNS.map((col, ci) => (
          <div className="check-col" key={ci}>
            {col.map((no) => (
              <SectionCheckTable key={no} no={no} record={record} />
            ))}
          </div>
        ))}
      </div>

      <div className="legend">
        <span className="legend-title">Klasifikasi:</span>
        <span className="lg lg-baik">Baik</span>
        <span className="lg lg-ts">Tidak Standart</span>
        <span className="lg lg-rusak">Rusak</span>
      </div>

      <div className="note-box">
        <div className="note-box-title">Catatan:</div>
        <div className="note-box-body">{catatan}</div>
      </div>

      <div className="report-sign">
        <div>
          <div>Kepala Sumber Daya</div>
          <div className="sign-space" />
          <div className="sign-name">( ............................................ )</div>
          <div>NIP. ........................................</div>
        </div>
        <div>
          <div>Banyuwangi, {displayDate(new Date().toISOString().split("T")[0])}</div>
          <div>Koordinator Tim Siaga</div>
          <div className="sign-space" />
          <div className="sign-name">( ............................................ )</div>
          <div>NIP. ........................................</div>
        </div>
      </div>
    </section>
  );
}

function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Pimpinan({ onExit }) {
  const [records, setRecords] = useState([]);
  const [pengajuan, setPengajuan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pfMonth, setPfMonth] = useState(""); // YYYY-MM
  const [pfVehicle, setPfVehicle] = useState("semua");
  const [pfStatus, setPfStatus] = useState("semua"); // semua|menunggu|disetujui|ditolak|belum
  const [viewPdf, setViewPdf] = useState(null);
  const [validating, setValidating] = useState(null);
  // Laporan bulanan (PDF)
  const [reportMonth, setReportMonth] = useState(currentYearMonth);
  const [reportVehicle, setReportVehicle] = useState("semua");
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await callGas("getHistoryData", { bulan: "", tahun: "" });
      setRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Gagal memuat data.");
      setRecords([]);
    }
    try {
      const peng = await callGas("getPengajuan");
      setPengajuan(Array.isArray(peng) ? peng : []);
    } catch (e) {
      console.error("Gagal memuat pengajuan:", e);
      setPengajuan([]);
    } finally {
      setLoading(false);
    }
  }

  const pengMap = useMemo(() => {
    const map = {};
    pengajuan.forEach((p) => {
      if (p?.id) map[p.id] = p;
    });
    return map;
  }, [pengajuan]);

  function pengajuanStatus(r) {
    return pengMap[r.id]?.status || "Belum diajukan";
  }

  function countTemuan(r) {
    return (r?.issues || []).filter((it) => {
      const st = String(it?.status || "").toLowerCase();
      return st !== "baik" && st !== "" && st !== "-";
    }).length;
  }

  const allRecords = useMemo(() => {
    return records
      .map((r) => ({ ...r, _iso: toISO(r?.tanggal) }))
      .sort((a, b) => (b._iso || "").localeCompare(a._iso || ""));
  }, [records]);

  const pengajuanList = useMemo(() => {
    return allRecords.filter((r) => {
      if (pfMonth && r._iso.slice(0, 7) !== pfMonth) return false;
      if (!matchVehicle(r?.tipeKendaraan, pfVehicle)) return false;
      if (pfStatus !== "semua") {
        const st = pengMap[r.id]?.status || "Belum diajukan";
        if (pfStatus === "belum") {
          if (st !== "Belum diajukan") return false;
        } else if (st.toLowerCase() !== pfStatus) return false;
      }
      return true;
    });
  }, [allRecords, pengMap, pfMonth, pfVehicle, pfStatus]);

  const pengStats = useMemo(() => {
    let menunggu = 0;
    let disetujui = 0;
    let ditolak = 0;
    pengajuanList.forEach((r) => {
      const st = pengMap[r.id]?.status || "Belum diajukan";
      if (st === "Menunggu") menunggu += 1;
      else if (st === "Disetujui") disetujui += 1;
      else if (st === "Ditolak") ditolak += 1;
    });
    return { menunggu, disetujui, ditolak, total: pengajuanList.length };
  }, [pengajuanList, pengMap]);

  // Data laporan bulanan: SEMUA pemeriksaan pada bulan terpilih (termasuk yang tanpa temuan)
  const reportRecords = useMemo(() => {
    if (!showReport) return [];
    return records
      .map((r) => ({ ...r, _iso: toISO(r?.tanggal) }))
      .filter((r) => {
        if (reportMonth && r._iso.slice(0, 7) !== reportMonth) return false;
        if (!matchVehicle(r?.tipeKendaraan, reportVehicle)) return false;
        return true;
      })
      .sort((a, b) => (a._iso || "").localeCompare(b._iso || ""));
  }, [records, showReport, reportMonth, reportVehicle]);

  const pfHasFilter = pfMonth !== "" || pfVehicle !== "semua" || pfStatus !== "semua";

  function resetPengajuanFilter() {
    setPfMonth("");
    setPfVehicle("semua");
    setPfStatus("semua");
  }

  async function refreshPengajuan() {
    try {
      const peng = await callGas("getPengajuan");
      setPengajuan(Array.isArray(peng) ? peng : []);
    } catch (e) {
      console.error("Gagal memuat pengajuan:", e);
    }
  }

  async function handleSetujui(r) {
    const res = await Swal.fire({
      title: "Setujui pengajuan?",
      text: `${r.tipeKendaraan || "-"} — ${displayDate(r.tanggal)}`,
      input: "text",
      inputLabel: "Nama validator",
      inputPlaceholder: "cth. Nur Kholis Majid",
      showCancelButton: true,
      confirmButtonText: "Setujui",
      cancelButtonText: "Batal",
      confirmButtonColor: "#16a34a",
      inputValidator: (v) => (!String(v || "").trim() ? "Isi nama validator dahulu." : undefined),
    });
    if (!res.isConfirmed) return;
    setValidating(r.id);
    try {
      const out = await callGas("validasiPengajuan", {
        id: r.id,
        status: "Disetujui",
        validator: res.value.trim(),
        catatan: "",
      });
      if (!out?.success) throw new Error(out?.message || "Gagal menyimpan validasi");
      await refreshPengajuan();
      await showSuccessToast("Pengajuan disetujui", r.tipeKendaraan || "");
    } catch (e) {
      console.error(e);
      await showError("Gagal memvalidasi", e?.message || "Terjadi kesalahan");
    } finally {
      setValidating(null);
    }
  }

  async function handleTolak(r) {
    const res = await Swal.fire({
      title: "Tolak pengajuan?",
      text: `${r.tipeKendaraan || "-"} — ${displayDate(r.tanggal)}`,
      html:
        '<input id="pj-validator" class="swal2-input" placeholder="Nama validator">' +
        '<textarea id="pj-catatan" class="swal2-textarea" placeholder="Alasan penolakan (opsional)"></textarea>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Tolak",
      cancelButtonText: "Batal",
      confirmButtonColor: "#b42318",
      preConfirm: () => {
        const validator = document.getElementById("pj-validator")?.value.trim() || "";
        const catatan = document.getElementById("pj-catatan")?.value.trim() || "";
        if (!validator) Swal.showValidationMessage("Isi nama validator dahulu.");
        return { validator, catatan };
      },
    });
    if (!res.isConfirmed) return;
    setValidating(r.id);
    try {
      const out = await callGas("validasiPengajuan", {
        id: r.id,
        status: "Ditolak",
        validator: res.value.validator,
        catatan: res.value.catatan,
      });
      if (!out?.success) throw new Error(out?.message || "Gagal menyimpan validasi");
      await refreshPengajuan();
      await showSuccessToast("Pengajuan ditolak", r.tipeKendaraan || "");
    } catch (e) {
      console.error(e);
      await showError("Gagal memvalidasi", e?.message || "Terjadi kesalahan");
    } finally {
      setValidating(null);
    }
  }

  function openPdf(r) {
    setShowReport(false);
    setViewPdf(r);
    window.scrollTo({ top: 0 });
  }

  function printSinglePdf() {
    if (!viewPdf) return;
    const prev = document.title;
    document.title = `PDF E-Mon SAR - ${viewPdf.tipeKendaraan || viewPdf.id} - ${viewPdf._iso || ""}`;
    window.print();
    setTimeout(() => {
      document.title = prev;
    }, 800);
  }

  function handlePrint() {
    // Judul dokumen dipakai sebagai nama file PDF saat "Save as PDF"
    const prev = document.title;
    document.title = `Laporan Bulanan E-Mon SAR - ${displayMonth(reportMonth)}`;
    window.print();
    setTimeout(() => {
      document.title = prev;
    }, 800);
  }

  return (
    <div className={showReport || viewPdf ? "page report-mode" : "page"}>
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
              <div className="brand-title">Panel Pimpinan</div>
              <div className="brand-sub">E-Mon SAR &middot; Validasi pemeriksaan</div>
            </div>
          </div>
          <button type="button" className="pim-back" onClick={onExit}>
            &larr; Form pemeriksa
          </button>
        </div>
      </header>

      <div className="wrap pim-wrap">
        <section className="pim-hero">
          <div>
            <div className="eyebrow">Pengajuan dari pemeriksa via WhatsApp</div>
            <h1>Daftar PDF Pengecekan Kendaraan</h1>
            <p>
              {pfMonth ? <>Bulan {displayMonth(pfMonth)}</> : "Semua periode"}
              {pfVehicle !== "semua" ? <> &middot; {pfVehicle}</> : ""}
              {pfStatus !== "semua" ? <> &middot; {pfStatusLabel(pfStatus)}</> : ""}
            </p>
          </div>
          <button type="button" className="btn primary" onClick={load} disabled={loading}>
            {loading ? "Memuat\u2026" : "Muat ulang"}
          </button>
        </section>

        <div className="pim-stats">
          <div className="pim-stat is-warn">
            <span className="pim-stat-num">{pengStats.menunggu}</span>
            <span className="pim-stat-label">Menunggu validasi</span>
          </div>
          <div className="pim-stat is-ok">
            <span className="pim-stat-num">{pengStats.disetujui}</span>
            <span className="pim-stat-label">Disetujui</span>
          </div>
          <div className="pim-stat is-danger">
            <span className="pim-stat-num">{pengStats.ditolak}</span>
            <span className="pim-stat-label">Ditolak</span>
          </div>
          <div className="pim-stat">
            <span className="pim-stat-num">{pengStats.total}</span>
            <span className="pim-stat-label">Total pemeriksaan</span>
          </div>
        </div>

        <section
          className={`card report-builder ${showReport ? "is-preview-open" : ""}`}
          onClick={() => {
            if (showReport) setShowReport(false);
          }}
          onKeyDown={(e) => {
            if (showReport && (e.key === "Escape" || (e.key === "Enter" && e.target === e.currentTarget))) {
              setShowReport(false);
            }
          }}
          tabIndex={showReport ? 0 : undefined}
          title={showReport ? "Klik kartu ini untuk menutup pratinjau" : undefined}
        >
          <div className="card-head">
            <div>
              <h2>Laporan Bulanan (PDF)</h2>
              <p>
                {showReport
                  ? "Pratinjau ditampilkan di bawah. Klik kartu ini untuk menutup."
                  : "Pilih bulan dan kendaraan, tampilkan pratinjau berkop surat, lalu cetak / simpan sebagai PDF."}
              </p>
            </div>
            <span className="card-no">▤</span>
          </div>
          <div className="report-form" onClick={(e) => e.stopPropagation()}>
            <label className="field">
              <span>Bulan laporan</span>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Kendaraan</span>
              <select
                value={reportVehicle}
                onChange={(e) => setReportVehicle(e.target.value)}
              >
                <option value="semua">Semua kendaraan</option>
                {VEHICLES.map((v) => (
                  <option value={v.fullName} key={v.fullName}>
                    {v.unit} — {v.shortName}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn primary"
              type="button"
              onClick={() => { setViewPdf(null); setShowReport(true); }}
              disabled={loading || !reportMonth}
            >
              {loading ? "Memuat…" : "▤ Tampilkan Pratinjau"}
            </button>
          </div>
        </section>

        {showReport && (
          <>
            <section className="report-paper" aria-label="Pratinjau laporan bulanan">
              {reportRecords.length === 0 ? (
                <p className="report-nihil">Tidak ada data pemeriksaan pada periode ini.</p>
              ) : (
                reportRecords.map((r) => (
                  <InspectionPage key={r.id || r._iso} record={r} />
                ))
              )}
            </section>

            <div className="action-bar no-print">
              <button type="button" className="btn ghost" onClick={() => setShowReport(false)}>
                ← Tutup
              </button>
              <div className="action-hint report-hint">
                Pratinjau: <strong>{displayMonth(reportMonth)}</strong>
                {reportVehicle !== "semua" ? ` • ${reportVehicle}` : " • Semua Kendaraan"}
              </div>
              <button type="button" className="btn primary" onClick={handlePrint}>
                ⎙ Cetak / Simpan PDF
              </button>
            </div>
          </>
        )}

        {viewPdf && (
          <>
            <section className="report-paper" aria-label="PDF pengecekan kendaraan">
              <InspectionPage record={viewPdf} />
            </section>
            <div className="action-bar no-print">
              <button type="button" className="btn ghost" onClick={() => setViewPdf(null)}>
                ← Tutup
              </button>
              <div className="action-hint report-hint">
                PDF: <strong>{viewPdf.tipeKendaraan || "-"}</strong>
                {viewPdf.tanggal ? ` • ${displayDate(viewPdf.tanggal)}` : ""}
              </div>
              <button type="button" className="btn primary" onClick={printSinglePdf}>
                ⎙ Cetak / Simpan PDF
              </button>
            </div>
          </>
        )}

        <section className="card pim-filters">
          <div className="card-head">
            <div>
              <h2>Daftar pengajuan</h2>
              <p>Semua PDF pengecekan kendaraan. Saring, lihat PDF, lalu validasi.</p>
            </div>
            <span className="card-no">☰</span>
          </div>
          <div className="field-grid cols-3">
            <label className="field">
              <span>Bulan</span>
              <input
                type="month"
                value={pfMonth}
                onChange={(e) => setPfMonth(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Kendaraan</span>
              <select
                value={pfVehicle}
                onChange={(e) => setPfVehicle(e.target.value)}
              >
                <option value="semua">Semua kendaraan</option>
                {VEHICLES.map((v) => (
                  <option value={v.fullName} key={v.fullName}>
                    {v.unit} — {v.shortName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status pengajuan</span>
              <select
                value={pfStatus}
                onChange={(e) => setPfStatus(e.target.value)}
              >
                <option value="semua">Semua status</option>
                <option value="menunggu">Menunggu</option>
                <option value="disetujui">Disetujui</option>
                <option value="ditolak">Ditolak</option>
                <option value="belum">Belum diajukan</option>
              </select>
            </label>
          </div>
          {pfHasFilter && (
            <button type="button" className="btn ghost" onClick={resetPengajuanFilter}>
              Reset filter
            </button>
          )}
        </section>

        {loading ? (
          <div className="empty">
            <strong>Memuat data&hellip;</strong>
            <p>Mohon tunggu sebentar.</p>
          </div>
        ) : error ? (
          <div className="empty">
            <strong>Gagal memuat</strong>
            <p>{error}</p>
          </div>
        ) : pengajuanList.length === 0 ? (
          <div className="empty">
            <strong>Belum ada data</strong>
            <p>
              {pfHasFilter
                ? "Tidak ada pemeriksaan untuk filter tersebut."
                : "Belum ada pemeriksaan tersimpan."}
            </p>
          </div>
        ) : (
          <div className="pim-list">
            {pengajuanList.map((r) => {
              const st = pengajuanStatus(r);
              const info = pengMap[r.id];
              const temuan = countTemuan(r);
              const busy = validating === r.id;
              return (
                <article className="card pim-item" key={r.id}>
                  <div className="pim-item-top">
                    <div>
                      <strong>{r.tipeKendaraan || "-"}</strong>
                      <div className="pim-item-meta">
                        {displayDate(r.tanggal)} &middot; {r.namaPemeriksa || "-"} &middot; KM {r.kmKendaraan || "-"}
                      </div>
                      <div className="pim-item-meta">
                        Kesimpulan: {r.kesimpulan || "-"} &middot;{" "}
                        {temuan === 0 ? "Tanpa temuan" : `${temuan} temuan`}
                      </div>
                      {info?.validator && (
                        <div className="pim-item-meta">
                          Divalidasi oleh {info.validator}
                          {info.tanggalValidasi ? ` • ${displayDate(info.tanggalValidasi)}` : ""}
                          {info.catatan ? ` — “${info.catatan}”` : ""}
                        </div>
                      )}
                    </div>
                    <span className={`val-badge val-${slug(st)}`}>{st}</span>
                  </div>
                  <div className="peng-actions no-print">
                    <button type="button" className="btn ghost" onClick={() => openPdf(r)}>
                      Lihat PDF
                    </button>
                    {st === "Menunggu" && (
                      <>
                        <button
                          type="button"
                          className="btn primary"
                          disabled={busy}
                          onClick={() => handleSetujui(r)}
                        >
                          {busy ? "Memproses…" : "Setujui"}
                        </button>
                        <button
                          type="button"
                          className="btn danger"
                          disabled={busy}
                          onClick={() => handleTolak(r)}
                        >
                          Tolak
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="foot">
          E-Mon SAR &middot; Panel Pimpinan &middot; BASARNAS Banyuwangi
        </footer>
      </div>
    </div>
  );
}
