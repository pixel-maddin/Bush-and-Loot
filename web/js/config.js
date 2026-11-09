// config.js – alle Balance-Werte an einer Stelle.
// Wer am Spielgefühl drehen will, dreht hier.

export const KACHEL = 16;          // Weltpixel je Kachel
export const KARTE_B = 44;         // Kacheln
export const KARTE_H = 44;
export const SICHT_KACHELN = 11;   // so viele Kacheln passen mindestens auf die kürzere Bildschirmseite

// Diamanten: Farbe bestimmt den Wert.
// farben = [hell, mittel, dunkel]
export const STEINE = [
  { name: 'Grün', wert: 1,   farben: ['#d4ffb8', '#5fd35a', '#23853f'] },
  { name: 'Blau', wert: 5,   farben: ['#d2f0ff', '#4aa3f5', '#2252b8'] },
  { name: 'Rot',  wert: 20,  farben: ['#ffd0cf', '#f04f5a', '#9a1d3b'] },
  { name: 'Lila', wert: 60,  farben: ['#f6d4ff', '#bb62ee', '#6a2aa0'] },
  { name: 'Gold', wert: 200, farben: ['#fffbd0', '#ffd23f', '#c27512'] },
];
// Grundgewichte beim Auswürfeln der Farbe (vor Glücksklee)
export const STEIN_GEWICHT = [100, 20, 4, 0.8, 0.12];

// Grasarten. fund = Chance auf einen Diamanten, beste = teuerste Farbe, die drinstecken kann
export const BUESCHEL = [
  { id: 'gras',   name: 'Grasbüschel', hp: 1, fund: 0.15, beste: 1 },
  { id: 'hoch',   name: 'Hohes Gras',  hp: 2, fund: 0.22, beste: 2 },
  { id: 'bluete', name: 'Blütenbusch', hp: 4, fund: 0.42, beste: 3 },
  { id: 'dorn',   name: 'Dornenbusch', hp: 8, fund: 0.70, beste: 4 },
];
// Mischung der Grasarten je Tag. Seltene Arten wachsen weiter weg vom Baumstumpf häufiger (spiel.js).
export function bueschelGewichte(tag) {
  return [
    1,
    Math.min(0.9, 0.25 + 0.06 * tag),
    tag >= 3 ? Math.min(0.5, 0.08 + 0.05 * (tag - 3)) : 0,
    tag >= 5 ? Math.min(0.35, 0.05 + 0.04 * (tag - 5)) : 0,
  ];
}
export const GRAS_DICHTE = 0.62;

export const GEGNER = {
  schnecke: { name: 'Moosschnecke', hp: 2, tempo: 13, schaden: 1, beute: 0.5 },
  hummel:   { name: 'Brummhummel',  hp: 1, tempo: 46, schaden: 1, beute: 0.4 },
  pilz:     { name: 'Hüpfpilz',     hp: 4, tempo: 58, schaden: 1, beute: 0.8 },
};
export function gegnerMax(tag) { return Math.min(16, 2 + Math.floor(tag * 1.3)); }
export function gegnerArten(tag) {
  const a = ['schnecke'];
  if (tag >= 2) a.push('hummel', 'hummel');
  if (tag >= 4) a.push('pilz', 'pilz');
  return a;
}

// Der Laden im Baumstumpf. kosten[i] = Preis für Stufe i+1.
export const AUFRUESTUNGEN = [
  { id: 'klinge', name: 'Klinge',
    stufen: ['Holzschwert', 'Kurzschwert', 'Eisenschwert', 'Breitschwert', 'Mondsichel', 'Sternenklinge'],
    kosten: [30, 140, 450, 1300, 3600],
    text: 'Mehr Schaden, längere Klinge, breiterer Schwung.' },
  { id: 'schwung', name: 'Schwungkraft',   kosten: [20, 70, 200, 550, 1400],  text: 'Schneller zuschlagen.' },
  { id: 'stiefel', name: 'Flinke Stiefel', kosten: [15, 55, 170, 450, 1100],  text: 'Schneller laufen.' },
  { id: 'herz',    name: 'Herzbeere',      kosten: [40, 130, 350, 800, 1800], text: 'Ein Herz mehr.' },
  { id: 'magnet',  name: 'Elsternfeder',   kosten: [25, 90, 260, 650],        text: 'Diamanten fliegen von weiter her zu dir.' },
  { id: 'sonne',   name: 'Sonnenuhr',      kosten: [50, 160, 420, 950],       text: 'Der Tag dauert 15 Sekunden länger.' },
  { id: 'klee',    name: 'Glücksklee',     kosten: [60, 220, 650, 1600, 4000], text: 'Öfter Diamanten, öfter seltene Farben.' },
  { id: 'wirbel',  name: 'Wirbelschlag',   kosten: [250],                     text: 'Hauen gedrückt halten, dann loslassen: Rundumschlag.' },
];

export const KLINGE = {
  schaden:    [1, 2, 3, 5, 7, 10],
  reichweite: [15, 18, 21, 24, 28, 32],
  bogenGrad:  [95, 115, 135, 155, 175, 200],
};

// Aus den gekauften Stufen die Spielwerte ableiten
export function werte(st) {
  const k = st.klinge | 0;
  return {
    schaden: KLINGE.schaden[k],
    reichweite: KLINGE.reichweite[k],
    bogen: KLINGE.bogenGrad[k] * Math.PI / 180,
    abklingen: 0.42 - 0.055 * (st.schwung | 0),
    tempo: 62 + 11 * (st.stiefel | 0),
    maxHp: 3 + (st.herz | 0),
    magnet: 14 + 14 * (st.magnet | 0),
    tagDauer: 70 + 15 * (st.sonne | 0),
    glueck: st.klee | 0,
    wirbel: (st.wirbel | 0) > 0,
  };
}

export const LADEZEIT = 0.5;   // so lange halten bis zum Wirbelschlag
