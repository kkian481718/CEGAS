import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合併 Tailwind CSS 類名的工具函式
 * 使用 clsx 處理條件類名，twMerge 處理衝突
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期為台灣時區格式
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 格式化日期時間
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 解析學生檔案名稱
 * 格式：資管二_411335084_易哲祥.docx
 */
export function parseStudentFilename(filename: string): {
  className: string;
  studentId: string;
  studentName: string;
} | null {
  const match = filename.match(/(.+)_(\d+)_(.+)\.docx$/i);
  if (!match) return null;

  return {
    className: match[1],
    studentId: match[2],
    studentName: match[3],
  };
}

/**
 * 計算批改進度百分比
 */
export function calculateProgress(completed: number, total: number): number {
  if (completed < 0) {
    throw new Error("Completed count cannot be negative");
  }
  if (total < 0) {
    throw new Error("Total count cannot be negative");
  }
  if (completed > total) {
    throw new Error("Completed count cannot exceed total count");
  }
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
