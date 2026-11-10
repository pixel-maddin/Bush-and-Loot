// gebietgrafik.js – Bilder für Dunkelwald und Gebirge: Ruinen/Portale, Tannen, dunkle Bäume, umgefärbtes Gras,
// Fledermaus, Schneekugel, Eiskristall, Lagerfeuer, Leuchtpilze. Wie überall: alles aus Code.

import { G, PB, spiegeln, weiss } from './grafik.js';
import { leinwand, zufall } from './hilfe.js';

// Jeden Pixel eines Bildes umfärben (für dunkle Bäume und frostiges Gras)
function umfaerben(c, f) {
  const d = leinwand(c.width, c.height), g = d.getContext('2d');
  g.drawImage(c, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), p = img.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const [r, gg, b] = f(p[i], p[i + 1], p[i + 2]);
    p[i] = Math.max(0, Math.min(255, r)); p[i + 1] = Math.max(0, Math.min(255, gg)); p[i + 2] = Math.max(0, Math.min(255, b));
  }
  g.putImageData(img, 0, 0);
  return d;
}
const dunkel = (r, g, b) => [r * 0.42 + 6, g * 0.62 + 10, b * 0.85 + 30];
const frost = (r, g, b) => { const l = (r + g + b) / 3; return [l * 0.45 + 120, l * 0.45 + 132, l * 0.4 + 152]; };

// Tanne mit Schnee, gleiche Maße wie die Laubbäume (40 × 50, Stamm unten mittig)
function tanne(saat) {
  const r = zufall(saat), pb = new PB(40, 50);
  for (let y = 40; y < 48; y++) for (let x = 18; x < 22; x++) pb.set(x, y, x === 18 ? '#7a5232' : '#4a2f1b');
  const stufen = [[6, 13], [15, 16], [24, 18], [33, 19]];       // [oben, halbe Breite unten]
  for (const [oben, hb] of stufen) {
    for (let y = oben; y < oben + 12; y++) {
      const q = (y - oben) / 12, w = Math.max(1, hb * q + 1);
      for (let x = Math.round(20 - w); x <= Math.round(19 + w); x++) {
        const l = (x - 20) / (w + 0.01);
        let c = l < -0.3 ? '#3f7a5a' : l < 0.35 ? '#2c5e48' : '#1d4436';
        if (y - oben < 3 + r() * 2 || (y === oben + 11 && r() < 0.6)) c = l < 0.2 ? '#ffffff' : '#d8e8f4';   // Schnee
        pb.set(x, y, c);
      }
    }
  }
  pb.set(20, 4, '#ffffff'); pb.set(20, 5, '#d8e8f4'); pb.set(19, 5, '#ffffff');
  return pb.umriss('#14302a').bild();
}

// Ruine (noch nichts los) und erwachtes Portal: Steinbogen, 44 × 44, Fuß unten mittig
function bogen(ganz, farbe) {
  const pb = new PB(44, 44);
  const stein = ['#4e4b47', '#6a6762', '#8f8b85', '#a19d97'];
  const s = (x, y, w, h, i) => { pb.rechteck(x, y, w, h, stein[i]); pb.rechteck(x, y + h - 1, w, 1, stein[0]); };
  // Pfeiler
  for (let y = 12; y < 42; y += 5) { s(4, y, 8, 5, 1 + (y / 5) % 2); s(32, y, 8, 5, 2 - (y / 5) % 2); }
  if (ganz) {
    for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.12) {
      const x = 22 + Math.cos(a) * 15, y = 16 + Math.sin(a) * 12;
      pb.rechteck(Math.round(x) - 3, Math.round(y) - 2, 6, 5, stein[2]);
    }
    pb.rechteck(19, 1, 6, 4, stein[3]);                                     // Schlussstein
    pb.set(21, 2, farbe); pb.set(22, 2, farbe); pb.set(21, 3, farbe); pb.set(22, 3, farbe);
  } else {
    // eingestürzt: rechter Pfeiler kürzer, Bruchstücke, Moos
    for (let x = 31; x < 41; x++) for (let y = 12; y < 22; y++) pb.set(x, y, null);
    for (let a = Math.PI; a <= Math.PI * 1.45; a += 0.12) pb.rechteck(Math.round(22 + Math.cos(a) * 15) - 3, Math.round(16 + Math.sin(a) * 12) - 2, 6, 5, stein[2]);
    s(34, 38, 6, 4, 1); s(24, 39, 5, 3, 2); s(14, 40, 4, 3, 1);
  }
  for (const [x, y, w] of [[4, 12, 5], [32, 22, 6], [6, 30, 3], [36, 33, 3]]) pb.rechteck(x, y, w, 2, '#5aa843');
  return pb.umriss('#232120').bild();
}

