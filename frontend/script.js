/**
 * ============================================================
 * HARMONI RESIDENCE — Frontend Entry Script
 * Sistem Informasi Akuntansi Kas Keluar
 * ============================================================
 * Catatan Teknis:
 *
 * Aplikasi ini adalah React SPA yang di-bundle dengan Vite.
 * File script.js ini adalah referensi statis untuk dokumentasi.
 *
 * Entry point React yang sesungguhnya ada di:
 *   src/main.tsx      → Bootstrap React app
 *   src/App.tsx       → Komponen utama + semua logika
 *   src/lib/supabase.ts → Konfigurasi Supabase client
 *
 * Untuk menjalankan:
 *   npm install
 *   npm run dev       → http://localhost:5173/sistem-kos/
 *
 * Untuk build produksi:
 *   npm run build     → output ke /dist
 *   (hasil build ada di /docs untuk GitHub Pages)
 * ============================================================
 */

// ── Konfigurasi Supabase ──────────────────────────────────────
const SUPABASE_URL      = 'https://lkmrkdkoslwvjnqkbntl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// ── Mapping Kategori → Kode Akun Beban ───────────────────────
const CATEGORY_TO_AKUN = {
  'Listrik':               '5-1100', // Beban Listrik
  'Air':                   '5-1200', // Beban Air
  'Internet/WiFi':         '5-1300', // Beban Internet & WiFi
  'Kebersihan':            '5-2100', // Beban Kebersihan
  'Perawatan & Perbaikan': '5-2200', // Beban Perawatan & Perbaikan
  'Gaji Karyawan':         '5-2300', // Beban Gaji Karyawan
  'Perlengkapan Kos':      '5-2400', // Beban Perlengkapan Kos
  'Biaya Lainnya':         '5-9100', // Beban Lain-lain
};

// ── Mapping Metode Bayar → Kode Akun Kas/Bank ────────────────
const METHOD_TO_AKUN = {
  'Kas Tunai (Petty Cash)': '1-1100', // Kas Tunai
  'Transfer Bank':          '1-1300', // Kas Bank Transfer
  'QRIS':                   '1-1300', // Kas Bank QRIS
  'Kartu Debit':            '1-1200', // Kas Bank Debit
  'Lainnya':                '1-1100', // Kas Tunai (default)
};

// ── Daftar Akun (Chart of Accounts) ──────────────────────────
const CHART_OF_ACCOUNTS = [
  // Aset
  { kode: '1-1100', nama: 'Kas Tunai (Petty Cash)',      jenis: 'Aset',       saldo_normal: 'Debit'  },
  { kode: '1-1200', nama: 'Kas Bank — BCA / Debit',      jenis: 'Aset',       saldo_normal: 'Debit'  },
  { kode: '1-1300', nama: 'Kas Bank — Transfer / QRIS',  jenis: 'Aset',       saldo_normal: 'Debit'  },
  { kode: '1-1400', nama: 'Piutang Sewa',                jenis: 'Aset',       saldo_normal: 'Debit'  },
  // Kewajiban
  { kode: '2-1100', nama: 'Utang Usaha',                 jenis: 'Kewajiban',  saldo_normal: 'Kredit' },
  { kode: '2-1200', nama: 'Utang Gaji',                  jenis: 'Kewajiban',  saldo_normal: 'Kredit' },
  // Ekuitas
  { kode: '3-1100', nama: 'Modal Pemilik',               jenis: 'Ekuitas',    saldo_normal: 'Kredit' },
  // Pendapatan
  { kode: '4-1100', nama: 'Pendapatan Sewa Kamar',       jenis: 'Pendapatan', saldo_normal: 'Kredit' },
  // Beban
  { kode: '5-1100', nama: 'Beban Listrik',               jenis: 'Beban',      saldo_normal: 'Debit'  },
  { kode: '5-1200', nama: 'Beban Air',                   jenis: 'Beban',      saldo_normal: 'Debit'  },
  { kode: '5-1300', nama: 'Beban Internet & WiFi',       jenis: 'Beban',      saldo_normal: 'Debit'  },
  { kode: '5-2100', nama: 'Beban Kebersihan',            jenis: 'Beban',      saldo_normal: 'Debit'  },
  { kode: '5-2200', nama: 'Beban Perawatan & Perbaikan', jenis: 'Beban',      saldo_normal: 'Debit'  },
  { kode: '5-2300', nama: 'Beban Gaji Karyawan',         jenis: 'Beban',      saldo_normal: 'Debit'  },
  { kode: '5-2400', nama: 'Beban Perlengkapan Kos',      jenis: 'Beban',      saldo_normal: 'Debit'  },
  { kode: '5-9100', nama: 'Beban Lain-lain',             jenis: 'Beban',      saldo_normal: 'Debit'  },
];

// ── Helper: Format Rupiah ─────────────────────────────────────
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(amount);
}

// ── Helper: Format Tanggal Indonesia ─────────────────────────
function formatTanggal(dateStr) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date(`${dateStr}T00:00:00`));
}

// ── Helper: Generate Nomor BKK ────────────────────────────────
function generateNomorBKK(tanggal, urutan) {
  const ymd = tanggal.replace(/-/g, '').substring(2); // YYMMDD
  const no  = String(urutan).padStart(3, '0');
  return `BKK-${ymd}-${no}`;
}

// ── Helper: Generate Jurnal Otomatis dari Transaksi ──────────
function generateJurnal(expense, idx) {
  const kodeBeban = CATEGORY_TO_AKUN[expense.category] ?? '5-9100';
  const kodeKas   = METHOD_TO_AKUN[expense.payment_method] ?? '1-1100';
  const akunBeban = CHART_OF_ACCOUNTS.find(a => a.kode === kodeBeban);
  const akunKas   = CHART_OF_ACCOUNTS.find(a => a.kode === kodeKas);
  return {
    nomor: `JU-${expense.transaction_date.replace(/-/g,'').substring(2)}-${String(idx+1).padStart(3,'0')}`,
    tanggal: expense.transaction_date,
    keterangan: expense.description,
    entries: [
      { posisi: 'Debit',  kode: kodeBeban, nama: akunBeban?.nama ?? kodeBeban, nominal: expense.amount },
      { posisi: 'Kredit', kode: kodeKas,   nama: akunKas?.nama   ?? kodeKas,   nominal: expense.amount },
    ]
  };
}

// Export untuk penggunaan modul
if (typeof module !== 'undefined') {
  module.exports = {
    SUPABASE_URL, SUPABASE_ANON_KEY,
    CATEGORY_TO_AKUN, METHOD_TO_AKUN, CHART_OF_ACCOUNTS,
    formatRupiah, formatTanggal, generateNomorBKK, generateJurnal,
  };
}
