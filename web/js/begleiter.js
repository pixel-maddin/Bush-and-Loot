// begleiter.js – Hund oder Katze, die dem Helden hinterherlaufen und ab und zu einen Diamanten ausbuddeln.
// Gekauft wird einmal im Laden (die Wahl gilt für immer), „Leckerli“ (S.st.leckerli, 0–3) lässt das Tier
// öfter buddeln und bessere Farben finden. Bilder werden wie überall aus Code gemalt.

import { G, PB, spiegeln } from './grafik.js';
import { SFX } from './ton.js';
import { S, bewege, wirfStein, waehleStein, splitter, text } from './spiel.js';

export const BEGLEITER_PREIS = 200;
export const LECKERLI_KOSTEN = [150, 500, 1500];

// Rassen: Farben + kleine Formunterschiede
export const RASSEN = {
  hund: {
    dackel:  { name: 'Dackel',      a: '#a5612b', A: '#6e3a16', w: '#cf9356', ohr: 'schlapp', schwanz: 'kurz',  lang: true },
    spitz:   { name: 'Spitz',       a: '#f4ede0', A: '#cbbd9e', w: '#ffffff', ohr: 'spitz',   schwanz: 'ringel' },
    schaefer:{ name: 'Schäferhund', a: '#c88a44', A: '#2a2220', w: '#e6b878', ohr: 'spitz',   schwanz: 'lang', sattel: true },
  },
  katze: {
    tiger:   { name: 'Tigerkatze',    a: '#e8913a', A: '#a8561a', w: '#f8d8a8', streifen: true },
    schwarz: { name: 'Schwarze Katze', a: '#34313c', A: '#1a1820', w: '#55505f', augen: '#ffd23f' },
    glueck:  { name: 'Glückskatze',   a: '#f6f0e6', A: '#cfc6b6', w: '#ffffff', flecken: true },
  },
};

