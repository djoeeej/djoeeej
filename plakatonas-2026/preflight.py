"""
Preflight the poster PDF against the Plakatonas technical rules.

    python3 preflight.py [file.pdf]
"""
import re
import sys

import numpy as np
import pymupdf

PDF = sys.argv[1] if len(sys.argv) > 1 else "Plakatonas_2026_Half-a-flag_A2_print.pdf"
MM = 72 / 25.4
ok = True


def report(cond, msg):
    global ok
    ok &= bool(cond)
    print(("PASS  " if cond else "FAIL  ") + msg)


doc = pymupdf.open(PDF)
report(doc.page_count == 1, f"single page ({doc.page_count})")
page = doc[0]

# ---- size, bleed, trim
media = page.mediabox
trim = page.trimbox
bleed = page.bleedbox
mw, mh = media.width / MM, media.height / MM
tw, th = trim.width / MM, trim.height / MM
report(abs(tw - 420) < 0.05 and abs(th - 594) < 0.05, f"trim is A2 portrait: {tw:.2f} x {th:.2f} mm")
report(abs(mw - 425) < 0.05 and abs(mh - 599) < 0.05, f"media incl. 2.5 mm bleed: {mw:.2f} x {mh:.2f} mm")
report(abs(trim.x0 / MM - 2.5) < 0.05 and abs(trim.y0 / MM - 2.5) < 0.05, "trim box centred in bleed")
report(abs(bleed.width / MM - 425) < 0.05, "bleed box set")

# ---- fonts embedded
fonts = page.get_fonts(full=True)
emb = [f for f in fonts if f[1] in ("ttf", "cff", "otf", "pfa", "pfb", "cid")]
report(len(fonts) > 0 and len(emb) == len(fonts),
       f"all fonts embedded ({len(emb)}/{len(fonts)}): " + ", ".join(sorted({f[3].split('+')[-1] for f in fonts})))

# ---- raster images (300 dpi rule)
imgs = page.get_images(full=True)
report(len(imgs) == 0, f"no raster images, fully vector ({len(imgs)} images)")

# ---- colour operators in the content stream
raw = page.read_contents().decode("latin-1")
toks = re.findall(r"[-+]?\d*\.?\d+|/[^\s/\[\]()<>]+|[A-Za-z\*'\"]+", raw)
ops = {}
for t in toks:
    if t in ("rg", "RG", "g", "G", "k", "K", "sc", "SC", "scn", "SCN", "cs", "CS"):
        ops[t] = ops.get(t, 0) + 1
non_cmyk = {k: v for k, v in ops.items() if k not in ("k", "K")}
report(not non_cmyk, f"CMYK colour only (operators: {ops})")
spot = "/Separation" in raw or "/DeviceN" in raw
xref_text = "".join(doc.xref_object(i) for i in range(1, doc.xref_length()))
report(not spot and "/Separation" not in xref_text, "no spot / Pantone colours")

# ---- line widths and font sizes (content is drawn in a user space scaled to mm)
nums = []
min_w = None
min_tf = None
scale = None
for t in toks:
    if re.fullmatch(r"[-+]?\d*\.?\d+", t):
        nums.append(float(t))
        continue
    if t == "cm" and len(nums) >= 6:
        a = nums[-6]
        if abs(a - MM) < 1e-3:
            scale = "mm"
    if t == "w" and nums:
        w = nums[-1]
        min_w = w if min_w is None else min(min_w, w)
    if t == "Tf" and nums:
        size_pt = nums[-1] * (MM if scale == "mm" else 1)
        min_tf = size_pt if min_tf is None else min(min_tf, size_pt)
    nums = []
report(scale == "mm", "drawing units are millimetres")
report(min_w is not None and min_w >= 0.08, f"thinnest line {min_w:.2f} mm (min 0.08 mm)")
report(min_tf is not None and min_tf >= 7 - 1e-6, f"smallest text {min_tf:.2f} pt (min 7 pt)")

# ---- safe area: nothing but paper/rope/bleed within 5 mm of the trim edge
safe_ok = True
for b in page.get_text("dict")["blocks"]:
    x0, y0, x1, y1 = b["bbox"]
    if (x0 - trim.x0) / MM < 5 or (trim.x1 - x1) / MM < 5 or (y0 - trim.y0) / MM < 5 or (trim.y1 - y1) / MM < 5:
        safe_ok = False
        print("   text too close to edge:", b["bbox"])
report(safe_ok, "all text at least 5 mm inside the trim")

# ---- total ink (rendered in CMYK)
pix = page.get_pixmap(dpi=40, colorspace=pymupdf.csCMYK)
a = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[..., :4]
tac = a.astype(int).sum(axis=2).max() / 255 * 100
report(tac <= 300, f"max total ink {tac:.0f}% (keep under 300%)")

print("\nPREFLIGHT", "PASSED" if ok else "FAILED")
sys.exit(0 if ok else 1)
