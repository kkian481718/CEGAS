"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 取得當前學期 (例如: 113-2)
function getCurrentSemester(): string {
  const now = new Date();
  const year = now.getFullYear() - 1911; // 西元轉民國
  const month = now.getMonth() + 1; // 0-indexed
  // 2-7 月為第二學期，8-1 月為第一學期
  const semester = month >= 2 && month <= 7 ? 2 : 1;
  return `${year}-${semester}`;
}

interface CreateAssignmentDialogProps {
  onSuccess?: () => void;
}

export function CreateAssignmentDialog({
  onSuccess,
}: CreateAssignmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    type: "exam" as "exam" | "homework",
    semester: getCurrentSemester(),
    due_date: "",
    total_questions: 5,
    points_per_question: 20,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          due_date: formData.due_date || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "建立失敗");
        return;
      }

      // 成功後關閉對話框並刷新頁面
      setOpen(false);
      setFormData({
        title: "",
        type: "exam",
        semester: getCurrentSemester(),
        due_date: "",
        total_questions: 5,
        points_per_question: 20,
      });
      onSuccess?.();
      router.refresh();
    } catch (err) {
      console.error("Error creating assignment:", err);
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  // 計算總分
  const totalPoints = formData.total_questions * formData.points_per_question;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          新增考試/作業
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>建立新考試/作業</DialogTitle>
          <DialogDescription>
            建立考試或作業後，可以批量上傳學生的 DOCX 檔案進行批改。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 名稱 */}
            <div className="grid gap-2">
              <Label htmlFor="title">名稱 *</Label>
              <Input
                id="title"
                name="title"
                placeholder="例如：期中考、作業一"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            {/* 類型 */}
            <div className="grid gap-2">
              <Label>類型 *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="exam"
                    checked={formData.type === "exam"}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <span>考試</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="homework"
                    checked={formData.type === "homework"}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <span>作業</span>
                </label>
              </div>
            </div>

            {/* 學期 */}
            <div className="grid gap-2">
              <Label htmlFor="semester">學期 *</Label>
              <Input
                id="semester"
                name="semester"
                placeholder="例如：113-1"
                value={formData.semester}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                格式：民國年-學期（如 113-1 表示 113 學年第一學期）
              </p>
            </div>

            {/* 截止日期 */}
            <div className="grid gap-2">
              <Label htmlFor="due_date">截止日期（選填）</Label>
              <div className="relative">
                <Input
                  id="due_date"
                  name="due_date"
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={handleChange}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* 題數與分數 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="total_questions">題數 *</Label>
                <Input
                  id="total_questions"
                  name="total_questions"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.total_questions}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="points_per_question">每題分數 *</Label>
                <Input
                  id="points_per_question"
                  name="points_per_question"
                  type="number"
                  min={1}
                  max={100}
                  value={formData.points_per_question}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* 總分預覽 */}
            <div className="rounded-lg bg-muted p-3 text-center">
              <span className="text-sm text-muted-foreground">總分：</span>
              <span className="ml-2 text-lg font-bold">{totalPoints} 分</span>
            </div>

            {/* 錯誤訊息 */}
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "建立中..." : "建立"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
