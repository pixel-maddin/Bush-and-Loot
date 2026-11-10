// ui.js – Alles, was als HTML über dem Spielbild liegt: Anzeige oben, Titel, Laden, Tagesbilanz, Pause.

import { G, bildURL, KLEIDER, FIGUREN, figurVorschau } from './grafik.js';
import { AUFRUESTUNGEN, STEINE, KAMMERN, SPEZIAL } from './config.js';
import { S, liegenGeblieben } from './spiel.js';
import { RASSEN, tierIcon, tierSchlafend, BEGLEITER_PREIS, TAUSCH_PREIS, LECKERLI_KOSTEN, NAMEN, tierName, nameSauber } from './begleiter.js';
import { stubenBilder } from './stube.js';
import { istStumm, setzeStumm } from './ton.js';
import { istMusikAn, setzeMusik } from './musik.js';
import { touchGeraet, holeSteuerArt, setzeSteuerArt } from './eingabe.js';

const $ = (id) => document.getElementById(id);
let h = {};
const zahl = (n) => n.toLocaleString('de-DE');
const px = (c, cls = '') => `<img class="px ${cls}" src="${bildURL(c)}" alt="">`;

export function initUI(handler) {
  h = handler;
  $('geldIcon').src = bildURL(G.waehrung);
  $('btnStart').onclick = () => h.start();
  $('btnFigur').onclick = () => zeigeFigur('titel');
  $('btnNeu').onclick = () => {
    if (confirm('Wirklich von vorn anfangen? Alle Diamanten und Waffen sind dann weg.')) h.neu();
  };
  $('btnPause').onclick = () => h.pause();
  $('btnWeiter').onclick = () => h.pause();
  $('btnTon').onclick = () => { setzeStumm(!istStumm()); tonKnopf(); };
  $('btnMusik').onclick = () => { setzeMusik(!istMusikAn()); tonKnopf(); };
  $('btnSteuerung').onclick = () => {
    setzeSteuerArt(holeSteuerArt() === 'tippen' ? 'stick' : 'tippen');
    tonKnopf(); steuerHilfe();
  };
  // Vollbild nur dort anbieten, wo es geht und das Spiel nicht schon als App läuft (iPhone kann es nicht)
  if (document.fullscreenEnabled && !matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) {
    $('btnVollbild').classList.remove('versteckt');
    $('btnVollbild').onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else document.documentElement.requestFullscreen().catch(() => {});
    };
    document.addEventListener('fullscreenchange', () => {
      $('btnVollbild').textContent = document.fullscreenElement ? 'Vollbild verlassen' : 'Vollbild';
    });
  }
  $('btnTitel').onclick = () => h.zumTitel();
  $('btnBilanz').onclick = () => h.bilanzWeiter();
  $('btnHoehleRaus').onclick = () => h.hoehleRaus();
  $('btnFund').onclick = () => h.fundWeiter();
  tonKnopf();
  steuerHilfe();
}

function tonKnopf() {
  $('btnTon').textContent = istStumm() ? 'Ton: aus' : 'Ton: an';
  $('btnMusik').textContent = istMusikAn() ? 'Musik: an' : 'Musik: aus';
  $('btnMusik').disabled = istStumm();     // ohne Ton keine Musik
  // Wahl der Touch-Steuerung nur dort, wo es Touch gibt
  $('btnSteuerung').classList.toggle('versteckt', !touchGeraet);
  $('btnSteuerung').textContent = holeSteuerArt() === 'tippen' ? 'Steuerung: Tippen' : 'Steuerung: Stick';
}

export function steuerHilfe() {
  $('steuerHilfe').innerHTML = touchGeraet
    ? (holeSteuerArt() === 'tippen'
      ? '<b>Handy:</b> Tippen, wo er hinlaufen soll (halten = folgt dem Finger) · runder Knopf = hauen'
      : '<b>Handy:</b> Links ziehen = laufen · rechts tippen = hauen')
    : '<b>Laufen:</b> Pfeiltasten oder WASD · <b>Hauen:</b> Leertaste oder J · <b>Pause:</b> Esc';
}

