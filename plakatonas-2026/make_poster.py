"""
Plakatonas 2026 - "Half a flag says nothing."

Builds the A2 print PDF (CMYK, 2.5 mm bleed, trim/bleed boxes set, fonts
embedded, all vector) and an on-screen PNG preview.

    python3 make_poster.py
"""
import math
import os

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from reportlab.pdfgen import canvas
from reportlab.lib.colors import CMYKColor
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from pdfx import make_pdfx

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PDF = os.path.join(HERE, "Plakatonas_2026_Half-a-flag_A2_print.pdf")
OUT_JPG = os.path.join(HERE, "Plakatonas_2026_Half-a-flag_preview.jpg")

# ---------------------------------------------------------------- page ----
TRIM_W, TRIM_H = 420.0, 594.0          # A2 portrait, mm
BLEED = 2.5
PAGE_W, PAGE_H = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED
SAFE = 5.0                             # competition safe area
M = 30.0                               # design margin (well inside SAFE)
PT = 25.4 / 72.0                       # 1 pt in mm

# ------------------------------------------------------------- colours ----
def cmyk(c, m, y, k):
    return CMYKColor(c / 100.0, m / 100.0, y / 100.0, k / 100.0)

PAPER = cmyk(0, 3, 9, 0)
INK = cmyk(0, 0, 0, 100)               # all small text: black only
RICH = cmyk(40, 30, 20, 100)           # display type only (>= 40 pt)
RED = cmyk(0, 95, 90, 0)               # the red thread

YELLOW = [cmyk(0, 30, 100, 8),         # deep fold
          cmyk(0, 20, 100, 2),         # shade
          cmyk(0, 12, 100, 0),         # signal yellow (base)
          cmyk(0, 5, 88, 0)]           # light
BLUE = [cmyk(100, 72, 0, 30),
        cmyk(100, 64, 0, 14),
        cmyk(100, 56, 0, 0),
        cmyk(88, 42, 0, 0)]

# --------------------------------------------------------------- fonts ----
FONTS = {
    "Head": "BricolageGrotesque-Bold.ttf",
    "Mono": "IBMPlexMono-Regular.ttf",
    "MonoBold": "IBMPlexMono-Bold.ttf",
    "SerifIt": "IBMPlexSerif-Italic.ttf",
}
for name, f in FONTS.items():
    pdfmetrics.registerFont(TTFont(name, os.path.join(HERE, "fonts", f)))

MIN_PT = 7.0
TEXT_BOXES = []                        # for the safe-area self-check


def text(c, s, x, y, font, pt, color=INK, anchor="l", tracking=0.0):
    """Draw text; x/y in mm, size in pt. Records its box for checks."""
    assert pt >= MIN_PT, (s, pt)
    assert color is INK or pt >= 40, ("small text must be one ink", s)
    size = pt * PT
    w = pdfmetrics.stringWidth(s, font, size) + tracking * PT * (len(s) - 1)
    if anchor == "c":
        x -= w / 2
    elif anchor == "r":
        x -= w
    c.saveState()
    c.setFillColor(color)
    if color is INK:
        # black text overprints, so a slight plate shift can't open a white gap
        c.setFillOverprint(True)
        c.setOverprintMask(True)
    t = c.beginText()
    t.setTextOrigin(x, y)
    t.setFont(font, size)
    t.setCharSpace(tracking * PT)
    t.textOut(s)
    c.drawText(t)
    c.restoreState()
    asc = pdfmetrics.getAscent(font, size)
    desc = pdfmetrics.getDescent(font, size)
    TEXT_BOXES.append((s, x, y + desc, x + w, y + asc))
    return w


def width(s, font, pt, tracking=0.0):
    return pdfmetrics.stringWidth(s, font, pt * PT) + tracking * PT * (len(s) - 1)


def poly(c, pts, color, close=True):
    p = c.beginPath()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    if close:
        p.close()
    c.setFillColor(color)
    c.drawPath(p, fill=1, stroke=0, fillMode=1)   # even-odd


# ---------------------------------------------------------------- flag ----
FX0, FY0 = 42.0, 211.0                 # hoist, bottom corner (flat)
FW, FH = 356.0, 206.0                  # flat size of the cloth
AMP = 24.0                             # depth of the ripples (mm)
WAVES = 1.32                           # ripples across the fly
TILT = 0.30                            # how diagonal the folds run
PHI = 0.70


