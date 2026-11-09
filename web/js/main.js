// main.js – Startet alles und hält die Schleife am Laufen.

import { KACHEL, SICHT_KACHELN } from './config.js';
import { initGrafik } from './grafik.js';
import {
  S, initSpiel, laden, speichern, neuAnfangen, hatSpielstand, neuerTag, weiterMaehen, tagBeenden,
  kaufen, update, zeichne, setzeHooks,
} from './spiel.js';
import * as UI from './ui.js';
import { initEingabe, eingabe } from './eingabe.js';
import { tonStart, tonSchlafen } from './ton.js';
import { musikWaehle } from './musik.js';

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d', { alpha: false });
let zoom = 1;

function groesse() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = Math.round(innerWidth * dpr);
  cv.height = Math.round(innerHeight * dpr);
  // Ganzzahliger Zoom hält die Pixel scharf; erst bei sehr kleinen Fenstern krumm
  const z = Math.min(cv.width, cv.height) / (SICHT_KACHELN * KACHEL);
  zoom = z >= 2 ? Math.floor(z) : Math.max(1, z);
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', groesse);
groesse();

initGrafik();
laden();
// Zum Testen: ?geld=5000 schenkt Diamanten – nur lokal, online soll keiner schummeln
const q = new URLSearchParams(location.search);
const lokal = /^(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(location.hostname);
if (lokal && q.has('geld')) { S.geld = parseInt(q.get('geld'), 10) || 0; speichern(); }
initSpiel();

let vorPause = null;
const steuerung = initEingabe({
  flaeche: cv,
  stickEl: document.getElementById('stick'),
  knaufEl: document.getElementById('knauf'),
  btnA: document.getElementById('btnA'),
  aktiv: () => S.phase === 'tag',
  onPause: () => pause(),
});

function pause() {
  if (S.phase === 'tag') {
    vorPause = S.phase; S.phase = 'pause';
    eingabe.leeren();
    UI.zeigePause();
  } else if (S.phase === 'pause') {
    S.phase = vorPause || 'tag';
    UI.zeige(null);
  }
  steuerung.aktualisiere();
}

setzeHooks({
  haus: () => { eingabe.leeren(); UI.zeigeHaus(false); steuerung.aktualisiere(); },
  bilanz: (info) => { eingabe.leeren(); UI.zeigeBilanz(info); steuerung.aktualisiere(); },
  hinweis: (t) => UI.toast(t),
  tagBeginnt: () => {
    UI.hudNeu();
    if (S.tag === 1) UI.toast('Hau das Gras weg – manchmal steckt ein Diamant drin!', 4000);
    else if (S.tag === 2) UI.toast('Brummhummeln sind unterwegs. Die nerven!', 3500);
    else if (S.tag === 3) UI.toast('Blütenbüsche sind zäh, aber da steckt mehr drin.', 3500);
    else if (S.tag === 4) UI.toast('Hüpfpilze! Weiter draußen wächst das bessere Zeug.', 3500);
    else if (S.tag === 5) UI.toast('Dornenbüsche: am zähesten, aber oft mit Gold.', 3500);
    steuerung.aktualisiere();
  },
});

UI.initUI({
  start() {
    tonStart();
    if (!hatSpielstand()) { UI.zeige(null); neuerTag(); }
    else { S.phase = 'laden'; UI.zeigeHaus(true); }
    steuerung.aktualisiere();
  },
  neu() { neuAnfangen(); initSpiel(); UI.hudNeu(); UI.zeigeTitel(false); },
  neuerTag() { tonStart(); UI.zeige(null); neuerTag(); },
  weiterMaehen() { UI.zeige(null); weiterMaehen(); steuerung.aktualisiere(); },
  tagBeenden() { tagBeenden(); },
  kaufen(id, preis) { return kaufen(id, preis); },
  bilanzWeiter() { S.phase = 'laden'; UI.zeigeHaus(true); },
  pause,
  zumTitel() {
    // Gesammeltes bleibt, der angefangene Tag zählt nicht
    speichern();
    S.phase = 'titel'; initSpiel(); UI.hudNeu();
    UI.zeigeTitel(hatSpielstand());
    steuerung.aktualisiere();
  },
});
UI.zeigeTitel(hatSpielstand());

// Wer die App verlässt, findet sie pausiert wieder
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.phase === 'tag') pause();
  tonSchlafen(document.hidden);
});

// Welches Stück passt gerade? Abends (ab 72 % des Tages) wird es ruhiger, im Baumstumpf Spieluhr.
function stueckFuerPhase() {
  switch (S.phase) {
    case 'tag': return S.zeit / S.dauer > 0.72 ? 'abend' : 'tag';
    case 'pause': return S.zeit / S.dauer > 0.72 ? 'abend' : 'tag';
    case 'haus': case 'laden': case 'titel': return 'haus';
    default: return null;     // Abblende und Bilanz: Stille, da spielt die kleine Abendmelodie
  }
}

// Als App installierbar und offline spielbar – geht nur über https oder localhost
if ('serviceWorker' in navigator && isSecureContext) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Hinweis kurz vor Sonnenuntergang (einmal pro Tag)
let warnTag = 0;

let letzte = performance.now();
function schleife(t) {
  const dt = Math.min(0.05, (t - letzte) / 1000);
  letzte = t;
  update(dt, eingabe);
  if (S.phase === 'tag' && S.zeit > S.dauer - 12 && warnTag !== S.tag) {
    warnTag = S.tag;
    UI.toast(S.tag === 1 ? 'Die Sonne geht bald unter! Was herumliegt, nimmst du abends mit.' : 'Die Sonne geht bald unter!', 3000);
  }
  zeichne(ctx, cv.width, cv.height, zoom);
  if (S.phase !== 'titel') UI.hud();
  musikWaehle(stueckFuerPhase(), S.phase === 'pause');
  requestAnimationFrame(schleife);
}
requestAnimationFrame(schleife);
