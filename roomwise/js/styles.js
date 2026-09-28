// Design concepts. A style decides everything that isn't the product itself: colours,
// wall treatment, floor, curtains, rug, art, textiles, decor and the lighting mood.
// The budget tier decides which products are bought; the style decides how they are dressed.

export const STYLES = [
  {
    id: 'japandi',
    name: 'Japandi Calm',
    tagline: 'Pale oak, linen and paper light',
    story: 'Japanese restraint meets Scandinavian warmth. Low, simple pieces in pale oak and linen sit on a calm, earthy palette, with one sculptural branch in a stoneware vase. With so little visual noise the room feels bigger, quieter and easy to keep tidy.',
    palette: [
      { role: 'wall', name: 'Rice paper', hex: '#ebe6dc' },
      { role: 'main', name: 'Oat linen', hex: '#d3c8b4' },
      { role: 'accent', name: 'Moss', hex: '#7b8766' },
      { role: 'deep', name: 'Charcoal', hex: '#3a3733' },
      { role: 'wood', name: 'Natural oak', hex: '#c9a878' },
    ],
    metal: '#2b2b2b', stone: '#e3dccf',
    walls: { color: '#ebe6dc', finish: 'limewash', feature: 'slats', featureColor: '#c9a878', crown: false },
    floor: { type: 'plank', tone: '#d4b690' },
    curtains: { color: '#eee8dd', fabric: 'linen', sheer: true },
    rug: { pattern: 'jute', color: '#b99a70' },
    art: { style: 'line', color: '#8c9b7a' },
    textiles: { pillows: ['#d3c8b4', '#7b8766', '#efe9df', '#3a3733'], throw: '#b8aa92', throwKnit: false, bedding: '#efeae2', sheet: '#f7f4ee' },
    decor: { vase: 'branch', ceramic: '#d8d0c3', dark: '#3a3733', books: ['#d6ccb9', '#3a3733', '#7d8a6a', '#efe9df', '#b8a58a'], flowers: null },
    plant: 'olive',
    lampWarmth: '#ffd9a8',
    notes: ['Low furniture keeps the eye line down, so the ceiling feels higher.', 'Natural materials repeat three times: oak, linen and stoneware.', 'A single oak slat wall gives texture without adding colour.'],
  },
  {
    id: 'organic',
    name: 'Modern Organic',
    tagline: 'Curves, bouclé and clay tones',
    story: 'Soft curves, nubby bouclé and sun-baked clay colours make the room feel warm and hand-made. Travertine and wood bring nature indoors, and a limewashed arch painted behind the main piece gives the wall a gentle focal point.',
    palette: [
      { role: 'wall', name: 'Warm linen', hex: '#e6dccb' },
      { role: 'main', name: 'Ivory bouclé', hex: '#e8e1d4' },
      { role: 'accent', name: 'Terracotta', hex: '#b5654a' },
      { role: 'deep', name: 'Olive', hex: '#5f6445' },
      { role: 'wood', name: 'Honey oak', hex: '#b88b58' },
    ],
    metal: '#b8925a', stone: '#e3d6c1',
    walls: { color: '#e6dccb', finish: 'limewash', feature: 'arch', featureColor: '#d2a488', crown: false },
    floor: { type: 'plank', tone: '#c49a6a' },
    curtains: { color: '#e9dfcf', fabric: 'linen', sheer: false },
    rug: { pattern: 'beni', color: '#a39279' },
    art: { style: 'landscape', color: '#c48a6c' },
    textiles: { pillows: ['#e8e1d4', '#b5654a', '#c9a27a', '#5f6445'], throw: '#c98f6f', throwKnit: true, bedding: '#efe7da', sheet: '#f6f1e8' },
    decor: { vase: 'pampas', ceramic: '#c9a58a', dark: '#5f6445', books: ['#e8e1d4', '#b5654a', '#5f6445', '#c9a27a', '#8c6b52'], flowers: null },
    plant: 'fig',
    lampWarmth: '#ffd29a',
    notes: ['Rounded shapes soften a boxy room and make it safer to move around.', 'Terracotta repeats in the cushions, the throw and the art so the eye travels round the room.', 'The painted arch frames the main piece without any building work.'],
  },
  {
    id: 'parisian',
    name: 'Parisian Classic',
    tagline: 'Wall mouldings, herringbone and brass',
    story: 'An apartment in the 7th arrondissement: white walls dressed with picture-frame mouldings, a herringbone floor, a gilded mirror and one elegant velvet piece. Classic architecture with modern furniture is what makes Parisian rooms feel effortless.',
    palette: [
      { role: 'wall', name: 'Chalk', hex: '#efece6' },
      { role: 'main', name: 'Dusty blue velvet', hex: '#6f8193' },
      { role: 'accent', name: 'Blush', hex: '#d4aaa0' },
      { role: 'deep', name: 'Ink', hex: '#2a2f3a' },
      { role: 'wood', name: 'Aged oak', hex: '#9a7650' },
    ],
    metal: '#c4a060', stone: '#f1ede6',
    walls: { color: '#efece6', finish: 'matte', feature: 'moulding', featureColor: '#efece6', crown: true },
    floor: { type: 'herringbone', tone: '#b48a5c' },
    curtains: { color: '#f3efe8', fabric: 'linen', sheer: false },
    rug: { pattern: 'medallion', color: '#7a8aa0' },
    art: { style: 'abstract', color: '#c9a06a' },
    textiles: { pillows: ['#d4aaa0', '#efe9df', '#6f8193', '#c4a060'], throw: '#e9e2d6', throwKnit: false, bedding: '#f5f2ec', sheet: '#ffffff' },
    decor: { vase: 'flowers', ceramic: '#f2efe9', dark: '#2a2f3a', books: ['#efe9df', '#2a2f3a', '#d4aaa0', '#6f8193', '#c9b89a'], flowers: '#f4f0ea' },
    plant: 'fig',
    lampWarmth: '#ffe0b3',
    notes: ['Mouldings add architecture, so a plain rental reads as a period apartment.', 'Curtains hang from just below the ceiling to the floor, which makes the windows look taller.', 'One piece of brass per zone keeps the gold accents intentional.'],
  },
  {
    id: 'moody',
    name: 'Dark & Moody',
    tagline: 'Deep green walls, velvet and walnut',
    story: 'Rich, cocooning and made for evenings. Deep green walls wrap the room, walnut and velvet add depth, and warm pools of lamplight replace a bright ceiling light. Dark walls blur the corners, which paradoxically makes small rooms feel larger.',
    palette: [
      { role: 'wall', name: 'Forest', hex: '#34483d' },
      { role: 'main', name: 'Cognac', hex: '#8a4e2b' },
      { role: 'accent', name: 'Ochre', hex: '#c99a47' },
      { role: 'deep', name: 'Walnut', hex: '#4a3222' },
      { role: 'wood', name: 'Walnut', hex: '#5b3d25' },
    ],
    metal: '#c4a060', stone: '#2c2c2c',
    walls: { color: '#34483d', finish: 'matte', feature: 'wainscot', featureColor: '#2c3d33', crown: true },
    floor: { type: 'chevron', tone: '#7a5433' },
    curtains: { color: '#2f4237', fabric: 'velvet', sheer: false },
    rug: { pattern: 'medallion', color: '#7c3a2c' },
    art: { style: 'oil', color: '#8a2f2a' },
    textiles: { pillows: ['#c99a47', '#8a4e2b', '#6e2b25', '#e3d6bf'], throw: '#6e2b25', throwKnit: true, bedding: '#d9cfbd', sheet: '#ece5d8' },
    decor: { vase: 'branch', ceramic: '#1f1f1f', dark: '#1f1f1f', books: ['#6e2b25', '#c99a47', '#2c3d33', '#1f1f1f', '#8a4e2b'], flowers: null },
    plant: 'fig',
    lampWarmth: '#ffc98a',
    notes: ['Painting walls, skirting and panelling one colour blurs the edges of a small room.', 'Several low lamps give warm pools of light, which feels cosier than one ceiling light.', 'Walnut, cognac leather and brass add three warm tones against the green.'],
  },
  {
    id: 'coastal',
    name: 'Bright Coastal',
    tagline: 'White, sand, sky blue and rattan',
    story: 'Airy and easy-going, like a house by the sea. White walls with beadboard panelling, washed oak floors, sky-blue textiles and natural rattan keep everything light and fresh. It photographs brilliantly, which makes it a favourite for holiday rentals.',
    palette: [
      { role: 'wall', name: 'Sea salt', hex: '#f1efe9' },
      { role: 'main', name: 'Sand', hex: '#e2d6c1' },
      { role: 'accent', name: 'Sky blue', hex: '#7ea3be' },
      { role: 'deep', name: 'Navy', hex: '#2e4058' },
      { role: 'wood', name: 'Washed oak', hex: '#d8c3a0' },
    ],
    metal: '#d2d0c8', stone: '#f0ede6',
    walls: { color: '#f1efe9', finish: 'matte', feature: 'beadboard', featureColor: '#f6f4ef', crown: false },
    floor: { type: 'plank', tone: '#dcc6a4' },
    curtains: { color: '#fbfaf6', fabric: 'linen', sheer: true },
    rug: { pattern: 'stripe', color: '#7ea3be' },
    art: { style: 'photo', color: '#7ea3be' },
    textiles: { pillows: ['#7ea3be', '#f1efe9', '#2e4058', '#e2d6c1'], throw: '#dfe7ec', throwKnit: true, bedding: '#fbfaf6', sheet: '#ffffff' },
    decor: { vase: 'flowers', ceramic: '#f3f1ec', dark: '#2e4058', books: ['#7ea3be', '#f1efe9', '#2e4058', '#e2d6c1', '#c9b89a'], flowers: '#ffffff' },
    plant: 'snake',
    lampWarmth: '#ffe4c0',
    notes: ['White walls and sheer curtains bounce daylight deep into the room.', 'Blue repeats in the rug, cushions and art, so the palette feels planned.', 'Wipe-clean, washable textiles make it practical for guests and families.'],
  },
];