def phase(u, v):
    return 2 * np.pi * (WAVES * u - TILT * (v - 0.5) * (0.35 + u)) + PHI


def amp(u):
    return AMP * np.power(np.clip(u, 0, None), 0.9)


def depth(u, v):
    return amp(u) * np.sin(phase(u, v))


def slope(u, v):
    """d(depth)/d(distance along the cloth), dimensionless."""
    du = 1e-4
    return (depth(u + du, v) - depth(u - du, v)) / (2 * du * FW)


# foreshortening: cloth that turns away from us takes up less width
_UU = np.linspace(0, 1, 4001)
_G = np.clip(slope(_UU, 0.5), -0.95, 0.95)
_XINT = np.concatenate([[0], np.cumsum(np.sqrt(1 - _G ** 2)[1:] * np.diff(_UU))])


def to_xy(u, v):
    """Cloth coordinates (0..1, 0..1) -> page mm."""
    u = np.asarray(u, float)
    v = np.asarray(v, float)
    z = depth(u, v)
    zy = 0.6 * depth(u, 0.5) + 0.4 * z   # keeps the fly from ballooning
    x = FX0 + FW * np.interp(u, _UU, _XINT) + 0.16 * z * (v - 0.5)
    y = FY0 + FH * v * (1 + 0.03 * zy / AMP) - 10.0 * u ** 2 + 0.55 * zy
    return x, y


def shade(u, v):
    # light falls from the upper left; slopes facing it are lit.
    # Faded out near the hoist, where the cloth is held flat.
    fade = np.clip((u - 0.02) / 0.10, 0, 1)
    return np.cos(phase(u, v) - 0.30) * (fade * fade * (3 - 2 * fade))


def edge_loop(u0, u1, n=400):
    us = np.linspace(u0, u1, n)
    vs = np.linspace(0, 1, n)
    xs, ys = [], []
    for a, b in ((us, np.zeros(n)), (np.full(n, u1), vs),
                 (us[::-1], np.ones(n)), (np.full(n, u0), vs[::-1])):
        x, y = to_xy(a, b)
        xs.append(x)
        ys.append(y)
    return list(zip(np.concatenate(xs), np.concatenate(ys)))


def draw_half(c, u0, u1, tones):
    poly(c, edge_loop(u0, u1), tones[2])
    U, V = np.meshgrid(np.linspace(u0, u1, 360), np.linspace(0, 1, 160))
    S = shade(U, V)
    fig = plt.figure()
    bands = [(-9, -0.93, tones[0]), (-0.93, -0.66, tones[1]),
             (0.80, 9, tones[3])]
    for lo, hi, col in bands:
        cs = plt.contourf(U, V, S, levels=[lo, hi])
        for path in cs.get_paths():
            if len(path.vertices) == 0:
                continue
            p = c.beginPath()
            for (a, b), code in zip(path.vertices, path.codes):
                x, y = to_xy(a, b)
                if code == 1:
                    p.moveTo(float(x), float(y))
                elif code == 79:
                    p.close()
                else:
                    p.lineTo(float(x), float(y))
            c.setFillColor(col)
            c.drawPath(p, fill=1, stroke=0, fillMode=1)
    plt.close(fig)


