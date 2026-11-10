// hoehle.js – Die Kammern der Glitzerhöhle und ihre fünf Wächter.
// Eine Kammer ist eine kleine eigene Welt (gleiche Form wie der Wald: b, h, fest, bodenBild …),
// spiel.js tauscht sie beim Betreten gegen den Wald aus. Der Held, das Hauen, Diamanten und
// kleine Gegner laufen über dieselben Regeln wie draußen; hier kommt nur der Wächter dazu.
//
// Jeder Wächter kündigt seine Angriffe an (rote Marke am Boden, Zittern, Arme hoch),
// damit man mit Laufen ausweichen kann. Dazwischen gibt es Momente, in denen er offen ist.

import { KACHEL as K, KAMMERN } from './config.js';
import { G } from './grafik.js';
import { malKammer, THEMEN } from './hoehlengrafik.js';
import { SFX } from './ton.js';
import { klemme } from './hilfe.js';
import { S, aua, spawne, puff, splitter, funkeln, text, ruf, speichern, neueWerte } from './spiel.js';

export const KB = 15, KH = 13;
// Innenraum (Weltpixel), in dem sich der Wächter bewegt
const X0 = K + 2, X1 = (KB - 1) * K - 2, Y0 = 2 * K + 8, Y1 = (KH - 1) * K - 6;

const MASSE = {            // r = Körperradius am Boden, hoehe = Bildhöhe (für Trefferpunkt und Lebensleiste)
  schnecke: { r: 14, hoehe: 30 },
  koenigin: { r: 11, hoehe: 28 },
  schatten: { r: 13, hoehe: 36 },
  igel:     { r: 11, hoehe: 26 },
  waechter: { r: 16, hoehe: 54 },    // nicht mehr im Spiel (war Endboss vor der Riesenmotte)
  motte:    { r: 14, hoehe: 40 },
};

export function baueKammer(k) {
  const fest = new Uint8Array(KB * KH), sperr = new Uint8Array(KB * KH).fill(1);
  for (let y = 0; y < KH; y++) for (let x = 0; x < KB; x++) {
    if (x === 0 || x === KB - 1 || y <= 1 || y === KH - 1) fest[y * KB + x] = 1;
  }
  const tuer = { x: 7.5 * K, y: (KH - 1) * K };
  const W = {
    b: KB, h: KH, fest, sperr, boden: new Uint8Array(KB * KH), baeume: [], felsen: [], wasser: [],
    haus: null, hoehle: null, kammer: k, tuer, start: { x: tuer.x, y: tuer.y - 12 }, thema: THEMEN[k - 1],
  };
  W.bodenBild = malKammer(W, k);
  return W;
}

export function neuerBoss(k) {
  const d = KAMMERN[k - 1];
  return {
    k, art: d.art, name: d.boss, x: 7.5 * K, y: 6 * K, z: 0, hp: d.hp, max: d.hp, schaden: d.schaden,
    r: MASSE[d.art].r, hoehe: MASSE[d.art].hoehe,
    zustand: 'start', t: 1.4, links: true, blitz: 0, anim: 0, wx: 0, alpha: 1, ball: false, arme: false,
    vx: 0, vy: 0, zahl: 0, ruf: 4, tot: false, sterbeT: 0,
  };
}

const zu = (b, zustand, t) => { b.zustand = zustand; b.t = t; b.dauer = t; };
// Vier Lichtkristalle in der Kristallhalle – an ihnen landet die Riesenmotte zum Lichttrinken
const LICHTER = [[3 * K, 4 * K], [12 * K, 4 * K], [3 * K, 10 * K], [12 * K, 10 * K]];
const warn = (x, y, r, dauer, ring = false) => S.warn.push({ x, y, r, leben: dauer, max: dauer, ring });
const welle = (x, y, rmax, dauer, breite, schaden) => S.wellen.push({ x, y, r: 0, rmax, leben: dauer, max: dauer, breite, schaden, traf: false });
const zumHeld = (b) => { const p = S.sp, dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1; return { dx, dy, d }; };
const kleine = (art) => S.gegner.filter(g => g.art === art && !g.tot).length;

