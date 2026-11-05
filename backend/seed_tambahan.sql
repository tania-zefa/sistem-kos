-- ============================================================
-- SEED TAMBAHAN — Data Contoh untuk Pengujian Lebih Lanjut
-- Sistem Informasi Akuntansi Kas Keluar
-- Harmoni Residence Kost Putri
-- ============================================================
-- Jalankan SETELAH seed.sql
-- Berisi data transaksi tambahan untuk memperkaya tampilan
-- grafik dan laporan akuntansi
-- ============================================================

INSERT INTO public.cash_expenses
  (transaction_date, transaction_number, description, category, amount, status, payment_method, unit_kamar, vendor)
VALUES
  -- Juli 2025
  ('2025-07-02','BKK-250702-051','Pembayaran tagihan listrik bulan Juni','Listrik',2380000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2025-07-05','BKK-250705-052','Pembayaran tagihan air PDAM Juli','Air',870000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2025-07-07','BKK-250707-053','Gaji petugas kebersihan bulan Juli','Gaji Karyawan',1800000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2025-07-10','BKK-250710-054','Langganan WiFi dan CCTV Juli','Internet/WiFi',625000,'Lunas','Transfer Bank','Semua Kamar','Indihome'),
  ('2025-07-20','BKK-250720-055','Penggantian pintu kamar mandi lantai 1','Perawatan & Perbaikan',780000,'Lunas','Kas Tunai (Petty Cash)','Lantai 1','Pak Joko Tukang'),
  -- Agustus 2025
  ('2025-08-02','BKK-250802-056','Pembayaran tagihan listrik bulan Juli','Listrik',2600000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2025-08-07','BKK-250807-057','Gaji petugas kebersihan bulan Agustus','Gaji Karyawan',1800000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2025-08-10','BKK-250810-058','Pembayaran tagihan air PDAM Agustus','Air',920000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2025-08-15','BKK-250815-059','Pembelian rak sepatu dan cermin kamar','Perlengkapan Kos',950000,'Lunas','Kas Tunai (Petty Cash)','Semua Kamar','Toko Mebel Semarang'),
  -- September 2025
  ('2025-09-02','BKK-250902-060','Pembayaran tagihan listrik bulan Agustus','Listrik',2480000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2025-09-07','BKK-250907-061','Gaji petugas kebersihan bulan September','Gaji Karyawan',1800000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2025-09-10','BKK-250910-062','Pembayaran tagihan air PDAM September','Air',895000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2025-09-12','BKK-250912-063','Servis dan isi freon AC kamar 301, 302','Perawatan & Perbaikan',1400000,'Lunas','Kas Tunai (Petty Cash)','Lantai 3','CV Dingin Sejuk'),
  -- Oktober 2025
  ('2025-10-02','BKK-251002-064','Pembayaran tagihan listrik bulan September','Listrik',2730000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2025-10-07','BKK-251007-065','Gaji petugas kebersihan bulan Oktober','Gaji Karyawan',1800000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2025-10-15','BKK-251015-066','Pembayaran tagihan air PDAM Oktober','Air',935000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2025-10-20','BKK-251020-067','Renovasi kamar mandi bersama lantai 2','Perawatan & Perbaikan',4200000,'Lunas','Transfer Bank','Lantai 2','CV Bangun Rapi'),
  -- November 2025
  ('2025-11-02','BKK-251102-068','Pembayaran tagihan listrik bulan Oktober','Listrik',2810000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2025-11-07','BKK-251107-069','Gaji petugas kebersihan bulan November','Gaji Karyawan',1800000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2025-11-10','BKK-251110-070','Pembayaran tagihan air PDAM November','Air',960000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  -- Desember 2025
  ('2025-12-02','BKK-251202-071','Pembayaran tagihan listrik bulan November','Listrik',2920000,'Lunas','Transfer Bank','Semua Kamar','PLN'),
  ('2025-12-05','BKK-251205-072','Pembayaran tagihan air PDAM Desember','Air',1010000,'Lunas','Transfer Bank','Semua Kamar','PDAM'),
  ('2025-12-07','BKK-251207-073','Gaji petugas kebersihan bulan Desember','Gaji Karyawan',2000000,'Lunas','Transfer Bank','Semua Kamar','Pak Budi'),
  ('2025-12-10','BKK-251210-074','Langganan WiFi dan CCTV Desember','Internet/WiFi',750000,'Lunas','Transfer Bank','Semua Kamar','Indihome'),
  ('2025-12-20','BKK-251220-075','Pembelian dekorasi dan perlengkapan akhir tahun','Perlengkapan Kos',1200000,'Lunas','Kas Tunai (Petty Cash)','Semua Kamar','-')
ON CONFLICT (transaction_number) DO NOTHING;
