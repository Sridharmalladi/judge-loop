import { useState } from "react";
import { motion } from "framer-motion";

const COLLAPSED_LINES = 6;

export default function ExpandableText({ text, cursor }: { text: string; cursor?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.split("\n").length > COLLAPSED_LINES || text.length > 480;

  return (
    <div>
      <motion.p
        layout="position"
        className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-hud-text"
        style={
          isLong && !expanded
            ? {
                display: "-webkit-box",
                WebkitLineClamp: COLLAPSED_LINES,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {text}
        {cursor && <span className="animate-blink text-hud-green">▌</span>}
      </motion.p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 font-pixel text-[9px] tracking-wide text-hud-cyan hover:text-hud-green"
        >
          {expanded ? "▲ SHOW LESS" : "▼ SHOW FULL RESPONSE"}
        </button>
      )}
    </div>
  );
}
