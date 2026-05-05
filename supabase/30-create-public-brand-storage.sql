-- ============================================================
-- Public brand asset storage
-- Logos, hero images, gallery images, and business documents.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-documents', 'business-documents', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

DROP POLICY IF EXISTS "Public read business documents" ON storage.objects;
CREATE POLICY "Public read business documents"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'business-documents');

DROP POLICY IF EXISTS "Authenticated upload business documents" ON storage.objects;
CREATE POLICY "Authenticated upload business documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-documents');

DROP POLICY IF EXISTS "Authenticated update business documents" ON storage.objects;
CREATE POLICY "Authenticated update business documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'business-documents')
WITH CHECK (bucket_id = 'business-documents');

DROP POLICY IF EXISTS "Authenticated delete business documents" ON storage.objects;
CREATE POLICY "Authenticated delete business documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'business-documents');
