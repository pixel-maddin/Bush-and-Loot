// wetter.js – Wetter im Wald, jeden Morgen neu ausgewürfelt (ab Tag 2):
//   sonne – wie immer
//   regen – Regenschleier, Spritzer, gedämpftes Licht; Riesenblobs kriechen herum (zerfallen in zwei Blobchen)
//   sturm – fester Wind aus einer Richtung: mit dem Wind schneller, dagegen langsamer, Diamanten fliegen
//           weiter, Blätter wirbeln, Gras und Schilf biegen sich
// Schnee kommt später mit dem Gebirge. In den Kammern der Höhle gibt es kein Wetter.

import { G, PB, spiegeln, weiss } from './grafik.js';

export const WETTER_CHANCE = { regen: 0.22, sturm: 0.15 };
const RICHTUNGEN = [['Osten', 1, 0], ['Westen', -1, 0], ['Norden', 0, -1], ['Süden', 0, 1],
  ['Nordosten', 0.71, -0.71], ['Nordwesten', -0.71, -0.71], ['Südosten', 0.71, 0.71], ['Südwesten', -0.71, 0.71]];
// Wind „aus Westen“ weht nach Osten: Name ist die Herkunft, x/y die Richtung, in die er schiebt
const HERKUNFT = { Osten: 'Westen', Westen: 'Osten', Norden: 'Süden', Süden: 'Norden', Nordosten: 'Südwesten', Nordwesten: 'Südosten', Südosten: 'Nordwesten', Südwesten: 'Nordosten' };

export const OHNE_WIND = { x: 0, y: 0, staerke: 0 };

export function neuesWetter(tag, erzwungen) {
  let art = 'sonne';
  if (erzwungen) art = erzwungen;
  else if (tag >= 2) {
    const z = Math.random();
    if (z < WETTER_CHANCE.regen) art = 'regen';
    else if (z < WETTER_CHANCE.regen + WETTER_CHANCE.sturm) art = 'sturm';
  }
  const w = { art, wind: OHNE_WIND, tropfen: [], blaetter: [], spritzer: [], richtung: '' };
  if (art === 'sturm') {
    const [name, x, y] = RICHTUNGEN[Math.floor(Math.random() * RICHTUNGEN.length)];
    w.wind = { x, y, staerke: 1 };
    w.richtung = HERKUNFT[name];          // „Wind aus …“
  }
  return w;
}

export function wetterText(w) {
  if (!w) return '';
  if (w.art === 'regen') return 'Heute regnet es. Riesenblobs kriechen aus den Pfützen!';
  if (w.art === 'sturm') return `Sturm aus ${w.richtung}! Mit dem Wind läufst du schneller, dagegen langsamer.`;
  return '';
}

export function wetterTextGebirge(w) { return w && w.art === 'regen' ? 'Im Gebirge schneit es – dort stapft man langsamer.' : ''; }

// Laufen mit dem Wind schneller, dagegen langsamer (bis ±35 %)
export function windFaktor(w, rx, ry) {
  if (!w || !w.wind.staerke) return 1;
  return 1 + 0.35 * w.wind.staerke * (rx * w.wind.x + ry * w.wind.y);
}

// ---------- Ablauf: Regentropfen und Blätter relativ zum Bildausschnitt ----------
export function wetterUpdate(dt, S) {
  const w = S.wetter, f = S.sichtfeld;
  if (!w || !f || S.ort !== 'wald') return;
  const schnee = w.art === 'regen' && S.gebiet === 'berg';      // im Gebirge fällt statt Regen Schnee
  if (schnee) {
    while (w.tropfen.length < 70) w.tropfen.push({ x: Math.random() * (f.vw + 40) - 20, y: Math.random() * f.vh, v: 18 + Math.random() * 20, l: Math.random() < 0.3 ? 2 : 1, ph: Math.random() * 6 });
    for (const t of w.tropfen) {
      t.y += t.v * dt; t.x += Math.sin(S.t * 1.3 + t.ph) * 8 * dt + w.wind.x * 30 * w.wind.staerke * dt;
      if (t.y > f.vh) { t.y = -4; t.x = Math.random() * (f.vw + 40) - 20; }
    }
    return;
  }
  if (w.art === 'regen') {
    while (w.tropfen.length < 90) w.tropfen.push({ x: Math.random() * (f.vw + 40) - 20, y: Math.random() * f.vh, v: 170 + Math.random() * 60, l: 4 + Math.random() * 3 });
    for (const t of w.tropfen) {
      t.y += t.v * dt; t.x -= t.v * 0.18 * dt;
      if (t.y > f.vh) { t.y = -6; t.x = Math.random() * (f.vw + 40) - 20; }
    }
    if (Math.random() < dt * 14) w.spritzer.push({ x: f.L + Math.random() * f.vw, y: f.T + Math.random() * f.vh, t: 0 });
    for (const s of w.spritzer) s.t += dt;
    w.spritzer = w.spritzer.filter(s => s.t < 0.35);
  } else if (w.art === 'sturm') {
    if (w.blaetter.length < 26 && Math.random() < dt * 20) {
      const vonLinks = w.wind.x >= 0;
      w.blaetter.push({ x: w.wind.x ? (vonLinks ? -10 : f.vw + 10) : Math.random() * f.vw, y: w.wind.y && !w.wind.x ? (w.wind.y > 0 ? -10 : f.vh + 10) : Math.random() * f.vh,
        v: 90 + Math.random() * 60, ph: Math.random() * 6.28, farbe: ['#7cc95a', '#c8a040', '#5aaa46', '#e07a3a'][Math.floor(Math.random() * 4)], t: 0 });
    }
    for (const b of w.blaetter) { b.t += dt; b.x += w.wind.x * b.v * dt; b.y += w.wind.y * b.v * dt + Math.sin(b.t * 5 + b.ph) * 18 * dt; }
    w.blaetter = w.blaetter.filter(b => b.x > -20 && b.x < f.vw + 20 && b.y > -20 && b.y < f.vh + 20);
  }
}

