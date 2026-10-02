#!/usr/bin/env python3
"""Inline src/ into a single index.html. Run: python3 build.py"""
from pathlib import Path

SRC = Path(__file__).parent / "src"
HEADER = """import * as THREE from 'three';
"""
ORDER = ["data.js", "i18n.js", "carousel.js", "app.js"]

template = (SRC / "index.html").read_text(encoding="utf-8")
css = (SRC / "styles.css").read_text(encoding="utf-8")
generated = SRC / "photos.generated.js"
photos = generated.read_text(encoding="utf-8") if generated.exists() else "const PHOTO_LOCAL = {};\n"
parts = [(SRC / name).read_text(encoding="utf-8") for name in ORDER]
parts.insert(1, photos)  # right after data.js
js = HEADER + "\n".join(parts)
assert "</script" not in js, "a script string would close the <script> tag"
out = template.replace("/*STYLES*/", css).replace("/*SCRIPT*/", js)
(Path(__file__).parent / "index.html").write_text(out, encoding="utf-8")
print(f"index.html written ({len(out.encode()) // 1024} KB)")
