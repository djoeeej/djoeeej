// Product catalog for the prototype.
//
// Every piece has real-world dimensions (cm), a typical retail price (USD) and a store.
// "Shop" links open a search for that kind of piece at the store, so they never go stale.
// In production this file is replaced by a product feed (affiliate networks, retailer APIs)
// with exact SKUs, live prices, stock and GLB/USDZ 3D models. See README.md.

export const RETAILERS = {
  ikea: { name: 'IKEA', search: (q) => `https://www.ikea.com/us/en/search/?q=${q}` },
  wayfair: { name: 'Wayfair', search: (q) => `https://www.wayfair.com/keyword.php?keyword=${q}` },
  amazon: { name: 'Amazon', search: (q) => `https://www.amazon.com/s?k=${q}` },
  homedepot: { name: 'The Home Depot', search: (q) => `https://www.homedepot.com/s/${q}` },
  westelm: { name: 'West Elm', search: (q) => `https://www.westelm.com/search/results.html?words=${q}` },
  crate: { name: 'Crate & Barrel', search: (q) => `https://www.crateandbarrel.com/search?query=${q}` },
  potterybarn: { name: 'Pottery Barn', search: (q) => `https://www.potterybarn.com/search/results.html?words=${q}` },
  rh: { name: 'RH', search: (q) => `https://rh.com/search/results.jsp?query=${q}` },
  perigold: { name: 'Perigold', search: (q) => `https://www.perigold.com/keyword.php?keyword=${q}` },
  dwr: { name: 'Design Within Reach', search: (q) => `https://www.dwr.com/search?q=${q}` },
};

export const TIERS = [
  {
    id: 'basic', name: 'Basic', sign: '$', tagline: 'Smart and affordable',
    blurb: 'Flat-pack favourites from IKEA, Wayfair and Amazon. Laminate, cotton and powder-coated steel.',
    swatches: ['#d9c09a', '#e9e6df', '#9a9d9a', '#2a2a2a'],
  },
  {
    id: 'luxury', name: 'Luxury', sign: '$$', tagline: 'Designer pieces',
    blurb: 'West Elm, Crate & Barrel and Pottery Barn. Solid wood, performance velvet and brass.',
    swatches: ['#7a5230', '#6f8193', '#b8925a', '#e8e2d6'],
  },
  {
    id: 'supreme', name: 'Supreme', sign: '$$$', tagline: 'Collector grade',
    blurb: 'RH, Perigold and Design Within Reach. Marble, leather, bouclé and sculptural lighting.',
    swatches: ['#e6e0d4', '#43301f', '#caa55e', '#6e2b25'],
  },
];

export const TIER_RANK = { basic: 0, luxury: 1, supreme: 2 };

// Secondary materials each tier uses for legs, frames, pulls and accessories.
export const TIER_KIT = {
  basic: { wood: '#d9c09a', metal: '#2b2b2b', metalKind: 'black', accent: '#c7b79a', textile: '#e7e2d8', stone: '#e9e6df' },
  luxury: { wood: '#7a5230', metal: '#b8925a', metalKind: 'brass', accent: '#b98a5e', textile: '#e8e2d6', stone: '#ece6da' },
  supreme: { wood: '#43301f', metal: '#caa55e', metalKind: 'brass', accent: '#6e2b25', textile: '#efe9df', stone: '#e3d6c1' },
};

export const CATEGORY_LABEL = {
  sofa: 'Sofa', armchair: 'Armchair', coffeeTable: 'Coffee table', sideTable: 'Side table', rug: 'Rug',
  mediaUnit: 'Media console', floorLamp: 'Floor lamp', plant: 'Plant', bookcase: 'Bookcase', wallArt: 'Wall art',
  ceilingLight: 'Ceiling light', bed: 'Bed', nightstand: 'Nightstand', tableLamp: 'Table lamp', dresser: 'Dresser',
  wardrobe: 'Wardrobe', bench: 'Bench', desk: 'Desk', officeChair: 'Desk chair', vanity: 'Vanity',
  mirror: 'Mirror', bathtub: 'Bathtub', toilet: 'Toilet', towelRack: 'Towel ladder', bathMat: 'Bath mat',
  tallCabinet: 'Tall cabinet', diningTable: 'Dining table', diningChair: 'Dining chair', sideboard: 'Sideboard',
};

const PRODUCTS = [];
const BY_ID = new Map();

// p(category, tier, idSuffix, name, store, price, [w, d, h] in cm, material, finishes, model, searchQuery)
function p(cat, tier, suffix, name, store, price, dims, material, finishes, model = {}, query = name) {
  const id = `${cat}.${tier}${suffix ? '.' + suffix : ''}`;
  const product = {
    id, cat, tier, name, store, price, dims, material,
    finishes: finishes.map(([n, c]) => ({ name: n, color: c })),
    model: { kind: cat, v: tier, ...model },
    query,
  };
  PRODUCTS.push(product);
  BY_ID.set(id, product);
}

