// spiel.js – Zustand, Regeln und Zeichnen der Welt.
// Phasen: titel → tag ⇄ haus → abblende → bilanz → laden → tag …

import {
  KACHEL as K, KARTE_B as B, KARTE_H as H, STEINE, STEIN_GEWICHT, BUESCHEL, bueschelGewichte,
  GRAS_DICHTE, GEGNER, gegnerMax, gegnerArten, werte, LADEZEIT,
} from './config.js';
import { G } from './grafik.js';
import { SFX } from './ton.js';
import { baueWelt } from './welt.js';
import { klemme } from './hilfe.js';

const SPEICHER = 'halmhauer.v1';
const WELT_SAAT = 20261109;

export const S = {
  phase: 'titel',
  welt: null,
  tag: 1, geld: 0, st: {}, w: null,
  gesamt: { gemaeht: 0, besiegt: 0, wert: 0 },
  hinweise: {},
  zeit: 0, dauer: 70,
  sp: null,
  bueschel: [], gitter: null, gegner: [], beute: [], partikel: [], texte: [],
  heute: null,
  kam: { x: 0, y: 0 },
  wackeln: 0, stopp: 0, blende: 0, spawnT: 3, rauchT: 0, t: 0,
  endeGrund: null,
};

let hooks = {};
export function setzeHooks(h) { hooks = h; }

// ---------- Speichern ----------
export function laden() {
  try {
    const d = JSON.parse(localStorage.getItem(SPEICHER));
    if (d && typeof d.geld === 'number') {
      S.geld = d.geld; S.tag = d.tag || 1; S.st = d.st || {};
      S.gesamt = Object.assign({ gemaeht: 0, besiegt: 0, wert: 0 }, d.gesamt);
      S.hinweise = d.hinweise || {};
      return true;
    }
  } catch (e) { /* kein Spielstand */ }
  return false;
}
export function speichern() {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify({ geld: S.geld, tag: S.tag, st: S.st, gesamt: S.gesamt, hinweise: S.hinweise }));
  } catch (e) { /* privat-Modus o. ä. */ }
}
export function neuAnfangen() {
  S.geld = 0; S.tag = 1; S.st = {}; S.gesamt = { gemaeht: 0, besiegt: 0, wert: 0 }; S.hinweise = {};
  speichern();
}
export const hatSpielstand = () => S.tag > 1 || S.geld > 0;

export function initSpiel() {
  S.welt = baueWelt(WELT_SAAT);
  S.w = werte(S.st);
  S.sp = neuerSpieler();
  pflanzen();
  S.kam.x = S.welt.haus.x; S.kam.y = S.welt.haus.y;
}

function neuerSpieler() {
  const st = S.welt.start;
  return {
    x: st.x, y: st.y, winkel: Math.PI / 2, blick: 'unten', hp: S.w.maxHp,
    unverw: 0, kx: 0, ky: 0, cd: 0, puffer: 0,
    schlagT: 0, schlagDauer: 0.15, schlagRund: false, schlagWinkel: 0,
    ladung: 0, geladenTon: false, laufT: 0, bewegt: false, tuerSperre: true,
  };
}

// ---------- Das Gras wächst jeden Morgen neu ----------
function pflanzen() {
  const W = S.welt;
  S.bueschel = []; S.gitter = new Array(B * H).fill(null);
  const gew = bueschelGewichte(S.tag);
  // Jeden Tag andere dichte und lichte Stellen
  const p1 = Math.random() * 10, p2 = Math.random() * 10;
  const hx = W.haus.x / K, hy = W.haus.y / K;
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
    const i = y * B + x;
    if (W.sperr[i] || W.boden[i] !== 0) continue;
    if (Math.hypot(x + 0.5 - W.start.x / K, y + 0.5 - W.start.y / K) < 1.6) continue;
    const dichte = GRAS_DICHTE * (0.55 + 0.45 * (Math.sin(x * 0.42 + p1) + Math.sin(y * 0.37 + p2) + 2) / 2);
    if (Math.random() > dichte) continue;
    // Seltenes wächst weiter weg vom Stumpf
    const fern = klemme(Math.hypot(x - hx, y - hy) / 16, 0.3, 1.7);
    const g = [gew[0], gew[1], gew[2] * fern, gew[3] * fern * fern];
    let z = Math.random() * (g[0] + g[1] + g[2] + g[3]), art = 0;
    while (art < 3 && z > g[art]) { z -= g[art]; art++; }
    const b = {
      art, x: x * K + 8 + (Math.random() * 6 - 3), y: y * K + 12 + (Math.random() * 4 - 2),
      hp: BUESCHEL[art].hp, ph: Math.random() * 6.28, wackel: 0, weg: false,
    };
    S.bueschel.push(b); S.gitter[i] = b;
  }
}

