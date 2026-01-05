"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface UserListProps {
  users: Profile[];
}

export function UserList({ users }: UserListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setLoadingId(userId);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("更新失敗，請稍後再試");
    } finally {
      setLoadingId(null);
    }
  };

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <p className="text-muted-foreground">目前沒有使用者</p>
          <p className="text-sm text-muted-foreground">
            點擊「新增助教」按鈕建立第一位助教
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>使用者列表</CardTitle>
        <CardDescription>共 {users.length} 位使用者</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                <th className="pb-3 pr-4">狀態</th>
                <th className="pb-3 pr-4">姓名</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">角色</th>
                <th className="pb-3 pr-4">建立時間</th>
                <th className="pb-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        "inline-flex h-2 w-2 rounded-full",
                        user.is_active ? "bg-green-500" : "bg-red-500"
                      )}
                      title={user.is_active ? "啟用中" : "已禁用"}
                    />
                  </td>
                  <td className="py-3 pr-4 font-medium">{user.display_name}</td>
                  <td className="py-3 pr-4 text-sm text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                    >
                      {user.role === "admin" ? "管理員" : "助教"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("zh-TW")}
                  </td>
                  <td className="py-3">
                    {user.role !== "admin" && (
                      <Button
                        variant={user.is_active ? "destructive" : "default"}
                        size="sm"
                        disabled={loadingId === user.id}
                        onClick={() =>
                          handleToggleActive(user.id, user.is_active)
                        }
                      >
                        {loadingId === user.id
                          ? "處理中..."
                          : user.is_active
                          ? "禁用"
                          : "啟用"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
