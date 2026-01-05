import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  AssignmentList,
  CreateAssignmentDialog,
} from "@/components/assignments";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default async function AssignmentsPage() {
  const supabase = await createClient();

  // 檢查使用者權限
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "role"> | null;
  const isAdmin = profile?.role === "admin";

  // 取得所有考試/作業（包含提交統計）
  const { data: assignments, error } = await supabase
    .from("assignments")
    .select(
      `
      *,
      created_by_profile:profiles!assignments_created_by_fkey(display_name),
      submissions(count)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assignments:", error);
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">考試/作業管理</h1>
          <p className="text-muted-foreground">
            管理考試與作業，上傳學生的 DOCX 檔案進行批改
          </p>
        </div>
        {isAdmin && <CreateAssignmentDialog />}
      </div>

      {/* 考試/作業列表 */}
      <AssignmentList assignments={assignments || []} isAdmin={isAdmin} />
    </div>
  );
}
