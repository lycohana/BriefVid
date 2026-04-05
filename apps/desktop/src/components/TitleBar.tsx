import { useEffect, useState } from "react";

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    async function checkMaximized() {
      if (window.desktop) {
        const maximized = await window.desktop.window.isMaximized();
        setIsMaximized(maximized);
      }
    }
    void checkMaximized();
  }, []);

  const handleMaximize = async () => {
    if (window.desktop) {
      await window.desktop.window.maximize();
      const maximized = await window.desktop.window.isMaximized();
      setIsMaximized(maximized);
    }
  };

  const handleMinimize = async () => {
    if (window.desktop) {
      await window.desktop.window.minimize();
    }
  };

  const handleClose = async () => {
    if (window.desktop) {
      await window.desktop.window.close();
    }
  };

  return (
    <div className="title-bar">
      <div className="title-bar-sidebar-brand">
        <div className="title-bar-brand-mark">
          <img src="/static/assets/icons/icon.svg" alt="" />
        </div>
        <span className="title-bar-brand-text">BriefVid</span>
      </div>
      <div className="title-bar-drag-region" />
      <div className="title-bar-controls">
        <button
          className="title-bar-button"
          type="button"
          onClick={handleMinimize}
          aria-label="最小化"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          className="title-bar-button"
          type="button"
          onClick={handleMaximize}
          aria-label={isMaximized ? "还原" : "最大化"}
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3.5 3.5V1.5H9.5V3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1.5" y="1.5" width="9" height="9" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          )}
        </button>
        <button
          className="title-bar-button close"
          type="button"
          onClick={handleClose}
          aria-label="关闭"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
