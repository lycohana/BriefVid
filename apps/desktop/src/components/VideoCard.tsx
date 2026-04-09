import { Link } from "react-router-dom";

import { platformLabel, taskStatusClass } from "../appModel";
import type { VideoAssetSummary } from "../types";
import { formatDateTime, formatDuration, taskStatusLabel } from "../utils";

export function VideoCard({ video }: { video: VideoAssetSummary }) {
  const badgeClass = taskStatusClass(video.latest_status);

  return (
    <Link className="video-card" to={`/videos/${video.video_id}`}>
      <div className="video-card-cover">
        {video.cover_url ? <img src={video.cover_url} alt={video.title} loading="lazy" /> : <div className="video-card-placeholder">VIDEO</div>}
        <span className="video-duration">{formatDuration(video.duration)}</span>
      </div>
      <div className="video-card-body">
        <div className="video-card-topline">
          <span className="video-platform-badge">{platformLabel(video.platform)}</span>
          <span className={`task-status ${badgeClass}`}>{taskStatusLabel(video.latest_status)}</span>
        </div>
        <h3>{video.title}</h3>
        <div className="video-card-meta">
          <span>{formatDateTime(video.updated_at)}</span>
          <span>{video.has_result ? "摘要已生成" : "等待结果"}</span>
        </div>
      </div>
    </Link>
  );
}
