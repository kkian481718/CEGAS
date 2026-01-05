# Supabase 設定指南

本指南說明如何設定 CEGAS 系統所需的 Supabase 專案。

## 1. 建立 Supabase 專案

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 點擊 "New Project"
3. 填寫專案資訊：
   - **Name**: CEGAS
   - **Database Password**: 設定一個強密碼（請妥善保存）
   - **Region**: 選擇最近的區域（例如：Southeast Asia）
4. 點擊 "Create new project"

## 2. 取得 API Keys

專案建立後，前往 **Settings > API**：

- **Project URL**: 複製到 `NEXT_PUBLIC_SUPABASE_URL`
- **anon (public) key**: 複製到 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key**: 複製到 `SUPABASE_SERVICE_ROLE_KEY`（⚠️ 此金鑰需保密）

## 3. 執行資料庫 Migration

### 方法 A：使用 SQL Editor（推薦新手）

1. 在 Supabase Dashboard 中，前往 **SQL Editor**
2. 點擊 "New query"
3. 複製 `supabase/migrations/001_initial_schema.sql` 的內容
4. 點擊 "Run" 執行
5. 再執行 `supabase/migrations/002_storage_setup.sql`

### 方法 B：使用 Supabase CLI

如果無法全域安裝，可以使用專案內建的 CLI (已安裝為開發依賴)：

```bash
# 登入
npx supabase login

# 連結專案
npx supabase link --project-ref <your-project-ref>

# 執行 migration
npx supabase db push
```

## 4. 設定 Storage Bucket

如果 `002_storage_setup.sql` 執行失敗，手動建立：

1. 前往 **Storage**
2. 點擊 "New bucket"
3. 設定：
   - **Name**: `submissions`
   - **Public bucket**: ❌ 關閉（Private）
   - **File size limit**: 10MB
   - **Allowed MIME types**:
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/json`

## 5. 啟用 Email 驗證

1. 前往 **Authentication > Providers**
2. 確認 **Email** 已啟用
3. （可選）在 **Email Templates** 自訂郵件內容

## 6. 建立第一個 Admin 帳號

### 步驟 1：註冊帳號

使用系統的註冊功能或在 Dashboard 中：

1. 前往 **Authentication > Users**
2. 點擊 "Add user"
3. 選擇 "Create new user"
4. 輸入 Email 和密碼

### 步驟 2：升級為 Admin

在 **SQL Editor** 中執行：

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-admin@email.com';
```

## 7. 驗證設定

執行以下 SQL 確認設定正確：

```sql
-- 檢查所有表格是否建立
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- 檢查 RLS 是否啟用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 檢查 Storage bucket
SELECT * FROM storage.buckets WHERE id = 'submissions';
```

## 8. 本地開發設定

1. 複製 `.env.example` 為 `.env.local`
2. 填入上述取得的 API Keys
3. 執行 `npm run dev` 啟動開發伺服器

## 常見問題

### Q: RLS 政策導致無法讀取資料？

確認使用者已登入，且 `profiles` 表中有對應的記錄。

### Q: Storage 上傳失敗？

檢查：

1. Bucket 是否存在
2. 檔案類型是否在允許列表中
3. 檔案大小是否超過限制

### Q: 觸發器沒有自動建立 Profile？

確認 `handle_new_user` 函數和觸發器已正確建立：

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
