// eingabe.js – Tastatur (Pfeile/WASD + Leertaste) und Touch in zwei Arten:
//  „tippen" (Standard): Wo der Finger hindrückt, läuft der Held hin; Finger halten und ziehen = er folgt.
//                       Gehauen wird mit dem runden Knopf rechts unten (großzügige Trefferzone).
//  „stick":  linke Bildschirmhälfte = laufen (der Stick erscheint, wo der Daumen landet),
//            rechte Hälfte = hauen.

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
    const x = (tasten.has('ArrowRight') || tasten.has('KeyD') ? 1 : 0) - (tasten.has('ArrowLeft') || tasten.has('KeyA') ? 1 : 0);
    const y = (tasten.has('ArrowDown') || tasten.has('KeyS') ? 1 : 0) - (tasten.has('ArrowUp') || tasten.has('KeyW') ? 1 : 0);
    const m = Math.hypot(x, y) || 1;
    return { x: x / m, y: y / m };
  },
  get angriff() { return angriffsFinger.size > 0 || ANGRIFF.some(k => tasten.has(k)); },
  // Wohin der Finger gerade drückt (Canvas-Pixel) – null, wenn keiner liegt. Rechnet spiel.js in Weltkoordinaten um.
  ziel() { return ziel.id !== null ? { x: ziel.x, y: ziel.y } : null; },
  // Einmal pro Bild abholen
  holeNeu() { const n = neuGedrueckt; neuGedrueckt = false; return n; },
  leeren() { tasten.clear(); angriffsFinger.clear(); stick.id = null; ziel.id = null; neuGedrueckt = false; zeigeStick(); },
};

function zeigeStick() {
  if (!el.stick) return;
  el.stick.classList.toggle('versteckt', !touchGeraet || !el.aktiv() || steuerArt !== 'stick');
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
  el.btnA.classList.toggle('versteckt', !touchGeraet || !el.aktiv());
  el.btnA.classList.toggle('gedrueckt', angriffsFinger.size > 0);
}

export function initEingabe({ flaeche, stickEl, knaufEl, btnA, aktiv, onPause }) {
  el = { flaeche, stick: stickEl, knauf: knaufEl, btnA, aktiv };

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
