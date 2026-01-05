/**
 * 單一使用者 API - 更新使用者
 * PATCH /api/users/[id]
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 驗證當前使用者是否為 admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const { data: currentProfile } = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()) as { data: Pick<Profile, "role"> | null };

    if (!currentProfile || currentProfile.role !== "admin") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    // 取得要更新的資料
    const body = await request.json();
    const { is_active, display_name, role } = body;

    // 檢查目標使用者是否存在
    const { data: targetProfile } = (await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single()) as { data: Profile | null };

    if (!targetProfile) {
      return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
    }

    // 不允許修改 admin 的 is_active 狀態
    if (targetProfile.role === "admin" && is_active !== undefined) {
      return NextResponse.json(
        { error: "無法禁用管理員帳號" },
        { status: 400 }
      );
    }

    // 建立更新物件
    const updateData: ProfileUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (is_active !== undefined) updateData.is_active = is_active;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (role !== undefined && targetProfile.role !== "admin") {
      updateData.role = role as "admin" | "ta";
    }

    // 更新 profile
    const serviceClient = await createServiceClient();
    const profilesTable = serviceClient.from("profiles") as ReturnType<
      typeof serviceClient.from
    >;
    const { data: updatedProfile, error } = await profilesTable
      .update(updateData as never)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user:", error);
      return NextResponse.json({ error: "更新失敗" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: updatedProfile,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

/**
 * 刪除使用者
 * DELETE /api/users/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 驗證當前使用者是否為 admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    const { data: currentProfile } = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()) as { data: Pick<Profile, "role"> | null };

    if (!currentProfile || currentProfile.role !== "admin") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    // 檢查目標使用者是否為 admin
    const { data: targetProfile } = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single()) as { data: Pick<Profile, "role"> | null };

    if (targetProfile?.role === "admin") {
      return NextResponse.json(
        { error: "無法刪除管理員帳號" },
        { status: 400 }
      );
    }

    // 使用 Service Role 刪除 Auth 使用者
    // Profile 會透過 CASCADE 自動刪除
    const serviceClient = await createServiceClient();
    const { error } = await serviceClient.auth.admin.deleteUser(id);

    if (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