export const styleById = (id) => STYLES.find((s) => s.id === id) ?? STYLES[0];
export const paletteHex = (style, role) => style.palette.find((p) => p.role === role)?.hex;

// Pick the finish of a product that best matches the style.
const ROLE_BY_MATERIAL = {
  fabric: 'main', velvet: 'main', boucle: 'main', leather: 'main', linen: 'main',
  wood: 'wood', laminate: 'wood', lacquer: 'deep',
  marble: 'stone', stone: 'stone', ceramic: 'ceramic', alabaster: 'stone',
  metal: 'metal', paper: 'main', rug: 'rug', art: 'art',
};

function colorDist(a, b) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
}

const ROLE_BY_CAT = { armchair: 'accent', bench: 'accent', pillows: 'accent', throw: 'accent', bedding: 'main', curtains: 'wall', towels: 'main', bathMat: 'main' };

export function styleFinish(product, style, roleOverride) {
  if (product.finishes.length < 2) return 0;
  const role = roleOverride ?? ROLE_BY_CAT[product.cat] ?? ROLE_BY_MATERIAL[product.model.main] ?? 'main';
  const target = role === 'metal' ? style.metal
    : role === 'stone' ? style.stone
      : role === 'ceramic' ? style.decor.ceramic
        : role === 'rug' ? style.rug.color
          : role === 'art' ? style.art.color
            : paletteHex(style, role) ?? paletteHex(style, 'main');
  let best = 0, bestD = Infinity;
  product.finishes.forEach((f, i) => { const d = colorDist(f.color, target); if (d < bestD) { bestD = d; best = i; } });
  return best;
}

