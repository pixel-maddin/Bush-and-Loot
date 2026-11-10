// leben.js – Gewusel im Wald, nur zur Stimmung (keine Spielregeln): Vögel ziehen übers Bild,
// Mückenschwärme tanzen (abends als Glühwürmchen), Enten schwimmen auf den Teichen, Schilf wiegt
// sich am Ufer, und ab und zu guckt ein Eichhörnchen hinter einem Baum hervor.
// Alles aus Code gemalt wie der Rest. Wind (Sturm) schiebt Vögel und Insekten mit (S.wetter.wind).

import { KACHEL as K } from './config.js';
import { PB, spiegeln, ausText } from './grafik.js';
import { BODEN } from './welt.js';
import { zufall } from './hilfe.js';

const B = {};          // Bilder
let L = null;          // Zustand für die aktuelle Waldwelt

function bilder() {
  if (B.fertig) return;
  // Vogel von der Seite (nach rechts), zwei Flügelschläge
  const vogel = (oben) => ausText(oben
    ? ['..k...', '.kwk..', 'kkbbkO', '..kk..']
    : ['......', 'kkbbkO', '.kwk..', '..k...'], { k: '#2b1d16', b: '#6a5a4a', w: '#d8c8b0', O: '#f0a030' }).bild();
  B.vogel = [vogel(true), vogel(false)];
  B.vogelL = B.vogel.map(spiegeln);
  // Stockente (nach rechts): grüner Kopf, brauner Leib
  const ente = (kopfTief) => ausText(kopfTief
    ? ['...........', '...........', '.kkkkkk....', 'kbbbwwbkkk.', 'kbbbbbbkggk', 'kbbbbbbbkyy', '.kkkkkkkk..']
    : ['.......kk..', '......kggk.', '......kgwyy', '.kkkkkkggk.', 'kbbbwwbbbk.', 'kbbbbbbbbk.', '.kkkkkkkk..'],
    { k: '#2b1d16', b: '#8a6a4a', w: '#e8e0d0', g: '#2f8a42', y: '#f0b030' }).bild();
  B.ente = [ente(false), ente(true)];
  B.enteL = B.ente.map(spiegeln);
  // Eichhörnchen-Kopf mit Öhrchen und Pfötchen (guckt nach links / rechts)
  const hoernchen = ausText([
    '.k...k..', 'kak.kak.', 'kaaaaak.', 'kaekaak.', 'kanaaak.', '.kaaak..', 'kpk.kpk.',
  ], { k: '#2b1d16', a: '#c86a2a', e: '#1e1b30', n: '#4a2a1a', p: '#e8a060' }).bild();
  B.hoernchen = hoernchen; B.hoernchenR = spiegeln(hoernchen);
  // Schilfhalm mit Kolben
  B.schilf = [0, 1, 2].map(v => {
    const pb = new PB(5, 14);
    for (let y = 3; y < 14; y++) pb.set(2, y, y > 10 ? '#3f7a32' : '#5a9a3e');
    if (v !== 1) { pb.rechteck(1, 1, 3, 4, '#6b4220'); pb.set(1, 1, '#8c5a2c'); }
    if (v !== 2) { for (let y = 7; y < 13; y++) pb.set(y < 10 ? 0 : 1, y, '#6aa84f'); }
    for (let y = 8; y < 13; y++) pb.set(4, y, '#5a9a3e');
    return pb.bild();
  });
  B.fertig = true;
}

