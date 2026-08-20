import { Link } from "react-router-dom";
import type { Theme } from "../hooks/useTheme";

export default function TopBar({
  soundOn,
  onToggleSound,
  theme,
  onToggleTheme,
}: {
  soundOn: boolean;
  onToggleSound: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 flex h-11 items-center justify-between border-b-2 border-chrome-border bg-chrome-dark/95 px-4 backdrop-blur-sm">
      <Link
        to="/"
        className="font-pixel text-[10px] text-hud-green"
        style={{ textShadow: "0 0 8px var(--color-hud-green)" }}
      >
        ARENA
      </Link>
      <div className="flex items-center gap-2">
        <IconButton active={soundOn} onClick={onToggleSound} label={soundOn ? "MUSIC ON" : "MUSIC OFF"}>
          {soundOn ? "🔊" : "🔇"}
        </IconButton>
        <IconButton active={theme === "light"} onClick={onToggleTheme} label={theme === "dark" ? "DARK" : "LIGHT"}>
          {theme === "dark" ? "🌙" : "☀️"}
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className="flex items-center gap-1.5 rounded-sm border-2 px-2 py-1 text-xs transition-colors"
      style={{
        borderColor: active ? "var(--color-hud-green)" : "var(--color-chrome-border)",
        color: active ? "var(--color-hud-green)" : "var(--color-hud-text-dim)",
      }}
    >
      <span>{children}</span>
      <span className="hidden font-pixel text-[8px] sm:inline">{label}</span>
    </button>
  );
}
