import { useEffect, useMemo, useState } from "react";

import type { VideoAssetSummary, VideoPageOption } from "../types";
import { formatDuration } from "../utils";

type MultiPageSelectDialogProps = {
  isOpen: boolean;
  video: VideoAssetSummary | null;
  pages: VideoPageOption[];
  onClose(): void;
  onConfirm(page: VideoPageOption): Promise<void>;
};

export function MultiPageSelectDialog({
  isOpen,
  video,
  pages,
  onClose,
  onConfirm,
}: MultiPageSelectDialogProps) {
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedPage(null);
      setSubmitting(false);
      return;
    }
    setSelectedPage(pages[0]?.page ?? null);
  }, [isOpen, pages]);

  const activePage = useMemo(
    () => pages.find((item) => item.page === selectedPage) ?? pages[0] ?? null,
    [pages, selectedPage],
  );

  if (!isOpen || !video) {
    return null;
  }

  const handleConfirm = async () => {
    if (!activePage) {
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(activePage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="update-dialog-overlay" onClick={() => !submitting && onClose()}>
      <div className="update-dialog multi-page-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="update-dialog-header">
          <h2>选择要解析的分 P</h2>
          <button className="close-button" onClick={onClose} aria-label="关闭" disabled={submitting}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="update-dialog-body multi-page-dialog-body">
          <div className="multi-page-dialog-hero">
            {activePage?.cover_url || video.cover_url ? (
              <img src={activePage?.cover_url || video.cover_url} alt={video.title} />
            ) : (
              <div className="multi-page-dialog-placeholder" aria-hidden="true">P</div>
            )}
            <div className="multi-page-dialog-copy">
              <span className="section-kicker">检测到多 P 视频</span>
              <strong>{video.title}</strong>
              <small>共 {pages.length} 个分 P，请先选择一个再开始解析。</small>
            </div>
          </div>

          <div className="multi-page-list" role="listbox" aria-label="视频分 P 列表">
            {pages.map((page) => {
              const active = page.page === activePage?.page;
              return (
                <button
                  key={page.page}
                  type="button"
                  className={`multi-page-item ${active ? "is-active" : ""}`}
                  onClick={() => setSelectedPage(page.page)}
                >
                  <span className="multi-page-item-index">P{page.page}</span>
                  <span className="multi-page-item-copy">
                    <strong>{page.title}</strong>
                    <small>{formatDuration(page.duration)}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="update-dialog-footer">
          <button className="secondary-button" type="button" onClick={onClose} disabled={submitting}>取消</button>
          <button className="primary-button" type="button" onClick={() => void handleConfirm()} disabled={!activePage || submitting}>
            {submitting ? "正在开始..." : `解析 ${activePage ? `P${activePage.page}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
