import React, { useEffect, useState } from "react";
import StaffList from "./components/StaffList";
import CallPanel from "./components/CallPanel";
import "./App.css";

function App() {
  const [theme, setTheme] = useState(() => (
    window.localStorage.getItem("call-centre-theme") === "dark" ? "dark" : "light"
  ));

  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  useEffect(() => {
    window.localStorage.setItem("call-centre-theme", theme);
  }, [theme]);

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="OnCall dashboard home">
          <span className="brand-mark">C</span>
          <span>Call for Care<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-right">
          <span className="workspace-label">OPERATIONS</span>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((currentTheme) => currentTheme === "light" ? "dark" : "light")}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            <span className="theme-toggle-label">{theme === "light" ? "Dark" : "Light"}</span>
          </button>
          <span className="topbar-divider" aria-hidden="true" />
          <span className="user-avatar" aria-label="Signed in as Anisha Rakshit">AR</span>
        </div>
      </header>

      <main className="dashboard">
        <div className="page-heading">
          <div>
            <p className="eyebrow">TEAM OVERVIEW <span className="live-indicator" /></p>
            <h1>Call Centre Staff dashboard</h1>
            <p className="page-subtitle">Your team at a glance. Keep service running smoothly.</p>
          </div>
          <div className="date-badge"><span aria-hidden="true">◷</span> {today}</div>
        </div>
        <CallPanel />
        <StaffList />
      </main>
    </div>
  );
}

export default App;
