/**
 * Supabase 伺服器端 Client
 * 用於 Server Components, Route Handlers, Server Actions
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: object }[]
        ) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }: {
                name: string;
                value: string;
                options?: object;
              }) => cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 中無法設置 cookies
            // 如果有 middleware 刷新 session，這是預期行為
          }
        },
      },
    }
  );
}

/**
 * 使用 Service Role Key 的管理員 Client
 * 用於繞過 RLS 的後台操作
 * 注意：只能在伺服器端使用，永遠不要暴露給客戶端
 */
export async function createServiceClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: object }[]
        ) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }: {
                name: string;
                value: string;
                options?: object;
              }) => cookieStore.set(name, value, options)
            );
          } catch {
            // 忽略
          }
        },
      },
    }
  );
}
