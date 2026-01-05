-- ============================================
-- CEGAS 資料庫初始化腳本
-- C++ 考卷自動化批改系統
-- ============================================

-- ============================================
-- 1. 使用者資料表 (連結 Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ta' CHECK (role IN ('admin', 'ta')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- ============================================
-- 2. 考試/作業表
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('exam', 'homework')),
    semester VARCHAR(20) NOT NULL,
    due_date TIMESTAMPTZ,
    total_questions INT DEFAULT 5 CHECK (total_questions > 0),
    points_per_question DECIMAL(5,2) DEFAULT 20 CHECK (points_per_question > 0),
    created_by UUID REFERENCES profiles(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_assignments_semester ON assignments(semester);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);

-- ============================================
-- 3. 學生作業提交表
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id VARCHAR(20) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    class_name VARCHAR(50),
    file_path TEXT NOT NULL,
    original_filename VARCHAR(255),
    assigned_to UUID REFERENCES profiles(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'analyzed', 'graded')),
    -- 解析驗證欄位
    parse_completeness DECIMAL(5,2),
    unmatched_content TEXT,
    parse_warnings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assigned_to ON submissions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);

-- ============================================
-- 4. 程式碼片段表 (每題一筆)
-- ============================================
CREATE TABLE IF NOT EXISTS code_snippets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    question_number INT NOT NULL CHECK (question_number > 0),
    raw_code TEXT,
    normalized_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, question_number)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_code_snippets_submission_id ON code_snippets(submission_id);

-- ============================================
-- 5. Cppcheck 分析結果表
-- ============================================
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snippet_id UUID NOT NULL REFERENCES code_snippets(id) ON DELETE CASCADE,
    error_type VARCHAR(50),
    error_id VARCHAR(100),
    message TEXT,
    line_number INT,
    severity VARCHAR(20) CHECK (severity IN ('error', 'warning', 'style', 'performance', 'portability', 'information')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_analysis_results_snippet_id ON analysis_results(snippet_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_error_type ON analysis_results(error_type);

-- ============================================
-- 6. 評分結果表
-- ============================================
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    question_number INT NOT NULL CHECK (question_number > 0),
    score DECIMAL(5,2) CHECK (score >= 0),
    max_score DECIMAL(5,2) DEFAULT 20 CHECK (max_score > 0),
    comment TEXT,
    annotations JSONB,
    graded_by UUID REFERENCES profiles(id),
    graded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(submission_id, question_number)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_grades_submission_id ON grades(submission_id);
CREATE INDEX IF NOT EXISTS idx_grades_graded_by ON grades(graded_by);

-- ============================================
-- 7. 自動建立 profile 的觸發器
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'ta')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 刪除舊的觸發器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 建立新觸發器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 8. 自動更新 updated_at 的觸發器
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles 表的 updated_at 觸發器
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 9. 啟用 Row Level Security (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. RLS 政策 - Profiles
-- ============================================
-- 所有已登入用戶可以查看 profiles
CREATE POLICY "Users can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- 用戶只能更新自己的 profile（非角色欄位）
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 只有 Admin 可以更新任何人的角色
CREATE POLICY "Admin can update any profile"
ON profiles FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- 11. RLS 政策 - Assignments
-- ============================================
-- 所有已登入用戶可以查看 active 的 assignments
CREATE POLICY "Users can view active assignments"
ON assignments FOR SELECT
TO authenticated
USING (status = 'active' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 只有 Admin 可以建立 assignments
CREATE POLICY "Admin can create assignments"
ON assignments FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 只有 Admin 可以更新 assignments
CREATE POLICY "Admin can update assignments"
ON assignments FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 只有 Admin 可以刪除 assignments
CREATE POLICY "Admin can delete assignments"
ON assignments FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- 12. RLS 政策 - Submissions
-- ============================================
-- 助教只能看到分配給自己的 submissions，Admin 可以看全部
CREATE POLICY "TA can view assigned submissions"
ON submissions FOR SELECT
TO authenticated
USING (
    assigned_to = auth.uid()
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 只有 Admin 可以建立 submissions
CREATE POLICY "Admin can create submissions"
ON submissions FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 助教可以更新分配給自己的 submissions，Admin 可以更新全部
CREATE POLICY "Users can update accessible submissions"
ON submissions FOR UPDATE
TO authenticated
USING (
    assigned_to = auth.uid()
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 只有 Admin 可以刪除 submissions
CREATE POLICY "Admin can delete submissions"
ON submissions FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- 13. RLS 政策 - Code Snippets
-- ============================================
-- 用戶可以查看自己有權限的 submission 的 code_snippets
CREATE POLICY "Users can view accessible code snippets"
ON code_snippets FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM submissions s 
        WHERE s.id = code_snippets.submission_id 
        AND (s.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
);

-- 只有 Admin 和系統可以建立/更新 code_snippets
CREATE POLICY "Admin can manage code snippets"
ON code_snippets FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- 14. RLS 政策 - Analysis Results
-- ============================================
-- 用戶可以查看自己有權限的 code_snippets 的分析結果
CREATE POLICY "Users can view accessible analysis results"
ON analysis_results FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM code_snippets cs
        JOIN submissions s ON s.id = cs.submission_id
        WHERE cs.id = analysis_results.snippet_id
        AND (s.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
);

-- 只有 Admin 可以管理分析結果（通常由 GitHub Actions 透過 service key 寫入）
CREATE POLICY "Admin can manage analysis results"
ON analysis_results FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- 15. RLS 政策 - Grades
-- ============================================
-- 用戶可以查看自己評分的或 Admin 查看全部
CREATE POLICY "Users can view accessible grades"
ON grades FOR SELECT
TO authenticated
USING (
    graded_by = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM submissions s 
        WHERE s.id = grades.submission_id 
        AND s.assigned_to = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 助教可以為分配給自己的 submission 評分
CREATE POLICY "TA can create grades for assigned submissions"
ON grades FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM submissions s 
        WHERE s.id = grades.submission_id 
        AND s.assigned_to = auth.uid()
    )
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 助教可以更新自己評分的 grades
CREATE POLICY "Users can update own grades"
ON grades FOR UPDATE
TO authenticated
USING (
    graded_by = auth.uid()
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 只有 Admin 可以刪除 grades
CREATE POLICY "Admin can delete grades"
ON grades FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- 16. Storage Bucket 設定 (需在 Supabase Dashboard 執行)
-- ============================================
-- 注意：以下 Storage 政策需要在 Supabase Dashboard 的 Storage 區域設定
-- 或透過 supabase CLI 執行

-- 建立 submissions bucket (private)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', false);

-- Storage RLS 政策範例：
-- CREATE POLICY "Admin can upload files"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--     bucket_id = 'submissions' 
--     AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
-- );

-- CREATE POLICY "Users can view accessible files"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--     bucket_id = 'submissions'
--     AND (
--         EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
--         OR
--         EXISTS (
--             SELECT 1 FROM submissions s 
--             WHERE s.file_path = name 
--             AND s.assigned_to = auth.uid()
--         )
--     )
-- );