// Für jede neue Waldwelt (Startwert fest): Schilf am Teichrand, Enten auf dem Wasser
export function lebenInit(W) {
  bilder();
  const r = zufall(W.saat + 7);
  const schilf = [], enten = [];
  const wasser = (tx, ty) => tx >= 0 && ty >= 0 && tx < W.b && ty < W.h && W.boden[ty * W.b + tx] === BODEN.WASSER;
  const teichKacheln = [];
  for (let ty = 0; ty < W.h; ty++) for (let tx = 0; tx < W.b; tx++) {
    if (!wasser(tx, ty)) continue;
    teichKacheln.push([tx, ty]);
    const ufer = !wasser(tx - 1, ty) || !wasser(tx + 1, ty) || !wasser(tx, ty - 1) || !wasser(tx, ty + 1);
    if (ufer && r() < 0.55) {
      const n = 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        // ans Ufer gerückt: Richtung der Landkachel
        let ox = 8, oy = 10;
        if (!wasser(tx - 1, ty)) ox = 2 + r() * 4; else if (!wasser(tx + 1, ty)) ox = 10 + r() * 4;
        if (!wasser(tx, ty + 1)) oy = 13 + r() * 2; else if (!wasser(tx, ty - 1)) oy = 4 + r() * 3;
        schilf.push({ x: tx * K + ox + (r() - 0.5) * 4, y: ty * K + oy, v: Math.floor(r() * 3), ph: r() * 6.28 });
      }
    }
  }
  // Pro Teich etwa eine Ente auf 8 Wasserkacheln, höchstens 3
  for (let i = 0; i < Math.min(7, Math.floor(teichKacheln.length / 8)); i++) {
    const innen = teichKacheln.filter(([x, y]) => wasser(x - 1, y) && wasser(x + 1, y) && wasser(x, y - 1) && wasser(x, y + 1));
    if (!innen.length) break;
    const [tx, ty] = innen[Math.floor(r() * innen.length)];
    enten.push({ x: tx * K + 8, y: ty * K + 9, dir: r() * 6.28, t: r() * 5, wechsel: 0, tauch: 0 });
  }
  L = { W, schilf, enten, voegel: [], vogelT: 3, schwaerme: [], hoernchen: null, hoernchenT: 6 };
}

const wasserBei = (x, y) => {
  const W = L.W, tx = Math.floor(x / K), ty = Math.floor(y / K);
  return tx >= 0 && ty >= 0 && tx < W.b && ty < W.h && W.boden[ty * W.b + tx] === BODEN.WASSER;
};

