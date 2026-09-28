"""Add entrance animations and slide transitions to a pptxgenjs deck.

Shapes named "a<step>-<effect>" get an entrance effect. All effects start
automatically when the slide opens ("With Previous" + delay), step by step,
so the presenter only clicks to go to the next slide.

usage: python animate.py in.pptx out.pptx
"""
import re
import sys
import zipfile

from lxml import etree

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}

# effect -> (presetID, presetSubtype, duration ms)
EFFECTS = {
    "fade": (10, 0, 500),
    "float": (42, 0, 600),
    "zoom": (53, 16, 450),
    "wipe": (22, 8, 550),
    "drop": (2, 1, 500),
}
STEP_GAP = 0.7  # next step starts after 70% of the previous step's duration


class Ids:
    def __init__(self, start):
        self.n = start

    def __call__(self):
        self.n += 1
        return self.n


def tgt(spid):
    return f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'


def set_visible(ids, spid):
    return (
        f'<p:set><p:cBhvr><p:cTn id="{ids()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
        f'{tgt(spid)}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
        f'<p:to><p:strVal val="visible"/></p:to></p:set>'
    )


def anim_effect(ids, spid, dur, flt):
    return (
        f'<p:animEffect transition="in" filter="{flt}"><p:cBhvr><p:cTn id="{ids()}" dur="{dur}"/>'
        f'{tgt(spid)}</p:cBhvr></p:animEffect>'
    )


def anim_prop(ids, spid, dur, attr, v0, v1, additive=False):
    def val(v):
        return f'<p:fltVal val="{v}"/>' if isinstance(v, (int, float)) else f'<p:strVal val="{v}"/>'

    add = ' additive="base"' if additive else ""
    return (
        f'<p:anim calcmode="lin" valueType="num"><p:cBhvr{add}><p:cTn id="{ids()}" dur="{dur}" fill="hold"/>'
        f'{tgt(spid)}<p:attrNameLst><p:attrName>{attr}</p:attrName></p:attrNameLst></p:cBhvr>'
        f'<p:tavLst><p:tav tm="0"><p:val>{val(v0)}</p:val></p:tav>'
        f'<p:tav tm="100000"><p:val>{val(v1)}</p:val></p:tav></p:tavLst></p:anim>'
    )


def behaviours(ids, spid, effect, dur):
    parts = [set_visible(ids, spid)]
    if effect == "fade":
        parts.append(anim_effect(ids, spid, dur, "fade"))
    elif effect == "float":
        parts.append(anim_effect(ids, spid, dur, "fade"))
        parts.append(anim_prop(ids, spid, dur, "ppt_x", "#ppt_x", "#ppt_x"))
        parts.append(anim_prop(ids, spid, dur, "ppt_y", "#ppt_y+.1", "#ppt_y"))
    elif effect == "zoom":
        parts.append(anim_prop(ids, spid, dur, "ppt_w", 0, "#ppt_w"))
        parts.append(anim_prop(ids, spid, dur, "ppt_h", 0, "#ppt_h"))
        parts.append(anim_effect(ids, spid, dur, "fade"))
    elif effect == "wipe":
        parts.append(anim_effect(ids, spid, dur, "wipe(left)"))
    elif effect == "drop":
        parts.append(anim_prop(ids, spid, dur, "ppt_x", "#ppt_x", "#ppt_x", additive=True))
        parts.append(anim_prop(ids, spid, dur, "ppt_y", "0-#ppt_h/2", "#ppt_y", additive=True))
    return "".join(parts)


def build_timing(targets):
    """targets: list of (step, effect, spid, is_sp) in document order."""
    ids = Ids(3)
    steps = sorted({t[0] for t in targets})
    start, t = {}, 0
    for st in steps:
        start[st] = t
        dur = max(EFFECTS[e][2] for s, e, _, _ in targets if s == st)
        t += int(dur * STEP_GAP)

    inner_id = ids()
    effect_pars = []
    for st in steps:
        for s, eff, spid, _ in targets:
            if s != st:
                continue
            preset, sub, dur = EFFECTS[eff]
            ctn = ids()
            effect_pars.append(
                f'<p:par><p:cTn id="{ctn}" presetID="{preset}" presetClass="entr" presetSubtype="{sub}" '
                f'fill="hold" grpId="0" nodeType="withEffect"><p:stCondLst><p:cond delay="{start[st]}"/></p:stCondLst>'
                f'<p:childTnLst>{behaviours(ids, spid, eff, dur)}</p:childTnLst></p:cTn></p:par>'
            )
    group = (
        f'<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>'
        f'<p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
        f'<p:par><p:cTn id="{inner_id}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst>'
        f'<p:childTnLst>{"".join(effect_pars)}</p:childTnLst></p:cTn></p:par>'
        f'</p:childTnLst></p:cTn></p:par>'
    )
    seen, bld = set(), []
    for _, _, spid, is_sp in targets:
        if is_sp and spid not in seen:
            seen.add(spid)
            bld.append(f'<p:bldP spid="{spid}" grpId="0" animBg="1"/>')
    return (
        '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
        '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
        f'{group}</p:childTnLst></p:cTn>'
        '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
        '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
        '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>'
        + (f'<p:bldLst>{"".join(bld)}</p:bldLst>' if bld else "")
        + "</p:timing>"
    )


NAME_RE = re.compile(r"^a(\d+)-([a-z]+)$")


def process_slide(xml: bytes, transition: str) -> bytes:
    root = etree.fromstring(xml)
    targets = []
    for el in root.iterfind(".//p:spTree/*", NS):
        tag = etree.QName(el).localname
        if tag not in ("sp", "pic"):
            continue
        c = el.find(".//p:cNvPr", NS)
        m = NAME_RE.match(c.get("name", ""))
        if m:
            eff = m.group(2)
            if eff not in EFFECTS:
                raise SystemExit(f"unknown effect {eff}")
            targets.append((int(m.group(1)), eff, c.get("id"), tag == "sp"))

    s = xml.decode("utf-8")
    s = s.replace('descr="preencoded.png"', 'descr=""')
    extra = transition + (build_timing(targets) if targets else "")
    anchor = "</p:clrMapOvr>"
    assert s.count(anchor) == 1
    s = s.replace(anchor, anchor + extra)
    return s.encode("utf-8")


def main(src, dst):
    zin = zipfile.ZipFile(src)
    last = max(int(m.group(1)) for m in (re.match(r"ppt/slides/slide(\d+)\.xml$", f) for f in zin.namelist()) if m)
    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            m = re.match(r"ppt/slides/slide(\d+)\.xml$", item.filename)
            if m:
                n = int(m.group(1))
                # dark slides (first/last) fade; content slides push in from the right
                if n in (1, last):
                    tr = '<p:transition spd="slow"><p:fade/></p:transition>'
                else:
                    tr = '<p:transition spd="med"><p:push dir="l"/></p:transition>'
                data = process_slide(data, tr)
            zout.writestr(item, data)
    print("wrote", dst)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
