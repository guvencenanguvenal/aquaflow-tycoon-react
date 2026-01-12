
let audioCtx: AudioContext | null = null;
let soundEnabled = true;

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

export const setSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
};

export const playSound = (type: 'place' | 'upgrade' | 'water' | 'money' | 'delete') => {
  if (!soundEnabled) return;

  const ctx = getCtx();
  if (!ctx) return;
  
  // Resume if suspended (browser autoplay policy requires user interaction first)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  switch (type) {
    case 'place':
      // Crisp mechanical click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'upgrade':
      // Ascending happy chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      
      // Secondary harmonic
      const oscUp2 = ctx.createOscillator();
      const gainUp2 = ctx.createGain();
      oscUp2.connect(gainUp2);
      gainUp2.connect(ctx.destination);
      oscUp2.type = 'sine';
      oscUp2.frequency.setValueAtTime(880, now);
      oscUp2.frequency.linearRampToValueAtTime(1760, now + 0.1);
      gainUp2.gain.setValueAtTime(0.05, now);
      gainUp2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      oscUp2.start(now);
      oscUp2.stop(now + 0.4);
      break;

    case 'water':
      // Soft bubble/drop sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'money':
      // High pitched coin ding
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      
      // Sparkle overtone
      const oscCoin = ctx.createOscillator();
      const gainCoin = ctx.createGain();
      oscCoin.connect(gainCoin);
      gainCoin.connect(ctx.destination);
      oscCoin.frequency.setValueAtTime(2000, now);
      gainCoin.gain.setValueAtTime(0.05, now);
      gainCoin.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscCoin.start(now);
      oscCoin.stop(now + 0.3);
      break;

    case 'delete':
       // Lower pitched cancel/removal sound
       osc.type = 'sawtooth';
       osc.frequency.setValueAtTime(150, now);
       osc.frequency.linearRampToValueAtTime(80, now + 0.1);
       gain.gain.setValueAtTime(0.1, now);
       gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
       osc.start(now);
       osc.stop(now + 0.15);
       break;
  }
};
