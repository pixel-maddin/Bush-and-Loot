// welt.js – Die Lichtung: Boden, Bäume, Teiche, Wege, der Baumstumpf.
// Alles aus einem festen Startwert, damit der Wald jeden Tag gleich aussieht.
// Nur das Gras wächst jeden Morgen neu (spiel.js).

import { KACHEL as K, KARTE_B as B, KARTE_H as H } from './config.js';
import { zufall, hexRgb, leinwand } from './hilfe.js';
import { G } from './grafik.js';

export const BODEN = { GRAS: 0, WEG: 1, WASSER: 2 };

export function baueWelt(saat) {
  const r = zufall(saat);
  const boden = new Uint8Array(B * H);
  const fest = new Uint8Array(B * H);   // hier kommt keiner durch
  const sperr = new Uint8Array(B * H);  // hier wächst kein Gras
  const id = (x, y) => y * B + x;
  const baeume = [], felsen = [];

  // Waldrand
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
    if (x < 2 || y < 2 || x >= B - 2 || y >= H - 2) { fest[id(x, y)] = 1; sperr[id(x, y)] = 1; }
  }

  // Der Baumstumpf: 5 × 4 Kacheln, Tür unten in der Mitte
  const haus = { tx: 20, ty: 17, tb: 5, th: 4 };
  for (let y = haus.ty; y < haus.ty + haus.th; y++) for (let x = haus.tx; x < haus.tx + haus.tb; x++) {
    fest[id(x, y)] = 1; sperr[id(x, y)] = 1;
  }
  haus.x = (haus.tx + haus.tb / 2) * K;      // Mitte unten in Weltpixeln
  haus.y = (haus.ty + haus.th) * K;
  haus.tuer = { x: haus.x, y: haus.y };
  const start = { x: haus.x, y: haus.y + 20 };

  // Eingang der Glitzerhöhle: Felswand oben am Waldrand, 5 × 3 Kacheln, Tür unten in der Mitte
  const hoehle = { tx: 29, ty: 2, tb: 5, th: 3 };
  for (let y = hoehle.ty; y < hoehle.ty + hoehle.th; y++) for (let x = hoehle.tx; x < hoehle.tx + hoehle.tb; x++) {
    fest[id(x, y)] = 1; sperr[id(x, y)] = 1;
  }
  hoehle.x = (hoehle.tx + hoehle.tb / 2) * K;
  hoehle.y = (hoehle.ty + hoehle.th) * K;
  hoehle.tuer = { x: hoehle.x, y: hoehle.y };

  // Weg: von der Tür nach unten, dann nach links und rechts
  const weg = (x, y) => { if (x > 2 && y > 2 && x < B - 3 && y < H - 3) { boden[id(x, y)] = BODEN.WEG; sperr[id(x, y)] = 1; } };
  for (let y = haus.ty + haus.th; y < haus.ty + haus.th + 4; y++) { weg(22, y); }
  for (const dir of [-1, 1]) {
    let x = 22, y = haus.ty + haus.th + 3;
    for (let i = 0; i < 14; i++) {
      x += dir; if (r() < 0.3) y += r() < 0.5 ? -1 : 1;
      y = Math.max(haus.ty + haus.th + 1, Math.min(H - 5, y));
      weg(x, y);
    }
  }
  // Kleiner Pfad vor dem Höhleneingang
  for (let y = hoehle.ty + hoehle.th; y < hoehle.ty + hoehle.th + 5; y++) { weg(31, y); if (y < hoehle.ty + hoehle.th + 2) { weg(30, y); weg(32, y); } }
  // Pfad, der um den Stumpf herumführt
  for (let x = haus.tx - 1; x <= haus.tx + haus.tb; x++) weg(x, haus.ty + haus.th);

  // Teiche
  const teiche = [[9 + r() * 4, 9 + r() * 4, 2.6], [31 + r() * 4, 30 + r() * 4, 3.3], [8 + r() * 3, 33 + r() * 3, 2.2]];
  for (const [mx, my, mr] of teiche) {
    for (let y = Math.floor(my - mr - 2); y <= my + mr + 2; y++) for (let x = Math.floor(mx - mr - 2); x <= mx + mr + 2; x++) {
      const a = Math.atan2(y - my, x - mx), rr = mr * (1 + 0.22 * Math.sin(a * 3 + mx));
      if (Math.hypot(x + 0.5 - mx, y + 0.5 - my) <= rr && x > 2 && y > 2 && x < B - 3 && y < H - 3) {
        boden[id(x, y)] = BODEN.WASSER; fest[id(x, y)] = 1; sperr[id(x, y)] = 1;
      }
    }
  }

  // Bäume auf der Lichtung (Stamm = feste Kachel)
  const hausMx = haus.tx + 2.5, hausMy = haus.ty + 2;
  for (let n = 0, gesetzt = 0; n < 400 && gesetzt < 34; n++) {
    const x = 3 + Math.floor(r() * (B - 6)), y = 3 + Math.floor(r() * (H - 6));
    if (Math.hypot(x - hausMx, y - hausMy) < 6) continue;
    let frei = true;
    for (let j = -1; j <= 1 && frei; j++) for (let i = -1; i <= 1; i++) if (sperr[id(x + i, y + j)]) { frei = false; break; }
    if (!frei) continue;
    fest[id(x, y)] = 1; sperr[id(x, y)] = 1;
    baeume.push({ x: x * K + 8, y: y * K + 14, v: Math.floor(r() * G.baum.length) });
    gesetzt++;
  }
  // Waldrand: dichte Bäume rundherum
  const randBaum = (x, y) => baeume.push({ x, y, v: Math.floor(r() * G.baum.length), rand: true });
  for (let x = -8; x < B * K + 8; x += 13 + r() * 6) {
    randBaum(x, 6 + r() * 10); randBaum(x + 7, 22 + r() * 6);
    randBaum(x, H * K - 2 - r() * 4); randBaum(x + 7, H * K - 16 - r() * 6);
  }
  for (let y = 30; y < H * K - 20; y += 13 + r() * 6) {
    randBaum(4 + r() * 10, y); randBaum(22 + r() * 6, y + 7);
    randBaum(B * K - 4 - r() * 10, y); randBaum(B * K - 22 - r() * 6, y + 7);
  }

  // Felsen
  for (let n = 0, gesetzt = 0; n < 200 && gesetzt < 10; n++) {
    const x = 3 + Math.floor(r() * (B - 6)), y = 3 + Math.floor(r() * (H - 6));
    if (sperr[id(x, y)] || Math.hypot(x - hausMx, y - hausMy) < 5) continue;
    fest[id(x, y)] = 1; sperr[id(x, y)] = 1;
    felsen.push({ x: x * K, y: y * K, v: r() });
    gesetzt++;
  }

  const welt = { b: B, h: H, boden, fest, sperr, baeume, felsen, haus, hoehle, start, saat };
  welt.bodenBild = maleBoden(welt, zufall(saat + 1));
  welt.wasser = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) if (boden[id(x, y)] === BODEN.WASSER) welt.wasser.push(x, y);
  return welt;
}

