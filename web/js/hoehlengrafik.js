// hoehlengrafik.js – Bilder für die Glitzerhöhle: Eingang im Fels, die fünf Wächter,
// Belohnungen und die Böden der Kammern. Wie grafik.js: alles aus Code, keine Bilddatei.

import { G, PB, ausText, spiegeln, weiss } from './grafik.js';
import { KACHEL as K } from './config.js';
import { zufall, hexRgb, leinwand } from './hilfe.js';

// Licht von links oben, vier Töne von dunkel nach hell
const licht = (f, r = null, rausch = 0.3) => (x, y, nx, ny) => {
  const l = -nx * 0.55 - ny * 0.85 + (r ? (r() - 0.5) * rausch : 0);
  return l > 0.55 ? f[3] : l > 0.05 ? f[2] : l > -0.5 ? f[1] : f[0];
};
const satz = (bilder) => ({ l: bilder, r: bilder.map(spiegeln), lw: bilder.map(weiss), rw: bilder.map(b => weiss(spiegeln(b))) });

// ---------- Eingang der Höhle ----------
function eingang() {
  const W = 88, H = 66, r = zufall(77);
  const fels = ['#3b3733', '#5f5a54', '#837d75', '#a59e94'];
  const bau = (zu) => {
    const pb = new PB(W, H);
    const r2 = zufall(78);
    for (const [cx, cy, rr] of [[14, 46, 15], [28, 30, 17], [46, 22, 20], [66, 28, 18], [78, 46, 11], [44, 46, 21], [24, 52, 13], [64, 50, 15]]) {
      pb.kreis(cx, cy, rr, licht(fels, r2, 0.5));
    }
    // Moos oben auf dem Fels
    for (let x = 0; x < W; x++) {
      let y = 0; while (y < H && !pb.get(x, y)) y++;
      if (y >= H) continue;
      const dick = 2 + Math.floor(r() * 3);
      for (let j = 0; j < dick; j++) pb.set(x, y + j, j === 0 ? '#7cc95a' : '#4f9a3c');
      if (r() < 0.15) for (let j = dick; j < dick + 2 + Math.floor(r() * 5); j++) pb.set(x, y + j, '#3f8a37');
    }
    // Torbogen
    const mx = 44, by = 64;
    for (let y = 30; y < H; y++) for (let x = mx - 16; x <= mx + 16; x++) {
      const dx = x + 0.5 - mx, oben = y < 48 ? Math.pow(dx / 14, 2) + Math.pow((y - 48) / 18, 2) : Math.pow(dx / 14, 2);
      if (oben > 1.5) continue;
      if (oben > 1) { pb.set(x, y, (x + y) % 5 === 0 ? '#5f5a54' : '#b8b0a4'); continue; }     // Randsteine
      if (zu) {
        // Steintür aus drei Platten, in der Mitte ein Diamant-Schloss
        const fuge = Math.abs(dx) > 4.2 && Math.abs(dx) < 5.6;
        pb.set(x, y, fuge ? '#3b3733' : dx < -7 || (dx > -5 && dx < 0) ? '#8a847a' : '#726c64');
      } else {
        const tief = 1 - Math.min(1, (by - y) / 30);
        pb.set(x, y, oben < 0.45 && tief < 0.9 ? '#0b0812' : oben < 0.75 ? '#171221' : '#251d30');
      }
    }
    if (zu) {
      const schloss = ['..k..', '.kck.', 'kcwck', '.kck.', '..k..'];
      schloss.forEach((z, j) => { for (let i = 0; i < 5; i++) pb.set(mx - 2 + i, 46 + j, { k: '#1d1830', c: '#7fe3ef', w: '#eaffff' }[z[i]]); });
    }
    // Kristalle im Fels
    for (const [x, y, f] of [[18, 40, '#7fe3ef'], [70, 34, '#ff9bd0'], [60, 16, '#7fe3ef'], [30, 22, '#ffd23f'], [76, 52, '#bb62ee']]) {
      pb.set(x, y - 1, '#ffffff'); pb.set(x, y, f); pb.set(x - 1, y, f); pb.set(x + 1, y, f); pb.set(x, y + 1, f);
    }
    return pb.umriss('#211c1a').bild();
  };
  G.hoehleZu = bau(true);
  G.hoehleOffen = bau(false);
  G.hoehleInfo = { w: W, h: H, fussY: H - 1 };
}

