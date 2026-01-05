import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  FileText,
  ClipboardList,
  Users,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
type Submission = Database["public"]["Tables"]["submissions"]["Row"];

interface AssignmentWithProfile extends Assignment {
  created_by_profile: {
    display_name: string;
    email: string;
  } | null;
}

interface SubmissionWithProfile extends Submission {
  assigned_to_profile: {
    display_name: string;
  } | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssignmentDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  // 取得考試/作業詳情
  const { data: assignmentData, error } = await supabase
    .from("assignments")
    .select(
      `
      *,
      created_by_profile:profiles!assignments_created_by_fkey(display_name, email)
    `
    )
    .eq("id", id)
    .single();

  if (error || !assignmentData) {
    notFound();
  }

  const assignment = assignmentData as unknown as AssignmentWithProfile;

  // 取得提交統計
  const { data: submissionsData } = await supabase
    .from("submissions")
    .select(
      `
      id,
      student_id,
      student_name,
      status,
      created_at,
      assigned_to,
      assigned_to_profile:profiles!submissions_assigned_to_fkey(display_name)
    `
    )
    .eq("assignment_id", id)
    .order("created_at", { ascending: false });

  const submissions = submissionsData as unknown as
    | SubmissionWithProfile[]
    | null;

  // 計算統計數據
  const stats = {
    total: submissions?.length || 0,
    pending: submissions?.filter((s) => s.status === "pending").length || 0,
    analyzing: submissions?.filter((s) => s.status === "analyzing").length || 0,
    analyzed: submissions?.filter((s) => s.status === "analyzed").length || 0,
    graded: submissions?.filter((s) => s.status === "graded").length || 0,
  };

  const totalPoints =
    assignment.total_questions * assignment.points_per_question;
  const isArchived = assignment.status === "archived";

  return (
    <div className="space-y-6">
      {/* 返回按鈕與標題 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/assignments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Link>
        </Button>
      </div>

      {/* 標題區 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{assignment.title}</h1>
            <Badge
              variant={isArchived ? "secondary" : "default"}
              className={
                !isArchived
                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                  : ""
              }
            >
              {isArchived ? "已歸檔" : "進行中"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {assignment.semester} ·{" "}
            {assignment.type === "exam" ? "考試" : "作業"}
          </p>
        </div>

        {isAdmin && !isArchived && (
          <Button asChild>
            <Link href={`/upload?assignment=${id}`}>
              <Upload className="mr-2 h-4 w-4" />
              上傳考卷
            </Link>
          </Button>
        )}
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總提交數</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">份作業</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待批改</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending + stats.analyzed}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pending} 待分析 / {stats.analyzed} 待評分
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.graded}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0
                ? `${Math.round((stats.graded / stats.total) * 100)}%`
                : "0%"}{" "}
              完成率
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">分析中</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.analyzing}
            </div>
            <p className="text-xs text-muted-foreground">正在 Cppcheck 分析</p>
          </CardContent>
        </Card>
      </div>

      {/* 考試詳情 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 基本資訊 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              基本資訊
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">類型</span>
              <Badge variant="outline">
                {assignment.type === "exam" ? "考試" : "作業"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">學期</span>
              <span>{assignment.semester}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">題數</span>
              <span>{assignment.total_questions} 題</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">每題分數</span>
              <span>{assignment.points_per_question} 分</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">總分</span>
              <span className="font-bold">{totalPoints} 分</span>
            </div>
            {assignment.due_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">截止日期</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(assignment.due_date).toLocaleDateString("zh-TW")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">建立者</span>
              <span>
                {assignment.created_by_profile?.display_name || "未知"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">建立時間</span>
              <span>
                {new Date(assignment.created_at).toLocaleDateString("zh-TW")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 提交列表預覽 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              最近提交
            </CardTitle>
            <CardDescription>最近 5 份提交的作業</CardDescription>
          </CardHeader>
          <CardContent>
            {submissions && submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.slice(0, 5).map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {submission.student_id} {submission.student_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {submission.assigned_to_profile
                          ? `分配給 ${submission.assigned_to_profile.display_name}`
                          : "未分配"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        submission.status === "graded"
                          ? "default"
                          : submission.status === "analyzed"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {submission.status === "pending" && "待分析"}
                      {submission.status === "analyzing" && "分析中"}
                      {submission.status === "analyzed" && "待評分"}
                      {submission.status === "graded" && "已完成"}
                    </Badge>
                  </div>
                ))}
                {submissions.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    還有 {submissions.length - 5} 份...
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>尚無提交</p>
                {isAdmin && (
                  <Button variant="link" asChild className="mt-2">
                    <Link href={`/upload?assignment=${id}`}>上傳考卷</Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
