/*
# Buku Besar — Jurnal Umum & Chart of Accounts

Sistem double-entry accounting untuk usaha kos.
Setiap transaksi kas keluar otomatis menghasilkan jurnal:
  - Debit: akun beban/biaya (sesuai kategori)
  - Kredit: akun kas/bank (sesuai metode pembayaran)

1. Tabel `akun` — Chart of Accounts (daftar akun)
2. Tabel `jurnal_umum` — header jurnal
3. Tabel `jurnal_detail` — entry debit/kredit per jurnal
*/

-- ── CHART OF ACCOUNTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.akun (
  kode        text PRIMARY KEY,
  nama        text NOT NULL,
  jenis       text NOT NULL CHECK (jenis IN ('Aset','Kewajiban','Ekuitas','Pendapatan','Beban')),
  sub_jenis   text NOT NULL DEFAULT '',
  saldo_normal text NOT NULL CHECK (saldo_normal IN ('Debit','Kredit')),
  keterangan  text NOT NULL DEFAULT ''
);

ALTER TABLE public.akun ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.akun TO anon, authenticated;
DROP POLICY IF EXISTS "public_read_akun" ON public.akun;
CREATE POLICY "public_read_akun" ON public.akun FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_write_akun" ON public.akun;
CREATE POLICY "public_write_akun" ON public.akun FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_akun" ON public.akun;
CREATE POLICY "public_update_akun" ON public.akun FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed Chart of Accounts
INSERT INTO public.akun (kode, nama, jenis, sub_jenis, saldo_normal, keterangan) VALUES
  -- Aset
  ('1-1100', 'Kas Tunai (Petty Cash)',     'Aset', 'Aset Lancar', 'Debit', 'Uang tunai untuk operasional harian'),
  ('1-1200', 'Kas Bank — BCA',             'Aset', 'Aset Lancar', 'Debit', 'Rekening bank operasional'),
  ('1-1300', 'Kas Bank — Transfer',        'Aset', 'Aset Lancar', 'Debit', 'Penerimaan via transfer bank'),
  ('1-1400', 'Piutang Sewa',               'Aset', 'Aset Lancar', 'Debit', 'Tagihan sewa yang belum dibayar penghuni'),
  ('1-5100', 'Inventaris & Perlengkapan',  'Aset', 'Aset Tetap',  'Debit', 'Perabot dan perlengkapan kos'),
  ('1-5200', 'Bangunan & Renovasi',        'Aset', 'Aset Tetap',  'Debit', 'Nilai bangunan dan perbaikan besar'),
  -- Kewajiban
  ('2-1100', 'Utang Usaha',                'Kewajiban', 'Kewajiban Lancar', 'Kredit', 'Tagihan belum dibayar ke vendor'),
  ('2-1200', 'Utang Gaji',                 'Kewajiban', 'Kewajiban Lancar', 'Kredit', 'Gaji karyawan yang belum dibayarkan'),
  ('2-1300', 'Utang Listrik & Air',        'Kewajiban', 'Kewajiban Lancar', 'Kredit', 'Tagihan utilitas belum lunas'),
  -- Ekuitas
  ('3-1100', 'Modal Pemilik',              'Ekuitas', 'Modal',   'Kredit', 'Modal awal dan tambahan pemilik'),
  ('3-1200', 'Laba Ditahan',               'Ekuitas', 'Modal',   'Kredit', 'Akumulasi laba yang tidak dibagikan'),
  -- Pendapatan
  ('4-1100', 'Pendapatan Sewa Kamar',      'Pendapatan', 'Pendapatan Usaha', 'Kredit', 'Sewa bulanan penghuni'),
  ('4-1200', 'Pendapatan Lainnya',         'Pendapatan', 'Pendapatan Lain',  'Kredit', 'Denda, laundry, parkir, dll'),
  -- Beban
  ('5-1100', 'Beban Listrik',              'Beban', 'Beban Utilitas',    'Debit', 'Tagihan PLN'),
  ('5-1200', 'Beban Air',                  'Beban', 'Beban Utilitas',    'Debit', 'Tagihan PDAM'),
  ('5-1300', 'Beban Internet & WiFi',      'Beban', 'Beban Utilitas',    'Debit', 'Langganan internet & CCTV'),
  ('5-2100', 'Beban Kebersihan',           'Beban', 'Beban Operasional', 'Debit', 'Alat & jasa kebersihan'),
  ('5-2200', 'Beban Perawatan & Perbaikan','Beban', 'Beban Operasional', 'Debit', 'Servis, renovasi ringan, perbaikan'),
  ('5-2300', 'Beban Gaji Karyawan',        'Beban', 'Beban Operasional', 'Debit', 'Gaji dan tunjangan karyawan'),
  ('5-2400', 'Beban Perlengkapan Kos',     'Beban', 'Beban Operasional', 'Debit', 'Kasur, tirai, meja, dll'),
  ('5-9100', 'Beban Lain-lain',            'Beban', 'Beban Lainnya',     'Debit', 'Pengeluaran tidak terkategori')
ON CONFLICT (kode) DO NOTHING;

-- ── JURNAL UMUM (Header) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jurnal_umum (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_jurnal        text NOT NULL UNIQUE,
  tanggal             date NOT NULL,
  keterangan          text NOT NULL,
  expense_id          uuid REFERENCES public.cash_expenses(id) ON DELETE SET NULL,
  dibuat_oleh         text NOT NULL DEFAULT 'Sistem',
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jurnal_umum ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurnal_umum TO anon, authenticated;
DROP POLICY IF EXISTS "public_crud_jurnal" ON public.jurnal_umum;
CREATE POLICY "public_crud_jurnal" ON public.jurnal_umum FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS jurnal_umum_tanggal_idx ON public.jurnal_umum (tanggal DESC);
CREATE INDEX IF NOT EXISTS jurnal_umum_expense_id_idx ON public.jurnal_umum (expense_id);

-- ── JURNAL DETAIL (Entry) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jurnal_detail (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurnal_id    uuid NOT NULL REFERENCES public.jurnal_umum(id) ON DELETE CASCADE,
  kode_akun    text NOT NULL REFERENCES public.akun(kode),
  posisi       text NOT NULL CHECK (posisi IN ('Debit','Kredit')),
  nominal      numeric(14,2) NOT NULL CHECK (nominal > 0),
  keterangan   text NOT NULL DEFAULT ''
);

ALTER TABLE public.jurnal_detail ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurnal_detail TO anon, authenticated;
DROP POLICY IF EXISTS "public_crud_jurnal_detail" ON public.jurnal_detail;
CREATE POLICY "public_crud_jurnal_detail" ON public.jurnal_detail FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS jurnal_detail_jurnal_id_idx ON public.jurnal_detail (jurnal_id);
CREATE INDEX IF NOT EXISTS jurnal_detail_kode_akun_idx ON public.jurnal_detail (kode_akun);
