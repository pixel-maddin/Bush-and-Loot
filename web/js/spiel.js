// spiel.js – Zustand, Regeln und Zeichnen der Welt.
// Phasen: titel → tag ⇄ haus → abblende → bilanz → laden → tag …

import {
  KACHEL as K, KARTE_B as B, KARTE_H as H, STEINE, STEIN_GEWICHT, BUESCHEL, bueschelGewichte,
  GRAS_DICHTE, GEGNER, gegnerMax, gegnerArten, werte, LADEZEIT, KAMMERN, GEBIETE, SPEZIAL,
} from './config.js';
import { G } from './grafik.js';
import { SFX } from './ton.js';
import { baueWelt, baueGebiet } from './welt.js';
import { klemme } from './hilfe.js';
import { neuesWetter, windFaktor, wetterUpdate, wetterZeichne } from './wetter.js';
import { lebenInit, lebenUpdate, lebenBoden, lebenListe, lebenZeichne, lebenUeber, lebenLeuchten } from './leben.js';
import { begleiterUpdate, begleiterNeu, zeichneBegleiter, begleiterSchatten } from './begleiter.js';
import { baueKammer, neuerBoss, kammerUpdate, bossTreffer, kammerBoden, kammerListe, kammerZeichne, kammerDunkel } from './hoehle.js';

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
  figur: null,                // { art: 'junge' | 'maedchen', farbe: 'blau' | … } – null = noch nicht gewählt
  begleiter: null, tier: null, // gekauftes Tier { art: 'hund' | 'katze', rasse } und seine Laufzeit-Daten
  // Glitzerhöhle: ort = 'wald' oder 'kammer'; wald = weggelegter Wald, solange man in einer Kammer ist
  // Gebiete: gebiet = 'wald' | 'dunkel' | 'berg' (draußen, S.ort bleibt dabei 'wald'); weggelegte Gebiete des Tages
  // in gebiete, einmal gebaute Welten in weltCache. schaetze = besondere Steine (Schlüssel für Höhlentüren).
  gebiet: 'wald', gebiete: {}, weltCache: {}, waldWelt: null, schaetze: { tuerkis: 0, eis: 0 }, kaelte: 0, frierT: 3,
  ort: 'wald', wald: null, boss: null, geschosse: [], wellen: [], warn: [], belohnungsDing: null, kammerFertig: false,
};

let hooks = {};
export function setzeHooks(h) { hooks = h; }
export function ruf(name, ...a) { hooks[name] && hooks[name](...a); }
// Nach Kauf oder Boss-Belohnung die Spielwerte neu rechnen; ein neues Herz ist gleich voll
export function neueWerte() {
  const altMax = S.w ? S.w.maxHp : 0;
  S.w = werte(S.st);
  if (S.sp && S.w.maxHp > altMax) S.sp.hp += S.w.maxHp - altMax;
}

// ---------- Speichern ----------
export function laden() {
  try {
    const d = JSON.parse(localStorage.getItem(SPEICHER));
    if (d && typeof d.geld === 'number') {
      S.geld = d.geld; S.tag = d.tag || 1; S.st = d.st || {};
      S.gesamt = Object.assign({ gemaeht: 0, besiegt: 0, wert: 0 }, d.gesamt);
      S.hinweise = d.hinweise || {};
      S.figur = d.figur || null;
      S.begleiter = d.begleiter || null;
      S.schaetze = Object.assign({ tuerkis: 0, eis: 0 }, d.schaetze);
      // Goldkrone wurde zur Baseballcap (10.11.2026): gekaufte Krone mitnehmen
      if (S.st.hut_krone) { S.st.hut_cap = 1; delete S.st.hut_krone; }
      if (S.st.hut === 'krone') S.st.hut = 'cap';
      return true;
    }
  } catch (e) { /* kein Spielstand */ }
  return false;
}
export function speichern() {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify({ geld: S.geld, tag: S.tag, st: S.st, gesamt: S.gesamt, hinweise: S.hinweise, figur: S.figur, begleiter: S.begleiter, schaetze: S.schaetze }));
  } catch (e) { /* privat-Modus o. ä. */ }
}
export function neuAnfangen() {
  S.geld = 0; S.tag = 1; S.st = {}; S.gesamt = { gemaeht: 0, besiegt: 0, wert: 0 }; S.hinweise = {};
  S.figur = null;             // beim nächsten Start wird wieder gefragt
  S.begleiter = null; S.tier = null; S.schaetze = { tuerkis: 0, eis: 0 };
  speichern();
}
export const hatSpielstand = () => S.tag > 1 || S.geld > 0;

