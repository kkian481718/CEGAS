"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  Archive,
  RotateCcw,
  FileText,
  ClipboardList,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Assignment {
  id: string;
  title: string;
  type: "exam" | "homework";
  semester: string;
  due_date: string | null;
  total_questions: number;
  points_per_question: number;
  status: "active" | "archived";
  created_at: string;
  created_by_profile: {
    display_name: string;
  } | null;
  submissions: { count: number }[];
}

interface AssignmentListProps {
  assignments: Assignment[];
  isAdmin?: boolean;
}

export function AssignmentList({
  assignments,
  isAdmin = false,
}: AssignmentListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleStatus = async (
    id: string,
    currentStatus: "active" | "archived"
  ) => {
    setLoadingId(id);
    const newStatus = currentStatus === "active" ? "archived" : "active";

    try {
      const response = await fetch(`/api/assignments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update assignment");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating assignment:", error);
      alert("更新失敗，請稍後再試");
    } finally {
      setLoadingId(null);
    }
  };

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">目前沒有考試/作業</p>
          {isAdmin && (
            <p className="text-sm text-muted-foreground mt-1">
              點擊「新增考試/作業」按鈕建立第一個
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>考試/作業列表</CardTitle>
        <CardDescription>共 {assignments.length} 個項目</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                <th className="pb-3 pr-4">狀態</th>
                <th className="pb-3 pr-4">名稱</th>
                <th className="pb-3 pr-4">類型</th>
                <th className="pb-3 pr-4">學期</th>
                <th className="pb-3 pr-4">題數</th>
                <th className="pb-3 pr-4">總分</th>
                <th className="pb-3 pr-4">提交數</th>
                <th className="pb-3 pr-4">建立時間</th>
                <th className="pb-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => {
                const totalPoints =
                  assignment.total_questions * assignment.points_per_question;
                const submissionCount = assignment.submissions?.[0]?.count || 0;
                const isArchived = assignment.status === "archived";

                return (
                  <tr
                    key={assignment.id}
                    className={cn(
                      "border-b last:border-0",
                      isArchived && "opacity-60"
                    )}
                  >
                    {/* 狀態 */}
                    <td className="py-3 pr-4">
                      <Badge
                        variant={isArchived ? "secondary" : "default"}
                        className={cn(
                          !isArchived &&
                            "bg-green-100 text-green-700 hover:bg-green-100"
                        )}
                      >
                        {isArchived ? "已歸檔" : "進行中"}
                      </Badge>
                    </td>

                    {/* 名稱 */}
                    <td className="py-3 pr-4">
                      <Link
                        href={`/assignments/${assignment.id}`}
                        className="font-medium hover:underline"
                      >
                        {assignment.title}
                      </Link>
                    </td>

                    {/* 類型 */}
                    <td className="py-3 pr-4">
                      <Badge variant="outline">
                        {assignment.type === "exam" ? (
                          <>
                            <FileText className="mr-1 h-3 w-3" />
                            考試
                          </>
                        ) : (
                          <>
                            <ClipboardList className="mr-1 h-3 w-3" />
                            作業
                          </>
                        )}
                      </Badge>
                    </td>

                    {/* 學期 */}
                    <td className="py-3 pr-4 text-sm">{assignment.semester}</td>

                    {/* 題數 */}
                    <td className="py-3 pr-4 text-sm">
                      {assignment.total_questions} 題
                    </td>

                    {/* 總分 */}
                    <td className="py-3 pr-4 text-sm">{totalPoints} 分</td>

                    {/* 提交數 */}
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">{submissionCount} 份</Badge>
                    </td>

                    {/* 建立時間 */}
                    <td className="py-3 pr-4 text-sm text-muted-foreground">
                      {new Date(assignment.created_at).toLocaleDateString(
                        "zh-TW"
                      )}
                    </td>

                    {/* 操作 */}
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/assignments/${assignment.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>

                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={loadingId === assignment.id}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/assignments/${assignment.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  查看詳情
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/upload?assignment=${assignment.id}`}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  上傳考卷
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleStatus(
                                    assignment.id,
                                    assignment.status
                                  )
                                }
                              >
                                {isArchived ? (
                                  <>
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    恢復
                                  </>
                                ) : (
                                  <>
                                    <Archive className="mr-2 h-4 w-4" />
                                    歸檔
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
