/**
 * 使用者 API - 建立新助教
 * POST /api/users
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export async function POST(request: NextRequest) {
  try {
    // 驗證當前使用者是否為 admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const { data: profile } = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()) as { data: Pick<Profile, "role"> | null };

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    // 取得請求資料
    const body = await request.json();
    const { email, password, display_name, role = "ta" } = body;

    if (!email || !password || !display_name) {
      return NextResponse.json(
        { error: "請填寫所有必要欄位" },
        { status: 400 }
      );
    }

    // 使用 Service Role 建立新使用者
    const serviceClient = await createServiceClient();

    const { data: authData, error: authError } =
      await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // 自動確認 email
        user_metadata: {
          display_name,
          role,
        },
      });

    if (authError) {
      console.error("Error creating user:", authError);
      if (authError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "此電子郵件已被註冊" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Profile 會透過資料庫觸發器自動建立
    // 但我們需要確保 role 被正確設定
    if (authData.user) {
      const updatePayload = {
        role: role as "admin" | "ta",
        display_name,
      };
      // 使用 rpc 或直接 SQL 避免型別問題
      const profilesTable = serviceClient.from("profiles") as ReturnType<
        typeof serviceClient.from
      >;
      await profilesTable
        .update(updatePayload as never)
        .eq("id", authData.user.id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
        display_name,
        role,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

/**
 * 取得所有使用者
 * GET /api/users
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 驗證登入狀態
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    // 驗證是否為 admin
    const { data: profile } = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()) as { data: Pick<Profile, "role"> | null };

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    // 取得所有使用者
    const { data: users, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
