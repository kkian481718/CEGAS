/**
 * 單一考試/作業 API
 * GET /api/assignments/[id] - 取得單一考試/作業詳情
 * PATCH /api/assignments/[id] - 更新考試/作業
 * DELETE /api/assignments/[id] - 刪除考試/作業 (歸檔)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Submission = Database["public"]["Tables"]["submissions"]["Row"];

/**
 * GET /api/assignments/[id]
 * 取得單一考試/作業詳情（包含提交統計）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 驗證登入狀態
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    // 取得考試/作業詳情
    const { data: assignment, error } = await (
      supabase.from("assignments") as ReturnType<typeof supabase.from>
    )
      .select(
        `
        *,
        created_by_profile:profiles!assignments_created_by_fkey(display_name, email)
      `
      )
      .eq("id", id)
      .single();

    if (error || !assignment) {
      return NextResponse.json({ error: "找不到該考試/作業" }, { status: 404 });
    }

    // 取得提交統計
    const { data: submissionsData } = await supabase
      .from("submissions")
      .select("id, status, assigned_to")
      .eq("assignment_id", id);

    const submissions = submissionsData as
      | Pick<Submission, "id" | "status" | "assigned_to">[]
      | null;

    const stats = {
      total: submissions?.length || 0,
      pending: submissions?.filter((s) => s.status === "pending").length || 0,
      analyzing:
        submissions?.filter((s) => s.status === "analyzing").length || 0,
      analyzed: submissions?.filter((s) => s.status === "analyzed").length || 0,
      graded: submissions?.filter((s) => s.status === "graded").length || 0,
    };

    return NextResponse.json({
      data: {
        ...assignment,
        stats,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/assignments/[id]:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

/**
 * PATCH /api/assignments/[id]
 * 更新考試/作業 (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 驗證登入狀態
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    // 驗證是否為 Admin
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
    const updateData: Record<string, unknown> = {};

    // 只更新提供的欄位
    if (body.title !== undefined) updateData.title = body.title;
    if (body.type !== undefined) {
      if (!["exam", "homework"].includes(body.type)) {
        return NextResponse.json(
          { error: "類型必須為 exam 或 homework" },
          { status: 400 }
        );
      }
      updateData.type = body.type;
    }
    if (body.semester !== undefined) updateData.semester = body.semester;
    if (body.due_date !== undefined) updateData.due_date = body.due_date;
    if (body.total_questions !== undefined) {
      if (body.total_questions < 1 || body.total_questions > 20) {
        return NextResponse.json(
          { error: "題數必須在 1-20 之間" },
          { status: 400 }
        );
      }
      updateData.total_questions = body.total_questions;
    }
    if (body.points_per_question !== undefined) {
      if (body.points_per_question < 1 || body.points_per_question > 100) {
        return NextResponse.json(
          { error: "每題分數必須在 1-100 之間" },
          { status: 400 }
        );
      }
      updateData.points_per_question = body.points_per_question;
    }
    if (body.status !== undefined) {
      if (!["active", "archived"].includes(body.status)) {
        return NextResponse.json(
          { error: "狀態必須為 active 或 archived" },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    // 更新考試/作業
    const { data: assignment, error } = await (
      supabase.from("assignments") as ReturnType<typeof supabase.from>
    )
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating assignment:", error);
      return NextResponse.json({ error: "更新失敗" }, { status: 500 });
    }

    return NextResponse.json({ data: assignment, message: "更新成功" });
  } catch (error) {
    console.error("Error in PATCH /api/assignments/[id]:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

/**
 * DELETE /api/assignments/[id]
 * 刪除（歸檔）考試/作業 (Admin only)
 * 注意：這不會真的刪除資料，只是將狀態改為 archived
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 驗證登入狀態
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    // 驗證是否為 Admin
    const { data: profile } = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()) as { data: Pick<Profile, "role"> | null };

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    // 歸檔考試/作業（不真的刪除）
    const { error } = await (
      supabase.from("assignments") as ReturnType<typeof supabase.from>
    )
      .update({ status: "archived" })
      .eq("id", id);

    if (error) {
      console.error("Error archiving assignment:", error);
      return NextResponse.json({ error: "歸檔失敗" }, { status: 500 });
    }

    return NextResponse.json({ message: "已歸檔" });
  } catch (error) {
    console.error("Error in DELETE /api/assignments/[id]:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
