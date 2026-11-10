// grafik.js – Alle Bilder werden beim Start aus Code gemalt. Es gibt keine Bilddateien.
// Zwei Wege: Pixel-Texte (eine Zeile = eine Bildzeile, ein Zeichen = eine Farbe)
// für Figuren, und gerechnete Formen (Kreise mit Licht von links oben) für Bäume und Büsche.

import { STEINE, KLINGE } from './config.js';
import { zufall, hexRgb, leinwand } from './hilfe.js';

export const G = {};

// ---------- Pixelbild: Raster aus Farben, am Ende ein Canvas ----------
export class PB {
  constructor(w, h) { this.w = w; this.h = h; this.p = new Array(w * h).fill(null); }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.p[y * this.w + x] = c;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.p[y * this.w + x];
  }
  // f: Farbe oder (x, y, nx, ny) => Farbe; nx/ny = Lage im Kreis (-1..1)
  kreis(cx, cy, r, f) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r * r) this.set(x, y, typeof f === 'function' ? f(x, y, dx / r, dy / r) : f);
      }
    }
  }
  rechteck(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  // Dunkler Rand um alles, was schon gemalt ist
  umriss(c) {
    const neu = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) neu.push(x, y);
    }
    for (let i = 0; i < neu.length; i += 2) this.set(neu[i], neu[i + 1], c);
    return this;
  }
  bild() {
    const c = leinwand(this.w, this.h), g = c.getContext('2d');
    const id = g.createImageData(this.w, this.h);
    const cache = {};
    for (let i = 0; i < this.p.length; i++) {
      const f = this.p[i];
      if (!f) continue;
      const rgb = cache[f] || (cache[f] = hexRgb(f));
      id.data[i * 4] = rgb[0]; id.data[i * 4 + 1] = rgb[1]; id.data[i * 4 + 2] = rgb[2]; id.data[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return c;
  }
}

export function ausText(zeilen, pal) {
  const h = zeilen.length, w = Math.max(...zeilen.map(z => z.length));
  const pb = new PB(w, h);
  zeilen.forEach((z, y) => { for (let x = 0; x < z.length; x++) pb.set(x, y, pal[z[x]]); });
  return pb;
}

export function spiegeln(c) {
  const d = leinwand(c.width, c.height), g = d.getContext('2d');
  g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
  return d;
}

// Weiße Silhouette – für das Aufblitzen bei Treffern
export function weiss(c) {
  const d = leinwand(c.width, c.height), g = d.getContext('2d');
  g.drawImage(c, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
  return d;
}

// Licht von links oben: Kreis in vier Tönen schattieren
function schattiert(farben, r, rausch = 0.35) {
  return (x, y, nx, ny) => {
    const l = -nx * 0.55 - ny * 0.85 + (r() - 0.5) * rausch;
    return l > 0.55 ? farben[3] : l > 0.05 ? farben[2] : l > -0.5 ? farben[1] : farben[0];
  };
}

// ---------- Die Spielfigur: Junge oder Mädchen mit Eichelhut ----------
// Kleiderfarbe wählbar: g = hell, G = dunkel. Haarfarbe hängt an der Figur.
export const KLEIDER = {
  blau:   { name: 'Dunkelblau', g: '#3d5fa8', G: '#233a72' },
  gruen:  { name: 'Waldgrün',   g: '#5aaa46', G: '#34712f' },
  rot:    { name: 'Rot',        g: '#cf4a40', G: '#87282a' },
  lila:   { name: 'Lila',       g: '#9256c8', G: '#5c2f8a' },
  orange: { name: 'Orange',     g: '#e8862e', G: '#9c4e18' },
};
export const FIGUREN = { junge: 'Junge', maedchen: 'Mädchen' };
const palKind = (art, farbe) => ({
  k: '#2b1d16', H: '#c58e4a', h: '#8c5a2c', p: '#6d4423', s: '#f6d0a8', S: '#dba17a',
  y: art === 'maedchen' ? '#c4602e' : '#f2c14e', Q: '#f2c14e', r: '#f4a0a0', e: '#1e1b30',
  g: (KLEIDER[farbe] || KLEIDER.blau).g, G: (KLEIDER[farbe] || KLEIDER.blau).G, b: '#6b4220',
});
const KOPF_UNTEN = [
  '......kkkk......',
  '....kkHHHHkk....',
  '...kHHhHHhHHk...',
  '..khhhhhhhhhhk..',
  '..kkkkkkkkkkkk..',
  '..kyssssssssyk..',
  '..kssessssessk..',
  '...kssssssssk...',
  '....kSSSSSSk....',
  '..kGggggggggGk..',
  '.ksGggggggggGsk.',
  '.kkkbbbQQbbbkkk.',
  '...kggggggggk...',
  '...kGGGGGGGGk...',
];
const KOPF_OBEN = [
  '......kkkk......',
  '....kkHHHHkk....',
  '...kHHhHHhHHk...',
  '..khhhhhhhhhhk..',
  '..kkkkkkkkkkkk..',
  '..kyyyyyyyyyyk..',
  '..kyyyyyyyyyyk..',
  '...kyyyyyyyyk...',
  '....kSSSSSSk....',
  '..kGggggggggGk..',
  '.ksGggggggggGsk.',
  '.kkkbbbbbbbbkkk.',
  '...kggggggggk...',
  '...kGGGGGGGGk...',
];
const KOPF_SEITE = [
  '.......kkkk.....',
  '.....kkHHHHkk...',
  '....kHHhHHhHHk..',
  '...khhhhhhhhhhk.',
  '...kkkkkkkkkkkkk',
  '....kyyyssssk...',
  '....kyysssesk...',
  '....kyyssssssk..',
  '.....kSSSSSk....',
  '....kGgggggk....',
  '....kGggsggk....',
  '....kbbbQbbk....',
  '....kggggggk....',
  '....kGGGGGGk....',
];

// Mädchen: Pony, Zöpfe links und rechts, Rock statt Hemdsaum
const M_UNTEN = [
  '......kkkk......',
  '....kkHHHHkk....',
  '...kHHhHHhHHk...',
  '..khhhhhhhhhhk..',
  '..kkkkkkkkkkkk..',
  '.kyyyssssssyyyk.',
  '.kyssessssessyk.',
  '.kykrssssssrkyk.',
  'kyyk.kSSSSk.kyyk',
  'kyykGggggggGkyyk',
  '.kksGggggggGskk.',
  '.kkkbbbQQbbbkkk.',
  '..kggggggggggk..',
  '.kGGGGGGGGGGGGk.',
];
const M_OBEN = [
  '......kkkk......',
  '....kkHHHHkk....',
  '...kHHhHHhHHk...',
  '..khhhhhhhhhhk..',
  '..kkkkkkkkkkkk..',
  '.kyyyyyyyyyyyyk.',
  '.kyyyyyyyyyyyyk.',
  '.kyyyyyyyyyyyyk.',
  'kyyk.kSSSSk.kyyk',
  'kyykGggggggGkyyk',
  '.kksGggggggGskk.',
  '.kkkbbbbbbbbkkk.',
  '..kggggggggggk..',
  '.kGGGGGGGGGGGGk.',
];
const M_SEITE = [
  '.......kkkk.....',
  '.....kkHHHHkk...',
  '....kHHhHHhHHk..',
  '...khhhhhhhhhhk.',
  '...kkkkkkkkkkkkk',
  '...kyyyyssssk...',
  '..kyyyysssesk...',
  '.kyykyyssssrsk..',
  '.kyk.kSSSSSk....',
  '...kkGgggggk....',
  '....kGggsggk....',
  '....kbbbQbbk....',
  '...kggggggggk...',
  '...kGGGGGGGGk...',
];
const BEINE_V = [
  ['....kpk..kpk....', '....kkk..kkk....'],
  ['....kpk..kkk....', '....kkk.........'],
  ['....kkk..kpk....', '.........kkk....'],
];
const BEINE_S = [
  ['.....kpkkpk.....', '.....kkkkkk.....'],
  ['....kpk..kpk....', '....kkk..kkk....'],
];

// Hüte: über den Eichelhut (Zeilen 0–4) gemalt. Erst Haare über die Kappe, dann der Hut.
// seite = Blick nach rechts (Kappe dort in Spalte 3–15)
const HUT_FARBEN = { k: '#2b1d16', w: '#ffffff', r: '#d8443c', R: '#8a2422', g: '#e8c25a', G: '#a8801e', s: '#9aa4b4', S: '#5e6a7a',
  f: '#3f8a37', F: '#2a5e28', y: '#ffd23f', Y: '#c27512', p: '#d8443c', o: '#f4ece0', b: '#8c5a2c', B: '#5a3818', l: '#ffe680', u: '#2f6fd0', U: '#1d4590' };
const HUETE_PIX = {
  stroh:   { vorn: ['................', '.....kkkkkk.....', '....kggggggk....', '....kRRRRRRk....', 'kkkkggggggggkkkk', 'kGGGGGGGGGGGGGGk'],
             seite: ['................', '......kkkkkk....', '.....kggggggk...', '.....kRRRRRRk...', '..kkkkggggggkkkk', '..kGGGGGGGGGGGGk'] },
  feder:   { vorn: ['............kwk.', '.....kkkkkkkwrk.', '....kbbbbbbkrk..', '...kbbbbbbbbkk..', '..kkkkkkkkkkkk..', '................'],
             seite: ['.............kwk', '......kkkkkkkwrk', '.....kbbbbbbkrk.', '....kbbbbbbbbkk.', '...kkkkkkkkkkkkk', '................'] },
  klee:    { vorn: ['......kkkk......', '....kkffffkk....', '...kffkfkfffk...', '..kffffkffFffk..', '..kFFFFFFFFFFk..', '................'],
             seite: ['.......kkkk.....', '.....kkffffkk...', '....kfffkfkffk..', '...kfffffkfFffk.', '...kFFFFFFFFFFFk', '................'] },
  laterne: { vorn: ['......kkkk......', '....kkssssskk...', '...kssklllkssk..', '..kssskllkssssk.', '..kSSSSSSSSSSSk.', '................'],
             seite: ['.......kkkk.....', '.....kkssssskk..', '....ksssssklk...', '...kssssssklllk.', '...kSSSSSSSSSSSk', '................'] },
  pudel:   { vorn: ['.......kk.......', '......kwwk......', '....kkrrrrkk....', '...krrrrrrrrk...', '..kwwwwwwwwwwk..', '................'],
             seite: ['........kk......', '.......kwwk.....', '.....kkrrrrkk...', '....krrrrrrrrk..', '...kwwwwwwwwwwwk', '................'] },
  ritter:  { vorn: ['.......kk.......', '......krrk......', '....kkssssskk...', '...ksssssssssk..', '..kSSSSSSSSSSSk.', '..kSkkkkkkkkSk..'],
             seite: ['........kk......', '.......krrk.....', '.....kkssssskk..', '....kssssssssssk', '...kSSSSSSSSSSSk', '...kSSSkkkkkkkk.'] },
  // Baseballcap: blau mit weißer Front, Schirm nach vorn (seitlich ragt er nach rechts heraus)
  cap:     { vorn: ['.....kkkkkk.....', '...kkuwwwwukk...', '..kuuwwwwwwuuk..', '..kuuwwuuwwuuk..', '..kUUUUUUUUUUk..', '................'],
             hinten: ['.....kkkkkk.....', '...kkuuuuuukk...', '..kuuuuuuuuuuk..', '..kuuuuuuuuuuk..', '..kuuukwwkuuuk..', '................'],
             seite: ['......kkkkkk....', '....kkuuuuuwwwk.', '...kuuuuuuuwwwk.', '...kuuuuuuuwwwkk', '...kuuuuuuuUUUUk', '...kkkkkkkkkkkk.'] },
};
function hutAufsetzen(c, hut, seite, haar, hinten = false) {
  const p = HUETE_PIX[hut]; if (!p) return c;
  const g = c.getContext('2d');
  // Kappe des Eichelhuts mit Haaren übermalen (Zeilen 1–4), damit unter schmalen Hüten nichts durchschaut
  const x0 = seite ? 4 : 3, x1 = seite ? 14 : 12;
  for (let y = 1; y <= 4; y++) for (let x = x0; x <= x1; x++) { g.fillStyle = haar; g.fillRect(x, y, 1, 1); }
  g.clearRect(0, 0, 16, 1);
  const zeilen = seite ? p.seite : (hinten && p.hinten) || p.vorn;      // von hinten (laufen nach oben) eigene Zeilen, falls vorhanden
  zeilen.forEach((z, y) => { for (let x = 0; x < z.length; x++) if (z[x] !== '.') { g.fillStyle = HUT_FARBEN[z[x]]; g.fillRect(x, y, 1, 1); } });
  return c;
}

// Breiter Ausfallschritt beim Hauen
const BEINE_HAU_V = ['...kpk....kpk...', '...kkk....kkk...'];
const BEINE_HAU_S = ['...kpk....kpk...', '...kkk....kkk...'];

// Baut alle Bilder der Spielfigur neu – beim Start und wenn im Auswahl-Fenster etwas geändert wird
export function setzeFigur(art = 'junge', farbe = 'blau', hut = 'eichel') {
  G.figur = { art, farbe, hut };
  const pal = palKind(art, farbe), m = art === 'maedchen';
  const v = (kopf, beine) => hutAufsetzen(ausText([...kopf, ...beine], pal).bild(), hut, kopf === KOPF_SEITE || kopf === M_SEITE, pal.y, kopf === KOPF_OBEN || kopf === M_OBEN);
  const KU = m ? M_UNTEN : KOPF_UNTEN, KO = m ? M_OBEN : KOPF_OBEN, KS = m ? M_SEITE : KOPF_SEITE;
  G.kind = {
    unten: [0, 1, 0, 2].map(i => v(KU, BEINE_V[i])),
    oben: [0, 2, 0, 1].map(i => v(KO, BEINE_V[i])),
    rechts: [0, 1, 0, 1].map(i => v(KS, BEINE_S[i])),
  };
  G.kind.links = G.kind.rechts.map(spiegeln);
  G.kindHau = { unten: v(KU, BEINE_HAU_V), oben: v(KO, BEINE_HAU_V), rechts: v(KS, BEINE_HAU_S) };
  G.kindHau.links = spiegeln(G.kindHau.rechts);
  G.hutVorschau = {};
  G.hautFarbe = pal.s;
}
function kindBilder() { setzeFigur(); }
// Vorschau für das Auswahl-Fenster (ohne die laufende Figur zu ändern)
export function figurVorschau(art, farbe, hut = 'eichel') {
  const pal = palKind(art, farbe);
  return hutAufsetzen(ausText([...(art === 'maedchen' ? M_UNTEN : KOPF_UNTEN), ...BEINE_V[0]], pal).bild(), hut, false, pal.y);
}

// ---------- Klingen, waagerecht nach rechts; Griff links ----------
const KLINGEN_FARBEN = [
  ['#d9ad6a', '#9a6d3a', '#6b4220'],   // Holz
  ['#f4f4f4', '#b8c0c8', '#8a6a30'],
  ['#e0ecf8', '#8ca4bc', '#4a5a6a'],
  ['#ffffff', '#a8b4c0', '#c9a03a'],
  ['#fff6c8', '#e0b84a', '#8a5a2c'],
  ['#e8fbff', '#5fd0f0', '#ffd23f'],
];
function klingenBilder() {
  G.klinge = KLINGE.reichweite.map((reich, st) => {
    const L = reich - 3, f = KLINGEN_FARBEN[st];
    const pb = new PB(L + 4, 9), m = 4;
    for (let x = 1; x <= 3; x++) pb.set(x, m, '#6b4220');        // Griff
    for (let y = m - 2; y <= m + 2; y++) pb.set(4, y, f[2]);       // Parierstange
    const breit = st === 3 || st === 5;
    for (let x = 5; x < L; x++) {
      pb.set(x, m, f[0]); pb.set(x, m + 1, f[1]);
      if (breit) pb.set(x, m - 1, f[0]);
    }
    pb.set(L, m, f[0]);                                             // Spitze
    if (st === 4) for (let x = L - 5; x < L; x++) pb.set(x, m - 1 - Math.floor((x - L + 5) / 2), f[0]); // Sichel
    pb.umriss('#2b1d16');
    return pb.bild();
  });
}

// ---------- Gras und Büsche ----------
function grasBild(saat, n, hMin, hMax, farben, breite, hoehe, aehren) {
  const r = zufall(saat), pb = new PB(breite, hoehe), basis = hoehe - 2;
  for (let i = 0; i < n; i++) {
    const q0 = i / (n - 1);
    const bx = 3 + (breite - 6) * q0 + (r() - 0.5) * 1.5;
    const hh = hMin + r() * (hMax - hMin) * (1 - Math.abs(q0 - 0.5) * 0.9);
    const neig = (bx - breite / 2) / (breite / 2) * 2.4 + (r() - 0.5);
    for (let t = 0; t < hh; t++) {
      const q = t / hh;
      pb.set(bx + neig * q * q, basis - t, q > 0.65 ? farben[2] : q > 0.25 ? farben[1] : farben[0]);
    }
    if (aehren && r() < 0.45) {
      pb.set(bx + neig, basis - hh, '#e8d47a');
      pb.set(bx + neig, basis - hh - 1, '#f4e49a');
    }
  }
  for (let x = 4; x < breite - 4; x++) pb.set(x, basis, farben[0]);
  pb.umriss('#24461f');
  return pb.bild();
}

function buschBild(saat, farben, extra) {
  const r = zufall(saat), pb = new PB(20, 17);
  for (const [cx, cy, rad] of [[10, 7, 5.5], [5.5, 10.5, 4.5], [14.5, 10.5, 4.5], [10, 11.5, 5]]) {
    pb.kreis(cx, cy, rad, schattiert(farben, r, 0.4));
  }
  extra.vor && extra.vor(pb, r);
  pb.umriss('#1c3618');
  extra.nach && extra.nach(pb, r);
  return pb.bild();
}

function blume(pb, x, y, blatt, mitte) {
  pb.set(x - 1, y, blatt); pb.set(x + 1, y, blatt); pb.set(x, y - 1, blatt); pb.set(x, y + 1, blatt);
  pb.set(x, y, mitte);
}

function bueschelBilder() {
  G.bueschel = [
    grasBild(11, 7, 5, 9, ['#3f8a37', '#5fb04a', '#9ad66a'], 16, 13, false),
    grasBild(23, 9, 9, 15, ['#3a7f3e', '#4d9a48', '#86c860'], 16, 19, true),
    buschBild(5, ['#23502a', '#337a38', '#4c9f45', '#7ccd5e'], {
      vor(pb, r) {
        for (let i = 0; i < 6; i++) {
          let x, y, n = 0;
          do { x = 3 + Math.floor(r() * 14); y = 3 + Math.floor(r() * 11); } while (!pb.get(x, y) && ++n < 20);
          blume(pb, x, y, i % 2 ? '#ff8fc8' : '#ffffff', '#ffe066');
        }
      },
    }),
    buschBild(9, ['#16301c', '#22462a', '#335f36', '#4f7f45'], {
      vor(pb, r) {
        for (let i = 0; i < 5; i++) {
          let x, y, n = 0;
          do { x = 4 + Math.floor(r() * 12); y = 4 + Math.floor(r() * 10); } while (!pb.get(x, y) && ++n < 20);
          pb.set(x, y, '#d8333f'); pb.set(x + 1, y, '#a01e2e'); pb.set(x, y - 1, '#ff8a8a');
        }
      },
      nach(pb, r) {
        // Dornen: ein paar Randpunkte nach außen verlängern
        for (let y = 0; y < pb.h; y++) for (let x = 0; x < pb.w; x++) {
          if (pb.get(x, y) !== '#1c3618' || r() > 0.18) continue;
          const dx = x < 10 ? -1 : 1, dy = y < 8 ? -1 : 0;
          if (!pb.get(x + dx, y + dy)) pb.set(x + dx, y + dy, '#e6dcb4');
        }
      },
    }),
  ];
  // Stoppeln, die nach dem Mähen stehen bleiben
  const pb = new PB(12, 5);
  for (const [x, h] of [[2, 2], [4, 1], [5, 2], [7, 1], [8, 2], [10, 1]]) {
    for (let t = 0; t < h; t++) pb.set(x, 3 - t, t === h - 1 ? '#c8d77a' : '#9fb550');
  }
  for (let x = 2; x <= 10; x++) pb.set(x, 4, '#6b8a35');
  G.stoppel = pb.bild();
}

// ---------- Bäume ----------
function baumBild(saat, sorte) {
  const r = zufall(saat), w = 40, h = 50, pb = new PB(w, h);
  const farben = [
    ['#1f4a26', '#2c7033', '#459a40', '#78c955'],
    ['#1a4430', '#276545', '#3a8a55', '#69bd76'],
    ['#38561f', '#527828', '#729c38', '#a3c955'],
  ][sorte];
  const sx = 17, sb = h - 3;
  for (let y = 28; y <= sb; y++) for (let x = sx; x < sx + 7; x++) {
    let c = x <= sx ? '#7a5232' : x >= sx + 5 ? '#4a2f1b' : '#5f3d23';
    if (r() < 0.12) c = '#3e2716';
    pb.set(x, y, c);
  }
  for (const [x, y, c] of [[sx - 1, sb, '#5f3d23'], [sx - 2, sb, '#4a2f1b'], [sx - 1, sb - 1, '#5f3d23'],
    [sx + 7, sb, '#4a2f1b'], [sx + 8, sb, '#4a2f1b'], [sx + 7, sb - 1, '#4a2f1b']]) pb.set(x, y, c);
  const j = () => (r() - 0.5) * 3;
  const klumpen = [[20, 8, 8], [13, 14, 9], [27, 14, 9], [9, 22, 8], [31, 22, 8], [20, 24, 11]];
  for (const [cx, cy, rad] of klumpen) pb.kreis(cx + j(), cy + j(), rad + j() * 0.4, schattiert(farben, r));
  pb.umriss('#152a16');
  return pb.bild();
}

// ---------- Das Zuhause: ein großer alter Baumstumpf ----------
function baumstumpf() {
  const w = 88, h = 80, cx = 44, r = zufall(77), pb = new PB(w, h);
  const rinde = ['#4a2e18', '#5e3b20', '#734a28', '#8a5c32'];
  const oben = 16, unten = 72;
  // Rumpf mit Rindenfurchen, links heller (Licht von links oben)
  for (let y = oben; y <= unten; y++) {
    const hw = 30 + Math.max(0, y - 58) * 0.8;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const q = (x - cx) / hw;
      let s = q < -0.7 ? 3 : q < -0.1 ? 2 : q < 0.55 ? 1 : 0;
      if (Math.sin(x * 1.3 + Math.sin(y * 0.15 + x) * 1.2) > 0.85) s = Math.max(0, s - 1);
      if (r() < 0.04) s = Math.max(0, s - 1);
      pb.set(x, y, rinde[s]);
    }
  }
  // Wurzeln
  const wurzel = (x0, dir, len) => {
    for (let i = 0; i < len; i++) {
      const x = x0 + dir * i, y = unten - 4 + Math.floor(i * 0.55);
      pb.set(x, y, rinde[2]); pb.set(x, y + 1, rinde[1]); pb.set(x, y + 2, rinde[0]);
    }
  };
  wurzel(cx - 30, -1, 10); wurzel(cx + 30, 1, 10); wurzel(cx - 20, -1, 6); wurzel(cx + 22, 1, 5);
  // Schnittfläche mit Jahresringen
  const rx = 30, ry = 9;
  for (let y = oben - ry; y <= oben + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
    const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - oben) / ry);
    if (d > 1) continue;
    let c;
    if (d > 0.86) c = rinde[2];
    else c = (d * 5) % 1 < 0.22 || d < 0.12 ? '#b98a55' : '#dcb57e';
    pb.set(x, y, c);
  }
  // Moos auf dem Rand, vorne hängt es ein Stück herunter
  for (let i = 0; i < 80; i++) {
    const a = r() * Math.PI * 2, f = 0.88 + r() * 0.16;
    const x = cx + Math.cos(a) * rx * f, y = oben + Math.sin(a) * ry * f;
    const c = r() < 0.5 ? '#5aa843' : '#3f8a37';
    pb.set(x, y, c); pb.set(x + 1, y, '#7cc95a');
    if (Math.sin(a) > 0.3 && r() < 0.5) for (let t = 1; t < 1 + r() * 5; t++) pb.set(x, y + t, '#3f8a37');
  }
  // Tür mit Rundbogen
  const tb = 18, th = 24, tx0 = cx - 9, ty1 = unten - 1, ty0 = ty1 - th, bogenY = ty0 + 9;
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x < tx0 + tb; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - bogenY;
    if (y < bogenY && dx * dx + dy * dy > 81) continue;
    const rand = x === tx0 || x === tx0 + tb - 1 || (y < bogenY && dx * dx + dy * dy > 56);
    pb.set(x, y, rand ? '#2e1a0b' : (x - tx0) % 4 === 0 ? '#4a2a12' : '#6a4020');
  }
  pb.set(cx + 5, ty0 + 14, '#ffd23f'); pb.set(cx + 5, ty0 + 15, '#c27512');
  pb.rechteck(cx - 11, unten, 22, 2, '#9a9488'); pb.rechteck(cx - 10, unten, 20, 1, '#bdb7aa');
  // Fenster
  const fenster = (fx, fy, fr) => {
    pb.kreis(fx, fy, fr + 1.3, '#2e1a0b');
    pb.kreis(fx, fy, fr, (x, y, nx, ny) => (nx * 0.5 + ny < -0.3 ? '#fff2b8' : '#ffcf6a'));
    for (let t = -fr; t < fr; t++) { pb.set(fx + t, fy - 0.5, '#2e1a0b'); pb.set(fx - 0.5, fy + t, '#2e1a0b'); }
  };
  fenster(cx - 18, 38, 6); fenster(cx + 19, 32, 4);
  // Laterne neben der Tür
  const lx = cx + 15, ly = unten - 24;
  pb.set(lx, ly - 2, '#2e1a0b'); pb.set(lx - 1, ly - 2, '#2e1a0b'); pb.set(lx - 2, ly - 2, '#2e1a0b');
  pb.rechteck(lx - 1, ly - 1, 3, 1, '#3a3a40');
  pb.rechteck(lx - 1, ly, 3, 4, '#ffe9a0'); pb.set(lx, ly + 1, '#fffbe0');
  pb.rechteck(lx - 1, ly + 4, 3, 1, '#3a3a40');
  // Ofenrohr
  for (let y = 2; y < oben - 2; y++) { pb.set(cx + 14, y, '#a9a9b2'); pb.set(cx + 15, y, '#7c7c84'); pb.set(cx + 16, y, '#5c5c64'); }
  pb.rechteck(cx + 13, 1, 5, 2, '#5c5c64'); pb.rechteck(cx + 13, 1, 5, 1, '#8c8c94');
  // Pilze an der Flanke
  for (const [mx, my] of [[cx - 31, 52], [cx - 28, 55], [cx + 29, 47]]) {
    pb.set(mx, my + 1, '#f3dfc0'); pb.set(mx, my + 2, '#f3dfc0');
    pb.rechteck(mx - 2, my, 5, 1, '#d8443c'); pb.rechteck(mx - 1, my - 1, 3, 1, '#d8443c'); pb.set(mx - 1, my, '#ffffff');
  }
  pb.umriss('#24150b');
  G.haus = pb.bild();
  // Lage einiger Punkte im Bild – für Licht am Abend und den Rauch
  G.hausInfo = { w, h, fussY: unten + 2, fenster: [[cx - 18, 38, 14], [cx + 19, 32, 10], [lx, ly + 2, 12]], rauch: [cx + 15, 1] };
}

