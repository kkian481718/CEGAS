"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Upload,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/actions/auth";
import type { Database } from "@/lib/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface SidebarProps {
  user: Profile;
}

// Admin 專屬選單
const adminMenuItems = [
  {
    title: "儀表板",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "助教管理",
    href: "/users",
    icon: Users,
  },
  {
    title: "考試/作業",
    href: "/assignments",
    icon: FileText,
  },
  {
    title: "批量上傳",
    href: "/upload",
    icon: Upload,
  },
];

// TA 專屬選單
const taMenuItems = [
  {
    title: "儀表板",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "我的任務",
    href: "/my-tasks",
    icon: ClipboardList,
  },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === "admin";
  const menuItems = isAdmin ? adminMenuItems : taMenuItems;

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            C
          </div>
          <span className="text-lg font-semibold">CEGAS</span>
        </Link>
      </div>

      {/* 導航選單 */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* 使用者資訊 & 登出 */}
      <div className="border-t p-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium">{user.display_name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <span
            className={cn(
              "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
              isAdmin
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {isAdmin ? "管理員" : "助教"}
          </span>
        </div>
        <Separator className="my-2" />
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            登出
          </Button>
        </form>
      </div>
    </aside>
  );
}