// Über der Welt (vor dem Abendlicht)
export function wetterZeichne(ctx, S) {
  const w = S.wetter, f = S.sichtfeld;
  if (!w || !f || S.ort !== 'wald') return;
  if (w.art === 'regen' && S.gebiet === 'berg') {
    ctx.fillStyle = 'rgba(235, 242, 255, 0.12)'; ctx.fillRect(f.L - 2, f.T - 2, f.vw + 4, f.vh + 4);
    ctx.fillStyle = '#ffffff';
    for (const t of w.tropfen) ctx.fillRect(Math.round(f.L + t.x), Math.round(f.T + t.y), t.l, t.l);
    return;
  }
  if (w.art === 'regen') {
    // Gedämpftes, kühles Licht
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(200, 210, 225)'; ctx.fillRect(f.L - 2, f.T - 2, f.vw + 4, f.vh + 4);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(210, 228, 255, 0.55)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const t of w.tropfen) { const x = f.L + t.x, y = f.T + t.y; ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5 - t.l * 0.18, y + t.l); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(220, 235, 255, 0.7)';
    for (const s of w.spritzer) {
      const r = 1 + s.t * 8;
      ctx.fillRect(Math.round(s.x - r), Math.round(s.y), 1, 1); ctx.fillRect(Math.round(s.x + r), Math.round(s.y), 1, 1);
      if (s.t < 0.15) ctx.fillRect(Math.round(s.x), Math.round(s.y - 1), 1, 1);
    }
  } else if (w.art === 'sturm') {
    for (const b of w.blaetter) {
      const x = Math.round(f.L + b.x), y = Math.round(f.T + b.y), flip = Math.sin(b.t * 9 + b.ph) > 0;
      ctx.fillStyle = b.farbe; ctx.fillRect(x, y, flip ? 3 : 2, flip ? 2 : 3);
    }
    // feine Windstriche
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const p = ((S.t * 0.6 + i * 0.37) % 1), x = f.L + ((i * 97 + p * f.vw * 1.4) % (f.vw + 40)) - 20, y = f.T + ((i * 53) % f.vh);
      ctx.moveTo(x, y); ctx.lineTo(x + w.wind.x * 14, y + w.wind.y * 14);
    }
    ctx.stroke();
  }
}

// ---------- Riesenblob und Blobchen (Regen-Gegner) ----------
export function initWetterGrafik() {
  const blob = (gross, quetsch) => {
    const w = gross ? 18 : 10, h = gross ? 15 : 9;
    const pb = new PB(w, h);
    const cx = w / 2, cy = h - (gross ? 6.5 : 4), rx = (gross ? 8 : 4.4) * (1 + quetsch * 0.1), ry = (gross ? 6.5 : 3.8) * (1 - quetsch * 0.12);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1 || y + 0.5 > h - 0.5) continue;
      const l = -nx * 0.55 - ny * 0.85;
      pb.set(x, y, l > 0.6 ? '#d8fff0' : l > 0.1 ? '#7ee0b8' : l > -0.4 ? '#46b88c' : '#2a8a66');
    }
    // Gesicht: große Augen, Bäckchen, kleiner Mund
    const ey = Math.round(cy - (gross ? 1 : 0.5)), ex = Math.round(cx);
    const e = gross ? [[ex - 4, ey], [ex + 2, ey]] : [[ex - 2, ey], [ex + 1, ey]];
    for (const [x, y] of e) { pb.rechteck(x, y - (gross ? 1 : 0), gross ? 2 : 1, gross ? 3 : 2, '#1e1b30'); pb.set(x, y - (gross ? 1 : 0), '#ffffff'); }
    if (gross) { pb.set(ex - 5, ey + 3, '#ff9ab4'); pb.set(ex + 4, ey + 3, '#ff9ab4'); pb.set(ex - 1, ey + 3, '#1e1b30'); pb.set(ex, ey + 3, '#1e1b30'); }
    pb.set(Math.round(cx - rx * 0.5), Math.round(cy - ry * 0.6), '#ffffff');
    return pb.umriss('#14402e').bild();
  };
  const satz = (bilder) => ({ l: bilder, r: bilder.map(spiegeln), lw: bilder.map(weiss), rw: bilder.map(b => weiss(spiegeln(b))) });
  G.gegner.blob = satz([blob(true, 0), blob(true, 1)]);
  G.gegner.blobchen = satz([blob(false, 0), blob(false, 1)]);
}
