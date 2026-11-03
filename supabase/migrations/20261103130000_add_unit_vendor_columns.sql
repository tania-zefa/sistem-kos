/*
# Add unit_kamar and vendor columns to cash_expenses

1. Changes
- Add `unit_kamar` column: alokasi kamar/lantai terkait pengeluaran
- Add `vendor` column: nama vendor / penerima uang
*/

ALTER TABLE public.cash_expenses
  ADD COLUMN IF NOT EXISTS unit_kamar text NOT NULL DEFAULT 'Semua Kamar',
  ADD COLUMN IF NOT EXISTS vendor text NOT NULL DEFAULT '-';