// ======================================================================
// Verhalten der fünf Wächter
// ======================================================================
const VERHALTEN = {
  // Riesenschnecke: kriecht hinterher, zittert – und stürmt dann geradeaus, bis sie gegen die Wand kracht.
  schnecke(b, dt, halb) {
    const { dx, dy, d } = zumHeld(b);
    switch (b.zustand) {
      case 'start': if (b.t <= 0) zu(b, 'kriechen', 2.2); break;
      case 'kriechen': {
        const v = halb ? 28 : 20;
        b.x += dx / d * v * dt; b.y += dy / d * v * dt; b.links = dx < 0;
        if (b.t <= 0) { zu(b, 'zittern', halb ? 0.6 : 0.85); b.dir = Math.atan2(dy, dx); SFX.warnung(); }
        break;
      }
      case 'zittern':
        b.wx = Math.round((Math.random() - 0.5) * 3);
        if (b.t <= 0) { b.wx = 0; zu(b, 'ansturm', 2.5); SFX.ansturm(); }
        break;
      case 'ansturm': {
        const v = halb ? 195 : 150;
        const nx = b.x + Math.cos(b.dir) * v * dt, ny = b.y + Math.sin(b.dir) * v * dt;
        b.links = Math.cos(b.dir) < 0;
        if (Math.random() < 0.6) splitter(b.x, b.y - 2, ['#b9d98a', '#dcf0b0'], 1);
        if (nx < X0 + b.r || nx > X1 - b.r || ny < Y0 || ny > Y1 || b.t <= 0) {
          zu(b, 'benommen', halb ? 1.4 : 1.8);
          S.wackeln = 0.3; SFX.stampfen(); puff(b.x + Math.cos(b.dir) * b.r, b.y - 8);
          if (halb && kleine('schnecke') < 3) spawne('schnecke', b.x - Math.cos(b.dir) * 20, b.y, true);
        } else { b.x = nx; b.y = ny; }
        break;
      }
      case 'benommen': if (b.t <= 0) zu(b, 'kriechen', halb ? 1.5 : 2.4); break;
    }
  },

  // Hummelkönigin: kreist hoch oben (nicht zu treffen), ruft Hummeln, stürzt sich auf eine
  // markierte Stelle – und sitzt danach kurz benommen am Boden. Das ist der Moment zum Hauen.
  koenigin(b, dt, halb) {
    const p = S.sp, HOCH = 24;
    switch (b.zustand) {
      case 'start': b.z = HOCH; if (b.t <= 0) zu(b, 'kreisen', 2.8); break;
      case 'kreisen': {
        b.z = HOCH + Math.sin(b.anim * 3) * 2;
        const zx = p.x + Math.cos(b.anim * 1.3) * 60, zy = p.y + Math.sin(b.anim * 1.3) * 34 - 6;
        const ex = zx - b.x, ey = zy - b.y, ed = Math.hypot(ex, ey) || 1, v = Math.min(80, ed * 3);
        b.x += ex / ed * v * dt; b.y += ey / ed * v * dt; b.links = ex < 0;
        b.ruf -= dt;
        if (b.ruf <= 0) {
          b.ruf = halb ? 6 : 8.5;
          for (let i = 0; i < 2 && kleine('hummel') < 4; i++) spawne('hummel', b.x + (i ? 14 : -14), b.y, true);
          SFX.summen();
        }
        if (b.t <= 0) { zu(b, 'zielen', halb ? 0.7 : 0.9); b.zx = p.x; b.zy = p.y; warn(b.zx, b.zy, 14, b.t + 0.22); SFX.warnung(); }
        break;
      }
      case 'zielen': {
        const ex = b.zx - b.x, ey = b.zy - b.y, ed = Math.hypot(ex, ey) || 1, v = Math.min(140, ed * 6);
        b.x += ex / ed * v * dt; b.y += ey / ed * v * dt; b.links = ex < 0;
        if (b.t <= 0) { zu(b, 'sturz', 0.22); b.sx = b.x; b.sy = b.y; }
        break;
      }
      case 'sturz': {
        const q = 1 - Math.max(0, b.t) / b.dauer;
        b.x = b.sx + (b.zx - b.sx) * q; b.y = b.sy + (b.zy - b.sy) * q; b.z = HOCH * (1 - q * q);
        if (b.t <= 0) {
          b.z = 0; b.zahl++;
          welle(b.x, b.y, 30, 0.35, 8, 1); S.wackeln = 0.25; SFX.stampfen(); puff(b.x, b.y - 2);
          zu(b, 'sitzt', halb ? 1.4 : 1.9);
        }
        break;
      }
      case 'sitzt': if (b.t <= 0) zu(b, 'steigen', 0.45); break;
      case 'steigen':
        b.z = HOCH * (1 - Math.max(0, b.t) / b.dauer);
        if (b.t <= 0) {
          // In der zweiten Hälfte gleich noch ein Sturzflug hinterher
          if (halb && b.zahl % 2 === 1) { zu(b, 'zielen', 0.6); b.zx = p.x; b.zy = p.y; warn(b.zx, b.zy, 14, 0.82); SFX.warnung(); }
          else zu(b, 'kreisen', 2.6);
        }
        break;
    }
  },

  // Schattenpilz: duckt sich, springt auf die markierte Stelle und schickt beim Landen eine
  // Druckwelle durch die Halle. Jeder dritte Sprung: Er wird fast unsichtbar und schleicht heran.
  schatten(b, dt, halb) {
    const p = S.sp, { dx, dy, d } = zumHeld(b);
    b.alpha += ((b.zustand === 'schatten' ? 0.16 : 1) - b.alpha) * Math.min(1, dt * 5);
    switch (b.zustand) {
      case 'start': if (b.t <= 0) zu(b, 'warten', 0.8); break;
      case 'warten':
        b.x += dx / d * 14 * dt; b.y += dy / d * 14 * dt; b.links = dx < 0;
        if (b.t <= 0) {
          zu(b, 'ducken', halb ? 0.4 : 0.55);
          b.zx = klemme(p.x, X0 + b.r, X1 - b.r); b.zy = klemme(p.y, Y0, Y1);
          warn(b.zx, b.zy, 14, b.t + 0.75); warn(b.zx, b.zy, 62, b.t + 0.75, true); SFX.warnung();
        }
        break;
      case 'ducken': if (b.t <= 0) { zu(b, 'sprung', 0.75); b.sx = b.x; b.sy = b.y; SFX.ansturm(); } break;
      case 'sprung': {
        const q = 1 - Math.max(0, b.t) / b.dauer;
        b.x = b.sx + (b.zx - b.sx) * q; b.y = b.sy + (b.zy - b.sy) * q; b.z = Math.sin(q * Math.PI) * 46;
        b.links = b.zx < b.sx;
        if (b.t <= 0) {
          b.z = 0; b.zahl++;
          welle(b.x, b.y, 62, 0.6, 9, 1); S.wackeln = 0.35; SFX.stampfen();
          if (b.zahl % 3 === 0) {
            zu(b, 'schatten', 2.6);
            if (halb && kleine('pilz') < 3) { spawne('pilz', b.x - 22, b.y, true); spawne('pilz', b.x + 22, b.y, true); }
          } else zu(b, 'warten', halb ? 0.7 : 1.1);
        }
        break;
      }
      case 'schatten':
        b.x += dx / d * 34 * dt; b.y += dy / d * 34 * dt; b.links = dx < 0;
        if (b.t <= 0) zu(b, 'warten', 0.6);
        break;
    }
  },

  // Eisigel: rollt sich ein und flitzt als Stachelkugel durch die Kammer (dann prallt jeder Hieb ab),
  // ist danach schwindelig – und schießt beim Aufwachen Eisstacheln in alle Richtungen.
  igel(b, dt, halb) {
    const { dx, dy } = zumHeld(b);
    switch (b.zustand) {
      case 'start': if (b.t <= 0) zu(b, 'stehen', 0.8); break;
      case 'stehen': b.links = dx < 0; if (b.t <= 0) { zu(b, 'einrollen', 0.6); SFX.warnung(); } break;
      case 'einrollen':
        b.wx = Math.round((Math.random() - 0.5) * 2);
        if (b.t <= 0) {
          b.wx = 0; b.ball = true; zu(b, 'rollen', halb ? 4.5 : 3.6);
          const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.6, v = halb ? 165 : 130;
          b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; SFX.ansturm();
        }
        break;
      case 'rollen': {
        b.x += b.vx * dt; b.y += b.vy * dt;
        let prall = false;
        if (b.x < X0 + b.r) { b.x = X0 + b.r; b.vx = Math.abs(b.vx); prall = true; }
        if (b.x > X1 - b.r) { b.x = X1 - b.r; b.vx = -Math.abs(b.vx); prall = true; }
        if (b.y < Y0) { b.y = Y0; b.vy = Math.abs(b.vy); prall = true; }
        if (b.y > Y1) { b.y = Y1; b.vy = -Math.abs(b.vy); prall = true; }
        if (prall) { SFX.kling(); S.wackeln = 0.1; splitter(b.x, b.y - 8, ['#e8fbff', '#7ec4e4'], 4); }
        if (b.t <= 0) { b.ball = false; zu(b, 'schwindel', 2.1); }
        break;
      }
      case 'schwindel':
        if (b.t <= 0) {
          zu(b, 'stacheln', 0.5);
          const n = halb ? 12 : 8, v = halb ? 105 : 90, a0 = Math.random();
          for (let i = 0; i < n; i++) {
            const a = a0 + i / n * Math.PI * 2;
            S.geschosse.push({ art: 'stachel', x: b.x, y: b.y - 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, leben: 3 });
          }
          SFX.werfen();
        }
        break;
      case 'stacheln': if (b.t <= 0) zu(b, 'stehen', halb ? 0.6 : 0.9); break;
    }
  },

  // Steinwächter: stapft heran. Arme hoch = gleich bebt der Boden (raus aus dem roten Kreis!).
  // Nach dem Stampfen glüht sein Kern – dann trifft man doppelt, sonst prallt die Hälfte am Stein ab.
  // Oder er wirft Felsbrocken, die auf die markierten Stellen fallen.
  waechter(b, dt, halb) {
    const p = S.sp, { dx, dy, d } = zumHeld(b);
    switch (b.zustand) {
      case 'start': if (b.t <= 0) zu(b, 'gehen', 1.6); break;
      case 'gehen': {
        const v = halb ? 22 : 16;
        b.arme = false;
        b.x += dx / d * v * dt; b.y += dy / d * v * dt; b.links = dx < 0;
        if (b.t <= 0) {
          b.zahl++;
          if (b.zahl % 2 === 1) { zu(b, 'heben', halb ? 0.7 : 0.95); warn(b.x, b.y, 80, b.t, true); SFX.warnung(); }
          else zu(b, 'werfen', 0.5);
          b.arme = true;
        }
        break;
      }
      case 'heben':
        if (b.t <= 0) {
          b.arme = false; welle(b.x, b.y, 84, 0.7, 11, 2);
          S.wackeln = 0.45; SFX.stampfen(); puff(b.x - 14, b.y); puff(b.x + 14, b.y);
          zu(b, 'muede', 1.7);
        }
        break;
      case 'werfen':
        if (b.t <= 0) {
          const n = halb ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const tx = klemme(p.x + (i ? (Math.random() - 0.5) * 90 : 0), X0 + 6, X1 - 6);
            const ty = klemme(p.y + (i ? (Math.random() - 0.5) * 60 : 0), Y0, Y1);
            const verz = i * 0.18;
            S.geschosse.push({ art: 'fels', x: tx, y: ty, z: 150, verz, leben: 4 });
            warn(tx, ty, 11, verz + 150 / 170);
          }
          SFX.werfen(); b.arme = false;
          zu(b, 'gehen', halb ? 1.6 : 2.2);
        }
        break;
      case 'muede': if (b.t <= 0) zu(b, 'gehen', halb ? 1.4 : 2); break;
    }
  },
};

