"""
Plakatonas 2026 - "Even amber came from somewhere else."

Lays out the A2 print PDF around the rendered photograph (render_amber.py).
The photo is converted from sRGB to CMYK with a FOGRA39 (ISO 12647-2 coated)
profile and placed at 300 ppi; everything else is vector, in CMYK.

    python3 make_poster_amber.py --photo <render.png | folder of strip_N.png> --icc FOGRA39_TAC300.icc
"""
import argparse
import os

import numpy as np
from PIL import Image, ImageCms
from reportlab.pdfgen import canvas
from reportlab.lib.colors import CMYKColor
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("--photo", required=True)
ap.add_argument("--icc", required=True)
ap.add_argument("--draft", action="store_true", help="allow a low-resolution photo")
args = ap.parse_args()

OUT_PDF = os.path.join(HERE, "Plakatonas_2026_Amber_A2_print.pdf")
OUT_JPG = os.path.join(HERE, "Plakatonas_2026_Amber_preview.jpg")
CMYK_JPG = os.path.join(HERE, "amber_photo_cmyk.jpg")

TRIM_W, TRIM_H = 420.0, 594.0
BLEED = 2.5
PAGE_W, PAGE_H = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED
SAFE = 5.0
M = 30.0
PT = 25.4 / 72.0
PHOTO_Y = 128.0                        # photo runs from here up into the top bleed


def cmyk(c, m, y, k):
    return CMYKColor(c / 100.0, m / 100.0, y / 100.0, k / 100.0)

PAPER = cmyk(0, 3, 9, 0)
INK = cmyk(0, 0, 0, 100)
RICH = cmyk(40, 30, 20, 100)
AMBER = cmyk(0, 55, 100, 5)

FONTS = {
    "Display": "Gloock-Regular.ttf",
    "Head": "BricolageGrotesque-Bold.ttf",
    "Mono": "IBMPlexMono-Regular.ttf",
    "MonoBold": "IBMPlexMono-Bold.ttf",
    "SerifIt": "IBMPlexSerif-Italic.ttf",
}
for name, f in FONTS.items():
    pdfmetrics.registerFont(TTFont(name, os.path.join(HERE, "fonts", f)))

TEXT_BOXES = []


def text(c, s, x, y, font, pt, color=INK, anchor="l", tracking=0.0):
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


def load_photo(path):
    """A single render, or a folder of horizontal strips (strip_0 = bottom)."""
    if not os.path.isdir(path):
        return Image.open(path).convert("RGB")
    strips = sorted((f for f in os.listdir(path) if f.startswith("strip_")),
                    key=lambda f: int(f.split("_")[1].split(".")[0]), reverse=True)
    ims = [Image.open(os.path.join(path, f)).convert("RGB") for f in strips]
    out = Image.new("RGB", (ims[0].width, sum(i.height for i in ims)))
    y = 0
    for i in ims:
        out.paste(i, (0, y))
        y += i.height
    return out


def prepare_photo():
    """sRGB render -> FOGRA39 CMYK JPEG, checked for 300 ppi at placed size."""
    im = load_photo(args.photo)
    w_mm, h_mm = PAGE_W, PAGE_H - BLEED - PHOTO_Y
    ppi_x = im.width / (w_mm / 25.4)
    ppi_y = im.height / (h_mm / 25.4)
    print(f"photo {im.width}x{im.height}px placed at {w_mm:.1f}x{h_mm:.1f} mm -> "
          f"{ppi_x:.0f} x {ppi_y:.0f} ppi")
    if not args.draft:
        assert min(ppi_x, ppi_y) >= 299.5, "photo below 300 ppi"
    src = ImageCms.createProfile("sRGB")
    dst = ImageCms.ImageCmsProfile(args.icc)
    t = ImageCms.buildTransform(src, dst, "RGB", "CMYK",
                                renderingIntent=ImageCms.Intent.PERCEPTUAL)
    cm = ImageCms.applyTransform(im, t)
    tac = np.asarray(cm).astype(int).sum(axis=2).max() / 255 * 100
    print(f"photo max total ink {tac:.0f}%")
    cm.save(CMYK_JPEG, "JPEG", quality=96, subsampling=0, dpi=(300, 300))
    return CMYK_JPEG, w_mm, h_mm


CMYK_JPEG = CMYK_JPG


def build():
    photo, pw, ph = prepare_photo()
    c = canvas.Canvas(OUT_PDF, pagesize=(PAGE_W * mm, PAGE_H * mm),
                      initialFontName="Mono", initialFontSize=12, initialLeading=14)
    c.setTitle("Even amber came from somewhere else")
    c.setSubject("Plakatonas 2026: International Social Inclusion, Klaipeda")
    c.setBleedBox((0, 0, PAGE_W * mm, PAGE_H * mm))
    c.setTrimBox((BLEED * mm, BLEED * mm, (BLEED + TRIM_W) * mm, (BLEED + TRIM_H) * mm))
    c.setCropBox((0, 0, PAGE_W * mm, PAGE_H * mm))
    c.translate(BLEED * mm, BLEED * mm)
    c.scale(mm, mm)

    # paper for the lower panel, bled
    c.setFillColor(PAPER)
    c.rect(-BLEED, -BLEED, PAGE_W, PAGE_H, stroke=0, fill=1)

    # the photograph, bled off top, left and right
    c.drawImage(photo, -BLEED, PHOTO_Y, width=pw, height=ph)

    # ---- over the sky
    hy = TRIM_H - 26
    text(c, "BALTIC AMBER  /  ABOUT 40 MILLION YEARS OLD", M, hy, "Mono", 12, tracking=1.2)
    text(c, "KLAIPĖDA  55°42′ N  21°08′ E", TRIM_W - M, hy, "Mono", 12, anchor="r", tracking=1.2)
    hp = 112
    lead = hp * PT * 0.98
    b1 = TRIM_H - 74
    for i, line in enumerate(["Even amber", "came from", "somewhere else."]):
        text(c, line, M - 1.5, b1 - i * lead, "Display", hp, RICH, tracking=-1)

    # ---- the panel
    top = PHOTO_Y - 20
    text(c, "Nobody asks amber where it’s from.", M - 1, top, "Head", 44, RICH, tracking=-0.8)
    text(c, "Net gintaras atkeliavo iš kitur. Niekas neklausia gintaro, iš kur jis.",
         M, top - 13, "SerifIt", 17)

    body = ["Baltic amber, “Lithuanian gold”, formed some 40 million years ago",
            "from the resin of forests that grew far to the north. An ancient",
            "river, the Eridanos, carried it to the sea. Every autumn, storms",
            "still wash it onto the beaches of Melnragė and Giruliai."]
    for i, line in enumerate(body):
        text(c, line, M, top - 32 - i * 6.6, "Mono", 12.5, tracking=0.2)

    cy = top - 32 - 4 * 6.6 - 13
    c.setStrokeColor(INK)
    c.setLineWidth(0.3)
    c.line(M, cy + 7.5, TRIM_W - M, cy + 7.5)
    text(c, "LOCAL OR INTERNATIONAL STUDENT: MAKE SOMEONE NEW FEEL AT HOME IN KLAIPĖDA.",
         M, cy, "MonoBold", 12.5, tracking=0.6)

    text(c, "PLAKATONAS 2026  /  INTERNATIONAL SOCIAL INCLUSION", TRIM_W - M, 16, "Mono", 9, anchor="r", tracking=0.8)

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
    pix.pil_save(OUT_JPG, quality=90, dpi=(dpi, dpi))


if __name__ == "__main__":
    build()
    check()
    preview()
    print(OUT_PDF)
