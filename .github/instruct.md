# C++ 考卷自動化批改系統 (CEGAS) 開發規格書

**文件版本：** 5.0 (Multi-TA Edition)
**目標：** 建立一個**完全免費**、支援多助教協作的 C++ 考卷批改系統。
**核心功能：** 多助教登入、考卷隨機分配、DOCX 批改、Cppcheck 錯誤偵測、成績管理。

---

## 0. 系統架構總覽 (Architecture Overview)

### 0.1 零成本技術棧

| 模組              | 平台                 | 免費額度                          | 用途                                   |
| :---------------- | :------------------- | :-------------------------------- | :------------------------------------- |
| **全棧應用**      | **Vercel** (Next.js) | 無限制 (Hobby)                    | 前端 + API Routes                      |
| **資料庫 + Auth** | **Supabase**         | 500MB DB + 1GB Storage + 50K MAU  | PostgreSQL + 檔案儲存 + **使用者驗證** |
| **Cppcheck 分析** | **GitHub Actions**   | 2000 分鐘/月 (私有) / 無限 (公開) | 執行系統級工具                         |
| **版本控制**      | **GitHub**           | 無限制                            | 程式碼託管                             |

### 0.2 儲存空間規劃

| 項目        | 估算             | 說明                 |
| :---------- | :--------------- | :------------------- |
| 每份 DOCX   | ~100KB           | 學生作業/考卷        |
| 每學期用量  | ~25MB            | 60 人 × 4 次 × 100KB |
| 1GB Storage | **可用 40 學期** | 約 20 年 ✅          |

**永續策略：**

- 每學年結束後，可選擇匯出成績並清理舊檔案
- 資料庫只存 metadata，不存 DOCX 內容（只存 Storage 路徑）

### 0.3 使用者角色

| 角色      | 權限                                       | 人數           |
| :-------- | :----------------------------------------- | :------------- |
| **admin** | 管理助教、建立考試、批量上傳、查看所有成績 | 1-2 人（教授） |
| **ta**    | 查看/批改分配給自己的考卷、輸入成績        | ~10 人（助教） |

### 0.4 系統流程圖

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Admin 工作流程                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  1. 建立考試/作業 → 2. 批量上傳 60 份 DOCX → 3. 勾選助教 → 4. 隨機分配  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                            TA 工作流程                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  1. 登入 → 2. 看到「待批改 12 份」→ 3. 逐份批改 → 4. 輸入分數/評語       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. 專案結構 (Project Structure)

採用 **Next.js App Router** 全棧架構：

```
CEGAS/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # 根布局
│   ├── page.tsx               # 首頁 (登入頁)
│   │
│   ├── (auth)/                # 驗證相關頁面 (路由群組)
│   │   ├── login/
│   │   │   └── page.tsx       # 登入頁
│   │   └── callback/
│   │       └── route.ts       # OAuth callback
│   │
│   ├── (dashboard)/           # 需登入的頁面 (路由群組，共用 layout)
│   │   ├── layout.tsx         # Dashboard 布局 (含側邊欄)
│   │   ├── dashboard/         # /dashboard 路徑
│   │   │   └── page.tsx       # 儀表板首頁
│   │   ├── assignments/       # 考試/作業管理 (Admin)
│   │   │   ├── page.tsx       # 列表
│   │   │   ├── new/
│   │   │   │   └── page.tsx   # 新增考試
│   │   │   └── [id]/
│   │   │       └── page.tsx   # 考試詳情
│   │   ├── upload/            # 批量上傳 (Admin)
│   │   │   └── page.tsx
│   │   ├── users/             # 助教管理 (Admin)
│   │   │   └── page.tsx
│   │   ├── my-tasks/          # 我的待批改 (TA)
│   │   │   └── page.tsx
│   │   └── grade/             # 批改介面
│   │       └── [id]/
│   │           └── page.tsx
│   │
│   └── api/                   # API Routes
│       ├── auth/
│       │   └── [...supabase]/
│       │       └── route.ts   # Supabase Auth helpers
│       ├── upload/
│       │   └── route.ts       # 批量上傳 + 隨機分配
│       ├── analyze/
│       │   └── route.ts       # 觸發 GitHub Actions
│       ├── assignments/
│       │   └── route.ts       # 考試 CRUD
│       ├── submissions/
│       │   └── route.ts       # 作業 CRUD
│       └── users/
│           └── route.ts       # 助教管理
│
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx
│   ├── dashboard/
│   │   ├── Sidebar.tsx        # 側邊欄 (依角色顯示不同選單)
│   │   ├── StatsCard.tsx      # 統計卡片
│   │   └── TaskList.tsx       # 待批改列表
│   ├── upload/
│   │   ├── BulkUploader.tsx   # 批量上傳元件
│   │   └── TASelector.tsx     # 助教勾選元件
│   ├── grading/
│   │   ├── DocxViewer.tsx
│   │   ├── AnnotationCanvas.tsx
│   │   ├── CodeViewer.tsx
│   │   └── GradingForm.tsx
│   └── ui/                    # shadcn/ui 元件
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # 瀏覽器端 client
│   │   ├── server.ts          # Server Component client
│   │   └── middleware.ts      # Auth middleware
│   ├── parser.ts
│   └── utils.ts
│
├── middleware.ts              # Next.js middleware (保護路由)
├── .github/workflows/
│   └── cppcheck.yml
└── ...
```