// ---------- Tagesablauf ----------
export function neuerTag() {
  S.w = werte(S.st);
  S.zeit = 0; S.dauer = S.w.tagDauer;
  S.sp = neuerSpieler();
  pflanzen();
  S.gegner = []; S.beute = []; S.partikel = []; S.texte = [];
  S.heute = { gemaeht: 0, besiegt: 0, steine: [0, 0, 0, 0, 0], wert: 0 };
  for (let i = 0; i < Math.ceil(gegnerMax(S.tag) / 2); i++) spawneIrgendwo();
  S.spawnT = 4;
  S.kam.x = S.sp.x; S.kam.y = S.sp.y - 8;
  S.blende = 0; S.phase = 'tag';
  SFX.morgen();
  hooks.tagBeginnt && hooks.tagBeginnt();
}

// Raus aus dem Stumpf, der Tag läuft weiter
export function weiterMaehen() {
  const st = S.welt.start;
  S.sp.x = st.x; S.sp.y = st.y; S.sp.tuerSperre = true; S.sp.kx = S.sp.ky = 0;
  S.sp.winkel = Math.PI / 2; S.sp.blick = 'unten';
  S.w = werte(S.st);
  S.sp.hp = Math.min(S.sp.hp, S.w.maxHp);
  S.phase = 'tag';
  SFX.tuer();
}

export function tagBeenden() { S.endeGrund = 'heim'; tagAbschliessen(); }

function beginneAbend(grund) {
  S.endeGrund = grund; S.phase = 'abblende'; S.blende = 0;
  grund === 'ohnmacht' ? SFX.ohnmacht() : SFX.abend();
}

function tagAbschliessen() {
  const ohnmacht = S.endeGrund === 'ohnmacht';
  // Was noch herumliegt, bringt der Abendwind mit nach Hause – außer man ist umgekippt
  let nachgetragen = 0;
  for (const e of S.beute) if (!e.herz && !ohnmacht) { einsammeln(e, true); nachgetragen++; }
  S.beute = [];
  let verlust = 0;
  if (ohnmacht) { verlust = Math.min(S.geld, Math.floor(S.heute.wert / 2)); S.geld -= verlust; }
  S.gesamt.gemaeht += S.heute.gemaeht; S.gesamt.besiegt += S.heute.besiegt; S.gesamt.wert += S.heute.wert - verlust;
  const fertig = S.tag;
  S.tag++;
  S.phase = 'bilanz';
  speichern();
  hooks.bilanz && hooks.bilanz({ grund: S.endeGrund, heute: S.heute, verlust, tag: fertig, nachgetragen });
}

export function kaufen(id, preis) {
  if (S.geld < preis) { SFX.nein(); return false; }
  S.geld -= preis;
  S.st[id] = (S.st[id] | 0) + 1;
  const altMax = S.w.maxHp;
  S.w = werte(S.st);
  if (S.sp && S.w.maxHp > altMax) S.sp.hp += S.w.maxHp - altMax;   // neues Herz gleich voll
  SFX.kauf(); speichern();
  return true;
}

// ---------- Hauptschleife ----------
export function update(dt, ein) {
  S.t += dt;
  S.rauchT -= dt;
  if (S.rauchT <= 0) { S.rauchT = 0.3; rauch(); }
  partikelUpdate(dt);
  for (const b of S.bueschel) if (b.wackel > 0) b.wackel -= dt;
  const neu = ein.holeNeu();

  if (S.phase === 'titel') {
    // Kamera schwebt langsam über die Lichtung
    S.kam.x = S.welt.haus.x + Math.sin(S.t * 0.08) * 150;
    S.kam.y = S.welt.haus.y + Math.cos(S.t * 0.06) * 110;
    return;
  }
  if (S.phase === 'abblende') {
    S.blende += dt / 1.4;
    if (S.blende >= 1) { S.blende = 1; tagAbschliessen(); }
    return;
  }
  if (S.phase !== 'tag') return;
  if (S.stopp > 0) { S.stopp -= dt; return; }   // kurzer Treffer-Stopp, fühlt sich wuchtiger an

  S.zeit += dt;
  if (S.wackeln > 0) S.wackeln -= dt;
  spielerUpdate(dt, ein, neu);
  if (S.phase !== 'tag') return;                   // Tür erreicht
  gegnerUpdate(dt);
  beuteUpdate(dt);
  spawner(dt);
  kamera(dt);
  if (S.zeit >= S.dauer) beginneAbend('abend');
}

// ---------- Bewegung & Kollision ----------
function fest(x, y, hw, hh) {
  const W = S.welt;
  const x0 = Math.floor((x - hw) / K), x1 = Math.floor((x + hw - 0.01) / K);
  const y0 = Math.floor((y - hh) / K), y1 = Math.floor((y + hh - 0.01) / K);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tx < 0 || ty < 0 || tx >= B || ty >= H) return true;
    if (W.fest[ty * B + tx]) return true;
  }
  return false;
}
function bewege(e, dx, dy, hw, hh) {
  const n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4) || 1;
  for (let i = 0; i < n; i++) {
    const nx = e.x + dx / n; if (!fest(nx, e.y, hw, hh)) e.x = nx;
    const ny = e.y + dy / n; if (!fest(e.x, ny, hw, hh)) e.y = ny;
  }
}
function blickAus(w) {
  const g = w * 180 / Math.PI;
  if (g > -50 && g < 50) return 'rechts';
  if (g >= 50 && g <= 130) return 'unten';
  if (g <= -50 && g >= -130) return 'oben';
  return 'links';
}

