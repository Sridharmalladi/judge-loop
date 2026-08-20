import { motion } from "framer-motion";

export default function TrackSelectCard({
  title,
  description,
  accent,
  icon,
  onSelect,
}: {
  title: string;
  description: string;
  accent: string;
  icon: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -4 }}
      className="group flex flex-col items-center gap-4 rounded-lg border-2 border-chrome-border bg-chrome p-6 text-center transition-colors hover:border-[--accent]"
      style={{ ["--accent" as string]: accent }}
    >
      <div
        className="flex h-20 w-20 items-center justify-center rounded-md border-2 transition-shadow group-hover:shadow-[0_0_20px_var(--accent)]"
        style={{ borderColor: accent, color: accent }}
      >
        {icon}
      </div>
      <h3 className="font-pixel text-xs" style={{ color: accent }}>
        {title}
      </h3>
      <p className="text-xs leading-relaxed text-hud-text-dim">{description}</p>
      <span
        className="mt-2 rounded-sm border-2 px-4 py-1.5 font-pixel text-[10px] transition-colors group-hover:bg-[--accent] group-hover:text-chrome-dark"
        style={{ borderColor: accent, color: accent }}
      >
        START
      </span>
    </motion.button>
  );
}