// Riesenmotte (Endboss): flattert hoch oben (nicht zu treffen) und streut Glitzerstaub, der nach
// einer roten Warnmarke kurz liegen bleibt und wehtut. Flügelsturm: Windstoß drückt den Helden weg,
// dazu ein Fächer Staubkugeln. Dann leuchtet ein Kristall auf, die Motte landet dort und trinkt
// Licht – das ist der Moment zum Hauen. Ab halber Kraft schneller und mit Mottenkindern.
VERHALTEN.motte = function (b, dt, halb) {
  const p = S.sp, HOCH = 28;
  const fliege = (zx, zy, vmax) => {
    const ex = zx - b.x, ey = zy - b.y, ed = Math.hypot(ex, ey) || 1, v = Math.min(vmax, ed * 4);
    b.x += ex / ed * v * dt; b.y += ey / ed * v * dt;
  };
  switch (b.zustand) {
    case 'start': b.z = HOCH; if (b.t <= 0) { zu(b, 'flattern', 3); b.staubT = 1; } break;
    case 'flattern': {
      b.z = HOCH + Math.sin(b.anim * 4) * 3;
      const mx = 7.5 * K, my = 7 * K;
      fliege(mx + Math.cos(b.anim * 0.9) * 70, my + Math.sin(b.anim * 1.8) * 32, halb ? 110 : 85);
      b.staubT -= dt;
      if (b.staubT <= 0) {
        b.staubT = halb ? 0.75 : 1.15;
        // Staub fällt dorthin, wo der Held gerade ist – oder dicht daneben
        const sx = klemme(p.x + (Math.random() - 0.5) * 30, X0 + 8, X1 - 8), sy = klemme(p.y + (Math.random() - 0.5) * 20, Y0, Y1);
        S.geschosse.push({ art: 'staub', x: sx, y: sy, r: 15, verz: 0.75, leben: 0.75 + 2.2 });
      }
      if (b.t <= 0) {
        b.zahl++;
        if (b.zahl % 2 === 1) { zu(b, 'sturm', halb ? 1.1 : 1.4); SFX.warnung(); }
        else {
          b.kristall = Math.floor(Math.random() * LICHTER.length);
          const [kx, ky] = LICHTER[b.kristall];
          warn(kx, ky + 10, 16, 1.3);
          zu(b, 'anflug', 1.3);
        }
      }
      break;
    }
    case 'sturm':
      b.z = HOCH;
      fliege(7.5 * K, 3.5 * K, 120);
      if (b.t <= b.dauer - 0.7 && !b.geblasen) {
        b.geblasen = true;
        const n = halb ? 7 : 5, basis = Math.atan2(p.y - 6 - (b.y - b.z), p.x - b.x);
        for (let i = 0; i < n; i++) {
          const a = basis + (i - (n - 1) / 2) * 0.28;
          S.geschosse.push({ art: 'kugel', x: b.x, y: b.y - 4, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, leben: 3 });
        }
        // Windstoß drückt den Helden weg
        const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
        p.kx += dx / d * 170; p.ky += dy / d * 170;
        S.wackeln = 0.2; SFX.fluegel();
      }
      if (b.t <= 0) { b.geblasen = false; zu(b, 'flattern', halb ? 2.2 : 3); }
      break;
    case 'anflug': {
      const [kx, ky] = LICHTER[b.kristall];
      b.z = HOCH;
      fliege(kx, ky + 10, 130);
      if (b.t <= 0) { zu(b, 'landen', 0.35); b.sx = b.x; b.sy = b.y; }
      break;
    }
    case 'landen':
      b.z = HOCH * Math.max(0, b.t) / b.dauer;
      if (b.t <= 0) { b.z = 0; zu(b, 'trinken', halb ? 1.7 : 2.3); SFX.stampfen(); puff(b.x, b.y - 2); }
      break;
    case 'trinken':
      if (b.t <= 0) {
        zu(b, 'steigen', 0.5); b.kristall = -1;
        if (halb) for (let i = 0; i < 2 && kleine('motte') < 4; i++) spawne('motte', b.x + (i ? 16 : -16), b.y, true);
      }
      break;
    case 'steigen':
      b.z = HOCH * (1 - Math.max(0, b.t) / b.dauer);
      if (b.t <= 0) zu(b, 'flattern', halb ? 2.4 : 3.2);
      break;
  }
};