// ---------- Die fünf Wächter (Blick nach links; rechts = gespiegelt) ----------
function schnecke() {
  const pb = new PB(44, 32);
  const fuss = ['#6f8f4a', '#9fc070', '#bcdc8e', '#dcf0b0'];
  for (let x = 7; x <= 38; x += 2) pb.kreis(x, 25, 4.5, licht(fuss));
  pb.kreis(8, 20, 6.5, licht(fuss));
  // Fühler mit Augen
  for (const [x0, y0, x1, y1] of [[5, 16, 3, 7], [10, 15, 11, 6]]) {
    for (let t = 0; t <= 1; t += 0.1) pb.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, '#9fc070');
    pb.kreis(x1, y1, 2.4, '#ffffff'); pb.set(x1 - 1, y1, '#1e1b30'); pb.set(x1 - 1, y1 + 1, '#1e1b30');
  }
  // Grimmiger Mund
  pb.set(3, 22, '#2a2018'); pb.set(4, 22, '#2a2018'); pb.set(5, 23, '#2a2018');
  // Haus mit Spirale und Moos
  pb.kreis(26, 14, 13, licht(['#7a3f18', '#b56a2a', '#e7a74f', '#f6cf86']));
  for (let a = 0; a < 14; a += 0.05) {
    const rr = 11 - a * 0.72;
    if (rr < 1) break;
    pb.set(26 + Math.cos(a) * rr, 14 + Math.sin(a) * rr, '#6a3414');
  }
  for (const [x, y, rr] of [[20, 3, 4], [27, 2, 3.5], [33, 4, 3]]) pb.kreis(x, y, rr, licht(['#2f6a2c', '#3f8a37', '#5aa843', '#7cc95a']));
  pb.kreis(30, 0.5, 2.2, licht(['#8a1e28', '#d8443c', '#ee6a5c', '#ffd0c8']));   // kleiner Pilz obendrauf
  pb.set(30, 3, '#f3dfc0'); pb.set(30, 4, '#f3dfc0');
  return satz([pb.umriss('#2a2018').bild()]);
}

function koenigin() {
  const bild = (fluegelOben) => {
    const pb = new PB(38, 32);
    const fl = ['#9fc4dc', '#bfe0f5', '#dff2ff', '#ffffff'];
    if (fluegelOben) { pb.kreis(16, 7, 6.5, licht(fl)); pb.kreis(25, 6, 7, licht(fl)); }
    else { pb.kreis(13, 12, 6, licht(fl)); pb.kreis(28, 12, 6, licht(fl)); }
    // Hinterleib mit Streifen
    pb.kreis(22, 20, 10, (x, y, nx, ny) => {
      if (((x - 14) % 6 + 6) % 6 < 2) return '#1c1712';
      return licht(['#a87818', '#e0a830', '#f5c542', '#fff0a0'])(x, y, nx, ny);
    });
    pb.rechteck(32, 20, 3, 1, '#1c1712'); pb.set(35, 20, '#6a5040'); pb.set(36, 20, '#6a5040');      // Stachel
    // Kopf mit großen Augen
    pb.kreis(9, 18, 6.5, licht(['#14100c', '#2a221a', '#3e342a', '#5a4c3e']));
    pb.kreis(6, 17, 2.6, '#ffffff'); pb.set(5, 17, '#1e1b30'); pb.set(5, 18, '#1e1b30');
    pb.set(3, 15, '#14100c'); pb.set(4, 15, '#14100c'); pb.set(5, 14, '#14100c');                  // böse Braue
    // Krone
    for (let x = 5; x <= 13; x++) pb.set(x, 11, '#c27512');
    for (let x = 5; x <= 13; x++) pb.set(x, 10, '#ffd23f');
    for (const x of [5, 9, 13]) { pb.set(x, 9, '#ffd23f'); pb.set(x, 8, '#fffbd0'); }
    pb.set(9, 10, '#ee3d4f');
    // Beinchen
    for (const x of [15, 19, 23]) { pb.set(x, 30, '#1c1712'); pb.set(x - 1, 31, '#1c1712'); }
    return pb.umriss('#120e0a').bild();
  };
  return satz([bild(true), bild(false)]);
}

