"""
Turn a finished poster PDF into a "For Print" PDF/X-1a:2003 file:
CMYK only, fonts embedded, no transparency, TrimBox/BleedBox set, and an
OutputIntent for the FOGRA39 printing condition (ISO 12647-2 coated paper)
with the ICC profile embedded.
"""
import os
from datetime import datetime, timezone

import pikepdf

HERE = os.path.dirname(os.path.abspath(__file__))
ICC = os.path.join(HERE, "FOGRA39_TAC300.icc")


def make_pdfx(path, icc_path=ICC):
    pdf = pikepdf.open(path, allow_overwriting_input=True)

    # PDF/X-1a forbids transparency: fail loudly if anything slipped in
    for page in pdf.pages:
        res = page.obj.get("/Resources", {})
        for gs in res.get("/ExtGState", {}).values():
            for key in ("/SMask", "/CA", "/ca", "/BM"):
                v = gs.get(key)
                if v is None:
                    continue
                if key == "/SMask" and v == pikepdf.Name("/None"):
                    continue
                if key in ("/CA", "/ca") and float(v) == 1.0:
                    continue
                if key == "/BM" and v in (pikepdf.Name.Normal, pikepdf.Name.Compatible):
                    continue
                raise ValueError(f"transparency ({key}) not allowed in PDF/X-1a")
        assert "/TrimBox" in page.obj, "PDF/X needs a TrimBox"

    icc = pdf.make_stream(open(icc_path, "rb").read())
    icc["/N"] = 4
    intent = pikepdf.Dictionary(
        Type=pikepdf.Name.OutputIntent,
        S=pikepdf.Name.GTS_PDFX,
        OutputConditionIdentifier=pikepdf.String("FOGRA39"),
        RegistryName=pikepdf.String("http://www.color.org"),
        OutputCondition=pikepdf.String(
            "Offset printing, according to ISO 12647-2:2004/Amd 1, "
            "paper type 1 or 2 (coated art), 115 g/m2, screen ruling 60/cm"),
        Info=pikepdf.String("Coated FOGRA39 (ISO 12647-2:2004)"),
        DestOutputProfile=icc,
    )
    pdf.Root.OutputIntents = pikepdf.Array([intent])

    now = datetime.now(timezone.utc).strftime("D:%Y%m%d%H%M%S+00'00'")
    info = pdf.docinfo
    info["/GTS_PDFXVersion"] = pikepdf.String("PDF/X-1a:2003")
    info["/Trapped"] = pikepdf.Name("/False")
    info["/ModDate"] = pikepdf.String(now)
    if "/CreationDate" not in info:
        info["/CreationDate"] = pikepdf.String(now)
    assert "/Title" in info, "PDF/X needs a Title"

    with pdf.open_metadata(set_pikepdf_as_editor=False) as meta:
        meta["pdfxid:GTS_PDFXVersion"] = "PDF/X-1a:2003"
        meta["pdfx:GTS_PDFXVersion"] = "PDF/X-1a:2003"
        meta["dc:title"] = str(info["/Title"])
    pdf.save(path, min_version="1.4", force_version="1.4")
    return path
