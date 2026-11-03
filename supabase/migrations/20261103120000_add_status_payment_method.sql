/*
# Add status and payment_method columns to cash_expenses

1. Changes
- Add `status` column: 'Lunas' | 'Belum Lunas' | 'Sebagian' (default 'Lunas')
- Add `payment_method` column: 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Debit' | 'Lainnya' (default 'Tunai')

2. Existing data
- All existing rows default to 'Lunas' and 'Tunai'
*/

ALTER TABLE public.cash_expenses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Lunas'
    CHECK (status IN ('Lunas', 'Belum Lunas', 'Sebagian')),
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'Tunai'
    CHECK (payment_method IN ('Tunai', 'Transfer Bank', 'QRIS', 'Debit', 'Lainnya'));