const WOOD_LIGHT = [['Birch', '#d9c09a'], ['White', '#ecebe6'], ['Black-brown', '#3b3129']];
const WOOD_MID = [['Walnut', '#7a5230'], ['Natural oak', '#b58a5a'], ['Smoked oak', '#5b4636']];
const WOOD_DARK = [['Dark walnut', '#43301f'], ['Ebonised oak', '#26211d'], ['Cerused oak', '#a89479']];

// ---- living room ----------------------------------------------------------------
p('sofa', 'basic', '', 'Three-seat fabric sofa', 'ikea', 549, [210, 88, 83], 'Cotton-polyester blend, solid pine frame',
  [['Oat', '#cfc6b4'], ['Ash grey', '#9a9d9a'], ['Moss', '#7d8a6a']], { main: 'fabric', seats: 3 }, '3 seat sofa');
p('sofa', 'basic', 'compact', 'Two-seat fabric loveseat', 'ikea', 399, [158, 88, 83], 'Cotton-polyester blend, solid pine frame',
  [['Oat', '#cfc6b4'], ['Ash grey', '#9a9d9a'], ['Moss', '#7d8a6a']], { main: 'fabric', seats: 2 }, 'loveseat');
p('sofa', 'luxury', '', 'Deep-seat velvet sofa', 'westelm', 2199, [226, 99, 80], 'Performance velvet, kiln-dried hardwood, walnut legs',
  [['Dusty blue', '#6f8193'], ['Olive', '#6c6b45'], ['Blush', '#c9a399']], { main: 'velvet', seats: 3 }, 'velvet sofa');
p('sofa', 'luxury', 'compact', 'Deep-seat velvet loveseat', 'westelm', 1599, [170, 99, 80], 'Performance velvet, kiln-dried hardwood, walnut legs',
  [['Dusty blue', '#6f8193'], ['Olive', '#6c6b45'], ['Blush', '#c9a399']], { main: 'velvet', seats: 2 }, 'velvet loveseat');
p('sofa', 'supreme', '', 'Modular bouclé sofa', 'rh', 8900, [262, 106, 76], 'Italian bouclé, feather-wrapped cushions, travertine plinth',
  [['Ivory bouclé', '#e6e0d4'], ['Cognac leather', '#8a4e2b'], ['Charcoal', '#3d3d3f']], { main: 'boucle', seats: 3 }, 'boucle sofa');
p('sofa', 'supreme', 'compact', 'Two-seat bouclé sofa', 'rh', 6400, [192, 106, 76], 'Italian bouclé, feather-wrapped cushions, travertine plinth',
  [['Ivory bouclé', '#e6e0d4'], ['Cognac leather', '#8a4e2b'], ['Charcoal', '#3d3d3f']], { main: 'boucle', seats: 2 }, 'boucle loveseat');

p('armchair', 'basic', '', 'Upholstered armchair', 'ikea', 199, [79, 82, 80], 'Polyester weave, birch legs',
  [['Light grey', '#b9b8b3'], ['Mustard', '#c49a3c'], ['Navy', '#35425a']], { main: 'fabric', seats: 1 }, 'armchair');
p('armchair', 'luxury', '', 'Velvet lounge chair', 'crate', 1099, [86, 88, 78], 'Performance velvet, solid walnut legs',
  [['Rust', '#9c5438'], ['Sage', '#8c9a80'], ['Ink', '#2e3647']], { main: 'velvet', seats: 1 }, 'velvet lounge chair');
p('armchair', 'supreme', '', 'Leather lounge chair', 'dwr', 4800, [90, 90, 82], 'Full-grain aniline leather, brass plinth',
  [['Cognac', '#8a4e2b'], ['Black', '#1f1d1c'], ['Tobacco', '#5a3a26']], { main: 'leather', seats: 1 }, 'leather lounge chair');

p('coffeeTable', 'basic', '', 'Coffee table with shelf', 'ikea', 79, [110, 60, 45], 'Birch veneer, painted legs',
  WOOD_LIGHT, { main: 'laminate' }, 'coffee table');
p('coffeeTable', 'luxury', '', 'Solid oak coffee table', 'potterybarn', 699, [122, 66, 40], 'Solid white oak, rounded edges',
  WOOD_MID, { main: 'wood' }, 'oak coffee table');
p('coffeeTable', 'supreme', '', 'Round marble coffee table', 'rh', 3600, [110, 110, 36], 'Honed Carrara marble on a travertine drum',
  [['Carrara', '#ffffff'], ['Calacatta gold', '#f1e6cf'], ['Verde', '#7f9585']], { main: 'marble' }, 'marble coffee table');

p('sideTable', 'basic', '', 'Round side table', 'ikea', 39, [45, 45, 52], 'Painted steel',
  [['White', '#ecebe6'], ['Black', '#2b2b2b'], ['Sage', '#9fae98']], { main: 'laminate' }, 'side table');