// ---------- Ablauf ----------
export function lebenUpdate(dt, S, sicht) {
  if (!L || L.W !== S.welt) return;
  const wind = S.wetter && S.wetter.wind ? S.wetter.wind : { x: 0, y: 0, staerke: 0 };
  // Enten paddeln umher, bleiben auf dem Wasser, tauchen ab und zu kurz ab
  for (const e of L.enten) {
    e.t += dt; e.wechsel -= dt;
    if (e.wechsel <= 0) { e.dir += (Math.random() - 0.5) * 2; e.wechsel = 1.5 + Math.random() * 3; if (Math.random() < 0.15) e.tauch = 1.2; }
    if (e.tauch > 0) e.tauch -= dt;
    const v = 7, nx = e.x + Math.cos(e.dir) * v * dt, ny = e.y + Math.sin(e.dir) * v * dt * 0.7;
    // vorausschauend: 5 px weiter muss auch Wasser sein
    if (wasserBei(nx + Math.cos(e.dir) * 6, ny + Math.sin(e.dir) * 4) && wasserBei(nx, ny)) { e.x = nx; e.y = ny; }
    else { e.dir += Math.PI * (0.6 + Math.random() * 0.8); }
  }
  // Vögel: ab und zu ein kleiner Schwarm quer übers Bild
  L.vogelT -= dt;
  if (L.vogelT <= 0 && sicht) {
    L.vogelT = 7 + Math.random() * 10;
    const rechts = wind.staerke > 0.3 ? wind.x > 0 : Math.random() < 0.5;
    const y0 = sicht.T + sicht.vh * (0.15 + Math.random() * 0.5);
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      L.voegel.push({ x: rechts ? sicht.L - 20 - i * 14 : sicht.L + sicht.vw + 20 + i * 14, y: y0 + (i % 2) * 8 - i * 3,
        vx: (rechts ? 1 : -1) * (55 + Math.random() * 15), hoch: 34 + Math.random() * 10, t: Math.random() });
    }
  }
  for (const v of L.voegel) { v.t += dt; v.x += (v.vx + wind.x * 40 * wind.staerke) * dt; v.y += Math.sin(v.t * 2) * 3 * dt + wind.y * 20 * wind.staerke * dt; }
  if (sicht) L.voegel = L.voegel.filter(v => v.x > sicht.L - 80 && v.x < sicht.L + sicht.vw + 80);
  // Mückenschwärme in der Nähe des Bildausschnitts
  if (sicht && L.schwaerme.length < 3 && Math.random() < dt * 0.5) {
    L.schwaerme.push({ x: sicht.L + Math.random() * sicht.vw, y: sicht.T + 20 + Math.random() * (sicht.vh - 30), leben: 8 + Math.random() * 8, t: 0,
      mucken: Array.from({ length: 5 + Math.floor(Math.random() * 4) }, () => ({ a: Math.random() * 6.28, r: 2 + Math.random() * 6, f: 2 + Math.random() * 3, h: 6 + Math.random() * 10 })) });
  }
  for (const s of L.schwaerme) { s.t += dt; s.leben -= dt; s.x += wind.x * 25 * wind.staerke * dt + Math.sin(s.t * 0.7) * 4 * dt; s.y += wind.y * 15 * wind.staerke * dt; }
  L.schwaerme = L.schwaerme.filter(s => s.leben > 0);
  // Eichhörnchen: an einem Baum im Bild hervorgucken
  if (L.hoernchen) {
    L.hoernchen.t += dt;
    if (L.hoernchen.t > 3.2) L.hoernchen = null;
  } else {
    L.hoernchenT -= dt;
    if (L.hoernchenT <= 0 && sicht) {
      L.hoernchenT = 10 + Math.random() * 14;
      const baeume = L.W.baeume.filter(b => !b.rand && b.x > sicht.L + 20 && b.x < sicht.L + sicht.vw - 20 && b.y > sicht.T + 50 && b.y < sicht.T + sicht.vh);
      if (baeume.length) {
        const b = baeume[Math.floor(Math.random() * baeume.length)];
        L.hoernchen = { baum: b, rechts: Math.random() < 0.5, t: 0 };
      }
    }
  }
}

// ---------- Zeichnen ----------
// Flach auf dem Boden/Wasser: Bugwellen der Enten, Schatten der Vögel
export function lebenBoden(ctx, S) {
  if (!L || L.W !== S.welt) return;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (const e of L.enten) {
    if (e.tauch > 0) { const r = 2 + (1.2 - e.tauch) * 4; ctx.globalAlpha = Math.max(0, e.tauch); ctx.fillRect(Math.round(e.x - r), Math.round(e.y + 1), Math.round(r * 2), 1); ctx.globalAlpha = 1; continue; }
    const hx = e.x - Math.cos(e.dir) * 5, hy = e.y + 2;
    ctx.fillRect(Math.round(hx - 2), Math.round(hy), 3, 1); ctx.fillRect(Math.round(hx - 4 - Math.cos(e.dir) * 2), Math.round(hy + 1), 2, 1);
  }
  ctx.fillStyle = 'rgba(16, 40, 16, 0.25)';
  for (const v of L.voegel) { ctx.beginPath(); ctx.ellipse(Math.round(v.x), Math.round(v.y + v.hoch), 2.5, 1, 0, 0, Math.PI * 2); ctx.fill(); }
}

// Was in die nach Höhe sortierte Liste gehört (Schilf, Enten, Eichhörnchen)
export function lebenListe(liste, S, sicht) {
  if (!L || L.W !== S.welt) return;
  for (const s of L.schilf) if (sicht(s.x, s.y, 6, 16, 2)) liste.push({ y: s.y, t: 'schilf', o: s });
  for (const e of L.enten) if (e.tauch <= 0 && sicht(e.x, e.y, 8, 8, 4)) liste.push({ y: e.y, t: 'ente', o: e });
  if (L.hoernchen) liste.push({ y: L.hoernchen.baum.y + 0.5, t: 'hoernchen', o: L.hoernchen });
}

