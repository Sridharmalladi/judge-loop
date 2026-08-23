import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "arcade-music-on";

// Warm four-chord loop (Am - F - C - G), an original ambient piece.
// Chords crossfade (fresh voices fade in as the old ones fade out) rather
// than sliding pitch between them — sliding was the source of the harsh,
// "siren-y" sound in the previous version. The arpeggio has rests built in
// so it breathes instead of ticking mechanically.
const CHORDS: { root: number; notes: [number, number, number]; arp: (number | null)[] }[] = [
  { root: 110.0, notes: [220.0, 261.63, 329.63], arp: [329.63, null, 440.0, 261.63, null, 523.25] }, // Am
  { root: 87.31, notes: [174.61, 220.0, 261.63], arp: [261.63, null, 349.23, 220.0, null, 440.0] }, // F
  { root: 65.41, notes: [130.81, 164.81, 196.0], arp: [196.0, null, 261.63, 164.81, null, 329.63] }, // C
  { root: 98.0, notes: [196.0, 246.94, 293.66], arp: [246.94, null, 329.63, 196.0, null, 392.0] }, // G
];

// 10% faster than the original 6s/chord tempo.
const TEMPO_SCALE = 1 / 1.1;
const CHORD_SEC = 6 * TEMPO_SCALE;
const FADE_SEC = 2.2 * TEMPO_SCALE;
const ARP_STEP_SEC = CHORD_SEC / CHORDS[0].arp.length;

interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}

export function useAmbientMelody() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const bedRef = useRef<AudioNode | null>(null);
  const arpVoiceRef = useRef<Voice | null>(null);
  const chordTimerRef = useRef<number | null>(null);
  const arpTimerRef = useRef<number | null>(null);
  const activePadVoicesRef = useRef<Voice[]>([]);

  function ensureGraph(ctx: AudioContext) {
    if (bedRef.current) return;

    const master = ctx.createGain();
    master.gain.value = 0.2; // doubled, previous level was too quiet to notice
    master.connect(ctx.destination);

    // soft, rounded tone — rolls off the buzzy upper harmonics
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 1500;
    warmth.Q.value = 0.3;
    warmth.connect(master);

    // gentle slow-moving shimmer so the pad feels alive, not static
    const shimmerLfo = ctx.createOscillator();
    shimmerLfo.frequency.value = 0.06;
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 260;
    shimmerLfo.connect(shimmerGain);
    shimmerGain.connect(warmth.frequency);
    shimmerLfo.start();

    // light echo for the arpeggio only, kept subtle so it supports instead
    // of smearing into dissonance against the next note
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.45;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.22;
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(warmth);

    bedRef.current = warmth;

    const arpOsc = ctx.createOscillator();
    arpOsc.type = "sine";
    const arpGain = ctx.createGain();
    arpGain.gain.value = 0;
    arpOsc.connect(arpGain);
    arpGain.connect(warmth);
    arpGain.connect(delay);
    arpOsc.start();
    arpVoiceRef.current = { osc: arpOsc, gain: arpGain };
  }

  function crossfadeToChord(ctx: AudioContext, idx: number) {
    const warmth = bedRef.current!;
    const chord = CHORDS[idx % CHORDS.length];
    const now = ctx.currentTime;

    const outgoing = activePadVoicesRef.current;
    activePadVoicesRef.current = [];

    const freqs = [chord.root, ...chord.notes];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      osc.detune.value = i === 0 ? 0 : (i - 2) * 4;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      const peak = i === 0 ? 0.07 : 0.055;
      gain.gain.linearRampToValueAtTime(peak, now + FADE_SEC);
      gain.gain.setValueAtTime(peak, now + CHORD_SEC - FADE_SEC);
      gain.gain.linearRampToValueAtTime(0, now + CHORD_SEC);
      osc.connect(gain);
      gain.connect(warmth);
      osc.start(now);
      osc.stop(now + CHORD_SEC + 0.1);
      activePadVoicesRef.current.push({ osc, gain });
    });

    outgoing.forEach(({ osc }) => {
      try {
        osc.stop(now + FADE_SEC + 0.1);
      } catch {
        // already scheduled to stop
      }
    });
  }

  function playArpStep(ctx: AudioContext, chordIdx: number, step: number) {
    const chord = CHORDS[chordIdx % CHORDS.length];
    const voice = arpVoiceRef.current;
    if (!voice) return;
    const note = chord.arp[step % chord.arp.length];
    const now = ctx.currentTime;
    if (note == null) {
      voice.gain.gain.setTargetAtTime(0, now, 0.15);
      return;
    }
    voice.osc.frequency.setValueAtTime(note, now);
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0.08, now + 0.18);
    voice.gain.gain.exponentialRampToValueAtTime(0.0008, now + ARP_STEP_SEC * 0.95);
  }

  const enable = useCallback(() => {
    if (!ctxRef.current) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
    }
    const ctx = ctxRef.current;
    ensureGraph(ctx);
    ctx.resume();

    let chordIdx = 0;
    let step = 0;
    crossfadeToChord(ctx, chordIdx);
    playArpStep(ctx, chordIdx, step);
    step += 1;

    chordTimerRef.current = window.setInterval(() => {
      chordIdx += 1;
      crossfadeToChord(ctx, chordIdx);
    }, CHORD_SEC * 1000);

    arpTimerRef.current = window.setInterval(() => {
      playArpStep(ctx, chordIdx, step);
      step += 1;
    }, ARP_STEP_SEC * 1000);

    setOn(true);
    localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  const disable = useCallback(() => {
    if (chordTimerRef.current != null) clearInterval(chordTimerRef.current);
    if (arpTimerRef.current != null) clearInterval(arpTimerRef.current);
    chordTimerRef.current = null;
    arpTimerRef.current = null;

    const ctx = ctxRef.current;
    if (ctx) {
      const now = ctx.currentTime;
      activePadVoicesRef.current.forEach((v) => v.gain.gain.setTargetAtTime(0, now, 0.3));
      arpVoiceRef.current?.gain.gain.setTargetAtTime(0, now, 0.1);
      ctx.suspend();
    }

    setOn(false);
    localStorage.setItem(STORAGE_KEY, "0");
  }, []);

  const toggle = useCallback(() => (on ? disable() : enable()), [on, enable, disable]);

  useEffect(() => {
    return () => {
      if (chordTimerRef.current != null) clearInterval(chordTimerRef.current);
      if (arpTimerRef.current != null) clearInterval(arpTimerRef.current);
      activePadVoicesRef.current.forEach(({ osc }) => {
        try {
          osc.stop();
        } catch {
          // already stopped
        }
      });
      try {
        arpVoiceRef.current?.osc.stop();
      } catch {
        // already stopped
      }
      ctxRef.current?.close();
    };
  }, []);

  return { on, toggle };
}