p('sideTable', 'luxury', '', 'Walnut drum side table', 'westelm', 299, [45, 45, 50], 'Solid walnut',
  WOOD_MID, { main: 'wood' }, 'drum side table');
p('sideTable', 'supreme', '', 'Travertine side table', 'perigold', 1450, [46, 46, 48], 'Unfilled Roman travertine',
  [['Travertine', '#e3d6c1'], ['Noce', '#b08f6c'], ['Silver', '#d4d2cc']], { main: 'stone' }, 'travertine side table');

p('rug', 'basic', '', 'Flatweave rug, 8 × 10 ft', 'ikea', 149, [305, 244, 1], 'Jute and cotton flatweave',
  [['Natural stripe', '#c9b48f'], ['Grey stripe', '#8e918e'], ['Blue stripe', '#50667d']], { main: 'rug', pattern: 'stripe' }, 'flatweave rug');
p('rug', 'basic', 'small', 'Flatweave rug, 5 × 8 ft', 'ikea', 89, [244, 152, 1], 'Jute and cotton flatweave',
  [['Natural stripe', '#c9b48f'], ['Grey stripe', '#8e918e'], ['Blue stripe', '#50667d']], { main: 'rug', pattern: 'stripe' }, 'flatweave rug');
p('rug', 'luxury', '', 'Hand-tufted wool rug, 8 × 10 ft', 'westelm', 899, [305, 244, 2], 'New Zealand wool, hand tufted',
  [['Slate trellis', '#58616b'], ['Sand trellis', '#c7b08c'], ['Moss trellis', '#6d7a5c']], { main: 'rug', pattern: 'trellis' }, 'wool rug');
p('rug', 'luxury', 'small', 'Hand-tufted wool rug, 5 × 8 ft', 'westelm', 499, [244, 152, 2], 'New Zealand wool, hand tufted',
  [['Slate trellis', '#58616b'], ['Sand trellis', '#c7b08c'], ['Moss trellis', '#6d7a5c']], { main: 'rug', pattern: 'trellis' }, 'wool rug');
p('rug', 'supreme', '', 'Hand-knotted silk and wool rug, 9 × 12 ft', 'perigold', 5200, [366, 274, 2], 'Hand-knotted wool and silk, 150 knots per inch',
  [['Indigo', '#2f3f63'], ['Madder red', '#8a3a2e'], ['Ivory', '#e6dcc6']], { main: 'rug', pattern: 'medallion' }, 'hand knotted rug');
p('rug', 'supreme', 'small', 'Hand-knotted silk and wool rug, 6 × 9 ft', 'perigold', 2900, [274, 183, 2], 'Hand-knotted wool and silk, 150 knots per inch',
  [['Indigo', '#2f3f63'], ['Madder red', '#8a3a2e'], ['Ivory', '#e6dcc6']], { main: 'rug', pattern: 'medallion' }, 'hand knotted rug');

p('mediaUnit', 'basic', '', 'TV bench', 'ikea', 129, [160, 40, 50], 'Laminated particleboard',
  WOOD_LIGHT, { main: 'laminate' }, 'tv bench');
p('mediaUnit', 'luxury', '', 'Mango wood media console', 'westelm', 1199, [183, 46, 64], 'Solid mango wood, brass pulls',
  WOOD_MID, { main: 'wood' }, 'media console');
p('mediaUnit', 'supreme', '', 'Lacquered media cabinet', 'rh', 4900, [213, 50, 66], 'Hand-lacquered oak with brass inlay',
  [['Black lacquer', '#1d1d1f'], ['Oyster', '#d8d1c4'], ['Oxblood', '#5a2020']], { main: 'lacquer' }, 'media cabinet');

p('floorLamp', 'basic', '', 'Floor lamp, linen shade', 'ikea', 49, [35, 35, 155], 'Steel stem, fabric shade',
  [['Black', '#2b2b2b'], ['White', '#ecebe6'], ['Brass look', '#b39461']], { main: 'metal' }, 'floor lamp');
p('floorLamp', 'luxury', '', 'Walnut tripod floor lamp', 'westelm', 349, [55, 55, 160], 'Solid walnut legs, linen drum shade',
  WOOD_MID, { main: 'wood' }, 'tripod floor lamp');
p('floorLamp', 'supreme', '', 'Brass arc lamp with marble base', 'dwr', 2100, [40, 40, 205], 'Solid brass arc, Carrara marble base. Arc reaches 105 cm.',
  [['Brass', '#caa55e'], ['Polished nickel', '#c9c9c4'], ['Bronze', '#6e5838']], { main: 'metal', reach: 1.05 }, 'arc floor lamp');

