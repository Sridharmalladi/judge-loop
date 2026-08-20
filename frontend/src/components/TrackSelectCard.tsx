import { motion } from "framer-motion";

export default function TrackSelectCard({
  title,
  description,
  accent,
  icon,
  onSelect,
  disabled,
  disabledReason,
}: {
  title: string;
  description: string;
  accent: string;
  icon: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <motion.button
      onClick={onSelect}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      whileHover={disabled ? undefined : { y: -4 }}
      className="group flex flex-col items-center gap-4 rounded-lg border-2 border-chrome-border bg-chrome p-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-[--accent]"
      style={{ ["--accent" as string]: accent }}
    >
      <div
        className="flex h-20 w-20 items-center justify-center rounded-md border-2 transition-shadow group-enabled:group-hover:shadow-[0_0_20px_var(--accent)]"
        style={{ borderColor: accent, color: accent }}
      >
        {icon}
      </div>
      <h3 className="font-pixel text-xs" style={{ color: accent }}>
        {title}
      </h3>
      <p className="text-xs leading-relaxed text-hud-text-dim">{description}</p>
      <span
        className="mt-2 rounded-sm border-2 px-4 py-1.5 font-pixel text-[10px] transition-colors group-enabled:group-hover:bg-[--accent] group-enabled:group-hover:text-chrome-dark"
        style={{ borderColor: accent, color: accent }}
      >
        {disabled ? "UNAVAILABLE" : "START"}
      </span>
    </motion.button>
  );
}
