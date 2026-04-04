# 本地视频总结服务

一个本地优先的 B 站视频总结项目。

当前仓库已经不是单纯的“重构骨架”，而是一个可以本地跑通的开发版：后端服务、SQLite 持久化、任务执行链路和基础 Web UI 都已经接上了。

## 当前能力

- 输入 B 站视频链接并探测视频信息
- 自动缓存封面、维护本地视频列表
- 提交总结任务并在后台线程执行
- 使用 `yt-dlp` 下载音频
- 使用 `faster-whisper` 执行转写
- 可选调用 OpenAI-compatible LLM 生成结构化摘要
- 将任务、事件、结果保存到 SQLite
- 导出 `transcript.txt` 和 `summary.json`
- 提供本地 Web UI、REST API 和 SSE 进度流

## 项目结构

```text
apps/
  service/          FastAPI 后端服务
  web/              本地 Web UI 静态资源
packages/
  core/             下载、转写、摘要等核心能力
  infra/            配置、路径、日志等基础设施
scripts/
  run_service.ps1   本地启动服务
  submit_task.ps1   命令行提交任务
tests/
  unit/             基础单元测试
docs/
  architecture/     架构说明与启动笔记
```

## 运行要求

- Python `3.12`
- 建议提前安装 `ffmpeg` 并确保已加入 `PATH`
- 首次转写时会按需下载 Whisper 模型
- 如果要启用 LLM 摘要，需要可用的 OpenAI-compatible 接口

## 快速开始

### 1. 安装本地包

```powershell
python -m pip install -e .\packages\infra -e .\packages\core -e .\apps\service
```

### 2. 准备环境变量

```powershell
Copy-Item .env.example .env
```

默认 `.env.example` 已包含一组示例配置：

```env
VIDEO_SUM_HOST=127.0.0.1
VIDEO_SUM_PORT=3838
VIDEO_SUM_WHISPER_MODEL=tiny
VIDEO_SUM_WHISPER_DEVICE=cpu
VIDEO_SUM_WHISPER_COMPUTE_TYPE=int8
VIDEO_SUM_LLM_ENABLED=true
VIDEO_SUM_LLM_BASE_URL=https://coding.dashscope.aliyuncs.com/v1
VIDEO_SUM_LLM_MODEL=qwen3.5-plus
VIDEO_SUM_LLM_API_KEY=replace-with-your-api-key
```

如果你暂时不想接 LLM，可以把 `VIDEO_SUM_LLM_ENABLED=false`，服务会退回本地规则摘要。

### 3. 启动服务

```powershell
python -m video_sum_service
```

或使用脚本：

```powershell
.\scripts\run_service.ps1
```

### 4. 打开页面

- `http://127.0.0.1:3838/`
- `http://127.0.0.1:3838/health`
- `http://127.0.0.1:3838/api/v1/system/info`

首页是当前本地 Web UI，后端 API 统一挂在 `/api/v1/*`。

## 常用接口

### 系统与设置

- `GET /health`
- `GET /api/v1/system/info`
- `GET /api/v1/environment`
- `GET /api/v1/settings`
- `PUT /api/v1/settings`
- `POST /api/v1/cuda/install`

### 视频

- `POST /api/v1/videos/probe`
- `GET /api/v1/videos`
- `GET /api/v1/videos/{video_id}`
- `DELETE /api/v1/videos/{video_id}`
- `GET /api/v1/videos/{video_id}/tasks`
- `POST /api/v1/videos/{video_id}/tasks`

`POST /api/v1/videos/probe` 请求体示例：

```json
{
  "url": "https://www.bilibili.com/video/BV1R6NFzXE1H/",
  "force_refresh": false
}
```

### 任务

- `POST /api/v1/tasks`
- `GET /api/v1/tasks`
- `GET /api/v1/tasks/{task_id}`
- `GET /api/v1/tasks/{task_id}/result`
- `GET /api/v1/tasks/{task_id}/progress`
- `GET /api/v1/tasks/{task_id}/events`
- `GET /api/v1/tasks/{task_id}/events/stream`
- `DELETE /api/v1/tasks/{task_id}`

`POST /api/v1/tasks` 请求体示例：

```json
{
  "input_type": "url",
  "source": "https://www.bilibili.com/video/BV1R6NFzXE1H/",
  "title": "示例视频"
}
```

## 命令行示例

直接提交一个任务：

```powershell
.\scripts\submit_task.ps1 -Url "https://www.bilibili.com/video/BV1R6NFzXE1H/"
```

带标题提交：

```powershell
.\scripts\submit_task.ps1 `
  -Url "https://www.bilibili.com/video/BV1R6NFzXE1H/" `
  -Title "我被手表的睡眠评分，骗焦虑了好几年？【差评君】"
```

脚本会轮询 `/api/v1/tasks/{task_id}/result`，直到任务进入终态。

## 结果落盘

默认数据目录在仓库根目录下的 `.data/`：

- `.data/video_sum.db`：SQLite 数据库
- `.data/cache/`：缓存资源和封面
- `.data/tasks/<task_id>/transcript.txt`：转写文本
- `.data/tasks/<task_id>/summary.json`：结构化摘要结果

## 测试

```powershell
python -m pytest
```

## 当前限制

- 当前真实执行链路只支持 B 站视频 URL
- 后台执行仍是轻量线程 worker，不是正式任务队列
- 还没有取消、重试、并发调度和缓存复用策略
- `ffmpeg` 依赖目前默认要求本机自行准备
- 首次模型下载和首次转写可能会比较慢
- Web UI 目前是开发态界面，不是最终桌面端交付形态

## 相关文档

- [`REFACTOR_ARCHITECTURE.md`](./REFACTOR_ARCHITECTURE.md)
- [`REFACTOR_TASK_BREAKDOWN.md`](./REFACTOR_TASK_BREAKDOWN.md)
- [`docs/architecture/bootstrap.md`](./docs/architecture/bootstrap.md)
- [`PACKAGING_INSTALL_PLAN.md`](./PACKAGING_INSTALL_PLAN.md)