// ---------- Gegner (schauen nach links) ----------
function gegnerBilder() {
  const sch = ausText([
    '......kkkkk...',
    '.....kaAAAak..',
    '....kaAmmaAak.',
    'k.k.kaAkkaAak.',
    'o.o..kAakAak..',
    'oooookkkkkkk..',
    'kooooooooooook',
    '.kkkkkkkkkkkk.',
  ], { k: '#2a2018', a: '#e7a74f', A: '#b56a2a', m: '#5aa843', o: '#b9d98a' }).bild();
  const pHum = { k: '#1c1712', Y: '#a24fe0', w: '#eaf6ff', W: '#bfe0f5', e: '#ffffff' };   // lila-schwarz gestreift
  const humA = ausText([
    '..ww...ww..',
    '.wWWw.wWWw.',
    '..wkkkkkw..',
    '.kYYkYYkYk.',
    'kYYYkYYkYek',
    'kYYYkYYkYYk',
    '.kYYkYYkYk.',
    '..kkkkkkk..',
    '....k......',
  ], pHum).bild();
  const humB = ausText([
    '...........',
    '...........',
    'wwwkkkkkwww',
    'WkYYkYYkYkW',
    'kYYYkYYkYek',
    'kYYYkYYkYYk',
    '.kYYkYYkYk.',
    '..kkkkkkk..',
    '....k......',
  ], pHum).bild();
  const pPilz = { k: '#2a1a14', R: '#d8443c', w: '#fff3e0', c: '#f3dfc0', e: '#1e1b30', f: '#8a6040' };
  const kappe = [
    '...kkkkkk...',
    '..kRRwRRRk..',
    '.kRwwRRRwRk.',
    'kRRRRRwwRRRk',
    'kRwRRRRRRwRk',
    'kkkkkkkkkkkk',
  ];
  const pilzA = ausText([...kappe, '..kcecceck..', '..kcccccck..', '...kkkkkk...', '...kf..fk...', '...kk..kk...'], pPilz).bild();
  const pilzB = ausText(['............', ...kappe, '..kcecceck..', '...kkkkkk...', '...kf..fk...', '...kk..kk...'], pPilz).bild();
  const satz = (bilder) => ({ l: bilder, r: bilder.map(spiegeln), lw: bilder.map(weiss), rw: bilder.map(b => weiss(spiegeln(b))) });
  G.gegner = { schnecke: satz([sch, sch]), hummel: satz([humA, humB]), pilz: satz([pilzA, pilzB]) };
}

