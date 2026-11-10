// eingabe.js – Tastatur (Pfeile/WASD + Leertaste) und Touch in zwei Arten:
//  „tippen" (Standard): Wo der Finger hindrückt, läuft der Held hin; Finger halten und ziehen = er folgt.
//                       Gehauen wird mit dem runden Knopf rechts unten (großzügige Trefferzone).
//  „stick":  linke Bildschirmhälfte = laufen (der Stick erscheint, wo der Daumen landet),
//            rechte Hälfte = hauen.
// Dazu ein Controller (Gamepad-API, z. B. per Bluetooth am Handy/Tablet): Stick/Steuerkreuz = laufen,
// A oder X = hauen, Start = Pause. In Fenstern wandert man mit Stick/Kreuz von Knopf zu Knopf, A drückt.

const tasten = new Set();
const ANGRIFF = ['Space', 'KeyJ', 'KeyK', 'KeyX', 'KeyL'];
const LAUF = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
const R = 48;        // Stick-Radius in CSS-Pixeln

let neuGedrueckt = false;
const angriffsFinger = new Set();
const stick = { id: null, bx: 0, by: 0, x: 0, y: 0 };
let el = {};
export let touchGeraet = matchMedia('(pointer: coarse)').matches;

let steuerArt = 'tippen';
try { if (localStorage.getItem('halmhauer.steuerung') === 'stick') steuerArt = 'stick'; } catch (e) { /* egal */ }
export function holeSteuerArt() { return steuerArt; }
export function setzeSteuerArt(a) {
  steuerArt = a; eingabe.leeren();
  try { localStorage.setItem('halmhauer.steuerung', a); } catch (e) { /* egal */ }
}

// Tippen-Ziel in Canvas-Pixeln (nicht CSS-Pixeln), solange der Finger liegt
const ziel = { id: null, x: 0, y: 0 };
const KNOPF_ZONE = 78;   // CSS-px um die Mitte des HAUEN-Knopfs, die als Knopf zählt
function aufKnopf(x, y) {
  const r = el.btnA.getBoundingClientRect();
  return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < KNOPF_ZONE;
}
function setzeZiel(e) {
  const f = el.flaeche.width / el.flaeche.clientWidth;
  ziel.x = e.clientX * f; ziel.y = e.clientY * f;
}

export const eingabe = {
  richtung() {
    if (stick.id !== null) {
      let dx = (stick.x - stick.bx) / R, dy = (stick.y - stick.by) / R;
      const m = Math.hypot(dx, dy);
      if (m < 0.18) return { x: 0, y: 0 };
      if (m > 1) { dx /= m; dy /= m; }
      return { x: dx, y: dy };
    }
    if (pad.x || pad.y) return { x: pad.x, y: pad.y };
    const x = (tasten.has('ArrowRight') || tasten.has('KeyD') ? 1 : 0) - (tasten.has('ArrowLeft') || tasten.has('KeyA') ? 1 : 0);
    const y = (tasten.has('ArrowDown') || tasten.has('KeyS') ? 1 : 0) - (tasten.has('ArrowUp') || tasten.has('KeyW') ? 1 : 0);
    const m = Math.hypot(x, y) || 1;
    return { x: x / m, y: y / m };
  },
  get angriff() { return pad.a || angriffsFinger.size > 0 || ANGRIFF.some(k => tasten.has(k)); },
  // Wohin der Finger gerade drückt (Canvas-Pixel) – null, wenn keiner liegt. Rechnet spiel.js in Weltkoordinaten um.
  ziel() { return ziel.id !== null ? { x: ziel.x, y: ziel.y } : null; },
  // Einmal pro Bild abholen
  holeNeu() { const n = neuGedrueckt; neuGedrueckt = false; return n; },
  leeren() { tasten.clear(); angriffsFinger.clear(); stick.id = null; ziel.id = null; neuGedrueckt = false; zeigeStick(); },
};