function spielerUpdate(dt, ein, neu) {
  const p = S.sp, w = S.w;
  p.cd -= dt; p.unverw -= dt; p.puffer -= dt;
  if (p.schlagT > 0) p.schlagT -= dt;
  if (neu) p.puffer = 0.18;

  const r = ein.richtung(), m = Math.hypot(r.x, r.y);
  let tempo = w.tempo;
  if (p.ladung > 0.15) tempo *= 0.6;
  let dx = 0, dy = 0;
  if (m > 0.1) {
    const f = Math.min(1, m);
    dx = r.x / m * f * tempo * dt; dy = r.y / m * f * tempo * dt;
    if (p.schlagT <= 0) { p.winkel = Math.atan2(r.y, r.x); p.blick = blickAus(p.winkel); }
    p.laufT += dt * f * tempo / 60; p.bewegt = true;
  } else p.bewegt = false;
  dx += p.kx * dt; dy += p.ky * dt;
  const ab = Math.exp(-10 * dt); p.kx *= ab; p.ky *= ab;
  bewege(p, dx, dy, 4, 3);

  // Hauen: Tippen = ein Schlag. Halten = ohne Wirbelschlag weiterhauen, mit Wirbelschlag aufladen.
  if (p.cd <= 0 && (p.puffer > 0 || (ein.angriff && !w.wirbel))) { schlag(false); if (p.puffer > 0) p.ladung = 0; p.puffer = 0; }
  if (w.wirbel) {
    if (ein.angriff) {
      p.ladung += dt;
      if (p.ladung >= LADEZEIT && !p.geladenTon) { p.geladenTon = true; SFX.geladen(); }
    } else {
      if (p.ladung >= LADEZEIT) schlag(true);
      p.ladung = 0; p.geladenTon = false;
    }
  }

  // Tür des Baumstumpfs
  const T = S.welt.haus.tuer;
  const inTuer = Math.abs(p.x - T.x) < 8 && p.y < T.y + 6;
  if (!inTuer) p.tuerSperre = false;
  else if (!p.tuerSperre) {
    p.tuerSperre = true; S.phase = 'haus'; SFX.tuer();
    hooks.haus && hooks.haus(false);
  }
}

function winkelAbstand(a, b) { const d = a - b; return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); }

function schlag(rund) {
  const p = S.sp, w = S.w;
  p.cd = w.abklingen * (rund ? 1.6 : 1);
  p.schlagRund = rund; p.schlagDauer = rund ? 0.3 : 0.15; p.schlagT = p.schlagDauer; p.schlagWinkel = p.winkel;
  const reich = w.reichweite * (rund ? 1.25 : 1);
  const bogen = rund ? Math.PI * 2 : w.bogen;
  const schaden = rund ? Math.ceil(w.schaden * 1.5) : w.schaden;
  const cx = p.x, cy = p.y - 5;
  rund ? SFX.wirbel() : SFX.schwung();

  const trifft = (tx, ty, extra) => {
    const dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy);
    if (d > reich + extra) return false;
    if (rund || d < 6) return true;
    return winkelAbstand(Math.atan2(dy, dx), p.winkel) <= bogen / 2 + Math.atan2(extra, d) * 0.6;
  };
  const rr = Math.ceil((reich + 8) / K), gx = Math.floor(cx / K), gy = Math.floor(cy / K);
  let n = 0;
  for (let ty = gy - rr; ty <= gy + rr; ty++) for (let tx = gx - rr; tx <= gx + rr; tx++) {
    if (tx < 0 || ty < 0 || tx >= B || ty >= H) continue;
    const b = S.gitter[ty * B + tx];
    if (!b || b.weg) continue;
    if (trifft(b.x, b.y - 4, 5)) { haueBueschel(b, schaden); n++; }
  }
  for (const g of S.gegner) if (!g.tot && trifft(g.x, g.y - 4 - g.z, 7)) haueGegner(g, schaden, cx, cy);
  if (n >= 6) S.wackeln = Math.max(S.wackeln, 0.08);
}