// Real products that suit each style. The layout engine tries these first when they fit.
const PICKS = {
  japandi: ['ikea-lohals', 'ikea-sinnerlig', 'ikea-ginstmott', 'ikea-vallkrassing', 'article-jokuna-media', 'article-hurley-rug', 'article-todd-lamp', 'article-amoeba-coffee', 'target-mcgee-landscape', 'dwr-jude-rug', 'dwr-platform-bench', 'dwr-string-shelving'],
  organic: ['ikea-lohals', 'article-gabriola-chair', 'article-gabriola-pillows', 'article-hira-rug', 'article-amoeba-coffee', 'article-suru-pendant', 'article-moon-lamp', 'target-olive-tree', 'article-meron-mirror', 'target-mcgee-canvas'],
  parisian: ['article-gemma-pendant', 'article-lenia-coffee', 'article-moon-lamp', 'target-mcgee-canvas', 'ikea-lindbyn-80', 'dwr-saarinen-side', 'article-hira-rug', 'ikea-arstid-table', 'ikea-arstid-floor'],
  moody: ['article-gemma-pendant', 'article-todd-lamp', 'article-felix-media', 'article-lenia-coffee', 'article-jadara-throw', 'ikea-vilborg', 'target-mcgee-landscape'],
  coastal: ['ikea-tiphede', 'ikea-sinnerlig', 'article-suru-pendant', 'article-meron-mirror', 'article-hurley-rug', 'target-mcgee-landscape', 'ikea-ginstmott', 'target-linen-panel'],
};
export const stylePicks = (style) => new Set(style ? PICKS[style.id] ?? [] : []);