const SCHICHTEN = ['titel', 'haus', 'bilanz', 'pauseSchicht', 'hoehle', 'fund', 'figurWahl', 'begleiterWahl'];
let offen = null;
export function zeige(id) {
  // Geht aus dem Spiel heraus ein Fenster auf, verschwindet ein laufender Hinweis (sonst schwebt er darüber).
  // Wechsel zwischen Fenstern lassen ihn stehen – z. B. „Wuff! Waldi ist jetzt dabei“ nach dem Kauf.
  if (id && !offen) { $('toast').classList.remove('an'); clearTimeout(toastT); }
  offen = id;
  for (const s of SCHICHTEN) $(s).classList.toggle('versteckt', s !== id);
  $('hud').classList.toggle('versteckt', id === 'titel' || id === 'figurWahl');
}

// ---------- Titel ----------
export function zeigeTitel(hatStand) {
  $('btnStart').textContent = hatStand ? `Weiter – Tag ${S.tag}` : "Los geht's!";
  $('btnNeu').classList.toggle('versteckt', !hatStand);
  $('btnFigur').classList.toggle('versteckt', !S.figur);
  $('titelHeld').src = bildURL(G.kind.unten[0]);
  steuerHilfe();
  zeige('titel');
}

// ---------- Figur wählen ----------
// zweck: 'start' (vor dem ersten Tag) oder 'titel' (über „Figur ändern“)
export function zeigeFigur(zweck) {
  let art = S.figur ? S.figur.art : 'junge', farbe = S.figur ? S.figur.farbe : 'blau';
  const karten = [...document.querySelectorAll('.figur-karte')];
  const malen = () => {
    for (const k of karten) {
      k.querySelector('img').src = bildURL(figurVorschau(k.dataset.art, farbe));
      k.classList.toggle('gewaehlt', k.dataset.art === art);
    }
    for (const b of $('farben').children) b.classList.toggle('gewaehlt', b.dataset.farbe === farbe);
  };
  for (const k of karten) k.onclick = () => { art = k.dataset.art; malen(); };
  $('farben').innerHTML = '';
  for (const [id, f] of Object.entries(KLEIDER)) {
    const b = document.createElement('button');
    b.className = 'farbe'; b.dataset.farbe = id; b.title = f.name; b.setAttribute('aria-label', f.name);
    b.style.background = f.g;
    b.onclick = () => { farbe = id; malen(); };
    $('farben').append(b);
  }
  $('btnFigurOk').textContent = zweck === 'start' ? "Los geht's!" : 'Fertig';
  $('btnFigurOk').onclick = () => h.figurGewaehlt(art, farbe, zweck);
  malen();
  zeige('figurWahl');
  setTimeout(() => $('btnFigurOk').focus({ preventScroll: true }), 50);
}

