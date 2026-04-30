-- ============================================================
-- Poultry Central: Clean platform foundation
-- Safe, additive baseline for the current multi-tenant app.
-- Run this in Supabase SQL Editor on an existing project.
-- ============================================================

-- Farms -------------------------------------------------------
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'farms' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.farms ADD COLUMN owner_id UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'farms' AND column_name = 'site_title'
  ) THEN
    ALTER TABLE public.farms ADD COLUMN site_title TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'farms' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.farms ADD COLUMN logo_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'farms' AND column_name = 'hero_image_url'
  ) THEN
    ALTER TABLE public.farms ADD COLUMN hero_image_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'farms' AND column_name = 'about_image_url'
  ) THEN
    ALTER TABLE public.farms ADD COLUMN about_image_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'farms' AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE public.farms ADD COLUMN primary_color TEXT DEFAULT '#1d4d35';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'farms' AND column_name = 'business_config'
  ) THEN
    ALTER TABLE public.farms ADD COLUMN business_config JSONB DEFAULT '{
      "shop_status": "open",
      "official_name": "",
      "notifications": { "email": true, "whatsapp": true },
      "tax_enabled": false
    }'::jsonb;
  END IF;
END $$;

UPDATE public.farms
SET primary_color = COALESCE(
  NULLIF(primary_color, ''),
  NULLIF(branding->>'primary_color', ''),
  '#1d4d35'
)
WHERE primary_color IS NULL
   OR primary_color = '';

-- Site gallery ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_gallery ENABLE ROW LEVEL SECURITY;

-- Farm services -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.farm_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  icon TEXT DEFAULT 'Truck',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.farm_services ENABLE ROW LEVEL SECURITY;

-- Policies ----------------------------------------------------
DROP POLICY IF EXISTS "Public read access on farms" ON public.farms;
CREATE POLICY "Public read access on farms"
  ON public.farms FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Owners can manage their own farm" ON public.farms;
DROP POLICY IF EXISTS "Owners can create their own farm" ON public.farms;
DROP POLICY IF EXISTS "Owners can update their own farm" ON public.farms;
DROP POLICY IF EXISTS "Owners can delete their own farm" ON public.farms;

CREATE POLICY "Owners can create their own farm"
  ON public.farms FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their own farm"
  ON public.farms FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their own farm"
  ON public.farms FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Public read access on products" ON public.products;
CREATE POLICY "Public read access on products"
  ON public.products FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Owners can manage their products" ON public.products;
CREATE POLICY "Owners can manage their products"
  ON public.products FOR ALL TO authenticated
  USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Public read access on testimonials" ON public.testimonials;
CREATE POLICY "Public read access on testimonials"
  ON public.testimonials FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Owners can manage their testimonials" ON public.testimonials;
CREATE POLICY "Owners can manage their testimonials"
  ON public.testimonials FOR ALL TO authenticated
  USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Public read access on gallery" ON public.site_gallery;
CREATE POLICY "Public read access on gallery"
  ON public.site_gallery FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Owners can manage their gallery" ON public.site_gallery;
CREATE POLICY "Owners can manage their gallery"
  ON public.site_gallery FOR ALL TO authenticated
  USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Public read access on farm services" ON public.farm_services;
CREATE POLICY "Public read access on farm services"
  ON public.farm_services FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Owners can manage their farm services" ON public.farm_services;
CREATE POLICY "Owners can manage their farm services"
  ON public.farm_services FOR ALL TO authenticated
  USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage their orders" ON public.orders;
CREATE POLICY "Owners can manage their orders"
  ON public.orders FOR ALL TO authenticated
  USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Public all on orders" ON public.orders;
CREATE POLICY "Public insert orders"
  ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can manage their batches" ON public.batches;
CREATE POLICY "Owners can manage their batches"
  ON public.batches FOR ALL TO authenticated
  USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can manage their inventory logs" ON public.inventory_logs;
CREATE POLICY "Owners can manage their inventory logs"
  ON public.inventory_logs FOR ALL TO authenticated
  USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
