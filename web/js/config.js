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
  // Besondere Steine der neuen Gebiete: kein Diamantwert, sondern Schlüssel für die späteren Höhlentüren
  { name: 'Türkis',     wert: 0, farben: ['#e0fffb', '#3ee8d0', '#138a8a'], spezial: 'tuerkis' },   // Dunkelwald, leuchtet
  { name: 'Eiskristall', wert: 0, farben: ['#ffffff', '#bfe9ff', '#5aa0d8'], spezial: 'eis' },      // Gebirge
];
export const SPEZIAL = { tuerkis: 5, eis: 6 };      // Index in STEINE
// Grundgewichte beim Auswürfeln der Farbe (vor Glücksklee)
export const STEIN_GEWICHT = [100, 20, 4, 0.8, 0.12];

// Gebiete: der Startwald und die beiden freispielbaren Welten (Portale an den Wegenden im Wald)
//   ab      = so viele Wächter müssen besiegt sein, damit das Portal erwacht
//   spezial = wie oft ein Fund dort der besondere Stein ist
export const GEBIETE = {
  wald:   { name: 'Wald' },
  dunkel: { name: 'Dunkelwald', ab: 2, spezial: 0.13, gewichte: [1, 0.8, 0.45, 0.25] },
  berg:   { name: 'Gebirge',    ab: 3, spezial: 0.12, gewichte: [1, 0.7, 0.4, 0.35] },
};
export const GEBIET_KARTE = 36;     // Kacheln je Seite der neuen Gebiete

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
  motte:    { name: 'Mottenkind',   hp: 2, tempo: 42, schaden: 1, beute: 0.5 },   // nur bei der Riesenmotte
  blob:     { name: 'Riesenblob',   hp: 6, tempo: 16, schaden: 1, beute: 0.9 },   // nur bei Regen, zerfällt in zwei Blobchen
  blobchen: { name: 'Blobchen',     hp: 1, tempo: 30, schaden: 1, beute: 0.3 },
  fledermaus:  { name: 'Fledermaus',  hp: 2, tempo: 56, schaden: 1, beute: 0.6 },   // Dunkelwald, fliegt wie die Hummel
  schneekugel: { name: 'Schneekugel', hp: 3, tempo: 52, schaden: 1, beute: 0.7 },   // Gebirge, hüpft wie der Pilz
  kueken:   { name: 'Küken',        hp: 1, tempo: 50, schaden: 1, beute: 0.4 },   // nur bei der Riesenente (hüpft wie der Pilz)
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
    text: 'Mehr Schaden und Reichweite.' },
  { id: 'schwung', name: 'Schwungkraft',   kosten: [20, 70, 200, 550, 1400],  text: 'Schneller zuschlagen.' },
  { id: 'stiefel', name: 'Flinke Stiefel', kosten: [15, 55, 170, 450, 1100],  text: 'Schneller laufen.' },
  { id: 'herz',    name: 'Herzbeere',      kosten: [40, 130, 350, 800, 1800], text: 'Ein Herz mehr.' },
  { id: 'magnet',  name: 'Elsternfeder',   kosten: [25, 90, 260, 650],        text: 'Diamanten fliegen von weiter her.' },
  { id: 'sonne',   name: 'Sonnenuhr',      kosten: [50, 160, 420, 950],       text: 'Der Tag dauert 15 s länger.' },
  { id: 'klee',    name: 'Glücksklee',     kosten: [60, 220, 650, 1600, 4000], text: 'Öfter Diamanten und seltene Farben.' },
  { id: 'wirbel',  name: 'Wirbelschlag',   kosten: [250],                     text: 'Halten, loslassen: Rundumschlag.' },
  { id: 'fackel',  name: 'Fackel',         kosten: [250, 700, 1800],          text: 'Größerer Lichtkreis im Dunkelwald.', ab: 2 },
  { id: 'jacke',   name: 'Daunenjacke',    kosten: [400, 1100, 2600],         text: 'Länger warm im Gebirge.', ab: 3 },
];

// Stube einrichten: reine Schmuckstücke, die oben im Stubenbild erscheinen (gekauft = S.st['moebel_' + id])
export const EINRICHTUNG = [
  { id: 'pflanze', name: 'Zimmerpflanze',     preis: 400,   text: 'Ein großes grünes Blatt-Wunder neben dem Bett.' },
  { id: 'bild',    name: 'Gemälde',           preis: 900,   text: 'Der Wald bei Sonnenuntergang, über dem Bett.' },
  { id: 'korb',    name: 'Kuschelkorb',       preis: 1500,  text: 'Ein weiches Körbchen für deinen Begleiter.' },
  { id: 'teppich', name: 'Regenbogenteppich', preis: 2500,  text: 'Bunter als der alte – und flauschiger.' },
  { id: 'uhr',     name: 'Kuckucksuhr',       preis: 4000,  text: 'Tickt gemütlich an der Wand.' },
  { id: 'lichter', name: 'Lichterkette',      preis: 7000,  text: 'Bunte Lichter unter der Decke.' },
  { id: 'leuchter', name: 'Goldleuchter',     preis: 15000, text: 'Ein goldener Kronleuchter statt der Laterne.' },
];