---

## 2. 使用者驗證與權限 (Authentication & Authorization)

### 2.1 使用 Supabase Auth

Supabase Auth 免費額度：**50,000 MAU**（月活躍用戶），對於 ~12 人綽綽有餘。

**登入方式：** Email + Password（簡單可靠）

### 2.2 使用者資料表

```sql
-- 使用者擴展資料表 (連結 Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ta',  -- 'admin' | 'ta'
    is_active BOOLEAN DEFAULT true,           -- 帳號啟用狀態
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 建立 profile 的觸發器 (新用戶註冊時自動建立)
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

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2.3 權限控制 Middleware

```typescript
// middleware.ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 未登入 → 導向登入頁
  if (!session && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 檢查 Admin 專屬頁面
  const adminOnlyPaths = ["/upload", "/users", "/assignments/new"];
  if (adminOnlyPaths.some((path) => req.nextUrl.pathname.includes(path))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session?.user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/my-tasks", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/(dashboard)/:path*", "/upload/:path*", "/users/:path*"],
};
```

### 2.4 助教管理介面 (Admin Only)

```
┌─────────────────────────────────────────────────────────────┐
│  助教管理                                          [新增助教] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┬──────────────────┬────────┬────────┬────────┐ │
│  │ 狀態    │ 姓名             │ Email  │ 角色   │ 操作   │ │
│  ├─────────┼──────────────────┼────────┼────────┼────────┤ │
│  │ 🟢 啟用 │ 王小明           │ a@b.c  │ ta     │ [禁用] │ │
│  │ 🟢 啟用 │ 李小華           │ d@e.f  │ ta     │ [禁用] │ │
│  │ 🔴 禁用 │ 張三 (已離職)    │ g@h.i  │ ta     │ [啟用] │ │
│  └─────────┴──────────────────┴────────┴────────┴────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 考試/作業管理 (Assignment Management)

### 3.1 資料結構

```sql
-- 考試/作業表
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,              -- 例：「期中考」「作業一」
    type VARCHAR(20) NOT NULL,                -- 'exam' | 'homework'
    semester VARCHAR(20) NOT NULL,            -- 例：'113-1'
    due_date TIMESTAMP,
    total_questions INT DEFAULT 5,            -- 題目數量
    points_per_question DECIMAL(5,2) DEFAULT 20,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'       -- 'active' | 'archived'
);
```

### 3.2 建立考試介面 (Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  建立新考試/作業                                             │
├─────────────────────────────────────────────────────────────┤
│  名稱：    [期中考_____________]                             │
│  類型：    ○ 考試  ● 作業                                   │
│  學期：    [113-1__▼]                                       │
│  題數：    [5__]                                            │
│  每題分數：[20__]                                           │
│                                                             │
│                                    [取消]  [建立並上傳考卷]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 批量上傳與分配 (Bulk Upload & Distribution)

### 4.1 上傳介面 (Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  批量上傳考卷                                    [113-1 期中考]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                     │   │
│   │         📁 拖曳 .docx 檔案至此處上傳               │   │
│   │            或點擊選擇檔案                          │   │
│   │                                                     │   │
│   │         已選擇：58 個檔案                          │   │
│   │                                                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   選擇批改助教：                                            │
│   ☑ 王小明  ☑ 李小華  ☑ 張大衛  ☐ 陳美玲 (請假)           │
│   ☑ 林志明  ☑ 黃小芬  ☑ 吳大同  ☑ 趙小蘭                  │
│                                                             │
│   分配方式：● 隨機平均分配  ○ 手動指定                      │
│                                                             │
│   預覽分配：王小明(8份) 李小華(8份) 張大衛(8份) ...         │
│                                                             │
│                              [取消]  [上傳並分配 (58份)]     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 分配演算法