// Fledermaus (Dunkelwald): zwei Flügelschläge
function fledermaus() {
  const bild = (oben) => {
    const pb = new PB(15, 9);
    for (const s of [-1, 1]) {
      const pts = oben ? [[1, 1], [2, 0], [3, 2], [5, 1], [6, 3]] : [[1, 6], [2, 7], [3, 5], [5, 6], [6, 4]];
      for (const [x, y] of pts) { pb.set(7 + s * x, y, '#3a2a4a'); pb.set(7 + s * x, y + 1, '#2a1e38'); }
      for (let x = 2; x <= 6; x++) pb.set(7 + s * x, oben ? 2 + (x % 2) : 5 - (x % 2), '#4a3860');
    }
    pb.kreis(7.5, 4.5, 2.4, '#3a2a4a');
    pb.set(6, 2, '#3a2a4a'); pb.set(9, 2, '#3a2a4a');
    pb.set(6, 4, '#ff5a5a'); pb.set(8, 4, '#ff5a5a');
    pb.set(7, 6, '#ffffff');
    return pb.umriss('#120a1a').bild();
  };
  const a = bild(true), b = bild(false);
  return { l: [a, b], r: [spiegeln(a), spiegeln(b)], lw: [weiss(a), weiss(b)], rw: [weiss(spiegeln(a)), weiss(spiegeln(b))] };
}

// Schneekugel mit bösem Gesicht (Gebirge): hüpft wie der Pilz
function schneekugel() {
  const bild = (gestaucht) => {
    const pb = new PB(14, 13);
    const ry = gestaucht ? 4.6 : 5.6, cy = 12.5 - ry;
    for (let y = 0; y < 13; y++) for (let x = 0; x < 14; x++) {
      const nx = (x + 0.5 - 7) / (gestaucht ? 6.4 : 5.8), ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      const l = -nx * 0.55 - ny * 0.85;
      pb.set(x, y, l > 0.5 ? '#ffffff' : l > -0.2 ? '#e4eef8' : '#b8cce0');
    }
    const ay = Math.round(cy);
    pb.rechteck(4, ay - 1, 2, 2, '#1e1b30'); pb.rechteck(8, ay - 1, 2, 2, '#1e1b30');
    pb.set(3, ay - 2, '#1e1b30'); pb.set(4, ay - 2, '#1e1b30'); pb.set(9, ay - 2, '#1e1b30'); pb.set(10, ay - 2, '#1e1b30');  // böse Brauen
    pb.set(5, ay + 2, '#1e1b30'); pb.set(6, ay + 1, '#1e1b30'); pb.set(7, ay + 1, '#1e1b30'); pb.set(8, ay + 2, '#1e1b30');   // grimmiger Mund
    return pb.umriss('#3a5470').bild();
  };
  const a = bild(false), b = bild(true);
  return { l: [a, b], r: [spiegeln(a), spiegeln(b)], lw: [weiss(a), weiss(b)], rw: [weiss(spiegeln(a)), weiss(spiegeln(b))] };
}

