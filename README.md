# CEGAS - C++ 考卷自動化批改系統

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

**C++ Exam Grading Automation System** - 一個完全免費、支援多助教協作的 C++ 考卷批改系統。

## ✨ 功能特色

- 📤 **批量上傳** - 一次上傳所有考卷，自動隨機分配給助教
- 🔍 **自動分析** - 整合 Cppcheck 自動偵測程式碼錯誤
- ✏️ **線上批改** - DOCX 預覽、畫記、評分一站完成
- 👥 **多助教協作** - 支援 Admin 和 TA 角色權限管理

## 🛠️ 技術棧

| 模組 | 技術 | 用途 |
|:-----|:-----|:-----|
| 全棧應用 | **Next.js 14** (App Router) | 前端 + API Routes |
| 資料庫 + Auth | **Supabase** | PostgreSQL + 檔案儲存 + 使用者驗證 |
| UI 元件 | **shadcn/ui** + **Tailwind CSS** | 現代化介面 |
| Cppcheck 分析 | **GitHub Actions** | 執行系統級工具 |
| 部署 | **Vercel** | 無伺服器部署 |

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 環境變數設定

複製 `.env.example` 為 `.env.local` 並填入你的 Supabase 和 GitHub 設定：

```bash
cp .env.example .env.local
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看結果。

## 📁 專案結構

```
CEGAS/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 驗證相關頁面
│   ├── (dashboard)/        # 需登入的頁面
│   └── api/                # API Routes
├── components/
│   ├── ui/                 # shadcn/ui 元件
│   └── ...                 # 功能元件
├── lib/                    # 工具函式
└── .github/workflows/      # GitHub Actions
```

## 👥 使用者角色

| 角色 | 權限 |
|:-----|:-----|
| **admin** | 管理助教、建立考試、批量上傳、查看所有成績 |
| **ta** | 查看/批改分配給自己的考卷、輸入成績 |

## 📄 授權

本專案僅供教育用途使用。

---

Made with ❤️ for education