```typescript
// lib/distribution.ts

interface TA {
  id: string;
  name: string;
}

interface FileToUpload {
  filename: string;
  file: File;
}

export function distributeSubmissions(
  files: FileToUpload[],
  selectedTAs: TA[]
): Map<string, FileToUpload[]> {
  // 隨機打亂考卷順序
  const shuffled = [...files].sort(() => Math.random() - 0.5);

  // 初始化分配結果
  const distribution = new Map<string, FileToUpload[]>();
  selectedTAs.forEach((ta) => distribution.set(ta.id, []));

  // 輪流分配 (Round Robin)
  shuffled.forEach((file, index) => {
    const taIndex = index % selectedTAs.length;
    const taId = selectedTAs[taIndex].id;
    distribution.get(taId)!.push(file);
  });

  return distribution;
}

// 使用範例：
// 58 份考卷 ÷ 7 位助教
// 結果：2人各9份 + 5人各8份 = 18 + 40 = 58 ✓
```

### 4.3 批量上傳 API

```typescript
// app/api/upload/route.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const formData = await request.formData();

  const assignmentId = formData.get("assignment_id") as string;
  const taAssignments = JSON.parse(formData.get("ta_assignments") as string);
  // taAssignments = { "ta-uuid-1": ["file1.docx", "file2.docx"], ... }

  const results = [];

  for (const [taId, filenames] of Object.entries(taAssignments)) {
    for (const filename of filenames as string[]) {
      const file = formData.get(filename) as File;
      if (!file) continue;

      // 解析檔名: 資管二_411335084_易哲祥.docx
      const match = (filename as string).match(/(.+)_(\d+)_(.+)\.docx/);
      if (!match) continue;

      const [, className, studentId, studentName] = match;

      // 上傳檔案到 Storage
      const filePath = `${assignmentId}/${studentId}/original.docx`;
      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      // 建立資料庫記錄
      const { data, error } = await supabase
        .from("submissions")
        .insert({
          assignment_id: assignmentId,
          student_id: studentId,
          student_name: studentName,
          class_name: className,
          file_path: filePath,
          original_filename: filename,
          assigned_to: taId, // 👈 指派給哪位助教
          status: "pending",
        })
        .select()
        .single();

      if (data) results.push(data);
    }
  }

  return NextResponse.json({
    success: true,
    uploaded: results.length,
  });
}
```

---

## 5. 助教儀表板 (TA Dashboard)

### 5.1 儀表板首頁