p('plant', 'basic', '', 'Snake plant in a ceramic pot', 'ikea', 35, [30, 30, 72], 'Live plant, glazed stoneware pot',
  [['White pot', '#ecebe6'], ['Terracotta pot', '#b86a45'], ['Grey pot', '#8e918e']], { main: 'ceramic', leaf: 'snake' }, 'snake plant');
p('plant', 'luxury', '', 'Fiddle-leaf fig, 5 ft', 'crate', 149, [55, 55, 150], 'Live plant, matte ceramic planter',
  [['Charcoal pot', '#3a3b3c'], ['Sand pot', '#cbb99a'], ['White pot', '#ecebe6']], { main: 'ceramic', leaf: 'fig' }, 'fiddle leaf fig');
p('plant', 'supreme', '', 'Olive tree in a stone planter', 'perigold', 690, [80, 80, 190], 'Live olive tree, cast-stone planter',
  [['Limestone', '#d9d1c1'], ['Basalt', '#4a4a48'], ['Terracotta', '#a86446']], { main: 'stone', leaf: 'olive' }, 'olive tree planter');

p('bookcase', 'basic', '', 'Five-shelf bookcase', 'ikea', 89, [80, 28, 202], 'Laminated particleboard',
  WOOD_LIGHT, { main: 'laminate' }, 'bookcase');
p('bookcase', 'luxury', '', 'Solid wood bookcase', 'crate', 1299, [91, 38, 206], 'Solid acacia, adjustable shelves',
  WOOD_MID, { main: 'wood' }, 'wood bookcase');
p('bookcase', 'supreme', '', 'Brass-framed étagère', 'rh', 5600, [100, 40, 210], 'Solid brass frame, smoked oak shelves',
  WOOD_DARK, { main: 'wood', frame: 'etagere' }, 'etagere');

p('wallArt', 'basic', '', 'Framed art print, 50 × 70 cm', 'ikea', 29, [50, 3, 70], 'Giclée print, pine frame',
  [['Sun arcs', '#d9894a'], ['Blue blocks', '#4d6a8c'], ['Olive line', '#7b8456']], { main: 'art', art: 'print' }, 'framed art print');
p('wallArt', 'basic', 'small', 'Framed art print, 30 × 40 cm', 'ikea', 15, [30, 2, 40], 'Giclée print, pine frame',
  [['Sun arcs', '#d9894a'], ['Blue blocks', '#4d6a8c'], ['Olive line', '#7b8456']], { main: 'art', art: 'print' }, 'framed art print');
p('wallArt', 'luxury', '', 'Framed abstract canvas', 'westelm', 349, [76, 4, 102], 'Hand-embellished canvas, oak float frame',
  [['Ochre field', '#c69a45'], ['Sea glass', '#6f9a95'], ['Rose dusk', '#b77b73']], { main: 'art', art: 'abstract' }, 'abstract canvas art');
p('wallArt', 'luxury', 'small', 'Framed abstract canvas, small', 'westelm', 199, [50, 3, 70], 'Hand-embellished canvas, oak float frame',
  [['Ochre field', '#c69a45'], ['Sea glass', '#6f9a95'], ['Rose dusk', '#b77b73']], { main: 'art', art: 'abstract' }, 'abstract canvas art');
p('wallArt', 'supreme', '', 'Original oil painting, gilded frame', 'perigold', 2800, [127, 6, 97], 'Original oil on linen, water-gilded frame',
  [['Crimson field', '#8a2f2a'], ['Midnight field', '#23304d'], ['Umber field', '#6b4a2b']], { main: 'art', art: 'oil' }, 'original oil painting');
p('wallArt', 'supreme', 'small', 'Original oil study, gilded frame', 'perigold', 1600, [76, 5, 61], 'Original oil on linen, water-gilded frame',
  [['Crimson field', '#8a2f2a'], ['Midnight field', '#23304d'], ['Umber field', '#6b4a2b']], { main: 'art', art: 'oil' }, 'original oil painting');

p('ceilingLight', 'basic', '', 'Paper pendant lamp', 'ikea', 59, [45, 45, 70], 'Rice paper shade, textile cord',
  [['White paper', '#f4efe6'], ['Warm paper', '#eadcc4'], ['Grey paper', '#cfcfcb']], { main: 'paper' }, 'paper pendant lamp');
p('ceilingLight', 'luxury', '', 'Brass dome pendant', 'westelm', 499, [50, 50, 80], 'Spun brass shade, cloth cord',
  [['Brass', '#b8925a'], ['Matte black', '#2b2b2b'], ['Sage', '#8c9a80']], { main: 'metal' }, 'dome pendant');
p('ceilingLight', 'supreme', '', 'Sculptural brass chandelier', 'rh', 3900, [92, 92, 95], 'Hand-finished brass, 12 lights',
  [['Burnished brass', '#caa55e'], ['Bronze', '#6e5838'], ['Polished nickel', '#c9c9c4']], { main: 'metal' }, 'brass chandelier');

