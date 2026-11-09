// stube.js – Das gemütliche Innere des Baumstumpfs, als kleines Pixelbild oben im Laden.
// Kamin mit flackerndem Feuer, rundes Fenster, Bett mit Flickendecke, Regal, Laterne, Teppich –
// und wer einen Begleiter hat, findet ihn auf dem Teppich. Drei Bilder fürs Feuerflackern.

import { leinwand } from './hilfe.js';

export const STUBE_B = 160, STUBE_H = 84;

function rechteck(g, x, y, w, h, f) { g.fillStyle = f; g.fillRect(x, y, w, h); }

function stubeMalen(bild, tier, nacht) {
  const c = leinwand(STUBE_B, STUBE_H), g = c.getContext('2d');
  const B = STUBE_B, H = STUBE_H;

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
    if (d > 0.78) f = '#e8b04a'; else if (d > 0.62) f = '#8a2e2a'; else if ((x + y) % 6 === 0) f = '#d8604a';
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
  for (const [x, y, w, h] of flammen) rechteck(g, x, y, w, h, '#e8402c');
  for (const [x, y, w, h] of flammen) rechteck(g, x + 1, y + 2, w - 2, h - 2, '#ff9a2a');
  for (const [x, y, w, h] of flammen) if (h > 6) rechteck(g, x + 1, y + 4, w - 2, h - 5, '#fff3a0');
  rechteck(g, 14, 63, 18, 2, '#5a3818'); rechteck(g, 16, 62, 6, 1, '#8c5a2c');
  // Topf überm Feuer
  rechteck(g, 22, 42, 1, 6, '#2b1d16');
  rechteck(g, 18, 48, 9, 5, '#2b2a30'); rechteck(g, 19, 48, 7, 1, '#55505f');
  // Dampf
  const dampf = [[22, 37], [21, 32], [23, 27]];
  dampf.forEach(([x, y], i) => { if ((i + bild) % 3 !== 2) rechteck(g, x + ((bild + i) % 2), y, 2, 2, 'rgba(240,235,225,0.55)'); });
  // Kaminsims: Kerze, kleiner Pilz, Becher
  rechteck(g, 8, 29, 2, 5, '#f4ece0'); rechteck(g, 8, 27, 2, 2, bild === 1 ? '#ffd23f' : '#ff9a2a');
  rechteck(g, 30, 30, 5, 2, '#d8443c'); rechteck(g, 31, 30, 1, 1, '#fff3e0'); rechteck(g, 32, 32, 1, 2, '#f3dfc0');
  rechteck(g, 36, 30, 4, 4, '#3d5fa8'); rechteck(g, 40, 31, 1, 2, '#3d5fa8');
  // Holzstapel neben dem Kamin
  for (const [x, y] of [[43, 58], [49, 58], [46, 53]]) {
    rechteck(g, x, y, 6, 5, '#6b4220'); rechteck(g, x + 1, y + 1, 4, 3, '#c08a52'); rechteck(g, x + 2, y + 2, 2, 1, '#8c5a2c');
  }

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
  if (nacht) { rechteck(g, fx + 4, fy - 7, 4, 4, '#fff6c8'); rechteck(g, fx + 5, fy - 6, 2, 2, '#ffffff'); rechteck(g, fx - 7, fy - 3, 1, 1, '#ffffff'); rechteck(g, fx - 3, fy + 5, 1, 1, '#ffffff'); }
  rechteck(g, fx - 1, fy - fr, 2, fr * 2, '#6b4220'); rechteck(g, fx - fr, fy - 1, fr * 2, 2, '#6b4220');
  // Fensterbank mit Blume und Diamantenglas
  rechteck(g, fx - 18, fy + fr + 3, 36, 3, '#6b4220'); rechteck(g, fx - 18, fy + fr + 3, 36, 1, '#a8703c');
  rechteck(g, fx - 14, fy + fr - 1, 6, 4, '#c0603a'); rechteck(g, fx - 12, fy + fr - 5, 1, 4, '#3f8a37');
  rechteck(g, fx - 14, fy + fr - 7, 2, 2, '#ff9bd0'); rechteck(g, fx - 11, fy + fr - 8, 2, 2, '#ff9bd0'); rechteck(g, fx - 12, fy + fr - 7, 1, 1, '#ffd23f');
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

  // Hocker mit Becher
  rechteck(g, 96, 58, 10, 2, '#8c5a2c'); rechteck(g, 97, 60, 2, 6, '#6b4220'); rechteck(g, 103, 60, 2, 6, '#6b4220');
  rechteck(g, 99, 54, 4, 4, '#f4ece0'); rechteck(g, 103, 55, 1, 2, '#f4ece0');
  if (bild !== 1) rechteck(g, 100, 51 - bild, 1, 2, 'rgba(240,235,225,0.6)');

  // Laterne an der Decke
  rechteck(g, 104, 0, 1, 9, '#2b1d16');
  rechteck(g, 101, 9, 7, 2, '#2b1d16'); rechteck(g, 101, 11, 7, 7, '#2b1d16'); rechteck(g, 102, 12, 5, 5, '#ffd76a'); rechteck(g, 103, 13, 3, 3, '#fff3c0');
  rechteck(g, 100, 18, 9, 1, '#2b1d16');

  // Begleiter auf dem Teppich
  if (tier) g.drawImage(tier, 70, 79 - tier.height);

  // Rund wie im Stamm: Ecken oben dunkel (Rinde), damit es wie die Höhlung des Stumpfs aussieht
  for (let y = 0; y < 20; y++) for (let x = 0; x < B; x++) {
    const dx = Math.abs(x + 0.5 - B / 2) / (B / 2);
    const rand = 20 * (1 - Math.sqrt(Math.max(0, 1 - dx * dx * dx * dx)));
    if (y < rand - 1) rechteck(g, x, y, 1, 1, '#3a2410');
    else if (y < rand) rechteck(g, x, y, 1, 1, '#5a3818');
  }

  // Warmes Licht von Feuer und Laterne
  g.globalCompositeOperation = 'lighter';
  const licht = (x, y, r, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(255, 170, 70, ${a})`); gr.addColorStop(1, 'rgba(255, 170, 70, 0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  licht(23, 56, 46, [0.28, 0.34, 0.24][bild]);
  licht(104, 15, 30, 0.22);
  licht(9, 26, 10, 0.25);
  g.globalCompositeOperation = 'source-over';
  // Dunklere Ecken für die Gemütlichkeit
  const v = g.createRadialGradient(B / 2, H * 0.6, H * 0.4, B / 2, H * 0.6, B * 0.75);
  v.addColorStop(0, 'rgba(30, 15, 5, 0)'); v.addColorStop(1, 'rgba(30, 15, 5, 0.45)');
  g.fillStyle = v; g.fillRect(0, 0, B, H);
  return c;
}

// Drei Bilder, je nach Begleiter und Tageszeit; neu gemalt nur, wenn sich davon etwas ändert
let vorrat = { tier: undefined, nacht: undefined, bilder: [] };
export function stubenBilder(tier, nacht) {
  if (vorrat.tier !== tier || vorrat.nacht !== nacht) vorrat = { tier, nacht, bilder: [0, 1, 2].map(i => stubeMalen(i, tier, nacht)) };
  return vorrat.bilder;
}
