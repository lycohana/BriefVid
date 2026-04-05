import type { TaskEvent, TaskStatus } from "./types";

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatDuration(value?: number | null) {
  if (value == null) return "-";
  const total = Math.max(0, Math.floor(value));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatTaskDuration(value?: number | null) {
  if (value == null) return "-";
  const total = Math.max(0, Math.round(value));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}小时${minutes}分${seconds}秒`;
  if (minutes > 0) return `${minutes}分${seconds}秒`;
  return `${seconds}秒`;
}

export function formatTokenCount(value?: number | null) {
  if (value == null) return "-";
  return Number(value).toLocaleString("zh-CN");
}

export function taskStatusLabel(status?: TaskStatus | null) {
  const labels: Record<string, string> = {
    queued: "排队中",
    running: "处理中",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };
  return (status && labels[status]) || "未开始";
}

export function summarizeEvents(events: TaskEvent[]) {
  const filtered: TaskEvent[] = [];
  const merged = new Map<string, number>();

  for (const event of events) {
    if (event.stage === "downloading" || event.stage === "transcribing") {
      const index = merged.get(event.stage);
      if (index == null) {
        filtered.push(event);
        merged.set(event.stage, filtered.length - 1);
      } else {
        filtered[index] = event;
      }
      continue;
    }
    filtered.push(event);
  }

  let currentEvent: TaskEvent | null = null;
  let failedEvent: TaskEvent | null = null;
  for (const event of events) {
    if (event.stage === "failed") {
      failedEvent = event;
      continue;
    }
    currentEvent = event;
  }

  const isCompleted = events.some((event) => event.stage === "completed");
  const progress = failedEvent
    ? failedEvent.progress
    : isCompleted
      ? 100
      : currentEvent?.progress ?? 0;

  return {
    filtered,
    currentEvent,
    failedEvent,
    progress,
    isCompleted,
    hasError: Boolean(failedEvent),
  };
}