// ---- bedroom --------------------------------------------------------------------
p('bed', 'basic', '', 'Bed frame, queen', 'ikea', 299, [163, 213, 100], 'Birch veneer, slatted base',
  WOOD_LIGHT, { main: 'laminate' }, 'queen bed frame');
p('bed', 'basic', 'full', 'Bed frame, full', 'ikea', 249, [147, 205, 100], 'Birch veneer, slatted base',
  WOOD_LIGHT, { main: 'laminate' }, 'full bed frame');
p('bed', 'luxury', '', 'Upholstered bed, queen', 'westelm', 1899, [172, 222, 120], 'Performance velvet over solid wood',
  [['Dusty blue', '#6f8193'], ['Oat', '#cfc3ad'], ['Blush', '#c9a399']], { main: 'velvet' }, 'upholstered bed queen');
p('bed', 'luxury', 'full', 'Upholstered bed, full', 'westelm', 1599, [155, 212, 120], 'Performance velvet over solid wood',
  [['Dusty blue', '#6f8193'], ['Oat', '#cfc3ad'], ['Blush', '#c9a399']], { main: 'velvet' }, 'upholstered bed full');
p('bed', 'supreme', '', 'Channel-tufted bed, king', 'rh', 9800, [218, 228, 140], 'Belgian linen or velvet over a hardwood frame',
  [['Ivory linen', '#e3dccf'], ['Cognac velvet', '#8a4e2b'], ['Graphite velvet', '#3d3d3f']], { main: 'velvet' }, 'channel tufted bed');
p('bed', 'supreme', 'queen', 'Channel-tufted bed, queen', 'rh', 8200, [178, 228, 140], 'Belgian linen or velvet over a hardwood frame',
  [['Ivory linen', '#e3dccf'], ['Cognac velvet', '#8a4e2b'], ['Graphite velvet', '#3d3d3f']], { main: 'velvet' }, 'channel tufted bed');

p('nightstand', 'basic', '', 'Two-drawer nightstand', 'ikea', 49, [40, 35, 55], 'Laminated particleboard',
  WOOD_LIGHT, { main: 'laminate' }, 'nightstand');
p('nightstand', 'luxury', '', 'Solid wood nightstand', 'westelm', 449, [50, 40, 60], 'Solid walnut, brass pull',
  WOOD_MID, { main: 'wood' }, 'wood nightstand');
p('nightstand', 'supreme', '', 'Marble-top nightstand', 'rh', 1900, [60, 45, 62], 'Lacquered oak, honed marble top',
  [['Black lacquer', '#1d1d1f'], ['Oyster', '#d8d1c4'], ['Walnut', '#5b3d25']], { main: 'lacquer' }, 'marble nightstand');

p('tableLamp', 'basic', '', 'Ceramic table lamp', 'ikea', 29, [25, 25, 45], 'Glazed ceramic base, fabric shade',
  [['White', '#ecebe6'], ['Sage', '#9fae98'], ['Terracotta', '#b86a45']], { main: 'ceramic' }, 'table lamp');
p('tableLamp', 'luxury', '', 'Brass table lamp', 'westelm', 229, [33, 33, 58], 'Brass stem, linen shade',
  [['Brass', '#b8925a'], ['Bronze', '#6e5838'], ['Black', '#2b2b2b']], { main: 'metal' }, 'brass table lamp');
p('tableLamp', 'supreme', '', 'Alabaster table lamp', 'perigold', 1200, [36, 36, 64], 'Hand-carved alabaster, silk shade',
  [['Alabaster', '#efe8dc'], ['Honey onyx', '#d9b77e'], ['Smoke', '#a7a39b']], { main: 'alabaster' }, 'alabaster table lamp');

p('dresser', 'basic', '', 'Six-drawer dresser', 'ikea', 179, [120, 48, 78], 'Laminated particleboard',
  WOOD_LIGHT, { main: 'laminate' }, '6 drawer dresser');
p('dresser', 'luxury', '', 'Six-drawer walnut dresser', 'westelm', 1499, [150, 51, 86], 'Solid walnut and veneer, brass pulls',
  WOOD_MID, { main: 'wood' }, 'walnut dresser');
p('dresser', 'supreme', '', 'Lacquered dresser, brass pulls', 'rh', 6200, [180, 55, 90], 'Hand-lacquered oak, solid brass pulls',
  [['Black lacquer', '#1d1d1f'], ['Oyster', '#d8d1c4'], ['Oxblood', '#5a2020']], { main: 'lacquer' }, 'lacquer dresser');

p('wardrobe', 'basic', '', 'Two-door wardrobe', 'ikea', 259, [100, 58, 201], 'Laminated particleboard',
  WOOD_LIGHT, { main: 'laminate' }, 'wardrobe');