// ---------- Anzeige oben ----------
let alt = {};
export function hud() {
  const p = S.sp, w = S.w;
  if (!p || !w) return;
  const herzKey = p.hp + '/' + w.maxHp;
  if (alt.herz !== herzKey) {
    alt.herz = herzKey;
    let s = '';
    for (let i = 0; i < w.maxHp; i++) s += px(i < p.hp ? G.herz : G.herzLeer);
    $('herzen').innerHTML = s;
  }
  if (alt.geld !== S.geld) { alt.geld = S.geld; $('geldZahl').textContent = zahl(S.geld); }
  const heute = S.heute ? S.heute.wert : 0;
  if (alt.heute !== heute) { alt.heute = heute; $('heuteZahl').textContent = heute ? `heute +${zahl(heute)}` : ''; }
  if (alt.tag !== S.tag) { alt.tag = S.tag; $('tagText').textContent = `Tag ${S.tag}`; }
  const bosse = S.st.bosse | 0, sz = S.schaetze || { tuerkis: 0, eis: 0 };
  const zeigT = bosse >= 2 || sz.tuerkis > 0, zeigE = bosse >= 3 || sz.eis > 0;
  const sk = `${zeigT}${zeigE}${sz.tuerkis}|${sz.eis}`;
  if (alt.schaetze !== sk) {
    alt.schaetze = sk;
    $('schaetze').classList.toggle('versteckt', !zeigT && !zeigE);
    $('schaetze').innerHTML = (zeigT ? `<span>${px(G.stein[SPEZIAL.tuerkis])}${sz.tuerkis}</span>` : '') + (zeigE ? `<span>${px(G.stein[SPEZIAL.eis])}${sz.eis}</span>` : '');
  }
  const imBerg = S.gebiet === 'berg' && S.ort === 'wald';
  $('kaelte').classList.toggle('versteckt', !imBerg);
  if (imBerg) {
    const q = Math.max(0, S.kaelte / S.w.kaelte);
    $('kaelteBalken').style.width = (q * 100).toFixed(0) + '%';
    $('kaelte').classList.toggle('kalt', q < 0.2);
  }
  const wk = S.wetter && S.ort === 'wald' ? S.wetter.art + S.wetter.richtung + S.gebiet : '';
  if (alt.wetter !== wk) {
    alt.wetter = wk;
    const w = S.wetter, a = $('wetterAnzeige');
    if (!w || S.ort !== 'wald' || w.art === 'sonne') a.innerHTML = '';
    else if (w.art === 'regen') a.innerHTML = S.gebiet === 'berg' ? 'Schnee' : 'Regen';
    else a.innerHTML = `Sturm <i class="windpfeil" style="transform: rotate(${Math.atan2(w.wind.y, w.wind.x)}rad)"></i>`;
  }
  const q = Math.min(1, S.zeit / S.dauer);
  $('sonne').style.left = (q * 100).toFixed(1) + '%';
  $('sonnenBahn').classList.toggle('spaet', q > 0.8);
  // Lebensleiste des Wächters
  const b = S.boss, bk = b ? b.name + '|' + b.hp : '';
  if (alt.boss !== bk) {
    alt.boss = bk;
    $('bossLeiste').classList.toggle('versteckt', !b);
    document.body.classList.toggle('kampf', !!b);
    if (b) { $('bossName').textContent = b.name; $('bossHp').style.width = (b.hp / b.max * 100).toFixed(1) + '%'; }
  }
}
export function hudNeu() { alt = {}; }

// ---------- Laden im Baumstumpf ----------
let hausModus = false;   // true = Tag ist vorbei, nächster Knopf startet einen neuen Tag
export function zeigeHaus(nachTag) {
  hausModus = nachTag;
  const spaet = !nachTag && S.zeit / S.dauer > 0.75;
  // Im Gebiet ist man im Unterschlupf statt im Baumstumpf
  const unterschlupf = !nachTag && S.gebiet !== 'wald' && S.ort === 'wald';
  document.querySelector('.hauspanel .kopf h2').textContent = unterschlupf ? (S.gebiet === 'berg' ? 'In der Berghütte' : 'Im Zelt') : 'Im alten Baumstumpf';
  const liegt = nachTag ? { anzahl: 0 } : liegenGeblieben();
  const warnung = liegt.anzahl
    ? ` Draußen liegen noch ${liegt.anzahl} ${liegt.anzahl === 1 ? 'Edelstein' : 'Edelsteine'}${liegt.wert ? ` (Wert ${zahl(liegt.wert)})` : ''} – wer jetzt schläft, lässt sie liegen!`
    : '';
  $('hausText').textContent = (nachTag
    ? 'Der Tag ist vorbei. Gib deine Diamanten aus – morgen wächst das Gras neu.'
    : spaet
      ? 'Gerade noch rechtzeitig daheim! Wer jetzt schlafen geht, behält alles in der Tasche. Draußen wird es gleich dunkel.'
      : 'Kurz verschnaufen. Draußen läuft die Zeit weiter, sobald du rausgehst. Vor Sonnenuntergang zurück sein!') + warnung;
  stubeStarten(nachTag);
  const k = $('hausKnoepfe');
  k.innerHTML = '';
  if (nachTag) {
    k.append(knopf(`Tag ${S.tag} beginnen ☀`, 'knopf gross', () => h.neuerTag()));
  } else if (spaet) {
    k.append(knopf('Schlafen gehen ☾', 'knopf gross', () => h.tagBeenden()));
    k.append(knopf('Noch mal raus', 'knopf grau', () => h.weiterMaehen()));
  } else {
    k.append(knopf('Weiter mähen', 'knopf gross', () => h.weiterMaehen()));
    k.append(knopf('Schlafen gehen', 'knopf grau', () => h.tagBeenden()));
  }
  waren();
  zeige('haus');
  setTimeout(() => k.querySelector('button')?.focus({ preventScroll: true }), 50);
}

