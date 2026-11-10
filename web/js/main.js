// main.js – Startet alles und hält die Schleife am Laufen.

import { KACHEL, SICHT_KACHELN } from './config.js';
import { initGrafik, setzeFigur } from './grafik.js';
import { initHoehlenGrafik } from './hoehlengrafik.js';
import { initWetterGrafik, wetterText, wetterTextGebirge } from './wetter.js';
import { initGebietGrafik } from './gebietgrafik.js';
import {
  S, initSpiel, laden, speichern, neuAnfangen, hatSpielstand, neuerTag, weiterMaehen, tagBeenden,
  kaufen, update, zeichne, setzeHooks, oeffneTuer, kaufeEinmal, setzeHut, reiseNach, gebietFrei, nachNiederlage, kaufeBegleiter, benenneBegleiter, betreteKammer, verlasseKammer, HEIM_WARNUNG,
} from './spiel.js';
import { KAMMERN, GEBIETE, KLEIDERSCHRANK_AB, STUBE_AB } from './config.js';
import { tierName } from './begleiter.js';

// Morgens nach dem Schlafen: Von Tag 2 bis 6 erzählt der Text eine kleine Geschichte,
// danach gibt es wechselnde Morgen-Sprüche. Die Spieltipps der ersten Tage stehen darunter.
const GESCHICHTE = [
  'Gestern war das Gras ganz schön dicht. Hoffentlich wird es heute leichter für dich!',
  'Heute Nacht hat es oben am Fels geglitzert. Ob da wohl etwas versteckt ist?',
  'Der alte Baumstumpf knarzt zufrieden. Er mag es, wenn du abends heimkommst.',
  'Die Vögel zwitschern von Wächtern tief in der Höhle. Ganz schön mutig, wer da hingeht …',
  'Der Wald sieht schon viel ordentlicher aus als früher. Alle Tiere sagen Danke!',
];
const MORGEN = [
  'Ein neuer Morgen. Der Tau glitzert fast wie Diamanten.',
  'Über Nacht ist alles wieder zugewachsen. Typisch Wald!',
  'Der Tee war heute besonders lecker. Auf geht’s!',
  'Die Sonne lacht – heute wird ein guter Tag.',
  'Die Schnecken haben die ganze Nacht gefeiert. Pass bloß auf!',
  'Ein Eichhörnchen winkt dir vom Baum zu.',
];
let letzterSpruch = -1;
function morgenText() {
  if (S.tag >= 2 && S.tag <= 6) return GESCHICHTE[S.tag - 2];
  if (S.tag < 2) return '';
  const pool = MORGEN.slice();
  if (S.begleiter) {
    const n = tierName(), katze = S.begleiter.art === 'katze';
    pool.push(`${n} hat heute Nacht ganz leise geschnarcht.`);
    pool.push(katze ? `${n} schnurrt dir um die Beine. Auf geht’s!` : `${n} wedelt schon ungeduldig an der Tür.`);
    pool.push(`${n} hat geträumt, ganz viele Diamanten auszubuddeln.`);
  }
  let i; do i = Math.floor(Math.random() * pool.length); while (i === letzterSpruch && pool.length > 1);
  letzterSpruch = i;
  return pool[i];
}
const TIPPS = {
  2: 'Brummhummeln sind unterwegs. Die nerven!',
  3: 'Blütenbüsche sind zäh, aber da steckt mehr drin.',
  4: 'Hüpfpilze! Weiter draußen wächst das bessere Zeug.',
  5: 'Dornenbüsche: am zähesten, aber oft mit Gold.',
};
import * as UI from './ui.js';
import { initEingabe, eingabe, padAbfragen } from './eingabe.js';
import { tonStart, tonSchlafen, wetterTon } from './ton.js';
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
initWetterGrafik();
initGebietGrafik();
laden();
if (S.figur) setzeFigur(S.figur.art, S.figur.farbe, S.st.hut);
// Zum Testen: ?geld=5000 schenkt Diamanten – nur lokal, online soll keiner schummeln
const q = new URLSearchParams(location.search);
const lokal = /^(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(location.hostname);
if (lokal && q.has('geld')) { S.geld = parseInt(q.get('geld'), 10) || 0; speichern(); }
initSpiel();

let vorPause = null;
let letzterGrund = null;        // wie der letzte Tag endete ('heim', 'abend', 'ohnmacht')
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
  bilanz: (info) => { eingabe.leeren(); letzterGrund = info.grund; UI.zeigeBilanz(info); steuerung.aktualisiere(); },
  hinweis: (t) => UI.toast(t),
  hoehle: () => { eingabe.leeren(); UI.zeigeHoehle(); steuerung.aktualisiere(); },
  // Durch ein Portal: kurz schwarz, dann im anderen Gebiet; beim ersten Mal ein Hinweis
  reise: (ziel) => {
    eingabe.leeren();
    const text = ziel === 'wald' ? 'Zurück in den Wald …' : ziel === 'berg' ? 'Auf ins Gebirge …' : 'In den Dunkelwald …';
    UI.nachtAn(() => {
      reiseNach(ziel); steuerung.aktualisiere();
      setTimeout(UI.nachtAus, 250);
      const k = 'besucht_' + ziel;
      if (ziel !== 'wald' && !S.hinweise[k]) {
        S.hinweise[k] = true;
        UI.toast(ziel === 'dunkel'
          ? 'Der Dunkelwald! Nur im Licht deiner Fackel siehst du etwas. Hier leuchten Türkise im Gras.'
          : 'Das Gebirge! Achte auf die Wärme oben links – am Lagerfeuer wird dir warm. Hier gibt es Eiskristalle.', 6000);
      }
    }, text);
  },
  bossBesiegt: (k) => UI.toast(`${KAMMERN[k - 1].boss} ist besiegt!`, 2500),
  belohnung: (k) => { eingabe.leeren(); S.phase = 'fund'; UI.zeigeFund(k); steuerung.aktualisiere(); },
  // Gegen einen Wächter umgekippt: kurz schwarz, dann vor dem Baumstumpf aufwachen – der Tag geht weiter
  kammerNiederlage: () => {
    eingabe.leeren();
    UI.nachtAn(() => {
      const r = nachNiederlage(); steuerung.aktualisiere(); UI.hudNeu();
      setTimeout(UI.nachtAus, 300);
      UI.toast(`${KAMMERN[r.k - 1].boss} war zu stark … Du wachst vor dem Baumstumpf auf.${r.verlust ? ` Die Hälfte der Diamanten von heute ist weg (−${r.verlust}).` : ''} Der Tag geht weiter!`, 6000);
    }, 'Uff …');
  },
  kammerVerlassen: () => {
    verlasseKammer();
    const neu = ['dunkel', 'berg'].find(g => gebietFrei(g) && !S.hinweise['portal_' + g]);
    // Neu im Laden? (Kleiderschrank nach Wächter 1, Stube nach Wächter 2)
    const laden = S.st.bosse === KLEIDERSCHRANK_AB ? ' Im Baumstumpf steht jetzt ein Kleiderschrank.'
      : S.st.bosse === STUBE_AB ? ' Im Baumstumpf kannst du jetzt die Stube einrichten.' : '';
    if (neu) { S.hinweise['portal_' + neu] = true; UI.toast('Irgendwo im Wald hat sich etwas verändert … Halte die Augen offen!' + laden, 6000); }
    else UI.toast((S.st.bosse >= 5 ? 'Der Riesendiamant funkelt in deiner Tasche.' : 'Zurück im Wald. Die nächste Tür wartet …') + laden, laden ? 5000 : 3000);
    steuerung.aktualisiere();
  },
  tagBeginnt: () => {
    UI.hudNeu();
    if (S.tag === 1) UI.toast('Hau das Gras weg – manchmal steckt ein Diamant drin!', 4000);
    else {
      // Alte Spielstände: wer die Wächter schon besiegt hat, bekommt den Hinweis auf die Portale einmal morgens
      const neu = ['dunkel', 'berg'].find(g => gebietFrei(g) && !S.hinweise['portal_' + g]);
      if (neu) S.hinweise['portal_' + neu] = true;
      const text = [neu ? 'Irgendwo im Wald hat sich etwas verändert …' : '', wetterText(S.wetter), gebietFrei('berg') ? wetterTextGebirge(S.wetter) : '', morgenText(), TIPPS[S.tag]].filter(Boolean).join('\n');
      if (text) UI.toast(text, TIPPS[S.tag] ? 6000 : 4500);
    }
    steuerung.aktualisiere();
  },
});