// ---------- Gras ----------
const SPLITTER = [
  ['#9ad66a', '#5fb04a', '#3f8a37'],
  ['#86c860', '#4d9a48', '#e8d47a'],
  ['#ff9bd0', '#ffffff', '#4c9f45'],
  ['#335f36', '#d8333f', '#4f7f45'],
];
function haueBueschel(b, schaden) {
  const art = BUESCHEL[b.art];
  b.hp -= schaden; b.wackel = 0.3;
  splitter(b.x, b.y - 5, SPLITTER[b.art], b.hp <= 0 ? 9 : 3);
  if (b.hp > 0) { SFX.tock(); return; }
  b.weg = true; S.heute.gemaeht++;
  SFX.schnitt();
  const w = S.w;
  if (Math.random() < art.fund * (1 + 0.15 * w.glueck)) wirfStein(b.x, b.y - 3, waehleStein(art.beste, w.glueck));
  else if (S.sp.hp < w.maxHp && Math.random() < 0.025) wirfHerz(b.x, b.y - 3);
  // Manchmal sitzt einer drin …
  if (S.tag >= 2 && Math.random() < 0.012 && S.gegner.length < gegnerMax(S.tag) + 2) {
    const arten = gegnerArten(S.tag);
    spawne(arten[Math.floor(Math.random() * arten.length)], b.x, b.y, true);
  }
}

function waehleStein(beste, glueck) {
  const g = []; let summe = 0;
  for (let i = 0; i <= beste; i++) { g[i] = STEIN_GEWICHT[i] * Math.pow(1 + 0.45 * glueck, i); summe += g[i]; }
  let z = Math.random() * summe;
  for (let i = 0; i <= beste; i++) { if (z < g[i]) return i; z -= g[i]; }
  return 0;
}

// ---------- Diamanten & Herzen ----------
function wirfStein(x, y, typ) {
  S.beute.push({ x, y, z: 2, vz: 70 + Math.random() * 30, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 30, typ, herz: false, t: 0, zieht: false, sp: 0 });
}
function wirfHerz(x, y) {
  S.beute.push({ x, y, z: 2, vz: 80, vx: (Math.random() - 0.5) * 30, vy: 0, typ: 0, herz: true, t: 0, zieht: false, sp: 0 });
}
function beuteUpdate(dt) {
  const p = S.sp, mag = S.w.magnet;
  for (const e of S.beute) {
    e.t += dt;
    const dx = p.x - e.x, dy = (p.y - 4) - e.y, d = Math.hypot(dx, dy) || 1;
    if (e.t > 0.3 && d < mag) e.zieht = true;
    if (e.zieht) {
      e.sp += 500 * dt;
      const s = Math.min(e.sp * dt, d);
      e.x += dx / d * s; e.y += dy / d * s; e.z *= 0.85;
    } else {
      e.vz -= 260 * dt; e.z += e.vz * dt;
      if (e.z <= 0) { e.z = 0; e.vz = Math.abs(e.vz) > 25 ? -e.vz * 0.4 : 0; e.vx *= 0.6; e.vy *= 0.6; }
      e.x += e.vx * dt; e.y += e.vy * dt;
    }
    if (e.t > 0.3 && d < 7) { einsammeln(e, false); e.weg = true; }
  }
  S.beute = S.beute.filter(e => !e.weg);
}
function einsammeln(e, leise) {
  if (e.herz) {
    S.sp.hp = Math.min(S.w.maxHp, S.sp.hp + 1); SFX.herz();
    text(e.x, e.y - 6, '+1 ♥', '#ff6a7a');
    return;
  }
  const s = STEINE[e.typ];
  S.geld += s.wert; S.heute.wert += s.wert; S.heute.steine[e.typ]++;
  if (!leise) {
    SFX.stein(e.typ);
    text(e.x, e.y - 6, '+' + s.wert, s.farben[1]);
    funkeln(e.x, e.y, s.farben[0]);
    if (!S.hinweise.stein) { S.hinweise.stein = true; hooks.hinweis && hooks.hinweis('Ein Diamant! Im Baumstumpf kannst du ihn ausgeben.'); }
  }
}

// ---------- Gegner ----------
function spawne(art, x, y, ausGras) {
  const d = GEGNER[art];
  S.gegner.push({
    art, x, y, z: 0, hp: d.hp + Math.floor((S.tag - 1) / 6), kx: 0, ky: 0, vx: 0, vy: 0,
    t: Math.random() * 10, ph: Math.random() * 6, blitz: 0, hopT: 0.5 + Math.random(), hop: 0,
    richtung: Math.random() * 6.28, wechselT: 0, links: true, tot: false,
  });
  if (ausGras) { SFX.plopp(); puff(x, y - 4); }
}
function spawneIrgendwo() {
  const W = S.welt, p = S.sp, arten = gegnerArten(S.tag);
  for (let n = 0; n < 30; n++) {
    const tx = 3 + Math.floor(Math.random() * (B - 6)), ty = 3 + Math.floor(Math.random() * (H - 6));
    if (W.fest[ty * B + tx]) continue;
    const x = tx * K + 8, y = ty * K + 10;
    if (Math.hypot(x - p.x, y - p.y) < 150) continue;
    spawne(arten[Math.floor(Math.random() * arten.length)], x, y, false);
    return;
  }
}
function spawner(dt) {
  S.spawnT -= dt;
  if (S.spawnT > 0) return;
  S.spawnT = Math.max(2.5, 7 - S.tag * 0.4);
  if (S.gegner.length < gegnerMax(S.tag)) spawneIrgendwo();
}

