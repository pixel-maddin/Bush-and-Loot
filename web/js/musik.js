// musik.js – Hintergrundmusik, live erzeugt wie die Geräusche (keine Tondatei).
// Vier eigene kleine Stücke: „tag" (flott, D-Dur), „abend" (ruhig, h-Moll, ab 72 % des Tages),
// „haus" (Spieluhr-Walzer im Baumstumpf) und „kampf" (a-Moll, in den Kammern der Glitzerhöhle).
// Alle selbst geschrieben, nichts nachgespielt.
//
// Schreibweise der Stimmen: ein Takt pro Zeichenkette, ein Eintrag pro Achtel.
//   'D5' = Ton anschlagen   '-' = vorigen Ton halten   '.' = Pause
// Akkorde: Grundton zuerst, daraus entstehen Bass und Begleitung von selbst.

import { tonKontext, istStumm, beiStummWechsel } from './ton.js';

const STUECKE = {
  tag: {
    bpm: 132, takt: 8, lead: 'puls25', laut: 1,
    akkorde: ['D F# A', 'B D F#', 'G B D', 'A C# E', 'D F# A', 'B D F#', 'G B D', 'D F# A',
              'G B D', 'A C# E', 'F# A C#', 'B D F#', 'G B D', 'A C# E', 'E G B', 'A C# E'],
    melodie: [
      'A4 D5 F#5 - E5 D5 E5 -',   'F#5 - D5 - B4 - - .',
      'B4 D5 G5 - F#5 E5 D5 -',   'E5 - C#5 - A4 - - .',
      'A4 D5 F#5 - A5 - F#5 -',   'G5 F#5 E5 - D5 - B4 -',
      'B4 C#5 D5 - E5 - G5 -',    'F#5 - E5 - D5 - - .',
      'D5 - B4 D5 G5 - - .',      'E5 - C#5 E5 A5 - - .',
      'F#5 E5 C#5 - A4 - C#5 -',  'D5 - F#5 - B5 - - .',
      'B5 A5 G5 - D5 - G5 -',     'A5 G5 F#5 - E5 - C#5 -',
      'B4 - E5 - G5 - E5 -',      'A5 - - - G5 F#5 E5 C#5',
    ],
  },
  abend: {
    bpm: 100, takt: 8, lead: 'dreieck', laut: 1,
    akkorde: ['B D F#', 'G B D', 'D F# A', 'A C# E', 'B D F#', 'G B D', 'E G B', 'F# A# C#'],
    melodie: [
      'F#5 - - - D5 - B4 -',  'D5 - - - B4 - G4 -',
      'A4 - D5 - F#5 - A5 -', 'G5 - F#5 - E5 - - -',
      'F#5 - - - B5 - A5 -',  'G5 - F#5 - D5 - B4 -',
      'E5 - G5 - F#5 - E5 -', 'C#5 - - - A#4 - - -',
    ],
  },
  kampf: {
    bpm: 150, takt: 8, lead: 'puls25', laut: 1,
    akkorde: ['A C E', 'A C E', 'F A C', 'G B D', 'A C E', 'A C E', 'E G# B', 'E G# B'],
    melodie: [
      'A4 . A4 C5 E5 - D5 C5', 'B4 - A4 - E4 - - .',
      'F4 A4 C5 - F5 - E5 D5', 'D5 - B4 - G4 - B4 -',
      'A4 . A4 C5 E5 - A5 -',  'G5 F5 E5 - D5 C5 B4 -',
      'G#4 - B4 - E5 - D5 -',  'C5 - B4 - G#4 - E4 -',
    ],
  },
  haus: {
    bpm: 112, takt: 6, lead: 'spieluhr', laut: 0.9,
    akkorde: ['F A C', 'C E G', 'D F A', 'Bb D F', 'F A C', 'C E G', 'Bb D F', 'F A C'],
    melodie: [
      'A4 - C5 - F5 -', 'E5 - D5 - C5 -',
      'D5 - F5 - A5 -', 'G5 - - - F5 -',
      'A5 - G5 - F5 -', 'E5 - G5 - C5 -',
      'D5 - C5 - Bb4 -', 'F5 - - - - .',
    ],
  },
};

// ---------- Noten ----------
const STUFE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(name, oktave) {
  let n = STUFE[name[0]];
  for (const z of name.slice(1)) { if (z === '#') n++; else if (z === 'b') n--; }
  return 12 * (oktave + 1) + n;
}
function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function tonHz(t) {           // 'F#5' → Frequenz
  const o = parseInt(t.slice(-1), 10);
  return hz(midi(t.slice(0, -1), o));
}