```
┌─────────────────────────────────────────────────────────────┐
│  👋 歡迎，王小明                                    [登出]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │  📋 待批改  │  │  ✅ 已完成  │  │  📊 總計    │        │
│   │             │  │             │  │             │        │
│   │     12      │  │     48      │  │     60      │        │
│   └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│   📌 待批改考卷                                             │
│   ┌────────────────────────────────────────────────────┐   │
│   │ 考試/作業      │ 學生         │ 狀態    │ 操作    │   │
│   ├────────────────────────────────────────────────────┤   │
│   │ 113-1 期中考   │ 411335001 王○○ │ 待批改  │ [批改] │   │
│   │ 113-1 期中考   │ 411335012 李○○ │ 待批改  │ [批改] │   │
│   │ 113-1 期中考   │ 411335023 張○○ │ 分析中  │ [等待] │   │
│   │ ...            │ ...          │ ...     │ ...    │   │
│   └────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 查詢待批改清單

```typescript
// app/(dashboard)/my-tasks/page.tsx
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function MyTasksPage() {
  const supabase = createServerComponentClient({ cookies });

  // 取得當前使用者
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 查詢分配給我的待批改作業
  const { data: pendingTasks } = await supabase
    .from("submissions")
    .select(
      `
      *,
      assignment:assignments(title, semester, type),
      grades(score)
    `
    )
    .eq("assigned_to", user?.id)
    .order("created_at", { ascending: false });

  const pending = pendingTasks?.filter((t) => t.status === "pending") || [];
  const completed = pendingTasks?.filter((t) => t.status === "graded") || [];

  return (
    <div>
      <StatsCards pending={pending.length} completed={completed.length} />
      <TaskList tasks={pending} />
    </div>
  );
}
```

---

## 6. 批改介面 (Grading Interface)

### 6.1 雙欄佈局

````
┌─────────────────────────────────────────────────────────────┐
│  📝 批改：411335001 王小明 - 期中考              [上一份] [下一份]│
├───────────────────────────┬─────────────────────────────────┤
│                           │  🔴 Cppcheck 錯誤 (3)           │
│   DOCX 原稿預覽           │  ├─ Q3 Line 5: Array bounds    │
│                           │  ├─ Q4 Line 12: Memory leak    │
│   ┌───────────────────┐   │  └─ Q4 Line 18: Uninitialized  │
│   │                   │   │─────────────────────────────────│
│   │  [學生作答內容]   │   │  📝 程式碼檢視 (Q3)             │
│   │                   │   │  ```cpp                        │
│   │                   │   │  int fur[5];                   │
│   └───────────────────┘   │  for(int m=0; m<=5; m++)       │
│                           │  ```                           │
│   🖊️ 畫記工具：            │─────────────────────────────────│
│   [紅筆] [藍筆] [螢光筆]   │  ⭐ 評分                        │
│   [文字] [清除]           │  Q1: [18] / 20  [寫得不錯]      │
│                           │  Q2: [15] / 20  [邏輯有誤]      │
│                           │  Q3: [10] / 20  [陣列越界]      │
│                           │  Q4: [12] / 20  [記憶體洩漏]    │
│                           │  Q5: [20] / 20  [完美]          │
│                           │─────────────────────────────────│
│                           │  總分：75 / 100                 │
│                           │                    [儲存並下一份]│
└───────────────────────────┴─────────────────────────────────┘
````

### 6.2 建議套件

| 功能      | 套件                      | 安裝指令                           |
| :-------- | :------------------------ | :--------------------------------- |
| DOCX 渲染 | `docx-preview`            | `npm install docx-preview`         |
| 畫記功能  | `fabric`                  | `npm install fabric`               |
| 語法高亮  | `prism-react-renderer`    | `npm install prism-react-renderer` |
| UI 元件   | `shadcn/ui`               | `npx shadcn-ui@latest init`        |
| 表單驗證  | `react-hook-form` + `zod` | `npm install react-hook-form zod`  |

---

## 7. GitHub Actions 自動分析 (Cppcheck Service)

### 7.1 工作流程設計

```yaml
# .github/workflows/cppcheck.yml
name: Cppcheck Analysis

on:
  repository_dispatch:
    types: [analyze-submission]

jobs:
  analyze:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install Cppcheck
        run: sudo apt-get update && sudo apt-get install -y cppcheck

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm install @supabase/supabase-js

      - name: Analyze submission
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: |
          SUBMISSION_ID="${{ github.event.client_payload.submission_id }}"
          node scripts/analyze.js "$SUBMISSION_ID"
```

### 7.2 分析腳本

```javascript
// scripts/analyze.js
const { createClient } = require("@supabase/supabase-js");
const { execSync } = require("child_process");
const fs = require("fs");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyze(submissionId) {
  // 1. 取得 submission 和 code_snippets
  const { data: snippets } = await supabase
    .from("code_snippets")
    .select("*")
    .eq("submission_id", submissionId);

  for (const snippet of snippets) {
    // 2. 寫入暫存檔
    const filename = `temp_${snippet.id}.cpp`;
    fs.writeFileSync(filename, snippet.normalized_code);

    // 3. 執行 cppcheck
    try {
      execSync(`cppcheck --enable=all --xml 2>${filename}.xml ${filename}`);

      // 4. 解析 XML 結果
      const xml = fs.readFileSync(`${filename}.xml`, "utf8");
      const errors = parseXml(xml);

      // 5. 存入資料庫
      for (const error of errors) {
        await supabase.from("analysis_results").insert({
          snippet_id: snippet.id,
          error_type: error.severity,
          error_id: error.id,
          message: error.msg,
          line_number: error.line,
        });
      }
    } finally {
      // 清理暫存檔
      fs.unlinkSync(filename);
      fs.unlinkSync(`${filename}.xml`);
    }
  }

  // 6. 更新 submission 狀態
  await supabase
    .from("submissions")
    .update({ status: "analyzed" })
    .eq("id", submissionId);
}

