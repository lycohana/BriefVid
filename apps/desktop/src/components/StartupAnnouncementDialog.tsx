import { MarkdownContent } from "./MarkdownContent";

export type StartupAnnouncement = {
  version: string;
  title: string;
  content: string;
};

type StartupAnnouncementDialogProps = {
  announcement: StartupAnnouncement | null;
  onClose(): void;
};

export function StartupAnnouncementDialog({ announcement, onClose }: StartupAnnouncementDialogProps) {
  if (!announcement) {
    return null;
  }

  return (
    <div className="update-dialog-overlay" onClick={onClose}>
      <div className="update-dialog startup-announcement-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="update-dialog-header">
          <h2>{announcement.title || "更新公告"}</h2>
          <button className="close-button" type="button" onClick={onClose} aria-label="关闭">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="update-dialog-body startup-announcement-body">
          <div className="startup-announcement-hero">
            <span className="section-kicker">v{announcement.version}</span>
            <strong>这次更新有一些想告诉你的东西</strong>
          </div>
          <MarkdownContent className="startup-announcement-content" content={announcement.content} />
        </div>

        <div className="update-dialog-footer">
          <button className="primary-button" type="button" onClick={onClose}>
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}