// ---------- Kleinzeug: Diamanten, Herzen, Laden-Bilder ----------
const STEIN_MUSTER = ['..kkk..', '.kLwMk.', 'kLLMMDk', 'kLMMMDk', '.kMMDk.', '..kDk..', '...k...'];
const steinBild = (f) => ausText(STEIN_MUSTER, { k: '#1d1830', w: '#ffffff', L: f[0], M: f[1], D: f[2] }).bild();
const HERZ = ['.kkk.kkk.', 'kRRwkRRRk', 'kRwRRRRRk', 'kRRRRRRDk', '.kRRRRDk.', '..kRRDk..', '...kDk...', '....k....'];

function kleinBilder() {
  G.stein = STEINE.map(s => steinBild(s.farben));
  G.waehrung = steinBild(['#eaffff', '#7fe3ef', '#2a8fb0']);
  G.herz = ausText(HERZ, { k: '#2b1d16', R: '#ee3d4f', w: '#ffd0d6', D: '#a01e35' }).bild();
  G.herzLeer = ausText(HERZ, { k: '#2b1d16', R: '#5a4a48', w: '#6e5e5c', D: '#463836' }).bild();

  const ic = {};
  // Schwert-Bilder je Stufe
  ic.klinge = KLINGEN_FARBEN.map(f => {
    const pb = new PB(14, 14);
    for (let t = 0; t < 8; t++) { pb.set(4 + t, 9 - t, f[0]); pb.set(5 + t, 9 - t, f[1]); }
    for (const [x, y] of [[2, 8], [3, 9], [4, 10], [5, 11]]) pb.set(x, y, f[2]);
    pb.set(2, 11, '#6b4220'); pb.set(1, 12, '#6b4220');
    return pb.umriss('#2b1d16').bild();
  });
  ic.schwung = ausText(['....kkkk', '...kyyk.', '..kyyk..', '.kyyyykk', 'kkkyyyk.', '..kyyk..', '..kyk...', '.kyk....', '.kk.....'],
    { k: '#2b1d16', y: '#ffd23f' }).bild();
  ic.stiefel = ausText(['..kkkk....', '..kppk....', '..kppk....', '..kppk....', '..kppkkk..', '.kppppppk.', '.kPPPPPPPk', '.kkkkkkkkk'],
    { k: '#2b1d16', p: '#a8743e', P: '#6d4423' }).bild();
  ic.herz = G.herz;
  ic.magnet = ausText(['.......kk.', '......kwbk', '.....kwbbk', '....kwbbk.', '...kwbbk..', '..kwbbk...', '..kwbk....', '.kwk......', '.kk.......', 'k.........'],
    { k: '#14182e', w: '#ffffff', b: '#2c3e7a' }).bild();
  {
    const pb = new PB(13, 13);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; pb.set(6.5 + Math.cos(a) * 5.5, 6.5 + Math.sin(a) * 5.5, '#ffb43a'); }
    pb.kreis(6.5, 6.5, 3.6, (x, y, nx, ny) => (nx + ny < -0.6 ? '#fff6b0' : '#ffd23f'));
    ic.sonne = pb.umriss('#7a4a10').bild();
  }
  {
    const pb = new PB(13, 14);
    for (let t = 0; t < 4; t++) pb.set(7 + t * 0.5, 9 + t, '#3f8a37');
    for (const [x, y] of [[4, 4], [9, 4], [4, 8.5], [9, 8.5]]) pb.kreis(x, y, 2.7, (xx, yy, nx, ny) => (nx + ny < -0.4 ? '#9be36d' : '#4fb043'));
    ic.klee = pb.umriss('#1c3618').bild();
  }
  {
    const pb = new PB(14, 14);
    for (let a = 0; a < 5.4; a += 0.08) {
      pb.set(7 + Math.cos(a) * 5, 7 + Math.sin(a) * 5, '#bfe9ff');
      pb.set(7 + Math.cos(a) * 4, 7 + Math.sin(a) * 4, '#ffffff');
    }
    const a = 5.4; pb.set(7 + Math.cos(a) * 6, 7 + Math.sin(a) * 6 - 1, '#bfe9ff'); pb.set(7 + Math.cos(a) * 3, 7 + Math.sin(a) * 3 - 1, '#bfe9ff');
    ic.wirbel = pb.umriss('#1d3550').bild();
  }
  G.icons = ic;
}

