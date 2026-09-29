# Plakatonas 2026

Posters for **Plakatonas: International Social Inclusion** (Klaipėda). Deadline 9 October 2026, send to plakatonas@kvk.lt.
Only one poster per participant may be submitted (rule 2.1), so pick one of the three designs.

## Design 3: "Even amber came from somewhere else."

| File | What it is |
|---|---|
| `Plakatonas_2026_Amber_A2_print.pdf` | **The entry.** A2 print PDF with the photo in CMYK at 300 ppi |
| `Plakatonas_2026_Amber_preview.jpg` | Optional on-screen preview |
| `render_amber.py` | The 3D scene (Blender/Cycles): amber, wet sand, backwash, sea and sunset sky |
| `make_poster_amber.py` | Converts the render to CMYK (FOGRA39) and lays out the poster |
| `FOGRA39_TAC300.icc` | Print profile built with ArgyllCMS from the FOGRA39 characterisation data, 300% ink limit |

Baltic amber, "Lithuanian gold", formed about 40 million years ago from the resin of forests in
Fennoscandia. The Eridanos river carried it to the sea, and autumn storms still wash it onto
Melnragė and Giruliai beaches in Klaipėda. The most Lithuanian thing there is came from somewhere
else, and nobody asks amber where it's from.

**The picture is a 3D render (CGI), not a photograph.** It was modelled and rendered in Blender:
- 200,000 individual sand grains;
- raw amber with a weathered crust;
- a physically simulated sunset over the sea, since Klaipėda's beaches face west.

If anyone asks, describe it as a 3D render, not as a photo you took.

To rebuild it:

    pip install bpy
    python3 render_amber.py --width 5020 --aspect 1.10235 --samples 40 --strip i 8 --out strips/strip_i.png   # i = 0..7
    python3 make_poster_amber.py --photo strips --icc FOGRA39_TAC300.icc

## Design 2: "It takes two to turn a bridge."

| File | What it is |
|---|---|
| `Plakatonas_2026_Takes-two_A2_print.pdf` | **The entry.** A2 print PDF |
| `Plakatonas_2026_Takes-two_preview.jpg` | Optional on-screen preview |
| `make_poster_bridge.py` | Builds both files: `python3 make_poster_bridge.py` |

Klaipėda's swing bridge (*Pasukamasis / grandinių tiltas*) was built in 1855. It is still turned by hand,
by two people, and it is the only bridge like it in Lithuania. The poster shows two identical figures
turning it together, one labelled *local* and one *international*. They are drawn the same on purpose,
so you can't tell who is who. The call to action is **"Let's turn it together." / "Pasukime kartu."**

Other details:
- Old Town half-timbered houses in the background.
- The chains that gave the bridge its old name, "Chain Bridge".
- The riveted iron deck.

`python3 preflight.py Plakatonas_2026_Takes-two_A2_print.pdf` passes every check listed below.

## Design 1: "Half a flag says nothing."

| File | What it is |
|---|---|
| `Plakatonas_2026_Half-a-flag_A2_print.pdf` | **The entry.** A2 print PDF |
| `Plakatonas_2026_Half-a-flag_preview.jpg` | Optional on-screen preview (RGB, 150 dpi, trimmed) |
| `make_poster.py` | Builds both files: `python3 make_poster.py` |
| `preflight.py` | Checks the PDF against the competition's technical rules |
| `fonts/` | Bricolage Grotesque, IBM Plex Mono and IBM Plex Serif (all SIL Open Font License) |

## The idea

In the International Code of Signals, **flag K (Kilo)** is half yellow and half blue, and it means
**"I wish to communicate with you."** Every ship in the port of Klaipėda reads it the same way,
whatever country it comes from.

The poster sews the flag together from a half *from Klaipėda* and a half *from everywhere else*.
Neither half means anything on its own. The red thread holding them together is the first hello.
The call to action: **Be the other half. / Būk kita pusė.**

Klaipėda also appears in:
- the coordinates in the header;
- a coastal-profile drawing like the ones on nautical charts. It shows the lighthouse, the port cranes and the Smiltynė dunes on the Curonian Spit, with a ship coming in flying K.

Everything on the poster is drawn from scratch, so no third-party images are used (rule 5.2).

## Technical checklist (rules 3.1–3.9)

`python3 preflight.py` reports:

- Trim 420 × 594 mm (A2 portrait); media 425 × 599 mm, i.e. 2.5 mm bleed on every side, with TrimBox and BleedBox set
- All text at least 5 mm inside the trim (the design margin is 30 mm)
- CMYK only: no RGB, no spot/Pantone colours; maximum total ink 202%
- Fonts embedded
- Fully vector, no raster images, so the 300 dpi rule is met at any size
- Smallest text 8.5 pt (minimum 7 pt). All text below 40 pt is 100% black only
- Thinnest line 0.22 mm (minimum 0.08 mm)

## Before sending

- [ ] Have a native speaker check the Lithuanian lines. Design 3: *Net gintaras atkeliavo iš kitur. Niekas neklausia gintaro, iš kur jis.* Design 2: *Tiltą pasuka du.*, *Pasukime kartu.*, *vietinis*, *tarptautinis*. Design 1: *Pusė vėliavos nieko nesako.*, *pusė iš Klaipėdos*, *pusė iš viso pasaulio*, *raudona gija: pirmasis labas*, *Būk kita pusė.*
- [ ] Check the official rules' section on AI use, and declare AI assistance if the rules ask for it
- [ ] Put your name(s) and institution in the email (the poster itself carries no names)