function gegnerUpdate(dt) {
  const p = S.sp;
  for (const g of S.gegner) {
    g.t += dt; if (g.blitz > 0) g.blitz -= dt;
    const def = GEGNER[g.art];
    const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
    const ab = Math.exp(-8 * dt);
    if (g.art === 'schnecke') {
      let mx = 0, my = 0;
      if (d < 110) { mx = dx / d * def.tempo; my = dy / d * def.tempo; }
      else {
        g.wechselT -= dt;
        if (g.wechselT <= 0) { g.richtung = Math.random() * 6.28; g.wechselT = 2 + Math.random() * 2; }
        mx = Math.cos(g.richtung) * def.tempo * 0.6; my = Math.sin(g.richtung) * def.tempo * 0.6;
      }
      bewege(g, (mx + g.kx) * dt, (my + g.ky) * dt, 4, 3);
      g.links = (mx || dx) < 0;
    } else if (g.art === 'hummel') {
      g.z = 9 + Math.sin(g.t * 7) * 2;
      let zx, zy;
      if (d < 140) {
        // Umkreisen – und ab und zu ein Sturzflug
        if (Math.sin(g.t * 0.8 + g.ph) > 0.55) { zx = p.x; zy = p.y; }
        else { zx = p.x + Math.cos(g.t * 2.2 + g.ph) * 26; zy = p.y + Math.sin(g.t * 2.2 + g.ph) * 18; }
        if (d < 70) SFX.summen();
      } else {
        g.wechselT -= dt;
        if (g.wechselT <= 0) { g.richtung = Math.random() * 6.28; g.wechselT = 1.5 + Math.random() * 2; }
        zx = g.x + Math.cos(g.richtung) * 40; zy = g.y + Math.sin(g.richtung) * 40;
      }
      const ex = zx - g.x, ey = zy - g.y, ed = Math.hypot(ex, ey) || 1;
      g.vx += ex / ed * 240 * dt; g.vy += ey / ed * 240 * dt;
      const v = Math.hypot(g.vx, g.vy), vmax = def.tempo;
      if (v > vmax) { g.vx *= vmax / v; g.vy *= vmax / v; }
      g.x = klemme(g.x + (g.vx + g.kx) * dt, 2.5 * K, (B - 2.5) * K);
      g.y = klemme(g.y + (g.vy + g.ky) * dt, 2.5 * K, (H - 2.5) * K);
      g.links = g.vx < 0;
    } else {
      g.hopT -= dt;
      if (g.hopT <= 0) {
        g.hopT = 0.9 + Math.random() * 0.5; g.hop = 0.4;
        let rx, ry;
        if (d < 120) { rx = dx / d; ry = dy / d; } else { const a = Math.random() * 6.28; rx = Math.cos(a); ry = Math.sin(a); }
        g.vx = rx * def.tempo; g.vy = ry * def.tempo; g.links = rx < 0;
      }
      if (g.hop > 0) {
        g.hop -= dt; g.z = Math.max(0, Math.sin((1 - g.hop / 0.4) * Math.PI) * 7);
        bewege(g, (g.vx + g.kx) * dt, (g.vy + g.ky) * dt, 4, 3);
      } else { g.z = 0; bewege(g, g.kx * dt, g.ky * dt, 4, 3); }
    }
    g.kx *= ab; g.ky *= ab;
    // Berührung
    if (d < 10 && p.unverw <= 0 && g.blitz <= 0) aua(g, def.schaden);
  }
  S.gegner = S.gegner.filter(g => !g.tot);
}

function haueGegner(g, schaden, cx, cy) {
  g.hp -= schaden; g.blitz = 0.15;
  const dx = g.x - cx, dy = g.y - cy, d = Math.hypot(dx, dy) || 1, kb = g.art === 'hummel' ? 260 : 170;
  g.kx = dx / d * kb; g.ky = dy / d * kb;
  if (g.art === 'hummel') { g.vx = 0; g.vy = 0; }
  S.stopp = 0.04;
  if (g.hp > 0) { SFX.gegnerTreffer(); return; }
  g.tot = true; S.heute.besiegt++;
  SFX.gegnerWeg(); puff(g.x, g.y - 4 - g.z);
  if (Math.random() < GEGNER[g.art].beute) wirfStein(g.x, g.y - 4, waehleStein(Math.min(4, 1 + Math.floor(S.tag / 3)), S.w.glueck));
}

function aua(g, schaden) {
  const p = S.sp;
  p.hp -= schaden; p.unverw = 1.3;
  const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
  p.kx = dx / d * 220; p.ky = dy / d * 220;
  S.wackeln = 0.3; SFX.aua();
  hooks.aua && hooks.aua();
  if (p.hp <= 0) { p.hp = 0; beginneAbend('ohnmacht'); }
}