// ======================================================================
// Ablauf in der Kammer
// ======================================================================
export function kammerUpdate(dt) {
  const b = S.boss, p = S.sp;
  if (b) {
    b.anim += dt; if (b.blitz > 0) b.blitz -= dt;
    if (b.tot) sterben(b, dt);
    else {
      b.t -= dt;
      VERHALTEN[b.art](b, dt, b.hp < b.max / 2);
      b.x = klemme(b.x, X0 + b.r, X1 - b.r); b.y = klemme(b.y, Y0, Y1);
      // Berührung tut weh (nicht, solange er hoch in der Luft ist)
      if (S.boss && b.z < 6 && b.zustand !== 'start' && p.unverw <= 0) {
        if (Math.hypot(p.x - b.x, (p.y - b.y) * 1.4) < b.r + 3) aua(b, b.schaden);
      }
    }
  }
  geschosse(dt); wellen(dt);
  for (const w of S.warn) w.leben -= dt;
  S.warn = S.warn.filter(w => w.leben > 0);

  // Belohnung aufheben, danach geht die Tür auf
  const bd = S.belohnungsDing;
  if (bd) {
    bd.t += dt;
    if (bd.t > 0.8 && Math.hypot(p.x - bd.x, p.y - bd.y) < 13) {
      S.belohnungsDing = null; S.kammerFertig = true;
      SFX.sieg();
      ruf('belohnung', bd.k);
    }
  }
  if (S.kammerFertig && p.y > S.welt.tuer.y - 8 && Math.abs(p.x - S.welt.tuer.x) < 11) ruf('kammerVerlassen');
}

