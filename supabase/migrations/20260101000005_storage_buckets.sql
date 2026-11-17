-- ====================================================================
-- KRIA AI - Supabase Storage Bucket Configuration Migration
-- Configures 'product-images' bucket with RLS policies
-- ====================================================================

-- 1. Create product-images storage bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read access to product images
CREATE POLICY "Public users can view product images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');

-- 3. Restrict upload to authenticated team members
CREATE POLICY "Authenticated users can upload product images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'product-images');

-- 4. Restrict delete to Owner/Admin
CREATE POLICY "Only owners and admins can delete product images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'product-images' AND public.is_owner_or_admin());
