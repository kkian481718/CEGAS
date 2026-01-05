/**
 * OAuth Callback Route
 * 處理 OAuth 登入後的回調
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    // 交換 code 獲取 session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 登入成功，重新導向到目標頁面
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // 登入失敗，導向登入頁並顯示錯誤
  return NextResponse.redirect(
    new URL("/login?error=auth_callback_error", requestUrl.origin)
  );
}
