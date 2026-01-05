import { createClient } from "@/lib/supabase/server";
import { UserList } from "@/components/users/UserList";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";

export default async function UsersPage() {
  const supabase = await createClient();

  // 取得所有使用者 (包含 admin 和 ta)
  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">助教管理</h1>
          <p className="text-muted-foreground">
            管理系統使用者，新增或禁用助教帳號
          </p>
        </div>
        <CreateUserDialog />
      </div>

      {/* 使用者列表 */}
      <UserList users={users || []} />
    </div>
  );
}
