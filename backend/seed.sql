-- ============================================================
-- SEED DATA — Data Awal Sistem
-- Sistem Informasi Akuntansi Kas Keluar
-- Harmoni Residence Kost Putri
-- ============================================================
-- Jalankan SETELAH schema.sql
-- ============================================================

-- ── 1. Pengaturan Properti ────────────────────────────────────
INSERT INTO public.property_settings (id, business_name, business_address, manager_name)
VALUES (1, 'Harmoni Residence Kost Putri', 'Jl. Cempaka Raya No. 18, Tembalang, Kota Semarang', 'Andi Setiawan')
ON CONFLICT (id) DO NOTHING;


-- ── 2. Daftar Akun (Chart of Accounts) ───────────────────────
INSERT INTO public.akun (kode, nama, jenis, sub_jenis, saldo_normal, keterangan) VALUES
  -- Aset
  ('1-1100', 'Kas Tunai (Petty Cash)',      'Aset', 'Aset Lancar', 'Debit', 'Uang tunai untuk operasional harian'),
  ('1-1200', 'Kas Bank — BCA / Debit',      'Aset', 'Aset Lancar', 'Debit', 'Rekening bank operasional'),
  ('1-1300', 'Kas Bank — Transfer / QRIS',  'Aset', 'Aset Lancar', 'Debit', 'Penerimaan via transfer bank dan QRIS'),
  ('1-1400', 'Piutang Sewa',                'Aset', 'Aset Lancar', 'Debit', 'Tagihan sewa yang belum dibayar penghuni'),
  ('1-5100', 'Inventaris & Perlengkapan',   'Aset', 'Aset Tetap',  'Debit', 'Perabot dan perlengkapan kos'),
  ('1-5200', 'Bangunan & Renovasi',         'Aset', 'Aset Tetap',  'Debit', 'Nilai bangunan dan perbaikan besar'),
  -- Kewajiban
  ('2-1100', 'Utang Usaha',                 'Kewajiban', 'Kewajiban Lancar', 'Kredit', 'Tagihan belum dibayar ke vendor'),
  ('2-1200', 'Utang Gaji',                  'Kewajiban', 'Kewajiban Lancar', 'Kredit', 'Gaji karyawan yang belum dibayarkan'),
  ('2-1300', 'Utang Listrik & Air',         'Kewajiban', 'Kewajiban Lancar', 'Kredit', 'Tagihan utilitas yang belum lunas'),
  -- Ekuitas
  ('3-1100', 'Modal Pemilik',               'Ekuitas', 'Modal', 'Kredit', 'Modal awal dan tambahan pemilik'),
  ('3-1200', 'Laba Ditahan',                'Ekuitas', 'Modal', 'Kredit', 'Akumulasi laba yang tidak dibagikan'),
  -- Pendapatan
  ('4-1100', 'Pendapatan Sewa Kamar',       'Pendapatan', 'Pendapatan Usaha', 'Kredit', 'Sewa bulanan penghuni'),
  ('4-1200', 'Pendapatan Lainnya',          'Pendapatan', 'Pendapatan Lain',  'Kredit', 'Denda, laundry, parkir, dll'),
  -- Beban
  ('5-1100', 'Beban Listrik',               'Beban', 'Beban Utilitas',    'Debit', 'Tagihan PLN bulanan'),
  ('5-1200', 'Beban Air',                   'Beban', 'Beban Utilitas',    'Debit', 'Tagihan PDAM bulanan'),
  ('5-1300', 'Beban Internet & WiFi',       'Beban', 'Beban Utilitas',    'Debit', 'Langganan internet dan CCTV'),
  ('5-2100', 'Beban Kebersihan',            'Beban', 'Beban Operasional', 'Debit', 'Alat dan jasa kebersihan'),
  ('5-2200', 'Beban Perawatan & Perbaikan', 'Beban', 'Beban Operasional', 'Debit', 'Servis, renovasi ringan, perbaikan AC'),
  ('5-2300', 'Beban Gaji Karyawan',         'Beban', 'Beban Operasional', 'Debit', 'Gaji dan tunjangan karyawan'),
  ('5-2400', 'Beban Perlengkapan Kos',      'Beban', 'Beban Operasional', 'Debit', 'Kasur, tirai, meja belajar, dll'),
  ('5-9100', 'Beban Lain-lain',             'Beban', 'Beban Lainnya',     'Debit', 'Pengeluaran yang tidak terkategori')