// Stubenbild oben im Laden: drei Bilder im Wechsel, damit das Feuer flackert
let stubeUhr = null;
function stubeStarten(nacht) {
  const cv = $('stubeBild'), g = cv.getContext('2d');
  const tier = S.begleiter ? tierSchlafend(S.begleiter.art, S.begleiter.rasse) : null;
  const bilder = stubenBilder(tier, nacht, G.kind.unten[0]);
  let i = 0;
  const malen = () => { g.clearRect(0, 0, cv.width, cv.height); g.drawImage(bilder[i], 0, 0); i = (i + 1) % bilder.length; };
  malen();
  clearInterval(stubeUhr);
  stubeUhr = setInterval(() => {
    if ($('haus').classList.contains('versteckt')) { clearInterval(stubeUhr); return; }
    malen();
  }, 230);
}

function knopf(text, cls, fn) {
  const b = document.createElement('button');
  b.className = cls; b.textContent = text; b.onclick = fn;
  return b;
}

function waren() {
  $('hausGeld').innerHTML = `${px(G.waehrung)}<span>${zahl(S.geld)}</span>`;
  const box = $('waren');
  box.innerHTML = '';
  for (const a of AUFRUESTUNGEN) {
    if (a.ab && (S.st.bosse | 0) < a.ab) continue;     // Fackel/Daunenjacke erst, wenn das Gebiet frei ist
    const stufe = S.st[a.id] | 0, max = a.kosten.length, voll = stufe >= max, preis = voll ? 0 : a.kosten[stufe];
    const icon = a.id === 'klinge' ? G.icons.klinge[Math.min(stufe + (voll ? 0 : 1), 5)] : G.icons[a.id];
    const name = a.id === 'klinge' ? (voll ? a.stufen[stufe] : a.stufen[stufe + 1]) : a.name;
    const unter = a.id === 'klinge' ? `Jetzt: ${a.stufen[stufe]}` : '';
    let punkte = '';
    for (let i = 0; i < max; i++) punkte += `<i class="${i < stufe ? 'an' : ''}"></i>`;
    const d = document.createElement('div');
    d.className = 'ware' + (voll ? ' voll' : '');
    d.dataset.id = a.id;
    d.innerHTML = `
      <div class="ware-bild">${px(icon)}</div>
      <div class="ware-text">
        <div class="ware-name">${name}</div>
        ${unter ? `<div class="ware-unter">${unter}</div>` : ''}
        <div class="ware-info">${a.text}</div>
        <div class="punkte">${punkte}</div>
      </div>`;
    const b = document.createElement('button');
    b.className = 'knopf preis';
    if (voll) { b.textContent = 'Fertig'; b.disabled = true; }
    else {
      b.innerHTML = `${px(G.waehrung)}${zahl(preis)}`;
      b.disabled = S.geld < preis;
      b.onclick = () => { if (h.kaufen(a.id, preis)) { waren(); aufleuchten(a.id); } };
    }
    d.append(b);
    box.append(d);
  }
  box.append(begleiterKarte());
  if (S.begleiter) box.append(tauschKarte());
}

