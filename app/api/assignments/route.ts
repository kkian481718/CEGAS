/**
 * 考試/作業 API
 * GET /api/assignments - 取得所有考試/作業列表
 * POST /api/assignments - 建立新考試/作業 (Admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * GET /api/assignments
 * 取得所有考試/作業列表
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 驗證登入狀態
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    // 取得查詢參數
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";
    const semester = searchParams.get("semester");

    // 建立查詢
    let query = supabase
      .from("assignments")
      .select(
        `
        *,
        created_by_profile:profiles!assignments_created_by_fkey(display_name),
        submissions(count)
      `
      )
      .order("created_at", { ascending: false });

    // 篩選狀態
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // 篩選學期
    if (semester) {
      query = query.eq("semester", semester);
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error("Error fetching assignments:", error);
      return NextResponse.json({ error: "取得資料失敗" }, { status: 500 });
    }

    return NextResponse.json({ data: assignments });
  } catch (error) {
    console.error("Error in GET /api/assignments:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

/**
 * POST /api/assignments
 * 建立新考試/作業 (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
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
    const {
      title,
      type,
      semester,
      due_date,
      total_questions = 5,
      points_per_question = 20,
    } = body;

    // 驗證必要欄位
    if (!title || !type || !semester) {
      return NextResponse.json(
        { error: "請填寫所有必要欄位（名稱、類型、學期）" },
        { status: 400 }
      );
    }

    // 驗證類型
    if (!["exam", "homework"].includes(type)) {
      return NextResponse.json(
        { error: "類型必須為 exam 或 homework" },
        { status: 400 }
      );
    }

    // 驗證題數和分數
    if (total_questions < 1 || total_questions > 20) {
      return NextResponse.json(
        { error: "題數必須在 1-20 之間" },
        { status: 400 }
      );
    }

    if (points_per_question < 1 || points_per_question > 100) {
      return NextResponse.json(
        { error: "每題分數必須在 1-100 之間" },
        { status: 400 }
      );
    }

    // 建立考試/作業
    const insertData = {
      title,
      type,
      semester,
      due_date: due_date || null,
      total_questions,
      points_per_question,
      created_by: user.id,
      status: "active",
    };

    const { data: assignment, error } = await (
      supabase.from("assignments") as unknown as {
        insert: (data: typeof insertData) => {
          select: () => {
            single: () => Promise<{ data: unknown; error: unknown }>;
          };
        };
      }
    )
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating assignment:", error);
      return NextResponse.json({ error: "建立失敗" }, { status: 500 });
    }

    return NextResponse.json(
      { data: assignment, message: "建立成功" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/assignments:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