function schattenpilz() {
  const pb = new PB(40, 38);
  const kappe = licht(['#22103a', '#3e1f62', '#5e3392', '#8a54c4']);
  pb.kreis(20, 18, 18, (x, y, nx, ny) => (y > 18 ? null : kappe(x, y, nx, ny)));
  for (const [x, y, rr] of [[11, 9, 2.5], [22, 5, 3], [30, 11, 2.2], [17, 14, 1.8], [33, 16, 1.5], [6, 15, 1.5]]) pb.kreis(x, y, rr, '#7ff0ff');
  for (let x = 4; x <= 36; x++) { pb.set(x, 19, '#2a1a32'); if (x % 2) pb.set(x, 20, '#3a2a44'); }
  // Stiel
  for (let y = 20; y <= 35; y++) for (let x = 12; x <= 28; x++) {
    const nx = (x - 20) / 8;
    pb.set(x, y, nx < -0.5 ? '#e8e0f0' : nx < 0.4 ? '#c8bed6' : '#9a8eac');
  }
  // Leuchtende Augen, schiefer Mund
  for (const [x, y] of [[15, 24], [16, 24], [15, 25], [16, 25], [23, 24], [24, 24], [23, 25], [24, 25]]) pb.set(x, y, '#ffdd55');
  for (const [x, y] of [[14, 22], [15, 22], [16, 23], [25, 22], [24, 22], [23, 23]]) pb.set(x, y, '#2a1a32');
  for (const [x, y] of [[16, 30], [17, 29], [18, 30], [19, 29], [20, 30], [21, 29], [22, 30], [23, 29]]) pb.set(x, y, '#2a1a32');
  pb.rechteck(11, 35, 7, 2, '#5a4c66'); pb.rechteck(22, 35, 7, 2, '#5a4c66');
  return satz([pb.umriss('#120a1a').bild()]);
}

function igel() {
  const stehend = new PB(36, 30);
  const eis = ['#6aa8c8', '#9ad0ea', '#c8ecfa', '#ffffff'];
  for (let a = -3.0; a <= -0.15; a += 0.22) {
    for (let rr = 8; rr <= 15; rr += 0.5) {
      const w = 1 - (rr - 8) / 7;
      for (let s = -w; s <= w; s += 0.5) stehend.set(19 + Math.cos(a + s * 0.12) * rr, 18 + Math.sin(a + s * 0.12) * rr, rr > 13 ? '#ffffff' : '#7ec4e4');
    }
  }
  stehend.kreis(19, 19, 9.5, licht(['#8a6e5a', '#b8987e', '#d8bca0', '#f0dcc4']));
  stehend.kreis(9, 21, 4.5, licht(['#a88a72', '#d8bca0', '#f0dcc4', '#fff4e4']));
  stehend.set(5, 21, '#1e1b30'); stehend.set(5, 22, '#1e1b30'); stehend.set(4, 21, '#1e1b30');
  stehend.set(10, 18, '#1e1b30'); stehend.set(10, 19, '#1e1b30'); stehend.set(9, 17, '#1e1b30'); stehend.set(11, 17, '#1e1b30');
  for (const x of [13, 24]) { stehend.rechteck(x, 27, 3, 2, '#6a5040'); }
  const kugel = new PB(32, 32);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    for (let rr = 8; rr <= 15; rr += 0.5) {
      const w = 1 - (rr - 8) / 7;
      for (let s = -w; s <= w; s += 0.4) kugel.set(16 + Math.cos(a + s * 0.15) * rr, 16 + Math.sin(a + s * 0.15) * rr, rr > 13 ? '#ffffff' : '#7ec4e4');
    }
  }
  kugel.kreis(16, 16, 9.5, licht(eis));
  for (let i = 0; i < 6; i++) { const a = i * 1.05; kugel.set(16 + Math.cos(a) * 5, 16 + Math.sin(a) * 5, '#6aa8c8'); }
  return { ...satz([stehend.umriss('#1a2a3a').bild()]), kugel: kugel.umriss('#1a2a3a').bild(), kugelW: weiss(kugel.umriss('#1a2a3a').bild()) };
}