function tauschKarte() {
  const d = document.createElement('div');
  d.className = 'ware begleiter';
  d.innerHTML = `
    <div class="ware-bild">${px(tierIcon(S.begleiter.art === 'katze' ? 'hund' : 'katze', S.begleiter.art === 'katze' ? 'spitz' : 'tiger'))}</div>
    <div class="ware-text">
      <div class="ware-name">Begleiter tauschen</div>
      <div class="ware-info">Kostet jedes Mal. Leckerli bleiben.</div>
    </div>`;
  const b = document.createElement('button');
  b.className = 'knopf preis grau';
  b.innerHTML = `${px(G.waehrung)}${zahl(TAUSCH_PREIS)}`;
  b.disabled = S.geld < TAUSCH_PREIS;
  b.onclick = () => zeigeBegleiterWahl();
  d.append(b);
  return d;
}

// Gerade Gekauftes kurz aufleuchten lassen (die Liste wird beim Kauf neu gebaut)
function aufleuchten(id) {
  const k = document.querySelector(`#waren .ware[data-id="${id}"]`);
  if (k) k.classList.add('gekauft');
}

// ---------- Begleiter im Laden ----------
function begleiterKarte() {
  const d = document.createElement('div');
  d.className = 'ware begleiter';
  d.dataset.id = 'leckerli';
  const b = document.createElement('button');
  b.className = 'knopf preis';
  if (!S.begleiter) {
    d.innerHTML = `
      <div class="ware-bild">${px(tierIcon('hund', 'dackel'))}</div>
      <div class="ware-text">
        <div class="ware-name">Begleiter</div>
        <div class="ware-unter">Hund oder Katze</div>
        <div class="ware-info">Läuft mit und buddelt Diamanten aus.</div>
      </div>`;
    b.innerHTML = `${px(G.waehrung)}${zahl(BEGLEITER_PREIS)}`;
    b.disabled = S.geld < BEGLEITER_PREIS;
    b.onclick = () => zeigeBegleiterWahl();
  } else {
    const { art, rasse } = S.begleiter, lv = S.st.leckerli | 0, voll = lv >= LECKERLI_KOSTEN.length;
    let punkte = '';
    for (let i = 0; i < LECKERLI_KOSTEN.length; i++) punkte += `<i class="${i < lv ? 'an' : ''}"></i>`;
    d.innerHTML = `
      <div class="ware-bild">${px(tierIcon(art, rasse))}</div>
      <div class="ware-text">
        <div class="ware-name">Leckerli</div>
        <div class="ware-unter tiername-zeile">für ${tierName()} <button class="knopf grau mini" data-umbenennen>✎ Name</button></div>
        <div class="ware-info">Buddelt öfter und besser.</div>
        <div class="punkte">${punkte}</div>
      </div>`;
    // Namen ändern direkt in der Karte
    d.querySelector('[data-umbenennen]').onclick = () => {
      const zeile = d.querySelector('.tiername-zeile');
      zeile.innerHTML = `<input class="namefeld" maxlength="14" value="${tierName()}"> <button class="knopf mini">OK</button>`;
      const feld = zeile.querySelector('input');
      const fertig = () => { const n = nameSauber(feld.value); if (n) h.begleiterBenennen(n); waren(); };
      zeile.querySelector('button').onclick = fertig;
      feld.onkeydown = (e) => { if (e.key === 'Enter') fertig(); };
      feld.focus(); feld.select();
    };
    if (voll) { b.textContent = 'Fertig'; b.disabled = true; }
    else {
      const preis = LECKERLI_KOSTEN[lv];
      b.innerHTML = `${px(G.waehrung)}${zahl(preis)}`;
      b.disabled = S.geld < preis;
      b.onclick = () => { if (h.kaufen('leckerli', preis)) { waren(); aufleuchten('leckerli'); } };
    }
  }
  d.append(b);
  return d;
}

