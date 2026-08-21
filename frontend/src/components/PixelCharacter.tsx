import type { CharacterState } from "../types/domain";

const STATE_CLASS: Record<CharacterState, string> = {
  idle: "pc-idle",
  thinking: "pc-thinking",
  writing: "pc-writing",
  talking: "pc-talking",
  nod: "pc-nod",
  shake: "pc-shake",
  celebrate: "pc-celebrate",
  sad: "pc-sad",
};

// Pure-CSS pixel sprite — no image assets. Built from ~8 absolutely
// positioned rects on a 64x64 design grid, then scaled via `size` so one
// component works as a tiny ticker avatar or a full-size lane mascot.
export default function PixelCharacter({
  state,
  color = "var(--color-hud-green)",
  size = 64,
  flip = false,
}: {
  state: CharacterState;
  color?: string;
  size?: number;
  flip?: boolean;
}) {
  const scale = size / 64;

  return (
    <div className="pixel-character" style={{ width: size, height: size }} aria-hidden="true">
      <div
        className="pc-scale"
        style={
          {
            transform: `scale(${scale}) ${flip ? "scaleX(-1)" : ""}`,
            "--pc-color": color,
          } as React.CSSProperties
        }
      >
        <div className={`pc-rig ${STATE_CLASS[state]}`}>
          <div className="pc-antenna-tip" />
          <div className="pc-antenna-stalk" />
          <div className="pc-head">
            <div className="pc-visor">
              <span className="pc-eye" />
              <span className="pc-eye" />
            </div>
          </div>
          <div className="pc-body" />
          <div className="pc-arm pc-arm-l" />
          <div className="pc-arm pc-arm-r" />
        </div>
        <div className="pc-shadow" />
      </div>
    </div>
  );
}