function waechter() {
  const bild = (arme) => {
    const pb = new PB(50, 58);
    const stein = licht(['#3e3a40', '#5e5964', '#7d7884', '#a29cab']);
    const r = zufall(arme ? 5 : 6);
    // Beine
    for (const x of [15, 28]) pb.rechteck(x, 46, 8, 11, '#55505c');
    // Rumpf aus Steinbrocken
    pb.kreis(25, 34, 15, stein);
    pb.kreis(18, 28, 9, stein); pb.kreis(32, 28, 9, stein);
    for (let i = 0; i < 18; i++) { const x = 13 + Math.floor(r() * 24), y = 22 + Math.floor(r() * 22); if (pb.get(x, y)) pb.set(x, y, '#3e3a40'); }
    // Kopf
    pb.kreis(25, 15, 7.5, stein);
    for (const [x, y] of [[21, 15], [22, 15], [28, 15], [29, 15], [21, 14], [29, 14]]) pb.set(x, y, '#7ff0ff');
    for (let x = 20; x <= 30; x++) pb.set(x, 12, '#2c2830');
    // Kristallkern in der Brust
    const kern = ['...k...', '..kwk..', '.kwyyk.', 'kwyyyok', '.kyyok.', '..kok..', '...k...'];
    kern.forEach((z, j) => { for (let i = 0; i < 7; i++) pb.set(22 + i, 28 + j, { k: '#5a3a10', w: '#fffbd0', y: '#ffd23f', o: '#c27512' }[z[i]]); });
    // Moos auf den Schultern
    for (const [x, y, rr] of [[14, 21, 3], [36, 21, 3], [25, 8, 2.5]]) pb.kreis(x, y, rr, licht(['#2f6a2c', '#3f8a37', '#5aa843', '#7cc95a']));
    // Arme mit Fäusten
    for (const x of [3, 41]) {
      if (arme) { pb.rechteck(x, 6, 7, 18, '#6a6572'); pb.kreis(x + 3.5, 5, 5, stein); }
      else { pb.rechteck(x, 24, 7, 16, '#6a6572'); pb.kreis(x + 3.5, 42, 5, stein); }
    }
    return pb.umriss('#18161c').bild();
  };
  return satz([bild(false), bild(true)]);
}