// Hüte mit Boni: einer wird getragen (S.st.hut), gekauft = S.st['hut_' + id]. Eichelhut ist der Standard.
export const HUETE = [
  { id: 'eichel',  name: 'Eichelhut',        preis: 0,     bonus: 'Dein treuer alter Hut.' },
  { id: 'stroh',   name: 'Strohhut',         preis: 600,   bonus: 'Der Tag dauert 10 s länger.' },
  { id: 'feder',   name: 'Federhut',         preis: 900,   bonus: 'Diamanten fliegen von weiter her.' },
  { id: 'klee',    name: 'Kleeblattmütze',   preis: 1500,  bonus: 'Mehr Glück: öfter seltene Farben.' },
  { id: 'laterne', name: 'Laternenhelm',     preis: 2200,  bonus: 'Größerer Lichtkreis im Dunkelwald.', ab: 2 },
  { id: 'pudel',   name: 'Pudelmütze',       preis: 2400,  bonus: 'Im Gebirge 15 s länger warm.', ab: 3 },
  { id: 'ritter',  name: 'Ritterhelm',       preis: 6000,  bonus: 'Ein Herz mehr.' },
  { id: 'krone',   name: 'Goldkrone',        preis: 15000, bonus: 'Jeder Diamant ist 10 % mehr wert.' },
];

export const KLINGE = {
  schaden:    [1, 2, 3, 5, 7, 10],
  reichweite: [15, 18, 21, 24, 28, 32],
  bogenGrad:  [95, 115, 135, 155, 175, 200],
};

// Die Glitzerhöhle: fünf Kammern hinter verschlossenen Türen, in jeder ein Wächter.
// preis = Diamantwert fürs Öffnen der Tür, hp = Lebenspunkte des Wächters,
// schatz = Diamanten, die er fallen lässt (Anzahl je Farbe Grün, Blau, Rot, Lila, Gold).
// Fortschritt steht in S.st.tueren (geöffnet) und S.st.bosse (besiegt) – also im normalen Spielstand.
export const KAMMERN = [
  { name: 'Teichgrotte',   boss: 'Riesenente',     art: 'ente',     preis: 100,  hp: 28,  schaden: 1,
    schatz: [10, 6, 2, 0, 0],  belohnung: 'herz',
    beute: 'Goldenes Herz', beuteText: 'Du hast jetzt für immer ein Herz mehr.' },
  { name: 'Wabenkammer',   boss: 'Hummelkönigin',  art: 'koenigin', preis: 350,  hp: 40,  schaden: 1,
    schatz: [10, 10, 6, 1, 0], belohnung: 'fackel',
    beute: 'Fackel', beuteText: 'Eine Fackel, die nie ausgeht. Irgendwo im Wald hat sich gerade etwas verändert …' },
  { name: 'Schattenhalle', boss: 'Schattenpilz',   art: 'schatten', preis: 900,  hp: 65,  schaden: 1,
    schatz: [10, 10, 10, 4, 1], belohnung: 'steigeisen', brauche: { tuerkis: 15 },
    beute: 'Steigeisen', beuteText: 'Eiserne Zacken für die Stiefel. Im Wald hat sich wieder etwas verändert …' },
  { name: 'Frostkammer',   boss: 'Eisigel',        art: 'igel',     preis: 2000, hp: 150, schaden: 2,
    schatz: [10, 10, 10, 8, 3], belohnung: 'schliff', brauche: { eis: 15 },
    beute: 'Goldener Schliff', beuteText: 'Deine Klinge glänzt golden und trifft ab jetzt halb so fest noch mal dazu.' },
  { name: 'Kristallthron', boss: 'Riesenmotte',    art: 'motte',    preis: 4000, hp: 240, schaden: 2,
    schatz: [10, 10, 10, 10, 8], belohnung: 'riesendiamant', brauche: { tuerkis: 10, eis: 10 },
    beute: 'Der Riesendiamant', beuteText: 'Du hast alle fünf Wächter besiegt!' },
];

// Aus den gekauften Stufen die Spielwerte ableiten (Boss-Belohnungen stecken mit drin)
export function werte(st) {
  const k = st.klinge | 0, bosse = st.bosse | 0, hut = st.hut || 'eichel';
  return {
    schaden: Math.ceil(KLINGE.schaden[k] * (bosse >= 4 ? 1.5 : 1)),
    reichweite: KLINGE.reichweite[k],
    bogen: KLINGE.bogenGrad[k] * Math.PI / 180,
    abklingen: 0.42 - 0.055 * (st.schwung | 0),
    tempo: 62 + 11 * (st.stiefel | 0),
    maxHp: 3 + (st.herz | 0) + (bosse >= 1 ? 1 : 0) + (hut === 'ritter' ? 1 : 0),
    magnet: 14 + 14 * (st.magnet | 0) + (hut === 'feder' ? 12 : 0),
    tagDauer: 70 + 15 * (st.sonne | 0) + (hut === 'stroh' ? 10 : 0),
    glueck: (st.klee | 0) + (hut === 'klee' ? 1 : 0),
    wertMal: hut === 'krone' ? 1.1 : 1,
    wirbel: (st.wirbel | 0) > 0,
    licht: 46 + 22 * (st.fackel | 0) + (hut === 'laterne' ? 24 : 0),     // Lichtkreis im Dunkelwald (Weltpixel)
    kaelte: 28 + 18 * (st.jacke | 0) + (hut === 'pudel' ? 15 : 0),       // Sekunden, bis es im Gebirge zu kalt wird
  };
}

export const LADEZEIT = 0.5;   // so lange halten bis zum Wirbelschlag
