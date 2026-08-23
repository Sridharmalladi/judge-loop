import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { RunSource } from "../types/domain";

const TABS: { id: RunSource; label: string; accent: string; blurb: string }[] = [
  {
    id: "real",
    label: "REAL",
    accent: "var(--color-hud-pink)",
    blurb: "Ready right away, using this app's own backend keys. Nothing to set up. The 🔥 marks whichever model is working best right now.",
  },
  {
    id: "byok",
    label: "BYOK",
    accent: "var(--color-hud-cyan)",
    blurb: "Bring your own free API key and run on your own quota instead of a shared one. You're the one in control of the rate limits.",
  },
];

export default function SourceTabs({
  selected,
  onSelect,
}: {
  selected: RunSource | null;
  onSelect: (source: RunSource) => void;
}) {
  const [hovered, setHovered] = useState<RunSource | null>(null);

  return (
    <div className="flex flex-wrap items-start justify-center gap-4">
      {TABS.map((tab) => (
        <div
          key={tab.id}
          className="relative"
          onMouseEnter={() => setHovered(tab.id)}
          onMouseLeave={() => setHovered(null)}
        >
          <button
            type="button"
            onClick={() => onSelect(tab.id)}
            className="rounded-md border-2 px-6 py-4 font-pixel text-xs transition-shadow"
            style={{
              borderColor: tab.accent,
              color: tab.accent,
              boxShadow: selected === tab.id ? `0 0 18px 2px ${tab.accent}` : "none",
              background: selected === tab.id ? "var(--color-chrome-raised)" : "var(--color-chrome)",
            }}
          >
            {tab.label}
          </button>
          <AnimatePresence>
            {hovered === tab.id && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-md border-2 bg-chrome p-3 text-left text-xs leading-relaxed text-hud-text-dim shadow-lg"
                style={{ borderColor: tab.accent }}
              >
                {tab.blurb}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
