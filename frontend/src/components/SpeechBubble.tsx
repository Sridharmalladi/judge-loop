import { AnimatePresence, motion } from "framer-motion";

export default function SpeechBubble({ text, color = "var(--color-hud-text)" }: { text: string; color?: string }) {
  return (
    <AnimatePresence mode="wait">
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 4, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="speech-bubble"
          style={{ borderColor: color, color }}
        >
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
