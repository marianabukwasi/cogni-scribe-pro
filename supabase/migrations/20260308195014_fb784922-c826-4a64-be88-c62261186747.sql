-- Create storage bucket for knowledge base files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('knowledge-base', 'knowledge-base', false, 20971520)
ON CONFLICT (id) DO NOTHING;

-- RLS: professionals can upload their own files (path starts with their user_id)
CREATE POLICY "Professionals upload own KB files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'knowledge-base' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: professionals can read their own files
CREATE POLICY "Professionals read own KB files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge-base' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: professionals can delete their own files
CREATE POLICY "Professionals delete own KB files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'knowledge-base' AND (storage.foldername(name))[1] = auth.uid()::text);