function geschosse(dt) {
  const p = S.sp;
  for (const g of S.geschosse) {
    g.leben -= dt;
    if (g.art === 'stachel') {
      g.x += g.vx * dt; g.y += g.vy * dt;
      if (p.unverw <= 0 && Math.hypot(p.x - g.x, p.y - 5 - g.y) < 6) { aua(g, 1); g.weg = true; }
      if (g.x < X0 - 6 || g.x > X1 + 6 || g.y < Y0 - 16 || g.y > Y1 + 6) { g.weg = true; splitter(g.x, g.y, ['#e8fbff', '#7ec4e4'], 3); }
    } else if (g.art === 'kugel') {
      g.x += g.vx * dt; g.y += g.vy * dt;
      if (p.unverw <= 0 && Math.hypot(p.x - g.x, p.y - 5 - g.y) < 6) { aua(g, 1); g.weg = true; }
      if (g.x < X0 - 6 || g.x > X1 + 6 || g.y < Y0 - 16 || g.y > Y1 + 6) { g.weg = true; splitter(g.x, g.y, ['#e4e0f6', '#b8b0dc', '#ffd23f'], 3); }
    } else if (g.art === 'staub') {
      if (g.verz > 0) g.verz -= dt;
      else if (p.unverw <= 0 && Math.hypot(p.x - g.x, (p.y - g.y) / 0.7) < g.r) aua(g, 1);
    } else if (g.art === 'fels') {
      if (g.verz > 0) { g.verz -= dt; continue; }
      g.z -= 170 * dt;
      if (g.z <= 0) {
        g.weg = true;
        if (p.unverw <= 0 && Math.hypot(p.x - g.x, (p.y - g.y) * 1.3) < 13) aua(g, 2);
        puff(g.x, g.y - 2); splitter(g.x, g.y - 3, ['#7d7884', '#55505c', '#a29cab'], 6);
        S.wackeln = Math.max(S.wackeln, 0.15); SFX.tock();
      }
    }
    if (g.leben <= 0) g.weg = true;
  }
  S.geschosse = S.geschosse.filter(g => !g.weg);
}