// ---------- Belohnungen ----------
function belohnungen() {
  const b = {};
  b.fackel = ausText([
    '....r.....', '...rOr....', '..rOyOr...', '..OyyyO...', '..rOyOr...', '...kkk....', '...khk....',
    '...khk....', '...khk....', '...khk....', '...khk....', '...kkk....',
  ], { r: '#e8402c', O: '#ff9a2a', y: '#fff3a0', k: '#2b1d16', h: '#8c5a2c' }).bild();
  b.herz = ausText([
    '.yyy.yyy.', 'yRRwyRRRy', 'yRwRRRRRy', 'yRRRRRRDy', '.yRRRRDy.', '..yRRDy..', '...yDy...', '....y....',
  ], { y: '#ffd23f', R: '#ee3d4f', w: '#ffd0d6', D: '#a01e35' }).bild();
  b.steigeisen = ausText([
    '.kkkkkkkk.', 'kiiiiiiiik', 'kIIIIIIIIk', '.kvkvkvkv.', '..k.k.k.k.',
  ], { k: '#1d1d24', i: '#c8d0dc', I: '#7a8494', v: '#9aa4b4' }).bild();
  b.schliff = ausText([
    '.........kk', '........kwk', '.......kwyk', '......kwyk.', '.....kwyk..', '....kwyk...',
    'k..kwyk....', 'kkkwyk.....', '.kkyk......', '.kbkk......', 'kbk.kk.....', 'kk.........',
  ], { k: '#4a2a08', w: '#fffbd0', y: '#ffd23f', b: '#6b4220' }).bild();
  const rd = new PB(30, 28);
  const form = (x, y) => { const dx = Math.abs(x + 0.5 - 15); return y < 9 ? dx < 6 + y : dx < 14 - (y - 9) * 0.75; };
  for (let y = 1; y < 27; y++) for (let x = 0; x < 30; x++) {
    if (!form(x, y)) continue;
    const dx = x + 0.5 - 15;
    let f = y < 9 ? (dx < -2 ? '#eaffff' : dx < 4 ? '#b8f6ff' : '#7fe3ef') : (dx < -3 ? '#a8f0ff' : dx < 3 ? '#62d4ec' : '#2a8fb0');
    if (y === 9) f = '#ffffff';
    rd.set(x, y, f);
  }
  for (const [x, y] of [[10, 4], [11, 4], [10, 5], [19, 12], [20, 13]]) rd.set(x, y, '#ffffff');
  b.riesendiamant = rd.umriss('#14304a').bild();
  G.belohnung = b;
  G.icons.schloss = ausText([
    '...kkkk...', '..kiiiik..', '.ki.kk.ik.', '.ki.kk.ik.', 'kkkkkkkkkk', 'kyyyyyyyyk', 'kyYYkkYYyk',
    'kyYYkkYYyk', 'kyYYYkYYyk', 'kyyyyyyyyk', 'kkkkkkkkkk',
  ], { k: '#2b1d16', i: '#9aa4b4', y: '#ffd23f', Y: '#c27512' }).bild();
}

// ---------- Böden und Wände der Kammern ----------
export const THEMEN = [
  { boden: ['#4a5a3e', '#55684a', '#3f4f36'], wand: ['#2a2622', '#45403a', '#625b52', '#857c70'], deko: 'moos',      hinter: '#14130f' },
  { boden: ['#7a5a2a', '#86662e', '#6a4c22'], wand: ['#3a2610', '#5a3e1c', '#7a5628', '#a07834'], deko: 'waben',     hinter: '#1a1006' },
  { boden: ['#2a2236', '#30273e', '#231c2e'], wand: ['#120e1a', '#1e1828', '#2c2238', '#443656'], deko: 'leuchten',  hinter: '#07050b' },
  { boden: ['#9cbcd0', '#aecce0', '#8eaec4'], wand: ['#3a5a76', '#5a7a96', '#7a9ab4', '#a8c8e0'], deko: 'eis',       hinter: '#0e1a26' },
  { boden: ['#56515c', '#625d68', '#4b4752'], wand: ['#26232c', '#3a3640', '#55505c', '#7a7484'], deko: 'kristall',  hinter: '#0c0b10' },
];

