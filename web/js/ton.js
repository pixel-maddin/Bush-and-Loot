// ton.js – Kleine Geräusche, live erzeugt (keine Tondateien).
// Der Browser erlaubt Ton erst nach einer Berührung: tonStart() hängt am Start-Knopf.

let ac = null, haupt = null, rausch = null, stumm = false;
try { stumm = localStorage.getItem('halmhauer.stumm') === '1'; } catch (e) { /* egal */ }

export function tonStart() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      haupt = ac.createGain(); haupt.gain.value = 0.5; haupt.connect(ac.destination);
      const n = Math.floor(ac.sampleRate * 0.6);
      rausch = ac.createBuffer(1, n, ac.sampleRate);
      const d = rausch.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) { ac = null; }
}

// Wettergeräusch im Hintergrund: Regenrauschen oder heulender Wind (null = still)
let wetterArt = null, wetterKnoten = null;
export function wetterTon(art) {
  if (stumm) art = null;
  if (!ac || art === wetterArt) return;
  wetterArt = art;
  const t = ac.currentTime;
  if (wetterKnoten) {
    const alt = wetterKnoten;
    alt.g.gain.cancelScheduledValues(t); alt.g.gain.setValueAtTime(alt.g.gain.value, t); alt.g.gain.linearRampToValueAtTime(0, t + 1);
    setTimeout(() => { try { alt.q.stop(); alt.lfo && alt.lfo.stop(); } catch (e) { /* egal */ } }, 1200);
    wetterKnoten = null;
  }
  if (!art) return;
  const q = ac.createBufferSource(); q.buffer = rausch; q.loop = true;
  const fi = ac.createBiquadFilter(), g = ac.createGain();
  let lfo = null;
  if (art === 'regen') { fi.type = 'bandpass'; fi.frequency.value = 2600; fi.Q.value = 0.4; }
  else {
    fi.type = 'bandpass'; fi.frequency.value = 420; fi.Q.value = 1.1;
    lfo = ac.createOscillator(); const tiefe = ac.createGain();
    lfo.frequency.value = 0.18; tiefe.gain.value = 180; lfo.connect(tiefe); tiefe.connect(fi.frequency); lfo.start();
  }
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(art === 'regen' ? 0.05 : 0.07, t + 1.5);
  q.connect(fi); fi.connect(g); g.connect(haupt); q.start();
  wetterKnoten = { q, g, lfo };
}

// Wer die App verlässt, soll nichts mehr hören (sonst dudelt die Musik im Hintergrund weiter)
export function tonSchlafen(ja) {
  if (!ac) return;
  try { ja ? ac.suspend() : ac.resume(); } catch (e) { /* egal */ }
}

// Für musik.js: denselben Kontext und dasselbe Rauschen mitbenutzen
export function tonKontext() { return ac ? { ac, haupt, rausch } : null; }

const beimUmschalten = [];
export function beiStummWechsel(f) { beimUmschalten.push(f); }

export function istStumm() { return stumm; }
export function setzeStumm(s) {
  stumm = s;
  try { localStorage.setItem('halmhauer.stumm', s ? '1' : '0'); } catch (e) { /* egal */ }
  beimUmschalten.forEach(f => f());
}

function ton(f, f2, dauer, typ = 'square', laut = 0.15, verz = 0) {
  if (!ac || stumm) return;
  const t = ac.currentTime + verz;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = typ;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dauer);
  g.gain.setValueAtTime(laut, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dauer);
  o.connect(g); g.connect(haupt);
  o.start(t); o.stop(t + dauer + 0.02);
}

function rauschen(dauer, laut, ftyp, f, f2, verz = 0) {
  if (!ac || stumm) return;
  const t = ac.currentTime + verz;
  const s = ac.createBufferSource(); s.buffer = rausch;
  const fi = ac.createBiquadFilter(); fi.type = ftyp; fi.Q.value = 1.2;
  fi.frequency.setValueAtTime(f, t);
  if (f2) fi.frequency.exponentialRampToValueAtTime(f2, t + dauer);
  const g = ac.createGain();
  g.gain.setValueAtTime(laut, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dauer);
  s.connect(fi); fi.connect(g); g.connect(haupt);
  s.start(t, Math.random() * 0.4); s.stop(t + dauer + 0.02);
}

// Gleiche Geräusche nicht zigmal im selben Augenblick abspielen
const zuletzt = {};
function selten(name, ms) {
  const n = performance.now();
  if (n - (zuletzt[name] || 0) < ms) return false;
  zuletzt[name] = n; return true;
}