function wellen(dt) {
  const p = S.sp;
  for (const w of S.wellen) {
    w.leben -= dt;
    w.r = w.rmax * (1 - Math.max(0, w.leben) / w.max);
    if (!w.traf && p.unverw <= 0) {
      const d = Math.hypot(p.x - w.x, (p.y - w.y) / 0.7);
      if (Math.abs(d - w.r) < w.breite / 2 + 2) { w.traf = true; aua(w, w.schaden); }
    }
  }
  S.wellen = S.wellen.filter(w => w.leben > 0);
}

// Vom Schwerthieb aus spiel.js gerufen
export function bossTreffer(trifft, schaden) {
  const b = S.boss;
  if (!b || b.tot || b.zustand === 'start' || b.z > 8) return;
  if (!trifft(b.x, b.y - b.hoehe * 0.45, b.r)) return;
  if (b.art === 'igel' && (b.ball || b.zustand === 'einrollen')) {
    SFX.kling(); funkeln(b.x, b.y - 10, '#ffffff'); text(b.x, b.y - b.hoehe - 2, 'kling!', '#bfe9ff');
    return;
  }
  let mal = 1;
  if (b.art === 'waechter') mal = b.zustand === 'muede' ? 2 : 0.5;
  const s = Math.max(1, Math.round(schaden * mal));
  b.hp -= s; b.blitz = 0.12; S.stopp = 0.05;
  text(b.x + (Math.random() - 0.5) * 10, b.y - b.hoehe - 2, '−' + s, mal > 1 ? '#ffd23f' : mal < 1 ? '#b8b0c4' : '#ffffff');
  SFX.bossTreffer();
  if (b.hp <= 0) {
    b.hp = 0; b.tot = true; b.sterbeT = 1.5; b.z = 0; b.alpha = 1; b.ball = false;
    S.geschosse = []; S.wellen = []; S.warn = [];
    for (const g of S.gegner) if (!g.tot) { g.tot = true; puff(g.x, g.y - 4); }
    S.wackeln = 0.6; SFX.bossWeg();
  }
}

function sterben(b, dt) {
  b.sterbeT -= dt;
  b.blitz = Math.floor(b.sterbeT * 14) % 2 ? 0.1 : 0;
  if (Math.random() < dt * 14) puff(b.x + (Math.random() - 0.5) * b.r * 2, b.y - Math.random() * b.hoehe);
  if (b.sterbeT > 0) return;
  // Schatz regnet herunter, die Belohnung bleibt liegen
  const d = KAMMERN[b.k - 1];
  d.schatz.forEach((n, typ) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 70;
      S.beute.push({ x: b.x, y: b.y - 6, z: 4, vz: 90 + Math.random() * 60, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, typ, herz: false, t: -0.3, zieht: false, sp: 0 });
    }
  });
  S.belohnungsDing = { x: b.x, y: b.y, k: b.k, t: 0 };
  puff(b.x, b.y - 10); puff(b.x, b.y - 24);
  S.boss = null;
  S.st.bosse = Math.max(S.st.bosse | 0, b.k);
  neueWerte();
  speichern();
  ruf('bossBesiegt', b.k);
}