p('wardrobe', 'luxury', '', 'Solid wood armoire', 'potterybarn', 2400, [112, 61, 203], 'Kiln-dried hardwood, oak veneer',
  WOOD_MID, { main: 'wood' }, 'armoire');
p('wardrobe', 'supreme', '', 'Three-door oak armoire', 'rh', 9500, [150, 65, 212], 'Solid oak, cedar-lined, brass hardware',
  WOOD_DARK, { main: 'wood' }, 'oak armoire');

p('bench', 'basic', '', 'Upholstered bench', 'amazon', 79, [100, 40, 45], 'Linen-look fabric, rubberwood legs',
  [['Grey', '#9a9d9a'], ['Beige', '#cfc3ad'], ['Navy', '#35425a']], { main: 'fabric' }, 'upholstered bench');
p('bench', 'luxury', '', 'Velvet bench, brass legs', 'westelm', 599, [122, 43, 46], 'Performance velvet, brass-finished steel',
  [['Rust', '#9c5438'], ['Sage', '#8c9a80'], ['Ink', '#2e3647']], { main: 'velvet' }, 'velvet bench');
p('bench', 'supreme', '', 'Leather bench, walnut base', 'rh', 2700, [150, 45, 45], 'Full-grain leather, solid walnut',
  [['Cognac', '#8a4e2b'], ['Black', '#1f1d1c'], ['Tobacco', '#5a3a26']], { main: 'leather' }, 'leather bench');

// ---- home office ----------------------------------------------------------------
p('desk', 'basic', '', 'Desk, birch veneer', 'ikea', 119, [120, 60, 75], 'Birch veneer, steel legs',
  WOOD_LIGHT, { main: 'laminate' }, 'desk');
p('desk', 'luxury', '', 'Solid oak writing desk', 'westelm', 999, [140, 66, 76], 'Solid oak, one drawer',
  WOOD_MID, { main: 'wood' }, 'writing desk');
p('desk', 'supreme', '', 'Executive desk, walnut and leather', 'rh', 5400, [183, 86, 76], 'Solid walnut, leather writing surface',
  WOOD_DARK, { main: 'wood' }, 'executive desk');

p('officeChair', 'basic', '', 'Mesh office chair', 'ikea', 129, [62, 62, 102], 'Mesh back, polyester seat',
  [['Black', '#2b2b2b'], ['Grey', '#8e918e'], ['Blue', '#44607e']], { main: 'fabric' }, 'office chair');
p('officeChair', 'luxury', '', 'Ergonomic task chair', 'dwr', 1395, [68, 68, 106], 'Knit back, aluminium base',
  [['Graphite', '#3d3f42'], ['Mineral', '#a8aaa6'], ['Sage', '#8c9a80']], { main: 'fabric' }, 'ergonomic chair');
p('officeChair', 'supreme', '', 'Leather executive chair', 'rh', 4200, [70, 72, 116], 'Full-grain leather, polished aluminium',
  [['Cognac', '#8a4e2b'], ['Black', '#1f1d1c'], ['Tobacco', '#5a3a26']], { main: 'leather' }, 'leather desk chair');

// ---- bathroom -------------------------------------------------------------------
p('vanity', 'basic', '', 'Vanity with integrated sink', 'ikea', 249, [80, 48, 86], 'Lacquered particleboard, ceramic sink',
  [['White', '#ecebe6'], ['Oak effect', '#c9a878'], ['Dark grey', '#555756']], { main: 'laminate' }, 'bathroom vanity');
p('vanity', 'luxury', '', 'Oak vanity, marble top', 'potterybarn', 1499, [92, 56, 86], 'Solid oak, Carrara top, vessel sink',
  WOOD_MID, { main: 'wood' }, 'marble top vanity');
p('vanity', 'supreme', '', 'Marble washstand, brass legs', 'rh', 6800, [122, 56, 88], 'Honed marble, unlacquered brass',
  [['Carrara', '#ffffff'], ['Calacatta gold', '#f1e6cf'], ['Verde', '#7f9585']], { main: 'marble' }, 'marble washstand');

p('mirror', 'basic', '', 'Round wall mirror', 'ikea', 39, [60, 3, 60], 'Glass, powder-coated frame',
  [['Black', '#2b2b2b'], ['White', '#ecebe6'], ['Brass look', '#b39461']], { main: 'metal', shape: 'round' }, 'round mirror');
p('mirror', 'luxury', '', 'Arched brass mirror', 'westelm', 399, [61, 4, 91], 'Brass-finished iron frame',
  [['Brass', '#b8925a'], ['Bronze', '#6e5838'], ['Black', '#2b2b2b']], { main: 'metal', shape: 'arch' }, 'arched mirror');
p('mirror', 'supreme', '', 'Antiqued brass mirror', 'rh', 2200, [80, 5, 110], 'Hand-antiqued solid brass',
  [['Antiqued brass', '#b89452'], ['Polished nickel', '#c9c9c4'], ['Bronze', '#6e5838']], { main: 'metal', shape: 'rect' }, 'brass mirror');