analyze(process.argv[2]);
```

---

## 8. 資料庫結構 (Complete Schema)

### 8.1 完整資料表

```sql
-- ============================================
-- 1. 使用者資料表 (連結 Supabase Auth)
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ta',  -- 'admin' | 'ta'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. 考試/作業表
-- ============================================
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,                -- 'exam' | 'homework'
    semester VARCHAR(20) NOT NULL,
    due_date TIMESTAMP,
    total_questions INT DEFAULT 5,
    points_per_question DECIMAL(5,2) DEFAULT 20,
    created_by UUID REFERENCES profiles(id),
    status VARCHAR(20) DEFAULT 'active',      -- 'active' | 'archived'
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. 學生作業提交表
-- ============================================
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id VARCHAR(20) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    class_name VARCHAR(50),
    file_path TEXT NOT NULL,
    original_filename VARCHAR(255),
    assigned_to UUID REFERENCES profiles(id), -- 👈 指派給哪位助教
    status VARCHAR(20) DEFAULT 'pending',     -- 'pending' | 'analyzing' | 'analyzed' | 'graded'
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. 程式碼片段表 (每題一筆)
-- ============================================
CREATE TABLE code_snippets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    raw_code TEXT,
    normalized_code TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. Cppcheck 分析結果表
-- ============================================
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snippet_id UUID REFERENCES code_snippets(id) ON DELETE CASCADE,
    error_type VARCHAR(50),
    error_id VARCHAR(100),
    message TEXT,
    line_number INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. 評分結果表
-- ============================================
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    score DECIMAL(5,2),
    max_score DECIMAL(5,2) DEFAULT 20,
    comment TEXT,
    annotations JSONB,                        -- Canvas 畫記 JSON
    graded_by UUID REFERENCES profiles(id),
    graded_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(submission_id, question_number)
);

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

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 8.2 Storage Bucket 設計

```
submissions/                    # Bucket 名稱 (設為 private)
├── {assignment_id}/
│   └── {student_id}/
│       ├── original.docx       # 原始上傳檔案
│       └── annotations.json    # 畫記資料
```

---

## 9. 部署指南 (Deployment Guide)

### 9.1 環境變數

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# GitHub (用於觸發 Actions)
GITHUB_OWNER=your-username
GITHUB_REPO=CEGAS
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

### 9.2 Supabase 設定步驟

1. 建立新專案
2. 執行 Section 8.1 的完整 SQL
3. 建立 Storage Bucket `submissions` (Private)
4. 啟用 RLS 並設定政策 (Section 8.3)
5. 在 Authentication → Providers 啟用 Email
6. 建立第一個 Admin 帳號：
   ```sql
   -- 註冊後手動升級為 admin
   UPDATE profiles SET role = 'admin' WHERE email = 'professor@school.edu';
   ```

### 9.3 Vercel 部署

1. 推送至 GitHub
2. 連接 Vercel
3. 設定環境變數
4. Deploy

### 9.4 GitHub Actions Secrets

Settings → Secrets → Actions：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

---

## 10. 開發順序建議 (Implementation Roadmap)

> **🤖 Agent 提示：** 當你完成某項任務時，請務必回來更新此處表格的「狀態」欄位，將 `⬜` 改為 `✅`。

### 10.1 預估時間

| 階段        | 任務                                          | 預估時間 | 狀態 |
| :---------- | :-------------------------------------------- | :------- | :--- |
| **Phase 1** | 基礎建設：Next.js + Supabase + Auth           | 1 天     | ✅   |
| **Phase 2** | 使用者系統：登入/登出 + 角色權限 + Middleware | 1 天     | ✅   |
| **Phase 3** | Admin 功能：助教管理 + 考試建立               | 1 天     | ⬜   |
| **Phase 4** | 批量上傳：拖曳上傳 + 助教分配                 | 1.5 天   | ⬜   |
| **Phase 5** | TA 儀表板：待批改清單 + 統計                  | 1 天     | ⬜   |
| **Phase 6** | 批改介面：DOCX 預覽 + 評分表單                | 2 天     | ⬜   |
| **Phase 7** | 畫記功能：Fabric.js Canvas                    | 1.5 天   | ⬜   |
| **Phase 8** | GitHub Actions：Cppcheck 分析                 | 1 天     | ⬜   |
| **Phase 9** | 測試與優化                                    | 1 天     | ⬜   |

### 10.2 工作分配

#### 開發者 A：基礎建設 + 使用者系統 (~6.5 天)

