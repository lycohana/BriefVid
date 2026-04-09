import type { UpdateInfo } from "./components/UpdateDialog";
import type { EnvironmentInfo, ServiceSettings, SystemInfo, TaskStatus, VideoAssetSummary } from "./types";

export type Snapshot = {
  serviceOnline: boolean;
  systemInfo: SystemInfo | null;
  environment: EnvironmentInfo | null;
  settings: ServiceSettings | null;
  videos: VideoAssetSummary[];
  error: string;
};

export type DesktopState = {
  version: string;
  backend: {
    running: boolean;
    ready: boolean;
    pid: number | null;
    url: string;
    lastError: string;
  } | null;
  logPath: string;
};

export type UpdateState = {
  status: "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "installing" | "error";
  version: string;
  releaseDate: string;
  releaseNotes: string | null;
  downloadProgress: number;
  errorMessage: string | null;
};

export type LibraryFilter = "all" | "completed" | "running" | "with-result";
export type MetricTone = "default" | "accent" | "success" | "info";
export type DevicePreference = "auto" | "cpu" | "cuda";
export type SelectOption = { value: string; label: string };

export const emptySnapshot: Snapshot = { serviceOnline: false, systemInfo: null, environment: null, settings: null, videos: [], error: "" };

export const devicePreferenceOptions: SelectOption[] = [
  { value: "auto", label: "自动选择" },
  { value: "cuda", label: "GPU (CUDA)" },
  { value: "cpu", label: "CPU" },
];

export function normalizeDevicePreference(value?: string | null): DevicePreference {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "gpu") {
    return "cuda";
  }
  if (normalized === "auto" || normalized === "cuda" || normalized === "cpu") {
    return normalized;
  }
  return "cpu";
}

export function devicePreferenceLabel(value?: string | null): string {
  const normalized = normalizeDevicePreference(value);
  if (normalized === "cuda") {
    return "GPU (CUDA)";
  }
  if (normalized === "auto") {
    return "自动选择";
  }
  return "CPU";
}

export function toUpdateState(info: UpdateInfo): UpdateState {
  return {
    status: info.status,
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes: info.releaseNotes,
    downloadProgress: info.downloadProgress,
    errorMessage: info.errorMessage,
  };
}

export function getUpdateDialogSignal(update: Pick<UpdateState, "status" | "version">): string | null {
  if (update.status !== "available" && update.status !== "downloaded") {
    return null;
  }
  return `${update.status}:${update.version || "unknown"}`;
}

export function formatShortDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export function platformLabel(platform?: string | null) {
  const labels: Record<string, string> = {
    bilibili: "Bilibili",
    youtube: "YouTube",
    local: "Local",
  };
  return (platform && labels[platform.toLowerCase()]) || "Video";
}

export function stageLabel(stage?: string | null) {
  const labels: Record<string, string> = {
    queued: "排队中",
    downloading: "下载中",
    transcribing: "转写中",
    summarizing: "总结中",
    completed: "已完成",
    failed: "失败",
  };
  return (stage && labels[stage]) || "待开始";
}

export function taskStatusClass(status?: TaskStatus | null) {
  if (status === "completed") return "status-success";
  if (status === "running") return "status-running";
  if (status === "failed") return "status-failed";
  return "status-pending";
}

export function progressEventClass(stage?: string | null) {
  if (stage === "completed") return "completed";
  if (stage === "failed") return "error";
  if (stage === "summarizing" || stage === "transcribing" || stage === "downloading") return "active";
  return "";
}
