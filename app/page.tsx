import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        {/* Logo 區塊 */}
        <div className="flex items-center justify-center space-x-3">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-foreground">C</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">CEGAS</h1>
        </div>
        
        {/* 標題 */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-muted-foreground">
            C++ 考卷自動化批改系統
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            支援多助教協作的考卷批改平台，整合 Cppcheck 程式碼分析
          </p>
        </div>

        {/* 功能特色 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-3xl">
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-2xl mb-2">📤</div>
            <h3 className="font-semibold">批量上傳</h3>
            <p className="text-sm text-muted-foreground">
              一次上傳所有考卷，自動分配給助教
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-2xl mb-2">🔍</div>
            <h3 className="font-semibold">自動分析</h3>
            <p className="text-sm text-muted-foreground">
              Cppcheck 自動偵測程式碼錯誤
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-2xl mb-2">✏️</div>
            <h3 className="font-semibold">線上批改</h3>
            <p className="text-sm text-muted-foreground">
              DOCX 預覽、畫記、評分一站完成
            </p>
          </div>
        </div>

        {/* 登入按鈕 */}
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            開始使用
          </Link>
        </div>

        {/* 版本資訊 */}
        <p className="text-xs text-muted-foreground mt-8">
          版本 0.1.0 | 專為教育用途設計
        </p>
      </div>
    </main>
  );
}
