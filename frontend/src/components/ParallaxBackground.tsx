const MOUNTAIN_FAR_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="140" viewBox="0 0 400 140">
  <path d="M0,140 L0,90 L40,50 L70,75 L110,30 L150,70 L190,45 L230,85 L270,40 L310,80 L350,55 L400,90 L400,140 Z" fill="#3d2b56"/>
</svg>`);

const MOUNTAIN_NEAR_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="120" viewBox="0 0 500 120">
  <path d="M0,120 L0,80 L60,20 L100,60 L150,10 L210,65 L260,25 L320,70 L370,15 L430,60 L480,30 L500,50 L500,120 Z" fill="#26193d"/>
</svg>`);

const CLOUD_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="60" viewBox="0 0 600 60">
  <g fill="#ffffff" opacity="0.12">
    <rect x="30" y="20" width="60" height="10"/>
    <rect x="45" y="10" width="30" height="10"/>
    <rect x="300" y="30" width="80" height="10"/>
    <rect x="320" y="20" width="40" height="10"/>
    <rect x="500" y="15" width="50" height="10"/>
  </g>
</svg>`);

// Two more depth layers — smaller/dimmer/slower far back, bigger/brighter
// nearer the horizon — same blocky-rect pixel-cloud style as CLOUD_SVG,
// just different scale so the sky reads as layered instead of flat.
const CLOUD_FAR_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="36" viewBox="0 0 500 36">
  <g fill="#ffffff" opacity="0.08">
    <rect x="60" y="14" width="40" height="8"/>
    <rect x="72" y="8" width="18" height="8"/>
    <rect x="250" y="18" width="50" height="8"/>
    <rect x="265" y="10" width="24" height="8"/>
    <rect x="420" y="12" width="36" height="8"/>
  </g>
</svg>`);

const CLOUD_NEAR_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="700" height="80" viewBox="0 0 700 80">
  <g fill="#ffffff" opacity="0.16">
    <rect x="40" y="30" width="90" height="14"/>
    <rect x="65" y="16" width="44" height="16"/>
    <rect x="380" y="40" width="110" height="14"/>
    <rect x="410" y="24" width="54" height="18"/>
    <rect x="590" y="34" width="70" height="12"/>
  </g>
</svg>`);

export default function ParallaxBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* sky gradient */}
      <div
        className="absolute inset-0 animate-sun-shift"
        style={{
          background:
            "linear-gradient(180deg, var(--color-sky-top) 0%, var(--color-sky-mid) 45%, var(--color-sky-horizon) 78%, var(--color-sky-horizon) 100%)",
        }}
      />

      {/* matte flowing colour wash — continuous, seamless (alternate loop, no snap-back) */}
      <div className="absolute inset-0" style={{ mixBlendMode: "screen" }}>
        <div
          className="parallax-layer absolute -inset-1/3 animate-flow-a rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--color-flow-a) 0%, transparent 65%)", opacity: 0.55 }}
        />
        <div
          className="parallax-layer absolute -inset-1/3 left-[35%] top-[10%] animate-flow-b rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--color-flow-b) 0%, transparent 65%)", opacity: 0.5 }}
        />
        <div
          className="parallax-layer absolute -inset-1/3 left-[-10%] top-[40%] animate-flow-c rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, var(--color-flow-c) 0%, transparent 65%)", opacity: 0.45 }}
        />
      </div>

      {/* sun */}
      <div
        className="absolute left-1/2 top-[28%] h-40 w-40 -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, var(--color-sun-core) 0%, var(--color-sun) 55%, transparent 75%)",
        }}
      />

      {/* clouds — three depths drifting at different speeds */}
      <div
        className="parallax-layer absolute inset-x-0 top-[3%] h-9 animate-drift-slow opacity-60"
        style={{
          backgroundImage: `url("data:image/svg+xml,${CLOUD_FAR_SVG}")`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "500px 36px",
          width: "200%",
        }}
      />
      <div
        className="parallax-layer absolute inset-x-0 top-[8%] h-16 animate-drift-slow opacity-70"
        style={{
          backgroundImage: `url("data:image/svg+xml,${CLOUD_SVG}")`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "600px 60px",
          width: "200%",
        }}
      />
      <div
        className="parallax-layer absolute inset-x-0 top-[16%] h-20 animate-drift-mid opacity-80"
        style={{
          backgroundImage: `url("data:image/svg+xml,${CLOUD_NEAR_SVG}")`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "700px 80px",
          width: "200%",
        }}
      />

      {/* far mountains */}
      <div
        className="parallax-layer absolute inset-x-0 bottom-[38%] h-36 animate-drift-mid"
        style={{
          backgroundImage: `url("data:image/svg+xml,${MOUNTAIN_FAR_SVG}")`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "400px 140px",
          width: "200%",
        }}
      />

      {/* near mountains */}
      <div
        className="parallax-layer absolute inset-x-0 bottom-[32%] h-32 animate-drift-fast opacity-90"
        style={{
          backgroundImage: `url("data:image/svg+xml,${MOUNTAIN_NEAR_SVG}")`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "500px 120px",
          width: "200%",
        }}
      />

      {/* hills */}
      <div
        className="absolute inset-x-0 bottom-[22%] h-24"
        style={{ background: "var(--color-hill)", clipPath: "polygon(0 100%, 0 40%, 100% 65%, 100% 100%)" }}
      />

      {/* road */}
      <div className="absolute inset-x-0 bottom-0 h-[22%]" style={{ background: "var(--color-road)" }}>
        <div
          className="absolute inset-y-0 left-0 w-full"
          style={{ borderTop: "3px solid var(--color-road-edge)" }}
        />
        <div
          className="parallax-layer absolute left-1/2 top-1/2 h-1.5 w-[220%] -translate-x-1/2 -translate-y-1/2 animate-drift-fast"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--color-road-line) 0px, var(--color-road-line) 40px, transparent 40px, transparent 90px)",
          }}
        />
      </div>

      {/* vignette so foreground UI stays readable */}
      <div className="absolute inset-0" style={{ background: "rgba(11,12,18,0.55)" }} />
    </div>
  );
}
