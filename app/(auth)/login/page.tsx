import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const params = await searchParams;

  // 檢查是否已登入
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // 已登入，重新導向到儀表板或指定頁面
    redirect(params.redirectTo || "/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-md space-y-6">
        {/* Logo 區塊 */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <span className="text-2xl font-bold text-primary-foreground">
                C
              </span>
            </div>
            <span className="text-2xl font-bold tracking-tight">CEGAS</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            C++ 考卷自動化批改系統
          </p>
        </div>

        {/* 登入卡片 */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">歡迎回來</CardTitle>
            <CardDescription>請使用您的帳號登入系統</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm redirectTo={params.redirectTo} />
          </CardContent>
        </Card>

        {/* 頁尾資訊 */}
        <p className="text-center text-xs text-muted-foreground">
          如需帳號請聯繫系統管理員
        </p>
      </div>
    </main>
  );
}
