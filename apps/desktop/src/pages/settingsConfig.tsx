import type { ReactNode } from "react";

import {
  CpuIcon,
  FileTextIcon,
  FolderIcon,
  MonitorIcon,
  OverviewIcon,
  RobotIcon,
  SettingsIcon,
  SlidersIcon,
  TerminalIcon,
} from "../components/AppIcons";

export type SettingsCategory = "overview" | "general" | "directories" | "model" | "llm" | "summary" | "advanced" | "environment" | "logs";
export type SettingsCategoryGroup = "workspace" | "system";

export const settingsCategories: Array<{
  id: SettingsCategory;
  label: string;
  description: string;
  group: SettingsCategoryGroup;
  icon: ReactNode;
}> = [
  { id: "overview", label: "概览", description: "集中查看服务状态、运行时与关键配置。", group: "workspace", icon: <OverviewIcon /> },
  { id: "general", label: "基础设置", description: "管理服务监听地址、端口和基本接入信息。", group: "workspace", icon: <SettingsIcon /> },
  { id: "directories", label: "目录设置", description: "统一整理数据、缓存和任务文件的落盘位置。", group: "workspace", icon: <FolderIcon /> },
  { id: "model", label: "模型设置", description: "调整 Whisper 模型、推理设备和模型选择方式。", group: "workspace", icon: <CpuIcon /> },
  { id: "llm", label: "LLM 设置", description: "配置云端大模型摘要能力与 API 接入参数。", group: "workspace", icon: <RobotIcon /> },
  { id: "summary", label: "摘要参数", description: "微调摘要模式、语言和切块策略。", group: "workspace", icon: <FileTextIcon /> },
  { id: "advanced", label: "高级设置", description: "切换 CUDA 变体、运行时通道和缓存行为。", group: "system", icon: <SlidersIcon /> },
  { id: "environment", label: "运行环境", description: "检查 Python、Torch、GPU 与 CUDA 就绪状态。", group: "system", icon: <MonitorIcon /> },
  { id: "logs", label: "日志与控制", description: "查看服务日志并控制内置后端进程。", group: "system", icon: <TerminalIcon /> },
];