ON CONFLICT (kode) DO NOTHING;


-- ── 3. Data Transaksi Contoh (2025–2026) ─────────────────────
INSERT INTO public.cash_expenses
  (transaction_date, transaction_number, description, category, amount, status, payment_method, unit_kamar, vendor)
VALUES
  -- 2025: Januari
  ('2025-01-03','BKK-250103-001','Pembayaran tagihan listrik bulan Desember','Listrik',2350000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2025-01-05','BKK-250105-002','Pembayaran tagihan air PDAM Januari','Air',920000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2025-01-07','BKK-250107-003','Gaji petugas kebersihan bulan Januari','Gaji Karyawan',1800000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2025-01-10','BKK-250110-004','Langganan WiFi dan CCTV Januari','Internet/WiFi',625000,'Lunas','Transfer Bank','Semua Kamar','Indihome'),
  ('2025-01-15','BKK-250115-005','Pembelian sabun, sapu, dan alat kebersihan','Kebersihan',480000,'Lunas','Kas Tunai (Petty Cash)','Area Umum','-'),
  -- Februari
  ('2025-02-02','BKK-250202-006','Pembayaran tagihan listrik bulan Januari','Listrik',2580000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2025-02-04','BKK-250204-007','Perbaikan kunci pintu kamar 101 dan 102','Perawatan & Perbaikan',350000,'Lunas','Kas Tunai (Petty Cash)','Kamar 101','Pak Joko Tukang'),
  ('2025-02-07','BKK-250207-008','Gaji petugas kebersihan bulan Februari','Gaji Karyawan',1800000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2025-02-10','BKK-250210-009','Pembayaran tagihan air PDAM Februari','Air',875000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2025-02-20','BKK-250220-010','Pembelian bola lampu LED seluruh koridor','Perlengkapan Kos',640000,'Lunas','Kas Tunai (Petty Cash)','Semua Kamar','Toko Listrik Jaya'),
  -- Maret
  ('2025-03-03','BKK-250303-011','Pembayaran tagihan listrik bulan Februari','Listrik',2410000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2025-03-05','BKK-250305-012','Servis pompa air dan penggantian selang','Perawatan & Perbaikan',1150000,'Lunas','Kas Tunai (Petty Cash)','Lantai 2','Pak Joko Tukang'),
  ('2025-03-07','BKK-250307-013','Gaji petugas kebersihan bulan Maret','Gaji Karyawan',1800000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2025-03-12','BKK-250312-014','Pembayaran tagihan air PDAM Maret','Air',910000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2025-03-18','BKK-250318-015','Langganan WiFi dan CCTV Maret','Internet/WiFi',625000,'Lunas','Transfer Bank','Semua Kamar','Indihome'),
  -- April
  ('2025-04-02','BKK-250402-016','Pembayaran tagihan listrik bulan Maret','Listrik',2690000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2025-04-07','BKK-250407-017','Gaji petugas kebersihan bulan April','Gaji Karyawan',1800000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2025-04-10','BKK-250410-018','Pengecatan ulang dinding kamar 201-204','Perawatan & Perbaikan',2800000,'Lunas','Transfer Bank','Lantai 2','Pak Budi Kontraktor'),
  ('2025-04-14','BKK-250414-019','Pembayaran tagihan air PDAM April','Air',945000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2025-04-22','BKK-250422-020','Pembelian kasur baru kamar 205','Perlengkapan Kos',1500000,'Lunas','Transfer Bank','Kamar 205','Toko Mebel Semarang'),
  -- Mei
  ('2025-05-02','BKK-250502-021','Pembayaran tagihan listrik bulan April','Listrik',2520000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2025-05-06','BKK-250506-022','Langganan WiFi dan CCTV Mei','Internet/WiFi',625000,'Lunas','Transfer Bank','Semua Kamar','Indihome'),
  ('2025-05-07','BKK-250507-023','Gaji petugas kebersihan bulan Mei','Gaji Karyawan',1800000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2025-05-13','BKK-250513-024','Pembayaran tagihan air PDAM Mei','Air',890000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2025-05-19','BKK-250519-025','Jasa kebersihan general cleaning akhir bulan','Kebersihan',750000,'Lunas','Kas Tunai (Petty Cash)','Semua Kamar','-'),
  -- Juni
  ('2025-06-02','BKK-250602-026','Pembayaran tagihan listrik bulan Mei','Listrik',2450000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2025-06-04','BKK-250604-027','Belanja perlengkapan kamar mandi bersama','Perlengkapan Kos',875000,'Lunas','Kas Tunai (Petty Cash)','Area Umum','-'),
  ('2025-06-07','BKK-250607-028','Gaji petugas kebersihan bulan Juni','Gaji Karyawan',1800000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2025-06-10','BKK-250610-029','Pembayaran internet dan CCTV Juni','Internet/WiFi',625000,'Lunas','Transfer Bank','Semua Kamar','Indihome'),
  ('2025-06-17','BKK-250617-030','Pembayaran tagihan air PDAM Juni','Air',980000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  -- 2026: September
  ('2026-09-02','BKK-260902-031','Pembayaran tagihan listrik bulan Agustus','Listrik',2650000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2026-09-03','BKK-260903-032','Gaji petugas kebersihan bulan September','Gaji Karyawan',2000000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2026-09-05','BKK-260905-033','Pembayaran tagihan air PDAM September','Air',1050000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2026-09-08','BKK-260908-034','Langganan WiFi Indihome dan CCTV September','Internet/WiFi',750000,'Lunas','Transfer Bank','Semua Kamar','Indihome'),
  ('2026-09-11','BKK-260911-035','Servis AC kamar 101, 102, dan 205','Perawatan & Perbaikan',1800000,'Lunas','Kas Tunai (Petty Cash)','Kamar 101','CV Dingin Sejuk'),
  ('2026-09-15','BKK-260915-036','Pembelian alat kebersihan dan disinfektan','Kebersihan',520000,'Lunas','Kas Tunai (Petty Cash)','Semua Kamar','-'),
  ('2026-09-20','BKK-260920-037','Penggantian kran air kamar mandi lantai 2','Perawatan & Perbaikan',450000,'Lunas','Kas Tunai (Petty Cash)','Lantai 2','Pak Joko Tukang'),
  ('2026-09-25','BKK-260925-038','Pembelian tirai dan gantungan baju kamar 301','Perlengkapan Kos',680000,'Lunas','Kas Tunai (Petty Cash)','Kamar 301','Toko Mebel Semarang'),
  -- Oktober 2026
  ('2026-10-02','BKK-261002-039','Pembayaran tagihan listrik bulan September','Listrik',2820000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2026-10-03','BKK-261003-040','Gaji petugas kebersihan bulan Oktober','Gaji Karyawan',2000000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2026-10-06','BKK-261006-041','Pembayaran tagihan air PDAM Oktober','Air',980000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2026-10-08','BKK-261008-042','Langganan WiFi Indihome dan CCTV Oktober','Internet/WiFi',750000,'Lunas','Transfer Bank','Semua Kamar','Indihome'),
  ('2026-10-12','BKK-261012-043','Perbaikan atap yang bocor di lantai 3','Perawatan & Perbaikan',3500000,'Lunas','Transfer Bank','Lantai 3','CV Bangun Rapi'),
  ('2026-10-15','BKK-261015-044','Jasa general cleaning akhir bulan','Kebersihan',850000,'Lunas','Kas Tunai (Petty Cash)','Semua Kamar','-'),
  ('2026-10-18','BKK-261018-045','Pembelian meja belajar kamar 202 dan 203','Perlengkapan Kos',1400000,'Lunas','Transfer Bank','Kamar 202','Toko Mebel Semarang'),
  ('2026-10-27','BKK-261027-046','Penggantian saklar dan stop kontak koridor','Perawatan & Perbaikan',620000,'Lunas','Kas Tunai (Petty Cash)','Semua Kamar','Pak Joko Tukang'),
  -- November 2026
  ('2026-11-01','BKK-261101-047','Pembayaran tagihan listrik bulan Oktober','Listrik',2750000,'Belum Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2026-11-03','BKK-261103-048','Gaji petugas kebersihan bulan November','Gaji Karyawan',2000000,'Belum Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2026-11-03','BKK-261103-049','Pembayaran tagihan air PDAM November','Air',1020000,'Belum Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2026-11-03','BKK-261103-050','Langganan WiFi Indihome dan CCTV November','Internet/WiFi',750000,'Belum Lunas','Transfer Bank','Semua Kamar','Indihome')
ON CONFLICT (transaction_number) DO NOTHING;