export function initGrafik() {
  kindBilder();
  klingenBilder();
  bueschelBilder();
  G.baum = [baumBild(101, 0), baumBild(202, 1), baumBild(303, 2), baumBild(404, 0)];
  baumstumpf();
  gegnerBilder();
  kleinBilder();
}

// Bild für <img> in der Oberfläche
const urlCache = new Map();
export function bildURL(c) {
  if (!urlCache.has(c)) urlCache.set(c, c.toDataURL());
  return urlCache.get(c);
}

// ---------- Startbildschirm ----------
// Kleine Szene: der Held steht hinter Grasbüscheln (still, ohne Wiegen – Wunsch des Nutzers).
export const TITEL_B = 52, TITEL_H = 28;
export function titelSzeneMalen(g, held) {
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, TITEL_B, TITEL_H);
  const [klein, hoch] = G.bueschel;
  // hinten: hohes Gras links und rechts
  g.drawImage(hoch, 5, TITEL_H - hoch.height - 3);
  g.drawImage(hoch, TITEL_B - hoch.width - 5, TITEL_H - hoch.height - 4);
  g.fillStyle = 'rgba(20, 50, 20, 0.35)'; g.beginPath(); g.ellipse(26, 21.5, 7, 1.6, 0, 0, Math.PI * 2); g.fill();
  g.drawImage(held, 18, 6);
  // vorn: Büschel über den Beinen
  for (const [x, y] of [[0, 15], [12, 14], [24, 15], [36, 14]]) g.drawImage(klein, x, y);
}

