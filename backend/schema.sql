-- ============================================================
-- SCHEMA DATABASE
-- Sistem Informasi Akuntansi Kas Keluar
-- Harmoni Residence Kost Putri
-- Universitas Diponegoro — 2026
-- ============================================================
-- Jalankan file ini di Supabase SQL Editor:
-- https://app.supabase.com → Project → SQL Editor
-- ============================================================

-- ── 1. TABEL PENGELUARAN KAS (cash_expenses) ─────────────────
CREATE TABLE IF NOT EXISTS public.cash_expenses (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date   date         NOT NULL,
  transaction_number text         NOT NULL UNIQUE,
  description        text         NOT NULL,
  category           text         NOT NULL CHECK (category IN (
                       'Listrik', 'Air', 'Internet/WiFi', 'Kebersihan',
                       'Perawatan & Perbaikan', 'Gaji Karyawan',
                       'Perlengkapan Kos', 'Biaya Lainnya')),
  amount             numeric(14,2) NOT NULL CHECK (amount > 0),
  status             text         NOT NULL DEFAULT 'Lunas'
                       CHECK (status IN ('Lunas', 'Belum Lunas', 'Sebagian')),
  payment_method     text         NOT NULL DEFAULT 'Kas Tunai (Petty Cash)'
                       CHECK (payment_method IN (
                         'Kas Tunai (Petty Cash)', 'Transfer Bank',
                         'QRIS', 'Kartu Debit', 'Lainnya')),
  unit_kamar         text         NOT NULL DEFAULT 'Semua Kamar',
  vendor             text         NOT NULL DEFAULT '-',
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_expenses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_expenses TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_cash_expenses"   ON public.cash_expenses;
DROP POLICY IF EXISTS "public_insert_cash_expenses" ON public.cash_expenses;
DROP POLICY IF EXISTS "public_update_cash_expenses" ON public.cash_expenses;
DROP POLICY IF EXISTS "public_delete_cash_expenses" ON public.cash_expenses;

CREATE POLICY "public_read_cash_expenses"   ON public.cash_expenses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_insert_cash_expenses" ON public.cash_expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_cash_expenses" ON public.cash_expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_cash_expenses" ON public.cash_expenses FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS cash_expenses_date_idx     ON public.cash_expenses (transaction_date DESC);
CREATE INDEX IF NOT EXISTS cash_expenses_category_idx ON public.cash_expenses (category);
CREATE INDEX IF NOT EXISTS cash_expenses_status_idx   ON public.cash_expenses (status);


-- ── 2. TABEL PENGATURAN PROPERTI (property_settings) ─────────
CREATE TABLE IF NOT EXISTS public.property_settings (
  id               integer     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name    text        NOT NULL DEFAULT 'Harmoni Residence Kost Putri',
  business_address text        NOT NULL DEFAULT 'Jl. Cempaka Raya No. 18, Tembalang, Kota Semarang',
  manager_name     text        NOT NULL DEFAULT 'Andi Setiawan',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.property_settings TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_property_settings"   ON public.property_settings;
DROP POLICY IF EXISTS "public_update_property_settings" ON public.property_settings;

CREATE POLICY "public_read_property_settings"   ON public.property_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_update_property_settings" ON public.property_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);


-- ── 3. TABEL DAFTAR AKUN / CHART OF ACCOUNTS (akun) ──────────
CREATE TABLE IF NOT EXISTS public.akun (
  kode         text PRIMARY KEY,
  nama         text NOT NULL,
  jenis        text NOT NULL CHECK (jenis IN ('Aset','Kewajiban','Ekuitas','Pendapatan','Beban')),
  sub_jenis    text NOT NULL DEFAULT '',
  saldo_normal text NOT NULL CHECK (saldo_normal IN ('Debit','Kredit')),
  keterangan   text NOT NULL DEFAULT ''
);

ALTER TABLE public.akun ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.akun TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_akun"   ON public.akun;
DROP POLICY IF EXISTS "public_write_akun"  ON public.akun;
DROP POLICY IF EXISTS "public_update_akun" ON public.akun;

CREATE POLICY "public_read_akun"   ON public.akun FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_write_akun"  ON public.akun FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_akun" ON public.akun FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);


-- ── 4. TABEL JURNAL UMUM (jurnal_umum) ───────────────────────
CREATE TABLE IF NOT EXISTS public.jurnal_umum (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_jurnal  text        NOT NULL UNIQUE,
  tanggal       date        NOT NULL,
  keterangan    text        NOT NULL,
  expense_id    uuid        REFERENCES public.cash_expenses(id) ON DELETE SET NULL,
  dibuat_oleh   text        NOT NULL DEFAULT 'Sistem',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jurnal_umum ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurnal_umum TO anon, authenticated;

DROP POLICY IF EXISTS "public_crud_jurnal" ON public.jurnal_umum;
CREATE POLICY "public_crud_jurnal" ON public.jurnal_umum FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS jurnal_umum_tanggal_idx    ON public.jurnal_umum (tanggal DESC);
CREATE INDEX IF NOT EXISTS jurnal_umum_expense_id_idx ON public.jurnal_umum (expense_id);


-- ── 5. TABEL DETAIL JURNAL (jurnal_detail) ───────────────────
CREATE TABLE IF NOT EXISTS public.jurnal_detail (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  jurnal_id  uuid         NOT NULL REFERENCES public.jurnal_umum(id) ON DELETE CASCADE,
  kode_akun  text         NOT NULL REFERENCES public.akun(kode),
  posisi     text         NOT NULL CHECK (posisi IN ('Debit','Kredit')),
  nominal    numeric(14,2) NOT NULL CHECK (nominal > 0),
  keterangan text         NOT NULL DEFAULT ''
);

ALTER TABLE public.jurnal_detail ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurnal_detail TO anon, authenticated;

DROP POLICY IF EXISTS "public_crud_jurnal_detail" ON public.jurnal_detail;
CREATE POLICY "public_crud_jurnal_detail" ON public.jurnal_detail FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS jurnal_detail_jurnal_id_idx ON public.jurnal_detail (jurnal_id);
CREATE INDEX IF NOT EXISTS jurnal_detail_kode_akun_idx ON public.jurnal_detail (kode_akun);
