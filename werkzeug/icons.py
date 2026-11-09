#!/usr/bin/env python3
"""
icons.py - Malt die App-Symbole fuer Halmhauer (die einzigen Bilddateien).

    python3 halmhauer/werkzeug/icons.py

Schreibt web/icons/icon-32.png, -180.png, -192.png und -512.png.
Das Bild ist 32 x 32 Pixel gross und wird ganzzahlig hochskaliert, damit es
genauso pixelig aussieht wie das Spiel. Der Junge ist derselbe wie in
web/js/grafik.js (KOPF_UNTEN + BEINE_V[0]) - bei Aenderungen dort hier
nachziehen. Ohne PIL: PNG wird von Hand mit zlib geschrieben.
"""

import struct
import zlib
from pathlib import Path

ZIEL = Path(__file__).resolve().parent.parent / "web" / "icons"
N = 32


def farbe(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


# Gleiche Farben wie PAL_KIND in grafik.js, plus ein paar fuers Symbol
PAL = {
    "k": "#2b1d16", "H": "#c58e4a", "h": "#8c5a2c", "p": "#6d4423", "s": "#f6d0a8",
    "S": "#dba17a", "y": "#f2c14e", "e": "#1e1b30", "g": "#3d5fa8", "G": "#233a72",
    "b": "#6b4220",
    # Klinge, Diamant, Gras
    "w": "#f4fbff", "i": "#b9c8d4", "c": "#5ee07a", "d": "#2f9e4f", "q": "#eafff0",
    "B": "#5aa8ff", "D": "#2f5fc0", "r": "#7cc95a", "R": "#4f9a3c",
}

HELD = [
    "......kkkk......",
    "....kkHHHHkk....",
    "...kHHhHHhHHk...",
    "..khhhhhhhhhhk..",
    "..kkkkkkkkkkkk..",
    "..kyssssssssyk..",
    "..kssessssessk..",
    "...kssssssssk...",
    "....kSSSSSSk....",
    "..kGggggggggGk..",
    ".ksGggggggggGsk.",
    ".kkkbbbyybbbkkk.",
    "...kggggggggk...",
    "...kGGGGGGGGk...",
    "....kpk..kpk....",
    "....kkk..kkk....",
]

SCHWERT = [
    ".k.",
    "kwk",
    "kwk",
    "kwk",
    "kwk",
    "kik",
    "kik",
    "kik",
    "kik",
    "kkk",
    "khhhk",   # Parierstange (zwei Pixel breiter, wird versetzt gesetzt)
    "kbk",
    "kbk",
    ".k.",
]

STEIN_GRUEN = [
    ".kkkk.",
    "kqccdk",
    ".kcdk.",
    "..kk..",
]
STEIN_BLAU = [
    ".kkkk.",
    "kqBBDk",
    ".kBDk.",
    "..kk..",
]
BUESCHEL = [
    "..k.k..",
    ".krkrk.",
    "krRrRrk",
    "kRrRrRk",
    ".kkkkk.",
]


def male():
    bild = [[farbe("#1d4424")] * N for _ in range(N)]
    mx = my = (N - 1) / 2
    # Runde Lichtung mit hellerem Rand oben links
    for y in range(N):
        for x in range(N):
            dx, dy = x - mx, y - my
            r2 = dx * dx + dy * dy
            if r2 <= 14.6 ** 2:
                bild[y][x] = farbe("#4f9a3c")
                if r2 >= 13.4 ** 2 and dx + dy < 0:
                    bild[y][x] = farbe("#6cbb4c")
            elif r2 <= 15.6 ** 2:
                bild[y][x] = farbe("#2e6b34")
    # Ein paar Halme
    for (x, y) in [(7, 9), (25, 12), (9, 26), (21, 27), (27, 18), (5, 15), (14, 4), (19, 5)]:
        bild[y][x] = farbe("#3f8a37")
        bild[y - 1][x] = farbe("#3f8a37")
    # Schatten unter dem Jungen
    for y, (a, b) in {23: (11, 20), 24: (10, 21)}.items():
        for x in range(a, b + 1):
            bild[y][x] = farbe("#34712f")

    def setze(muster, ox, oy):
        for j, zeile in enumerate(muster):
            for i, z in enumerate(zeile):
                if z != "." and 0 <= ox + i < N and 0 <= oy + j < N:
                    bild[oy + j][ox + i] = farbe(PAL[z])

    setze(BUESCHEL, 3, 19)
    setze(BUESCHEL, 23, 23)
    setze(STEIN_GRUEN, 4, 6)
    setze(STEIN_BLAU, 6, 24)
    # Schwert rechts neben dem Jungen, Parierstange um eins nach links versetzt
    for j, zeile in enumerate(SCHWERT):
        setze([zeile], 22 if len(zeile) == 5 else 23, 5 + j)
    setze(HELD, 8, 8)
    return bild


def png(bild, mal, rand, pfad):
    groesse = N * mal + 2 * rand
    rand_farbe = bild[0][0]
    roh = bytearray()
    for y in range(groesse):
        roh.append(0)  # Filter: keiner
        by = (y - rand) // mal
        for x in range(groesse):
            bx = (x - rand) // mal
            if 0 <= bx < N and 0 <= by < N and y >= rand and x >= rand:
                roh.extend(bild[by][bx])
            else:
                roh.extend(rand_farbe)

    def block(art, daten):
        b = art + daten
        return struct.pack(">I", len(daten)) + b + struct.pack(">I", zlib.crc32(b) & 0xFFFFFFFF)

    kopf = struct.pack(">IIBBBBB", groesse, groesse, 8, 6, 0, 0, 0)
    pfad.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + block(b"IHDR", kopf)
        + block(b"IDAT", zlib.compress(bytes(roh), 9))
        + block(b"IEND", b"")
    )
    print(f"{pfad.name}: {groesse} x {groesse}")


if __name__ == "__main__":
    ZIEL.mkdir(parents=True, exist_ok=True)
    b = male()
    png(b, 1, 0, ZIEL / "icon-32.png")
    png(b, 5, 10, ZIEL / "icon-180.png")   # 160 + Rand
    png(b, 6, 0, ZIEL / "icon-192.png")
    png(b, 16, 0, ZIEL / "icon-512.png")
