import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { progressEventClass, stageLabel, taskStatusClass } from "../appModel";
import { api } from "../api";
import type { TaskDetail, TaskEvent, TaskSummary, VideoAssetDetail } from "../types";
import { formatDateTime, formatDuration, formatTaskDuration, formatTokenCount, summarizeEvents, taskStatusLabel } from "../utils";

export function VideoDetailPage({ onRefresh }: { onRefresh(): void }) {
  const { videoId = "" } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoAssetDetail | null>(null);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [status, setStatus] = useState("");
  const lastAutoRefreshEventRef = useRef<string | null>(null);

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

  useEffect(() => {
    void refreshDetail();
  }, [videoId]);

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

  useEffect(() => {
    lastAutoRefreshEventRef.current = null;
  }, [selectedTask?.task_id]);

  useEffect(() => {
    if (!selectedTask?.task_id || !events.length) return;
    const terminalEvent = [...events].reverse().find((event) => (
      event.stage === "completed" || event.stage === "failed" || event.stage === "cancelled"
    ));
    if (!terminalEvent) return;
    const refreshKey = `${selectedTask.task_id}:${terminalEvent.event_id}`;
    if (lastAutoRefreshEventRef.current === refreshKey) return;
    lastAutoRefreshEventRef.current = refreshKey;

    const timer = window.setTimeout(() => {
      void refreshDetail(selectedTask.task_id);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [events, selectedTask?.task_id]);

  if (!video) return <section className="grid-card empty-state-card">正在加载视频详情...</section>;
  const progress = summarizeEvents(events);

  return (
    <section className="video-detail-page">
      <div className="detail-page-toolbar"><Link className="secondary-button" to="/library">返回视频库</Link></div>

      <article className="video-detail-hero">
        <a className="video-detail-cover" href={video.source_url} target="_blank" rel="noreferrer">
          {video.cover_url ? <img src={video.cover_url} alt={video.title} loading="lazy" /> : <div className="video-card-placeholder">VIDEO</div>}
        </a>
        <div className="video-detail-copy">
          <div className="hero-chip-row">
            <span className={`mini-chip ${taskStatusClass(video.latest_status)}`}>{taskStatusLabel(video.latest_status)}</span>
            <span className="mini-chip">{formatDuration(video.duration)}</span>
            <span className="mini-chip">{formatDateTime(video.updated_at)}</span>
          </div>
          <h1 className="video-detail-title">{video.title}</h1>
          <div className="detail-hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={async () => {
                setStatus("正在创建处理任务...");
                const task = await api.createVideoTask(video.video_id);
                await refreshDetail(task.task_id);
                setStatus("已开始新的摘要任务");
              }}
            >
              重新生成摘要
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={async () => {
                setStatus("正在刷新视频信息...");
                await api.probeVideo({ url: video.source_url, force_refresh: true });
                await refreshDetail(selectedTask?.task_id);
                setStatus("视频信息已刷新");
              }}
            >
              刷新视频信息
            </button>
            <button
              className="secondary-button danger-outline"
              type="button"
              onClick={async () => {
                if (!window.confirm("确定要从视频库删除这个视频吗？")) return;
                await api.deleteVideo(video.video_id);
                onRefresh();
                navigate("/");
              }}
            >
              从视频库删除
            </button>
          </div>
          {status ? <div className="submit-status">{status}</div> : null}
        </div>
      </article>

      <section className="video-detail-main">
        <section className="video-detail-primary">
          <article className="grid-card detail-section-card">
            <div className="panel-header">
              <p className="section-kicker">Summary Result</p>
              <h2>摘要结果</h2>
              <p>当前视频的最新摘要、关键要点、时间轴和全文转写。</p>
            </div>
            {video.latest_result ? (
              <div className="detail-result-sections">
                <section className="result-section">
                  <h3 className="result-section-title">摘要概览</h3>
                  <p className="result-section-content">{video.latest_result.overview}</p>
                </section>
                <section className="result-section">
                  <h3 className="result-section-title">关键要点 <span className="result-count">{video.latest_result.key_points.length} 条</span></h3>
                  <ul className="key-points-list">
                    {video.latest_result.key_points.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
                <section className="result-section">
                  <h3 className="result-section-title">时间轴</h3>
                  <div className="timeline-list">
                    {video.latest_result.timeline.map((item, index) => (
                      <article className="timeline-item-simple" key={`${item.title}-${index}`}>
                        <div className="timeline-time-badge">{formatDuration(item.start ?? 0)}</div>
                        <div className="timeline-content-simple">
                          <h4>{item.title || "章节"}</h4>
                          <p>{item.summary || ""}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
                <section className="result-section transcript-section">
                  <h3 className="result-section-title">转写全文</h3>
                  <pre className="transcript-full">{video.latest_result.transcript_text}</pre>
                </section>
              </div>
            ) : <div className="empty-placeholder">当前还没有可展示的摘要结果。</div>}
          </article>
        </section>

        <aside className="video-detail-sidebar">
          <article className="grid-card detail-side-card">
            <div className="panel-header">
              <p className="section-kicker">Progress</p>
              <h2>处理进度</h2>
              <p>{selectedTask ? `当前任务 ${selectedTask.task_id.slice(0, 8)}` : "尚未开始处理"}</p>
            </div>
            {selectedTask ? (
              <div className="task-progress-simple">
                <div className="progress-bar-wrapper">
                  <div className="progress-bar-simple">
                    <div
                      className={`progress-fill-simple ${progress.hasError ? "error" : progress.isCompleted ? "success" : ""}`}
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  <div className="progress-info-simple">
                    <span className="progress-percent-simple">{Math.round(progress.progress)}%</span>
                    <span className="progress-status-simple">{progress.currentEvent?.message ?? "等待开始..."}</span>
                  </div>
                </div>
                <details className="progress-stage-card">
                  <summary>
                    <div>
                      <strong>{stageLabel(progress.currentEvent?.stage) || "阶段详情"}</strong>
                      <span>{progress.filtered.length} 条进度记录</span>
                    </div>
                    <span className="progress-stage-toggle">展开详细</span>
                  </summary>
                  <div className="progress-stage-list">
                    {progress.filtered.map((event) => (
                      <article className={`progress-event-card ${progressEventClass(event.stage)}`} key={event.event_id}>
                        <div className="progress-event-index">{stageLabel(event.stage)}</div>
                        <div className="progress-event-copy">
                          <div className="progress-event-topline">
                            <strong>{event.message}</strong>
                            <span>{formatDateTime(event.created_at)}</span>
                          </div>
                          <div className="progress-event-meta">阶段进度 {event.progress}%</div>
                        </div>
                      </article>
                    ))}
                  </div>
                </details>
              </div>
            ) : <div className="empty-placeholder">点击"开始总结"后，这里会展示处理进度。</div>}
          </article>

          <article className="grid-card detail-side-card">
            <div className="panel-header">
              <p className="section-kicker">History</p>
              <h2>任务历史</h2>
              <p>{tasks.length} 条任务记录</p>
            </div>
            <div className="task-history-list">
              {tasks.length ? tasks.map((task) => (
                <details className={`task-history-item ${task.task_id === selectedTask?.task_id ? "active" : ""}`} key={task.task_id} open={task.task_id === selectedTask?.task_id}>
                  <summary
                    className="task-history-summary"
                    onClick={async (event) => {
                      event.preventDefault();
                      const [detail, taskEvents] = await Promise.all([api.getTaskResult(task.task_id), api.getTaskEvents(task.task_id)]);
                      setSelectedTask(detail);
                      setEvents(taskEvents);
                    }}
                  >
                    <div className="task-history-main">
                      <span className={`task-history-status ${taskStatusClass(task.status)}`}>{taskStatusLabel(task.status)}</span>
                      <span className="task-history-time">{formatDateTime(task.created_at)}</span>
                    </div>
                    <div className="task-history-meta"><span className="task-history-id">{task.task_id.slice(0, 8)}</span></div>
                  </summary>
                  <div className="task-history-details">
                    <div className="task-history-info">
                      <div className="info-row"><span className="info-label">LLM Token</span><span className="info-value">{formatTokenCount(task.llm_total_tokens)}</span></div>
                      <div className="info-row"><span className="info-label">任务耗时</span><span className="info-value">{formatTaskDuration(task.task_duration_seconds)}</span></div>
                    </div>
                    <div className="task-history-actions">
                      <button
                        className="tertiary-button danger"
                        type="button"
                        onClick={async () => {
                          await api.deleteTask(task.task_id);
                          await refreshDetail(selectedTask?.task_id);
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </details>
              )) : <div className="empty-placeholder">暂无历史任务</div>}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
