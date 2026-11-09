// begleiter.js – Hund oder Katze, die dem Helden hinterherlaufen und ab und zu einen Diamanten ausbuddeln.
// Gekauft wird im Laden; tauschen geht jederzeit, kostet aber jedes Mal TAUSCH_PREIS. „Leckerli“
// (S.st.leckerli, 0–3, bleibt beim Tausch) lässt das Tier öfter buddeln und bessere Farben finden.
// Bilder werden wie überall aus Code gemalt – im Kawaii-Stil (großer Kopf, Glanzaugen, Bäckchen).

import { G, PB, spiegeln } from './grafik.js';
import { SFX } from './ton.js';
import { S, bewege, wirfStein, waehleStein, splitter, text } from './spiel.js';

export const BEGLEITER_PREIS = 200;
export const TAUSCH_PREIS = 300;
export const LECKERLI_KOSTEN = [150, 500, 1500];

// Rassen: Farben + kleine Formunterschiede
export const RASSEN = {
  hund: {
    dackel:  { name: 'Dackel',      a: '#b06a32', A: '#6e3a16', w: '#e0aa70', hell: '#c8844a', ohr: 'schlapp', schwanz: 'kurz',  lang: true },
    spitz:   { name: 'Spitz',       a: '#f4ede0', A: '#cbbd9e', w: '#ffffff', ohr: 'spitz',   schwanz: 'ringel' },
    schaefer:{ name: 'Schäferhund', a: '#c88a44', A: '#2a2220', w: '#e6b878', ohr: 'spitz',   schwanz: 'lang', sattel: true },
  },
  katze: {
    tiger:   { name: 'Tigerkatze',    a: '#f09a42', A: '#b05e20', w: '#fde2b8', hell: '#f8b468', streifen: true },
    schwarz: { name: 'Schwarze Katze', a: '#3a3644', A: '#1a1820', w: '#5e5868', hell: '#4c4858', augen: '#ffd23f' },
    glueck:  { name: 'Glückskatze',   a: '#f6f0e6', A: '#cfc6b6', w: '#ffffff', flecken: true },
  },
};

// ---------- Bilder (Kawaii: großer Kopf, große Glanzaugen, Bäckchen, winziger Körper) ----------
// Blick nach links. Posen: steh, lauf0, lauf1, sitz, buddel0, buddel1, schlaf. Größe 22 × 18.
const W = 22, H = 18;
const ROSA = '#ff9ab4', AUGE = '#1e1b30', MUND = '#4a2a2a';

function kopf(pb, art, r, hx, hy, augenZu) {
  const katze = art === 'katze';
  // Ohren hinter dem Kopf
  if (katze) {
    for (const ox of [-3, 2]) {
      for (let j = 0; j < 4; j++) for (let i = 0; i <= 3 - j; i++) pb.set(hx + ox + i + (ox < 0 ? 0 : j > 0 ? 0 : 0), hy - 5 - j + 1, j === 0 || i === 0 || i === 3 - j ? r.a : '#f4a0b8');
    }
  } else if (r.ohr === 'spitz') {
    for (const ox of [-3, 2]) for (let j = 0; j < 3; j++) for (let i = 0; i <= 2 - j; i++) pb.set(hx + ox + i, hy - 4 - j, j === 2 ? r.A : r.a);
  }
  // runder Kopf
  pb.kreis(hx, hy, 5, (x, y, nx, ny) => (ny > 0.35 && Math.abs(nx) < 0.55 ? r.w : nx + ny < -0.7 ? r.hell || r.a : r.a));
  if (r.streifen) for (const [x, y] of [[hx - 1, hy - 4], [hx, hy - 4], [hx + 1, hy - 4], [hx - 1, hy - 3], [hx + 1, hy - 3]]) if ((x + y) % 2 === 0) pb.set(x, y, r.A);
  if (r.flecken) pb.kreis(hx + 2, hy - 3, 1.6, '#e8913a');
  // Schlappohren seitlich am Kopf
  if (!katze && r.ohr === 'schlapp') {
    for (const ox of [-5, 4]) for (let j = 0; j < 5; j++) { pb.set(hx + ox, hy - 2 + j, r.A); pb.set(hx + ox + 1, hy - 2 + j, j < 4 ? r.A : null); }
  }
  // Augen: groß, mit Lichtpunkt – oder zufrieden geschlossen (‿ ‿)
  for (const ax of [hx - 3, hx + 1]) {
    if (augenZu) { pb.set(ax, hy, AUGE); pb.set(ax + 1, hy + 1, AUGE); pb.set(ax + 2, hy, AUGE); continue; }
    pb.rechteck(ax, hy - 1, 2, 3, r.augen || AUGE);
    pb.set(ax, hy - 1, '#ffffff');
    if (r.augen) pb.set(ax + 1, hy, AUGE);
  }
  // Bäckchen
  pb.set(hx - 4, hy + 2, ROSA); pb.set(hx + 3, hy + 2, ROSA);
  // Nase und Mäulchen (ω)
  if (katze) { pb.set(hx - 1, hy + 2, '#e8828a'); pb.set(hx - 2, hy + 3, MUND); pb.set(hx - 1, hy + 4, MUND); pb.set(hx, hy + 3, MUND); }
  else { pb.rechteck(hx - 2, hy + 1, 2, 1, '#2b1d16'); pb.set(hx - 2, hy + 3, MUND); pb.set(hx - 1, hy + 3, MUND); }
}

