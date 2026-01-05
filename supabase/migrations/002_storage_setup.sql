-- ============================================
-- CEGAS Storage Bucket 設定
-- 在 Supabase Dashboard 的 SQL Editor 執行
-- ============================================

-- 建立 submissions bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'submissions',
    'submissions',
    false,
    10485760, -- 10MB 限制
    ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage RLS 政策
-- ============================================

-- 刪除舊政策（如果存在）
DROP POLICY IF EXISTS "Admin can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view accessible files" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete files" ON storage.objects;

-- Admin 可以上傳檔案
CREATE POLICY "Admin can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'submissions' 
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 用戶可以查看自己有權限的檔案
CREATE POLICY "Users can view accessible files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'submissions'
    AND (
        -- Admin 可以看全部
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        -- TA 只能看分配給自己的
        EXISTS (
            SELECT 1 FROM public.submissions s 
            WHERE s.file_path LIKE '%' || storage.objects.name || '%'
            AND s.assigned_to = auth.uid()
        )
    )
);

-- Admin 可以更新檔案
CREATE POLICY "Admin can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'submissions' 
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Admin 可以刪除檔案
CREATE POLICY "Admin can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'submissions' 
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
