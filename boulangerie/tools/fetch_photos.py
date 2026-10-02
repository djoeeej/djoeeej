#!/usr/bin/env python3
"""Download the Wikimedia Commons photos listed in src/data.js (PHOTOS) into
images/, cropped to 4:5 and saved as WebP, and record their credits in
src/photos.generated.js. Runs in GitHub Actions (see
.github/workflows/bakery-photos.yml); needs network access and Pillow.

Products whose PHOTOS entry uses `local:` (your own photo) are skipped.
"""
import html
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data.js"
OUT_JS = ROOT / "src" / "photos.generated.js"
IMAGES = ROOT / "images"
API = "https://commons.wikimedia.org/w/api.php"
# Wikimedia asks automated clients to identify themselves.
UA = "BoulangerieDO-site/1.0 (https://github.com/djoeeej/djoeeej; photo sync via GitHub Actions)"
SIZES = {"small": (640, 800), "large": (1200, 1500)}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def parse_photos():
    """Return {id: [Commons file names]} and {id: {url, author, license, page}} for direct photos."""
    src = DATA.read_text(encoding="utf-8")
    block = src[src.index("const PHOTOS = {"):]
    block = block[: block.index("\n};") + 3]
    photos, direct = {}, {}
    for m in re.finditer(r"^\s*'?([\w-]+)'?:\s*\{(.*)\},?\s*$", block, re.M):
        pid, body = m.group(1), m.group(2)
        if "local:" in body:
            continue
        if re.search(r"\burl:", body):
            fields = dict(re.findall(r"(\w+):\s*'((?:[^'\\]|\\.)*)'", body))
            direct[pid] = {k: v.replace("\\'", "'") for k, v in fields.items()}
            continue
        files = re.findall(r"'((?:[^'\\]|\\.)+)'", body.split("commons:", 1)[-1])
        if files:
            photos[pid] = [f.replace("\\'", "'") for f in files]
    return photos, direct


class _Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def strip_html(value):
    p = _Text()
    p.feed(value or "")
    text = re.sub(r"\s+", " ", html.unescape("".join(p.parts))).strip()
    return text[:77] + "…" if len(text) > 80 else text


def clean_author(text, uploader=None):
    """Turn Commons' fallback wording into a plain name; use the uploader if no author is given."""
    m = re.match(r"No machine-readable author provided\.\s*(.+?) assumed", text or "")
    if m:
        return m.group(1)
    return text or (uploader or "")


def commons_info(titles):
    params = {
        "action": "query", "format": "json", "formatversion": "2",
        "prop": "imageinfo", "iiprop": "url|extmetadata|user",
        "iiextmetadatafilter": "Artist|LicenseShortName", "iiurlwidth": "1600",
        "titles": "|".join(titles),
    }
    data = json.loads(get(API + "?" + urllib.parse.urlencode(params)))
    pages = {p["title"]: p for p in data["query"]["pages"]}
    for n in data["query"].get("normalized", []):
        if n["to"] in pages:
            pages[n["from"]] = pages[n["to"]]
    return pages


def smart_crop(im, ratio=0.8):
    """Crop to width/height = ratio, keeping the busiest (most detailed) area."""
    w, h = im.size
    edges = ImageOps.grayscale(im).resize((240, max(1, round(240 * h / w)))).filter(ImageFilter.FIND_EDGES)
    ew, eh = edges.size
    px = edges.load()
    if w / h > ratio:
        win = max(1, round(h * ratio / w * ew))
        energy = [sum(px[x, y] for y in range(eh)) for x in range(ew)]
        center = (ew - win) / 2
        best = max(range(ew - win + 1), key=lambda x0: sum(energy[x0:x0 + win]) * (1 - 0.15 * abs(x0 - center) / max(1, center)))
        x0 = round(best * w / ew)
        cw = round(h * ratio)
        return im.crop((min(x0, w - cw), 0, min(x0, w - cw) + cw, h))
    win = max(1, round(w / ratio / h * eh))
    energy = [sum(px[x, y] for x in range(ew)) for y in range(eh)]
    center = (eh - win) / 2
    best = max(range(eh - win + 1), key=lambda y0: sum(energy[y0:y0 + win]) * (1 - 0.15 * abs(y0 - center) / max(1, center)))
    y0 = round(best * h / eh)
    ch = round(w / ratio)
    return im.crop((0, min(y0, h - ch), w, min(y0, h - ch) + ch))


def save(pid, im, credit, source):
    crop = smart_crop(ImageOps.exif_transpose(im).convert("RGB"))
    entry = {}
    for size, (w, h) in SIZES.items():
        path = IMAGES / f"{pid}-{w}.webp"
        # Never enlarge beyond the photo's real resolution.
        out_w = min(w, crop.width)
        crop.resize((out_w, round(out_w * h / w)), Image.LANCZOS).save(path, "WEBP", quality=80, method=6)
        entry[size] = f"images/{path.name}"
    entry["credit"] = credit
    entry["source"] = source
    return entry


def main():
    photos, direct = parse_photos()
    titles = sorted({f"File:{f}" for files in photos.values() for f in files})
    pages = commons_info(titles) if titles else {}
    IMAGES.mkdir(exist_ok=True)
    result, failed = {}, []
    for pid, d in direct.items():
        try:
            im = Image.open(io.BytesIO(get(d["url"])))
            credit = {"author": d.get("author", ""), "site": d.get("site", ""), "license": d.get("license", ""), "url": d.get("page") or d["url"]}
            result[pid] = save(pid, im, credit, d["url"])
            print(f"ok {pid}: {d['url']} ({credit['author']}, {credit['license']})")
        except Exception as e:  # noqa: BLE001
            print(f"  {pid}: download failed for {d['url']}: {e}")
            failed.append(pid)
    for pid, files in photos.items():
        for f in files:
            page = pages.get(f"File:{f}")
            info = (page or {}).get("imageinfo", [None])[0]
            if not info or page.get("missing"):
                print(f"  {pid}: {f} not found, trying next")
                continue
            try:
                im = Image.open(io.BytesIO(get(info.get("thumburl") or info["url"])))
            except Exception as e:  # noqa: BLE001
                print(f"  {pid}: download failed for {f}: {e}")
                continue
            meta = info.get("extmetadata", {})
            credit = {
                "author": clean_author(strip_html(meta.get("Artist", {}).get("value")), info.get("user")) or "Wikimedia Commons",
                "site": "Wikimedia Commons",
                "license": meta.get("LicenseShortName", {}).get("value", ""),
                "url": info["descriptionurl"],
            }
            entry = result[pid] = save(pid, im, credit, f"File:{f}")
            print(f"ok {pid}: {f} ({entry['credit']['author']}, {entry['credit']['license']})")
            break
        else:
            failed.append(pid)
    OUT_JS.write_text(
        "// Generated by tools/fetch_photos.py from the PHOTOS list in data.js. Do not edit by hand.\n"
        f"const PHOTO_LOCAL = {json.dumps(result, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"{len(result)} photos saved, {len(failed)} missing: {', '.join(failed) or 'none'}")
    if not result:
        sys.exit(1)


if __name__ == "__main__":
    main()