export const SFX = {
  schwung() { rauschen(0.12, 0.22, 'bandpass', 1800, 600); },
  wirbel() { rauschen(0.38, 0.3, 'bandpass', 500, 3200); ton(300, 900, 0.3, 'triangle', 0.08); },
  schnitt() { if (selten('schnitt', 35)) rauschen(0.07, 0.22, 'highpass', 3000, 6500); },
  tock() { if (selten('tock', 40)) ton(190, 120, 0.06, 'square', 0.07); },
  stein(i) {
    if (!selten('stein', 45)) return;
    const b = [880, 988, 1175, 1319, 1568][i] || 880;
    ton(b, null, 0.07, 'square', 0.06); ton(b * 1.5, null, 0.14, 'square', 0.06, 0.06);
    if (i >= 3) ton(b * 2, null, 0.2, 'triangle', 0.07, 0.12);
  },
  herz() { ton(523, null, 0.08, 'triangle', 0.15); ton(784, null, 0.16, 'triangle', 0.15, 0.08); },
  gegnerTreffer() { ton(420, 150, 0.1, 'square', 0.1); },
  gegnerWeg() { rauschen(0.25, 0.22, 'lowpass', 1400, 200); ton(620, 200, 0.2, 'triangle', 0.1); },
  aua() { ton(330, 90, 0.3, 'sawtooth', 0.16); },
  kauf() { [523, 659, 784, 1047].forEach((f, i) => ton(f, null, 0.12, 'square', 0.07, i * 0.07)); },
  nein() { ton(160, 120, 0.15, 'square', 0.08); },
  tuer() { ton(200, 320, 0.12, 'triangle', 0.15); ton(320, 240, 0.1, 'triangle', 0.1, 0.1); },
  abend() { [784, 659, 523, 392].forEach((f, i) => ton(f, null, 0.3, 'triangle', 0.12, i * 0.2)); },
  morgen() { [392, 523, 659, 784, 1047].forEach((f, i) => ton(f, null, 0.18, 'triangle', 0.1, i * 0.1)); },
  ohnmacht() { [392, 330, 262, 196].forEach((f, i) => ton(f, f * 0.95, 0.3, 'square', 0.08, i * 0.22)); },
  plopp() { if (selten('plopp', 60)) ton(500, 900, 0.08, 'sine', 0.15); },
  geladen() { ton(900, 1400, 0.1, 'sine', 0.1); },
  summen() { if (selten('summen', 400)) ton(170, 185, 0.3, 'sawtooth', 0.025); },
  // Begleiter
  schnueffeln() { for (let i = 0; i < 3; i++) rauschen(0.06, 0.12, 'bandpass', 2200, 1600, i * 0.12); },
  wuff() { ton(260, 150, 0.12, 'sawtooth', 0.12); rauschen(0.1, 0.15, 'bandpass', 900, 500); ton(240, 140, 0.1, 'sawtooth', 0.1, 0.16); },
  miau() {
    if (!ac || stumm) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(560, t); o.frequency.linearRampToValueAtTime(880, t + 0.15); o.frequency.linearRampToValueAtTime(520, t + 0.45);
    g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.14, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g); g.connect(haupt); o.start(t); o.stop(t + 0.52);
  },
  // Glitzerhöhle
  warnung() { ton(520, 780, 0.18, 'square', 0.07); ton(520, 780, 0.18, 'square', 0.05, 0.2); },
  ansturm() { rauschen(0.35, 0.25, 'bandpass', 300, 1400); ton(110, 70, 0.3, 'sawtooth', 0.08); },
  stampfen() { ton(90, 35, 0.35, 'sine', 0.45); rauschen(0.3, 0.3, 'lowpass', 900, 120); },
  bossTreffer() { if (selten('bossTreffer', 50)) { ton(260, 110, 0.12, 'square', 0.11); rauschen(0.08, 0.15, 'highpass', 2000, 4000); } },
  bossWeg() {
    [440, 392, 330, 262, 196, 131].forEach((f, i) => ton(f, f * 0.9, 0.25, 'square', 0.08, i * 0.16));
    rauschen(1.2, 0.3, 'lowpass', 2400, 100, 0.2);
  },
  kling() { if (selten('kling', 60)) { ton(1600, 1400, 0.12, 'triangle', 0.1); ton(2400, null, 0.08, 'sine', 0.05); } },
  werfen() { rauschen(0.25, 0.2, 'bandpass', 600, 2000); },
  quak() {
    if (!ac || stumm) return;
    for (const [v, f] of [[0, 1], [0.16, 0.9]]) ton(330 * f, 210 * f, 0.18, 'sawtooth', 0.14, v);
    rauschen(0.2, 0.15, 'bandpass', 900, 500);
  },
  fluegel() { for (let i = 0; i < 3; i++) rauschen(0.12, 0.28, 'lowpass', 700, 150, i * 0.14); ton(90, 60, 0.4, 'sine', 0.2); },
  tuerAuf() { ton(70, 50, 0.7, 'sawtooth', 0.09); rauschen(0.8, 0.25, 'lowpass', 500, 80); },
  sieg() {
    [523, 659, 784, 1047].forEach((f, i) => ton(f, null, 0.14, 'square', 0.08, i * 0.1));
    [523, 659, 784].forEach(f => ton(f * 2, null, 0.9, 'triangle', 0.08, 0.45));
  },
};