// ======================================================================
// Zeichnen
// ======================================================================
// Flach auf dem Boden: Druckwellen, Warnmarken, Schatten
export function kammerBoden(ctx) {
  const W = S.welt, t = W.tuer;
  if (W.kammer === 5) kristalle(ctx);
  for (const g of S.geschosse) if (g.art === 'staub') staubWolke(ctx, g);
  for (const w of S.warn) {
    const a = 0.35 + 0.35 * Math.sin(S.t * 18);
    ctx.globalAlpha = Math.min(1, w.leben * 4) * a;
    if (w.ring) {
      ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
    } else {
      const q = 1 - w.leben / w.max;
      ctx.fillStyle = '#ff4a3a';
      ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r * (0.5 + q * 0.5), w.r * 0.7 * (0.5 + q * 0.5), 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  for (const w of S.wellen) {
    ctx.globalAlpha = Math.min(1, w.leben / w.max * 2);
    ctx.strokeStyle = '#fff4d0'; ctx.lineWidth = w.breite * 0.6;
    ctx.beginPath(); ctx.ellipse(w.x, w.y, Math.max(1, w.r), Math.max(1, w.r * 0.7), 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  const b = S.boss;
  if (b) ell(ctx, b.x, b.y, b.r * (1 - Math.min(0.5, b.z / 60)), b.r * 0.38);
  for (const g of S.geschosse) if (g.art === 'fels' && g.verz <= 0) ell(ctx, g.x, g.y, 4 + (1 - g.z / 150) * 6, 2 + (1 - g.z / 150) * 2);
  // Gitter vor der Tür, solange sie zu ist
  if (!S.kammerFertig) {
    ctx.fillStyle = '#2b2620';
    for (let x = t.x - 8; x <= t.x + 8; x += 4) ctx.fillRect(Math.round(x), t.y - 2, 2, 16);
    ctx.fillRect(t.x - 9, t.y + 2, 19, 2); ctx.fillRect(t.x - 9, t.y + 9, 19, 2);
    ctx.fillStyle = '#6a6058';
    for (let x = t.x - 8; x <= t.x + 8; x += 4) ctx.fillRect(Math.round(x), t.y - 2, 1, 16);
  }
}
// Die vier Lichtkristalle; der, an dem die Motte gleich landet oder trinkt, leuchtet
function kristalle(ctx) {
  const b = S.boss;
  LICHTER.forEach(([x, y], i) => {
    const an = b && b.art === 'motte' && b.kristall === i;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ell(ctx, x, y + 1, 6, 2);
    ctx.fillStyle = '#1d3550'; ctx.fillRect(x - 4, y - 9, 8, 10); ctx.fillRect(x - 2, y - 13, 4, 4);
    ctx.fillStyle = an ? '#e8fbff' : '#7fe3ef'; ctx.fillRect(x - 3, y - 8, 3, 8); ctx.fillRect(x - 1, y - 12, 2, 4);
    ctx.fillStyle = an ? '#ffffff' : '#2a8fb0'; ctx.fillRect(x, y - 8, 3, 8);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 7, 1, 2);
    if (an) {
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(x, y - 6, 0, x, y - 6, 26);
      const a = 0.45 + 0.2 * Math.sin(S.t * 10);
      gr.addColorStop(0, `rgba(170, 240, 255, ${a})`); gr.addColorStop(1, 'rgba(170, 240, 255, 0)');
      ctx.fillStyle = gr; ctx.fillRect(x - 26, y - 32, 52, 52);
      ctx.globalCompositeOperation = 'source-over';
    }
  });
}

// Glitzerstaub: erst rote Warnmarke, dann eine schimmernde Wolke, die kurz liegen bleibt
function staubWolke(ctx, g) {
  if (g.verz > 0) {
    const q = 1 - g.verz / 0.75, a = 0.35 + 0.35 * Math.sin(S.t * 18);
    ctx.globalAlpha = a; ctx.fillStyle = '#ff4a3a';
    ell(ctx, g.x, g.y, g.r * (0.4 + 0.6 * q), g.r * 0.7 * (0.4 + 0.6 * q));
    ctx.globalAlpha = 1;
    return;
  }
  const a = Math.min(1, g.leben * 1.5);
  ctx.globalAlpha = 0.45 * a; ctx.fillStyle = '#c8bff0'; ell(ctx, g.x, g.y, g.r, g.r * 0.7);
  ctx.globalAlpha = 0.5 * a; ctx.fillStyle = '#e8e2ff'; ell(ctx, g.x - 3, g.y - 1, g.r * 0.55, g.r * 0.4);
  ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) {
    const w = S.t * 3 + i * 1.7;
    if (Math.sin(w * 2.3) > 0.2) ctx.fillRect(Math.round(g.x + Math.cos(w) * g.r * 0.7), Math.round(g.y + Math.sin(w * 1.3) * g.r * 0.45 - 2), 1, 1);
  }
  ctx.globalAlpha = 1;
}

function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }

// Was in die nach Höhe sortierte Liste gehört
export function kammerListe(liste) {
  if (S.boss) liste.push({ y: S.boss.y, t: 'boss', o: S.boss });
  for (const g of S.geschosse) if (g.art === 'stachel' || g.art === 'kugel' || (g.art === 'fels' && g.verz <= 0)) liste.push({ y: g.y, t: 'geschoss', o: g });
  if (S.belohnungsDing) liste.push({ y: S.belohnungsDing.y, t: 'belohnung', o: S.belohnungsDing });
}

export function kammerZeichne(ctx, e) {
  if (e.t === 'boss') zeichneBoss(ctx, e.o);
  else if (e.t === 'geschoss') {
    const g = e.o;
    if (g.art === 'kugel') {
      const x = Math.round(g.x), y = Math.round(g.y);
      ctx.fillStyle = '#241c30'; ctx.fillRect(x - 3, y - 2, 6, 4); ctx.fillRect(x - 2, y - 3, 4, 6);
      ctx.fillStyle = '#c8bff0'; ctx.fillRect(x - 2, y - 2, 4, 4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 2, 1, 1);
      if (Math.sin(S.t * 20 + x) > 0) { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 1, y, 1, 1); }
    } else if (g.art === 'stachel') {
      ctx.save(); ctx.translate(Math.round(g.x), Math.round(g.y)); ctx.rotate(Math.atan2(g.vy, g.vx));
      ctx.fillStyle = '#1a2a3a'; ctx.fillRect(-5, -2, 9, 4);
      ctx.fillStyle = '#9ad8f2'; ctx.fillRect(-4, -1, 7, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(1, -1, 3, 1);
      ctx.restore();
    } else {
      const x = Math.round(g.x), y = Math.round(g.y - g.z - 5);
      ctx.fillStyle = '#18161c'; ctx.fillRect(x - 6, y - 4, 12, 9); ctx.fillRect(x - 5, y - 5, 10, 11);
      ctx.fillStyle = '#7d7884'; ctx.fillRect(x - 5, y - 4, 10, 8); ctx.fillRect(x - 4, y - 4, 8, 9);
      ctx.fillStyle = '#a29cab'; ctx.fillRect(x - 4, y - 3, 4, 3);
    }
  } else if (e.t === 'belohnung') {
    const bd = e.o, k = bd.k;
    const img = [G.belohnung.fackel, G.belohnung.herz, G.belohnung.steigeisen, G.belohnung.schliff, G.belohnung.riesendiamant][k - 1];
    const schweb = Math.sin(S.t * 3) * 2;
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(bd.x, bd.y - 10, 0, bd.x, bd.y - 10, 22);
    gr.addColorStop(0, 'rgba(255, 240, 170, 0.55)'); gr.addColorStop(1, 'rgba(255, 240, 170, 0)');
    ctx.fillStyle = gr; ctx.fillRect(bd.x - 22, bd.y - 32, 44, 44);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(img, Math.round(bd.x - img.width / 2), Math.round(bd.y - img.height - 4 + schweb));
  }
}

function zeichneBoss(ctx, b) {
  const s = G.boss[b.art];
  let img;
  if (b.art === 'motte') {
    // Flügelschlag: oben – Mitte – unten – Mitte; beim Lichttrinken langsam
    const f = [0, 1, 2, 1][Math.floor(b.anim * (b.zustand === 'trinken' ? 3 : 12)) % 4];
    img = (b.blitz > 0 ? s.weiss : s.bilder)[f];
  } else if (b.art === 'igel' && b.ball) img = b.blitz > 0 ? s.kugelW : s.kugel;
  else {
    const f = b.art === 'koenigin' ? Math.floor(b.anim * 18) % 2 : b.art === 'waechter' ? (b.arme ? 1 : 0) : 0;
    img = (b.blitz > 0 ? (b.links ? s.lw : s.rw) : (b.links ? s.l : s.r))[f];
  }
  let sx = 1, sy = 1;
  if (b.art === 'schnecke' && b.zustand === 'kriechen') sx = 1 + Math.sin(b.anim * 5) * 0.06;
  if (b.art === 'schatten' && b.zustand === 'ducken') { sx = 1.15; sy = 0.78; }
  if (b.art === 'waechter' && b.zustand === 'gehen') sy = 1 + Math.sin(b.anim * 6) * 0.02;
  ctx.save();
  ctx.globalAlpha = b.alpha;
  ctx.translate(Math.round(b.x + b.wx), Math.round(b.y - b.z));
  if (b.art === 'igel' && b.ball) {
    ctx.translate(0, -img.height / 2 + 1);
    ctx.rotate(b.anim * (b.vx < 0 ? -12 : 12));
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
  } else {
    ctx.scale(sx, sy);
    ctx.drawImage(img, -Math.floor(img.width / 2), -img.height + 1);
  }
  ctx.restore();
  // Glühender Kern des Steinwächters
  if (b.art === 'waechter' && (b.zustand === 'muede' || b.tot)) {
    const kx = b.x, ky = b.y - 58 + 31, a = 0.5 + 0.3 * Math.sin(S.t * 12);
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(kx, ky, 0, kx, ky, 16);
    gr.addColorStop(0, `rgba(255, 220, 90, ${a})`); gr.addColorStop(1, 'rgba(255, 220, 90, 0)');
    ctx.fillStyle = gr; ctx.fillRect(kx - 16, ky - 16, 32, 32);
    ctx.globalCompositeOperation = 'source-over';
  }
  // Sternchen, wenn er benommen ist
  if (['benommen', 'sitzt', 'schwindel', 'muede', 'trinken'].includes(b.zustand)) {
    ctx.fillStyle = '#ffe680';
    for (let i = 0; i < 3; i++) {
      const a = S.t * 6 + i * 2.1;
      ctx.fillRect(Math.round(b.x + Math.cos(a) * 9), Math.round(b.y - b.hoehe - 3 + Math.sin(a) * 3), 2, 2);
    }
  }
}

// Über allem: Dunkelheit in der Schattenhalle (nur der Lichtkreis der Fackel bleibt hell)
export function kammerDunkel(ctx, L, T, vw, vh) {
  if (S.welt.kammer !== 3) return;
  const p = S.sp, x = p.x, y = p.y - 8;
  const gr = ctx.createRadialGradient(x, y, 30, x, y, 95);
  gr.addColorStop(0, 'rgba(6, 3, 12, 0)'); gr.addColorStop(1, 'rgba(6, 3, 12, 0.82)');
  ctx.fillStyle = gr; ctx.fillRect(L - 2, T - 2, vw + 4, vh + 4);
}

