// stube.js – Das gemütliche Innere des Baumstumpfs, als kleines Pixelbild oben im Laden.
// Kamin mit flackerndem Feuer, rundes Fenster, Bett mit Flickendecke, Regal, Laterne, Teppich.
// Die Spielfigur sitzt im Ohrensessel am Kamin, daneben dampft der Tee; der Begleiter schläft
// auf dem Teppich. Drei Bilder fürs Feuerflackern.

import { leinwand } from './hilfe.js';

export const STUBE_B = 160, STUBE_H = 84;

function rechteck(g, x, y, w, h, f) { g.fillStyle = f; g.fillRect(x, y, w, h); }

function stubeMalen(bild, tier, nacht, held, m = {}) {
  const c = leinwand(STUBE_B, STUBE_H), g = c.getContext('2d');
  const B = STUBE_B, H = STUBE_H;
  const leuchten = [];                                  // Feuer, Kerzen, Laterne, Lichter: bleiben nachts hell
  const glimm = (x, y, w, h, f) => { rechteck(g, x, y, w, h, f); leuchten.push([x, y, w, h, f]); };

  // Rückwand: senkrechte Bretter aus dem Stamm, mit Maserung
  for (let x = 0; x < B; x++) {
    const brett = Math.floor(x / 11), fuge = x % 11 === 0;
    const ton = ['#a8703c', '#b07842', '#9e6834'][brett % 3];
    rechteck(g, x, 0, 1, 66, fuge ? '#7a4a22' : ton);
  }
  for (let i = 0; i < 70; i++) {                       // Maserung und Astlöcher
    const x = (i * 37) % B, y = (i * 23) % 60 + 2;
    rechteck(g, x, y, 1, 3 + (i % 4), '#8c5a2c');
    if (i % 17 === 0) { rechteck(g, x - 1, y, 3, 2, '#6b4220'); rechteck(g, x, y, 1, 1, '#4a2e14'); }
  }
  // Boden: Dielen
  for (let y = 66; y < H; y++) for (let x = 0; x < B; x++) {
    const reihe = Math.floor((y - 66) / 4), fuge = (y - 66) % 4 === 3 || (x + reihe * 13) % 29 === 0;
    rechteck(g, x, y, 1, 1, fuge ? '#5a3818' : reihe % 2 ? '#8c5a2c' : '#7e5028');
  }
  rechteck(g, 0, 65, B, 1, '#4a2e14');

  // Teppich
  for (let y = 68; y < 82; y++) for (let x = 46; x < 122; x++) {
    const dx = (x - 84) / 37, dy = (y - 75) / 7;
    const d = dx * dx + dy * dy;
    if (d > 1) continue;
    let f = '#b8463a';
    if (m.teppich) f = ['#e8402c', '#ff9a2a', '#ffd23f', '#5aaa46', '#3d7ad8', '#9256c8'][Math.min(5, Math.floor(d * 6))];
    else if (d > 0.78) f = '#e8b04a'; else if (d > 0.62) f = '#8a2e2a'; else if ((x + y) % 6 === 0) f = '#d8604a';
    rechteck(g, x, y, 1, 1, f);
  }

  // Kamin links: Steine, Öffnung, Feuer, Holzstapel
  const steine = ['#7d7a76', '#8f8b85', '#6a6762', '#a19d97'];
  for (let y = 4; y < 66; y += 4) for (let x = 4; x < 42; x += 6) {
    const breit = y < 34 ? (x >= 12 && x < 34) : true;
    if (!breit) continue;
    const off = (y / 4) % 2 ? 3 : 0;
    rechteck(g, x + off, y, 6, 4, steine[(x + y) % 4]);
    rechteck(g, x + off, y + 3, 6, 1, '#4e4b47');
    rechteck(g, x + off + 5, y, 1, 4, '#4e4b47');
  }
  rechteck(g, 4, 34, 38, 3, '#5c3a1c');                  // Kaminsims
  rechteck(g, 4, 34, 38, 1, '#8c5a2c');
  rechteck(g, 12, 42, 22, 24, '#1a1010');                // Feueröffnung
  rechteck(g, 12, 42, 22, 2, '#3a2420');
  // Feuer (drei Bilder)
  const flammen = [
    [[16, 58, 4, 6], [20, 54, 5, 10], [25, 57, 4, 7], [18, 61, 10, 3]],
    [[15, 57, 4, 7], [20, 52, 5, 12], [25, 56, 4, 8], [18, 61, 10, 3]],
    [[17, 56, 4, 8], [21, 55, 4, 9], [24, 54, 5, 10], [18, 61, 10, 3]],
  ][bild];
  for (const [x, y, w, h] of flammen) glimm(x, y, w, h, '#e8402c');
  for (const [x, y, w, h] of flammen) glimm(x + 1, y + 2, w - 2, h - 2, '#ff9a2a');
  for (const [x, y, w, h] of flammen) if (h > 6) glimm(x + 1, y + 4, w - 2, h - 5, '#fff3a0');
  rechteck(g, 14, 63, 18, 2, '#5a3818'); rechteck(g, 16, 62, 6, 1, '#8c5a2c');
  // Topf überm Feuer
  rechteck(g, 22, 42, 1, 6, '#2b1d16');
  rechteck(g, 18, 48, 9, 5, '#2b2a30'); rechteck(g, 19, 48, 7, 1, '#55505f');
  // Dampf
  const dampf = [[22, 37], [21, 32], [23, 27]];
  dampf.forEach(([x, y], i) => { if ((i + bild) % 3 !== 2) rechteck(g, x + ((bild + i) % 2), y, 2, 2, 'rgba(240,235,225,0.55)'); });
  // Kaminsims: Kerze, kleiner Pilz, Becher
  rechteck(g, 8, 29, 2, 5, '#f4ece0'); glimm(8, 27, 2, 2, bild === 1 ? '#ffd23f' : '#ff9a2a');
  rechteck(g, 30, 30, 5, 2, '#d8443c'); rechteck(g, 31, 30, 1, 1, '#fff3e0'); rechteck(g, 32, 32, 1, 2, '#f3dfc0');
  rechteck(g, 36, 30, 4, 4, '#3d5fa8'); rechteck(g, 40, 31, 1, 2, '#3d5fa8');

  // Rundes Fenster in der Mitte
  const fx = 80, fy = 26, fr = 13;
  for (let y = fy - fr - 3; y <= fy + fr + 3; y++) for (let x = fx - fr - 3; x <= fx + fr + 3; x++) {
    const d = Math.hypot(x + 0.5 - fx, y + 0.5 - fy);
    if (d > fr + 3) continue;
    if (d > fr) { rechteck(g, x, y, 1, 1, d > fr + 2 ? '#4a2e14' : '#6b4220'); continue; }
    let f = nacht ? (y < fy ? '#1e2a5a' : '#2a3a6e') : (y < fy - 4 ? '#8fd0f2' : '#b4e2f6');
    // Blätter draußen
    if (!nacht && ((x - fx + 12) * (x - fx + 12) + (y - fy + 9) * (y - fy + 9) < 30 || (x - fx - 9) ** 2 + (y - fy + 11) ** 2 < 20)) f = (x + y) % 3 ? '#5aaa46' : '#3f8a37';
    rechteck(g, x, y, 1, 1, f);
  }
  if (nacht) { glimm(fx + 4, fy - 7, 4, 4, '#fff6c8'); glimm(fx + 5, fy - 6, 2, 2, '#ffffff'); glimm(fx - 7, fy - 3, 1, 1, '#ffffff'); glimm(fx - 3, fy + 5, 1, 1, '#ffffff'); }
  rechteck(g, fx - 1, fy - fr, 2, fr * 2, '#6b4220'); rechteck(g, fx - fr, fy - 1, fr * 2, 2, '#6b4220');
  // Fensterbank mit Blume und Diamantenglas
  rechteck(g, fx - 18, fy + fr + 3, 36, 3, '#6b4220'); rechteck(g, fx - 18, fy + fr + 3, 36, 1, '#a8703c');
  rechteck(g, fx - 8, fy + fr - 1, 6, 4, '#c0603a'); rechteck(g, fx - 6, fy + fr - 5, 1, 4, '#3f8a37');
  rechteck(g, fx - 8, fy + fr - 7, 2, 2, '#ff9bd0'); rechteck(g, fx - 5, fy + fr - 8, 2, 2, '#ff9bd0'); rechteck(g, fx - 6, fy + fr - 7, 1, 1, '#ffd23f');
  rechteck(g, fx + 7, fy + fr - 6, 8, 9, '#cfe8f0'); rechteck(g, fx + 7, fy + fr - 7, 8, 1, '#8c5a2c');
  for (const [x, y, f] of [[9, -3, '#5fd35a'], [12, -2, '#4aa3f5'], [10, 0, '#f04f5a'], [13, 1, '#bb62ee'], [8, 1, '#ffd23f']]) rechteck(g, fx + x, fy + fr + y, 2, 2, f);
  if (bild === 2) rechteck(g, fx + 13, fy + fr - 4, 1, 1, '#ffffff');

  // Regal rechts oben mit Büchern, Glas, Pilz
  rechteck(g, 110, 30, 44, 3, '#6b4220'); rechteck(g, 110, 30, 44, 1, '#a8703c');
  [['#b8463a', 6], ['#3d5fa8', 7], ['#e8b04a', 5], ['#5aaa46', 7]].forEach(([f, h], i) => {
    rechteck(g, 113 + i * 4, 30 - h, 3, h, f); rechteck(g, 113 + i * 4, 30 - h + 1, 3, 1, 'rgba(255,255,255,0.35)');
  });
  rechteck(g, 131, 23, 6, 7, '#e8d8a8'); rechteck(g, 131, 22, 6, 1, '#8c5a2c'); rechteck(g, 132, 25, 4, 4, '#f5c542');
  rechteck(g, 141, 25, 7, 3, '#d8443c'); rechteck(g, 142, 25, 1, 1, '#fff3e0'); rechteck(g, 144, 28, 2, 2, '#f3dfc0');

  // Bett mit Flickendecke
  rechteck(g, 112, 46, 4, 20, '#5a3818');                    // Kopfteil
  rechteck(g, 112, 46, 4, 2, '#8c5a2c');
  rechteck(g, 116, 56, 40, 8, '#6b4220');                    // Gestell
  rechteck(g, 154, 52, 3, 14, '#5a3818');
  rechteck(g, 116, 54, 38, 3, '#f4ece0');                    // Laken
  rechteck(g, 117, 50, 11, 5, '#ffffff'); rechteck(g, 117, 54, 11, 1, '#d8d0c4');   // Kissen
  const flicken = ['#d8604a', '#e8b04a', '#6aa84f', '#4a7ac0', '#bb62ee', '#f4a0a0'];
  for (let y = 52; y < 60; y += 4) for (let x = 128; x < 154; x += 4) rechteck(g, x, y, 4, 4, flicken[((x >> 2) + (y >> 2)) % flicken.length]);
  for (let x = 128; x < 154; x += 2) rechteck(g, x, 59, 1, 1, '#f4ece0');
  rechteck(g, 116, 64, 2, 2, '#4a2e14'); rechteck(g, 152, 64, 2, 2, '#4a2e14');

  // Ohrensessel am Kamin, darin die Spielfigur. Klein gehalten (Lehne 19 × 16), damit der Held
  // nicht darin versinkt – der Kopf schaut über die Lehne. Steht mit kurzen Füßen auf den Dielen
  // (Fuß bei y 68), sonst wirkte er, als schwebe er vor der Wand.
  const sy = 4;                                                 // so weit tiefer als früher
  const stoff = ['#7a2622', '#a83a32', '#c4544a'];
  g.fillStyle = 'rgba(30, 15, 5, 0.35)'; g.beginPath(); g.ellipse(57.5, 68.5, 14, 2.2, 0, 0, Math.PI * 2); g.fill();   // Schatten
  for (let y = 45 + sy; y < 60 + sy; y++) {                     // Rückenlehne, oben gerundet
    const ein = y === 45 + sy ? 3 : y === 46 + sy ? 1 : 0;
    rechteck(g, 48 + ein, y, 19 - ein * 2, 1, y === 45 + sy ? stoff[2] : stoff[1]);
  }
  rechteck(g, 48, 47 + sy, 1, 13, stoff[0]); rechteck(g, 66, 47 + sy, 1, 13, stoff[0]);
  if (held) g.drawImage(held, 0, 0, 16, 12, 49, 41 + sy, 16, 12);   // Kopf und Oberkörper, der Rest steckt im Sessel
  rechteck(g, 50, 53 + sy, 15, 5, stoff[2]); rechteck(g, 50, 53 + sy, 15, 1, '#e07a6a');      // Sitzkissen
  rechteck(g, 53, 55 + sy, 3, 3, '#6d4423'); rechteck(g, 59, 55 + sy, 3, 3, '#6d4423');       // Beine
  rechteck(g, 53, 58 + sy, 3, 2, '#2b1d16'); rechteck(g, 59, 58 + sy, 3, 2, '#2b1d16');       // Schuhe baumeln
  for (const ax of [45, 64]) {                                  // Armlehnen
    rechteck(g, ax, 51 + sy, 6, 10, stoff[1]); rechteck(g, ax, 51 + sy, 6, 2, stoff[2]); rechteck(g, ax + 1, 50 + sy, 4, 1, stoff[2]);
    rechteck(g, ax, 60 + sy, 6, 1, stoff[0]);
  }
  rechteck(g, 46, 61 + sy, 2, 3, '#4a2e14'); rechteck(g, 67, 61 + sy, 2, 3, '#4a2e14');       // kurze Füße
  // Hocker mit dampfendem Tee neben dem Sessel, ebenfalls auf den Dielen
  const hy = 3;
  g.fillStyle = 'rgba(30, 15, 5, 0.3)'; g.fillRect(72, 69, 10, 1);
  rechteck(g, 72, 58 + hy, 10, 2, '#8c5a2c'); rechteck(g, 73, 60 + hy, 2, 6, '#6b4220'); rechteck(g, 79, 60 + hy, 2, 6, '#6b4220');
  rechteck(g, 74, 54 + hy, 5, 4, '#f4ece0'); rechteck(g, 79, 55 + hy, 1, 2, '#f4ece0'); rechteck(g, 74, 54 + hy, 5, 1, '#c0603a');
  const dampfT = [[76, 51 + hy - bild], [75 + (bild % 2), 48 + hy - bild], [77, 45 + hy - bild]];
  dampfT.forEach(([x, y], i) => { if ((i + bild) % 3 !== 1) rechteck(g, x, y, 1, 2, 'rgba(240,235,225,0.65)'); });

  if (m.leuchter) {
    // Goldleuchter mit fünf Kerzen
    rechteck(g, 104, 0, 1, 7, '#8a6a20');
    rechteck(g, 94, 10, 21, 2, '#c8981e'); rechteck(g, 96, 12, 17, 1, '#8a6a20'); rechteck(g, 102, 7, 5, 3, '#ffd23f');
    for (const x of [94, 99, 104, 109, 114]) { rechteck(g, x, 6, 1, 4, '#f4ece0'); glimm(x, 4 + (bild + x) % 2, 1, 2, '#ffd76a'); }
  } else {
    // Laterne an der Decke
    rechteck(g, 104, 0, 1, 9, '#2b1d16');
    rechteck(g, 101, 9, 7, 2, '#2b1d16'); rechteck(g, 101, 11, 7, 7, '#2b1d16'); glimm(102, 12, 5, 5, '#ffd76a'); glimm(103, 13, 3, 3, '#fff3c0');
    rechteck(g, 100, 18, 9, 1, '#2b1d16');
  }
  if (m.uhr) {
    // Kuckucksuhr mit schwingendem Pendel
    rechteck(g, 98, 24, 10, 10, '#5a3818'); rechteck(g, 99, 25, 8, 8, '#8c5a2c'); rechteck(g, 97, 22, 12, 2, '#4a2e14');
    rechteck(g, 101, 27, 4, 4, '#f4ece0'); rechteck(g, 103, 28, 1, 2, '#2b1d16'); rechteck(g, 103, 29, 2, 1, '#2b1d16');
    const px = 103 + [-2, 0, 2][bild]; rechteck(g, 103, 34, 1, 5, '#c8981e'); rechteck(g, px - 1, 39, 3, 3, '#ffd23f');
  }
  if (m.bild) {
    // Gemälde über dem Bett
    rechteck(g, 124, 35, 24, 10, '#c8981e'); rechteck(g, 125, 36, 22, 8, '#ff9a52');
    rechteck(g, 125, 40, 22, 4, '#3f8a37'); rechteck(g, 136, 37, 4, 3, '#ffd23f');
    for (const x of [127, 131, 141, 145]) rechteck(g, x, 38, 2, 4, '#2a5e28');
  }
  if (m.pflanze) {
    // große Zimmerpflanze zwischen Hocker und Bett
    rechteck(g, 102, 58, 8, 8, '#c0603a'); rechteck(g, 102, 58, 8, 1, '#e07a4a');
    for (const [x, y, w, h] of [[98, 48, 6, 4], [106, 46, 6, 5], [101, 42, 6, 5], [107, 52, 5, 4], [96, 53, 5, 4]]) { rechteck(g, x, y, w, h, '#3f8a37'); rechteck(g, x + 1, y + 1, w - 2, 1, '#6aa84f'); }
    rechteck(g, 105, 47, 1, 11, '#2a5e28');
  }

  // Begleiter schläft auf dem Teppich, kleine „z“ steigen auf
  if (m.korb) {
    for (let x = 86; x < 111; x++) { const h = 4 - Math.round(Math.abs(x - 98.5) / 6); rechteck(g, x, 76 - h, 1, h + 3, x % 3 ? '#a8703c' : '#7a4a22'); }
    rechteck(g, 88, 74, 21, 2, '#f4a0b8');
  }
  if (tier) {
    const tx = 98 - Math.round(tier.width / 2), ty = (m.korb ? 76 : 78) - tier.height;
    g.drawImage(tier, tx, ty);
    const zs = [[0, 0], [3, -5], [7, -10]];
    zs.forEach(([zx, zy], i) => {
      if ((i + bild) % 3 === 2) return;
      const x = tx + 2 + zx, y = ty - 3 + zy - bild;
      rechteck(g, x, y, 3, 1, '#fff3d8'); rechteck(g, x + 1, y + 1, 1, 1, '#fff3d8'); rechteck(g, x, y + 2, 3, 1, '#fff3d8');
    });
  }

  // Rund wie im Stamm: Ecken oben dunkel (Rinde), damit es wie die Höhlung des Stumpfs aussieht
  for (let y = 0; y < 20; y++) for (let x = 0; x < B; x++) {
    const dx = Math.abs(x + 0.5 - B / 2) / (B / 2);
    const rand = 20 * (1 - Math.sqrt(Math.max(0, 1 - dx * dx * dx * dx)));
    if (y < rand - 1) rechteck(g, x, y, 1, 1, '#3a2410');
    else if (y < rand) rechteck(g, x, y, 1, 1, '#5a3818');
  }

  if (m.lichter) {
    const farben = ['#ff5a5a', '#ffd23f', '#5ae05a', '#5aa8ff', '#e07aff'];
    for (let i = 0; i < 26; i++) {
      const x = 14 + i * 5.3, dx = Math.abs(x + 0.5 - B / 2) / (B / 2);
      const y = Math.round(20 * (1 - Math.sqrt(Math.max(0, 1 - dx * dx * dx * dx))) + 3 + (i % 2) * 2);
      rechteck(g, Math.round(x), y - 1, 1, 1, '#2b1d16');
      glimm(Math.round(x), y, 2, 2, (i + bild) % 4 === 0 ? '#ffffff' : farben[i % 5]);
    }
  }
  // Nachts: alles in tiefes Blau-Violett tauchen, dann die leuchtenden Dinge wieder hell drüber
  if (nacht) {
    g.globalCompositeOperation = 'multiply';            // multiplizieren statt überdecken: Farben bleiben satt
    g.fillStyle = '#8676aa'; g.fillRect(0, 0, B, H);       // heller als zuerst (#5a4a80 war dem Nutzer zu düster)
    g.globalCompositeOperation = 'source-over';
    for (const [x, y, w, h, f] of leuchten) rechteck(g, x, y, w, h, f);
  }
  // Warmes Licht von Feuer und Laterne (nachts kräftiger, damit es nach Kaminabend aussieht)
  g.globalCompositeOperation = 'lighter';
  const licht = (x, y, r, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(255, 170, 70, ${a})`); gr.addColorStop(1, 'rgba(255, 170, 70, 0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  if (nacht) {
    licht(23, 56, 70, [0.34, 0.42, 0.3][bild]);                 // Kamin wärmt den ganzen linken Raum
    licht(23, 56, 26, [0.3, 0.38, 0.26][bild]);
    licht(104, m.leuchter ? 9 : 15, 34, m.leuchter ? 0.32 : 0.24);
    licht(9, 26, 14, 0.32);
    if (m.lichter) licht(B / 2, 8, 60, 0.1);
  } else {
    licht(23, 56, 46, [0.28, 0.34, 0.24][bild]);
    licht(104, 15, 30, 0.22);
    licht(9, 26, 10, 0.25);
  }
  g.globalCompositeOperation = 'source-over';
  // Dunklere Ecken für die Gemütlichkeit
  const v = g.createRadialGradient(B / 2, H * 0.6, H * 0.4, B / 2, H * 0.6, B * 0.75);
  v.addColorStop(0, 'rgba(30, 15, 5, 0)'); v.addColorStop(1, nacht ? 'rgba(8, 4, 16, 0.5)' : 'rgba(30, 15, 5, 0.45)');
  g.fillStyle = v; g.fillRect(0, 0, B, H);
  return c;
}

// Drei Bilder, je nach Begleiter und Tageszeit; neu gemalt nur, wenn sich davon etwas ändert
let vorrat = { tier: undefined, nacht: undefined, held: undefined, moebel: '', bilder: [] };
export function stubenBilder(tier, nacht, held, moebel = {}) {
  const mk = Object.keys(moebel).filter(k => moebel[k]).sort().join(',');
  if (vorrat.tier !== tier || vorrat.nacht !== nacht || vorrat.held !== held || vorrat.moebel !== mk) {
    vorrat = { tier, nacht, held, moebel: mk, bilder: [0, 1, 2].map(i => stubeMalen(i, tier, nacht, held, moebel)) };
  }
  return vorrat.bilder;
}
