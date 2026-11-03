# 🏠 Sistem Informasi Akuntansi Kas Keluar — Harmoni Residence

Aplikasi pencatatan pengeluaran kas operasional untuk usaha kos-kosan berbasis React + TypeScript + Supabase.

---

## 🚀 Cara Menjalankan Sistem

### Prasyarat
- [Node.js](https://nodejs.org) v18 atau lebih baru
- Akun [Supabase](https://supabase.com)

---

### 1. Clone Repository

```bash
git clone https://github.com/tania-zefa/sistem-kos.git
cd sistem-kos
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment

Salin file template lalu isi dengan kredensial Supabase:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://lkmrkdkoslwvjnqkbntl.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> Kredensial dapat ditemukan di **Supabase Dashboard → Project Settings → API**

### 4. Jalankan Migration Database

Buka **Supabase Dashboard → SQL Editor**, lalu jalankan kedua file berikut secara berurutan:

1. `supabase/migrations/20261103025626_create_cash_expenses_table.sql`
2. `supabase/migrations/20261103031023_create_property_settings_table.sql`

### 5. Jalankan Aplikasi

```bash
npm run dev
```

Buka browser dan akses: **[http://localhost:5173](http://localhost:5173)**

---

## 📦 Build Produksi

```bash
npm run build
npm run preview
```

---

## 🗂️ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 📊 Dashboard | Ringkasan keuangan, grafik bulanan, dan riwayat transaksi terkini |
| 📒 Buku Transaksi | Pencatatan, pencarian, filter, edit, dan hapus pengeluaran kas |
| 📈 Laporan Akuntansi | Rekapitulasi beban per kategori, ekspor CSV, cetak laporan |
| 🏷️ Master Kategori | 8 kategori biaya operasional (Listrik, Air, WiFi, dll.) |
| ⚙️ Pengaturan | Manajemen profil usaha kos |

---

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Icons:** Lucide React

---

## 📁 Struktur Proyek

```
sistem-kos/
├── src/
│   ├── App.tsx          # Komponen utama & seluruh UI
│   ├── main.tsx         # Entry point React
│   ├── index.css        # Global styles (Tailwind)
│   └── lib/
│       └── supabase.ts  # Konfigurasi Supabase client
├── supabase/
│   └── migrations/      # SQL migration database
├── .env.example         # Template environment variables
└── README.md
```

---

> Dibuat untuk keperluan sistem informasi akuntansi kos-kosan — Universitas Diponegoro