// Eiskristall (Spezialstein im Gebirge): sternförmig statt Diamantform
function eiskristall() {
  const pb = new PB(9, 9);
  for (let i = -3; i <= 3; i++) { pb.set(4 + i, 4, '#bfe9ff'); pb.set(4, 4 + i, '#bfe9ff'); }
  for (let i = -2; i <= 2; i++) { pb.set(4 + i, 4 + i, '#e8f8ff'); pb.set(4 + i, 4 - i, '#e8f8ff'); }
  pb.set(4, 4, '#ffffff'); pb.set(3, 3, '#ffffff');
  return pb.umriss('#2a5a8a').bild();
}

// Lagerfeuer am Portal im Gebirge: drei Bilder fürs Flackern
function lagerfeuer() {
  return [0, 1, 2].map(i => {
    const pb = new PB(16, 16);
    for (const [x, y] of [[2, 13], [5, 14], [9, 14], [12, 13]]) pb.rechteck(x, y, 3, 2, '#6d6a66');
    pb.rechteck(4, 12, 9, 2, '#6b4220'); pb.rechteck(3, 13, 10, 1, '#4a2e14');
    const h = [8, 10, 9][i], v = [0, 1, -1][i];
    for (let y = 0; y < h; y++) {
      const w = Math.max(1, Math.round((1 - y / h) * 4));
      for (let x = -w; x <= w; x++) pb.set(8 + x + (y > h / 2 ? v : 0), 11 - y, y < 2 ? '#e8402c' : Math.abs(x) < w - 1 ? '#fff3a0' : '#ff9a2a');
    }
    return pb.umriss('#2b1d16').bild();
  });
}

// Leuchtpilz (Schmuck im Dunkelwald)
function leuchtpilz(farbe) {
  const pb = new PB(7, 7);
  pb.kreis(3.5, 2.5, 2.6, (x, y, nx, ny) => (y > 2 ? null : nx + ny < -0.5 ? '#ffffff' : farbe));
  pb.rechteck(3, 3, 1, 4, '#d8d0e0');
  return pb.umriss('#1a1024').bild();
}

export function initGebietGrafik() {
  G.baumDunkel = G.baum.map(b => umfaerben(b, dunkel));
  G.tanne = [tanne(5), tanne(6), tanne(7), tanne(8)];
  G.bueschelGebiet = {
    dunkel: G.bueschel.map(b => umfaerben(b, dunkel)),
    berg: G.bueschel.map(b => umfaerben(b, frost)),
  };
  G.stoppelGebiet = { dunkel: umfaerben(G.stoppel, dunkel), berg: umfaerben(G.stoppel, frost) };
  G.ruine = bogen(false);
  G.portal = { dunkel: bogen(true, '#3ee8d0'), berg: bogen(true, '#bfe9ff') };
  G.gegner.fledermaus = fledermaus();
  G.gegner.schneekugel = schneekugel();
  G.stein[6] = eiskristall();
  G.feuer = lagerfeuer();
  G.leuchtpilz = [leuchtpilz('#3ee8d0'), leuchtpilz('#bb62ee'), leuchtpilz('#7ff0ff')];
  // Laden-Symbole für Fackel und Daunenjacke (ohne Symbol bricht der Aufbau der Warenliste ab)
  G.icons.fackel = G.belohnung.fackel;
  G.icons.jacke = daunenjacke();
}

function daunenjacke() {
  const pb = new PB(14, 13);
  for (let y = 2; y < 12; y++) {
    const w = y < 4 ? 4 : 6;
    for (let x = 7 - w; x < 7 + w; x++) pb.set(x, y, (y % 3 === 1) ? '#c8443c' : x < 7 ? '#f0645a' : '#d8503f');
  }
  for (let y = 4; y < 11; y++) { pb.set(0, y, '#c8443c'); pb.set(13, y, '#c8443c'); }      // Ärmel
  pb.rechteck(5, 0, 4, 3, '#f4ece0');                                                     // Kragen
  for (let y = 3; y < 12; y++) pb.set(7, y, '#7a2622');                                   // Reißverschluss
  return pb.umriss('#3a1410').bild();
}
