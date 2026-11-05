-- ============================================================
-- TRIGGERS & FUNCTIONS
-- Sistem Informasi Akuntansi Kas Keluar
-- Harmoni Residence Kost Putri
-- ============================================================
-- Jalankan SETELAH schema.sql
-- ============================================================

-- ── 1. Auto-update kolom updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk tabel cash_expenses
DROP TRIGGER IF EXISTS trg_cash_expenses_updated_at ON public.cash_expenses;
CREATE TRIGGER trg_cash_expenses_updated_at
  BEFORE UPDATE ON public.cash_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger untuk tabel property_settings
DROP TRIGGER IF EXISTS trg_property_settings_updated_at ON public.property_settings;
CREATE TRIGGER trg_property_settings_updated_at
  BEFORE UPDATE ON public.property_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 2. Validasi keseimbangan jurnal (debit = kredit) ─────────
CREATE OR REPLACE FUNCTION public.validate_jurnal_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debit  numeric;
  total_kredit numeric;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN posisi = 'Debit'  THEN nominal ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN posisi = 'Kredit' THEN nominal ELSE 0 END), 0)
  INTO total_debit, total_kredit
  FROM public.jurnal_detail
  WHERE jurnal_id = NEW.jurnal_id;

  -- Hanya validasi jika sudah ada minimal 2 entry (debit dan kredit)
  IF total_debit > 0 AND total_kredit > 0 AND total_debit <> total_kredit THEN
    RAISE WARNING 'Jurnal % tidak seimbang: Debit=% Kredit=%',
      NEW.jurnal_id, total_debit, total_kredit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_jurnal_balance ON public.jurnal_detail;
CREATE TRIGGER trg_validate_jurnal_balance
  AFTER INSERT OR UPDATE ON public.jurnal_detail
  FOR EACH ROW EXECUTE FUNCTION public.validate_jurnal_balance();


-- ── 3. View: Ringkasan Saldo per Akun ────────────────────────
CREATE OR REPLACE VIEW public.v_saldo_akun AS
SELECT
  a.kode,
  a.nama,
  a.jenis,
  a.sub_jenis,
  a.saldo_normal,
  COALESCE(SUM(CASE WHEN jd.posisi = 'Debit'  THEN jd.nominal ELSE 0 END), 0) AS total_debit,
  COALESCE(SUM(CASE WHEN jd.posisi = 'Kredit' THEN jd.nominal ELSE 0 END), 0) AS total_kredit,
  CASE a.saldo_normal
    WHEN 'Debit'  THEN COALESCE(SUM(CASE WHEN jd.posisi='Debit' THEN jd.nominal ELSE -jd.nominal END), 0)
    WHEN 'Kredit' THEN COALESCE(SUM(CASE WHEN jd.posisi='Kredit' THEN jd.nominal ELSE -jd.nominal END), 0)
  END AS saldo
FROM public.akun a
LEFT JOIN public.jurnal_detail jd ON jd.kode_akun = a.kode
GROUP BY a.kode, a.nama, a.jenis, a.sub_jenis, a.saldo_normal
ORDER BY a.kode;

GRANT SELECT ON public.v_saldo_akun TO anon, authenticated;


-- ── 4. View: Neraca Saldo ─────────────────────────────────────
CREATE OR REPLACE VIEW public.v_neraca_saldo AS
SELECT
  kode,
  nama,
  jenis,
  CASE WHEN saldo >= 0 AND saldo_normal = 'Debit'  THEN saldo ELSE 0 END AS saldo_debit,
  CASE WHEN saldo >= 0 AND saldo_normal = 'Kredit' THEN saldo ELSE 0 END AS saldo_kredit
FROM public.v_saldo_akun
WHERE total_debit > 0 OR total_kredit > 0
ORDER BY kode;

GRANT SELECT ON public.v_neraca_saldo TO anon, authenticated;
