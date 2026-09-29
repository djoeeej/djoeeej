"""
Plakatonas 2026 - "It takes two to turn a bridge."

Klaipeda's swing bridge (1855) is still turned by hand, by two people.
Builds the A2 print PDF (CMYK, 2.5 mm bleed, trim/bleed boxes set, fonts
embedded, all vector) and an on-screen JPG preview.

    python3 make_poster_bridge.py
"""
import math
import os

import numpy as np
from reportlab.pdfgen import canvas
from reportlab.lib.colors import CMYKColor
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PDF = os.path.join(HERE, "Plakatonas_2026_Takes-two_A2_print.pdf")
OUT_JPG = os.path.join(HERE, "Plakatonas_2026_Takes-two_preview.jpg")

# ---------------------------------------------------------------- page ----
TRIM_W, TRIM_H = 420.0, 594.0          # A2 portrait, mm
BLEED = 2.5
PAGE_W, PAGE_H = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED
SAFE = 5.0
M = 30.0                               # design margin
PT = 25.4 / 72.0                       # 1 pt in mm

# ------------------------------------------------------------- colours ----
def cmyk(c, m, y, k):
    return CMYKColor(c / 100.0, m / 100.0, y / 100.0, k / 100.0)

SKY = cmyk(0, 12, 100, 0)              # signal yellow, full bleed
SKY_DEEP = cmyk(0, 24, 100, 4)         # old town, tone on tone
INK = cmyk(0, 0, 0, 100)               # all small text: black only
RICH = cmyk(40, 30, 20, 100)           # display type, iron
STONE = cmyk(20, 20, 30, 80)
WATER = cmyk(100, 72, 10, 32)
WATER_DEEP = cmyk(100, 78, 20, 55)
RIPPLE = cmyk(85, 42, 0, 0)
RED = cmyk(0, 95, 90, 0)

# --------------------------------------------------------------- fonts ----
FONTS = {
    "Head": "BricolageGrotesque-Bold.ttf",
    "Mono": "IBMPlexMono-Regular.ttf",
    "MonoBold": "IBMPlexMono-Bold.ttf",
    "SerifIt": "IBMPlexSerif-Italic.ttf",
}
for name, f in FONTS.items():
    pdfmetrics.registerFont(TTFont(name, os.path.join(HERE, "fonts", f)))

TEXT_BOXES = []


def text(c, s, x, y, font, pt, color=INK, anchor="l", tracking=0.0):
    """Draw text; x/y in mm, size in pt."""
    assert pt >= 7, (s, pt)
    assert color is INK or pt >= 30, ("small text must be one ink", s)
    size = pt * PT
    w = pdfmetrics.stringWidth(s, font, size) + tracking * PT * (len(s) - 1)
    if anchor == "c":
        x -= w / 2
    elif anchor == "r":
        x -= w
    c.setFillColor(color)
    t = c.beginText()
    t.setTextOrigin(x, y)
    t.setFont(font, size)
    t.setCharSpace(tracking * PT)
    t.textOut(s)
    c.drawText(t)
    TEXT_BOXES.append((s, x, y + pdfmetrics.getDescent(font, size),
                       x + w, y + pdfmetrics.getAscent(font, size)))
    return w


def path(c, pts, fill=None, stroke=None, width=None, close=True):
    p = c.beginPath()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    if close:
        p.close()
    if fill is not None:
        c.setFillColor(fill)
    if stroke is not None:
        c.setStrokeColor(stroke)
    if width is not None:
        c.setLineWidth(width)
    c.drawPath(p, fill=fill is not None, stroke=stroke is not None)


# ---------------------------------------------------------- the scene ----
DECK = 206.0                           # top of the bridge deck
WATER_TOP = DECK - 13.0
S = 1.7                                # scale of the two people and the capstan
QL, QR = 50.0, 370.0                   # quay faces, left and right
XC = TRIM_W / 2                        # the capstan, centre of the bridge


