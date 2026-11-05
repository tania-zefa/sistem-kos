# 🏠 Harmoni Residence — Sistem Informasi Akuntansi Kas Keluar

Aplikasi pencatatan pengeluaran kas dan pembukuan akuntansi (double-entry) untuk usaha kos-kosan, dibangun dengan React + TypeScript + Supabase.

---

## 🚀 Akses Sistem

### ▶ Jalankan Langsung (Online)

> **[https://tania-zefa.github.io/sistem-kos/](https://tania-zefa.github.io/sistem-kos/)**

Tidak perlu instalasi apapun — langsung buka di browser.

---

## 💻 Jalankan Secara Lokal

### Prasyarat
- [Node.js](https://nodejs.org) v18 atau lebih baru
- Akun [Supabase](https://supabase.com)

### Langkah Instalasi

**1. Clone Repository**
```bash
git clone https://github.com/tania-zefa/sistem-kos.git
cd sistem-kos
```

**2. Install Dependencies**
```bash
npm install
```

**3. Konfigurasi Environment**
```bash
cp .env.example .env
```
Edit `.env`:
```env
VITE_SUPABASE_URL=https://lkmrkdkoslwvjnqkbntl.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**4. Setup Database Supabase**

Buka **[Supabase SQL Editor](https://supabase.com/dashboard/project/lkmrkdkoslwvjnqkbntl/sql/new)** dan jalankan file berikut secara berurutan:

| Urutan | File | Keterangan |
|--------|------|------------|
| 1 | `backend/schema.sql` | Buat semua tabel & RLS |
| 2 | `backend/seed.sql` | Data awal & chart of accounts |
| 3 | `backend/seed_tambahan.sql` | Data contoh tambahan |
| 4 | `backend/triggers.sql` | Trigger & view akuntansi |

**5. Jalankan Aplikasi**
```bash
npm run dev
```
Buka: **[http://localhost:5173/sistem-kos/](http://localhost:5173/sistem-kos/)**

---

## 📁 Struktur Proyek

```
sistem-kos/
│
├── backend/                    # SQL Database
│   ├── schema.sql              # DDL: definisi semua tabel & RLS
│   ├── seed.sql                # Data awal: akun, properti, transaksi
│   ├── seed_tambahan.sql       # Data contoh tambahan
│   └── triggers.sql            # Trigger, function, view akuntansi
│
├── frontend/                   # Referensi statis frontend
│   ├── index.html              # HTML entry point
│   ├── script.js               # Logic & helper functions
│   └── style.css               # Global stylesheet & design tokens
│
├── src/                        # Source code React (TypeScript)
│   ├── App.tsx                 # Komponen utama + semua halaman
│   ├── main.tsx                # Bootstrap React
│   ├── index.css               # Tailwind CSS
│   └── lib/
│       └── supabase.ts         # Supabase client
│
├── docs/                       # Build produksi (GitHub Pages)
├── supabase/migrations/        # Migration history
├── .env.example                # Template environment variables
├── index.html                  # HTML root (Vite)
├── package.json                # Dependencies & scripts
├── tailwind.config.js          # Tailwind configuration
├── vite.config.ts              # Vite configuration
└── README.md                   # Dokumentasi ini
```

---

## 🗄️ Skema Database

### Tabel Utama

| Tabel | Keterangan |
|-------|-----------|
| `cash_expenses` | Pencatatan pengeluaran kas harian |
| `property_settings` | Profil & pengaturan properti kos |
| `akun` | Chart of Accounts (21 akun) |
| `jurnal_umum` | Header entri jurnal |
| `jurnal_detail` | Baris debit/kredit per jurnal |

### View Akuntansi (dari triggers.sql)

| View | Keterangan |
|------|-----------|
| `v_saldo_akun` | Saldo berjalan per akun |
| `v_neraca_saldo` | Neraca saldo trial balance |

---

## 📊 Fitur Sistem

| Menu | Fitur |
|------|-------|
| **Dashboard** | Ringkasan keuangan, grafik 6 bulan, tagihan pending |
| **Buku Transaksi** | CRUD transaksi, filter multi-dimensi, export CSV |
| **Buku Besar** | Jurnal Umum, Buku Besar per akun, Neraca Saldo, Daftar Akun |
| **Laporan** | Rekapitulasi per kategori, ringkasan status pembayaran |
| **Kategori** | Master 8 kategori biaya operasional |
| **Pengaturan** | Profil usaha kos |

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Row Level Security (RLS) |
| Deploy | GitHub Pages |
| Icons | Lucide React |

---

## 👩‍💻 Pengembang

**Tania Zefa** — Universitas Diponegoro, 2026

Repository: [github.com/tania-zefa/sistem-kos](https://github.com/tania-zefa/sistem-kos)
