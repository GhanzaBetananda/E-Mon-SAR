/**
 * Definisi 5 bagian pemeriksaan — SUMBER TUNGGAL untuk frontend.
 * Dipakai form (App.jsx) dan laporan pimpinan (Pimpinan.jsx).
 * PENTING: daftar item di sini harus selaras dengan
 * getItemLabelsForSection() di gas/Code.gs (nama item sheet MASALAH).
 */
export const SECTIONS = {
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

export const SECTION_ORDER = [1, 2, 3, 4, 5];

/** Kolom kiri formulir laporan: Bagian 1, 2, 3 — kolom kanan: Bagian 4, 5. */
export const REPORT_COLUMNS = [[1, 2, 3], [4, 5]];
