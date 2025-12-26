
let audioCtx: AudioContext | null = null;
let sirenOsc: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let lfo: OscillatorNode | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const playClickSound = () => {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  // High pitch "blip"
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
};

export const startSiren = () => {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;
  if (sirenOsc) return; // Already playing

  sirenOsc = audioCtx.createOscillator();
  sirenGain = audioCtx.createGain();
  lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();

  // Route: LFO -> LFO Gain -> Siren Frequency
  lfo.connect(lfoGain);
  lfoGain.connect(sirenOsc.frequency);
  
  // Route: Siren -> Siren Gain -> Destination
  sirenOsc.connect(sirenGain);
  sirenGain.connect(audioCtx.destination);

  // Configure LFO (Modulator)
  lfo.type = 'sawtooth';
  lfo.frequency.value = 4; // 4 Hz cycle
  lfoGain.gain.value = 200; // +/- 200Hz modulation

  // Configure Siren (Carrier)
  sirenOsc.type = 'square';
  sirenOsc.frequency.value = 800; // Center frequency
  
  // Volume
  sirenGain.gain.setValueAtTime(0.1, audioCtx.currentTime);

  lfo.start();
  sirenOsc.start();
};

export const stopSiren = () => {
  if (sirenOsc) {
    sirenOsc.stop();
    sirenOsc.disconnect();
    sirenOsc = null;
  }
  if (lfo) {
    lfo.stop();
    lfo.disconnect();
    lfo = null;
  }
  if (sirenGain) {
    sirenGain.disconnect();
    sirenGain = null;
  }
};

export const announce = (text: string, interrupt = false) => {
  if (!window.speechSynthesis) return;
  
  if (window.speechSynthesis.speaking) {
    if (interrupt) {
      window.speechSynthesis.cancel();
    } else {
      return; 
    }
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 0.9;
  
  // Try to find a good "system" voice
  const voices = window.speechSynthesis.getVoices();
  // Prefer Google US English or Microsoft David/Zira
  const preferredVoice = voices.find(v => 
    (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira')) 
    && v.lang.startsWith('en')
  ) || voices[0];
  
  if (preferredVoice) utterance.voice = preferredVoice;
  
  window.speechSynthesis.speak(utterance);
};
