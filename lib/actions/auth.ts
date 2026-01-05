"use server";

/**
 * 驗證相關 Server Actions
 * 處理登入、登出、註冊等操作
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 使用 Email/Password 登入
 */
export async function signInWithPassword(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return {
      error: "請輸入電子郵件和密碼",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // 根據錯誤類型返回適當的訊息
    if (error.message.includes("Invalid login credentials")) {
      return {
        error: "電子郵件或密碼錯誤",
      };
    }
    if (error.message.includes("Email not confirmed")) {
      return {
        error: "請先驗證您的電子郵件",
      };
    }
    return {
      error: error.message,
    };
  }

  // 登入成功，重新導向到儀表板
  redirect("/dashboard");
}

/**
 * 登出
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * 取得目前使用者資訊
 */
export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // 取得使用者 profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    ...user,
    profile,
  };
}