export function zeigeBegleiterWahl() {
  let wahl = null;
  const ok = $('btnBegleiterOk');
  const karten = [];
  const jetzt = S.begleiter, preis = jetzt ? TAUSCH_PREIS : BEGLEITER_PREIS;
  document.querySelector('.begleiterpanel h2').textContent = jetzt ? `Wen nimmst du statt ${tierName()} mit?` : 'Wer soll mitkommen?';
  const feld = $('tierName');
  let eigenerName = false;           // hat man selbst getippt, bleibt der Name beim Umklicken stehen
  feld.value = ''; feld.oninput = () => { eigenerName = feld.value.trim() !== ''; };
  $('begleiterHinweis').innerHTML = jetzt
    ? `<b>Tauschen kostet ${zahl(TAUSCH_PREIS)} Diamanten.</b> Die Leckerli-Stufe bleibt.`
    : `Später tauschen geht auch – kostet dann aber jedes Mal ${zahl(TAUSCH_PREIS)} Diamanten.`;
  for (const [art, box] of [['hund', $('wahlHunde')], ['katze', $('wahlKatzen')]]) {
    box.innerHTML = '';
    for (const [id, r] of Object.entries(RASSEN[art])) {
      const k = document.createElement('button');
      k.className = 'tier-karte';
      const dabei = jetzt && jetzt.art === art && jetzt.rasse === id;
      k.innerHTML = `${px(tierIcon(art, id))}<span>${r.name}${dabei ? '<br><small>ist dabei</small>' : ''}</span>`;
      if (dabei) { k.disabled = true; k.classList.add('dabei'); }
      k.onclick = () => {
        wahl = { art, rasse: id };
        karten.forEach(x => x.classList.toggle('gewaehlt', x === k));
        ok.disabled = false;
        if (!eigenerName) feld.value = NAMEN[id] || '';
        ok.innerHTML = `${r.name} mitnehmen ${px(G.waehrung)}${zahl(preis)}`;
        ok.disabled = S.geld < preis;
      };
      karten.push(k); box.append(k);
    }
  }
  ok.disabled = true; ok.textContent = 'Erst eins aussuchen';
  ok.onclick = () => {
    if (!wahl) return;
    const name = nameSauber(feld.value) || NAMEN[wahl.rasse];
    if (h.begleiterKaufen(wahl.art, wahl.rasse, preis, name)) zeigeHaus(hausModus);
  };
  $('btnBegleiterZurueck').onclick = () => zeigeHaus(hausModus);
  zeige('begleiterWahl');
}

