import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, CheckCircle, FileText } from "lucide-react";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default async function DashboardPage() {
  const supabase = await createClient();

  // 取得當前使用者
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single()) as { data: Profile | null };

  const isAdmin = profile?.role === "admin";

  // 根據角色取得不同的統計資料
  let stats = {
    pending: 0,
    completed: 0,
    total: 0,
  };

  if (isAdmin) {
    // Admin: 取得所有統計
    const { count: totalCount } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true });

    const { count: pendingCount } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: completedCount } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "graded");

    stats = {
      pending: pendingCount || 0,
      completed: completedCount || 0,
      total: totalCount || 0,
    };
  } else {
    // TA: 只取得自己的統計
    const { count: totalCount } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", user!.id);

    const { count: pendingCount } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", user!.id)
      .eq("status", "pending");

    const { count: completedCount } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", user!.id)
      .eq("status", "graded");

    stats = {
      pending: pendingCount || 0,
      completed: completedCount || 0,
      total: totalCount || 0,
    };
  }

  return (
    <div className="space-y-6">
      {/* 歡迎訊息 */}
      <div>
        <h1 className="text-2xl font-bold">👋 歡迎，{profile?.display_name}</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "您可以管理助教、建立考試和查看所有成績"
            : "查看您的待批改任務"}
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待批改</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">份考卷等待批改</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">份考卷已批改完成</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總計</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "份考卷在系統中" : "份考卷分配給您"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 快速行動 */}
      <Card>
        <CardHeader>
          <CardTitle>快速開始</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "前往「助教管理」新增助教，或「考試/作業」建立新的批改任務。"
              : "前往「我的任務」查看並開始批改分配給您的考卷。"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
