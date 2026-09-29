"""Add slide transitions and entrance animations to the pptxgenjs output.

Shapes named "A<step>_<effect>" by build.js animate on entry, in step order.
Every effect is "With Previous" with a staggered delay, so each slide's
choreography plays automatically when the slide appears — no extra clicks.
"""
import re
import sys
import zipfile

SRC, DST = sys.argv[1], sys.argv[2]

STAGGER_MS = 220
DUR = {"fade": 600, "float": 700, "zoom": 500, "wipe": 700}
# presetID / presetSubtype PowerPoint uses for each entrance effect
PRESET = {"fade": (10, 0), "float": (42, 0), "zoom": (53, 16), "wipe": (22, 8)}

SHAPE_RE = re.compile(
    r'<p:(sp|pic)>\s*<p:nv(?:Sp|Pic)Pr>\s*<p:cNvPr id="(\d+)" name="A(\d+)_(\w+)"'
)


class Ids:
    def __init__(self):
        self.n = 0

    def __call__(self):
        self.n += 1
        return self.n


def tgt(spid):
    return f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'


def visible(ids, spid):
    return (
        f'<p:set><p:cBhvr><p:cTn id="{ids()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
        f'{tgt(spid)}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
        f'<p:to><p:strVal val="visible"/></p:to></p:set>'
    )


def effect(ids, spid, filt, dur):
    return (
        f'<p:animEffect transition="in" filter="{filt}"><p:cBhvr>'
        f'<p:cTn id="{ids()}" dur="{dur}"/>{tgt(spid)}</p:cBhvr></p:animEffect>'
    )


def anim(ids, spid, attr, frm, to, dur):
    def val(v):
        return f'<p:fltVal val="{v}"/>' if isinstance(v, (int, float)) else f'<p:strVal val="{v}"/>'

    return (
        f'<p:anim calcmode="lin" valueType="num"><p:cBhvr>'
        f'<p:cTn id="{ids()}" dur="{dur}" fill="hold"/>{tgt(spid)}'
        f'<p:attrNameLst><p:attrName>{attr}</p:attrName></p:attrNameLst></p:cBhvr>'
        f'<p:tavLst><p:tav tm="0"><p:val>{val(frm)}</p:val></p:tav>'
        f'<p:tav tm="100000"><p:val>{val(to)}</p:val></p:tav></p:tavLst></p:anim>'
    )


def behaviours(ids, spid, fx):
    d = DUR[fx]
    parts = [visible(ids, spid)]
    if fx == "fade":
        parts.append(effect(ids, spid, "fade", d))
    elif fx == "float":
        parts.append(effect(ids, spid, "fade", d))
        parts.append(anim(ids, spid, "ppt_x", "#ppt_x", "#ppt_x", d))
        parts.append(anim(ids, spid, "ppt_y", "#ppt_y+.06", "#ppt_y", d))
    elif fx == "zoom":
        parts.append(anim(ids, spid, "ppt_w", 0, "#ppt_w", d))
        parts.append(anim(ids, spid, "ppt_h", 0, "#ppt_h", d))
        parts.append(effect(ids, spid, "fade", d))
    elif fx == "wipe":
        parts.append(effect(ids, spid, "wipe(right)", d))
    else:
        raise ValueError(fx)
    return "".join(parts)


def timing(shapes):
    ids = Ids()
    root, seq, click, grp = ids(), ids(), ids(), ids()
    steps = sorted({s[2] for s in shapes})
    delay_of = {st: i * STAGGER_MS for i, st in enumerate(steps)}
    effects = []
    for kind, spid, step, fx in sorted(shapes, key=lambda s: s[2]):
        pid, sub = PRESET[fx]
        effects.append(
            f'<p:par><p:cTn id="{ids()}" presetID="{pid}" presetClass="entr" presetSubtype="{sub}" '
            f'fill="hold" grpId="0" nodeType="withEffect">'
            f'<p:stCondLst><p:cond delay="{delay_of[step]}"/></p:stCondLst>'
            f'<p:childTnLst>{behaviours(ids, spid, fx)}</p:childTnLst></p:cTn></p:par>'
        )
    bld = "".join(
        f'<p:bldP spid="{spid}" grpId="0" animBg="1"/>'
        for spid in dict.fromkeys(s[1] for s in shapes if s[0] == "sp")
    )
    return (
        f'<p:timing><p:tnLst><p:par><p:cTn id="{root}" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
        f'<p:seq concurrent="1" nextAc="seek"><p:cTn id="{seq}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
        f'<p:par><p:cTn id="{click}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>'
        f'<p:cond evt="onBegin" delay="0"><p:tn val="{seq}"/></p:cond></p:stCondLst><p:childTnLst>'
        f'<p:par><p:cTn id="{grp}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
        f'{"".join(effects)}'
        f'</p:childTnLst></p:cTn></p:par>'
        f'</p:childTnLst></p:cTn></p:par>'
        f'</p:childTnLst></p:cTn>'
        f'<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
        f'<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
        f'</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>'
        f'<p:bldLst>{bld}</p:bldLst></p:timing>'
    )


def transition(n, last):
    # dark bookends fade slowly; content slides use a quicker smooth fade
    if n == 1 or n == last:
        return '<p:transition spd="slow"><p:fade/></p:transition>'
    return '<p:transition spd="med"><p:fade/></p:transition>'


zin = zipfile.ZipFile(SRC)
slide_names = sorted(
    (n for n in zin.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)),
    key=lambda n: int(re.search(r"(\d+)", n.rsplit("/", 1)[1]).group(1)),
)
last = len(slide_names)
with zipfile.ZipFile(DST, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename in slide_names:
            xml = data.decode("utf-8")
            n = int(re.search(r"slide(\d+)\.xml", item.filename).group(1))
            shapes = [(k, int(i), int(st), fx) for k, i, st, fx in SHAPE_RE.findall(xml)]
            extra = transition(n, last) + (timing(shapes) if shapes else "")
            assert xml.count("</p:clrMapOvr>") == 1
            xml = xml.replace("</p:clrMapOvr>", "</p:clrMapOvr>" + extra)
            print(f"slide {n}: {len(shapes)} animated shapes, {len({s[2] for s in shapes})} steps")
            data = xml.encode("utf-8")
        zout.writestr(item, data)