// ---------- Glitzerhöhle ----------
const BELOHNUNGS_BILD = ['herz', 'fackel', 'steigeisen', 'schliff', 'riesendiamant'];
export function zeigeHoehle() {
  $('hoehleGeld').innerHTML = `${px(G.waehrung)}<span>${zahl(S.geld)}</span>`;
  const box = $('kammern');
  box.innerHTML = '';
  const tueren = S.st.tueren | 0, bosse = S.st.bosse | 0;
  KAMMERN.forEach((k, i) => {
    const nr = i + 1, besiegt = bosse >= nr, offen = tueren >= nr, dran = !offen && tueren === nr - 1 && bosse >= nr - 1;
    const d = document.createElement('div');
    d.className = 'ware kammer' + (besiegt ? ' besiegt' : !offen && !dran ? ' zu' : '');
    const bild = besiegt ? G.belohnung[BELOHNUNGS_BILD[i]] : offen || dran ? G.boss[k.art].l[0] : G.icons.schloss;
    d.innerHTML = `
      <div class="ware-bild">${px(bild)}</div>
      <div class="ware-text">
        <div class="ware-name">${nr}. ${k.name}</div>
        <div class="ware-unter">${offen || dran || besiegt ? 'Wächter: ' + k.boss : 'Noch verschlossen'}</div>
        <div class="beute">${besiegt ? '✓ Besiegt – ' + k.beute : 'Belohnung: ???'}</div>
      </div>`;
    const b = document.createElement('button');
    b.className = 'knopf preis';
    if (besiegt) { b.textContent = 'Besiegt'; b.disabled = true; }
    else if (offen) { b.textContent = 'Kämpfen!'; b.onclick = () => h.kaempfen(nr); }
    else if (dran) {
      const br = k.brauche || {};
      const extra = Object.entries(br).map(([art, n]) => `<span class="brauche">+ ${px(G.stein[SPEZIAL[art]])}${n}</span>`).join('');
      b.innerHTML = `Tür öffnen ${px(G.waehrung)}${zahl(k.preis)}${extra}`;
      b.disabled = S.geld < k.preis || Object.entries(br).some(([art, n]) => ((S.schaetze || {})[art] | 0) < n);
      b.onclick = () => { if (h.tuerOeffnen(nr)) zeigeHoehle(); };
    } else { b.textContent = `Erst Kammer ${nr - 1}`; b.disabled = true; }
    d.append(b);
    box.append(d);
  });
  zeige('hoehle');
  setTimeout(() => box.querySelector('button:not(:disabled)')?.focus({ preventScroll: true }), 50);
}

export function zeigeFund(nr) {
  const k = KAMMERN[nr - 1];
  $('fundBild').src = bildURL(G.belohnung[BELOHNUNGS_BILD[nr - 1]]);
  $('fundTitel').textContent = nr === 5 ? 'Gewonnen!' : k.beute;
  const panel = document.querySelector('.fundpanel');
  panel.classList.toggle('sieg', nr === 5);
  if (nr === 5) {
    const g = S.gesamt;
    $('fundText').innerHTML = `
      <p><b>Der Riesendiamant gehört dir!</b> Alle fünf Wächter der Glitzerhöhle sind besiegt.</p>
      <div class="zahlen">
        <div><b>${zahl(S.tag)}</b><span>Tage</span></div>
        <div><b>${zahl(g.gemaeht + (S.heute ? S.heute.gemaeht : 0))}</b><span>Büschel gemäht</span></div>
      </div>
      <p class="hilfe">Du kannst einfach weiterspielen – das Gras wächst jeden Morgen neu.</p>`;
    $('btnFund').textContent = 'Weiterspielen';
  } else {
    $('fundText').innerHTML = `<p>${k.boss} ist besiegt!</p><p>${k.beuteText}</p>
      <p class="hilfe">Sammel die Diamanten ein – dann geht die Tür unten auf.</p>`;
    $('btnFund').textContent = 'Weiter';
  }
  zeige('fund');
  setTimeout(() => $('btnFund').focus({ preventScroll: true }), 50);
}