// ---------- Logo „Bush & Loot“ in Pixelschrift ----------
// Eigene Buchstaben mit 2 px dicken Strichen, 8 Zeilen hoch (Kleinbuchstaben ab Zeile 2).
const SCHRIFT = {
  B: ['######.', '##...##', '##...##', '######.', '##...##', '##...##', '##...##', '######.'],
  u: ['......', '......', '##..##', '##..##', '##..##', '##..##', '##..##', '.#####'],
  s: ['......', '......', '.#####', '##....', '.####.', '....##', '....##', '#####.'],
  h: ['##....', '##....', '##.##.', '###.##', '##..##', '##..##', '##..##', '##..##'],
  '&': ['.###...', '##.##..', '##.##..', '.###..#', '##.####', '##..##.', '##..###', '.###..#'],
  L: ['##....', '##....', '##....', '##....', '##....', '##....', '##....', '######'],
  o: ['......', '......', '.####.', '##..##', '##..##', '##..##', '##..##', '.####.'],
  t: ['.##..', '.##..', '#####', '.##..', '.##..', '.##..', '.##..', '..###'],
  ' ': ['...', '...', '...', '...', '...', '...', '...', '...'],
};
// Farbverlauf je Zeile: oben hell, unten dunkel – „Bush“ grün wie Gras, „& Loot“ golden wie Beute
const LOGO_FARBEN = {
  gruen: ['#c8f59a', '#9be36d', '#7fd35a', '#5fb04a', '#5fb04a', '#4f9a3c', '#3f8a37', '#2f6e2a'],
  gold: ['#fff6c8', '#ffe680', '#ffd23f', '#ffd23f', '#f5b82a', '#e8a020', '#c27512', '#a05a0c'],
};
export function logoBild() {
  const text = 'Bush & Loot';
  const farbe = (i) => i < 4 ? 'gruen' : 'gold';
  let breite = 0;
  for (const z of text) breite += SCHRIFT[z][0].length + 1;
  const pb = new PB(breite + 3, 8 + 4);
  let x = 1;
  [...text].forEach((z, i) => {
    const gl = SCHRIFT[z], f = LOGO_FARBEN[farbe(i)];
    gl.forEach((zeile, y) => { for (let k = 0; k < zeile.length; k++) if (zeile[k] === '#') pb.set(x + k, y + 1, f[y]); });
    x += gl[0].length + 1;
  });
  pb.umriss('#2b1d16');
  // Schlagschatten: eine Zeile tiefer, dunkel
  const c = leinwand(pb.w, pb.h + 1), g = c.getContext('2d');
  const b = pb.bild();
  g.globalAlpha = 0.9; g.filter = 'brightness(0)'; g.drawImage(b, 1, 1);
  g.globalAlpha = 1; g.filter = 'none'; g.drawImage(b, 0, 0);
  return c;
}
