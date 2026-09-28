import { useEffect, useMemo, useState } from "react";
import "./Pimpinan.css";
import { callGas } from "./lib/gas.js";

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

function slug(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default function Pimpinan({ onExit }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterDate, setFilterDate] = useState(""); // YYYY-MM-DD
  const [filterMonth, setFilterMonth] = useState(""); // YYYY-MM
  const [statusFilter, setStatusFilter] = useState("semua");

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

  const hasFilter = filterDate || filterMonth || statusFilter !== "semua";

  function resetFilter() {
    setFilterDate("");
    setFilterMonth("");
    setStatusFilter("semua");
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
