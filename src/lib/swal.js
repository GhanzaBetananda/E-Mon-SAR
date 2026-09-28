import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const BRAND_ORANGE = "#ea580c";
const BRAND_DARK = "#0f172a";
const BRAND_GREY = "#64748b";

/** Alert info/warning/error/success — pengganti window.alert. */
export function showAlert(title, text, icon = "warning") {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonColor: BRAND_ORANGE,
    confirmButtonText: "OK",
  });
}

/** Konfirmasi "bagian belum lengkap, yakin lanjut?" — return true = lanjut. */
export async function confirmIncomplete(title, text) {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: BRAND_ORANGE,
    cancelButtonColor: BRAND_GREY,
    confirmButtonText: "Ya, lanjut",
    cancelButtonText: "Tetap di sini",
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
}

/** Konfirmasi simpan bagian — return true = simpan. */
export async function confirmSave(message) {
  const result = await Swal.fire({
    title: "Simpan bagian ini?",
    text: message,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: BRAND_DARK,
    cancelButtonColor: BRAND_GREY,
    confirmButtonText: "Ya, simpan",
    cancelButtonText: "Batal",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

/** Toast sukses singkat (auto-close) — mis. "Bagian X tersimpan". */
export function showSuccessToast(title, text = "") {
  return Swal.fire({
    icon: "success",
    title,
    text,
    timer: 1400,
    showConfirmButton: false,
    timerProgressBar: true,
  });
}

/** Dialog sukses dengan tombol OK — mis. "Pemeriksaan selesai". */
export function showSuccess(title, text = "") {
  return Swal.fire({
    icon: "success",
    title,
    text,
    confirmButtonColor: BRAND_DARK,
    confirmButtonText: "OK",
  });
}

/** Dialog error — pengganti alert gagal simpan/muat. */
export function showError(title, text) {
  return Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonColor: BRAND_ORANGE,
    confirmButtonText: "OK",
  });
}

export default Swal;
