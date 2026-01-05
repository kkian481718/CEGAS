"use client";

/**
 * 登入表單元件
 * 處理 Email/Password 登入的客戶端邏輯
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Mail, Lock } from "lucide-react";

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = "/dashboard" }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("請輸入電子郵件和密碼");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          // 根據錯誤類型顯示適當的訊息
          if (signInError.message.includes("Invalid login credentials")) {
            setError("電子郵件或密碼錯誤");
          } else if (signInError.message.includes("Email not confirmed")) {
            setError("請先驗證您的電子郵件");
          } else {
            setError(signInError.message);
          }
          return;
        }

        // 登入成功，重新導向
        router.push(redirectTo);
        router.refresh();
      } catch {
        setError("登入時發生錯誤，請稍後再試");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 錯誤訊息 */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Email 欄位 */}
      <div className="space-y-2">
        <Label htmlFor="email">電子郵件</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            autoComplete="email"
            required
            disabled={isPending}
          />
        </div>
      </div>

      {/* 密碼欄位 */}
      <div className="space-y-2">
        <Label htmlFor="password">密碼</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            autoComplete="current-password"
            required
            disabled={isPending}
          />
        </div>
      </div>

      {/* 登入按鈕 */}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            登入中...
          </>
        ) : (
          "登入"
        )}
      </Button>
    </form>
  );
}