// ---------- Bilder ----------
// Blick nach links. Posen: steh, lauf0, lauf1, sitz, buddel0, buddel1
function tierBild(art, r, pose) {
  const pb = new PB(20, 15);
  const katze = art === 'katze';
  const lang = r.lang ? 2 : 0;
  const sitz = pose === 'sitz', buddel = pose.startsWith('buddel');
  const fx = sitz ? 2 : 0;                        // beim Sitzen rutscht der Körper nach hinten unten
  // Beine
  const bein = (x, y0, h) => pb.rechteck(x, y0, 2, h, r.A);
  if (sitz) { bein(5, 9, 5); bein(7, 9, 5); pb.rechteck(10, 11, 5, 3, r.a); }
  else {
    const l = pose === 'lauf0' ? [-1, 1] : pose === 'lauf1' ? [1, -1] : buddel ? (pose === 'buddel0' ? [-1, 0] : [0, -1]) : [0, 0];
    bein(5 + l[0], 10, 4); bein(7 - l[0], 10, 4); bein(12 + lang + l[1], 10, 4); bein(14 + lang - l[1], 10, 4);
  }
  // Körper
  const by = sitz ? 9 : 8;
  for (let x = 6 + fx; x <= 14 + lang; x += 1) pb.kreis(x, by, sitz ? 3.4 : 2.9, (xx, yy, nx, ny) => (ny > 0.35 ? r.w : r.a));
  if (r.sattel) for (let x = 8; x <= 14; x++) { pb.set(x, by - 2, r.A); pb.set(x, by - 1, r.A); }
  if (r.streifen) for (const x of [8, 11, 14]) for (let y = by - 2; y <= by + 1; y++) pb.set(x, y, r.A);
  if (r.flecken) { pb.kreis(12, by - 1, 1.8, '#e8913a'); pb.kreis(8, by - 1, 1.4, '#34313c'); }
  // Schwanz
  const sx = 16 + lang, sy = by - 1;
  if (r.schwanz === 'ringel') { pb.kreis(sx + 1, sy - 2, 2, r.a); pb.set(sx + 1, sy - 2, r.A); }
  else if (r.schwanz === 'kurz') { pb.set(sx, sy, r.A); pb.set(sx + 1, sy - 1, r.A); }
  else {
    const n = katze ? 6 : 4;
    for (let i = 0; i < n; i++) pb.set(sx + Math.min(i, 2), sy - i, katze && r.streifen && i % 2 ? r.A : r.a);
  }
  // Kopf (beim Buddeln tiefer)
  const hx = 4, hy = buddel ? 8 : sitz ? 5 : 5;
  pb.kreis(hx, hy, katze ? 3.1 : 3.3, (xx, yy, nx, ny) => (ny > 0.4 && nx < 0.2 ? r.w : r.a));
  if (!katze) { pb.rechteck(hx - 4, hy, 3, 2, r.w); pb.set(hx - 4, hy, '#2b1d16'); }     // Schnauze + Nase
  else { pb.set(hx - 3, hy + 1, '#e8828a'); }
  pb.set(hx - 1, hy - 1, r.augen || '#1e1b30');
  if (r.augen) pb.set(hx - 1, hy - 2, '#1e1b30');
  // Ohren
  if (r.ohr === 'schlapp') { pb.set(hx + 1, hy - 2, r.A); pb.set(hx + 2, hy - 1, r.A); pb.set(hx + 2, hy, r.A); pb.set(hx + 2, hy + 1, r.A); }
  else if (!katze) { pb.set(hx - 1, hy - 4, r.A); pb.set(hx - 1, hy - 3, r.a); pb.set(hx + 2, hy - 4, r.A); pb.set(hx + 2, hy - 3, r.a); }
  if (katze) {                                     // Katzenohren: zwei Dreiecke
    pb.set(hx - 2, hy - 4, r.A); pb.set(hx - 2, hy - 3, r.a); pb.set(hx - 1, hy - 3, r.a); pb.set(hx + 1, hy - 4, r.A); pb.set(hx + 1, hy - 3, r.a); pb.set(hx + 2, hy - 3, r.a); }
  return pb.umriss('#2b1d16').bild();
}

const POSEN = ['steh', 'lauf0', 'lauf1', 'sitz', 'buddel0', 'buddel1'];
const cache = {};
export function tierBilder(art, rasse) {
  const key = art + '-' + rasse;
  if (!cache[key]) {
    const r = RASSEN[art][rasse], l = {};
    for (const p of POSEN) l[p] = tierBild(art, r, p);
    const re = {};
    for (const p of POSEN) re[p] = spiegeln(l[p]);
    cache[key] = { l, r: re };
  }
  return cache[key];
}

// ---------- Verhalten ----------
function naechstesBuddeln() {
  const lv = S.st.leckerli | 0;
  return (20 + Math.random() * 12) / (1 + 0.5 * lv);
}

function neuesTier() {
  const p = S.sp;
  return { x: p.x + 12, y: p.y + 4, links: true, zustand: 'folgen', t: 0, anim: 0, buddelT: 6 + Math.random() * 6, stillT: 0, haengt: 0 };
}

// Platz schräg hinter und neben dem Helden (direkt dahinter säße das Tier auf seinem Kopf)
function platz(p) {
  const bx = -Math.cos(p.winkel), by = -Math.sin(p.winkel), sx = -by, sy = bx;
  return { x: p.x + bx * 14 + sx * 10, y: p.y + by * 6 + sy * 4 + 2 };
}

