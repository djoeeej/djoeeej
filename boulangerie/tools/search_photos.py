#!/usr/bin/env python3
"""Search Wikimedia Commons for candidate photos and make one numbered contact
sheet per product in tools/preview/, with the file names, authors and
licences in tools/preview/candidates.json. Used to choose photos; the queries
come from tools/photo-search.json, e.g. {"brioche": "brioche à tête"}.
Runs in GitHub Actions; needs network access and Pillow.
"""
import io
import json
import urllib.parse
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

from fetch_photos import API, get, strip_html, clean_author

ROOT = Path(__file__).resolve().parent
QUERIES = ROOT / "photo-search.json"
OUT = ROOT / "preview"
FREE = ("CC0", "CC BY", "Public domain", "PD", "CC-BY")


def search(query, limit=16):
    params = {
        "action": "query", "format": "json", "formatversion": "2",
        "generator": "search", "gsrnamespace": "6", "gsrlimit": str(limit),
        "gsrsearch": f"{query} filetype:bitmap",
        "prop": "imageinfo", "iiprop": "url|extmetadata|user|size",
        "iiextmetadatafilter": "Artist|LicenseShortName", "iiurlwidth": "320",
    }
    data = json.loads(get(API + "?" + urllib.parse.urlencode(params)))
    pages = sorted(data.get("query", {}).get("pages", []), key=lambda p: p.get("index", 0))
    out = []
    for p in pages:
        info = (p.get("imageinfo") or [None])[0]
        if not info:
            continue
        meta = info.get("extmetadata", {})
        lic = meta.get("LicenseShortName", {}).get("value", "")
        if not lic.startswith(FREE):  # skip GFDL-only and anything unclear
            continue
        out.append({
            "file": p["title"][5:], "license": lic,
            "author": clean_author(strip_html(meta.get("Artist", {}).get("value")), info.get("user")),
            "size": f"{info.get('width')}×{info.get('height')}", "thumb": info.get("thumburl"),
        })
    return out


def sheet(pid, cands):
    w, h, pad, cols = 300, 300, 34, 4
    rows = max(1, (len(cands) + cols - 1) // cols)
    img = Image.new("RGB", (cols * w, rows * (h + pad)), (20, 27, 49))
    d = ImageDraw.Draw(img)
    for i, c in enumerate(cands):
        x, y = (i % cols) * w, (i // cols) * (h + pad)
        try:
            im = ImageOps.contain(Image.open(io.BytesIO(get(c["thumb"]))).convert("RGB"), (w - 8, h - 8))
            img.paste(im, (x + 4 + (w - 8 - im.width) // 2, y + 4 + (h - 8 - im.height) // 2))
        except Exception as e:  # noqa: BLE001
            d.text((x + 10, y + 10), f"error: {e}"[:40], fill=(255, 120, 120))
        d.text((x + 6, y + h + 4), f"#{i} {c['file'][:40]}", fill=(242, 237, 227))
        d.text((x + 6, y + h + 18), f"{c['license']} · {c['size']}", fill=(185, 192, 211))
    path = OUT / f"{pid}.jpg"
    img.save(path, quality=82)
    return path


def main():
    if not QUERIES.exists():
        return
    queries = json.loads(QUERIES.read_text(encoding="utf-8"))
    if not queries:
        return
    OUT.mkdir(exist_ok=True)
    result = {}
    for pid, q in queries.items():
        cands = search(q)
        result[pid] = [{k: v for k, v in c.items() if k != "thumb"} for c in cands]
        print(f"{pid}: {len(cands)} candidates -> {sheet(pid, cands).name}")
    (OUT / "candidates.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
