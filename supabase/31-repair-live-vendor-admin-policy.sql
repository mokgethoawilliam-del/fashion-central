-- ============================================================
-- Repair live vendor admin wiring
-- Allows a logged-in admin to update the vendor row when either:
-- 1. public.profiles links auth.uid() to vendors.id, or
-- 2. auth user metadata contains vendor_id.
-- ============================================================

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor admins can select own vendor" ON public.vendors;
CREATE POLICY "Vendor admins can select own vendor"
ON public.vendors
FOR SELECT
TO authenticated
USING (
    id IN (SELECT vendor_id FROM public.profiles WHERE id = auth.uid())
    OR id::text = COALESCE(auth.jwt() -> 'user_metadata' ->> 'vendor_id', '')
);

DROP POLICY IF EXISTS "Vendor admins can update own vendor" ON public.vendors;
CREATE POLICY "Vendor admins can update own vendor"
ON public.vendors
FOR UPDATE
TO authenticated
USING (
    id IN (SELECT vendor_id FROM public.profiles WHERE id = auth.uid())
    OR id::text = COALESCE(auth.jwt() -> 'user_metadata' ->> 'vendor_id', '')
)
WITH CHECK (
    id IN (SELECT vendor_id FROM public.profiles WHERE id = auth.uid())
    OR id::text = COALESCE(auth.jwt() -> 'user_metadata' ->> 'vendor_id', '')
);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

NOTIFY pgrst, 'reload schema';