| 任務                                        | 分支名稱                | 狀態 |
| :------------------------------------------ | :---------------------- | :--- |
| 專案初始化 (Next.js + Tailwind + shadcn/ui) | `feat/project-init`     | ✅   |
| Supabase 設定 + 資料表建立                  | `feat/database-setup`   | ✅   |
| 登入/登出功能                               | `feat/auth-login`       | ✅   |
| Middleware 權限控制                         | `feat/auth-middleware`  | ✅   |
| 助教管理頁面 (CRUD)                         | `feat/user-management`  | ✅   |
| 考試/作業建立頁面                           | `feat/assignment-crud`  | ⬜   |
| GitHub Actions 工作流程                     | `feat/cppcheck-actions` | ⬜   |
| 題號解析邏輯                                | `feat/question-parser`  | ⬜   |

#### 開發者 B：核心功能 + 批改介面 (~8.5 天)

| 任務                      | 分支名稱                 | 狀態 |
| :------------------------ | :----------------------- | :--- |
| Dashboard Layout + 側邊欄 | `feat/dashboard-layout`  | ✅   |
| 批量上傳頁面 (UI)         | `feat/bulk-upload-ui`    | ⬜   |
| 上傳 API + 分配演算法     | `feat/upload-api`        | ⬜   |
| TA 儀表板 (待批改清單)    | `feat/ta-dashboard`      | ⬜   |
| DOCX 預覽元件             | `feat/docx-viewer`       | ⬜   |
| 批改介面 (雙欄佈局)       | `feat/grading-interface` | ⬜   |
| 評分表單 + 儲存           | `feat/grading-form`      | ⬜   |
| 畫記功能 (Fabric.js)      | `feat/annotation-canvas` | ⬜   |

---

## 11. 永續營運策略 (Sustainability)

### 11.1 儲存空間管理

```sql
-- 每學年結束後，可執行此查詢匯出成績
SELECT
    a.semester,
    a.title,
    s.student_id,
    s.student_name,
    SUM(g.score) as total_score
FROM grades g
JOIN submissions s ON g.submission_id = s.id
JOIN assignments a ON s.assignment_id = a.id
GROUP BY a.semester, a.title, s.student_id, s.student_name
ORDER BY a.semester, a.title, s.student_id;

-- 匯出後可選擇歸檔舊學期資料
UPDATE assignments SET status = 'archived' WHERE semester < '113-1';

-- 可選：刪除超過 2 年的檔案以節省空間
-- DELETE FROM submissions WHERE created_at < NOW() - INTERVAL '2 years';
```

### 11.2 免費額度監控

| 資源             | 免費額度     | 預估月用量    | 狀態    |
| :--------------- | :----------- | :------------ | :------ |
| Supabase DB      | 500MB        | ~5MB          | ✅ 安全 |
| Supabase Storage | 1GB          | ~25MB/學期    | ✅ 安全 |
| Supabase Auth    | 50K MAU      | ~12 人        | ✅ 安全 |
| GitHub Actions   | 2000 分鐘/月 | ~60 分鐘/學期 | ✅ 安全 |
| Vercel           | 100GB 流量   | ~1GB          | ✅ 安全 |

---

## 12. 題號解析策略 (Question Parser)

### 12.1 問題分析

學生的題號寫法非常多樣，觀察到的模式包括：

| 寫法範例           | 說明                 |
| :----------------- | :------------------- |
| `1.`               | 數字 + 英文句點      |
| `1。`              | 數字 + 中文句號      |
| `1、`              | 數字 + 頓號          |
| `1:` / `1：`       | 數字 + 冒號          |
| `第一題` / `第1題` | 「第 X 題」格式      |
| `Q1` / `q1`        | 英文 Q + 數字        |
| `(1)` / `（1）`    | 括號包數字           |
| `一、` / `二、`    | 國字數字             |
| `1. 我忘了`        | 題號後接非程式碼文字 |

### 12.2 多重匹配策略

````typescript
// lib/parser.ts

// 國字數字對照表
const chineseNumbers: Record<string, number> = {
'一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
'六': 6, '七': 7, '八': 8, '九': 9, '十': 10
};

// 題號匹配模式 (依優先順序)
const questionPatterns = [
/^第([一二三四五六七八九十\d]+)題/, // 「第 X 題」格式 (最可靠)
/^[Qq](\d+)/, // Q1, q1 格式
/^[（(](\d+)[)）]/, // (1) 或 （1）括號格式
/^(\d+)\s*[.。、:：\-]/, // 數字 + 各種標點
/^([一二三四五六七八九十]+)[、.。]/, // 國字數字 + 頓號
];