function schwanz(pb, art, r, sx, sy, wedel) {
  if (art === 'katze') {
    const punkte = [[0, 0], [1, -1], [2, -2], [2, -3], [2, -4], [1, -5]];
    punkte.forEach(([x, y], i) => { pb.set(sx + x + (i > 2 ? wedel : 0), sy + y, r.streifen && i % 2 ? r.A : r.a); pb.set(sx + x + 1 + (i > 2 ? wedel : 0), sy + y, r.a); });
  } else if (r.schwanz === 'ringel') { pb.kreis(sx + 1.5, sy - 2, 2.2, r.a); pb.set(sx + 1, sy - 2, r.w); }
  else if (r.schwanz === 'kurz') { pb.set(sx, sy, r.a); pb.set(sx + 1, sy - 1 + wedel, r.a); }
  else { for (let i = 0; i < 4; i++) { pb.set(sx + Math.min(i, 2), sy - i + (i > 1 ? wedel : 0), r.a); pb.set(sx + Math.min(i, 2) + 1, sy - i + (i > 1 ? wedel : 0), r.a); } }
}

function tierBild(art, r, pose) {
  if (pose === 'schlaf') return schlafBild(art, r);
  const pb = new PB(W, H);
  const lang = r.lang ? 2 : 0;
  const sitz = pose === 'sitz', buddel = pose.startsWith('buddel');
  // Körper: klein und rund, hinter dem Kopf
  const kx = 11, ky = sitz ? 13 : 12;
  for (let x = kx; x <= kx + 3 + lang; x++) pb.kreis(x, ky, sitz ? 3.6 : 3.2, (xx, yy, nx, ny) => (ny > 0.4 ? r.w : r.a));
  if (r.sattel) for (let x = kx; x <= kx + 3; x++) { pb.set(x, ky - 3, r.A); pb.set(x, ky - 2, r.A); }
  if (r.streifen) for (const x of [kx + 1, kx + 3]) for (let y = ky - 3; y <= ky - 1; y++) pb.set(x, y, r.A);
  if (r.flecken) pb.kreis(kx + 2, ky - 2, 1.5, '#34313c');
  schwanz(pb, art, r, kx + 4 + lang, ky - 2, pose === 'lauf0' ? 1 : 0);
  // Stummelbeinchen
  const bein = (x, h = 2) => pb.rechteck(x, H - 1 - h, 2, h, r.A === '#2a2220' ? r.a : r.a);
  if (sitz) { bein(9, 3); bein(14 + lang, 2); }
  else {
    const l = pose === 'lauf0' ? [-1, 1] : pose === 'lauf1' ? [1, -1] : buddel ? (pose === 'buddel0' ? [-1, 0] : [1, 0]) : [0, 0];
    bein(8 + l[0]); bein(10 - l[0]); bein(13 + lang + l[1]); bein(15 + lang - l[1]);
  }
  for (let x = 0; x < W; x++) if (pb.get(x, H - 1)) pb.set(x, H - 1, r.A === '#2a2220' ? '#5a4030' : r.A);   // Pfötchen etwas dunkler
  // Kopf (beim Buddeln tiefer und nach vorn)
  kopf(pb, art, r, buddel ? 5 : 6, buddel ? 9 : 7, false);
  return pb.umriss('#2b1d16').bild();
}

// Eingerollt schlafend (für die Stube): Kopf auf den Pfoten, Augen zu (‿ ‿), Schwanz um den Körper
function schlafBild(art, r) {
  const pb = new PB(W, 16);                       // 16 hoch, damit die Ohren nicht abgeschnitten werden
  const lang = r.lang ? 2 : 0;
  for (let x = 9; x <= 15 + lang; x++) pb.kreis(x, 10.5, 3.6, (xx, yy, nx, ny) => (ny > 0.45 ? r.w : r.a));
  if (r.sattel) for (let x = 10; x <= 15; x++) { pb.set(x, 7, r.A); pb.set(x, 8, r.A); }
  if (r.streifen) for (const x of [11, 13, 15]) for (let y = 7; y <= 9; y++) pb.set(x, y, r.A);
  if (r.flecken) { pb.kreis(14, 8.5, 1.8, '#e8913a'); pb.kreis(11, 8.5, 1.3, '#34313c'); }
  for (let x = 7; x <= 17 + lang; x++) pb.set(x, 14, r.streifen && x % 3 === 0 ? r.A : r.a);      // Schwanz vorne herum
  pb.rechteck(2, 13, 6, 2, r.w);                                                                   // Pfoten
  kopf(pb, art, r, 6, 9, true);
  return pb.umriss('#2b1d16').bild();
}

const POSEN = ['steh', 'lauf0', 'lauf1', 'sitz', 'buddel0', 'buddel1', 'schlaf'];
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

// Platz mit Abstand schräg hinter und neben dem Helden (direkt dahinter säße das Tier auf seinem Kopf)
const ABSTAND = { hinten: 26, seite: 16 };
function platz(p) {
  const bx = -Math.cos(p.winkel), by = -Math.sin(p.winkel), sx = -by, sy = bx;
  return { x: p.x + bx * ABSTAND.hinten + sx * ABSTAND.seite, y: p.y + by * 12 + sy * 8 + 2 };
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
      // Mit Spiel: Erst loslaufen, wenn der Platz ein Stück weg ist, dann bis ganz hin – so trottet es
      // versetzt hinterher, statt am Helden zu kleben. Näher als 16 px kommt es nie.
      if (b.laeuft ? ed < 3 : ed < 14) b.laeuft = false; else b.laeuft = true;
      if (b.laeuft && d > 16) {
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

// Kleines Bild für Laden und Auswahl; schlafend für die Stube
export function tierIcon(art, rasse) { return tierBilder(art, rasse).l.sitz; }
export function tierSchlafend(art, rasse) { return tierBilder(art, rasse).r.schlaf; }