// Takte in Ereignisse zerlegen: [{schritt, hz, laenge}] pro Takt
function zerlege(takte) {
  return takte.map(zeile => {
    const t = zeile.trim().split(/\s+/), aus = [];
    t.forEach((x, i) => {
      if (x === '-' || x === '.') return;
      let l = 1; while (t[i + l] === '-') l++;
      aus.push({ schritt: i, hz: tonHz(x), laenge: l });
    });
    return aus;
  });
}
for (const s of Object.values(STUECKE)) {
  s.noten = zerlege(s.melodie);
  s.akk = s.akkorde.map(a => {
    const teile = a.split(' ');
    const grund = midi(teile[0], 2);
    // Akkordtöne aufsteigend ab Oktave 4
    let letzter = 0;
    const toene = teile.map((n, i) => {
      let m = midi(n, 4);
      if (i === 0) { while (m > 64) m -= 12; } else { while (m <= letzter) m += 12; }
      letzter = m; return m;
    });
    return { grund, toene };
  });
}

// ---------- Instrumente ----------
let ac = null, bus = null, rausch = null;
const wellen = {};

function pulsWelle(tast) {        // Rechteck mit schmalem Tastverhältnis = typischer Chip-Klang
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * tast);
  return ac.createPeriodicWave(re, im);
}

function stimme(ziel, typ, f, t, dauer, laut, ausklang = 0.06) {
  const o = ac.createOscillator(), g = ac.createGain();
  if (wellen[typ]) o.setPeriodicWave(wellen[typ]); else o.type = typ;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(laut, t + 0.008);
  g.gain.setValueAtTime(laut, t + Math.max(0.01, dauer - ausklang));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  o.connect(g); g.connect(ziel);
  o.start(t); o.stop(t + dauer + 0.02);
}

function glocke(ziel, f, t, dauer, laut) {   // Spieluhr: Sinus + leiser Oberton, klingt frei aus
  for (const [mal, l] of [[1, 1], [2, 0.35], [3, 0.12]]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * mal, t);
    g.gain.setValueAtTime(laut * l, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer * (mal === 1 ? 1 : 0.5));
    o.connect(g); g.connect(ziel);
    o.start(t); o.stop(t + dauer + 0.02);
  }
}

function trommel(ziel, art, t) {
  if (art === 'kick') {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.42, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(ziel); o.start(t); o.stop(t + 0.18);
    return;
  }
  const s = ac.createBufferSource(); s.buffer = rausch;
  const fi = ac.createBiquadFilter(); fi.type = 'highpass';
  fi.frequency.value = art === 'hat' ? 7000 : 1600;
  const g = ac.createGain(), d = art === 'hat' ? 0.03 : 0.11;
  g.gain.setValueAtTime(art === 'hat' ? 0.05 : 0.11, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fi); fi.connect(g); g.connect(ziel);
  s.start(t, Math.random() * 0.4); s.stop(t + d + 0.02);
}

// ---------- Ein Achtel spielen ----------
function spieleSchritt(st, ziel, takt, schritt, t, sd, runde) {
  const a = st.akk[takt];
  const n = st.noten[takt];

  // Melodie
  for (const e of n) {
    if (e.schritt !== schritt) continue;
    const d = e.laenge * sd;
    if (st.lead === 'puls25') stimme(ziel, runde % 2 ? 'puls12' : 'puls25', e.hz, t, d * 0.92, 0.075);
    else if (st.lead === 'dreieck') { stimme(ziel, 'triangle', e.hz, t, d * 0.95, 0.2, 0.15); stimme(ziel, 'puls12', e.hz * 2, t, d * 0.6, 0.012); }
    else glocke(ziel, e.hz, t, Math.max(0.6, d * 1.3), 0.16);
  }

  if (st === STUECKE.tag) {
    // Bass: Grundton im Oktavsprung, Begleitung leise auf den Nachschlägen
    if (schritt % 2 === 0) stimme(ziel, 'triangle', hz(a.grund + (schritt % 4 ? 12 : 0)), t, sd * 0.9, 0.22);
    if (schritt % 2 === 1) stimme(ziel, 'puls12', hz(a.toene[(schritt >> 1) % 2 + 1]), t, sd * 0.5, 0.022);
    trommel(ziel, 'hat', t);
    if (schritt === 0 || schritt === 4 || (schritt === 7 && takt % 4 === 3)) trommel(ziel, 'kick', t);
    if (schritt === 2 || schritt === 6) trommel(ziel, 'snare', t);
  } else if (st === STUECKE.kampf) {
    // Treibender Achtelbass, Kick auf 1, 4 und 5, Snare auf 3 und 7
    stimme(ziel, 'triangle', hz(a.grund + (schritt % 2 ? 12 : 0)), t, sd * 0.85, 0.24);
    if (schritt % 2 === 1) stimme(ziel, 'puls12', hz(a.toene[2] + 12), t, sd * 0.4, 0.02);
    trommel(ziel, 'hat', t);
    if (schritt === 0 || schritt === 3 || schritt === 4) trommel(ziel, 'kick', t);
    if (schritt === 2 || schritt === 6) trommel(ziel, 'snare', t);
  } else if (st === STUECKE.abend) {
    if (schritt === 0) stimme(ziel, 'triangle', hz(a.grund), t, sd * 7.5, 0.2, 0.4);
    // Gebrochener Akkord auf und ab
    const folge = [0, 1, 2, 1, 0, 1, 2, 1];
    stimme(ziel, 'puls12', hz(a.toene[folge[schritt]] + 12), t, sd * 0.8, 0.018);
    if (schritt === 4) trommel(ziel, 'hat', t);
  } else {
    // Walzer: Bass auf 1, Akkord auf 2 und 3
    if (schritt === 0) stimme(ziel, 'triangle', hz(a.grund + 12), t, sd * 1.8, 0.2, 0.2);
    if (schritt === 2 || schritt === 4) for (const m of a.toene) glocke(ziel, hz(m), t, 0.35, 0.03);
  }
}

