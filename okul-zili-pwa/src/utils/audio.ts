/**
 * Realistic school bell chime synthesizer using Web Audio API
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSchoolBell(enabled = true): void {
  if (!enabled) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Classic school bell 4-note chime (E5, C5, D5, G4)
    const tones = [
      { freq: 659.25, time: 0.0, dur: 0.45 },
      { freq: 523.25, time: 0.38, dur: 0.45 },
      { freq: 587.33, time: 0.75, dur: 0.45 },
      { freq: 392.00, time: 1.15, dur: 1.10 },
    ];

    tones.forEach(({ freq, time, dur }) => {
      // Primary chime oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Subtle harmonic overtone for metallic bell resonance
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.28, now + time);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, now + time);

      overtoneGain.gain.setValueAtTime(0.08, now + time);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur * 0.6);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      gain.connect(ctx.destination);
      overtoneGain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur + 0.1);

      overtone.start(now + time);
      overtone.stop(now + time + dur * 0.6 + 0.1);
    });
  } catch (err) {
    console.warn('Web Audio ses çalınamadı:', err);
  }
}
