/*
# Create property settings for the accounting dashboard

1. New Tables
- `property_settings` stores the single shared property profile used by the demo.
- `id` is the stable row identifier.
- `business_name` stores the boarding-house name.
- `business_address` stores the property address.
- `manager_name` stores the displayed account administrator name.
- `updated_at` stores the last change time.

2. Modified Tables
- None.

3. Security
- Row Level Security is enabled.
- This is a single-tenant app without sign-in, so anonymous and authenticated roles may read and update the shared profile.
- Only the needed SELECT and UPDATE privileges are granted.

4. Important Notes
- The app uses one fixed profile row for the demo and creates it on first load when needed.
- No user-owned or auth-linked columns are introduced.
*/

CREATE TABLE IF NOT EXISTS public.property_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name text NOT NULL DEFAULT 'Harmoni Residence Kost Putri',
  business_address text NOT NULL DEFAULT 'Jl. Cempaka Raya No. 18, Tembalang, Kota Semarang',
  manager_name text NOT NULL DEFAULT 'Andi Setiawan',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.property_settings TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_property_settings" ON public.property_settings;
CREATE POLICY "public_read_property_settings" ON public.property_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_update_property_settings" ON public.property_settings;
CREATE POLICY "public_update_property_settings" ON public.property_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.property_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