p('bathtub', 'basic', '', 'Acrylic bathtub, 150 cm', 'homedepot', 449, [150, 75, 57], 'Reinforced acrylic',
  [['White', '#f4f4f1'], ['Biscuit', '#ece3d2'], ['Grey', '#cfd1cf']], { main: 'ceramic' }, 'acrylic bathtub');
p('bathtub', 'luxury', '', 'Freestanding soaking tub', 'wayfair', 2400, [167, 80, 60], 'Gloss acrylic, freestanding',
  [['White', '#f4f4f1'], ['Matte white', '#e9e8e3'], ['Black', '#262626']], { main: 'ceramic', shape: 'oval' }, 'freestanding tub');
p('bathtub', 'supreme', '', 'Solid stone freestanding tub', 'perigold', 11000, [172, 86, 60], 'Cast solid-surface stone, brass floor filler',
  [['Stone white', '#ecebe6'], ['Nero', '#2a2a2a'], ['Travertine', '#e3d6c1']], { main: 'stone', shape: 'oval' }, 'stone bathtub');

p('toilet', 'basic', '', 'Two-piece toilet', 'homedepot', 169, [38, 70, 76], 'Vitreous china',
  [['White', '#f4f4f1']], { main: 'ceramic' }, 'two piece toilet');
p('toilet', 'luxury', '', 'One-piece toilet, soft close', 'wayfair', 699, [40, 70, 72], 'Vitreous china, soft-close seat',
  [['White', '#f4f4f1'], ['Biscuit', '#ece3d2']], { main: 'ceramic' }, 'one piece toilet');
p('toilet', 'supreme', '', 'Wall-hung smart toilet', 'perigold', 2900, [40, 58, 42], 'Rimless vitreous china, heated seat, brass plate',
  [['White', '#f4f4f1'], ['Matte black', '#262626']], { main: 'ceramic', wallHung: true }, 'wall hung smart toilet');

p('towelRack', 'basic', '', 'Bamboo towel ladder', 'amazon', 25, [45, 30, 160], 'Bamboo',
  [['Bamboo', '#c9a878'], ['White', '#ecebe6']], { main: 'wood' }, 'bamboo towel ladder');
p('towelRack', 'luxury', '', 'Matte black towel ladder', 'westelm', 249, [50, 32, 170], 'Powder-coated steel',
  [['Black', '#2b2b2b'], ['Brass', '#b8925a']], { main: 'metal' }, 'towel ladder');
p('towelRack', 'supreme', '', 'Heated brass towel ladder', 'perigold', 1100, [55, 30, 175], 'Solid brass, electric heating',
  [['Brass', '#caa55e'], ['Nickel', '#c9c9c4'], ['Bronze', '#6e5838']], { main: 'metal' }, 'heated towel rail');

p('bathMat', 'basic', '', 'Cotton bath mat', 'ikea', 15, [80, 50, 1], 'Cotton terry',
  [['White', '#ecebe6'], ['Grey', '#9a9d9a'], ['Sage', '#9fae98']], { main: 'rug', pattern: 'solid' }, 'bath mat');
p('bathMat', 'luxury', '', 'Tufted cotton bath mat', 'westelm', 89, [91, 61, 2], 'Organic cotton, hand tufted',
  [['Oat', '#d8ccb6'], ['Slate', '#58616b'], ['Blush', '#d8b1a6']], { main: 'rug', pattern: 'solid' }, 'tufted bath mat');
p('bathMat', 'supreme', '', 'Hand-loomed wool bath rug', 'rh', 420, [100, 65, 2], 'Hand-loomed wool',
  [['Ivory', '#e6dcc6'], ['Indigo', '#2f3f63'], ['Moss', '#6d7a5c']], { main: 'rug', pattern: 'stripe' }, 'bath rug');

p('tallCabinet', 'basic', '', 'Tall bathroom cabinet', 'ikea', 79, [40, 30, 170], 'Laminated particleboard',
  [['White', '#ecebe6'], ['Oak effect', '#c9a878'], ['Dark grey', '#555756']], { main: 'laminate' }, 'tall bathroom cabinet');
p('tallCabinet', 'luxury', '', 'Oak linen cabinet', 'potterybarn', 599, [50, 38, 180], 'Solid oak, glass upper door',
  WOOD_MID, { main: 'wood' }, 'linen cabinet');
p('tallCabinet', 'supreme', '', 'Oak and marble tall cabinet', 'rh', 2400, [55, 40, 190], 'Solid oak, marble top',
  WOOD_DARK, { main: 'wood' }, 'bath tall cabinet');

// ---- dining room ----------------------------------------------------------------
p('diningTable', 'basic', 'six', 'Dining table, seats 6', 'ikea', 249, [180, 85, 74], 'Birch veneer, solid birch legs',
  WOOD_LIGHT, { main: 'laminate', seats: 6 }, 'dining table 6');