export function initSpiel() {
  S.welt = baueWelt(WELT_SAAT);
  S.waldWelt = S.welt; S.gebiet = 'wald'; S.gebiete = {};
  lebenInit(S.welt);
  S.wetter = neuesWetter(1);
  S.ort = 'wald'; S.wald = null; S.boss = null; S.geschosse = []; S.wellen = []; S.warn = []; S.belohnungsDing = null;
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
  const B = W.b, H = W.h;
  S.bueschel = []; S.gitter = new Array(B * H).fill(null);
  const gew = S.gebiet === 'wald' ? bueschelGewichte(S.tag) : GEBIETE[S.gebiet].gewichte;
  // Jeden Tag andere dichte und lichte Stellen
  const p1 = Math.random() * 10, p2 = Math.random() * 10;
  const mitte = W.haus || W.portal, hx = mitte.x / K, hy = mitte.y / K;
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

// Bildwackeln und Treffer-Stopp laufen nur während des Spielens ab. Wer z. B. beim Umkippen
// getroffen wurde, nähme das Wackeln sonst in den nächsten Morgen mit.
function ruheImBild() { S.wackeln = 0; S.stopp = 0; }

// ---------- Tagesablauf ----------
export function neuerTag() {
  if (S.ort !== 'wald') zurueckInDenWald();      // in einer Kammer umgekippt
  if (S.gebiet !== 'wald') { S.welt = S.waldWelt; S.gebiet = 'wald'; }
  S.gebiete = {};                                   // Dunkelwald und Gebirge wachsen über Nacht neu
  S.w = werte(S.st);
  S.wetter = neuesWetter(S.tag, S.wetterTest);
  S.zeit = 0; S.dauer = S.w.tagDauer;
  S.sp = neuerSpieler();
  pflanzen();
  S.gegner = []; S.beute = []; S.partikel = []; S.texte = [];
  S.heute = { gemaeht: 0, besiegt: 0, steine: [0, 0, 0, 0, 0, 0, 0], wert: 0 };
  for (let i = 0; i < Math.ceil(gegnerMax(S.tag) / 2); i++) spawneIrgendwo();
  S.spawnT = 4;
  S.kam.x = S.sp.x; S.kam.y = S.sp.y - 8;
  begleiterNeu();
  S.blende = 0; S.phase = 'tag'; ruheImBild();
  SFX.morgen();
  hooks.tagBeginnt && hooks.tagBeginnt();
}

// Raus aus dem Stumpf, der Tag läuft weiter
export function weiterMaehen() {
  const hu = S.welt.huette;
  const st = hu ? { x: hu.tuer.x, y: hu.tuer.y + 14 } : S.welt.start;
  if (S.gebiet === 'berg') { S.kaelte = S.w.kaelte; S.frierT = 3; }     // in der Hütte ist es warm
  S.sp.x = st.x; S.sp.y = st.y; S.sp.tuerSperre = true; S.sp.kx = S.sp.ky = 0; S.sp.ziel = null;
  S.sp.winkel = Math.PI / 2; S.sp.blick = 'unten';
  S.w = werte(S.st);
  S.sp.hp = Math.min(S.sp.hp, S.w.maxHp);
  begleiterNeu();
  S.phase = 'tag'; ruheImBild();
  SFX.tuer();
}

export function tagBeenden() { S.endeGrund = 'heim'; tagAbschliessen(); }

// Ist das Portal zu diesem Gebiet schon erwacht?
export const gebietFrei = (g) => g === 'wald' || (S.st.bosse | 0) >= GEBIETE[g].ab;

// Durch ein Portal: aktuelles Gebiet weglegen, Ziel holen (oder bauen und bepflanzen)
export function reiseNach(ziel) {
  const p = S.sp, von = S.gebiet;
  S.gebiete[von] = { welt: S.welt, bueschel: S.bueschel, gitter: S.gitter, gegner: S.gegner, beute: S.beute };
  S.gebiet = ziel;
  const g = S.gebiete[ziel];
  if (g) { S.welt = g.welt; S.bueschel = g.bueschel; S.gitter = g.gitter; S.gegner = g.gegner; S.beute = g.beute; }
  else {
    if (!S.weltCache[ziel]) S.weltCache[ziel] = baueGebiet(ziel, WELT_SAAT + (ziel === 'dunkel' ? 101 : 202));
    S.welt = S.weltCache[ziel];
    if (!S.welt.leben) lebenInit(S.welt);
    pflanzen(); S.gegner = []; S.beute = [];
    for (let i = 0; i < Math.ceil(gegnerMax(S.tag) / 2); i++) spawneIrgendwo();
  }
  if (ziel === 'wald') {
    const pt = S.welt.portale.find(x => x.gebiet === von);
    p.x = pt.tuer.x; p.y = pt.tuer.y + 14;
  } else { p.x = S.welt.start.x; p.y = S.welt.start.y; }
  p.portalSperre = true; p.ziel = null; p.kx = p.ky = 0; p.winkel = Math.PI / 2; p.blick = 'unten';
  S.kam.x = p.x; S.kam.y = p.y - 8;
  if (ziel === 'berg') { S.kaelte = S.w.kaelte; S.frierT = 3; }
  begleiterNeu(); ruheImBild();
  S.phase = 'tag';
  SFX.tuerAuf();
}
// Wie viele Diamanten liegen draußen noch herum? (für den Hinweis im Baumstumpf)
export function liegenGeblieben() {
  const listen = [S.ort === 'wald' ? S.beute : (S.wald ? S.wald.beute : [])];
  for (const [g, v] of Object.entries(S.gebiete)) if (g !== S.gebiet && v) listen.push(v.beute);
  let anzahl = 0, wert = 0;
  for (const beute of listen) for (const e of beute) if (!e.herz) { anzahl++; wert += STEINE[e.typ].wert; }
  return { anzahl, wert };
}

// ---------- Glitzerhöhle ----------
export function oeffneTuer(k) {
  const d = KAMMERN[k - 1];
  if ((S.st.tueren | 0) !== k - 1 || (S.st.bosse | 0) < k - 1) return false;
  if (S.geld < d.preis) { SFX.nein(); return false; }
  const br = d.brauche || {};
  for (const [art, n] of Object.entries(br)) if ((S.schaetze[art] | 0) < n) { SFX.nein(); return false; }
  S.geld -= d.preis;
  for (const [art, n] of Object.entries(br)) S.schaetze[art] -= n;
  S.st.tueren = k;
  SFX.tuerAuf(); speichern();
  return true;
}

export function betreteKammer(k) {
  if (S.ort !== 'wald') zurueckInDenWald();
  S.wald = { welt: S.welt, bueschel: S.bueschel, gitter: S.gitter, gegner: S.gegner, beute: S.beute };
  S.welt = baueKammer(k);
  S.bueschel = []; S.gitter = new Array(S.welt.b * S.welt.h).fill(null);
  S.gegner = []; S.beute = []; S.geschosse = []; S.wellen = []; S.warn = [];
  S.belohnungsDing = null; S.kammerFertig = false;
  S.boss = neuerBoss(k);
  const p = S.sp;
  p.x = S.welt.start.x; p.y = S.welt.start.y; p.ziel = null; p.kx = p.ky = 0;
  p.winkel = -Math.PI / 2; p.blick = 'oben'; p.unverw = 0; p.ladung = 0;
  S.kam.x = p.x; S.kam.y = p.y - 40;
  S.ort = 'kammer'; S.phase = 'tag'; ruheImBild();
  SFX.tuerAuf();
}

function zurueckInDenWald() {
  const w = S.wald;
  if (w) { S.welt = w.welt; S.bueschel = w.bueschel; S.gitter = w.gitter; S.gegner = w.gegner; S.beute = w.beute; }
  S.wald = null; S.boss = null; S.geschosse = []; S.wellen = []; S.warn = []; S.belohnungsDing = null;
  S.ort = 'wald';
}

export function verlasseKammer() {
  // Was in der Kammer noch herumliegt, bleibt dort – man muss alles selbst einsammeln
  zurueckInDenWald();
  const p = S.sp, h = S.welt.hoehle;
  p.x = h.tuer.x; p.y = h.tuer.y + 14; p.ziel = null; p.kx = p.ky = 0;
  p.winkel = Math.PI / 2; p.blick = 'unten'; p.hoehleSperre = true;
  S.kam.x = p.x; S.kam.y = p.y - 8;
  begleiterNeu();
  S.phase = 'tag'; ruheImBild();
  SFX.tuer(); speichern();
}

function beginneAbend(grund) {
  S.endeGrund = grund; S.phase = 'abblende'; S.blende = 0;
  grund === 'ohnmacht' ? SFX.ohnmacht() : SFX.abend();
}

function tagAbschliessen() {
  // Umgekippt oder nicht rechtzeitig im Baumstumpf (im Dunkeln sieht man nichts): Die Hälfte der
  // heutigen Diamanten ist weg, und was noch herumliegt, findet keiner mehr.
  // Nur wer vor Sonnenuntergang heimgeht („Schlafen gehen“), behält alles.
  const pech = S.endeGrund === 'ohnmacht' || S.endeGrund === 'abend';
  // Was noch am Boden liegt, ist morgen weg – auch wer rechtzeitig schlafen geht, muss vorher alles einsammeln
  const liegen = liegenGeblieben();
  S.beute = [];
  let verlust = 0;
  if (pech) {
    verlust = Math.min(S.geld, Math.floor(S.heute.wert / 2)); S.geld -= verlust;
    for (const [k, i] of Object.entries(SPEZIAL)) S.schaetze[k] = Math.max(0, S.schaetze[k] - Math.floor(S.heute.steine[i] / 2));
  }
  S.gesamt.gemaeht += S.heute.gemaeht; S.gesamt.besiegt += S.heute.besiegt; S.gesamt.wert += S.heute.wert - verlust;
  const fertig = S.tag;
  S.tag++;
  S.phase = 'bilanz';
  speichern();
  hooks.bilanz && hooks.bilanz({ grund: S.endeGrund, heute: S.heute, verlust, tag: fertig, liegen, kammer: S.ort === 'kammer' && S.boss ? S.boss.k : 0 });
}

export function benenneBegleiter(name) {
  if (!S.begleiter) return;
  S.begleiter.name = name; speichern();
}

// Begleiter kaufen oder gegen einen anderen tauschen (Preis kommt aus dem Laden: erster Kauf / Tausch)
export function kaufeBegleiter(art, rasse, preis, name) {
  const gleich = S.begleiter && S.begleiter.art === art && S.begleiter.rasse === rasse;
  if (gleich || S.geld < preis) { SFX.nein(); return false; }
  S.geld -= preis;
  S.begleiter = { art, rasse, name }; S.tier = null;
  SFX.kauf(); speichern();
  return true;
}

// Kleiderschrank und Stube: einmal kaufen; Hüte kann man danach jederzeit aufsetzen
export function kaufeEinmal(schluessel, preis) {
  if (S.st[schluessel] || S.geld < preis) { SFX.nein(); return false; }
  S.geld -= preis; S.st[schluessel] = 1; SFX.kauf(); speichern();
  return true;
}
export function setzeHut(id) { S.st.hut = id; neueWerte(); speichern(); }

export function kaufen(id, preis) {
  if (S.geld < preis) { SFX.nein(); return false; }
  S.geld -= preis;
  S.st[id] = (S.st[id] | 0) + 1;
  neueWerte();
  SFX.kauf(); speichern();
  return true;
}

// ---------- Hauptschleife ----------
export function update(dt, ein) {
  S.t += dt;
  S.rauchT -= dt;
  if (S.rauchT <= 0) { S.rauchT = 0.3; rauch(); }
  partikelUpdate(dt);
  if (S.ort === 'wald') { lebenUpdate(dt, S, S.sichtfeld); wetterUpdate(dt, S); }
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

  const imWald = S.ort === 'wald';
  if (imWald) S.zeit += dt;                         // in der Höhle steht die Sonne still
  if (S.wackeln > 0) S.wackeln -= dt;
  spielerUpdate(dt, ein, neu);
  if (S.phase !== 'tag') return;                   // Tür erreicht
  gegnerUpdate(dt);
  beuteUpdate(dt);
  if (imWald) { spawner(dt); begleiterUpdate(dt); if (S.gebiet === 'berg') kaelteUpdate(dt); } else kammerUpdate(dt);
  if (S.phase !== 'tag') return;
  kamera(dt);
  if (imWald && S.zeit >= S.dauer) beginneAbend('abend');
}

// Gebirge: Die Kälteleiste läuft ab (bei Schnee schneller), am Lagerfeuer füllt sie sich.
// Ist sie leer, friert alle 3 Sekunden ein Herz ein.
export const schneit = () => S.gebiet === 'berg' && S.wetter && S.wetter.art === 'regen';
function kaelteUpdate(dt) {
  const p = S.sp, F = S.welt.feuer;
  const hu = S.welt.huette;
  const amFeuer = (F && Math.hypot(p.x - F.x, p.y - F.y) < 36) || (hu && Math.hypot(p.x - hu.tuer.x, p.y - hu.tuer.y) < 22);
  if (amFeuer) S.kaelte = Math.min(S.w.kaelte, S.kaelte + 12 * dt);
  else S.kaelte = Math.max(0, S.kaelte - dt * (schneit() ? 1.3 : 1));
  if (!S.hinweise.kalt && S.kaelte < S.w.kaelte * 0.6) { S.hinweise.kalt = true; hooks.hinweis && hooks.hinweis('Brr, ist das kalt! Am Lagerfeuer beim Portal wird dir wieder warm.'); }
  if (S.kaelte > 0) { S.frierT = 3; return; }
  S.frierT -= dt;
  if (S.frierT > 0) return;
  S.frierT = 3;
  p.hp -= 1; p.unverw = Math.max(p.unverw, 0.6);
  text(p.x, p.y - 18, 'Brrr!', '#bfe9ff'); SFX.aua(); S.wackeln = 0.2;
  hooks.aua && hooks.aua();
  if (p.hp <= 0) { p.hp = 0; beginneAbend('ohnmacht'); }
}

// ---------- Bewegung & Kollision ----------
function fest(x, y, hw, hh) {
  const W = S.welt, B = W.b, H = W.h;
  const x0 = Math.floor((x - hw) / K), x1 = Math.floor((x + hw - 0.01) / K);
  const y0 = Math.floor((y - hh) / K), y1 = Math.floor((y + hh - 0.01) / K);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (tx < 0 || ty < 0 || tx >= B || ty >= H) return true;
    if (W.fest[ty * B + tx]) return true;
  }
  return false;
}
export function bewege(e, dx, dy, hw, hh) {
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

  let r = ein.richtung(), m = Math.hypot(r.x, r.y);
  // Tippen-Steuerung: Ziel aus Bildschirm- in Weltkoordinaten. Solange der Finger liegt, wandert das
  // Ziel mit (auch wenn die Kamera nachzieht); losgelassen läuft der Held zum letzten Punkt.
  const z = ein.ziel ? ein.ziel() : null;
  if (m > 0.1) p.ziel = null;                        // Tasten/Stick haben Vorrang
  else {
    if (z && S.ansicht) {
      const zx = (z.x + S.ansicht.ox) / S.ansicht.zoom, zy = (z.y + S.ansicht.oy) / S.ansicht.zoom + 6;
      if (p.ziel) { p.ziel.x = zx; p.ziel.y = zy; } else p.ziel = { x: zx, y: zy, haengt: 0 };
    }
    if (p.ziel) {
      const ddx = p.ziel.x - p.x, ddy = p.ziel.y - p.y, d = Math.hypot(ddx, ddy);
      if (d < 2.5) p.ziel = null;
      else { const f = Math.min(1, d / 6); r = { x: ddx / d * f, y: ddy / d * f }; m = f; }
    }
  }
  let tempo = w.tempo;
  if (p.ladung > 0.15) tempo *= 0.6;
  if (m > 0.1 && S.ort === 'wald') tempo *= windFaktor(S.wetter, r.x / m, r.y / m);   // Sturm: mit dem Wind schneller
  if (schneit()) tempo *= 0.8;                                                           // im Schnee stapft man langsamer
  let dx = 0, dy = 0;
  if (m > 0.1) {
    const f = Math.min(1, m);
    dx = r.x / m * f * tempo * dt; dy = r.y / m * f * tempo * dt;
    if (p.schlagT <= 0) { p.winkel = Math.atan2(r.y, r.x); p.blick = blickAus(p.winkel); }
    p.laufT += dt * f * tempo / 60; p.bewegt = true;
  } else p.bewegt = false;
  const soll = Math.hypot(dx, dy);
  dx += p.kx * dt; dy += p.ky * dt;
  const ab = Math.exp(-10 * dt); p.kx *= ab; p.ky *= ab;
  const vx = p.x, vy = p.y;
  bewege(p, dx, dy, 4, 3);
  // Läuft er gegen einen Baum oder ins Wasser, nach kurzer Zeit aufgeben statt ewig zu drücken
  if (p.ziel && soll > 0) {
    p.ziel.haengt = Math.hypot(p.x - vx, p.y - vy) < soll * 0.3 ? p.ziel.haengt + dt : 0;
    if (p.ziel.haengt > 0.3 && !z) p.ziel = null;
  }

  // Hauen: jeder Druck = genau ein Schlag (Festhalten haut nicht weiter). Ein Druck kurz vor Ende der
  // Abklingzeit wird 0,18 s gemerkt. Mit Wirbelschlag lädt Festhalten den Rundumschlag auf.
  if (p.cd <= 0 && p.puffer > 0) { schlag(false); p.ladung = 0; p.puffer = 0; }
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
  const heim = S.welt.haus || S.welt.huette;      // Baumstumpf oder Unterschlupf im Gebiet
  if (heim) {
    const T = heim.tuer;
    // Nur ein schmaler Streifen direkt vor der Tür zählt – sonst öffnet sich der Laden auch,
    // wenn man oben hinter dem Stumpf vorbeiläuft
    const inTuer = Math.abs(p.x - T.x) < 8 && p.y < T.y + 6 && p.y > T.y - 2;
    if (!inTuer) p.tuerSperre = false;
    else if (!p.tuerSperre) {
      p.tuerSperre = true; p.ziel = null; S.phase = 'haus'; SFX.tuer();
      hooks.haus && hooks.haus(false);
    }
  }
  // Portale: im Wald die erwachten Ruinen, in den Gebieten das Portal zurück
  const portale = (S.welt.portale || []).filter(pt => gebietFrei(pt.gebiet)).map(pt => ({ ...pt.tuer, ziel: pt.gebiet }));   // Kammern haben keine
  if (S.welt.portal) portale.push({ ...S.welt.portal.tuer, ziel: 'wald' });
  let amPortal = null;
  for (const T of portale) if (Math.abs(p.x - T.x) < 9 && p.y < T.y + 6 && p.y > T.y - 2) amPortal = T;
  if (!amPortal) p.portalSperre = false;
  else if (!p.portalSperre) {
    p.portalSperre = true; p.ziel = null; S.phase = 'reise';
    hooks.reise && hooks.reise(amPortal.ziel);
    return;
  }
  // Eingang der Glitzerhöhle
  if (S.welt.hoehle) {
    const T = S.welt.hoehle.tuer;
    const drin = Math.abs(p.x - T.x) < 10 && p.y < T.y + 6 && p.y > T.y - 2;
    if (!drin) p.hoehleSperre = false;
    else if (!p.hoehleSperre) {
      p.hoehleSperre = true; p.ziel = null; S.phase = 'hoehle'; SFX.tuer();
      hooks.hoehle && hooks.hoehle();
    }
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
  const rr = Math.ceil((reich + 8) / K), gx = Math.floor(cx / K), gy = Math.floor(cy / K), B = S.welt.b, H = S.welt.h;
  let n = 0;
  for (let ty = gy - rr; ty <= gy + rr; ty++) for (let tx = gx - rr; tx <= gx + rr; tx++) {
    if (tx < 0 || ty < 0 || tx >= B || ty >= H) continue;
    const b = S.gitter[ty * B + tx];
    if (!b || b.weg) continue;
    if (trifft(b.x, b.y - 4, 5)) { haueBueschel(b, schaden); n++; }
  }
  // Kopie: Was dieser Hieb neu entstehen lässt (Blobchen), trifft er nicht gleich mit
  for (const g of S.gegner.slice()) if (!g.tot && trifft(g.x, g.y - 4 - g.z, 7)) haueGegner(g, schaden, cx, cy);
  if (S.boss) bossTreffer(trifft, schaden);
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
  if (Math.random() < art.fund * (1 + 0.15 * w.glueck)) {
    const gb = GEBIETE[S.gebiet];
    if (gb.spezial && Math.random() < gb.spezial) wirfStein(b.x, b.y - 3, SPEZIAL[S.gebiet === 'dunkel' ? 'tuerkis' : 'eis']);
    else wirfStein(b.x, b.y - 3, waehleStein(art.beste, w.glueck));
  }
  else if (S.sp.hp < w.maxHp && Math.random() < 0.025) wirfHerz(b.x, b.y - 3);
  // Manchmal sitzt einer drin …
  if (S.tag >= 2 && Math.random() < 0.012 && S.gegner.length < gegnerMax(S.tag) + 2) {
    const a = arten();
    spawne(a[Math.floor(Math.random() * a.length)], b.x, b.y, true);
  }
}

export function waehleStein(beste, glueck) {
  const g = []; let summe = 0;
  for (let i = 0; i <= beste; i++) { g[i] = STEIN_GEWICHT[i] * Math.pow(1 + 0.45 * glueck, i); summe += g[i]; }
  let z = Math.random() * summe;
  for (let i = 0; i <= beste; i++) { if (z < g[i]) return i; z -= g[i]; }
  return 0;
}

// ---------- Diamanten & Herzen ----------
export function wirfStein(x, y, typ) {
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
      // Sturm: Diamanten in der Luft trägt der Wind mit
      if (e.z > 0.5 && S.wetter && S.wetter.wind.staerke && S.ort === 'wald') { e.vx += S.wetter.wind.x * 90 * dt; e.vy += S.wetter.wind.y * 55 * dt; }
      if (e.z <= 0) { e.z = 0; e.vz = Math.abs(e.vz) > 25 ? -e.vz * 0.4 : 0; e.vx *= 0.6; e.vy *= 0.6; }
      e.x += e.vx * dt; e.y += e.vy * dt;
      // In der Kammer prallen Diamanten an den Wänden ab, statt darin zu verschwinden
      if (S.ort === 'kammer') {
        const x0 = K + 6, x1 = (S.welt.b - 1) * K - 6, y0 = 2 * K + 6, y1 = (S.welt.h - 1) * K - 4;
        if (e.x < x0 || e.x > x1) { e.x = klemme(e.x, x0, x1); e.vx = -e.vx * 0.5; }
        if (e.y < y0 || e.y > y1) { e.y = klemme(e.y, y0, y1); e.vy = -e.vy * 0.5; }
      }
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
  if (s.spezial) {
    S.schaetze[s.spezial]++; S.heute.steine[e.typ]++;
    if (!leise) {
      SFX.stein(4); text(e.x, e.y - 6, '+1 ' + s.name, s.farben[1]); funkeln(e.x, e.y, s.farben[0]);
      const k = 'spezial_' + s.spezial;
      if (!S.hinweise[k]) { S.hinweise[k] = true; hooks.hinweis && hooks.hinweis(`${s.name}! Solche Steine brauchst du für eine Tür in der Glitzerhöhle.`); }
    }
    return;
  }
  const wert = Math.round(s.wert * (S.w.wertMal || 1));          // Baseballcap: +10 %
  S.geld += wert; S.heute.wert += wert; S.heute.steine[e.typ]++;
  if (!leise) {
    SFX.stein(e.typ);
    text(e.x, e.y - 6, '+' + wert, s.farben[1]);
    funkeln(e.x, e.y, s.farben[0]);
    if (!S.hinweise.stein) { S.hinweise.stein = true; hooks.hinweis && hooks.hinweis('Ein Diamant! Im Baumstumpf kannst du ihn ausgeben.'); }
  }
}

// ---------- Gegner ----------
export function spawne(art, x, y, ausGras) {
  const d = GEGNER[art];
  S.gegner.push({
    art, x, y, z: 0, hp: d.hp + Math.floor((S.tag - 1) / 6), kx: 0, ky: 0, vx: 0, vy: 0,
    t: Math.random() * 10, ph: Math.random() * 6, blitz: 0, hopT: 0.5 + Math.random(), hop: 0,
    richtung: Math.random() * 6.28, wechselT: 0, links: true, tot: false,
  });
  if (ausGras) { SFX.plopp(); puff(x, y - 4); }
}
function spawneIrgendwo() {
  const W = S.welt, p = S.sp, a = arten(), B = W.b, H = W.h;
  for (let n = 0; n < 30; n++) {
    const tx = 3 + Math.floor(Math.random() * (B - 6)), ty = 3 + Math.floor(Math.random() * (H - 6));
    if (W.fest[ty * B + tx]) continue;
    const x = tx * K + 8, y = ty * K + 10;
    if (Math.hypot(x - p.x, y - p.y) < 150) continue;
    spawne(a[Math.floor(Math.random() * a.length)], x, y, false);
    return;
  }
}
// Welche Plagegeister heute unterwegs sind – bei Regen kommen Riesenblobs dazu
function arten() {
  const regen = S.wetter && S.wetter.art === 'regen';
  if (S.gebiet === 'dunkel') return ['fledermaus', 'fledermaus', 'pilz', 'schnecke'].concat(regen ? ['blob'] : []);
  if (S.gebiet === 'berg') return ['schneekugel', 'schneekugel', 'hummel'].concat(regen ? ['schneekugel', 'schneekugel'] : []);
  const a = gegnerArten(S.tag);
  if (regen) a.push('blob', 'blob');
  return a;
}
function spawner(dt) {
  S.spawnT -= dt;
  if (S.spawnT > 0) return;
  S.spawnT = Math.max(2.5, 7 - S.tag * 0.4);
  if (S.gegner.length < gegnerMax(S.tag) + (S.wetter && S.wetter.art === 'regen' ? 2 : 0) + (S.gebiet === 'wald' ? 0 : 1)) spawneIrgendwo();
}

function gegnerUpdate(dt) {
  const p = S.sp;
  for (const g of S.gegner) {
    g.t += dt; if (g.blitz > 0) g.blitz -= dt;
    const def = GEGNER[g.art];
    const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
    const ab = Math.exp(-8 * dt);
    if (g.art === 'schnecke' || g.art === 'blob' || g.art === 'blobchen') {   // kriechen hinterher
      let mx = 0, my = 0;
      if (d < 110) { mx = dx / d * def.tempo; my = dy / d * def.tempo; }
      else {
        g.wechselT -= dt;
        if (g.wechselT <= 0) { g.richtung = Math.random() * 6.28; g.wechselT = 2 + Math.random() * 2; }
        mx = Math.cos(g.richtung) * def.tempo * 0.6; my = Math.sin(g.richtung) * def.tempo * 0.6;
      }
      bewege(g, (mx + g.kx) * dt, (my + g.ky) * dt, 4, 3);
      g.links = (mx || dx) < 0;
    } else if (g.art === 'hummel' || g.art === 'motte' || g.art === 'fledermaus') {      // Fliegendes: umkreisen und Sturzflug
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
      const rand = S.ort === 'wald' ? 2.5 * K : 1.5 * K;
      g.x = klemme(g.x + (g.vx + g.kx) * dt, rand, S.welt.b * K - rand);
      g.y = klemme(g.y + (g.vy + g.ky) * dt, rand + (S.ort === 'wald' ? 0 : K), S.welt.h * K - rand);
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
  const flieg = g.art === 'hummel' || g.art === 'motte' || g.art === 'fledermaus';
  const dx = g.x - cx, dy = g.y - cy, d = Math.hypot(dx, dy) || 1, kb = flieg ? 260 : 170;
  g.kx = dx / d * kb; g.ky = dy / d * kb;
  if (flieg) { g.vx = 0; g.vy = 0; }
  S.stopp = 0.04;
  if (g.hp > 0) { SFX.gegnerTreffer(); return; }
  g.tot = true; S.heute.besiegt++;
  if (g.art === 'blob') { spawne('blobchen', g.x - 7, g.y, false); spawne('blobchen', g.x + 7, g.y, false); }   // zerfällt
  SFX.gegnerWeg(); puff(g.x, g.y - 4 - g.z);
  if (Math.random() < GEGNER[g.art].beute) wirfStein(g.x, g.y - 4, waehleStein(Math.min(4, 1 + Math.floor(S.tag / 3)), S.w.glueck));
}

export function aua(g, schaden) {
  const p = S.sp;
  p.hp -= schaden; p.unverw = 1.3;
  const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
  p.kx = dx / d * 220; p.ky = dy / d * 220;
  S.wackeln = 0.3; SFX.aua();
  hooks.aua && hooks.aua();
  if (p.hp <= 0) {
    p.hp = 0;
    // In einer Kammer umgekippt: nicht der ganze Tag ist weg – man wacht vor dem Baumstumpf auf (main.js)
    if (S.ort === 'kammer') { S.phase = 'niederlage'; SFX.ohnmacht(); hooks.kammerNiederlage && hooks.kammerNiederlage(); }
    else beginneAbend('ohnmacht');
  }
}

// Nach einer Niederlage gegen einen Wächter: zurück in den Wald vor den Stumpf, volle Herzen,
// die Hälfte der heutigen Diamanten (und besonderen Steine) ist weg, der Tag läuft weiter.
export function nachNiederlage() {
  const k = S.boss ? S.boss.k : 0;
  zurueckInDenWald();
  const verlust = Math.min(S.geld, Math.floor(S.heute.wert / 2));
  S.geld -= verlust; S.heute.wert -= verlust;
  for (const [art, i] of Object.entries(SPEZIAL)) {
    const weg = Math.floor(S.heute.steine[i] / 2);
    S.schaetze[art] = Math.max(0, S.schaetze[art] - weg); S.heute.steine[i] -= weg;
  }
  const p = S.sp, st = S.welt.start;
  p.x = st.x; p.y = st.y; p.hp = S.w.maxHp; p.unverw = 1; p.kx = p.ky = 0; p.ziel = null;
  p.tuerSperre = true; p.winkel = Math.PI / 2; p.blick = 'unten';
  S.kam.x = p.x; S.kam.y = p.y - 8;
  begleiterNeu(); ruheImBild();
  S.phase = 'tag';
  speichern();
  return { k, verlust };
}

function kamera(dt) {
  const p = S.sp, f = 1 - Math.exp(-8 * dt);
  S.kam.x += (p.x - S.kam.x) * f;
  S.kam.y += (p.y - 8 - S.kam.y) * f;
}

// ---------- Partikel & schwebende Zahlen ----------
export function splitter(x, y, farben, n) {
  for (let i = 0; i < n; i++) {
    const l = 0.4 + Math.random() * 0.4;
    S.partikel.push({ x, y, z: 2 + Math.random() * 4, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 50,
      vz: 40 + Math.random() * 70, leben: l, max: l, farbe: farben[i % farben.length], schwer: true, gr: 1 });
  }
}
export function puff(x, y) {
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, l = 0.4 + Math.random() * 0.2;
    S.partikel.push({ x, y, z: 0, vx: Math.cos(a) * 40, vy: Math.sin(a) * 30, vz: 0, leben: l, max: l,
      farbe: i % 2 ? '#ffffff' : '#d8e8d0', schwer: false, gr: 2 });
  }
}
export function funkeln(x, y, farbe) {
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * 6.28, l = 0.3 + Math.random() * 0.2;
    S.partikel.push({ x, y, z: 0, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30 - 10, vz: 0, leben: l, max: l, farbe, schwer: false, gr: 1 });
  }
}
function rauch() {
  const W = S.welt, I = G.hausInfo;
  if (!W.haus) return;
  const x = W.haus.x - I.w / 2 + I.rauch[0] + 0.5, y = W.haus.y + 2 - I.fussY + I.rauch[1];
  S.partikel.push({ x: x + (Math.random() - 0.5) * 2, y, z: 0, vx: 3 + Math.random() * 3, vy: -10 - Math.random() * 4, vz: 0,
    leben: 2.6, max: 2.6, farbe: '#d8d4cc', schwer: false, gr: 2, rauch: true });
}
export function text(x, y, t, farbe) { S.texte.push({ x, y, t, farbe, leben: 0.9 }); }

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
  const W = S.welt, p = S.sp, kammer = S.ort === 'kammer';
  const vw = cw / zoom, vh = ch / zoom, mw = W.b * K, mh = W.h * K;
  const cx = vw >= mw ? mw / 2 : klemme(S.kam.x, vw / 2, mw - vw / 2);
  const cy = vh >= mh ? mh / 2 : klemme(S.kam.y, vh / 2, mh - vh / 2);
  let wx = 0, wy = 0;
  if (S.wackeln > 0 && S.phase === 'tag') { wx = (Math.random() - 0.5) * 3; wy = (Math.random() - 0.5) * 3; }
  const ox = Math.round((cx - vw / 2 + wx) * zoom), oy = Math.round((cy - vh / 2 + wy) * zoom);
  const L = ox / zoom, T = oy / zoom, R = L + vw, U = T + vh;
  S.ansicht = { ox, oy, zoom };      // für die Tippen-Steuerung (Bildschirm → Welt)
  S.sichtfeld = { L, T, vw, vh };    // für das Gewusel (Vögel, Mücken, Eichhörnchen)

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = kammer ? W.thema.hinter : '#16301b'; ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(zoom, 0, 0, zoom, -ox, -oy);
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(W.bodenBild, 0, 0);
  wasserGlitzer(ctx, L, T, R, U);

  const sicht = (x, y, rx, oben, unten) => x > L - rx && x < R + rx && y > T - unten && y < U + oben;
  const spielt = S.phase !== 'titel';

  // Stoppeln und Schatten liegen flach auf dem Boden
  const stoppel = (G.stoppelGebiet && G.stoppelGebiet[W.gebiet]) || G.stoppel;
  for (const b of S.bueschel) if (b.weg && sicht(b.x, b.y, 8, 4, 4)) ctx.drawImage(stoppel, Math.round(b.x - 6), Math.round(b.y - 4));
  if (W.pilze) for (const m of W.pilze) if (sicht(m.x, m.y, 6, 8, 2)) ctx.drawImage(G.leuchtpilz[m.v], Math.round(m.x - 3), Math.round(m.y - 6));
  ctx.fillStyle = 'rgba(16, 40, 16, 0.35)';
  if (spielt) ellipse(ctx, p.x, p.y, 5, 2);
  const tierDa = spielt && S.tier && !kammer && S.begleiter;
  if (tierDa) begleiterSchatten(ctx);
  for (const g of S.gegner) if (sicht(g.x, g.y, 12, 12, 12)) ellipse(ctx, g.x, g.y, g.art === 'hummel' || g.art === 'motte' || g.art === 'fledermaus' ? 3 : 5, g.art === 'hummel' || g.art === 'motte' || g.art === 'fledermaus' ? 1.5 : 2);
  for (const e of S.beute) if (e.z > 1) ellipse(ctx, e.x, e.y + 3, 2.5, 1);
  if (kammer) kammerBoden(ctx); else lebenBoden(ctx, S);
  // Zielmarke der Tippen-Steuerung: kleiner pulsierender Ring am Boden
  if (spielt && p.ziel && S.phase === 'tag') {
    const pr = 4 + Math.sin(S.t * 10) * 0.8;
    ctx.strokeStyle = 'rgba(255, 248, 214, 0.75)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(Math.round(p.ziel.x) + 0.5, Math.round(p.ziel.y) + 0.5, pr, pr * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // Alles, was steht, nach Höhe sortiert
  const liste = [];
  for (const b of S.bueschel) if (!b.weg && sicht(b.x, b.y, 12, 24, 4)) liste.push({ y: b.y, t: 0, o: b });
  for (const b of W.baeume) if (sicht(b.x, b.y, 24, 50, 4)) liste.push({ y: b.y, t: 1, o: b });
  if (W.haus && sicht(W.haus.x, W.haus.y, 50, 85, 6)) liste.push({ y: W.haus.y, t: 2, o: W.haus });
  if (W.hoehle && sicht(W.hoehle.x, W.hoehle.y, 50, 70, 6)) liste.push({ y: W.hoehle.y, t: 6, o: W.hoehle });
  for (const pt of W.portale || []) if (sicht(pt.x, pt.y, 26, 48, 4)) liste.push({ y: pt.y, t: 'portal', o: pt });
  if (W.portal && sicht(W.portal.x, W.portal.y, 26, 48, 4)) liste.push({ y: W.portal.y, t: 'portal', o: { ...W.portal, gebiet: W.gebiet, zurueck: true } });
  if (W.feuer && sicht(W.feuer.x, W.feuer.y, 12, 20, 4)) liste.push({ y: W.feuer.y, t: 'feuer', o: W.feuer });
  if (W.huette && sicht(W.huette.x, W.huette.y, 30, 48, 4)) liste.push({ y: W.huette.y, t: 'huette', o: W.huette });
  if (kammer) kammerListe(liste); else lebenListe(liste, S, sicht);
  if (spielt) liste.push({ y: p.y, t: 3, o: p });
  if (tierDa) liste.push({ y: S.tier.y, t: 7, o: S.tier });
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
      case 6: {
        const img = (S.st.tueren | 0) > 0 ? G.hoehleOffen : G.hoehleZu, I = G.hoehleInfo;
        ctx.drawImage(img, Math.round(W.hoehle.x - I.w / 2), Math.round(W.hoehle.y + 2 - I.fussY));
        break;
      }
      case 7: zeichneBegleiter(ctx); break;
      default:
        if (e.t === 'portal') zeichnePortal(ctx, e.o);
        else if (e.t === 'huette') ctx.drawImage(G.huette[e.o.art], Math.round(e.o.x - 26), Math.round(e.o.y + 2 - G.huette[e.o.art].height));
        else if (e.t === 'feuer') ctx.drawImage(G.feuer[Math.floor(S.t * 8) % 3], Math.round(e.o.x - 8), Math.round(e.o.y - 14));
        else if (e.t === 'schilf' || e.t === 'ente' || e.t === 'hoernchen') lebenZeichne(ctx, e, S);
        else kammerZeichne(ctx, e);
    }
  }

  if (!kammer) lebenUeber(ctx, S);
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

  if (!kammer) wetterZeichne(ctx, S);
  if (kammer) kammerDunkel(ctx, L, T, vw, vh);
  else if (S.phase === 'tag' && (W.haus || W.huette) && S.zeit > S.dauer - HEIM_WARNUNG) heimPfeil(ctx, L, T, vw, vh);
  // Abendlicht (nur draußen)
  const q = spielt && !kammer ? S.zeit / S.dauer : 0;
  const abend = klemme((q - 0.6) / 0.4, 0, 1);
  if (abend > 0) {
    ctx.globalCompositeOperation = 'multiply';
    const rr = Math.round(255 - 165 * Math.max(0, abend - 0.4) / 0.6);
    const gg = Math.round(255 - 70 * Math.min(1, abend / 0.5) - 95 * Math.max(0, abend - 0.5) / 0.5);
    const bb = Math.round(255 - 115 * Math.min(1, abend / 0.5) + 30 * Math.max(0, abend - 0.5) / 0.5);
    ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
    ctx.fillRect(L - 2, T - 2, vw + 4, vh + 4);
    ctx.globalCompositeOperation = 'lighter';
    if (W.haus) {
      const I = G.hausInfo, hx = W.haus.x - I.w / 2, hy = W.haus.y + 2 - I.fussY;
      for (const [fx, fy, fr] of I.fenster) leuchten(ctx, hx + fx, hy + fy, fr * (1 + abend), abend * 0.55);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (W.gebiet !== 'dunkel') lebenLeuchten(ctx, S, abend);
  }
  if (!kammer && W.gebiet === 'dunkel') dunkelwald(ctx, L, T, vw, vh);
  if (!kammer && W.feuer) { ctx.globalCompositeOperation = 'lighter'; leuchten(ctx, W.feuer.x, W.feuer.y - 6, 40, 0.35 + 0.08 * Math.sin(S.t * 9)); ctx.globalCompositeOperation = 'source-over'; }

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

// Kurz vor Sonnenuntergang: Pfeil am Bildrand, der zum Baumstumpf zeigt (wenn er nicht zu sehen ist)
export const HEIM_WARNUNG = 15;
function heimPfeil(ctx, L, T, vw, vh) {
  const ziel = (S.welt.haus || S.welt.huette || S.welt.portal).tuer, mx = L + vw / 2, my = T + vh / 2;
  const rand = 16;
  if (ziel.x > L + rand && ziel.x < L + vw - rand && ziel.y - 30 > T + rand && ziel.y < T + vh - rand) return;
  const dx = ziel.x - mx, dy = ziel.y - 20 - my, a = Math.atan2(dy, dx);
  // Schnittpunkt mit dem eingerückten Bildrand
  const hx = vw / 2 - rand, hy = vh / 2 - rand;
  const f = Math.min(hx / Math.abs(Math.cos(a) || 1e-6), hy / Math.abs(Math.sin(a) || 1e-6));
  const x = mx + Math.cos(a) * f, y = my + Math.sin(a) * f;
  const puls = 1 + Math.sin(S.t * 10) * 0.12;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(a); ctx.scale(puls, puls);
  ctx.fillStyle = '#2b1d16';
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -8); ctx.lineTo(-3, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -5); ctx.lineTo(-2, 0); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Ruine oder Portal (wirbelnder Schimmer im Steinbogen, Farbe je Gebiet)
const PORTAL_FARBE = { dunkel: [62, 232, 208], berg: [191, 233, 255] };
function zeichnePortal(ctx, pt) {
  const aktiv = pt.zurueck || gebietFrei(pt.gebiet);
  const x = Math.round(pt.x), y = Math.round(pt.y);
  if (aktiv) {
    const [r, g, b] = PORTAL_FARBE[pt.gebiet];
    for (let i = 0; i < 4; i++) {
      const a = S.t * (1.5 + i * 0.4) + i;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.25 + i * 0.12})`;
      ctx.beginPath(); ctx.ellipse(x, y - 16, 10 - i * 2 + Math.sin(a) * 1.2, 14 - i * 3 + Math.cos(a) * 1.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const a = S.t * 2.4 + i * 1.05, rr = 4 + ((S.t * 6 + i * 3) % 8);
      ctx.fillRect(Math.round(x + Math.cos(a) * rr * 0.7), Math.round(y - 16 + Math.sin(a) * rr), 1, 1);
    }
  }
  const img = aktiv ? G.portal[pt.gebiet] : G.ruine;
  ctx.drawImage(img, x - 22, y + 2 - 44);
  if (aktiv) {
    const [r, g, b] = PORTAL_FARBE[pt.gebiet];
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(x, y - 16, 0, x, y - 16, 28);
    gr.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.35)`); gr.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gr; ctx.fillRect(x - 28, y - 44, 56, 56);
    ctx.globalCompositeOperation = 'source-over';
  }
}

