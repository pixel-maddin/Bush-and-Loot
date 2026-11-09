# Halmhauer

Kleines Pixel-Actionspiel fürs Handy und den PC. Du bist ein kleiner Junge mit
Eichelhut und hast jeden Tag bis Sonnenuntergang Zeit, so viel Gras wie möglich
umzuhauen. Manchmal steckt ein Diamant drin. Mit den Diamanten kaufst du im
alten Baumstumpf, in dem du wohnst, bessere Sachen.

## Spielen

Online: **https://pixel-maddin.github.io/Halmhauer/** – dort auch als App
installierbar (siehe unten).

## Lokal starten

```bash
python3 halmhauer/server/serve.py      # dann http://localhost:8080
```

Auf dem Handy die IP-Adresse eingeben, die der Server beim Start anzeigt
(gleiches WLAN). Hochkant und quer gehen beide.

## Als App aufs Handy

- **iPhone (Safari):** Teilen → „Zum Home-Bildschirm“. Danach startet Halmhauer
  ohne Adressleiste wie eine App. Das geht auch über die WLAN-Adresse vom Server.
- **Android (Chrome):** die Online-Adresse oben öffnen, Menü ⋮ → „App
  installieren“. Dann läuft es im Vollbild und auch **offline**. Über
  `http://192.168.…` vom eigenen Server gibt es nur eine Verknüpfung, die im
  Browser öffnet (dafür braucht es https).
- Am PC (Chrome/Edge) über `http://localhost:8080`: Symbol „Installieren“ rechts
  in der Adressleiste.
- Im Browser bietet das Pause-Menü einen **Vollbild**-Knopf (nicht auf dem iPhone).

## Steuerung

| | PC | Handy |
|---|---|---|
| Laufen | Pfeiltasten oder WASD | dorthin tippen, wo er hinlaufen soll – Finger halten und ziehen, dann folgt er |
| Hauen | Leertaste, J, K oder X (auch linke Maustaste) | runden HAUEN-Knopf rechts unten drücken |
| Wirbelschlag (wenn gekauft) | Hauen gedrückt halten, loslassen | Knopf gedrückt halten, loslassen |
| Pause | Esc oder P | Pause-Knopf oben rechts |

Jeder Druck ist genau ein Schlag – Festhalten haut nicht weiter.

Wer lieber mit Daumen-Stick spielt: Pause → „Steuerung: Tippen“ antippen, dann
wird daraus „Stick“ (linke Hälfte ziehen = laufen, rechte Hälfte tippen = hauen).

## So läuft ein Tag

- Die Sonne läuft oben rechts über die Leiste. Am Anfang dauert ein Tag 70 Sekunden.
- Gegen Abend wird es orange, dann blau. Bei Sonnenuntergang ist der Tag vorbei;
  Diamanten, die noch herumliegen, nimmst du automatisch mit.
- Läufst du in die Tür des Baumstumpfs, kannst du mitten am Tag einkaufen
  (die Zeit steht dann still) oder schlafen gehen.
- Wirst du so oft getroffen, dass alle Herzen weg sind, kippst du um: Die Hälfte
  der Diamanten von diesem Tag ist weg.
- Jeden Morgen wächst das Gras neu.

## Diamanten

| Farbe | Wert |
|---|---|
| Grün | 1 |
| Blau | 5 |
| Rot | 20 |
| Lila | 60 |
| Gold | 200 |

## Gras

| Art | Schläge mit dem Holzschwert | ab Tag | Besonderheit |
|---|---|---|---|
| Grasbüschel | 1 | 1 | grün und blau |
| Hohes Gras | 2 | 1 | bis rot |
| Blütenbusch | 4 | 3 | bis lila, öfter ein Fund |
| Dornenbusch | 8 | 5 | bis gold, sehr oft ein Fund |

Die zähen Sorten wachsen weiter weg vom Baumstumpf häufiger.

## Plagegeister

- **Moosschnecke** (ab Tag 1): langsam, kommt aber stur hinterher.
- **Brummhummel** (ab Tag 2): kreist um dich und stürzt sich plötzlich drauf.
- **Hüpfpilz** (ab Tag 4): springt auf dich zu, hält mehr aus.

Manchmal springt einer direkt aus einem Grasbüschel. Jeden Tag werden es mehr.

## Die Glitzerhöhle – das Ziel

Oben im Fels am Waldrand liegt die Glitzerhöhle. Darin sind fünf Kammern hinter
verschlossenen Türen, und hinter jeder wartet ein Wächter. Eine Tür öffnet sich
für Diamanten, aber erst, wenn der Wächter davor besiegt ist. Wer alle fünf
schafft, bekommt den **Riesendiamanten** und hat gewonnen (weiterspielen geht
trotzdem).

| Kammer | Tür | Wächter | Was er macht | Belohnung |
|---|---|---|---|---|
| Moosgrotte | 100 | Riesenschnecke | zittert, dann Ansturm geradeaus – danach benommen | Fackel |
| Wabenkammer | 350 | Hummelkönigin | kreist hoch oben, ruft Hummeln, stürzt sich auf die rote Stelle – sitzt danach kurz am Boden | ein Herz mehr |
| Schattenhalle | 900 | Schattenpilz | springt, Druckwelle beim Landen; wird ab und zu fast unsichtbar. Es ist dunkel! | Steigeisen |
| Frostkammer | 2.000 | Eisigel | rollt als Stachelkugel herum (dann prallt alles ab), ist danach schwindelig, schießt Eisstacheln | Goldener Schliff (+50 % Schaden) |
| Kristallthron | 4.000 | Steinwächter | Arme hoch = Boden bebt im roten Kreis; danach glüht sein Kern (doppelter Schaden). Wirft Felsbrocken | Riesendiamant |

- Rote Flecken und Kreise am Boden zeigen, wo gleich etwas einschlägt. Weglaufen!
- In der Höhle steht die Sonne still. Wer im Kampf umkippt, für den ist der Tag
  vorbei (wie draußen: die Hälfte der heutigen Diamanten ist weg). Die Tür bleibt offen.
- Der Wächter lässt einen Haufen Diamanten fallen. Wer die Belohnung aufhebt,
  bekommt die Tür nach draußen auf.
- Fackel und Steigeisen sind für den Dunkelwald und das Gebirge, die als
  Nächstes dazukommen.

## Laden im Baumstumpf

Klinge (Holzschwert → Kurzschwert → Eisenschwert → Breitschwert → Mondsichel →
Sternenklinge), Schwungkraft, Flinke Stiefel, Herzbeere, Elsternfeder (Diamanten
fliegen von weiter her zu dir), Sonnenuhr (längerer Tag), Glücksklee und
Wirbelschlag.

## Musik

Vier eigene kleine Chip-Stücke, live im Browser erzeugt: ein flottes am Tag,
ein ruhigeres, sobald die Sonne sinkt, eine Spieluhr im Baumstumpf und ein
treibendes Kampfstück in den Kammern der Glitzerhöhle. In der
Pause wird sie leiser. Musik und Geräusche lassen sich im Pause-Menü getrennt
abschalten.

## Spielstand

Liegt im Browser (localStorage `halmhauer.v1`). „Neu anfangen" auf dem
Titelbild löscht ihn.