export function lebenZeichne(ctx, e, S) {
  if (e.t === 'schilf') {
    const s = e.o, img = B.schilf[s.v];
    const wind = S.wetter && S.wetter.wind ? S.wetter.wind.x * S.wetter.wind.staerke : 0;
    const k = Math.sin(S.t * 1.6 + s.ph) * 0.08 + wind * 0.25;
    ctx.save(); ctx.translate(Math.round(s.x), Math.round(s.y)); ctx.transform(1, 0, -k, 1, 0, 0);
    ctx.drawImage(img, -2, -img.height + 1); ctx.restore();
  } else if (e.t === 'ente') {
    const d = e.o, rechts = Math.cos(d.dir) >= 0;
    const f = Math.sin(d.t * 0.8) > 0.85 ? 1 : 0;          // ab und zu nach Futter picken
    const img = (rechts ? B.ente : B.enteL)[f];
    const wipp = Math.round(Math.sin(d.t * 3) * 0.6);
    ctx.drawImage(img, Math.round(d.x - img.width / 2), Math.round(d.y - img.height + 2 + wipp));
  } else if (e.t === 'hoernchen') {
    const h = e.o, b = h.baum, q = h.t;
    // rausgucken (0,4 s), gucken, wieder verschwinden
    const raus = q < 0.4 ? q / 0.4 : q > 2.8 ? Math.max(0, (3.2 - q) / 0.4) : 1;
    const img = h.rechts ? B.hoernchenR : B.hoernchen;
    const x = b.x + (h.rechts ? 4 + raus * 3 : -4 - raus * 3) - img.width / 2, y = b.y - 22 + Math.round(Math.sin(q * 6) * 0.5);
    ctx.save(); ctx.beginPath();
    // nur der Teil neben dem Stamm ist zu sehen
    if (h.rechts) ctx.rect(b.x + 3, y - 2, 20, 12); else ctx.rect(b.x - 23, y - 2, 20, 12);
    ctx.clip(); ctx.drawImage(img, Math.round(x), Math.round(y)); ctx.restore();
  }
}

// Über allem (unter dem Abendlicht): Vögel und Mücken
export function lebenUeber(ctx, S) {
  if (!L || L.W !== S.welt) return;
  for (const v of L.voegel) {
    const f = Math.floor(v.t * 8) % 2, img = (v.vx > 0 ? B.vogel : B.vogelL)[f];
    ctx.drawImage(img, Math.round(v.x - 3), Math.round(v.y - 2));
  }
  ctx.fillStyle = 'rgba(40, 30, 20, 0.75)';
  for (const s of L.schwaerme) {
    const a = Math.min(1, s.leben, s.t);
    ctx.globalAlpha = a;
    for (const m of s.mucken) {
      const w = s.t * m.f + m.a;
      ctx.fillRect(Math.round(s.x + Math.cos(w) * m.r), Math.round(s.y - m.h + Math.sin(w * 1.7) * m.r * 0.6), 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// Nach dem Abendlicht: dieselben Mücken leuchten als Glühwürmchen
export function lebenLeuchten(ctx, S, abend) {
  if (!L || L.W !== S.welt || abend < 0.25) return;
  ctx.globalCompositeOperation = 'lighter';
  for (const s of L.schwaerme) {
    for (const m of s.mucken) {
      const w = s.t * m.f + m.a, x = s.x + Math.cos(w) * m.r * 1.6, y = s.y - m.h + Math.sin(w * 1.7) * m.r;
      const a = (abend - 0.25) * (0.5 + 0.5 * Math.sin(S.t * 4 + m.a * 3));
      ctx.fillStyle = `rgba(230, 255, 120, ${a})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      ctx.fillStyle = `rgba(200, 255, 90, ${a * 0.25})`; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