// Den ganzen Boden einmal in ein großes Bild malen – danach kostet er pro Bild nur einen drawImage.
function maleBoden(W, r) {
  const bw = B * K, bh = H * K;
  const c = leinwand(bw, bh), g = c.getContext('2d');
  const img = g.createImageData(bw, bh), d = img.data;
  const F = {};
  const farbe = (h) => F[h] || (F[h] = hexRgb(h));
  const setz = (x, y, h) => { const f = farbe(h), i = (y * bw + x) * 4; d[i] = f[0]; d[i + 1] = f[1]; d[i + 2] = f[2]; d[i + 3] = 255; };
  const art = (tx, ty) => (tx < 0 || ty < 0 || tx >= B || ty >= H) ? BODEN.GRAS : W.boden[ty * B + tx];
  const grasTon = ['#579a42', '#5ea548', '#64ab4c'];

  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const tx = x >> 4, ty = y >> 4, lx = x & 15, ly = y & 15, a = art(tx, ty);
    const n = Math.sin(x * 0.06) + Math.sin(y * 0.05 + 1.3) + Math.sin((x + y) * 0.027);
    let gras = grasTon[n < -0.6 ? 0 : n < 0.7 ? 1 : 2];
    const z = r();
    if (z < 0.05) gras = '#73b856'; else if (z < 0.1) gras = '#4b8a3a';
    if (a === BODEN.GRAS) { setz(x, y, gras); continue; }
    if (a === BODEN.WEG) {
      // Ränder zum Gras hin ausfransen
      const rand = (lx < 2 && art(tx - 1, ty) === BODEN.GRAS) || (lx > 13 && art(tx + 1, ty) === BODEN.GRAS) ||
                   (ly < 2 && art(tx, ty - 1) === BODEN.GRAS) || (ly > 13 && art(tx, ty + 1) === BODEN.GRAS);
      if (rand && r() < 0.55) { setz(x, y, gras); continue; }
      setz(x, y, z < 0.06 ? '#a98250' : z < 0.12 ? '#d8b27c' : z < 0.135 ? '#8f877c' : '#c49a62');
      continue;
    }
    // Wasser
    const nah = (dx, dy) => art(tx + dx, ty + dy) !== BODEN.WASSER;
    const ab = Math.min(nah(-1, 0) ? lx : 99, nah(1, 0) ? 15 - lx : 99, nah(0, -1) ? ly : 99, nah(0, 1) ? 15 - ly : 99);
    if (ab < 1) setz(x, y, '#e6d69c');
    else if (ab < 2) setz(x, y, '#9cc8f2');
    else if (ab < 3) setz(x, y, '#5f9be6');
    else setz(x, y, Math.sin(x * 0.4 + Math.sin(y * 0.7) * 2) > 0.92 ? '#4f8bdc' : '#3d78cf');
  }
  g.putImageData(img, 0, 0);

  // Kleine Grashalme
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(r() * bw), y = Math.floor(r() * bh);
    if (art(x >> 4, y >> 4) !== BODEN.GRAS) continue;
    g.fillStyle = '#7cc05a'; g.fillRect(x, y, 1, 2);
    g.fillStyle = '#467f36'; g.fillRect(x, y + 2, 1, 1);
  }
  // Blumen
  const blumen = ['#ffffff', '#ffe066', '#ff9bd0', '#9fc8ff'];
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(r() * bw), y = Math.floor(r() * bh);
    if (art(x >> 4, y >> 4) !== BODEN.GRAS) continue;
    g.fillStyle = blumen[Math.floor(r() * blumen.length)];
    g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3);
    g.fillStyle = '#f4b43a'; g.fillRect(x, y, 1, 1);
  }
  // Seerosen
  for (let i = 0; i < W.boden.length; i++) {
    if (W.boden[i] !== BODEN.WASSER || r() > 0.2) continue;
    const x = (i % B) * K + 5 + Math.floor(r() * 6), y = Math.floor(i / B) * K + 5 + Math.floor(r() * 6);
    g.fillStyle = '#3f8a37'; g.fillRect(x - 2, y - 1, 5, 3); g.fillRect(x - 1, y - 2, 3, 5);
    g.fillStyle = '#5fb04a'; g.fillRect(x - 1, y - 1, 2, 2);
    g.fillStyle = '#3d78cf'; g.fillRect(x + 1, y - 2, 1, 2);
    if (r() < 0.4) { g.fillStyle = '#ffb3d9'; g.fillRect(x, y, 2, 1); g.fillStyle = '#fff'; g.fillRect(x, y - 1, 1, 1); }
  }
  // Schatten der Bäume und des Stumpfs
  g.fillStyle = 'rgba(16, 40, 16, 0.32)';
  for (const b of W.baeume) {
    g.beginPath(); g.ellipse(b.x, b.y - 3, 14, 6, 0, 0, Math.PI * 2); g.fill();
  }
  g.beginPath(); g.ellipse(W.haus.x + 2, W.haus.y - 2, 44, 9, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(W.hoehle.x, W.hoehle.y - 2, 46, 8, 0, 0, Math.PI * 2); g.fill();
  // Felsen (flach genug, um im Boden zu liegen)
  for (const f of W.felsen) {
    g.fillStyle = 'rgba(16, 40, 16, 0.3)'; g.beginPath(); g.ellipse(f.x + 8, f.y + 13, 8, 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f2a28'; g.fillRect(f.x + 2, f.y + 4, 12, 10); g.fillRect(f.x + 3, f.y + 3, 10, 12);
    g.fillStyle = '#7d7a76'; g.fillRect(f.x + 3, f.y + 4, 10, 9); g.fillRect(f.x + 4, f.y + 4, 8, 10);
    g.fillStyle = '#a19d97'; g.fillRect(f.x + 4, f.y + 5, 5, 3);
    g.fillStyle = '#5c5955'; g.fillRect(f.x + 9, f.y + 10, 3, 3);
    if (f.v < 0.5) { g.fillStyle = '#5aa843'; g.fillRect(f.x + 3, f.y + 3, 4, 2); g.fillRect(f.x + 4, f.y + 5, 1, 1); }
  }
  return c;
}
