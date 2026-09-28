# Roomwise

*Working title.* Take one photo of a room. Roomwise measures the room, designs it with real-size furniture at three budgets, and links every piece to a store.

This folder is a working prototype that runs in any modern browser, on a phone or a computer. There's no build step and no server code.

## Run it

ES modules need to be served over HTTP, so opening the file directly won't work. From this folder:

```bash
python3 -m http.server 8000      # or: npx serve .
```

Then open <http://localhost:8000>. Three.js loads from the jsDelivr CDN, and the fonts from Google Fonts.

To try it on your phone, run the server on your computer and open `http://<your-computer's-IP>:8000` on a phone on the same Wi-Fi. "Take a photo" opens the phone camera.

## What it does

1. **Snap**: take or upload a photo of the wall you face when you walk in. Pick the room type: living room, bedroom, home office, dining room or bathroom. A built-in sample room lets anyone try it without a photo.
2. **Measure**: drag four yellow corners onto the back wall, and move the eye-level cross to where the room's edges meet. Roomwise then gives the width, depth, ceiling height and floor area, shown as tape-measure labels on the photo. A magnifier appears under your finger while you drag.
3. **Budget**: three designs priced for this exact room:
   - **Basic**: IKEA, Wayfair, Amazon
   - **Luxury**: West Elm, Crate & Barrel, Pottery Barn
   - **Supreme**: RH, Perigold, Design Within Reach
4. **Design**: the room in 3D with every piece at its real size. You can:
   - **3D room**: a dollhouse view you can orbit a full 360°, or auto-spin with *Turn 360°*. Walls facing you hide themselves, and tall pieces against them turn see-through.
   - **Walk-in 360°**: stand inside the room at eye height and drag to look all the way around. Jump between the doorway, the centre, the far corner and the spot where you took the photo.
   - **In my photo**: the new furniture drawn over your own photo, from the exact spot the phone was.
   - **Tap any piece**: the camera flies to it and the piece is outlined. The panel shows the price, size, materials and finishes, and a *Shop* button. *View in 360°* puts the piece on a turntable with its dimensions.
   - **Swap**: see the same spot at other budgets with the price difference, then swap. Pieces that won't fit are greyed out.
   - **Wall paint**: pick a colour to repaint the walls in 3D and in your photo. Roomwise also works out how many litres or gallons you need and what they cost.
   - **Shopping list**: everything grouped by store, with subtotals and links.

## How the measuring works

The photo is treated as a one-point-perspective view of a box-shaped room. With the lens focal length (read from the photo's EXIF data, or a typical 26 mm phone lens) and one known length (the ceiling height or the back wall's width), similar triangles give the rest:

| Quantity | Formula |
|---|---|
| metres per pixel on the back wall | `s = known length / its length in pixels` |
| wall width and height | `W = w_px · s`, `H = h_px · s` |
| camera distance from the back wall | `f_px · s` |
| room depth | camera distance + space between you and the wall behind you |
| camera height (used as a sanity check) | `(floor line − eye level) · s` |

The sample room was rendered with known dimensions (4.20 × 4.30 m, 2.60 m ceiling), and the tool gives back exactly those numbers. On real photos, expect roughly 5–10% error, depending on how level the phone was and how accurate the known length is. The production app should scan with LiDAR (see the roadmap).

## Code map

| File | What it does |
|---|---|
| `index.html`, `css/app.css` | App shell and design tokens (light and dark themes) |
| `js/main.js` | Step flow, panels, swaps, paint, shopping list |
| `js/measure.js` | Perspective maths, the draggable measuring overlay, photo-camera matching |
| `js/photo.js` | Photo loading, EXIF focal-length reader, wall colour sampling |
| `js/layout.js` | Layout engine: room recipes, collision checks, clearances, "does it fit" |
| `js/catalog.js` | Stores, budget tiers, about 90 products with real dimensions and typical prices, paint |
| `js/models.js` | Procedural 3D furniture (about 30 kinds, each in three tier styles) |
| `js/textures.js` | Generated wood, marble, rugs and artwork |
| `js/scene.js` | Three.js stage: dollhouse, walk-in 360°, photo overlay with paint shader, selection, turntable |
| `js/sampleRoom.js` | Renders the built-in sample photo |

## What is prototype-grade

- **Products** are representative pieces with real-world dimensions and typical prices. *Shop* opens a search for that kind of piece at the store. Real SKUs, live prices and stock need a product feed (see below).
- **3D models** are built from code, so everything loads instantly with no assets. Retailers' own GLB/USDZ models can replace them one category at a time through `buildModel()`.
- **Windows and doors** aren't detected yet, so a piece can end up in front of a window.
- **"In my photo"** draws new furniture over the photo, but the old furniture is still visible behind it.

## Roadmap to a production app

1. **Accurate scanning.** Build native iOS and Android apps, for example React Native or Flutter with native modules. On iPhones with LiDAR, Apple's RoomPlan gives centimetre-accurate walls plus windows, doors and existing furniture. On Android, use ARCore's Depth API. Keep this photo method as the fallback for everything else.
2. **Automatic corners.** A room-layout model can place the four corners and the eye-level point automatically, so the user only confirms them.
3. **Photoreal results.** Empty the room with AI inpainting, then render the design photorealistically using a diffusion model guided by the room's depth and layout, and by the chosen products' images.
4. **Real catalog.** Product feeds through affiliate networks and retailer programs (Amazon, Wayfair and Perigold, IKEA, West Elm and Williams-Sonoma, RH), with 3D models where stores provide them. Rank products by budget, style and fit.
5. **Accounts and sharing.** Saved rooms, share links, a before/after slider, and quotes for delivery and assembly.
6. **Revenue.** Affiliate commission on every purchase (commonly 3–10%), paid design consultations, and sponsored placements for retailers.