p('diningTable', 'basic', '', 'Dining table, seats 4', 'ikea', 149, [120, 75, 74], 'Birch veneer, solid birch legs',
  WOOD_LIGHT, { main: 'laminate', seats: 4 }, 'dining table 4');
p('diningTable', 'luxury', 'six', 'Solid oak trestle table, seats 6', 'crate', 2199, [200, 95, 76], 'Solid white oak',
  WOOD_MID, { main: 'wood', seats: 6 }, 'oak dining table');
p('diningTable', 'luxury', '', 'Solid oak trestle table, seats 4', 'crate', 1499, [150, 90, 76], 'Solid white oak',
  WOOD_MID, { main: 'wood', seats: 4 }, 'oak dining table');
p('diningTable', 'supreme', 'six', 'Marble dining table, seats 6', 'rh', 11500, [244, 107, 76], 'Honed marble on travertine pedestals',
  [['Carrara', '#ffffff'], ['Calacatta gold', '#f1e6cf'], ['Verde', '#7f9585']], { main: 'marble', seats: 6 }, 'marble dining table');
p('diningTable', 'supreme', '', 'Round marble dining table', 'rh', 7900, [137, 137, 76], 'Honed marble on a fluted pedestal',
  [['Carrara', '#ffffff'], ['Calacatta gold', '#f1e6cf'], ['Verde', '#7f9585']], { main: 'marble', seats: 4, shape: 'round' }, 'round marble dining table');

p('diningChair', 'basic', '', 'Wooden dining chair', 'ikea', 45, [45, 52, 80], 'Solid birch',
  WOOD_LIGHT, { main: 'laminate' }, 'dining chair');
p('diningChair', 'luxury', '', 'Upholstered dining chair', 'westelm', 299, [48, 58, 88], 'Performance weave, solid oak legs',
  [['Oat', '#cfc3ad'], ['Slate', '#58616b'], ['Rust', '#9c5438']], { main: 'fabric' }, 'upholstered dining chair');
p('diningChair', 'supreme', '', 'Velvet dining chair, brass legs', 'rh', 1450, [55, 62, 96], 'Italian velvet, solid brass legs',
  [['Emerald', '#2f5a48'], ['Ivory', '#e6e0d4'], ['Oxblood', '#5a2020']], { main: 'velvet' }, 'velvet dining chair');

p('sideboard', 'basic', '', 'Sideboard', 'ikea', 199, [140, 42, 75], 'Laminated particleboard',
  WOOD_LIGHT, { main: 'laminate' }, 'sideboard');
p('sideboard', 'luxury', '', 'Mango wood sideboard', 'westelm', 1699, [183, 46, 76], 'Solid mango wood, brass pulls',
  WOOD_MID, { main: 'wood' }, 'wood sideboard');
p('sideboard', 'supreme', '', 'Travertine and oak sideboard', 'rh', 7200, [213, 50, 80], 'Solid oak, travertine top',
  WOOD_DARK, { main: 'wood', top: 'stone' }, 'travertine sideboard');

// ---- paint ----------------------------------------------------------------------
export const PAINT = {
  basic: { name: 'Interior wall paint, eggshell', store: 'homedepot', perLitre: 11, query: 'interior paint eggshell' },
  luxury: { name: 'Premium scrubbable wall paint', store: 'homedepot', perLitre: 20, query: 'premium interior paint' },
  supreme: { name: 'Artisan limewash paint', store: 'amazon', perLitre: 42, query: 'limewash paint' },
};

export const PAINT_COLORS = [
  { name: 'Chalk', color: '#ece9e2' },
  { name: 'Linen', color: '#e3d7c3' },
  { name: 'Mist', color: '#d5dcd8' },
  { name: 'Sage', color: '#b2bda4' },
  { name: 'Eucalyptus', color: '#879b8a' },
  { name: 'Harbour blue', color: '#6f8ba0' },
  { name: 'Blush', color: '#e2c3b7' },
  { name: 'Clay', color: '#c48a6c' },
  { name: 'Ochre', color: '#c99a47' },
  { name: 'Forest', color: '#35503f' },
  { name: 'Midnight', color: '#2d3a4f' },
  { name: 'Charcoal', color: '#434645' },
];

// ---- queries ---------------------------------------------------------------------
export const getProduct = (id) => BY_ID.get(id);
export const productsFor = (cat, tier) => PRODUCTS.filter((x) => x.cat === cat && x.tier === tier);
export const productsInCategory = (cat) => PRODUCTS.filter((x) => x.cat === cat);
export const allProducts = () => PRODUCTS.slice();

export function shopUrl(product) {
  const r = RETAILERS[product.store];
  return r.search(encodeURIComponent(product.query));
}

export function storeName(id) {
  return RETAILERS[id]?.name ?? id;
}