interface ParsedQuestion {
questionNumber: number;
content: string;
confidence: 'high' | 'medium' | 'low';
}

export function parseQuestionNumber(line: string): { num: number; confidence: string } | null {
const trimmed = line.trim();

for (const pattern of questionPatterns) {
const match = trimmed.match(pattern);
if (match) {
const rawNum = match[1];
const num = chineseNumbers[rawNum] ?? parseInt(rawNum);

      if (!isNaN(num) && num >= 1 && num <= 20) {
        const confidence = pattern.source.includes('第') ? 'high' : 'medium';
        return { num, confidence };
      }
    }

}
return null;
}
`

### 12.3 解析結果驗證

在前端顯示警告，讓助教人工確認：

`

題目解析警告

學號 411335012 的考卷解析有問題：
 預期 5 題，但解析出 4 題
 第 3 題解析可信度較低
 [查看原稿] [手動修正]

`

---

## 13. GitHub Actions 批量優化 (Batch Processing)

### 13.1 問題分析

| 指標           | 原方案 (逐一觸發) | 優化方案 (批量處理) |
| :------------- | :---------------- | :------------------ |
| 冷啟動次數     | 60 次             | 1 次                |
| 總耗時 (60 份) | ~30 分鐘          | ~3 分鐘             |
| Actions 分鐘數 | ~60 分鐘          | ~5 分鐘             |

### 13.2 優化後的工作流程

`yaml

# .github/workflows/cppcheck-batch.yml

name: Cppcheck Batch Analysis

on:
repository_dispatch:
types: [analyze-batch]
schedule: - cron: '0 \* \* \* \*' # 每小時檢查一次待處理考卷

jobs:
analyze:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v4 - run: sudo apt-get update && sudo apt-get install -y cppcheck - uses: actions/setup-node@v4
with:
node-version: '20' - run: npm install @supabase/supabase-js - run: node scripts/analyze-batch.js
env:
SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
`

### 13.3 批量處理流程

`
1. 查詢所有 status='pending' 的 submissions
2. 批量更新為 status='analyzing'
3. 逐一執行 cppcheck 分析
4. 成功則更新為 status='analyzed'
5. 失敗則改回 status='pending' (下次重試)
   `

---

## 15. DOCX 解析完整性驗證 (Parse Integrity Validation)

### 15.1 問題分析

從 DOCX 拆分題目時容易遺漏內容，需要建立多道防線確保解析完整：

| 防線       | 機制             | 作用                 |
| :--------- | :--------------- | :------------------- |
| **第一道** | 完整度計算       | 自動偵測字元遺漏     |
| **第二道** | `unmatched` 收集 | 捕獲所有無法歸類內容 |
| **第三道** | 原稿對照 UI      | 人工最終確認         |

### 15.2 解析結果資料結構

```typescript
// lib/parser.ts

interface ParseResult {
  questions: Map<number, string>; // 題號 -> 內容
  unmatched: string[]; // 無法歸類的內容
  originalLength: number; // 原始總字元數
  parsedLength: number; // 解析後總字元數
  completeness: number; // 完整度百分比
}

export function parseDocxContent(
  fullText: string,
  expectedQuestions: number
): ParseResult {
  const lines = fullText.split("\n");
  const questions = new Map<number, string>();
  const unmatched: string[] = [];

  let currentQuestion: number | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const questionMatch = parseQuestionNumber(line);

    if (questionMatch) {
      // 儲存前一題
      if (currentQuestion !== null) {
        questions.set(currentQuestion, currentContent.join("\n"));
      }
      currentQuestion = questionMatch.num;
      currentContent = [line];
    } else if (currentQuestion !== null) {
      // 屬於當前題目
      currentContent.push(line);
    } else {
      // 無法歸類 (出現在任何題號之前的內容)
      if (line.trim()) {
        unmatched.push(line);
      }
    }
  }

  // 儲存最後一題
  if (currentQuestion !== null) {
    questions.set(currentQuestion, currentContent.join("\n"));
  }

  // 計算完整度
  const parsedLength =
    [...questions.values()].join("").length + unmatched.join("").length;
  const originalLength = fullText.replace(/\s/g, "").length;
  const completeness =
    originalLength > 0 ? (parsedLength / originalLength) * 100 : 0;

  return {
    questions,
    unmatched,
    originalLength,
    parsedLength,
    completeness,
  };
}
````

