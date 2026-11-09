// ui.js – Alles, was als HTML über dem Spielbild liegt: Anzeige oben, Titel, Laden, Tagesbilanz, Pause.

import { G, bildURL } from './grafik.js';
import { AUFRUESTUNGEN, STEINE } from './config.js';
import { S } from './spiel.js';
import { istStumm, setzeStumm } from './ton.js';
import { istMusikAn, setzeMusik } from './musik.js';
import { touchGeraet } from './eingabe.js';

const $ = (id) => document.getElementById(id);
let h = {};
const zahl = (n) => n.toLocaleString('de-DE');
const px = (c, cls = '') => `<img class="px ${cls}" src="${bildURL(c)}" alt="">`;

export function initUI(handler) {
  h = handler;
  $('geldIcon').src = bildURL(G.waehrung);
  $('btnStart').onclick = () => h.start();
  $('btnNeu').onclick = () => {
    if (confirm('Wirklich von vorn anfangen? Alle Diamanten und Waffen sind dann weg.')) h.neu();
  };
  $('btnPause').onclick = () => h.pause();
  $('btnWeiter').onclick = () => h.pause();
  $('btnTon').onclick = () => { setzeStumm(!istStumm()); tonKnopf(); };
  $('btnMusik').onclick = () => { setzeMusik(!istMusikAn()); tonKnopf(); };
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
  tonKnopf();
  steuerHilfe();
}

function tonKnopf() {
  $('btnTon').textContent = istStumm() ? 'Ton: aus' : 'Ton: an';
  $('btnMusik').textContent = istMusikAn() ? 'Musik: an' : 'Musik: aus';
  $('btnMusik').disabled = istStumm();     // ohne Ton keine Musik
}

export function steuerHilfe() {
  $('steuerHilfe').innerHTML = touchGeraet
    ? '<b>Handy:</b> Links ziehen = laufen · rechts tippen = hauen'
    : '<b>Laufen:</b> Pfeiltasten oder WASD · <b>Hauen:</b> Leertaste oder J · <b>Pause:</b> Esc';
}

const SCHICHTEN = ['titel', 'haus', 'bilanz', 'pauseSchicht'];
export function zeige(id) {
  for (const s of SCHICHTEN) $(s).classList.toggle('versteckt', s !== id);
  $('hud').classList.toggle('versteckt', id === 'titel');
}

// ---------- Titel ----------
export function zeigeTitel(hatStand) {
  $('btnStart').textContent = hatStand ? `Weiter – Tag ${S.tag}` : "Los geht's!";
  $('btnNeu').classList.toggle('versteckt', !hatStand);
  $('titelHeld').src = bildURL(G.kind.unten[0]);
  steuerHilfe();
  zeige('titel');
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
  const q = Math.min(1, S.zeit / S.dauer);
  $('sonne').style.left = (q * 100).toFixed(1) + '%';
  $('sonnenBahn').classList.toggle('spaet', q > 0.8);
}
export function hudNeu() { alt = {}; }

// ---------- Laden im Baumstumpf ----------
let hausModus = false;   // true = Tag ist vorbei, nächster Knopf startet einen neuen Tag
export function zeigeHaus(nachTag) {
  hausModus = nachTag;
  $('hausText').textContent = nachTag
    ? 'Der Tag ist vorbei. Gib deine Diamanten aus – morgen wächst das Gras neu.'
    : 'Kurz verschnaufen. Draußen läuft die Zeit weiter, sobald du rausgehst.';
  const k = $('hausKnoepfe');
  k.innerHTML = '';
  if (nachTag) {
    k.append(knopf(`Tag ${S.tag} beginnen ☀`, 'knopf gross', () => h.neuerTag()));
  } else {
    k.append(knopf('Weiter mähen', 'knopf gross', () => h.weiterMaehen()));
    k.append(knopf('Schlafen gehen', 'knopf grau', () => h.tagBeenden()));
  }
  waren();
  zeige('haus');
  setTimeout(() => k.querySelector('button')?.focus({ preventScroll: true }), 50);
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
    const stufe = S.st[a.id] | 0, max = a.kosten.length, voll = stufe >= max, preis = voll ? 0 : a.kosten[stufe];
    const icon = a.id === 'klinge' ? G.icons.klinge[Math.min(stufe + (voll ? 0 : 1), 5)] : G.icons[a.id];
    const name = a.id === 'klinge' ? (voll ? a.stufen[stufe] : a.stufen[stufe + 1]) : a.name;
    const unter = a.id === 'klinge' ? `Jetzt: ${a.stufen[stufe]}` : '';
    let punkte = '';
    for (let i = 0; i < max; i++) punkte += `<i class="${i < stufe ? 'an' : ''}"></i>`;
    const d = document.createElement('div');
    d.className = 'ware' + (voll ? ' voll' : '');
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
      b.onclick = () => { if (h.kaufen(a.id, preis)) { waren(); d.classList.add('gekauft'); } };
    }
    d.append(b);
    box.append(d);
  }
  // Was gerade gekauft wurde, kurz aufleuchten lassen
}

// ---------- Tagesbilanz ----------
export function zeigeBilanz({ grund, heute, verlust, tag }) {
  const titel = grund === 'ohnmacht' ? 'Uff … umgekippt!' : grund === 'heim' ? `Tag ${tag}: früh ins Bett` : `Tag ${tag} ist vorbei`;
  $('bilanzTitel').textContent = titel;
  let steine = '';
  STEINE.forEach((s, i) => {
    if (!heute.steine[i]) return;
    steine += `<div class="stein-zeile">${px(G.stein[i])}<span>${heute.steine[i]} × ${s.name}</span><b>${zahl(heute.steine[i] * s.wert)}</b></div>`;
  });
  if (!steine) steine = '<p class="leer">Heute keinen einzigen Diamanten gefunden.</p>';
  $('bilanzInhalt').innerHTML = `
    <div class="zahlen">
      <div><b>${zahl(heute.gemaeht)}</b><span>Büschel gemäht</span></div>
      <div><b>${zahl(heute.besiegt)}</b><span>Plagegeister verjagt</span></div>
    </div>
    <div class="steine">${steine}</div>
    <div class="summe">Zusammen ${px(G.waehrung)} <b>${zahl(heute.wert)}</b></div>
    ${verlust ? `<p class="verlust">Beim Umkippen ist die Hälfte davon aus der Tasche gekullert: −${zahl(verlust)}</p>` : ''}
  `;
  zeige('bilanz');
  setTimeout(() => $('btnBilanz').focus({ preventScroll: true }), 50);
}

export function zeigePause() { zeige('pauseSchicht'); }

// ---------- Kurze Hinweise ----------
let toastT = null;
export function toast(text, ms = 3200) {
  const t = $('toast');
  t.textContent = text; t.classList.add('an');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('an'), ms);
}
