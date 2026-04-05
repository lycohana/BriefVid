import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";

import { api } from "./api";
import type { EnvironmentInfo, ServiceSettings, SystemInfo, TaskDetail, TaskEvent, TaskSummary, VideoAssetDetail, VideoAssetSummary } from "./types";
import { formatDateTime, formatDuration, formatTaskDuration, formatTokenCount, summarizeEvents, taskStatusLabel } from "./utils";

type Snapshot = {
  serviceOnline: boolean;
  systemInfo: SystemInfo | null;
  environment: EnvironmentInfo | null;
  settings: ServiceSettings | null;
  videos: VideoAssetSummary[];
  error: string;
};

type DesktopState = {
  version: string;
  autoLaunch: boolean;
  closeBehavior: "ask" | "tray" | "exit";
  backend: DesktopBackendStatus | null;
  logPath: string;
};

const emptySnapshot: Snapshot = { serviceOnline: false, systemInfo: null, environment: null, settings: null, videos: [], error: "" };

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [desktop, setDesktop] = useState<DesktopState>({ version: "0.1.0", autoLaunch: false, closeBehavior: "ask", backend: null, logPath: "" });
  const [query, setQuery] = useState("");
  const [probeUrl, setProbeUrl] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [probePreview, setProbePreview] = useState<VideoAssetSummary | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    async function bootstrap() {
      if (!window.desktop) return;
      const [version, autoLaunch, closeBehavior, backend, logPath] = await Promise.all([
        window.desktop.app.getVersion(),
        window.desktop.app.getAutoLaunch(),
        window.desktop.preferences.getCloseBehavior(),
        window.desktop.backend.status(),
        window.desktop.logs.getServiceLogPath(),
      ]);
      setDesktop({ version, autoLaunch, closeBehavior, backend, logPath });
      cleanup = window.desktop.backend.onStatus((status) => setDesktop((current) => ({ ...current, backend: status })));
    }
    void bootstrap();
    return () => cleanup?.();
  }, []);

  useEffect(() => {
    let disposed = false;
    async function refresh() {
      try {
        const [health, systemInfo, settings, videos, environment] = await Promise.all([
          api.getHealth(),
          api.getSystemInfo(),
          api.getSettings(),
          api.listVideos(),
          api.getEnvironment(),
        ]);
        if (!disposed) {
          setSnapshot({ serviceOnline: health.status === "ok", systemInfo, settings, environment, videos, error: "" });
        }
      } catch (error) {
        if (!disposed) {
          setSnapshot((current) => ({ ...current, serviceOnline: false, error: error instanceof Error ? error.message : "服务暂不可用" }));
        }
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [refreshSeed]);

  const filteredVideos = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return snapshot.videos;
    return snapshot.videos.filter((video) => video.title.toLowerCase().includes(keyword) || video.source_url.toLowerCase().includes(keyword));
  }, [query, snapshot.videos]);

  async function refreshDesktop() {
    if (!window.desktop) return;
    const [autoLaunch, closeBehavior, backend] = await Promise.all([
      window.desktop.app.getAutoLaunch(),
      window.desktop.preferences.getCloseBehavior(),
      window.desktop.backend.status(),
    ]);
    setDesktop((current) => ({ ...current, autoLaunch, closeBehavior, backend }));
  }

  async function handleProbe(event: FormEvent) {
    event.preventDefault();
    if (!probeUrl.trim()) {
      setSubmitStatus("请输入视频链接");
      return;
    }
    setSubmitStatus("正在抓取视频信息并准备开始总结...");
    try {
      const response = await api.probeVideo({ url: probeUrl.trim(), force_refresh: false });
      setProbePreview(response.video);
      await api.createVideoTask(response.video.video_id);
      setSubmitStatus(response.cached ? "已从视频库读取并开始总结" : "视频已加入本地库并开始总结");
      setProbeUrl("");
      setRefreshSeed((v) => v + 1);
      navigate(`/videos/${response.video.video_id}`);
    } catch (error) {
      setSubmitStatus(error instanceof Error ? error.message : "开始总结失败");
    }
  }

  const pageMeta = location.pathname.startsWith("/settings")
    ? { eyebrow: "设置页", title: "BriefVid 配置与桌面运行状态" }
    : location.pathname.startsWith("/videos/")
      ? { eyebrow: "视频详情", title: "本地摘要结果与任务记录" }
      : { eyebrow: "视频库", title: "BriefVid 本地视频库" };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <img src="/static/assets/icons/icon.svg" alt="" />
          </div>
          <div className="brand-text">
            <p className="eyebrow">Desktop Shell</p>
            <h1>BriefVid</h1>
          </div>
        </div>
        <nav className="nav">
          <Link className={`nav-item ${location.pathname === "/" ? "active" : ""}`} to="/">视频库</Link>
          <Link className={`nav-item ${location.pathname.startsWith("/settings") ? "active" : ""}`} to="/settings">设置</Link>
        </nav>
        <section className="live-panel">
          <div className="panel-header">
            <h2>桌面状态</h2>
            <p>托盘、自启动和后端桥接</p>
          </div>
          <div className="status-stack">
            <Metric label="桌面版本" value={desktop.version} />
            <Metric label="后端状态" value={desktop.backend?.ready ? "已就绪" : desktop.backend?.running ? "启动中" : "未运行"} />
            <Metric label="关闭行为" value={desktop.closeBehavior === "tray" ? "托盘" : desktop.closeBehavior === "exit" ? "退出" : "询问"} />
            <Metric label="开机自启" value={desktop.autoLaunch ? "已启用" : "未启用"} />
          </div>
        </section>
      </aside>

      <main className="content">
        <header className="page-header">
          <div className="page-header-content">
            <p className="eyebrow">{pageMeta.eyebrow}</p>
            <h2>{pageMeta.title}</h2>
          </div>
          <div className="header-actions">
            <span className={`service-badge ${snapshot.serviceOnline ? "service-online" : "service-offline"}`}>
              <span className="status-dot" aria-hidden="true"></span>
              <span className="service-text">{snapshot.serviceOnline ? "服务在线" : "服务离线"}</span>
            </span>
          </div>
        </header>

        <div className="desktop-banner">
          <div className="desktop-banner-copy">
            <strong>桌面端已接管窗口、托盘和自启动</strong>
            <span>关闭窗口可隐藏到托盘，真正退出请从托盘菜单或设置页执行。</span>
          </div>
          <div className="desktop-actions">
            <button className="secondary-button" type="button" onClick={() => window.desktop?.window.show()}>显示窗口</button>
            <button className="secondary-button" type="button" onClick={() => desktop.logPath && void window.desktop?.shell.openPath(desktop.logPath)}>打开日志</button>
          </div>
        </div>

        {snapshot.error && !snapshot.serviceOnline ? (
          <section className="grid-card empty-state-card">
            <div className="spinner"></div>
            <h3>后端暂未就绪</h3>
            <p style={{ marginTop: 12, color: "var(--text-secondary)" }}>{snapshot.error}</p>
            <div className="desktop-actions" style={{ justifyContent: "center", marginTop: 20 }}>
              <button className="primary-button" type="button" onClick={async () => { await window.desktop?.backend.start(); setRefreshSeed((v) => v + 1); }}>重新拉起后端</button>
              <button className="secondary-button" type="button" onClick={() => setRefreshSeed((v) => v + 1)}>重新检测</button>
            </div>
          </section>
        ) : (
          <Routes>
            <Route path="/" element={<LibraryPage filteredVideos={filteredVideos} probePreview={probePreview} probeUrl={probeUrl} query={query} setProbeUrl={setProbeUrl} setQuery={setQuery} snapshot={snapshot} submitStatus={submitStatus} onProbe={handleProbe} />} />
            <Route path="/videos/:videoId" element={<VideoDetailPage desktop={desktop} onRefresh={() => setRefreshSeed((v) => v + 1)} />} />
            <Route path="/settings" element={<SettingsPage desktop={desktop} onDesktopChange={refreshDesktop} onRefresh={() => setRefreshSeed((v) => v + 1)} snapshot={snapshot} />} />
          </Routes>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function LibraryPage({
  snapshot, filteredVideos, query, setQuery, probeUrl, setProbeUrl, submitStatus, probePreview, onProbe,
}: {
  snapshot: Snapshot;
  filteredVideos: VideoAssetSummary[];
  query: string;
  setQuery(value: string): void;
  probeUrl: string;
  setProbeUrl(value: string): void;
  submitStatus: string;
  probePreview: VideoAssetSummary | null;
  onProbe(event: FormEvent): Promise<void>;
}) {
  return (
    <section className="library-page">
      <section className="library-topbar">
        <article className="grid-card library-intake-card">
          <div className="panel-header">
            <h2>开始总结</h2>
            <p>输入视频链接后，系统会抓取封面和标题，并立即开始本地总结。</p>
          </div>
          <form className="task-form" onSubmit={onProbe}>
            <label className="input-row">
              <span className="input-label">视频链接</span>
              <input className="input-field" type="url" value={probeUrl} onChange={(e) => setProbeUrl(e.target.value)} placeholder="https://www.bilibili.com/video/..." required />
            </label>
            <div className="hero-actions"><button className="primary-button" type="submit">开始总结</button></div>
            {submitStatus ? <div className="submit-status">{submitStatus}</div> : null}
          </form>
          {probePreview ? <article className="probe-preview"><img src={probePreview.cover_url} alt={probePreview.title} /><div className="probe-preview-copy"><strong>{probePreview.title}</strong><span>{formatDuration(probePreview.duration)}</span></div></article> : null}
        </article>
        <article className="grid-card library-summary-card">
          <div className="panel-header"><h2>视频库概览</h2><p>封面、本地缓存和任务结果统一管理</p></div>
          <div className="library-summary-grid">
            <Metric label="视频总数" value={String(snapshot.videos.length)} />
            <Metric label="已完成" value={String(snapshot.videos.filter((item) => item.latest_status === "completed").length)} />
            <Metric label="处理中" value={String(snapshot.videos.filter((item) => item.latest_status === "running").length)} />
            <Metric label="有摘要结果" value={String(snapshot.videos.filter((item) => item.has_result).length)} />
          </div>
        </article>
      </section>
      <section className="grid-card library-grid-card">
        <div className="panel-header"><h2>视频库</h2><p>{snapshot.videos.length} 个视频资产，点击卡片打开详情子页</p></div>
        <div className="library-toolbar"><input className="input-field" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索标题或链接..." /></div>
        <div className="video-grid">
          {filteredVideos.length ? filteredVideos.map((video) => <VideoCard key={video.video_id} video={video} />) : <div className="empty-placeholder">还没有视频，先输入一个链接开始总结。</div>}
        </div>
      </section>
    </section>
  );
}

function VideoCard({ video }: { video: VideoAssetSummary }) {
  const badgeClass = video.latest_status === "completed" ? "status-success" : video.latest_status === "running" ? "status-running" : video.latest_status === "failed" ? "status-failed" : "status-pending";
  return (
    <Link className="video-card" to={`/videos/${video.video_id}`}>
      <div className="video-card-cover">
        {video.cover_url ? <img src={video.cover_url} alt={video.title} loading="lazy" /> : <div className="video-card-placeholder">VIDEO</div>}
        <span className="video-duration">{formatDuration(video.duration)}</span>
      </div>
      <div className="video-card-body">
        <h3>{video.title}</h3>
        <div className="video-card-meta"><span className={`task-status ${badgeClass}`}>{taskStatusLabel(video.latest_status)}</span><span>{formatDateTime(video.updated_at)}</span></div>
      </div>
    </Link>
  );
}

function VideoDetailPage({ desktop, onRefresh }: { desktop: DesktopState; onRefresh(): void }) {
  const { videoId = "" } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoAssetDetail | null>(null);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [status, setStatus] = useState("");

  async function refreshDetail(taskId?: string | null) {
    const [videoDetail, videoTasks] = await Promise.all([api.getVideo(videoId), api.getVideoTasks(videoId)]);
    setVideo(videoDetail);
    setTasks(videoTasks);
    const targetTaskId = taskId && videoTasks.some((item) => item.task_id === taskId) ? taskId : videoTasks[0]?.task_id;
    if (targetTaskId) {
      const [detail, taskEvents] = await Promise.all([api.getTaskResult(targetTaskId), api.getTaskEvents(targetTaskId)]);
      setSelectedTask(detail);
      setEvents(taskEvents);
    } else {
      setSelectedTask(null);
      setEvents([]);
    }
    onRefresh();
  }

  useEffect(() => { void refreshDetail(); }, [videoId]);
  useEffect(() => {
    if (!selectedTask?.task_id) return;
    const source = api.createTaskEventSource(selectedTask.task_id, events.at(-1)?.created_at);
    source.addEventListener("progress", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { event: TaskEvent };
      setEvents((current) => current.some((item) => item.event_id === payload.event.event_id) ? current : [...current, payload.event]);
    });
    source.onerror = () => source.close();
    return () => source.close();
  }, [selectedTask?.task_id]);

  if (!video) return <section className="grid-card empty-state-card">正在加载视频详情...</section>;
  const progress = summarizeEvents(events);

  return (
    <section className="video-detail-page">
      <div className="detail-page-toolbar"><Link className="secondary-button" to="/">返回视频库</Link></div>
      <article className="video-detail-hero">
        <a className="video-detail-cover" href={video.source_url} target="_blank" rel="noreferrer">{video.cover_url ? <img src={video.cover_url} alt={video.title} loading="lazy" /> : <div className="video-card-placeholder">VIDEO</div>}</a>
        <div className="video-detail-copy">
          <div className="hero-chip-row"><span className="mini-chip">{taskStatusLabel(video.latest_status)}</span><span className="mini-chip">{formatDuration(video.duration)}</span><span className="mini-chip">{formatDateTime(video.updated_at)}</span></div>
          <h1 className="video-detail-title">{video.title}</h1>
          <div className="detail-hero-actions">
            <button className="primary-button" type="button" onClick={async () => { setStatus("正在创建处理任务..."); const task = await api.createVideoTask(video.video_id); await refreshDetail(task.task_id); setStatus("已开始新的摘要任务"); }}>重新生成摘要</button>
            <button className="secondary-button" type="button" onClick={async () => { setStatus("正在刷新视频信息..."); await api.probeVideo({ url: video.source_url, force_refresh: true }); await refreshDetail(selectedTask?.task_id); setStatus("视频信息已刷新"); }}>刷新视频信息</button>
            <button className="secondary-button danger-outline" type="button" onClick={async () => { if (!window.confirm("确定要从视频库删除这个视频吗？")) return; await api.deleteVideo(video.video_id); onRefresh(); navigate("/"); }}>从视频库删除</button>
          </div>
          {status ? <div className="submit-status">{status}</div> : null}
        </div>
      </article>
      <section className="video-detail-main">
        <section className="video-detail-primary">
          <article className="grid-card detail-section-card">
            <div className="panel-header"><h2>摘要结果</h2><p>当前视频的最新结果</p></div>
            {video.latest_result ? (
              <div className="detail-result-stack">
                <section className="grid-card result-card"><div className="card-header"><h3>摘要概览</h3></div><div className="timeline"><p>{video.latest_result.overview}</p></div></section>
                <section className="grid-card result-card"><div className="card-header"><h3>关键要点</h3><span className="result-count">{video.latest_result.key_points.length} 条</span></div><ul className="bullet-list">{video.latest_result.key_points.map((item) => <li key={item}>{item}</li>)}</ul></section>
                <section className="grid-card result-card"><div className="card-header"><h3>时间轴</h3></div><div className="timeline">{video.latest_result.timeline.map((item, index) => <article className="timeline-item" key={`${item.title}-${index}`}><div className="timeline-marker">{index + 1}</div><div className="timeline-content"><h4>{item.title || "章节"}</h4><div className="timeline-meta"><span className="timeline-time">{formatDuration(item.start ?? 0)}</span></div><p>{item.summary || ""}</p></div></article>)}</div></section>
                <section className="grid-card transcript-card"><div className="card-header"><h3>转写全文</h3></div><pre className="transcript">{video.latest_result.transcript_text}</pre></section>
              </div>
            ) : <div className="empty-placeholder">当前还没有可展示的摘要结果。</div>}
          </article>
        </section>
        <aside className="video-detail-sidebar">
          <article className="grid-card detail-side-card">
            <div className="panel-header"><h2>处理进度</h2><p>{selectedTask ? `当前任务 ${selectedTask.task_id.slice(0, 8)}` : "尚未开始处理"}</p></div>
            {selectedTask ? (
              <div className="task-progress-simple">
                <div className="progress-bar-wrapper">
                  <div className="progress-bar-simple"><div className={`progress-fill-simple ${progress.hasError ? "error" : progress.isCompleted ? "success" : ""}`} style={{ width: `${progress.progress}%` }} /></div>
                  <div className="progress-info-simple"><span className="progress-percent-simple">{Math.round(progress.progress)}%</span><span className="progress-status-simple">{progress.currentEvent?.message ?? "等待开始..."}</span></div>
                </div>
                <details className="progress-stage-card"><summary><div><strong>{progress.currentEvent?.stage ?? "阶段详情"}</strong><span>{progress.filtered.length} 条进度记录</span></div><span className="progress-stage-toggle">展开详细</span></summary><div className="progress-stage-list">{progress.filtered.map((event) => <article className="progress-event-card" key={event.event_id}><div className="progress-event-index">{event.stage}</div><div className="progress-event-copy"><div className="progress-event-topline"><strong>{event.message}</strong><span>{formatDateTime(event.created_at)}</span></div><div className="progress-event-meta">阶段进度 {event.progress}%</div></div></article>)}</div></details>
              </div>
            ) : <div className="empty-placeholder">点击“开始总结”后，这里会展示处理进度。</div>}
          </article>
          <article className="grid-card detail-side-card">
            <div className="panel-header"><h2>任务历史</h2><p>{tasks.length} 条任务记录</p></div>
            <div className="task-history-list">
              {tasks.length ? tasks.map((task) => <details className={`task-history-item ${task.task_id === selectedTask?.task_id ? "active" : ""}`} key={task.task_id} open={task.task_id === selectedTask?.task_id}><summary className="task-history-summary" onClick={async (event) => { event.preventDefault(); const [detail, taskEvents] = await Promise.all([api.getTaskResult(task.task_id), api.getTaskEvents(task.task_id)]); setSelectedTask(detail); setEvents(taskEvents); }}><div className="task-history-main"><span className="task-history-status">{taskStatusLabel(task.status)}</span><span className="task-history-time">{formatDateTime(task.created_at)}</span></div><div className="task-history-meta"><span className="task-history-id">{task.task_id.slice(0, 8)}</span></div></summary><div className="task-history-details"><div className="task-history-info"><div className="info-row"><span className="info-label">LLM Token</span><span className="info-value">{formatTokenCount(task.llm_total_tokens)}</span></div><div className="info-row"><span className="info-label">任务耗时</span><span className="info-value">{formatTaskDuration(task.task_duration_seconds)}</span></div></div><div className="task-history-actions"><button className="tertiary-button danger" type="button" onClick={async () => { await api.deleteTask(task.task_id); await refreshDetail(selectedTask?.task_id); }}>删除</button></div></div></details>) : <div className="empty-placeholder">暂无历史任务</div>}
            </div>
          </article>
          <article className="grid-card detail-side-card desktop-card">
            <div className="panel-header"><h2>桌面运行状态</h2><p>托盘常驻、自启动与后端桥接</p></div>
            <div className="desktop-status-grid">
              <div className="desktop-status-item"><strong>后端 URL</strong><span>{desktop.backend?.url ?? "-"}</span></div>
              <div className="desktop-status-item"><strong>后端 PID</strong><span>{desktop.backend?.pid ?? "-"}</span></div>
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}

function SettingsPage({ snapshot, desktop, onDesktopChange, onRefresh }: { snapshot: Snapshot; desktop: DesktopState; onDesktopChange(): Promise<void>; onRefresh(): void }) {
  const [form, setForm] = useState<ServiceSettings | null>(snapshot.settings);
  const [saveStatus, setSaveStatus] = useState("");
  const [cudaStatus, setCudaStatus] = useState("");
  const [cudaOutput, setCudaOutput] = useState("");
  const [logOutput, setLogOutput] = useState("");
  const [serviceStatus, setServiceStatus] = useState("");

  useEffect(() => { setForm(snapshot.settings); }, [snapshot.settings]);
  useEffect(() => { void refreshLogs(); }, []);

  async function refreshLogs() {
    try {
      setLogOutput(await api.getSystemLogs());
    } catch (error) {
      setLogOutput(error instanceof Error ? error.message : "读取日志失败");
    }
  }

  if (!form) return <section className="grid-card empty-state-card">正在加载设置...</section>;

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await api.updateSettings(form);
      setSaveStatus("设置已保存");
      onRefresh();
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "保存设置失败");
    }
  }

  return (
    <section className="settings-grid">
      <article className="grid-card settings-wide env-card">
        <div className="panel-header"><h2>运行环境与 CUDA</h2><p>环境检测、推荐设备和 CUDA 配置</p></div>
        <section className="env-panel"><div className="env-panel-head"><span className="env-panel-kicker">Environment Snapshot</span><p>当前硬件、依赖版本和运行时建议一览</p></div><div className="env-summary-grid"><Metric label="推荐设备" value={snapshot.environment?.recommendedDevice || "-"} /><Metric label="推荐模型" value={snapshot.environment?.recommendedModel || "-"} /><Metric label="GPU 状态" value={snapshot.environment?.cudaAvailable ? "已启用" : "未启用"} /><Metric label="运行时通道" value={snapshot.environment?.runtimeChannel || form.runtime_channel || "base"} /></div></section>
        <section className="cuda-control-panel">
          <div className="cuda-control-copy"><span className="env-panel-kicker">CUDA Control</span><h3>CUDA 目标版本</h3><p>选择目标运行时后，可重新检测环境或安装对应 CUDA 支持。</p></div>
          <div className="cuda-actions"><label className="input-row cuda-picker"><span className="input-label">CUDA 目标版本</span><select className="select-field" value={form.cuda_variant} onChange={(e) => setForm({ ...form, cuda_variant: e.target.value })}><option value="cu128">CUDA 12.8</option><option value="cu126">CUDA 12.6</option><option value="cu124">CUDA 12.4</option></select></label><div className="settings-actions cuda-button-row"><button className="secondary-button" type="button" onClick={() => onRefresh()}>重新检测</button><button className="primary-button" type="button" onClick={async () => { try { const result = await api.installCuda({ cuda_variant: form.cuda_variant }); setCudaStatus(result.message || "CUDA 安装命令已执行"); setCudaOutput(result.output || ""); onRefresh(); } catch (error) { setCudaStatus(error instanceof Error ? error.message : "CUDA 安装失败"); } }}>安装 CUDA 支持</button></div></div>
          {cudaStatus ? <div className="action-status">{cudaStatus}</div> : null}
          {cudaOutput ? <label className="input-row"><span className="input-label">CUDA 安装输出</span><textarea className="textarea-field log-viewer" rows={8} readOnly value={cudaOutput}></textarea></label> : null}
        </section>
      </article>

      <article className="grid-card">
        <div className="panel-header"><h2>桌面偏好</h2><p>托盘、自启动和关闭行为</p></div>
        <div className="desktop-card">
          <div className="desktop-status-grid"><div className="desktop-status-item"><strong>关闭按钮行为</strong><span>{desktop.closeBehavior === "tray" ? "隐藏到托盘" : desktop.closeBehavior === "exit" ? "直接退出" : "首次询问"}</span></div><div className="desktop-status-item"><strong>开机自启动</strong><span>{desktop.autoLaunch ? "已启用" : "未启用"}</span></div></div>
          <div className="desktop-actions">
            <button className="secondary-button" type="button" onClick={async () => { await window.desktop?.preferences.setCloseBehavior("tray"); await onDesktopChange(); }}>关闭时隐藏到托盘</button>
            <button className="secondary-button" type="button" onClick={async () => { await window.desktop?.preferences.setCloseBehavior("exit"); await onDesktopChange(); }}>关闭时直接退出</button>
            <button className="secondary-button" type="button" onClick={async () => { await window.desktop?.preferences.resetCloseBehavior(); await onDesktopChange(); }}>恢复首次询问</button>
            <button className="primary-button" type="button" onClick={async () => { await window.desktop?.app.setAutoLaunch(!desktop.autoLaunch); await onDesktopChange(); }}>{desktop.autoLaunch ? "关闭开机自启" : "开启开机自启"}</button>
          </div>
        </div>
      </article>

      <article className="grid-card settings-form-card">
        <div className="panel-header"><h2>运行配置</h2><p>编辑并保存后端配置</p></div>
        <form className="setting-form settings-sections" onSubmit={save}>
          <section className="settings-subsection"><h3>基础运行</h3><Field label="监听地址" value={form.host} onChange={(value) => setForm({ ...form, host: value })} /><Field label="监听端口" value={String(form.port)} type="number" onChange={(value) => setForm({ ...form, port: Number(value) })} /><Field label="数据目录" value={form.data_dir} onChange={(value) => setForm({ ...form, data_dir: value })} /><Field label="缓存目录" value={form.cache_dir} onChange={(value) => setForm({ ...form, cache_dir: value })} /><Field label="任务目录" value={form.tasks_dir} onChange={(value) => setForm({ ...form, tasks_dir: value })} /></section>
          <section className="settings-subsection"><h3>模型与摘要</h3><Field label="推理设备" value={form.device_preference} onChange={(value) => setForm({ ...form, device_preference: value })} /><Field label="固定模型" value={form.fixed_model} onChange={(value) => setForm({ ...form, fixed_model: value })} /><Field label="LLM Base URL" value={form.llm_base_url} onChange={(value) => setForm({ ...form, llm_base_url: value })} /><Field label="LLM 模型" value={form.llm_model} onChange={(value) => setForm({ ...form, llm_model: value })} /><Field label="LLM API Key" value={form.llm_api_key} type="password" onChange={(value) => setForm({ ...form, llm_api_key: value })} /></section>
          <section className="settings-subsection settings-actions-section"><div className="settings-actions"><button className="primary-button" type="submit">保存设置</button>{saveStatus ? <div className="action-status">{saveStatus}</div> : null}</div></section>
        </form>
      </article>

      <article className="grid-card">
        <div className="panel-header"><h2>后端信息</h2><p>系统运行详情</p></div>
        <div className="setting-list"><div className="setting-row"><span className="setting-label">服务名</span><span className="setting-value">{snapshot.systemInfo?.application?.name || "-"}</span></div><div className="setting-row"><span className="setting-label">版本</span><span className="setting-value">{snapshot.systemInfo?.application?.version || "-"}</span></div><div className="setting-row"><span className="setting-label">日志文件</span><span className="setting-value">{snapshot.systemInfo?.service?.log_file || desktop.logPath || "-"}</span></div></div>
      </article>

      <article className="grid-card settings-wide">
        <div className="panel-header"><h2>日志与控制</h2><p>查看后端日志，并直接控制当前内置后端</p></div>
        <div className="desktop-actions">
          <button className="secondary-button" type="button" onClick={() => void refreshLogs()}>刷新日志</button>
          <button className="secondary-button" type="button" onClick={async () => { await window.desktop?.backend.start(); setServiceStatus("已请求启动后端"); await onDesktopChange(); }}>启动后端</button>
          <button className="secondary-button danger-button" type="button" onClick={async () => { await window.desktop?.backend.stop(); setServiceStatus("后端已停止"); await onDesktopChange(); }}>停止后端</button>
          <button className="secondary-button danger-button" type="button" onClick={async () => { await api.shutdownService(); setServiceStatus("已向服务发送关闭请求"); onRefresh(); }}>通过 API 关闭服务</button>
        </div>
        {serviceStatus ? <div className="action-status">{serviceStatus}</div> : null}
        <label className="input-row"><span className="input-label">当前日志文件</span><input className="input-field" value={snapshot.systemInfo?.service?.log_file || desktop.logPath} readOnly /></label>
        <label className="input-row"><span className="input-label">最近日志</span><textarea className="textarea-field log-viewer" rows={16} readOnly value={logOutput}></textarea></label>
      </article>
    </section>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange(value: string): void; type?: string }) {
  return <label className="input-row"><span className="input-label">{label}</span><input className="input-field" type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}