function zeigeStick() {
  if (!el.stick) return;
  el.stick.classList.toggle('versteckt', !touchGeraet || !el.aktiv() || steuerArt !== 'stick' || padZuletzt);
  if (stick.id === null) {
    el.stick.classList.add('ruhe');
    el.stick.style.left = ''; el.stick.style.top = '';
    el.knauf.style.transform = '';
  } else {
    el.stick.classList.remove('ruhe');
    el.stick.style.left = stick.bx + 'px'; el.stick.style.top = stick.by + 'px';
    let dx = stick.x - stick.bx, dy = stick.y - stick.by;
    const m = Math.hypot(dx, dy);
    if (m > R) { dx *= R / m; dy *= R / m; }
    el.knauf.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  el.btnA.classList.toggle('versteckt', !touchGeraet || !el.aktiv() || padZuletzt);
  el.btnA.classList.toggle('gedrueckt', angriffsFinger.size > 0);
}

export function initEingabe({ flaeche, stickEl, knaufEl, btnA, aktiv, onPause }) {
  el = { flaeche, stick: stickEl, knauf: knaufEl, btnA, aktiv, onPause };
  // Wer wieder den Bildschirm anfasst oder die Maus benutzt, spielt nicht mehr mit dem Controller
  addEventListener('pointerdown', () => { if (padZuletzt) { padZuletzt = false; document.body.classList.remove('pad'); zeigeStick(); } }, true);

  addEventListener('keydown', (e) => {
    if (ANGRIFF.includes(e.code) || LAUF.includes(e.code)) {
      if (!aktiv()) return;          // in Menüs sollen Leertaste & Co. Knöpfe bedienen
      e.preventDefault();
    }
    if (e.repeat) return;
    tasten.add(e.code);
    if (ANGRIFF.includes(e.code)) neuGedrueckt = true;
    if (e.code === 'Escape' || e.code === 'KeyP') onPause();
  });
  addEventListener('keyup', (e) => tasten.delete(e.code));
  addEventListener('blur', () => eingabe.leeren());

  flaeche.addEventListener('pointerdown', (e) => {
    if (!aktiv()) return;
    e.preventDefault();
    if (e.pointerType === 'mouse') {
      if (e.button === 0) { neuGedrueckt = true; angriffsFinger.add(e.pointerId); }
      return;
    }
    if (!touchGeraet) touchGeraet = true;
    // Kann werfen, wenn der Finger schon wieder weg ist – dann eben ohne Capture
    try { flaeche.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
    if (steuerArt === 'tippen') {
      if (aufKnopf(e.clientX, e.clientY)) { angriffsFinger.add(e.pointerId); neuGedrueckt = true; }
      else { ziel.id = e.pointerId; setzeZiel(e); }     // ein zweiter Finger übernimmt das Ziel
    } else if (e.clientX < innerWidth * 0.5 && stick.id === null) {
      stick.id = e.pointerId; stick.bx = stick.x = e.clientX; stick.by = stick.y = e.clientY;
    } else {
      angriffsFinger.add(e.pointerId); neuGedrueckt = true;
    }
    zeigeStick();
  });
  flaeche.addEventListener('pointermove', (e) => {
    if (e.pointerId === ziel.id) { setzeZiel(e); return; }
    if (e.pointerId !== stick.id) return;
    stick.x = e.clientX; stick.y = e.clientY;
    // Stick wandert mit, wenn der Daumen weit über den Rand zieht
    const dx = stick.x - stick.bx, dy = stick.y - stick.by, m = Math.hypot(dx, dy);
    if (m > R * 1.6) { stick.bx = stick.x - dx / m * R * 1.6; stick.by = stick.y - dy / m * R * 1.6; }
    zeigeStick();
  });
  const los = (e) => {
    if (e.pointerId === stick.id) stick.id = null;
    if (e.pointerId === ziel.id) ziel.id = null;
    angriffsFinger.delete(e.pointerId);
    zeigeStick();
  };
  flaeche.addEventListener('pointerup', los);
  flaeche.addEventListener('pointercancel', los);
  flaeche.addEventListener('contextmenu', (e) => e.preventDefault());

  zeigeStick();
  return { aktualisiere: zeigeStick };
}

// ---------- Controller ----------
// Standard-Belegung (navigator.getGamepads, mapping 'standard'): 0 A, 1 B, 2 X, 3 Y, 9 Start,
// 12–15 Steuerkreuz hoch/runter/links/rechts, Achsen 0/1 linker Stick.
// Browser melden einen Controller erst, wenn einmal ein Knopf gedrückt wurde.
const pad = { x: 0, y: 0, a: false, alt: [], richtung: null, wdh: 0, merk: null };
let padZuletzt = false;          // zuletzt mit dem Controller gespielt: Touch-Knöpfe weg, Fokus-Rahmen an
const TOTZONE = 0.28;
export function padVerbunden() {
  return !!(navigator.getGamepads && [...navigator.getGamepads()].some(p => p && p.connected));
}

// Einmal pro Bild aus der Schleife aufrufen (auch wenn ein Fenster offen ist)
export function padAbfragen(dt) {
  const liste = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const p of liste) if (p && p.connected) { gp = p; break; }
  if (!gp) { pad.x = pad.y = 0; pad.a = false; pad.alt = []; return; }
  const jetzt = gp.buttons.map(b => !!b && (b.pressed || b.value > 0.5));
  const neu = (i) => jetzt[i] && !pad.alt[i];
  let x = gp.axes[0] || 0, y = gp.axes[1] || 0;
  if (Math.hypot(x, y) < TOTZONE) x = y = 0;
  if (jetzt[14]) x = -1; if (jetzt[15]) x = 1; if (jetzt[12]) y = -1; if (jetzt[13]) y = 1;
  const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
  if ((m > 0 || jetzt.some(Boolean)) && !padZuletzt) { padZuletzt = true; document.body.classList.add('pad'); zeigeStick(); }

  if (el.aktiv && el.aktiv()) {
    pad.x = x; pad.y = y;
    pad.a = !!(jetzt[0] || jetzt[2]);
    if (neu(0) || neu(2)) neuGedrueckt = true;
    if (neu(9)) el.onPause();
    pad.richtung = null; pad.merk = null;
  } else {
    pad.x = pad.y = 0; pad.a = false;
    if (padZuletzt) menueSteuern(dt, x, y, neu);
  }
  pad.alt = jetzt;
}

// In Fenstern: Fokus von Knopf zu Knopf (räumlich), A klickt, B/Start schließt die Pause
function menueSteuern(dt, x, y, neu) {
  const schichten = [...document.querySelectorAll('.schicht:not(.versteckt)')];
  const schicht = schichten[schichten.length - 1];
  if (!schicht) return;
  const ziele = [...schicht.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent !== null);
  if (!ziele.length) return;
  let akt = ziele.includes(document.activeElement) ? document.activeElement : null;
  const fokus = (b) => {
    if (!b) return;
    b.focus({ preventScroll: true }); b.scrollIntoView({ block: 'center', behavior: 'smooth' }); akt = b;
    const karte = b.closest('[data-id]');
    pad.merk = { id: b.id, karte: karte && karte.dataset.id, schicht: schicht.id };
  };
  // Fokus verloren (z. B. Warenliste nach dem Kauf neu gebaut): gleichen Knopf wiederfinden, sonst den Hauptknopf
  if (!akt) {
    const mk = pad.merk && pad.merk.schicht === schicht.id ? pad.merk : null;
    const wieder = mk && ((mk.id && ziele.find(b => b.id === mk.id)) || (mk.karte && ziele.find(b => { const k = b.closest('[data-id]'); return k && k.dataset.id === mk.karte; })));
    fokus(wieder || ziele.find(b => b.classList.contains('gross')) || ziele[0]);
  }
  // Richtung mit Wiederholung beim Festhalten (erst nach 0,4 s, dann alle 0,14 s)
  let r = null;
  if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) r = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'r' : 'l') : (y > 0 ? 'u' : 'o');
  let springen = false;
  if (r !== pad.richtung) { pad.richtung = r; pad.wdh = 0; springen = !!r; }
  else if (r) { pad.wdh += dt; if (pad.wdh > 0.4) { pad.wdh = 0.26; springen = true; } }
  if (springen && akt) {
    const a = akt.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bestWert = Infinity;
    for (const b of ziele) {
      if (b === akt) continue;
      const q = b.getBoundingClientRect(), dx = q.left + q.width / 2 - ax, dy = q.top + q.height / 2 - ay;
      const entlang = r === 'r' ? dx : r === 'l' ? -dx : r === 'u' ? dy : -dy;
      const quer = r === 'r' || r === 'l' ? Math.abs(dy) : Math.abs(dx);
      if (entlang < 6) continue;
      const wert = entlang + quer * 2.5;
      if (wert < bestWert) { bestWert = wert; best = b; }
    }
    fokus(best);
  }
  if (neu(0) && akt) akt.click();
  if ((neu(1) || neu(9)) && schicht.id === 'pauseSchicht') el.onPause();
}
