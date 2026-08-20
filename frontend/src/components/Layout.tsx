import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="crt-overlay" />
      <div className="crt-vignette" />
      <div className="app-shell">
        <header className="top-nav">
          <span className="logo">⚔ REFINEMENT ARENA</span>
          <nav>
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
              NEW RUN
            </NavLink>
            <NavLink to="/runs" className={({ isActive }) => (isActive ? "active" : "")}>
              PAST RUNS
            </NavLink>
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </>
  );
}
