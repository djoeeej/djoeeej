# Roomwise

*Working title.* Take one photo of a room. Roomwise measures it, designs it at three budgets with real, linked products (furniture, lighting, cushions, curtains and all), and shows it in 3D, day or night, or as a photo-real render. For homes, apartments and Airbnbs.

This folder is a working prototype that runs in any modern browser, on a phone or a computer. There's no build step and no server code.

## Run it

ES modules need to be served over HTTP, so opening the file directly won't work. From this folder:

```bash
python3 -m http.server 8000      # or: npx serve .
```

Then open <http://localhost:8000>. Three.js, the path tracer and the sky images load from the jsDelivr CDN, and the fonts from Google Fonts.

To try it on your phone, run the server on your computer and open `http://<your-computer's-IP>:8000` on a phone on the same Wi-Fi. "Take a photo" opens the phone camera.

## What it does

1. **Snap**: take or upload a photo of the wall you face when you walk in. Pick the room type (living room, bedroom, studio apartment, home office, dining room or bathroom) and who it's for: your home, or an Airbnb or rental. A built-in sample room lets anyone try it without a photo.
2. **Measure**: drag four yellow corners onto the back wall, and move the eye-level cross to where the room's edges meet. Roomwise gives the width, depth, ceiling height and floor area. Mark the **windows and doors** too: furniture keeps a 95 cm path clear in front of doors, tall pieces stay out of the light, and curtains hang on every window.
3. **Budget**: pick a **design concept** (Japandi Calm, Modern Organic, Parisian Classic, Dark & Moody, Bright Coastal), then one of three designs priced for this exact room:
   - **Basic**: the cheapest well-reviewed IKEA, Walmart and Target pieces that are sold today. In the sample room a whole living room comes to about $600, a dining room about $260, a home office about $300.
   - **Luxury**: Article (solid walnut, bouclé, wool), styled with Target textiles.
   - **Supreme**: Design Within Reach: authentic Herman Miller, Flos, Artemide and Carl Hansen classics.
4. **Design**: the room in 3D, every piece a real product at its real size, dressed with cushions, throws, bedding, curtains, towels and styling props so it looks lived in.
   - **3D room**, **Walk-in 360°** and **In my photo** views, *Turn 360°*, and viewpoints (doorway, centre, far corner, where you stood).
   - **Day and Evening**: sunlight through your windows by day; lamps, pendants and shades that really light the room at night.
   - **Real photo**: path-traces the current view (true soft shadows and light bouncing between surfaces) and shows it as a picture you can press and hold to save.
   - **Design notes**: the concept's story, colour palette and why the layout works, using the room's real numbers (clearances, rug size, light layers, floor coverage).
   - **Another idea**: redesign the same room in the next concept.
   - **Tap any piece** (a cushion or curtain too): the camera flies to it, and the panel shows why it was chosen, its rating, size, materials, colours, a *Shop* button that goes straight to the product page, and when that link was last checked.
   - **Not in the box**: bulbs, cushion inserts, curtain rods and mattresses are listed as add-ons with their own links, and counted in the total. Untick any you don't need.
   - **I already have this**: keep a piece in the design but leave it out of the total.
   - **Swap** to the same spot at other budgets, or **add** suggested extras (in Basic, nice-to-haves like a bookcase are offered, not included).
   - **Wall paint** in 3D and on your photo, with litres or gallons and cost (windows and doors left out).
   - **Shopping list** grouped by store, with add-ons and link checks.
   - **Airbnb tab**: how many it sleeps, a guest-essentials checklist and how many nights of bookings pay the design back.
   - **My project**: add several rooms and see the whole home's total by store.

## Real products and checked links

Every product in `js/catalog.js` is a real product with a direct product-page link (per colour where the store has one), its size and the price seen when it was researched. `tools/check-links.mjs` opens every link in a real Chromium browser on GitHub's servers (`.github/workflows/check-links.yml`, on every catalog change and weekly), reads the product name and price from the page, and fails the run if a link is broken or redirects away from the product. `tools/discover.mjs` searches the stores live to find current replacements when a product is retired. `tools/make-verified.mjs` turns the reports into `js/verified.js`; the app uses those live prices and shows the check date on every piece.

Design Within Reach and Walmart block automated browsers, so their links come from the stores' own listings and are marked that way in the app.

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
| `js/main.js` | Step flow, concepts, openings, panels, swaps, add-ons, paint, shopping list, Airbnb, project |
| `js/measure.js` | Perspective maths, the draggable measuring overlay, photo-camera matching |
| `js/photo.js` | Photo loading, EXIF focal-length reader, wall colour sampling |
| `js/layout.js` | Layout engine: room recipes, ranking by purpose, style and price, doors and windows, textiles |
| `js/catalog.js` | Real products with links, sizes, prices, add-ons; live prices from `verified.js` |
| `js/styles.js` | The five design concepts: palettes, walls, floors, textiles, favourite products, notes |
| `js/room.js` | Room shell: walls with window and door openings, skirting, mouldings, feature walls, curtains |
| `js/models.js`, `js/decor.js`, `js/geometry.js` | Procedural furniture, soft cushions and draped textiles, styling props |
| `js/textures.js` | Generated wood, floors, fabric normal maps, marble, rugs and artwork |
| `js/scene.js` | Three.js stage: lighting moods, ambient occlusion, path-traced Real photo, views, selection |
| `js/sampleRoom.js` | Renders the built-in sample photo |
| `tools/` | Link checker, live product discovery, `verified.js` generator |

## What is prototype-grade

- **3D models** are built from code, so everything loads instantly with no assets. They match each product's size, shape family and colours, not every detail. Retailers' own GLB/USDZ models can replace them one category at a time through `buildModel()`.
- **Prices** move. The app shows the price the checker last saw and the date; the store's page is always the final word.
- **Real photo** needs a GPU: a laptop renders it in seconds, older phones take longer and use fewer light samples.
- **"In my photo"** draws new furniture over the photo, but the old furniture is still visible behind it.

## Roadmap to a production app

1. **Accurate scanning.** Build native iOS and Android apps, for example React Native or Flutter with native modules. On iPhones with LiDAR, Apple's RoomPlan gives centimetre-accurate walls plus windows, doors and existing furniture. On Android, use ARCore's Depth API. Keep this photo method as the fallback for everything else.
2. **Automatic corners.** A room-layout model can place the four corners and the eye-level point automatically, so the user only confirms them.
3. **Photoreal results.** Empty the room with AI inpainting, then render the design photorealistically using a diffusion model guided by the room's depth and layout, and by the chosen products' images.
4. **Real catalog.** Product feeds through affiliate networks and retailer programs (Amazon, Wayfair and Perigold, IKEA, West Elm and Williams-Sonoma, RH), with 3D models where stores provide them. Rank products by budget, style and fit.
5. **Accounts and sharing.** Saved rooms, share links, a before/after slider, and quotes for delivery and assembly.
6. **Revenue.** Affiliate commission on every purchase (commonly 3–10%), paid design consultations, and sponsored placements for retailers.
