import { useEffect, useState } from "react";

export function TitleBar({ darkMode, onToggleTheme }: { darkMode: boolean; onToggleTheme(): void }) {
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
          onClick={onToggleTheme}
          aria-label={darkMode ? "切换到浅色模式" : "切换到深色模式"}
          title={darkMode ? "浅色模式" : "深色模式"}
        >
          {darkMode ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.5v2.25M12 19.25v2.25M4.75 12H2.5M21.5 12h-2.25M5.9 5.9 4.3 4.3M19.7 19.7l-1.6-1.6M18.1 5.9l1.6-1.6M4.3 19.7l1.6-1.6" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 15.5A8.5 8.5 0 1 1 12.5 4a6.5 6.5 0 0 0 7.5 11.5Z" />
            </svg>
          )}
        </button>
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