### 15.3 資料庫欄位擴充

```sql
-- 在 submissions 表增加解析驗證欄位
ALTER TABLE submissions ADD COLUMN parse_completeness DECIMAL(5,2);
ALTER TABLE submissions ADD COLUMN unmatched_content TEXT;
ALTER TABLE submissions ADD COLUMN parse_warnings JSONB;

-- parse_warnings 範例結構：
-- {
--   "missing_questions": [3],
--   "low_confidence_questions": [2, 5],
--   "unmatched_char_count": 32
-- }
```

### 15.4 解析結果確認介面

```

   解析結果：411335012 王小明


   完整度：98.5%  (建議 > 95% 才可接受)

   解析統計：

   題號      字元數      狀態

   第 1 題   523          正常
   第 2 題   412          正常
   第 3 題   0            未找到 (可能未作答或格式異常)
   第 4 題   687          正常
   第 5 題   445          正常


   未歸類內容 (32 字元)：

   "我的學號是411335012，以下是我的答案..."


                    [查看原稿對照] [手動調整] [確認無誤]

```

### 15.5 批量上傳驗證報告

```

   批量上傳報告：113-1 期中考 (60 份)


   完美解析：52 份 (完整度 > 98%)
   需人工確認：6 份 (完整度 90-98%)
   解析異常：2 份 (完整度 < 90%)

  異常清單：
   411335023 張 - 完整度 85%，缺少第2題
   411335047 李 - 完整度 72%，題號格式異常

                          [下載報告] [處理異常] [繼續分配]

```

### 15.6 三欄對照批改介面

批改時提供原稿對照功能，讓助教隨時檢查解析是否正確：

```

    原始 DOCX      第 3 題解析     Cppcheck


  [完整原稿滾動]    [解析出的程式碼]   [錯誤列表]

  (當前高亮第3題
   對應區塊)


```

### 15.7 驗證元件實作

```typescript
// components/upload/ParseValidation.tsx
"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ParseValidationProps {
  submissions: {
    studentId: string;
    studentName: string;
    completeness: number;
    questionStats: { num: number; charCount: number; confidence: string }[];
    unmatchedContent: string[];
  }[];
  expectedQuestions: number;
  onConfirm: () => void;
  onReview: (studentId: string) => void;
}

export function ParseValidation({
  submissions,
  expectedQuestions,
  onConfirm,
  onReview,
}: ParseValidationProps) {
  const perfect = submissions.filter((s) => s.completeness >= 98);
  const needsReview = submissions.filter(
    (s) => s.completeness >= 90 && s.completeness < 98
  );
  const hasIssues = submissions.filter((s) => s.completeness < 90);

  return (
    <Card>
      <CardHeader>
        <CardTitle> 解析驗證報告</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 統計摘要 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {perfect.length}
            </div>
            <div className="text-sm text-green-700"> 完美解析</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {needsReview.length}
            </div>
            <div className="text-sm text-yellow-700"> 需確認</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">
              {hasIssues.length}
            </div>
            <div className="text-sm text-red-700"> 異常</div>
          </div>
        </div>

        {/* 異常清單 */}
        {hasIssues.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="font-semibold mb-2">以下考卷需要人工處理：</div>
              <ul className="space-y-1">
                {hasIssues.map((s) => (
                  <li
                    key={s.studentId}
                    className="flex justify-between items-center"
                  >
                    <span>
                      {s.studentId} {s.studentName} - 完整度{" "}
                      {s.completeness.toFixed(1)}%
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReview(s.studentId)}
                    >
                      查看
                    </Button>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* 操作按鈕 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline">下載報告</Button>
          <Button onClick={onConfirm} disabled={hasIssues.length > 0}>
            {hasIssues.length > 0 ? "請先處理異常" : "確認並繼續分配"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 15.8 防遺漏檢查清單

在解析完成後，系統自動執行以下檢查：

| 檢查項目   | 觸發條件             | 處理方式            |
| :--------- | :------------------- | :------------------ |
| 題數不符   | 解析題數 ≠ 預期題數  | 警告 + 人工確認     |
| 完整度過低 | completeness < 90%   | 阻擋 + 必須人工處理 |
| 空白題目   | 某題 charCount = 0   | 警告 (可能未作答)   |
| 低信心度   | confidence = 'low'   | 標記 + 建議檢查     |
| 未歸類內容 | unmatched.length > 0 | 顯示內容 + 手動歸類 |
