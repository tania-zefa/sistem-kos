/*
# Create cash expenses table for the boarding-house accounting demo

1. New Tables
- `cash_expenses` stores every cash-out transaction shown in the application.
- `id` is the stable UUID identifier.
- `transaction_date` stores the transaction date.
- `transaction_number` stores the human-readable transaction number.
- `description` stores the expense explanation.
- `category` stores one of the operating expense categories.
- `amount` stores the expense amount in Indonesian Rupiah.
- `created_at` and `updated_at` store record timestamps.

2. Modified Tables
- None.

3. Security
- Row Level Security is enabled.
- The application is a single-tenant demo without sign-in, so anonymous and authenticated roles can perform the four CRUD operations on this intentionally shared dataset.
- Table privileges are limited to SELECT, INSERT, UPDATE, and DELETE for the two application roles.

4. Important Notes
- Transaction numbers are unique.
- Amounts must be positive.
- Category values are constrained to the supported operating expense categories.
*/

CREATE TABLE IF NOT EXISTS public.cash_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date date NOT NULL,
  transaction_number text NOT NULL UNIQUE,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('Listrik', 'Air', 'Internet/WiFi', 'Kebersihan', 'Perawatan & Perbaikan', 'Gaji Karyawan', 'Perlengkapan Kos', 'Biaya Lainnya')),
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_expenses ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_expenses TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_cash_expenses" ON public.cash_expenses;
CREATE POLICY "public_read_cash_expenses" ON public.cash_expenses FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_cash_expenses" ON public.cash_expenses;
CREATE POLICY "public_insert_cash_expenses" ON public.cash_expenses FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_cash_expenses" ON public.cash_expenses;
CREATE POLICY "public_update_cash_expenses" ON public.cash_expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_cash_expenses" ON public.cash_expenses;
CREATE POLICY "public_delete_cash_expenses" ON public.cash_expenses FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS cash_expenses_transaction_date_idx ON public.cash_expenses (transaction_date DESC);
CREATE INDEX IF NOT EXISTS cash_expenses_category_idx ON public.cash_expenses (category);