// ---------- Tagesbilanz ----------
export function zeigeBilanz({ grund, heute, verlust, tag, kammer, liegen }) {
  const titel = grund === 'ohnmacht' && kammer ? `${KAMMERN[kammer - 1].boss} war zu stark …` : grund === 'ohnmacht' ? 'Uff … umgekippt!'
    : grund === 'heim' ? `Tag ${tag}: gut heimgekommen` : 'Zu spät – stockdunkel!';
  $('bilanzTitel').textContent = titel;
  let steine = '';
  STEINE.forEach((s, i) => {
    if (!heute.steine[i]) return;
    steine += `<div class="stein-zeile">${px(G.stein[i])}<span>${heute.steine[i]} × ${s.name}</span><b>${s.spezial ? 'für die Höhle' : zahl(heute.steine[i] * s.wert)}</b></div>`;
  });
  if (!steine) steine = '<p class="leer">Heute keinen einzigen Diamanten gefunden.</p>';
  $('bilanzInhalt').innerHTML = `
    <div class="zahlen">
      <div><b>${zahl(heute.gemaeht)}</b><span>Büschel gemäht</span></div>
      <div><b>${zahl(heute.besiegt)}</b><span>Plagegeister verjagt</span></div>
    </div>
    <div class="steine">${steine}</div>
    <div class="summe">Zusammen ${px(G.waehrung)} <b>${zahl(heute.wert)}</b></div>
    ${verlust ? `<p class="verlust">${grund === 'abend'
      ? 'Im Dunkeln über Wurzeln gestolpert – die Hälfte ist aus der Tasche gekullert'
      : 'Beim Umkippen ist die Hälfte davon aus der Tasche gekullert'}: −${zahl(verlust)}</p>` : ''}
    ${liegen && liegen.anzahl ? `<p class="verlust">Liegen geblieben: ${liegen.anzahl} ${liegen.anzahl === 1 ? 'Edelstein' : 'Edelsteine'}${liegen.wert ? ` (Wert ${zahl(liegen.wert)})` : ''} – die findet keiner mehr.</p>` : ''}
    ${grund === 'abend' ? '<p class="hilfe">Nächstes Mal vor Sonnenuntergang in den Baumstumpf und „Schlafen gehen“ – dann bleibt alles.</p>' : ''}
    ${kammer ? '<p class="hilfe">Die Tür bleibt offen – morgen kannst du es noch mal versuchen. Vielleicht mit einer besseren Klinge?</p>' : ''}
  `;
  // Nach „Schlafen gehen“ steht die Bilanz auf dem schwarzen Nachtbild, und es geht direkt in den Morgen
  const nachts = grund === 'heim';
  $('bilanz').classList.toggle('nachts', nachts);
  $('btnBilanz').textContent = nachts ? 'Aufstehen ☀' : 'Ab in den Baumstumpf';
  if (nachts) { $('nacht').querySelector('span').textContent = ''; $('toast').classList.remove('an'); }
  zeige('bilanz');
  setTimeout(() => $('btnBilanz').focus({ preventScroll: true }), 50);
}

export function zeigePause() { tonKnopf(); zeige('pauseSchicht'); }

// ---------- Nacht: kurz schwarz, in der Mitte passiert der Tageswechsel ----------
let nachtLaeuft = false;
export function nachtUebergang(mitte) {
  nachtAn(() => { mitte(); setTimeout(nachtAus, 450); });
}
// Einzeln: schwarz werden (mit „Gute Nacht“), dann mitte(); später nachtAus() blendet wieder auf
export function nachtAn(mitte, text = '☾ Gute Nacht …') {
  if (nachtLaeuft) return;
  nachtLaeuft = true;
  const n = $('nacht');
  n.querySelector('span').textContent = text;
  n.classList.add('an');
  setTimeout(mitte, 650);
}
export function nachtAus() { $('nacht').classList.remove('an'); nachtLaeuft = false; }

// ---------- Kurze Hinweise ----------
let toastT = null;
export function toast(text, ms = 3200) {
  const t = $('toast');
  // Unter die linke Anzeige rutschen, wenn sie in die Bildmitte reicht (schmale Handys)
  const links = document.querySelector('.hud-links');
  let oben = '';                                          // leer = Platz aus style.css
  if (links && !$('hud').classList.contains('versteckt')) {
    const r = links.getBoundingClientRect(), breite = Math.min(innerWidth * 0.9, 460);
    if (r.right > (innerWidth - breite) / 2 - 4 && r.bottom + 8 > 74) oben = Math.round(r.bottom + 8) + 'px';
  }
  t.style.top = oben;
  t.textContent = text; t.classList.add('an');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('an'), ms);
}