def draw_stitches(c):
    """Cross-stitches in red thread along the seam (u = 0.5)."""
    vs = np.linspace(0, 1, 2001)
    x, y = to_xy(np.full_like(vs, 0.5), vs)
    seg = np.hypot(np.diff(x), np.diff(y))
    s = np.concatenate([[0], np.cumsum(seg)])
    L = s[-1]
    step = 9.0
    n = int(L // step)
    offs = (L - (n - 1) * step) / 2
    c.setStrokeColor(RED)
    c.setLineWidth(1.25)
    c.setLineCap(1)
    arm = 2.6
    for i in range(n):
        si = offs + i * step
        j = np.searchsorted(s, si)
        j = min(max(j, 1), len(s) - 1)
        px, py = x[j], y[j]
        tx, ty = x[j] - x[j - 1], y[j] - y[j - 1]
        tl = math.hypot(tx, ty)
        tx, ty = tx / tl, ty / tl
        nx, ny = ty, -tx
        for sgn in (1, -1):
            ax, ay = (nx + sgn * tx) * arm / math.sqrt(2), (ny + sgn * ty) * arm / math.sqrt(2)
            c.line(px - ax, py - ay, px + ax, py + ay)
    return x, y


ROPE_X = 17.0


def draw_rope(c):
    """Halyard: a twisted rope running the full height, into the bleed."""
    w = 2.4
    c.setFillColor(INK)
    c.rect(ROPE_X - w / 2, -BLEED, w, TRIM_H + 2 * BLEED, stroke=0, fill=1)
    # the twist: thin paper-coloured slants across the rope
    c.setStrokeColor(PAPER)
    c.setLineWidth(0.35)
    y = -BLEED
    while y < TRIM_H + BLEED:
        c.line(ROPE_X - w / 2, y, ROPE_X + w / 2, y + 1.9)
        y += 2.2


def draw_hoist(c):
    """Hoist tape, grommets and lashings from flag to rope."""
    x0, y0 = to_xy(0.0, 0.0)
    x1, y1 = to_xy(0.0, 1.0)
    tape = 5.0
    c.setFillColor(PAPER)
    c.rect(float(x0) - tape, float(y0), tape, float(y1 - y0), stroke=0, fill=1)
    c.setStrokeColor(INK)
    c.setLineWidth(0.45)
    c.rect(float(x0) - tape, float(y0), tape, float(y1 - y0), stroke=1, fill=0)
    for yy in (float(y0) + 5.5, float(y1) - 5.5):
        cx = float(x0) - tape / 2
        c.setLineWidth(0.6)
        c.circle(cx, yy, 1.35, stroke=1, fill=0)
        c.setLineWidth(0.9)
        c.line(cx - 1.35, yy, ROPE_X + 1.2, yy)
        c.setFillColor(INK)
        c.roundRect(ROPE_X - 2.3, yy - 3.2, 4.6, 6.4, 1.2, stroke=0, fill=1)


# ------------------------------------------------------- coastal view ----
def draw_coast(c, y0, x0, x1):
    """
    View of Klaipeda from the sea, looking east (bearing 090), drawn the
    way old charts draw a coast: Melnrage and the lighthouse to the north
    (left), the harbour entrance with its moles and cranes in the middle,
    the forested dunes of Smiltyne / the Curonian Spit to the south (right).
    Returns anchor points for the labels.
    """
    W = x1 - x0
    X = lambda f: x0 + f * W
    rng = np.random.default_rng(1252)
    c.setStrokeColor(INK)
    c.setLineCap(1)
    c.setLineJoin(1)

    # horizon / waterline
    c.setLineWidth(0.5)
    c.line(x0, y0, x1, y0)

    # --- Melnrage: low beach, clumps of trees and a few pitched roofs
    c.setLineWidth(0.4)
    c.line(X(0.0), y0 + 1.4, X(0.405), y0 + 1.4)
    for f0, f1, hmax in ((0.010, 0.085, 5.2), (0.175, 0.250, 6.0),
                         (0.330, 0.398, 4.6)):
        p = c.beginPath()
        p.moveTo(X(f0), y0 + 1.4)
        fs = np.linspace(f0, f1, 90)
        for f in fs:
            t = (f - f0) / (f1 - f0)
            env = math.sin(math.pi * t) ** 0.6
            bumps = 0.55 + 0.45 * abs(math.sin(f * 330))
            p.lineTo(X(f), y0 + 1.4 + hmax * env * bumps)
        p.lineTo(X(f1), y0 + 1.4)
        c.setFillColor(PAPER)
        c.drawPath(p, stroke=1, fill=1)
    for f in (0.105, 0.122, 0.137):
        hx, hw, hh = X(f), 2.6, 2.0
        p = c.beginPath()
        p.moveTo(hx - hw / 2, y0 + 1.4)
        p.lineTo(hx - hw / 2, y0 + 1.4 + hh)
        p.lineTo(hx, y0 + 1.4 + hh + 1.5)
        p.lineTo(hx + hw / 2, y0 + 1.4 + hh)
        p.lineTo(hx + hw / 2, y0 + 1.4)
        c.drawPath(p, stroke=1, fill=0)

    # --- city behind the port
    c.setLineWidth(0.4)
    blocks = [(0.265, 0.016, 6.0), (0.283, 0.012, 9.5), (0.297, 0.018, 5.0),
              (0.425, 0.013, 8.0), (0.440, 0.016, 17.0), (0.458, 0.012, 12.0),
              (0.472, 0.018, 6.5)]
    for f, wf, h in blocks:
        c.setFillColor(PAPER)
        c.rect(X(f), y0 + 2.4, wf * W, h, stroke=1, fill=1)
        for yy in np.arange(y0 + 4.8, y0 + 2.4 + h - 1.2, 2.2):
            c.line(X(f) + 0.8, yy, X(f + wf) - 0.8, yy)

    # --- lighthouse
    lx = X(0.155)
    base, top = y0 + 2.6, y0 + 22.0
    c.setLineWidth(0.45)
    c.setFillColor(PAPER)
    p = c.beginPath()
    p.moveTo(lx - 2.2, base)
    p.lineTo(lx - 1.3, top)
    p.lineTo(lx + 1.3, top)
    p.lineTo(lx + 2.2, base)
    p.close()
    c.drawPath(p, stroke=1, fill=1)
    for hh in (0.33, 0.66):
        yy = base + (top - base) * hh
        half = 2.2 - 0.9 * hh
        c.line(lx - half, yy, lx + half, yy)
    c.rect(lx - 1.9, top, 3.8, 0.9, stroke=1, fill=0)          # gallery
    c.rect(lx - 1.1, top + 0.9, 2.2, 2.4, stroke=1, fill=0)    # lantern
    c.line(lx - 1.5, top + 3.3, lx, top + 5.0)
    c.line(lx + 1.5, top + 3.3, lx, top + 5.0)

    # --- the moles and their entrance lights
    c.setLineWidth(0.45)
    c.line(X(0.405), y0 + 1.2, X(0.505), y0 + 1.2)
    c.line(X(0.575), y0 + 1.2, X(0.655), y0 + 1.2)
    for f in (0.505, 0.575):
        c.rect(X(f) - 1.0, y0 + 1.2, 2.0, 5.0, stroke=1, fill=0)
        c.line(X(f) - 1.0, y0 + 3.7, X(f) + 1.0, y0 + 3.7)
        c.circle(X(f), y0 + 7.0, 0.8, stroke=1, fill=0)

    # --- container cranes
    for f, h in ((0.600, 14.0), (0.628, 15.5), (0.656, 14.0)):
        cx = X(f)
        c.setLineWidth(0.4)
        c.line(cx - 2.8, y0 + 1.2, cx - 2.0, y0 + h)
        c.line(cx + 2.8, y0 + 1.2, cx + 2.0, y0 + h)
        c.line(cx - 2.5, y0 + 5.5, cx + 2.5, y0 + 5.5)
        c.line(cx - 6.0, y0 + h, cx + 8.0, y0 + h)
        c.line(cx - 2.0, y0 + h, cx - 0.4, y0 + h + 5.0)
        c.line(cx + 2.0, y0 + h, cx - 0.4, y0 + h + 5.0)
        c.line(cx - 0.4, y0 + h + 5.0, cx - 6.0, y0 + h)
        c.line(cx - 0.4, y0 + h + 5.0, cx + 8.0, y0 + h)

    # --- Smiltyne / Curonian Spit: forested dune rising to the south
    crest = []
    for f in np.linspace(0.672, 1.0, 400):
        t = (f - 0.672) / 0.328
        ridge = 2.0 + 11.0 * (1 - math.exp(-3.6 * t)) + 0.9 * math.sin(t * 17)
        canopy = 1.1 * abs(math.sin(f * 260)) * min(1.0, t * 6)
        crest.append((X(f), y0 + ridge + canopy, y0 + ridge))
    p = c.beginPath()
    p.moveTo(X(0.655), y0 + 1.2)
    p.lineTo(X(0.672), y0 + 2.0)
    for x, y, _ in crest:
        p.lineTo(x, y)
    c.setLineWidth(0.4)
    c.drawPath(p, stroke=1, fill=0)
    # engraver's hatching down the dune face
    c.setLineWidth(0.22)
    for i in range(6, len(crest), 7):
        x, _, yr = crest[i]
        c.line(x, yr - 0.8, x - 0.35 * (yr - y0), y0 + 0.9)

    # --- a ship standing in, flying K
    sx, sy = X(0.535), y0
    c.setFillColor(INK)
    p = c.beginPath()
    p.moveTo(sx - 11.0, sy + 2.8)
    p.lineTo(sx + 10.5, sy + 2.8)
    p.lineTo(sx + 8.8, sy)
    p.lineTo(sx - 9.8, sy)
    p.close()
    c.drawPath(p, stroke=0, fill=1)
    c.rect(sx - 9.0, sy + 2.8, 4.6, 3.2, stroke=0, fill=1)
    c.rect(sx - 8.2, sy + 6.0, 3.0, 1.9, stroke=0, fill=1)
    c.setLineWidth(0.4)
    c.line(sx + 4.2, sy + 2.8, sx + 4.2, sy + 12.4)
    c.setFillColor(YELLOW[2])
    c.rect(sx + 4.2, sy + 8.8, 1.8, 3.4, stroke=0, fill=1)
    c.setFillColor(BLUE[2])
    c.rect(sx + 6.0, sy + 8.8, 1.8, 3.4, stroke=0, fill=1)

    return {
        "lighthouse": (lx, top + 5.0),
        "port": (X(0.628), y0 + 20.5),
        "spit": (X(0.90), y0 + 16.0),
        "ship": (sx + 6.0, sy + 12.4),
    }


def label(c, s, x, y_from, y_text, pt=8.5, color=INK):
    c.setStrokeColor(color)
    c.setLineWidth(0.25)
    c.line(x, y_from + 1.2, x, y_text - 3.0)
    text(c, s, x, y_text, "Mono", pt, anchor="c", tracking=0.6)


# ------------------------------------------------------------------ run ----
def build():
    # initial font must be an embedded one, or a stray Helvetica is referenced
    c = canvas.Canvas(OUT_PDF, pagesize=(PAGE_W * mm, PAGE_H * mm),
                      initialFontName="Mono", initialFontSize=12, initialLeading=14)
    c.setTitle("Half a flag says nothing")
    c.setSubject("Plakatonas 2026: International Social Inclusion, Klaipeda")
    c.setBleedBox((0, 0, PAGE_W * mm, PAGE_H * mm))
    c.setTrimBox((BLEED * mm, BLEED * mm, (BLEED + TRIM_W) * mm, (BLEED + TRIM_H) * mm))
    c.setCropBox((0, 0, PAGE_W * mm, PAGE_H * mm))

    c.translate(BLEED * mm, BLEED * mm)
    c.scale(mm, mm)                    # user space is now trim-mm

    # paper, bled off all four sides
    c.setFillColor(PAPER)
    c.rect(-BLEED, -BLEED, PAGE_W, PAGE_H, stroke=0, fill=1)

    # ---- header
    hy = TRIM_H - 26
    text(c, "INTERNATIONAL CODE OF SIGNALS  /  FLAG K  (KILO)", M, hy, "Mono", 12, tracking=1.2)
    text(c, "KLAIPĖDA  55°42′ N  21°08′ E", TRIM_W - M, hy, "Mono", 12, anchor="r", tracking=1.2)

    # ---- headline
    hp = 140
    h1 = TRIM_H - 80
    h2 = h1 - hp * PT * 0.9
    text(c, "Half a flag", M - 2, h1, "Head", hp, RICH, tracking=-3)
    text(c, "says nothing.", M - 2, h2, "Head", hp, RICH, tracking=-3)
    text(c, "Pusė vėliavos nieko nesako.", M, h2 - 25, "SerifIt", 30)

    # ---- flag
    draw_rope(c)
    draw_half(c, 0.0, 0.5, YELLOW)
    draw_half(c, 0.5, 1.0, BLUE)
    draw_hoist(c)
    sx, sy = draw_stitches(c)

    # red-thread note, hung off the top of the seam
    tx, ty = float(sx[-1]), float(sy[-1])
    c.setStrokeColor(RED)
    c.setLineWidth(0.5)
    c.line(tx, ty + 3.5, tx, ty + 14)
    text(c, "RED THREAD: THE FIRST HELLO", tx + 3, ty + 11.2, "MonoBold", 10, tracking=1.2)
    text(c, "raudona gija: pirmasis labas", tx + 3, ty + 5.6, "SerifIt", 10.5)

    # ---- dimension line under the flag: whose half is whose
    dy = 187.0
    xa = float(to_xy(0.0, 0.0)[0])
    xm = float(to_xy(0.5, 0.0)[0])
    xb = float(to_xy(1.0, 0.0)[0])
    c.setStrokeColor(INK)
    c.setLineWidth(0.3)
    c.line(xa, dy, xb, dy)
    for xx in (xa, xb):
        c.line(xx, dy - 3, xx, dy + 3)
    c.setStrokeColor(RED)
    c.setLineWidth(0.6)
    c.line(xm, dy - 3, xm, dy + 3)
    for (lo, hi), en, lt in (((xa, xm), "HALF FROM KLAIPĖDA", "pusė iš Klaipėdos"),
                             ((xm, xb), "HALF FROM EVERYWHERE ELSE", "pusė iš viso pasaulio")):
        text(c, en, (lo + hi) / 2, dy - 9, "MonoBold", 13, anchor="c", tracking=1.5)
        text(c, lt, (lo + hi) / 2, dy - 15.5, "SerifIt", 13, anchor="c")

    # ---- what the whole flag says
    my = 153.0
    text(c, "SEWN TOGETHER, THEY FLY AS FLAG K. EVERY SHIP IN THE PORT OF KLAIPĖDA,",
         M, my, "Mono", 12, tracking=0.8)
    text(c, "WHATEVER COUNTRY IT COMES FROM, READS IT THE SAME WAY:",
         M, my - 6.2, "Mono", 12, tracking=0.8)
    text(c, "“I wish to communicate with you.”", M - 1.5, 121, "SerifIt", 70, RICH)

    # ---- call to action
    cy = 91.0
    w = text(c, "Be the other half.", M - 1, cy, "Head", 56, RICH, tracking=-1)
    text(c, "Būk kita pusė.", M - 1 + w + 9, cy, "SerifIt", 30)
    text(c, "LOCAL OR INTERNATIONAL STUDENT: SAY LABAS. SAY HELLO. SAY IT FIRST.",
         M, cy - 13, "MonoBold", 12, tracking=0.8)

    # ---- the city it all happens in
    y0 = 32.0
    a = draw_coast(c, y0, M, TRIM_W - M)
    ly = 66.0
    label(c, "KLAIPĖDA LIGHTHOUSE", a["lighthouse"][0], a["lighthouse"][1], ly)
    label(c, "PORT OF KLAIPĖDA", a["port"][0], a["port"][1], ly)
    label(c, "SMILTYNĖ  /  CURONIAN SPIT", a["spit"][0], a["spit"][1], ly)

    # ---- footer
    fy = 18.0
    text(c, "VIEW OF KLAIPĖDA FROM THE SEA, BEARING 090°", M, fy, "Mono", 9, tracking=0.8)
    text(c, "PLAKATONAS: INTERNATIONAL SOCIAL INCLUSION", TRIM_W - M, fy, "Mono", 9,
         anchor="r", tracking=0.8)

    c.showPage()
    c.save()
    make_pdfx(OUT_PDF)


def check():
    bad = [b for b in TEXT_BOXES
           if b[1] < SAFE or b[2] < SAFE or b[3] > TRIM_W - SAFE or b[4] > TRIM_H - SAFE]
    for b in bad:
        print("OUTSIDE SAFE AREA:", b)
    print(f"text runs: {len(TEXT_BOXES)}, outside safe area: {len(bad)}")


def preview(dpi=150):
    """RGB JPG of the trimmed poster, for on-screen viewing only."""
    import pymupdf
    page = pymupdf.open(OUT_PDF)[0]
    page.set_cropbox(page.trimbox)
    pix = page.get_pixmap(dpi=dpi, colorspace=pymupdf.csRGB)
    pix.pil_save(OUT_JPG, quality=92, dpi=(dpi, dpi))


if __name__ == "__main__":
    build()
    check()
    preview()
    print(OUT_PDF)
