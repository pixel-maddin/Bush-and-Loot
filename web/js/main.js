// main.js – Startet alles und hält die Schleife am Laufen.

import { KACHEL, SICHT_KACHELN } from './config.js';
import { initGrafik } from './grafik.js';
import { initHoehlenGrafik } from './hoehlengrafik.js';
import {
  S, initSpiel, laden, speichern, neuAnfangen, hatSpielstand, neuerTag, weiterMaehen, tagBeenden,
  kaufen, update, zeichne, setzeHooks, oeffneTuer, betreteKammer, verlasseKammer, HEIM_WARNUNG,
} from './spiel.js';
import { KAMMERN } from './config.js';
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
initHoehlenGrafik();
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
  hoehle: () => { eingabe.leeren(); UI.zeigeHoehle(); steuerung.aktualisiere(); },
  bossBesiegt: (k) => UI.toast(`${KAMMERN[k - 1].boss} ist besiegt!`, 2500),
  belohnung: (k) => { eingabe.leeren(); S.phase = 'fund'; UI.zeigeFund(k); steuerung.aktualisiere(); },
  kammerVerlassen: () => {
    verlasseKammer();
    UI.toast(S.st.bosse >= 5 ? 'Der Riesendiamant funkelt in deiner Tasche.' : 'Zurück im Wald. Die nächste Tür wartet …', 3000);
    steuerung.aktualisiere();
  },
  tagBeginnt: () => {
    UI.hudNeu();
    if (S.tag === 1) UI.toast('Hau das Gras weg – manchmal steckt ein Diamant drin!', 4000);
    else if (S.tag === 2) UI.toast('Brummhummeln sind unterwegs. Die nerven!', 3500);
    else if (S.tag === 3) UI.toast(S.st.tueren ? 'Blütenbüsche sind zäh, aber da steckt mehr drin.' : 'Blütenbüsche sind zäh – und oben im Fels gibt es eine Höhle …', 3800);
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
  tuerOeffnen(k) { return oeffneTuer(k); },
  kaempfen(k) {
    UI.zeige(null); betreteKammer(k);
    UI.toast(`${KAMMERN[k - 1].name}: ${KAMMERN[k - 1].boss}!`, 2200);
    steuerung.aktualisiere();
  },
  hoehleRaus() { UI.zeige(null); S.phase = 'tag'; steuerung.aktualisiere(); },
  fundWeiter() { UI.zeige(null); S.phase = 'tag'; steuerung.aktualisiere(); },
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

// Testwege (nur lokal): ?kammer=3 startet sofort in Kammer 3, ?hoehle zeigt das Höhlen-Fenster,
// ?eingang stellt den Helden vor den Höhleneingang.
// Ohne Ton, weil niemand getippt hat. Fürs Bild aus Headless-Chrome gedacht (siehe CLAUDE.md).
if (lokal && q.has('laden')) { S.phase = 'laden'; UI.zeigeHaus(true); }    // ?laden: Ladenfenster nach dem Tag
else if (lokal && (q.has('kammer') || q.has('hoehle') || q.has('eingang'))) {
  UI.zeige(null); neuerTag();
  if (q.has('kammer')) betreteKammer(Math.max(1, Math.min(5, parseInt(q.get('kammer'), 10) || 1)));
  else if (q.has('eingang')) {          // ?eingang: vor dem Höhleneingang stehen
    const h = S.welt.hoehle; S.sp.x = h.tuer.x - 20; S.sp.y = h.tuer.y + 36; S.kam.x = S.sp.x; S.kam.y = S.sp.y;
  } else { S.phase = 'hoehle'; UI.zeigeHoehle(); }
  if (q.has('spaet')) S.zeit = S.dauer - 14;      // ?spaet: kurz vor Sonnenuntergang (Heimweg-Pfeil)
  steuerung.aktualisiere();
}

// Wer die App verlässt, findet sie pausiert wieder
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.phase === 'tag') pause();
  tonSchlafen(document.hidden);
});

// Welches Stück passt gerade? Abends (ab 72 % des Tages) wird es ruhiger, im Baumstumpf Spieluhr.
function stueckFuerPhase() {
  if (S.ort === 'kammer' && (S.phase === 'tag' || S.phase === 'pause')) return S.boss ? 'kampf' : 'haus';
  switch (S.phase) {
    case 'tag': return S.zeit / S.dauer > 0.72 ? 'abend' : 'tag';
    case 'pause': return S.zeit / S.dauer > 0.72 ? 'abend' : 'tag';
    case 'hoehle': return 'abend';
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
  // Das erste Bild kann einen Zeitstempel vor "letzte" haben – negativ darf dt nie werden
  const dt = Math.max(0, Math.min(0.05, (t - letzte) / 1000));
  letzte = t;
  update(dt, eingabe);
  if (S.phase === 'tag' && S.ort === 'wald' && S.zeit > S.dauer - HEIM_WARNUNG && warnTag !== S.tag) {
    warnTag = S.tag;
    UI.toast(S.tag <= 2
      ? 'Bald ist es dunkel! Schnell heim in den Baumstumpf – sonst verlierst du die Hälfte der Diamanten von heute.'
      : 'Bald dunkel – ab nach Hause!', S.tag <= 2 ? 4500 : 3000);
  }
  zeichne(ctx, cv.width, cv.height, zoom);
  if (S.phase !== 'titel') UI.hud();
  musikWaehle(stueckFuerPhase(), S.phase === 'pause');
  requestAnimationFrame(schleife);
}
requestAnimationFrame(schleife);
