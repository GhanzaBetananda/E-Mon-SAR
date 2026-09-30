import { useEffect, useMemo, useState } from "react";
import "./Pimpinan.css";
import { callGas, VEHICLES } from "./lib/gas.js";
import { SECTIONS, REPORT_COLUMNS } from "./lib/sections.js";

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

function InspectionPage({ record }) {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterDate, setFilterDate] = useState(""); // YYYY-MM-DD
  const [filterMonth, setFilterMonth] = useState(""); // YYYY-MM
  const [statusFilter, setStatusFilter] = useState("semua");
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
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return records
      .map((r) => {
        const issues = (r?.issues || []).filter((it) => {
          const st = String(it?.status || "").toLowerCase();
          // Hanya temuan: buang yang "Baik" / kosong
          if (st === "baik" || st === "" || st === "-") return false;
          if (statusFilter !== "semua" && st !== statusFilter) return false;
          return true;
        });
        return { ...r, _issues: issues, _iso: toISO(r?.tanggal) };
      })
      .filter((r) => {
        if (r._issues.length === 0) return false;
        if (filterDate && r._iso !== filterDate) return false;
        if (filterMonth && r._iso.slice(0, 7) !== filterMonth) return false;
        return true;
      })
      .sort((a, b) => (b._iso || "").localeCompare(a._iso || ""));
  }, [records, filterDate, filterMonth, statusFilter]);

  const stats = useMemo(() => {
    let rusak = 0;
    let tidak = 0;
    filtered.forEach((r) =>
      r._issues.forEach((it) => {
        const st = String(it?.status || "").toLowerCase();
        if (st === "rusak") rusak += 1;
        else tidak += 1;
      })
    );
    return { total: rusak + tidak, rusak, tidak, pemeriksaan: filtered.length };
  }, [filtered]);

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

  const hasFilter = filterDate || filterMonth || statusFilter !== "semua";

  function resetFilter() {
    setFilterDate("");
    setFilterMonth("");
    setStatusFilter("semua");
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
    <div className={showReport ? "page report-mode" : "page"}>
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
              <div className="brand-sub">E-Mon SAR &middot; Temuan pemeriksaan</div>
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
            <div className="eyebrow">Semua kendaraan operasional</div>
            <h1>Temuan Tidak Standart &amp; Rusak</h1>
            <p>
              {filterDate
                ? <>Tanggal {displayDate(filterDate)}</>
                : filterMonth
                  ? <>Bulan {displayMonth(filterMonth)}</>
                  : "Semua periode"}
              {statusFilter !== "semua" ? <> &middot; {statusFilter}</> : ""}
            </p>
          </div>
          <button type="button" className="btn primary" onClick={load} disabled={loading}>
            {loading ? "Memuat\u2026" : "Muat ulang"}
          </button>
        </section>

        <div className="pim-stats">
          <div className="pim-stat">
            <span className="pim-stat-num">{stats.total}</span>
            <span className="pim-stat-label">Total temuan</span>
          </div>
          <div className="pim-stat is-danger">
            <span className="pim-stat-num">{stats.rusak}</span>
            <span className="pim-stat-label">Rusak</span>
          </div>
          <div className="pim-stat is-warn">
            <span className="pim-stat-num">{stats.tidak}</span>
            <span className="pim-stat-label">Tidak standart</span>
          </div>
          <div className="pim-stat">
            <span className="pim-stat-num">{stats.pemeriksaan}</span>
            <span className="pim-stat-label">Pemeriksaan bermasalah</span>
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
              onClick={() => setShowReport(true)}
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

        <section className="card pim-filters">
          <div className="field-grid cols-3">
            <label className="field">
              <span>Filter tanggal</span>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Filter bulan</span>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="semua">Semua temuan</option>
                <option value="rusak">Rusak</option>
                <option value="tidak standart">Tidak standart</option>
              </select>
            </label>
          </div>
          {hasFilter && (
            <button type="button" className="btn ghost" onClick={resetFilter}>
              Reset filter
            </button>
          )}
        </section>

        {loading ? (
          <div className="empty">
            <strong>Memuat data temuan&hellip;</strong>
            <p>Mohon tunggu sebentar.</p>
          </div>
        ) : error ? (
          <div className="empty">
            <strong>Gagal memuat</strong>
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <strong>Tidak ada temuan</strong>
            <p>
              {hasFilter
                ? "Tidak ada data Tidak Standart / Rusak untuk filter tersebut."
                : "Semua pemeriksaan dalam kondisi baik."}
            </p>
          </div>
        ) : (
          <div className="pim-list">
            {filtered.map((r) => (
              <article className="card pim-item" key={r.id}>
                <div className="pim-item-top">
                  <div>
                    <strong>{r.namaPemeriksa || "-"}</strong>
                    <div className="pim-item-meta">
                      {displayDate(r.tanggal)} &middot; KM {r.kmKendaraan || "-"} &middot;{" "}
                      {r.koorPengelola || "-"}
                    </div>
                  </div>
                  <span className="pim-count">
                    {r._issues.length} temuan
                  </span>
                </div>
                <ul className="pim-issues">
                  {r._issues.map((it, i) => (
                    <li key={i} className="pim-issue">
                      <div className="pim-issue-main">
                        <span className="pim-issue-part">{it.bagian || "-"}</span>
                        <strong className="pim-issue-name">{it.item || "-"}</strong>
                        {it.keterangan && it.keterangan !== "-" && (
                          <span className="pim-issue-note">{it.keterangan}</span>
                        )}
                      </div>
                      <div className="pim-issue-side">
                        <span className={`issue-status st-${slug(it.status)}`}>
                          {it.status}
                        </span>
                        {it.foto && it.foto !== "-" && String(it.foto).startsWith("http") && (
                          <a
                            href={it.foto}
                            target="_blank"
                            rel="noreferrer"
                            className="pim-photo"
                          >
                            Lihat foto
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}

        <footer className="foot">
          E-Mon SAR &middot; Panel Pimpinan &middot; BASARNAS Banyuwangi
        </footer>
      </div>
    </div>
  );
}