// Dunkelwald: nur der Lichtkreis der Fackel ist hell. Türkise, Leuchtpilze, Glühwürmchen und das Portal
// leuchten durch die Dunkelheit (danach additiv drübergemalt).
function dunkelwald(ctx, L, T, vw, vh) {
  const p = S.sp, r = S.w.licht, x = p.x, y = p.y - 8;
  const gr = ctx.createRadialGradient(x, y, r * 0.45, x, y, r);
  gr.addColorStop(0, 'rgba(4, 6, 14, 0)'); gr.addColorStop(1, 'rgba(4, 6, 14, 0.9)');
  ctx.fillStyle = gr; ctx.fillRect(L - 2, T - 2, vw + 4, vh + 4);
  ctx.globalCompositeOperation = 'lighter';
  for (const m of S.welt.pilze) {
    const f = [[62, 232, 208], [187, 98, 238], [127, 240, 255]][m.v], a = 0.22 + 0.1 * Math.sin(S.t * 2 + m.ph);
    const g = ctx.createRadialGradient(m.x, m.y - 4, 0, m.x, m.y - 4, 10);
    g.addColorStop(0, `rgba(${f[0]}, ${f[1]}, ${f[2]}, ${a})`); g.addColorStop(1, `rgba(${f[0]}, ${f[1]}, ${f[2]}, 0)`);
    ctx.fillStyle = g; ctx.fillRect(m.x - 10, m.y - 14, 20, 20);
    ctx.fillStyle = `rgba(${f[0]}, ${f[1]}, ${f[2]}, 0.8)`; ctx.fillRect(Math.round(m.x - 1), Math.round(m.y - 6), 2, 1);
  }
  for (const e of S.beute) if (e.typ === SPEZIAL.tuerkis && !e.herz) {
    const g = ctx.createRadialGradient(e.x, e.y - e.z, 0, e.x, e.y - e.z, 12);
    g.addColorStop(0, 'rgba(90, 255, 230, 0.7)'); g.addColorStop(1, 'rgba(90, 255, 230, 0)');
    ctx.fillStyle = g; ctx.fillRect(e.x - 12, e.y - e.z - 12, 24, 24);
  }
  for (const g2 of S.gegner) if (g2.art === 'fledermaus') { ctx.fillStyle = '#ff5050'; ctx.fillRect(Math.round(g2.x - 2), Math.round(g2.y - g2.z - 5), 1, 1); ctx.fillRect(Math.round(g2.x + 1), Math.round(g2.y - g2.z - 5), 1, 1); }
  ctx.globalCompositeOperation = 'source-over';
  if (S.welt.portal) zeichnePortalLicht(ctx, S.welt.portal);
  lebenLeuchten(ctx, S, 1);
}
function zeichnePortalLicht(ctx, pt) {
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(pt.x, pt.y - 16, 0, pt.x, pt.y - 16, 30);
  g.addColorStop(0, 'rgba(62, 232, 208, 0.45)'); g.addColorStop(1, 'rgba(62, 232, 208, 0)');
  ctx.fillStyle = g; ctx.fillRect(pt.x - 30, pt.y - 46, 60, 60);
  ctx.globalCompositeOperation = 'source-over';
}

function ellipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function leuchten(ctx, x, y, r, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255, 200, 110, ${a})`); g.addColorStop(1, 'rgba(255, 200, 110, 0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function wasserGlitzer(ctx, L, T, R, U) {
  const w = S.welt.wasser;
  if (!w.length) return;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let i = 0; i < w.length; i += 2) {
    const x = w[i] * K, y = w[i + 1] * K;
    if (x < L - K || x > R || y < T - K || y > U) continue;
    const h = (w[i] * 73 + w[i + 1] * 151) % 97;
    if (Math.sin(S.t * 1.7 + h) > 0.6) ctx.fillRect(x + 3 + (h % 8), y + 4 + (h % 7), 3, 1);
  }
}

function zeichneBueschel(ctx, b, spielt) {
  const img = ((G.bueschelGebiet && G.bueschelGebiet[S.welt.gebiet]) || G.bueschel)[b.art];
  let s = Math.sin(S.t * 1.8 + b.ph) * 0.07;
  const wi = S.wetter && S.ort === 'wald' ? S.wetter.wind : null;
  if (wi && wi.staerke) s += wi.x * wi.staerke * (0.16 + Math.sin(S.t * 4 + b.ph) * 0.07);   // Sturm biegt das Gras
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
  const satz = S.welt.gebiet === 'dunkel' ? G.baumDunkel : S.welt.gebiet === 'berg' ? G.tanne : G.baum;
  const img = satz[b.v % satz.length];
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
  let img = G.kind[p.blick][f], hoch = p.bewegt && (f === 1 || f === 3) ? -1 : 0;
  // Hau-Animation: Ausfallschritt in Schlagrichtung (breite Beine), kurz in die Knie, dann strecken.
  // Beim Wirbelschlag dreht sich der Körper mit der Klinge.
  let ox = 0, oy = 0, sy = 1;
  if (p.schlagT > 0) {
    const q = 1 - p.schlagT / p.schlagDauer;
    const blick = p.schlagRund ? blickAus(Math.atan2(Math.sin(aktuellerSchwertWinkel()), Math.cos(aktuellerSchwertWinkel()))) : p.blick;
    img = G.kindHau[blick]; hoch = 0;
    if (!p.schlagRund) {
      const l = Math.sin(Math.min(1, q * 1.5) * Math.PI) * 2.5;
      ox = Math.cos(p.schlagWinkel) * l; oy = Math.sin(p.schlagWinkel) * l * 0.6;
    }
    sy = q < 0.22 ? 0.9 : 1 + 0.07 * Math.sin((q - 0.22) / 0.78 * Math.PI);
  }
  const hinten = p.schlagT > 0 && Math.sin(aktuellerSchwertWinkel()) < -0.2;
  if (hinten) zeichneSchwert(ctx, ox, oy);
  if (!blinkt) {
    ctx.save();
    ctx.translate(Math.round(p.x + ox), Math.round(p.y + oy));
    if (sy !== 1) ctx.scale(1, sy);
    ctx.drawImage(img, -8, -15 + hoch);
    ctx.restore();
  }
  if (!hinten) zeichneSchwert(ctx, ox, oy);
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

function zeichneSchwert(ctx, ox = 0, oy = 0) {
  const p = S.sp, w = S.w;
  if (p.schlagT <= 0) return;
  const q = 1 - p.schlagT / p.schlagDauer;
  const reich = w.reichweite * (p.schlagRund ? 1.25 : 1);
  const a = aktuellerSchwertWinkel();
  const a0 = p.schlagRund ? Math.max(p.schlagWinkel, a - 2.2) : Math.max(p.schlagWinkel - w.bogen / 2, a - 1.6);
  const cx = p.x + ox, cy = p.y - 6 + oy;
  // Schwungspur
  ctx.fillStyle = (S.st.bosse | 0) >= 4 ? `rgba(255, 214, 80, ${0.6 * (1 - q)})` : `rgba(255, 255, 235, ${0.5 * (1 - q)})`;   // Goldener Schliff
  ctx.beginPath();
  ctx.arc(cx, cy, reich, a0, a);
  ctx.arc(cx, cy, reich * 0.45, a, a0, true);
  ctx.closePath(); ctx.fill();
  // Klinge mit zwei blassen Nachbildern (Bewegungsunschärfe), danach die Hand am Griff
  const img = G.klinge[S.st.klinge | 0];
  const zurueck = p.schlagRund ? -1 : (a >= p.schlagWinkel - w.bogen / 2 ? -1 : 1);
  for (const [d, al] of [[0.5, 0.18], [0.25, 0.35], [0, 1]]) {
    ctx.save();
    ctx.globalAlpha = al * (d ? 1 - q : 1);
    ctx.translate(Math.round(cx), Math.round(cy));
    ctx.rotate(a + zurueck * d);
    ctx.drawImage(img, 1, -4);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  const hx = Math.round(cx + Math.cos(a) * 3), hy = Math.round(cy + Math.sin(a) * 3);
  ctx.fillStyle = '#2b1d16'; ctx.fillRect(hx - 2, hy - 2, 4, 4);
  ctx.fillStyle = G.hautFarbe; ctx.fillRect(hx - 1, hy - 1, 2, 2);
}

function zeichneGegner(ctx, g) {
  const satz = G.gegner[g.art];
  const f = g.art === 'blob' || g.art === 'blobchen' ? Math.floor(g.t * 3) % 2 : g.art === 'hummel' || g.art === 'motte' || g.art === 'fledermaus' ? Math.floor(g.t * (g.art === 'hummel' ? 20 : 12)) % 2 : g.art === 'pilz' || g.art === 'kueken' || g.art === 'schneekugel' ? (g.hop > 0 ? 0 : 1) : 0;
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
