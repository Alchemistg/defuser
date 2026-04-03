let audioContext: AudioContext | null = null;

const getContext = () => {
  if (audioContext) {
    return audioContext;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) {
    return null;
  }
  audioContext = new Ctx();
  return audioContext;
};

const playTone = (frequency: number, durationMs: number, type: OscillatorType, gainValue: number) => {
  const ctx = getContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;
  oscillator.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

  oscillator.start(now);
  oscillator.stop(now + durationMs / 1000);
};

export const playClick = () => {
  playTone(520, 70, 'square', 0.08);
};

export const playZip = () => {
  playTone(740, 80, 'sawtooth', 0.06);
  setTimeout(() => playTone(420, 60, 'square', 0.04), 50);
};

export const playToggle = () => {
  playTone(420, 90, 'triangle', 0.06);
};

export const playHold = () => {
  playTone(300, 140, 'square', 0.05);
};

export const playError = () => {
  playTone(180, 220, 'sawtooth', 0.12);
};

export const playSuccess = () => {
  playTone(660, 140, 'triangle', 0.1);
  setTimeout(() => playTone(880, 140, 'triangle', 0.08), 90);
};