function kamera(dt) {
  const p = S.sp, f = 1 - Math.exp(-8 * dt);
  S.kam.x += (p.x - S.kam.x) * f;
  S.kam.y += (p.y - 8 - S.kam.y) * f;
}

// ---------- Partikel & schwebende Zahlen ----------
function splitter(x, y, farben, n) {
  for (let i = 0; i < n; i++) {
    const l = 0.4 + Math.random() * 0.4;
    S.partikel.push({ x, y, z: 2 + Math.random() * 4, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 50,
      vz: 40 + Math.random() * 70, leben: l, max: l, farbe: farben[i % farben.length], schwer: true, gr: 1 });
  }
}
function puff(x, y) {
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, l = 0.4 + Math.random() * 0.2;
    S.partikel.push({ x, y, z: 0, vx: Math.cos(a) * 40, vy: Math.sin(a) * 30, vz: 0, leben: l, max: l,
      farbe: i % 2 ? '#ffffff' : '#d8e8d0', schwer: false, gr: 2 });
  }
}
function funkeln(x, y, farbe) {
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * 6.28, l = 0.3 + Math.random() * 0.2;
    S.partikel.push({ x, y, z: 0, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30 - 10, vz: 0, leben: l, max: l, farbe, schwer: false, gr: 1 });
  }
}
function rauch() {
  const W = S.welt, I = G.hausInfo;
  const x = W.haus.x - I.w / 2 + I.rauch[0] + 0.5, y = W.haus.y + 2 - I.fussY + I.rauch[1];
  S.partikel.push({ x: x + (Math.random() - 0.5) * 2, y, z: 0, vx: 3 + Math.random() * 3, vy: -10 - Math.random() * 4, vz: 0,
    leben: 2.6, max: 2.6, farbe: '#d8d4cc', schwer: false, gr: 2, rauch: true });
}
function text(x, y, t, farbe) { S.texte.push({ x, y, t, farbe, leben: 0.9 }); }

function partikelUpdate(dt) {
  for (const q of S.partikel) {
    q.leben -= dt;
    q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.schwer) {
      q.vz -= 300 * dt; q.z += q.vz * dt;
      if (q.z < 0) { q.z = 0; q.vz = 0; q.vx *= 0.3; q.vy *= 0.3; }
    } else if (!q.rauch) { q.vx *= 0.9; q.vy *= 0.9; }
  }
  S.partikel = S.partikel.filter(q => q.leben > 0);
  for (const t of S.texte) { t.leben -= dt; t.y -= 18 * dt; }
  S.texte = S.texte.filter(t => t.leben > 0);
}