export function begleiterUpdate(dt) {
  if (!S.begleiter || S.ort !== 'wald') return;
  if (!S.tier) S.tier = neuesTier();
  const b = S.tier, p = S.sp;
  b.anim += dt; b.t -= dt;
  const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
  // Viel zu weit weg (Tür, Höhle, festgehangen): einfach hinterherkommen
  if (d > 170) { const z = platz(p); b.x = z.x; b.y = z.y; b.zustand = 'folgen'; return; }

  switch (b.zustand) {
    case 'folgen': case 'sitzen': {
      // Ziel: etwas hinter dem Helden
      const { x: zx, y: zy } = platz(p);
      const ex = zx - b.x, ey = zy - b.y, ed = Math.hypot(ex, ey);
      if (ed > 5 && d > 9) {
        const v = Math.min(S.w.tempo * 1.25, ed * 5);
        const vx = b.x, vy = b.y;
        bewege(b, ex / ed * v * dt, ey / ed * v * dt, 3, 2);
        b.links = ex < 0; b.zustand = 'folgen'; b.stillT = 0;
        b.haengt = Math.hypot(b.x - vx, b.y - vy) < v * dt * 0.3 ? b.haengt + dt : 0;
        if (b.haengt > 1.2) { b.x = zx; b.y = zy; b.haengt = 0; }
      } else {
        b.stillT += dt;
        if (b.stillT > 0.8) b.zustand = 'sitzen';
        b.links = dx < 0;
      }
      b.buddelT -= dt;
      if (b.buddelT <= 0 && d < 60) { b.zustand = 'schnueffeln'; b.t = 0.9; SFX.schnueffeln(); }
      break;
    }
    case 'schnueffeln':
      if (b.t <= 0) { b.zustand = 'buddeln'; b.t = 1.3; }
      break;
    case 'buddeln':
      if (Math.random() < dt * 12) splitter(b.x + (b.links ? -5 : 5), b.y - 1, ['#8a6236', '#6d4423', '#a98250'], 2);
      if (b.t <= 0) {
        const lv = S.st.leckerli | 0;
        const beste = Math.min(4, 1 + Math.floor(S.tag / 3) + (lv >= 2 ? 1 : 0));
        wirfStein(b.x + (b.links ? -6 : 6), b.y - 3, waehleStein(beste, S.w.glueck + lv));
        S.begleiter.art === 'katze' ? SFX.miau() : SFX.wuff();
        text(b.x, b.y - 14, S.begleiter.art === 'katze' ? 'Miau!' : 'Wuff!', '#ffffff');
        b.zustand = 'folgen'; b.buddelT = naechstesBuddeln();
      }
      break;
  }
}

// Beim Tagesbeginn / nach der Höhle neben den Helden stellen
export function begleiterNeu() { S.tier = S.begleiter ? neuesTier() : null; }

export function zeichneBegleiter(ctx) {
  const b = S.tier, satz = tierBilder(S.begleiter.art, S.begleiter.rasse);
  const reihe = b.links ? satz.l : satz.r;
  let pose = 'steh';
  if (b.zustand === 'folgen') pose = Math.floor(b.anim * 10) % 2 ? 'lauf0' : 'lauf1';
  else if (b.zustand === 'sitzen') pose = 'sitz';
  else if (b.zustand === 'buddeln') pose = Math.floor(b.anim * 12) % 2 ? 'buddel0' : 'buddel1';
  const img = reihe[pose];
  const hops = b.zustand === 'folgen' ? -Math.abs(Math.sin(b.anim * 10)) : 0;
  ctx.drawImage(img, Math.round(b.x - img.width / 2), Math.round(b.y - img.height + 1 + hops));
  if (b.zustand === 'schnueffeln') {
    const x = Math.round(b.x + (b.links ? -4 : 4)), y = Math.round(b.y - 20 + Math.sin(b.anim * 12));
    ctx.fillStyle = '#2b1d16'; ctx.fillRect(x - 2, y - 1, 5, 9);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y, 3, 4); ctx.fillRect(x - 1, y + 5, 3, 2);
  }
}

export function begleiterSchatten(ctx) {
  const b = S.tier;
  ctx.beginPath(); ctx.ellipse(Math.round(b.x), Math.round(b.y), 5, 2, 0, 0, Math.PI * 2); ctx.fill();
}

// Kleines Bild für Laden und Auswahl
export function tierIcon(art, rasse) { return tierBilder(art, rasse).l.sitz; }