// ---------- Ablauf ----------
const VORLAUF = 0.15;      // so weit im Voraus wird geplant (s)
let laufend = null;        // { st, name, gain, takt, schritt, naechste, runde }
let gewuenscht = null, gedrueckt = false, an = true, uhr = null;
try { an = localStorage.getItem('halmhauer.musik') !== '0'; } catch (e) { /* egal */ }

// Gemessen (RMS am Hauptregler): Musik bei 0.18 ≈ 0.013, Kauf-Jingle ≈ 0.010 – Geräusche bleiben hörbar
function lautSoll() { return istStumm() || !an ? 0 : (gedrueckt ? 0.06 : 0.18); }

function planen() {
  if (!laufend || !ac || ac.state !== 'running') return;
  const L = laufend, st = L.st, sd = 60 / st.bpm / 2;
  // Hing die Uhr (Tab im Hintergrund), nicht alles nachholen, sondern neu ansetzen
  if (L.naechste < ac.currentTime - 0.05) L.naechste = ac.currentTime + 0.05;
  while (L.naechste < ac.currentTime + VORLAUF) {
    spieleSchritt(st, L.gain, L.takt, L.schritt, L.naechste, sd, L.runde);
    L.naechste += sd;
    if (++L.schritt >= st.takt) {
      L.schritt = 0;
      if (++L.takt >= st.akk.length) { L.takt = 0; L.runde++; }
    }
  }
}

function bereit() {
  if (ac) return true;
  const k = tonKontext();
  if (!k) return false;
  ac = k.ac; rausch = k.rausch;
  wellen.puls25 = pulsWelle(0.25);
  wellen.puls12 = pulsWelle(0.125);
  bus = ac.createGain(); bus.gain.value = lautSoll(); bus.connect(k.haupt);
  uhr = setInterval(planen, 30);
  return true;
}

function wechsle(name) {
  const t = ac.currentTime;
  if (laufend) {
    // Altes Stück ausblenden; was schon geplant ist, klingt darunter aus
    const g = laufend.gain;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 0.6);
    setTimeout(() => g.disconnect(), 1500);
    laufend = null;
  }
  if (!name) return;
  const st = STUECKE[name];
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(st.laut, t + 0.4);
  gain.connect(bus);
  laufend = { st, name, gain, takt: 0, schritt: 0, naechste: t + 0.08, runde: 0 };
  planen();
}

function lautNachstellen() {
  if (!bus) return;
  const t = ac.currentTime;
  bus.gain.cancelScheduledValues(t);
  bus.gain.setValueAtTime(bus.gain.value, t);
  bus.gain.linearRampToValueAtTime(lautSoll(), t + 0.25);
}
beiStummWechsel(lautNachstellen);

// Jedes Bild aufrufen: welches Stück gerade passt (null = Stille), und ob gedämpft (Pause)
export function musikWaehle(name, leise = false) {
  if (!bereit()) return;
  if (leise !== gedrueckt) { gedrueckt = leise; lautNachstellen(); }
  if (name === gewuenscht) return;
  gewuenscht = name;
  wechsle(name);
}

export function istMusikAn() { return an; }
export function setzeMusik(ja) {
  an = ja;
  try { localStorage.setItem('halmhauer.musik', ja ? '1' : '0'); } catch (e) { /* egal */ }
  lautNachstellen();
}

// Nur für Tests: welches Stück gerade läuft
export function musikStand() { return laufend ? { name: laufend.name, takt: laufend.takt, laut: lautSoll() } : null; }