def draw_old_town(c):
    """Half-timbered Old Town gables on the far bank, tone on tone."""
    base = DECK + 8
    c.setFillColor(SKY_DEEP)
    x = -BLEED
    houses = [(24, 30, 15), (19, 38, 13), (30, 27, 11), (17, 44, 14),
              (26, 33, 12), (22, 40, 15), (31, 28, 10), (20, 36, 13),
              (27, 31, 12), (18, 42, 14), (25, 29, 11), (23, 37, 14),
              (30, 30, 12), (20, 40, 13), (28, 33, 12)]
    for w, h, roof in houses:
        path(c, [(x, base), (x, base + h), (x + w / 2, base + h + roof),
                 (x + w, base + h), (x + w, base)], fill=SKY_DEEP)
        x += w + 1.2
        if x > TRIM_W + BLEED:
            break
    # the timber framing, cut back out in the sky colour
    c.setStrokeColor(SKY)
    c.setLineWidth(0.9)
    x = -BLEED
    for w, h, roof in houses:
        for fy in np.arange(base + 7, base + h - 2, 8.0):
            c.line(x + 1.5, fy, x + w - 1.5, fy)
        for fx in np.linspace(x + 3, x + w - 3, max(2, int(w // 7))):
            c.line(fx, base, fx, base + h - 1)
        # one brace per bay, as on the warehouses along the Dane
        c.line(x + 3, base + 7, x + w / 2, base + h - 1)
        x += w + 1.2
        if x > TRIM_W + BLEED:
            break


def draw_water(c):
    c.setFillColor(WATER)
    c.rect(-BLEED, -BLEED, PAGE_W, WATER_TOP + BLEED, stroke=0, fill=1)
    # the bridge's shadow on the water, broken by the ripples
    c.setFillColor(WATER_DEEP)
    for i, y in enumerate(np.arange(WATER_TOP - 2, WATER_TOP - 26, -4.0)):
        inset = 6 + i * 9
        wob = 3.0 * math.sin(i * 1.7)
        c.rect(QL + inset + wob, y - 2.2, (QR - QL) - 2 * inset, 2.2, stroke=0, fill=1)
    # ripples
    c.setStrokeColor(RIPPLE)
    c.setLineCap(1)
    rng = np.random.default_rng(1855)
    for y in np.arange(WATER_TOP - 5, 150, -7.0):
        x = -BLEED + rng.uniform(0, 20)
        while x < TRIM_W:
            L = rng.uniform(8, 34)
            c.setLineWidth(rng.choice([0.6, 0.9, 1.2]))
            c.line(x, y, x + L, y)
            x += L + rng.uniform(10, 40)


def draw_quays(c):
    for x0, x1 in ((-BLEED, QL), (QR, TRIM_W + BLEED)):
        c.setFillColor(STONE)
        c.rect(x0, WATER_TOP - 3, x1 - x0, DECK - WATER_TOP + 3, stroke=0, fill=1)
        # coursed stone
        c.setStrokeColor(SKY)
        c.setLineWidth(0.5)
        rows = np.arange(WATER_TOP - 3, DECK, 5.5)
        for i, y in enumerate(rows[1:]):
            c.line(x0, y, x1, y)
        for i, y in enumerate(rows[:-1]):
            off = 0 if i % 2 else 6
            for x in np.arange(x0 + off, x1, 12.0):
                c.line(x, y, x, min(y + 5.5, DECK))
        # coping stone
        c.setFillColor(RICH)
        c.rect(x0, DECK - 2.5, x1 - x0, 2.5, stroke=0, fill=1)
    # a bollard on each quay
    for bx in (QL - 22, QR + 22):
        c.setFillColor(RICH)
        path(c, [(bx - 3.2, DECK), (bx - 2.4, DECK + 7), (bx + 2.4, DECK + 7), (bx + 3.2, DECK)], fill=RICH)
        c.roundRect(bx - 4.2, DECK + 6.4, 8.4, 2.6, 1.2, stroke=0, fill=1)


def catenary(x0, x1, y, sag, n=60):
    xs = np.linspace(x0, x1, n)
    t = (xs - x0) / (x1 - x0)
    ys = y - sag * 4 * t * (1 - t)
    return xs, ys


def draw_bridge(c):
    """Riveted iron deck, posts, and the chains that named it."""
    # girder
    c.setFillColor(RICH)
    c.rect(QL - 1, DECK - 13, QR - QL + 2, 13, stroke=0, fill=1)
    # rivets
    c.setFillColor(SKY)
    for y in (DECK - 3.4, DECK - 9.6):
        for x in np.arange(QL + 5, QR - 3, 6.0):
            c.circle(x, y, 0.75, stroke=0, fill=1)
    # web stiffeners
    c.setStrokeColor(SKY)
    c.setLineWidth(0.6)
    for x in np.arange(QL + 32, QR - 10, 32.0):
        c.line(x, DECK - 12, x, DECK - 1)

    # posts
    posts = np.arange(QL + 4, QR - 2, 32.0)
    top = DECK + 34
    c.setFillColor(RICH)
    for x in posts:
        c.rect(x - 1.6, DECK, 3.2, 34, stroke=0, fill=1)
        c.circle(x, top + 1.4, 2.6, stroke=0, fill=1)
    # chains: links along two catenaries between every pair of posts
    c.setStrokeColor(RICH)
    c.setLineWidth(0.7)
    for a, b in zip(posts[:-1], posts[1:]):
        for yy, sag in ((top - 2.0, 9.0), (DECK + 15, 6.0)):
            xs, ys = catenary(a + 2, b - 2, yy, sag, 400)
            seg = np.hypot(np.diff(xs), np.diff(ys))
            s = np.concatenate([[0], np.cumsum(seg)])
            k = 0
            for d in np.arange(1.6, s[-1] - 1.0, 2.6):
                j = min(np.searchsorted(s, d), len(xs) - 1)
                ang = math.degrees(math.atan2(ys[j] - ys[j - 1], xs[j] - xs[j - 1]))
                c.saveState()
                c.translate(xs[j], ys[j])
                c.rotate(ang)
                if k % 2 == 0:
                    c.ellipse(-1.7, -1.0, 1.7, 1.0, stroke=1, fill=0)
                else:
                    c.line(-1.7, 0, 1.7, 0)
                c.restoreState()
                k += 1


# ------------------------------------------------------------- people ----
BAR_Y = DECK + 50.0
BAR_HALF = 43.0
LIMB = 8.6                              # pictogram stroke width


def person(c, facing, hands, col=RICH):
    """
    A pictogram figure leaning into a capstan bar.
    facing = +1 (looking right) or -1; hands = (x, y) where they grip.
    """
    hx, hy = hands
    f = facing
    shoulder = (hx - f * 22.0, hy + 9.0)
    hip = (shoulder[0] - f * 13.0, shoulder[1] - 27.0)
    head = (shoulder[0] + f * 6.5, shoulder[1] + 13.0)
    back_knee = (hip[0] - f * 9.5, hip[1] - 15.0)
    back_foot = (hip[0] - f * 19.0, DECK + LIMB / 2)
    front_knee = (hip[0] + f * 10.0, hip[1] - 13.0)
    front_foot = (hip[0] + f * 7.0, DECK + LIMB / 2)
    elbow = (shoulder[0] + f * 11.5, shoulder[1] - 6.0)

    c.setStrokeColor(col)
    c.setLineCap(1)
    c.setLineJoin(1)
    c.setLineWidth(LIMB)
    for pts in ((hip, back_knee, back_foot), (hip, front_knee, front_foot),
                (shoulder, hip), (shoulder, elbow, (hx, hy))):
        path(c, list(pts), stroke=col, close=False)
    # feet
    c.setLineWidth(LIMB * 0.8)
    c.line(back_foot[0], DECK + LIMB * 0.4, back_foot[0] + f * 6, DECK + LIMB * 0.4)
    c.line(front_foot[0], DECK + LIMB * 0.4, front_foot[0] + f * 6, DECK + LIMB * 0.4)
    c.setFillColor(col)
    c.circle(head[0], head[1], 7.2, stroke=0, fill=1)
    return head


def draw_capstan(c, col=RICH):
    c.setFillColor(col)
    c.rect(XC - 4.5, DECK, 9, BAR_Y - DECK + 4, stroke=0, fill=1)
    c.roundRect(XC - 8, BAR_Y + 2.5, 16, 5, 1.5, stroke=0, fill=1)
    c.roundRect(XC - 7, DECK, 14, 4, 1, stroke=0, fill=1)
    c.setStrokeColor(col)
    c.setLineCap(1)
    c.setLineWidth(3.6)
    c.line(XC - BAR_HALF, BAR_Y, XC + BAR_HALF, BAR_Y)


def orbit(c, back):
    """The big red turn arrow around the two of them."""
    cx, cy, rx, ry = XC, DECK + 30, 100.0, 15.0
    c.setStrokeColor(RED)
    c.setFillColor(RED)
    c.setLineCap(0)
    c.setLineWidth(2.8)
    # back half runs over the top (behind), front half under (in front)
    a0, a1 = (12, 168) if back else (192, 348)
    ts = np.radians(np.linspace(a0, a1, 200))
    pts = [(cx + rx * math.cos(t), cy + ry * math.sin(t)) for t in ts]
    path(c, pts, stroke=RED, close=False)
    # arrowhead at the end of the arc, pointing along it
    (x1, y1), (x0, y0) = pts[-1], pts[-6]
    ang = math.atan2(y1 - y0, x1 - x0)
    L, W = 10.0, 5.4
    tip = (x1 + math.cos(ang) * L * 0.8, y1 + math.sin(ang) * L * 0.8)
    l = (x1 - math.sin(ang) * W, y1 + math.cos(ang) * W)
    r = (x1 + math.sin(ang) * W, y1 - math.cos(ang) * W)
    path(c, [tip, l, r], fill=RED)


class actors:
    """Draw the people, capstan and turn arrow at scale S about the deck centre."""
    def __init__(self, c, flip=False):
        self.c, self.flip = c, flip

    def __enter__(self):
        c = self.c
        c.saveState()
        if self.flip:
            # mirrored in the water: squashed, and hanging from the waterline
            c.translate(XC, WATER_TOP)
            c.scale(S, -S * 0.46)
            c.translate(-XC, -DECK)
        else:
            c.translate(XC, DECK)
            c.scale(S, S)
            c.translate(-XC, -DECK)

    def __exit__(self, *exc):
        self.c.restoreState()


def draw_reflection(c):
    with actors(c, flip=True):
        draw_capstan(c, WATER_DEEP)
        person(c, +1, (XC - BAR_HALF + 3, BAR_Y), WATER_DEEP)
        person(c, -1, (XC + BAR_HALF - 3, BAR_Y), WATER_DEEP)
    # break it up with the ripples, the way water does
    c.setFillColor(WATER)
    for i, y in enumerate(np.arange(WATER_TOP - 3.5, WATER_TOP - 80, -3.4)):
        h = 0.8 + i * 0.075
        c.rect(-BLEED, y, PAGE_W, h, stroke=0, fill=1)


# ------------------------------------------------------------------ run ----
def build():
    c = canvas.Canvas(OUT_PDF, pagesize=(PAGE_W * mm, PAGE_H * mm),
                      initialFontName="Mono", initialFontSize=12, initialLeading=14)
    c.setTitle("It takes two to turn a bridge")
    c.setSubject("Plakatonas 2026: International Social Inclusion, Klaipeda")
    c.setBleedBox((0, 0, PAGE_W * mm, PAGE_H * mm))
    c.setTrimBox((BLEED * mm, BLEED * mm, (BLEED + TRIM_W) * mm, (BLEED + TRIM_H) * mm))
    c.setCropBox((0, 0, PAGE_W * mm, PAGE_H * mm))
    c.translate(BLEED * mm, BLEED * mm)
    c.scale(mm, mm)

    c.setFillColor(SKY)
    c.rect(-BLEED, -BLEED, PAGE_W, PAGE_H, stroke=0, fill=1)

    # ---- header
    hy = TRIM_H - 26
    text(c, "KLAIPĖDA  /  SWING BRIDGE  /  1855", M, hy, "Mono", 12, tracking=1.2)
    text(c, "PLAKATONAS 2026  /  INTERNATIONAL SOCIAL INCLUSION", TRIM_W - M, hy, "Mono", 12,
         anchor="r", tracking=1.2)

    # ---- headline
    hp = 156
    lead = hp * PT * 0.88
    b1 = TRIM_H - 82
    text(c, "It takes two", M - 2.5, b1, "Head", hp, RICH, tracking=-3.5)
    text(c, "to turn", M - 2.5, b1 - lead, "Head", hp, RICH, tracking=-3.5)
    w3 = text(c, "a bridge.", M - 2.5, b1 - 2 * lead, "Head", hp, RICH, tracking=-3.5)
    text(c, "Tiltą pasuka du.", M, b1 - 2 * lead - 25, "SerifIt", 34, INK)

    # ---- the fact, set in the space beside the last line
    fx = TRIM_W - M
    fy = b1 - lead - 2
    for i, line in enumerate(["KLAIPĖDA’S SWING BRIDGE",
                              "WAS BUILT IN 1855.",
                              "IT IS STILL TURNED BY HAND,",
                              "BY TWO PEOPLE.",
                              "THE ONLY ONE LIKE IT",
                              "IN LITHUANIA."]):
        text(c, line, fx, fy - 17 - i * 7.0, "Mono", 13.5, anchor="r", tracking=0.8)

    # ---- scene
    draw_old_town(c)
    draw_water(c)
    draw_reflection(c)
    draw_quays(c)
    with actors(c):
        orbit(c, back=True)
    draw_bridge(c)
    with actors(c):
        draw_capstan(c)
        hl = person(c, +1, (XC - BAR_HALF + 3, BAR_Y))
        hr = person(c, -1, (XC + BAR_HALF - 3, BAR_Y))
        orbit(c, back=False)

    # who is who
    for (x, y), en, lt in ((hl, "LOCAL", "vietinis"), (hr, "INTERNATIONAL", "tarptautinis")):
        x, y = XC + (x - XC) * S, DECK + (y - DECK) * S
        text(c, en, x, y + 27, "MonoBold", 15, anchor="c", tracking=2)
        text(c, lt, x, y + 19.5, "SerifIt", 14, anchor="c")

    # ---- call to action, on the water
    text(c, "Let’s turn it together.", M - 2, 80, "Head", 98, SKY, tracking=-2)
    text(c, "Pasukime kartu.", M, 50, "SerifIt", 44, SKY)

    c.showPage()
    c.save()


def check():
    bad = [b for b in TEXT_BOXES
           if b[1] < SAFE or b[2] < SAFE or b[3] > TRIM_W - SAFE or b[4] > TRIM_H - SAFE]
    for b in bad:
        print("OUTSIDE SAFE AREA:", b)
    print(f"text runs: {len(TEXT_BOXES)}, outside safe area: {len(bad)}")


def preview(dpi=150):
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
