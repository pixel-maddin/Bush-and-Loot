# Halmhauer

Kleines Pixel-Actionspiel fürs Handy und den PC. Du bist ein kleiner Junge mit
Eichelhut und hast jeden Tag bis Sonnenuntergang Zeit, so viel Gras wie möglich
umzuhauen. Manchmal steckt ein Diamant drin. Mit den Diamanten kaufst du im
alten Baumstumpf, in dem du wohnst, bessere Sachen.

## Starten

```bash
python3 halmhauer/server/serve.py      # dann http://localhost:8080
```

Auf dem Handy die IP-Adresse eingeben, die der Server beim Start anzeigt
(gleiches WLAN). Hochkant und quer gehen beide.

## Als App aufs Handy

- **iPhone (Safari):** Teilen → „Zum Home-Bildschirm“. Danach startet Halmhauer
  ohne Adressleiste wie eine App. Das geht auch über die WLAN-Adresse vom Server.
- **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm
  hinzufügen“. Als echte App im Vollbild und **offline** spielbar ist das Spiel
  aber nur, wenn es über **https** kommt (z. B. GitHub Pages). Über
  `http://192.168.…` gibt es nur eine Verknüpfung, die im Browser öffnet.
- Am PC (Chrome/Edge) über `http://localhost:8080`: Symbol „Installieren“ rechts
  in der Adressleiste.
- Im Browser bietet das Pause-Menü einen **Vollbild**-Knopf (nicht auf dem iPhone).

## Steuerung

| | PC | Handy |
|---|---|---|
| Laufen | Pfeiltasten oder WASD | linke Bildschirmhälfte: Daumen hinlegen und ziehen |
| Hauen | Leertaste, J, K oder X (auch linke Maustaste) | rechte Bildschirmhälfte antippen |
| Wirbelschlag (wenn gekauft) | Hauen gedrückt halten, loslassen | rechts gedrückt halten, loslassen |
| Pause | Esc oder P | Pause-Knopf oben rechts |

Ohne Wirbelschlag haut man weiter, solange man gedrückt hält.

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

## Laden im Baumstumpf

Klinge (Holzschwert → Kurzschwert → Eisenschwert → Breitschwert → Mondsichel →
Sternenklinge), Schwungkraft, Flinke Stiefel, Herzbeere, Elsternfeder (Diamanten
fliegen von weiter her zu dir), Sonnenuhr (längerer Tag), Glücksklee und
Wirbelschlag.

## Musik

Drei eigene kleine Chip-Stücke, live im Browser erzeugt: ein flottes am Tag,
ein ruhigeres, sobald die Sonne sinkt, und eine Spieluhr im Baumstumpf. In der
Pause wird sie leiser. Musik und Geräusche lassen sich im Pause-Menü getrennt
abschalten.

## Spielstand

Liegt im Browser (localStorage `halmhauer.v1`). „Neu anfangen" auf dem
Titelbild löscht ihn.
