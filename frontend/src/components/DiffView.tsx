import { diffWords } from "diff";

export default function DiffView({ before, after }: { before: string; after: string }) {
  const parts = diffWords(before, after);

  return (
    <div className="diff-view">
      {parts.map((part, idx) => {
        if (part.added) {
          return (
            <span key={idx} className="diff-add">
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span key={idx} className="diff-remove">
              {part.value}
            </span>
          );
        }
        return <span key={idx}>{part.value}</span>;
      })}
    </div>
  );
}