export function malKammer(W, k) {
  const T = THEMEN[k - 1], r = zufall(900 + k);
  const bw = W.b * K, bh = W.h * K;
  const c = leinwand(bw, bh), g = c.getContext('2d');
  const img = g.createImageData(bw, bh), d = img.data;
  const F = {};
  const setz = (x, y, h) => { const f = F[h] || (F[h] = hexRgb(h)), i = (y * bw + x) * 4; d[i] = f[0]; d[i + 1] = f[1]; d[i + 2] = f[2]; d[i + 3] = 255; };
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const tx = x >> 4, ty = y >> 4, lx = x & 15, ly = y & 15;
    const istWand = W.fest[ty * W.b + tx];
    if (!istWand) {
      // Steinplatten, jede zweite Reihe versetzt
      const px = (x + (((y >> 4) & 1) ? 8 : 0)) & 15;
      const fuge = px === 0 || ly === 0;
      const n = Math.sin(x * 0.11 + y * 0.07) + Math.sin(x * 0.05 - y * 0.13);
      const z = r();
      setz(x, y, fuge ? T.boden[2] : z < 0.04 ? T.boden[2] : n > 0.9 ? T.boden[1] : T.boden[0]);
      continue;
    }
    // Wand: unten heller Rand, oben dunkel, grobe Steine
    const unterkante = ty + 1 < W.h && !W.fest[(ty + 1) * W.b + tx] && ty < W.h - 1;
    const n = Math.sin(x * 0.4 + Math.sin(y * 0.3) * 2) + r() * 0.6;
    let f = T.wand[n > 1 ? 2 : n > 0.2 ? 1 : 0];
    if (unterkante && ly >= 13) f = ly === 15 ? T.wand[0] : T.wand[3];
    else if (unterkante && ly >= 10) f = T.wand[2];
    setz(x, y, f);
  }
  g.putImageData(img, 0, 0);
  // Tür unten (dunkle Öffnung in der Wand)
  const t = W.tuer;
  g.fillStyle = T.hinter; g.fillRect(t.x - 9, t.y - 2, 18, 18);
  g.fillStyle = T.wand[3]; g.fillRect(t.x - 11, t.y - 3, 2, 19); g.fillRect(t.x + 9, t.y - 3, 2, 19);
  // Schmuck je Kammer
  const zufallsWand = () => ({ x: 20 + Math.floor(r() * (bw - 40)), y: 6 + Math.floor(r() * 20) });
  for (let i = 0; i < 26; i++) {
    const { x, y } = zufallsWand();
    if (T.deko === 'moos') { g.fillStyle = r() < 0.5 ? '#5aa843' : '#3f8a37'; g.fillRect(x, 26 + Math.floor(r() * 5), 3 + Math.floor(r() * 4), 2); }
    if (T.deko === 'waben') {
      g.fillStyle = '#f5c542'; g.fillRect(x, y, 4, 3); g.fillStyle = '#c27512'; g.fillRect(x + 1, y + 1, 2, 1);
      if (r() < 0.3) { g.fillStyle = '#f5c542'; g.fillRect(x + 1, y + 3, 1, 4 + Math.floor(r() * 6)); }
    }
    if (T.deko === 'leuchten') { g.fillStyle = r() < 0.5 ? '#7ff0ff' : '#bb62ee'; g.fillRect(x, y, 2, 2); }
    if (T.deko === 'eis') { g.fillStyle = '#e8fbff'; const l = 3 + Math.floor(r() * 6); for (let j = 0; j < l; j++) g.fillRect(x + (j > l / 2 ? 1 : 0), 31 - l + j + 1, j < l - 1 ? 2 : 1, 1); }
    if (T.deko === 'kristall') {
      const f = ['#ffd23f', '#7fe3ef', '#bb62ee', '#ff9bd0'][Math.floor(r() * 4)];
      g.fillStyle = f; g.fillRect(x, y + 2, 2, 4); g.fillRect(x + 2, y, 2, 6); g.fillStyle = '#ffffff'; g.fillRect(x + 2, y, 1, 2);
    }
  }
  // Ein paar Flecken auf dem Boden
  for (let i = 0; i < 40; i++) {
    const x = 18 + Math.floor(r() * (bw - 36)), y = 36 + Math.floor(r() * (bh - 60));
    if (T.deko === 'moos') { g.fillStyle = 'rgba(90,168,67,0.5)'; g.fillRect(x, y, 2 + Math.floor(r() * 3), 1); }
    if (T.deko === 'waben') { g.fillStyle = 'rgba(245,197,66,0.35)'; g.fillRect(x, y, 3, 2); }
    if (T.deko === 'leuchten' && r() < 0.3) { g.fillStyle = '#7ff0ff'; g.fillRect(x, y, 1, 1); }
    if (T.deko === 'eis') { g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x, y, 4, 1); }
    if (T.deko === 'kristall' && r() < 0.4) { g.fillStyle = 'rgba(255,210,63,0.6)'; g.fillRect(x, y, 1, 1); }
  }
  return c;
}

export function initHoehlenGrafik() {
  eingang();
  G.boss = { schnecke: schnecke(), koenigin: koenigin(), schatten: schattenpilz(), igel: igel(), waechter: waechter() };
  belohnungen();
}