// ======================================================================
// Zeichnen
// ======================================================================
export function zeichne(ctx, cw, ch, zoom) {
  const W = S.welt, p = S.sp;
  const vw = cw / zoom, vh = ch / zoom, mw = B * K, mh = H * K;
  const cx = vw >= mw ? mw / 2 : klemme(S.kam.x, vw / 2, mw - vw / 2);
  const cy = vh >= mh ? mh / 2 : klemme(S.kam.y, vh / 2, mh - vh / 2);
  let wx = 0, wy = 0;
  if (S.wackeln > 0 && S.phase === 'tag') { wx = (Math.random() - 0.5) * 3; wy = (Math.random() - 0.5) * 3; }
  const ox = Math.round((cx - vw / 2 + wx) * zoom), oy = Math.round((cy - vh / 2 + wy) * zoom);
  const L = ox / zoom, T = oy / zoom, R = L + vw, U = T + vh;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#16301b'; ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(zoom, 0, 0, zoom, -ox, -oy);
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(W.bodenBild, 0, 0);
  wasserGlitzer(ctx, L, T, R, U);

  const sicht = (x, y, rx, oben, unten) => x > L - rx && x < R + rx && y > T - unten && y < U + oben;
  const spielt = S.phase !== 'titel';

  // Stoppeln und Schatten liegen flach auf dem Boden
  for (const b of S.bueschel) if (b.weg && sicht(b.x, b.y, 8, 4, 4)) ctx.drawImage(G.stoppel, Math.round(b.x - 6), Math.round(b.y - 4));
  ctx.fillStyle = 'rgba(16, 40, 16, 0.35)';
  if (spielt) ellipse(ctx, p.x, p.y, 5, 2);
  for (const g of S.gegner) if (sicht(g.x, g.y, 12, 12, 12)) ellipse(ctx, g.x, g.y, g.art === 'hummel' ? 3 : 5, g.art === 'hummel' ? 1.5 : 2);
  for (const e of S.beute) if (e.z > 1) ellipse(ctx, e.x, e.y + 3, 2.5, 1);

  // Alles, was steht, nach Höhe sortiert
  const liste = [];
  for (const b of S.bueschel) if (!b.weg && sicht(b.x, b.y, 12, 24, 4)) liste.push({ y: b.y, t: 0, o: b });
  for (const b of W.baeume) if (sicht(b.x, b.y, 24, 50, 4)) liste.push({ y: b.y, t: 1, o: b });
  if (sicht(W.haus.x, W.haus.y, 50, 85, 6)) liste.push({ y: W.haus.y, t: 2, o: W.haus });
  if (spielt) liste.push({ y: p.y, t: 3, o: p });
  for (const g of S.gegner) if (sicht(g.x, g.y, 12, 20, 4)) liste.push({ y: g.y, t: 4, o: g });
  for (const e of S.beute) liste.push({ y: e.y + 4, t: 5, o: e });
  liste.sort((a, b) => a.y - b.y);
  for (const e of liste) {
    switch (e.t) {
      case 0: zeichneBueschel(ctx, e.o, spielt); break;
      case 1: zeichneBaum(ctx, e.o, spielt); break;
      case 2: ctx.drawImage(G.haus, Math.round(W.haus.x - G.hausInfo.w / 2), Math.round(W.haus.y + 2 - G.hausInfo.fussY)); break;
      case 3: zeichneSpieler(ctx); break;
      case 4: zeichneGegner(ctx, e.o); break;
      case 5: zeichneBeute(ctx, e.o); break;
    }
  }

  // Partikel
  for (const q of S.partikel) {
    if (!sicht(q.x, q.y, 4, 4, 4)) continue;
    const a = q.leben / q.max;
    ctx.globalAlpha = q.rauch ? a * 0.6 : Math.min(1, a * 2);
    ctx.fillStyle = q.farbe;
    const gr = q.rauch ? 2 + (1 - a) * 4 : q.gr;
    ctx.fillRect(Math.round(q.x - gr / 2), Math.round(q.y - q.z - gr / 2), gr, gr);
  }
  ctx.globalAlpha = 1;

  // Schwebende Zahlen
  ctx.font = 'bold 7px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  for (const t of S.texte) {
    ctx.globalAlpha = Math.min(1, t.leben * 2.5);
    ctx.strokeStyle = '#1d1410'; ctx.strokeText(t.t, t.x, t.y);
    ctx.fillStyle = t.farbe; ctx.fillText(t.t, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  // Abendlicht
  const q = spielt ? S.zeit / S.dauer : 0;
  const abend = klemme((q - 0.6) / 0.4, 0, 1);
  if (abend > 0) {
    ctx.globalCompositeOperation = 'multiply';
    const rr = Math.round(255 - 165 * Math.max(0, abend - 0.4) / 0.6);
    const gg = Math.round(255 - 70 * Math.min(1, abend / 0.5) - 95 * Math.max(0, abend - 0.5) / 0.5);
    const bb = Math.round(255 - 115 * Math.min(1, abend / 0.5) + 30 * Math.max(0, abend - 0.5) / 0.5);
    ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
    ctx.fillRect(L - 2, T - 2, vw + 4, vh + 4);
    ctx.globalCompositeOperation = 'lighter';
    const I = G.hausInfo, hx = W.haus.x - I.w / 2, hy = W.haus.y + 2 - I.fussY;
    for (const [fx, fy, fr] of I.fenster) leuchten(ctx, hx + fx, hy + fy, fr * (1 + abend), abend * 0.55);
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (S.phase === 'abblende' || S.phase === 'bilanz') {
    ctx.fillStyle = S.endeGrund === 'ohnmacht' ? '#2a0a10' : '#0a0f22';
    ctx.globalAlpha = S.phase === 'bilanz' ? 0.75 : S.blende * 0.75;
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalAlpha = 1;
  }
  if (spielt && p.unverw > 1.0 && S.phase === 'tag') {
    ctx.fillStyle = `rgba(220, 30, 50, ${(p.unverw - 1.0) * 0.8})`;
    ctx.fillRect(0, 0, cw, ch);
  }
}

function ellipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function leuchten(ctx, x, y, r, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255, 200, 110, ${a})`); g.addColorStop(1, 'rgba(255, 200, 110, 0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function wasserGlitzer(ctx, L, T, R, U) {
  const w = S.welt.wasser;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let i = 0; i < w.length; i += 2) {
    const x = w[i] * K, y = w[i + 1] * K;
    if (x < L - K || x > R || y < T - K || y > U) continue;
    const h = (w[i] * 73 + w[i + 1] * 151) % 97;
    if (Math.sin(S.t * 1.7 + h) > 0.6) ctx.fillRect(x + 3 + (h % 8), y + 4 + (h % 7), 3, 1);
  }
}

function zeichneBueschel(ctx, b, spielt) {
  const img = G.bueschel[b.art];
  let s = Math.sin(S.t * 1.8 + b.ph) * 0.07;
  if (b.wackel > 0) s += Math.sin(b.wackel * 50) * b.wackel * 1.4;
  if (spielt) {
    const p = S.sp, dx = b.x - p.x, dy = b.y - p.y;
    if (Math.abs(dx) < 11 && Math.abs(dy) < 8) s += (dx > 0 ? 1 : -1) * 0.25;
  }
  ctx.save();
  ctx.translate(Math.round(b.x), Math.round(b.y));
  ctx.transform(1, 0, -s, 1, 0, 0);
  ctx.drawImage(img, -Math.floor(img.width / 2), -img.height + 1);
  ctx.restore();
}

function zeichneBaum(ctx, b, spielt) {
  const img = G.baum[b.v];
  // Steht der Held dahinter, wird die Krone durchsichtig
  let a = 1;
  if (spielt) {
    const p = S.sp;
    if (p.y < b.y - 2 && p.y > b.y - 46 && Math.abs(p.x - b.x) < 18) a = 0.5;
  }
  ctx.globalAlpha = a;
  ctx.drawImage(img, Math.round(b.x - 20), Math.round(b.y - 48));
  ctx.globalAlpha = 1;
}

function zeichneSpieler(ctx) {
  const p = S.sp;
  const blinkt = p.unverw > 0 && Math.floor(p.unverw * 14) % 2 === 0;
  const f = p.bewegt ? Math.floor(p.laufT * 8) % 4 : 0;
  const img = G.kind[p.blick][f];
  const hoch = p.bewegt && (f === 1 || f === 3) ? -1 : 0;
  const hinten = p.schlagT > 0 && Math.sin(aktuellerSchwertWinkel()) < -0.2;
  if (hinten) zeichneSchwert(ctx);
  if (!blinkt) ctx.drawImage(img, Math.round(p.x - 8), Math.round(p.y - 15 + hoch));
  if (!hinten) zeichneSchwert(ctx);
  // Aufladen für den Wirbelschlag
  if (p.ladung > 0.15) {
    const voll = p.ladung >= LADEZEIT;
    ctx.fillStyle = voll ? (Math.floor(S.t * 16) % 2 ? '#ffffff' : '#bfe9ff') : 'rgba(255,255,255,0.8)';
    const n = voll ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const a = S.t * 8 + i / n * Math.PI * 2, r = voll ? 11 : 13 - p.ladung * 6;
      ctx.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y - 7 + Math.sin(a) * r * 0.7), 1, 1);
    }
  }
}

function aktuellerSchwertWinkel() {
  const p = S.sp, w = S.w;
  const q = 1 - p.schlagT / p.schlagDauer, e = 1 - Math.pow(1 - q, 3);
  if (p.schlagRund) return p.schlagWinkel + e * Math.PI * 2;
  return p.schlagWinkel - w.bogen / 2 + w.bogen * e;
}

function zeichneSchwert(ctx) {
  const p = S.sp, w = S.w;
  if (p.schlagT <= 0) return;
  const q = 1 - p.schlagT / p.schlagDauer;
  const reich = w.reichweite * (p.schlagRund ? 1.25 : 1);
  const a = aktuellerSchwertWinkel();
  const a0 = p.schlagRund ? Math.max(p.schlagWinkel, a - 2.2) : Math.max(p.schlagWinkel - w.bogen / 2, a - 1.6);
  const cx = p.x, cy = p.y - 6;
  // Schwungspur
  ctx.fillStyle = `rgba(255, 255, 235, ${0.5 * (1 - q)})`;
  ctx.beginPath();
  ctx.arc(cx, cy, reich, a0, a);
  ctx.arc(cx, cy, reich * 0.45, a, a0, true);
  ctx.closePath(); ctx.fill();
  // Klinge
  const img = G.klinge[S.st.klinge | 0];
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(a);
  ctx.drawImage(img, 1, -4);
  ctx.restore();
}

function zeichneGegner(ctx, g) {
  const satz = G.gegner[g.art];
  const f = g.art === 'hummel' ? Math.floor(g.t * 20) % 2 : g.art === 'pilz' ? (g.hop > 0 ? 0 : 1) : 0;
  const reihe = g.blitz > 0 ? (g.links ? satz.lw : satz.rw) : (g.links ? satz.l : satz.r);
  const img = reihe[f];
  let sx = 1;
  if (g.art === 'schnecke') sx = 1 + Math.sin(g.t * 5) * 0.08;
  ctx.save();
  ctx.translate(Math.round(g.x), Math.round(g.y - g.z));
  if (sx !== 1) ctx.scale(sx, 1);
  ctx.drawImage(img, -Math.floor(img.width / 2), -img.height + 1);
  ctx.restore();
}

function zeichneBeute(ctx, e) {
  const img = e.herz ? G.herz : G.stein[e.typ];
  const schweb = e.z > 0.5 || e.zieht ? 0 : Math.round(Math.sin(S.t * 4 + e.x) * 1);
  ctx.drawImage(img, Math.round(e.x - img.width / 2), Math.round(e.y - img.height / 2 - e.z + schweb));
  if (!e.herz && Math.sin(S.t * 3 + e.x * 0.7) > 0.93) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(e.x + 1), Math.round(e.y - 5 - e.z), 1, 3);
    ctx.fillRect(Math.round(e.x), Math.round(e.y - 4 - e.z), 3, 1);
  }
}
