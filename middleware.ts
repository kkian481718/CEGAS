/**
 * Next.js Middleware
 * 保護需要登入的路由，並根據角色控制存取權限
 */
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 需要 Admin 權限的路由
const adminRoutes = ["/users", "/assignments/new", "/upload"];

// 公開路由（不需要登入）
const publicRoutes = ["/", "/login", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開路由直接放行
  if (
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith("/auth/")
    )
  ) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // 更新 session 並取得使用者資訊
  const { user, supabaseResponse, supabase } = await updateSession(request);

  // 未登入則導向登入頁
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // 檢查是否需要 Admin 權限
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    // 查詢使用者角色
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single<{ role: string }>();

    if (!profile || profile.role !== "admin") {
      // 非 Admin 導向儀表板
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 匹配所有路徑除了：
     * - _next/static (靜態檔案)
     * - _next/image (圖片最佳化)
     * - favicon.ico (瀏覽器圖示)
     * - 圖片檔案
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