UI.initUI({
  start() {
    tonStart();
    // Noch keine Figur gewählt (neues Spiel oder alter Spielstand): erst fragen, dann geht's los
    if (!S.figur) { UI.zeigeFigur('start'); return; }
    if (!hatSpielstand()) { UI.zeige(null); neuerTag(); }
    else { S.phase = 'laden'; UI.zeigeHaus(true); }
    steuerung.aktualisiere();
  },
  neu() { neuAnfangen(); setzeFigur(); initSpiel(); UI.hudNeu(); UI.zeigeTitel(false); },
  figurGewaehlt(art, farbe, zweck) {
    S.figur = { art, farbe }; setzeFigur(art, farbe, S.st.hut); speichern();
    UI.hudNeu();
    if (zweck === 'start') this.start(); else UI.zeigeTitel(hatSpielstand());
  },
  // Nach dem Schlafen: kurz schwarz, dann blendet der neue Morgen ein
  neuerTag() {
    tonStart();
    UI.nachtUebergang(() => { UI.zeige(null); neuerTag(); steuerung.aktualisiere(); });
  },
  weiterMaehen() { UI.zeige(null); weiterMaehen(); steuerung.aktualisiere(); },
  // Schlafen gehen: schwarz („Gute Nacht“), Bilanz auf dem Nachtbild, „Aufstehen“ startet den Morgen
  tagBeenden() { UI.nachtAn(() => tagBeenden()); },
  kaufen(id, preis) { return kaufen(id, preis); },
  kaufeEinmal(schluessel, preis) { return kaufeEinmal(schluessel, preis); },
  hutAufsetzen(id) { setzeHut(id); const f = S.figur || { art: 'junge', farbe: 'blau' }; setzeFigur(f.art, f.farbe, id); UI.hudNeu(); },
  begleiterKaufen(art, rasse, preis, name) {
    const ok = kaufeBegleiter(art, rasse, preis, name);
    if (ok) UI.toast(art === 'katze' ? `Miau! ${tierName()} ist jetzt dabei.` : `Wuff! ${tierName()} ist jetzt dabei.`, 3000);
    return ok;
  },
  begleiterBenennen(name) { benenneBegleiter(name); UI.toast(`Ab jetzt heißt dein Begleiter ${tierName()}.`, 2500); },
  bilanzWeiter() {
    if (letzterGrund === 'heim') {
      // Aufstehen: gleich draußen vor dem Baumstumpf, der Morgen blendet ein
      UI.zeige(null); neuerTag(); steuerung.aktualisiere();
      setTimeout(UI.nachtAus, 150);
    } else { S.phase = 'laden'; UI.zeigeHaus(true); }
  },
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
// ?begleiter=katze-tiger: Tier nur für diesen Besuch dabeihaben (wird nicht gespeichert, solange man nichts kauft)
if (lokal && q.has('begleiter')) { const [art, rasse] = q.get('begleiter').split('-'); S.begleiter = { art, rasse }; }
if (lokal && q.has('wetter')) S.wetterTest = q.get('wetter');         // ?wetter=regen / sturm: jeden Tag dieses Wetter
// ?alles=cap: alle Möbel und dieser Hut (nur für diesen Besuch, z. B. mit ?laden)
if (lokal && q.has('alles')) {
  for (const e of ['pflanze', 'bild', 'korb', 'teppich', 'uhr', 'lichter', 'leuchter']) S.st['moebel_' + e] = 1;
  S.st.hut = q.get('alles') || 'cap'; S.st.bosse = Math.max(S.st.bosse | 0, 2); S.figur = S.figur || { art: 'junge', farbe: 'blau' }; setzeFigur(S.figur.art, S.figur.farbe, S.st.hut);
}
if (lokal && q.has('tierwahl')) { S.geld = Math.max(S.geld, 200); UI.zeigeBegleiterWahl(); }
else if (lokal && q.has('laden')) { S.phase = 'laden'; UI.zeigeHaus(true); }    // ?laden: Ladenfenster nach dem Tag
else if (lokal && q.has('wahl')) UI.zeigeFigur('start');                    // ?wahl: Figur-Auswahl
else if (lokal && q.has('schlafen')) {                                       // ?schlafen: Nacht-Bilanz nach dem Schlafengehen
  document.getElementById('nacht').style.transition = 'none';   // Headless-Chrome lässt CSS-Übergänge stehen
  UI.zeige(null); neuerTag(); S.heute.gemaeht = 37; S.heute.steine = [12, 6, 1, 0, 0]; S.heute.wert = 62;
  UI.nachtAn(() => tagBeenden());
}
else if (lokal && (q.has('kammer') || q.has('hoehle') || q.has('eingang'))) {
  UI.zeige(null); neuerTag();
  if (q.has('kammer')) betreteKammer(Math.max(1, Math.min(5, parseInt(q.get('kammer'), 10) || 1)));
  else if (q.has('eingang')) {          // ?eingang: vor dem Höhleneingang stehen
    const h = S.welt.hoehle; S.sp.x = h.tuer.x - 20; S.sp.y = h.tuer.y + 36; S.kam.x = S.sp.x; S.kam.y = S.sp.y;
  } else { S.phase = 'hoehle'; UI.zeigeHoehle(); }
  if (q.has('gebiet')) {                        // ?eingang&gebiet=dunkel: Gebiet freispielen (nur diesmal) und hinreisen
    const g = q.get('gebiet'); S.st.bosse = Math.max(S.st.bosse | 0, GEBIETE[g].ab); S.hinweise['portal_' + g] = true; reiseNach(g);
  }
  if (q.has('ort')) { const [x, y] = q.get('ort').split(',').map(Number); S.sp.x = x; S.sp.y = y; S.kam.x = x; S.kam.y = y; S.gegner = []; }   // ?eingang&ort=200,240
  if (q.has('spaet')) S.zeit = S.dauer - 14;      // ?spaet: kurz vor Sonnenuntergang (Heimweg-Pfeil)
  // ?vor=6: so viele Sekunden vorspulen (Held steht still, unverwundbar) – für Bilder mitten im Kampf
  if (q.has('vor')) {
    const still = { richtung: () => ({ x: 0, y: 0 }), angriff: false, holeNeu: () => false, ziel: () => null };
    for (let i = 0; i < (parseFloat(q.get('vor')) || 0) * 60; i++) { S.sp.hp = S.w.maxHp; if (S.phase !== 'tag') break; update(1 / 60, still); }
  }
  if (q.has('hauen')) setInterval(() => { S.sp.puffer = 0.18; S.sp.winkel = parseFloat(q.get('hauen')) || 0; }, 600);   // ?hauen=1.57: haut alle 0,6 s in diese Richtung
  steuerung.aktualisiere();
}

// Controller verbunden (meldet sich erst nach dem ersten Knopfdruck)
addEventListener('gamepadconnected', () => {
  UI.toast('🎮 Controller verbunden! Stick oder Steuerkreuz = laufen · A = hauen · Start = Pause. In Menüs: Stick wählt, A drückt.', 5000);
});

// Wer die App verlässt, findet sie pausiert wieder
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.phase === 'tag') pause();
  tonSchlafen(document.hidden);
});

// Welches Stück passt gerade? Abends (ab 72 % des Tages) wird es ruhiger, im Baumstumpf Spieluhr.
function stueckFuerPhase() {
  // Überall die Hintergrundmusik (Datei), nur beim Kampf gegen einen Wächter das Kampfstück
  if (S.ort === 'kammer' && S.boss && (S.phase === 'tag' || S.phase === 'pause')) return 'kampf';
  return 'hintergrund';
  // Frühere Zuordnung der Chip-Stücke, falls sie wieder gebraucht wird:
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
  padAbfragen(dt);
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
  const leiserSchnee = S.gebiet === 'berg' && S.wetter && S.wetter.art === 'regen';
  wetterTon(S.ort === 'wald' && S.phase === 'tag' && S.wetter && S.wetter.art !== 'sonne' && !leiserSchnee ? S.wetter.art : null);
  requestAnimationFrame(schleife);
}
requestAnimationFrame(schleife);
