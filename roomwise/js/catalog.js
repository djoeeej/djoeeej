// Product catalog: real products with direct product-page links.
//
// Every piece is a real product: its name, store, product-page URL, size (cm, W x D x H)
// and the price seen when it was researched (USD). tools/check-links.mjs opens every link
// in a real browser, reads the live price, and writes the result to js/verified.js, which
// the app shows next to each piece ("Link checked on ...").
//
// Basic   = best-selling IKEA, Walmart and Target pieces: cheap, well reviewed, easy to get.
// Luxury  = Article: solid-wood and designer-looking pieces at direct-to-consumer prices.
// Supreme = Design Within Reach: authentic design classics (Herman Miller, Flos, Carl Hansen).
//
// Textiles (cushions, throws, bedding, curtains, towels) are products too: they dress the
// furniture in 3D and appear in the shopping list, so a room looks lived in and costs what
// it really costs. Things that are not included in the box (bulbs, cushion inserts, curtain
// rods, a mattress) are listed as add-ons with their own links.

export const RETAILERS = {
  ikea: { name: 'IKEA', search: (q) => `https://www.ikea.com/us/en/search/?q=${q}` },
  walmart: { name: 'Walmart', search: (q) => `https://www.walmart.com/search?q=${q}` },
  target: { name: 'Target', search: (q) => `https://www.target.com/s?searchTerm=${q}` },
  article: { name: 'Article', search: (q) => `https://www.article.com/search?query=${q}` },
  dwr: { name: 'Design Within Reach', search: (q) => `https://www.dwr.com/search?q=${q}` },
  homedepot: { name: 'The Home Depot', search: (q) => `https://www.homedepot.com/s/${q}` },
  existing: { name: 'Already in the room', search: () => null },
};

export const TIERS = [
  {
    id: 'basic', name: 'Basic', sign: '$', tagline: 'Best-sellers on a budget',
    blurb: 'IKEA, Walmart and Target best-sellers with thousands of reviews. Everything you need, nothing you don\'t.',
    swatches: ['#d9c09a', '#ecebe6', '#8f9a8a', '#2a2a2a'],
  },
  {
    id: 'luxury', name: 'Luxury', sign: '$$', tagline: 'Designer look, fair price',
    blurb: 'Article: solid walnut, bouclé and wool at direct-to-you prices, styled with Target textiles.',
    swatches: ['#7a5230', '#e8e1d4', '#b8925a', '#5f6445'],
  },
  {
    id: 'supreme', name: 'Supreme', sign: '$$$', tagline: 'Authentic design icons',
    blurb: 'Design Within Reach: authentic Herman Miller, Flos and Carl Hansen classics that last a lifetime.',
    swatches: ['#e6e0d4', '#43301f', '#caa55e', '#6e2b25'],
  },
];

export const TIER_RANK = { basic: 0, luxury: 1, supreme: 2 };

// Secondary materials each tier uses for legs, frames, pulls and accessories.
export const TIER_KIT = {
  basic: { wood: '#d9c09a', metal: '#2b2b2b', metalKind: 'black', accent: '#c7b79a', textile: '#e7e2d8', stone: '#e9e6df' },
  luxury: { wood: '#7a5230', metal: '#b8925a', metalKind: 'brass', accent: '#b98a5e', textile: '#e8e2d6', stone: '#ece6da' },
  supreme: { wood: '#5b3d25', metal: '#caa55e', metalKind: 'brass', accent: '#6e2b25', textile: '#efe9df', stone: '#e3d6c1' },
};

export const CATEGORY_LABEL = {
  sofa: 'Sofa', sleeper: 'Sleeper sofa', armchair: 'Armchair', coffeeTable: 'Coffee table', sideTable: 'Side table', rug: 'Rug',
  mediaUnit: 'Media console', floorLamp: 'Floor lamp', plant: 'Plant', bookcase: 'Bookcase', wallArt: 'Wall art',
  ceilingLight: 'Ceiling light', bed: 'Bed', nightstand: 'Nightstand', tableLamp: 'Table lamp', deskLamp: 'Desk lamp', dresser: 'Dresser',
  wardrobe: 'Wardrobe', bench: 'Bench', desk: 'Desk', officeChair: 'Desk chair', vanity: 'Vanity',
  mirror: 'Mirror', floorMirror: 'Full-length mirror', bathtub: 'Bathtub', toilet: 'Toilet', towelRack: 'Towel ladder', bathMat: 'Bath mat',
  tallCabinet: 'Storage shelf', diningTable: 'Dining table', diningChair: 'Dining chair', sideboard: 'Sideboard',
  pillows: 'Cushions', throw: 'Throw blanket', bedding: 'Bedding', curtains: 'Curtains', towels: 'Towels', luggageRack: 'Luggage rack',
};

// Categories that dress another piece or the room rather than standing on the floor.
export const SOFT_GOODS = ['pillows', 'throw', 'bedding', 'curtains', 'towels'];

const PRODUCTS = [];
const BY_ID = new Map();

function add(o) {
  const product = {
    id: o.id, cat: o.cat, tier: o.tier, name: o.name, store: o.store, price: o.price, dims: o.dims ?? [40, 40, 40],
    material: o.material ?? '', why: o.why ?? '', rating: o.rating ?? null, url: o.url ?? null, query: o.query ?? o.name,
    unit: o.unit ?? null, // e.g. 'set of 2', 'pair', 'panel'
    perWindow: o.perWindow ?? 1, // curtain panels needed per window
    existing: o.store === 'existing',
    finishes: (o.finishes ?? [['Standard', '#cccccc']]).map(([name, color, url]) => ({ name, color, url: url ?? null })),
    addons: (o.addons ?? []).map((a) => ({ qty: 1, default: true, ...a })),
    tags: o.tags ?? [],
    model: { kind: o.kind ?? o.cat, v: o.look ?? o.tier, ...(o.model ?? {}) },
  };
  PRODUCTS.push(product);
  BY_ID.set(product.id, product);
  return product;
}

const U = {
  ikea: (slug) => `https://www.ikea.com/us/en/p/${slug}/`,
  article: (n, slug) => `https://www.article.com/product/${n}/${slug}`,
  dwr: (path) => `https://www.dwr.com/${path}.html?lang=en_US`,
  walmart: (path) => `https://www.walmart.com/ip/${path}`,
  target: (path) => `https://www.target.com/p/${path}`,
};

// Frequently used add-ons.
const BULB = { id: 'ikea-solhetta-bulb', name: 'SOLHETTA LED bulb E26 450 lm, 2-pack', store: 'ikea', price: 4.99, url: U.ikea('solhetta-led-bulb-e26-450-lumen-globe-opal-10591479'), why: 'Bulbs are sold separately. Warm 2700K keeps the room cosy.' };
const INSERTS = { id: 'ikea-fjadrar-insert', name: 'FJÄDRAR inner cushion 20x20", 2', store: 'ikea', price: 19.98, url: U.ikea('fjaedrar-inner-cushion-off-white-60262188'), why: 'Feather inserts make cheap covers look full and plump.' };
const ROD = { id: 'ikea-racka-rod', name: 'RÄCKA curtain rod set, 47-83"', store: 'ikea', price: 14.99, url: U.ikea('raecka-curtain-rod-combination-white-s59929243'), why: 'Mount it high and wide: windows look bigger.', perWindow: true };
const ROD_BLACK = { ...ROD, id: 'ikea-racka-rod-black', name: 'RÄCKA curtain rod set, black, 47-83"', url: U.ikea('raecka-curtain-rod-combination-black-s99929241') };

// =====================================================================================
// BASIC: IKEA, Walmart and Target best-sellers
// =====================================================================================
const b = (o) => add({ tier: 'basic', ...o });

// ---- seating ----
b({ id: 'ikea-glostad-loveseat', cat: 'sofa', name: 'GLOSTAD loveseat', store: 'ikea', price: 149, dims: [176, 81, 75],
  material: 'Knisa polyester fabric, polyurethane foam, solid wood frame',
  why: 'IKEA\'s cheapest sofa and one of its best-sellers: 8 screws to assemble, light enough to move alone.', rating: [4.5, 630],
  url: U.ikea('glostad-loveseat-knisa-dark-gray-70489011'),
  finishes: [['Knisa dark gray', '#54575a', U.ikea('glostad-loveseat-knisa-dark-gray-70489011')], ['Knisa medium blue', '#4f6788', U.ikea('glostad-loveseat-knisa-medium-blue-20488820')]],
  model: { main: 'fabric', seats: 2, arm: 'track', legs: 'taper' }, tags: ['compact'] });
b({ id: 'ikea-linanas-sofa', cat: 'sofa', name: 'LINANÄS sofa', store: 'ikea', price: 349, dims: [204, 86, 78],
  material: 'Vissle dope-dyed polyester, foam seat, 10-year guarantee',
  why: 'A full three-seater for the price of a loveseat, with a wipe-clean cover and a 10-year guarantee.',
  url: U.ikea('linanaes-sofa-vissle-beige-80512233'),
  finishes: [['Vissle beige', '#c9bda6', U.ikea('linanaes-sofa-vissle-beige-80512233')], ['Vissle dark gray', '#57595b', U.ikea('linanaes-sofa-vissle-dark-gray-80512247')]],
  model: { main: 'fabric', seats: 3, arm: 'slope', legs: 'taper', v: 'basic' } });
b({ id: 'walmart-tatum-sleeper', cat: 'sofa', name: 'Mainstays Tatum twin sleeper loveseat', store: 'walmart', price: 199, dims: [143, 74, 89],
  material: 'Polyester, pocket-coil seat, pull-out twin mattress',
  why: 'Sofa by day, twin bed by night: a Walmart best-seller that lets a small room sleep one more guest.', rating: [4.3, 331],
  url: U.walmart('Mainstays-Tatum-Twin-Sleeper-Loveseat-Dark-Gray/2566202369'),
  finishes: [['Dark gray', '#4e5155', U.walmart('Mainstays-Tatum-Twin-Sleeper-Loveseat-Dark-Gray/2566202369')], ['Beige', '#c8b99f', U.walmart('Mainstays-Tatum-Twin-Sleeper-Loveseat-Beige/9315169932')], ['Black', '#262626', U.walmart('Mainstays-Tatum-Twin-Sleeper-Loveseat-Black/1843310558')]],
  model: { main: 'fabric', seats: 2, arm: 'rolled', legs: 'block' }, tags: ['sleeps', 'airbnb', 'compact'] });
b({ id: 'ikea-friheten-sleeper', cat: 'sofa', name: 'FRIHETEN sleeper sofa', store: 'ikea', price: 549, dims: [230, 105, 66],
  material: 'Skiftebo polyester, pull-out 55x80" bed, storage under the seat',
  why: 'Turns into a full-size bed in seconds and hides bedding underneath: a favourite for guest rooms and Airbnbs.',
  url: U.ikea('friheten-sleeper-sofa-skiftebo-dark-gray-90341151'),
  finishes: [['Skiftebo dark gray', '#505356', U.ikea('friheten-sleeper-sofa-skiftebo-dark-gray-90341151')], ['Faringe light gray', '#b5b3ad', U.ikea('friheten-sleeper-sofa-faringe-light-gray-40551231')]],
  model: { main: 'fabric', seats: 3, arm: 'track', base: 'plinth', back: 'tight' }, tags: ['sleeps', 'airbnb'] });
b({ id: 'ikea-poang', cat: 'armchair', name: 'POÄNG armchair', store: 'ikea', price: 129, dims: [68, 82, 100],
  material: 'Layer-glued bent birch, Knisa cushion',
  why: 'In the range for over 40 years. The springy bentwood frame makes it the comfiest cheap reading chair.',
  url: U.ikea('poaeng-armchair-birch-veneer-knisa-light-beige-s59305928'),
  finishes: [['Birch / Knisa light beige', '#d9cdb5', U.ikea('poaeng-armchair-birch-veneer-knisa-light-beige-s59305928')], ['Birch / Hillared dark blue', '#34405a', U.ikea('poaeng-armchair-birch-veneer-hillared-dark-blue-s99305926')], ['Birch / Knisa black', '#2c2c2c', U.ikea('poaeng-armchair-birch-veneer-knisa-black-s79305927')]],
  kind: 'poang', model: { main: 'fabric' } });

// ---- tables ----
b({ id: 'ikea-lack-coffee', cat: 'coffeeTable', name: 'LACK coffee table', store: 'ikea', price: 29.99, dims: [118, 78, 45],
  material: 'Honeycomb board, foil finish, shelf underneath',
  why: 'The shelf hides remotes and magazines. $30 and rated 4.5 by over 4,000 people.', rating: [4.5, 4072],
  url: U.ikea('lack-coffee-table-black-brown-00104291'),
  finishes: [['Black-brown', '#3b3129', U.ikea('lack-coffee-table-black-brown-00104291')], ['White stained oak effect', '#d8cbb4', U.ikea('lack-coffee-table-white-stained-oak-effect-40431535')]],
  model: { main: 'laminate', shape: 'rect' } });
b({ id: 'ikea-gladom', cat: 'sideTable', name: 'GLADOM tray table', store: 'ikea', price: 19.99, dims: [45, 45, 53],
  material: 'Powder-coated steel, removable tray top',
  why: 'Lift the top off to serve snacks. Rated 4.7 and costs less than a takeaway.', rating: [4.7, null],
  url: U.ikea('gladom-tray-table-dark-green-10330670'),
  finishes: [['Dark green', '#34463a', U.ikea('gladom-tray-table-dark-green-10330670')], ['Pale pink', '#e2c3b7', U.ikea('gladom-tray-table-pale-pink-10519407')], ['Red', '#9a3027', U.ikea('gladom-tray-table-red-00533649')]],
  kind: 'trayTable', model: { main: 'paint' } });
b({ id: 'ikea-micke', cat: 'desk', name: 'MICKE desk', store: 'ikea', price: 79.99, dims: [105, 50, 75],
  material: 'Particleboard, honeycomb paper filling, cable outlet at the back',
  why: 'Hides the cables and has a drawer: the go-to small-space desk.',
  url: U.ikea('micke-desk-white-80213074'),
  finishes: [['White', '#ecebe6', U.ikea('micke-desk-white-80213074')], ['White / anthracite', '#4a4c4f', U.ikea('micke-desk-white-anthracite-10489839')]],
  model: { main: 'laminate' } });
b({ id: 'ikea-sandsberg', cat: 'diningTable', name: 'SANDSBERG table', store: 'ikea', price: 59.99, dims: [110, 67, 75],
  material: 'Melamine top, powder-coated steel frame',
  why: 'Seats four in a small kitchen or studio for the price of one takeaway dinner for four.',
  url: U.ikea('sandsberg-table-black-s29420393'), finishes: [['Black', '#262626']],
  model: { main: 'laminate', seats: 4 } });
b({ id: 'ikea-ekedalen', cat: 'diningTable', name: 'EKEDALEN extendable table', store: 'ikea', price: 249, dims: [180, 80, 75],
  material: 'Solid birch legs, ash veneer, self-storing leaf',
  why: 'One person can extend it from 4 to 6 seats. No seam in the top when closed.',
  url: U.ikea('ekedalen-extendable-table-white-70340807'),
  finishes: [['White', '#ecebe6', U.ikea('ekedalen-extendable-table-white-70340807')], ['Brown', '#5b4031', U.ikea('ekedalen-extendable-table-brown-90340769')]],
  model: { main: 'laminate', seats: 6 } });
b({ id: 'ikea-teodores', cat: 'diningChair', name: 'TEODORES chair', store: 'ikea', price: 29.99, dims: [46, 54, 81],
  material: 'Moulded polypropylene, powder-coated steel legs',
  why: 'Stackable, wipe-clean and strong: ideal for families and rentals.',
  url: U.ikea('teodores-chair-white-30486156'), finishes: [['White', '#eeeeea']],
  kind: 'shellChair', model: { main: 'paint' } });

// ---- storage ----
b({ id: 'ikea-lack-tv', cat: 'mediaUnit', name: 'LACK TV unit', store: 'ikea', price: 29.99, dims: [90, 36, 45],
  material: 'Honeycomb board, cable opening at the back',
  why: 'Holds a TV up to 32" and tidies the cables through the back.',
  url: U.ikea('lack-tv-unit-white-90631400'), finishes: [['White', '#ecebe6']],
  model: { main: 'laminate' } });
b({ id: 'ikea-billy', cat: 'bookcase', name: 'BILLY bookcase', store: 'ikea', price: 69.99, dims: [80, 28, 202],
  material: 'Particleboard, 4 adjustable shelves',
  why: 'The world\'s best-selling bookcase. Each shelf holds 66 lb.',
  url: U.ikea('billy-bookcase-white-00263850'),
  finishes: [['White', '#ecebe6', U.ikea('billy-bookcase-white-00263850')], ['Oak effect', '#c7a47a', U.ikea('billy-bookcase-oak-effect-10508932')], ['Black oak effect', '#2e2925', U.ikea('billy-bookcase-black-oak-effect-40477340')]],
  model: { main: 'laminate' } });
b({ id: 'ikea-kullen-2', cat: 'nightstand', name: 'KULLEN 2-drawer chest', store: 'ikea', price: 39.99, dims: [35, 40, 49],
  material: 'Particleboard, foil finish',
  why: 'Two drawers for chargers and books at a price that makes buying a pair easy.',
  url: U.ikea('kullen-2-drawer-chest-black-brown-60322130'), finishes: [['Black-brown', '#3b3129']],
  model: { main: 'laminate' } });
b({ id: 'ikea-kullen-6', cat: 'dresser', name: 'KULLEN 6-drawer dresser', store: 'ikea', price: 129, dims: [140, 40, 72],
  material: 'Particleboard, wall anchor included',
  why: 'Six drawers for the price of a nightstand elsewhere. Rated 4.6.', rating: [4.6, null],
  url: U.ikea('kullen-6-drawer-dresser-white-70484787'), finishes: [['White', '#ecebe6']],
  model: { main: 'laminate' } });
b({ id: 'ikea-rakkestad', cat: 'wardrobe', name: 'RAKKESTAD wardrobe with 2 doors', store: 'ikea', price: 149, dims: [79, 55, 176],
  material: 'Particleboard, clothes rail and shelf',
  why: 'Holds about 20 shirts and 40 T-shirts. Fits under low ceilings.',
  url: U.ikea('rakkestad-wardrobe-with-2-doors-black-brown-70519635'), finishes: [['Black-brown', '#3b3129']],
  model: { main: 'laminate' } });

// ---- beds ----
b({ id: 'ikea-malm-bed', cat: 'bed', name: 'MALM bed frame, Queen', store: 'ikea', price: 229, dims: [166, 211, 100],
  material: 'Particleboard, oak veneer or white foil; slats and mid-beam included',
  why: 'IKEA\'s best-known bed: clean on all sides, so it can float in the room or sit against a wall.',
  url: U.ikea('malm-bed-frame-white-s19931605'), finishes: [['White', '#ecebe6']],
  model: { main: 'laminate', head: 'wood' },
  addons: [{ id: 'ikea-asbygda-queen', name: 'ÅSBYGDA foam mattress, Queen', store: 'ikea', price: 199, url: U.ikea('asbygda-foam-mattress-firm-white-10481503'), why: 'The bed has no mattress. This firm foam one has a washable cover.' }] });

// ---- lighting ----
b({ id: 'ikea-arstid-floor', cat: 'floorLamp', name: 'ÅRSTID floor lamp', store: 'ikea', price: 49.99, dims: [36, 36, 155],
  material: 'Nickel-plated steel, pleated fabric shade',
  why: 'One of IKEA\'s most loved lamps: the fabric shade softens the light for evenings.',
  url: U.ikea('arstid-floor-lamp-nickel-plated-white-50163867'),
  finishes: [['Nickel / white', '#b9bcbf', U.ikea('arstid-floor-lamp-nickel-plated-white-50163867')], ['Brass / white', '#b8925a', U.ikea('arstid-floor-lamp-brass-white-60321324')]],
  model: { main: 'metal', lamp: 'stem' }, addons: [BULB] });
b({ id: 'ikea-arstid-table', cat: 'tableLamp', name: 'ÅRSTID table lamp', store: 'ikea', price: 29.99, dims: [22, 22, 55],
  material: 'Brass-colour steel, pleated fabric shade',
  why: 'Classic bedside lamp with a pull switch.',
  url: U.ikea('arstid-table-lamp-brass-white-80321380'),
  finishes: [['Brass / white', '#b8925a', U.ikea('arstid-table-lamp-brass-white-80321380')], ['Nickel / white', '#b9bcbf', U.ikea('arstid-table-lamp-nickel-plated-white-60280639')]],
  model: { main: 'metal', lamp: 'stick', v: 'luxury' }, addons: [BULB] });
b({ id: 'ikea-tertial', cat: 'deskLamp', name: 'TERTIAL work lamp', store: 'ikea', price: 14.99, dims: [18, 40, 50],
  material: 'Steel, adjustable arm and head, clamps to the desk',
  why: 'An IKEA classic since 1998: aim the light exactly where you work.',
  url: U.ikea('tertial-work-lamp-dark-gray-20355434'),
  finishes: [['Dark gray', '#3d3f42', U.ikea('tertial-work-lamp-dark-gray-20355434')], ['Light blue', '#9fb7c9', U.ikea('tertial-work-lamp-light-blue-70504295')]],
  kind: 'tableLamp', model: { main: 'blackMetal', lamp: 'task' }, addons: [BULB] });
b({ id: 'ikea-misterhult', cat: 'ceilingLight', name: 'MISTERHULT pendant lamp 18"', store: 'ikea', price: 59.99, dims: [45, 45, 38],
  material: 'Hand-woven bamboo',
  why: 'Hand-woven, so every one is unique. It throws a beautiful pattern of light on the ceiling. Rated 4.7.', rating: [4.7, null],
  url: U.ikea('misterhult-pendant-lamp-bamboo-handmade-40441025'), finishes: [['Bamboo', '#c9a878']],
  model: { main: 'jute', light: 'woven' }, addons: [BULB] });

// ---- decor ----
b({ id: 'ikea-lohals', cat: 'rug', name: 'LOHALS rug, flatwoven', store: 'ikea', price: 79.99, dims: [230, 160, 1],
  material: 'Hand-woven jute',
  why: 'Natural jute adds texture and warmth for under $80, and it is easy to vacuum.',
  url: U.ikea('lohals-rug-flatwoven-natural-80515104'), finishes: [['Natural', '#b99a70']],
  model: { main: 'rug', pattern: 'jute' } });
b({ id: 'ikea-toftbo', cat: 'bathMat', name: 'TOFTBO bath mat', store: 'ikea', price: 9.99, dims: [80, 50, 1],
  material: 'Microfibre, non-slip back',
  why: 'Ultra-soft and quick-drying.',
  url: U.ikea('toftbo-bath-mat-white-40454032'),
  finishes: [['White', '#f1efe9', U.ikea('toftbo-bath-mat-white-40454032')], ['Dark beige', '#b9a78b', U.ikea('toftbo-bath-mat-dark-beige-10467583')]],
  model: { main: 'terry' } });
b({ id: 'ikea-fejka-monstera', cat: 'plant', name: 'FEJKA artificial monstera', store: 'ikea', price: 24.99, dims: [45, 45, 90],
  material: 'Artificial plant, min. 50% recycled plastic',
  why: 'Looks real and never needs watering: perfect for rentals and guest rooms.',
  url: U.ikea('fejka-artificial-potted-plant-indoor-outdoor-monstera-70496610'), finishes: [['Green / white pot', '#eeeeea']],
  model: { main: 'matteCeramic', leaf: 'monstera' }, tags: ['airbnb'] });
b({ id: 'ikea-bjorksta', cat: 'wallArt', name: 'BJÖRKSTA picture and frame', store: 'ikea', price: 44.99, dims: [118, 3, 78],
  material: 'Printed canvas, black aluminium frame',
  why: 'A large piece of art for less than $50 makes the wall look finished.',
  url: U.ikea('bjoerksta-picture-and-frame-flowers-close-up-black-s89561163'), finishes: [['Flowers close up', '#8c9b7a']],
  model: { main: 'art', art: 'abstract' } });
b({ id: 'ikea-lindbyn-50', cat: 'mirror', name: 'LINDBYN mirror 19⅝"', store: 'ikea', price: 29.99, dims: [50, 3, 50],
  material: 'Recycled aluminium frame, safety film',
  why: 'Approved for bathrooms. Rated 4.7 by 1,500 people.', rating: [4.7, 1505],
  url: U.ikea('lindbyn-mirror-black-30590450'), finishes: [['Black', '#262626']],
  model: { main: 'blackMetal', shape: 'round' } });
b({ id: 'ikea-lindbyn-80', cat: 'mirror', name: 'LINDBYN mirror 31½"', store: 'ikea', price: 59.99, dims: [80, 3, 80],
  material: 'Recycled aluminium frame, safety film',
  why: 'A big round mirror bounces light around and makes the room feel larger.',
  url: U.ikea('lindbyn-mirror-black-60507204'), finishes: [['Black', '#262626']],
  model: { main: 'blackMetal', shape: 'round' } });
b({ id: 'ikea-nissedal', cat: 'floorMirror', name: 'NISSEDAL mirror', store: 'ikea', price: 49.99, dims: [65, 30, 150],
  material: 'Walnut-effect frame, safety film',
  why: 'Guests always ask for a full-length mirror. Lean it or hang it.',
  url: U.ikea('nissedal-mirror-walnut-effect-30501864'), finishes: [['Walnut effect', '#7a5230']],
  model: { main: 'laminate' }, tags: ['airbnb'] });
b({ id: 'ikea-hemnes-shelf', cat: 'tallCabinet', name: 'HEMNES bathroom shelf unit', store: 'ikea', price: 99.99, dims: [42, 32, 172],
  material: 'Solid pine and fibreboard, painted',
  why: 'Open shelves keep towels and toiletries in reach for guests.',
  url: U.ikea('hemnes-bathroom-shelf-unit-white-90400447'),
  finishes: [['White', '#f1efe9', U.ikea('hemnes-bathroom-shelf-unit-white-90400447')], ['Black-brown', '#3b3129', U.ikea('hemnes-bathroom-shelf-unit-black-brown-70400448')]],
  kind: 'shelfUnit', model: { main: 'paint' } });
b({ id: 'walmart-towel-ladder', cat: 'towelRack', name: 'Arched bamboo blanket ladder', store: 'walmart', price: 29.99, dims: [45, 30, 150],
  material: 'Natural bamboo',
  why: 'Leans on the wall, no drilling: towels in the bathroom or throws in the living room.',
  url: U.walmart('Versatile-Arched-Bamboo-Blanket-Ladder-Natural/17262772063'), finishes: [['Natural bamboo', '#c9a878']],
  model: { main: 'wood' } });
b({ id: 'walmart-luggage-rack', cat: 'luggageRack', name: 'Folding bamboo luggage rack, 2-pack', store: 'walmart', price: 39.99, dims: [66, 40, 50],
  material: 'Bamboo, nylon straps, holds 131 lb',
  why: 'Hotel-style comfort that guests notice and mention in reviews. Two in the pack.',
  url: U.walmart('2-Pack-Luggage-Rack-Folding-Luggage-Rack-Guest-Room-Bamboo-Suitcase-Stand-Holds-131-lb-Luggage-Stand-Storage-Shelf-Hotel-Bedroom/13812523827'),
  finishes: [['Natural bamboo', '#c9a878']], unit: '2-pack', model: { main: 'wood' }, tags: ['airbnb'] });
b({ id: 'ikea-godmorgon', cat: 'vanity', name: 'GODMORGON / TOLKEN vanity with sink', store: 'ikea', price: 499, dims: [82, 49, 88],
  material: 'Moisture-resistant foil, marble-effect countertop, DALSKÄR faucet',
  why: 'Wall-hung, so the floor is easy to clean. Drawers are sealed against water.',
  url: 'https://www.ikea.com/us/en/p/godmorgon-tolken-toernviken-cabinet-countertop-19-5-8-sink-high-gloss-white-marble-effect-dalskaer-faucet-s79308704/',
  finishes: [['High-gloss white / marble effect', '#f4f3f0']], model: { main: 'lacquer' }, tags: ['upgrade'] });

// ---- textiles ----
b({ id: 'ikea-gurli-pillows', cat: 'pillows', name: 'GURLI cushion covers 20x20", 2', store: 'ikea', price: 11.98, unit: 'set of 2',
  material: '100% cotton, machine washable',
  why: 'The cheapest way to change the look of a room. Wash them after every guest.',
  url: U.ikea('gurli-cushion-cover-white-70518607'),
  finishes: [['White', '#f1efe9'], ['Beige', '#d3c8b4'], ['Green', '#7b8766'], ['Dark gray', '#4a4c4f']],
  model: { main: 'fabric' }, addons: [INSERTS] });
b({ id: 'ikea-gurli-throw', cat: 'throw', name: 'GURLI throw', store: 'ikea', price: 12.99,
  material: 'Cotton-blend, machine washable',
  why: 'A throw over the arm makes a sofa look lived-in instantly.',
  url: U.ikea('gurli-throw-gray-black-20204906'), finishes: [['Gray-black', '#5c5d5c']], model: { main: 'fabric' } });
b({ id: 'ikea-angslilja', cat: 'bedding', name: 'ÄNGSLILJA duvet cover and pillowcases, Full/Queen', store: 'ikea', price: 39.99,
  material: '100% pre-washed cotton, 125 thread count',
  why: 'Washed cotton looks relaxed even when it isn\'t ironed, which saves time between guests.',
  url: U.ikea('aengslilja-duvet-cover-and-pillowcase-s-white-00318541'),
  finishes: [['White', '#f5f3ef', U.ikea('aengslilja-duvet-cover-and-pillowcase-s-white-00318541')], ['Natural', '#e2d8c6', U.ikea('aengslilja-duvet-cover-and-pillowcase-s-natural-30591987')], ['Gray-green', '#9ea696', U.ikea('aengslilja-duvet-cover-and-pillowcase-s-gray-green-70585183')], ['Blue-gray', '#8c9aa8', U.ikea('aengslilja-duvet-cover-and-pillowcase-s-blue-gray-40585226')]],
  model: { main: 'linen' } });
b({ id: 'ikea-hannalill', cat: 'curtains', name: 'HANNALILL curtains, 1 pair', store: 'ikea', price: 29.99, unit: 'pair',
  material: 'Light-filtering cotton-blend, 57x98"',
  why: 'Soft daylight and privacy. Hang them just under the ceiling for taller-looking windows.',
  url: 'https://www.ikea.com/us/en/p/hannalill-curtains-1-pair-beige-30410883/', finishes: [['Beige', '#e6dccb']],
  model: { main: 'linen' }, addons: [ROD] });
b({ id: 'ikea-hannalena', cat: 'curtains', name: 'HANNALENA room-darkening curtains, 1 pair', store: 'ikea', price: 39.99, unit: 'pair',
  material: 'Room-darkening polyester, 57x98"',
  why: 'Blocks most light so guests sleep in. The #1 Airbnb bedroom complaint is light.',
  url: U.ikea('hannalena-room-darkening-curtains-1-pair-gray-90410875'), finishes: [['Gray', '#9a9b98']],
  model: { main: 'linen' }, addons: [ROD], tags: ['airbnb', 'bedroom'] });
b({ id: 'ikea-vagsjon', cat: 'towels', name: 'VÅGSJÖN towel set', store: 'ikea', price: 24.99,
  material: '100% cotton terry, 400 g/m²',
  why: 'Soft, absorbent and cheap enough to keep a spare set for guests.',
  url: U.ikea('vagsjoen-hand-bath-towel-set-s39505985'), finishes: [['Light beige', '#e2d6c1'], ['White', '#f5f3ef']],
  model: { main: 'terry' } });

// =====================================================================================
// LUXURY: Article (with Target textiles and a few IKEA essentials)
// =====================================================================================
const l = (o) => add({ tier: 'luxury', ...o });
const A = U.article;

l({ id: 'article-sven-loveseat', cat: 'sofa', name: 'Sven 72" tufted loveseat', store: 'article', price: 1199, dims: [183, 98, 86],
  material: 'Polyester-acrylic tested to 50,000 rubs, Pirelli webbing, solid wood legs',
  why: 'The compact version of Article\'s best-selling sofa: all the comfort in less space.',
  url: A(27057, 'sven-72-tufted-loveseat-stone-gray'),
  finishes: [['Stone gray', '#8f8f8a', A(27057, 'sven-72-tufted-loveseat-stone-gray')], ['Biscuit cream', '#ddd2bf', A(27067, 'sven-72-tufted-loveseat-biscuit-cream')], ['Plush Pacific ginger velvet', '#b8703f', A(24831, 'sven-72-tufted-velvet-loveseat-plush-pacific-ginger')]],
  model: { main: 'fabric', seats: 2, seat: 'bench', back: 'cushion', bolsters: true, arm: 'track', legs: 'taper' }, tags: ['compact'] });
l({ id: 'article-sven-sofa', cat: 'sofa', name: 'Sven 88" tufted sofa', store: 'article', price: 1499, dims: [224, 98, 86],
  material: 'Polyester-acrylic tested to 50,000 rubs, Pirelli webbing, solid wood legs',
  why: 'Article\'s most popular sofa for 10 years: tufted bench seat, round bolsters, mid-century lines.',
  url: A(27056, 'sven-88-tufted-sofa-stone-gray'),
  finishes: [['Stone gray', '#8f8f8a', A(27056, 'sven-88-tufted-sofa-stone-gray')], ['Biscuit cream', '#ddd2bf', A(27069, 'sven-88-tufted-sofa-biscuit-cream')], ['Fir green', '#3f5446', A(27068, 'sven-88-tufted-sofa-fir-green')], ['Plush Pacific green velvet', '#2f5a52', A(24751, 'sven-88-tufted-velvet-sofa-plush-pacific-green')]],
  model: { main: 'fabric', seats: 3, seat: 'bench', back: 'cushion', bolsters: true, arm: 'track', legs: 'taper' } });
l({ id: 'article-gabriola-chair', cat: 'armchair', name: 'Gabriola 34" lounge chair', store: 'article', price: 499, dims: [86, 84, 76],
  material: 'Bouclé on a solid wood frame',
  why: 'Curvy bouclé is the most-wanted chair shape right now. It softens a boxy room.',
  url: A(21475, 'gabriola-34-lounge-chair-ivory-boucle'),
  finishes: [['Ivory bouclé', '#e8e1d4', A(21475, 'gabriola-34-lounge-chair-ivory-boucle')], ['Sandstone wool bouclé', '#cdb89b', A(22235, 'gabriola-34-lounge-chair-sandstone-wool-boucle')], ['Dover gray bouclé', '#9b9a96', A(21477, 'gabriola-34-lounge-chair-dover-gray-boucle')], ['Green wool bouclé', '#6d7457', A(29182, 'gabriola-34-lounge-chair-green-wool-boucle')]],
  kind: 'accentChair', model: { main: 'boucle' } });
l({ id: 'article-amoeba-coffee', cat: 'coffeeTable', name: 'Amoeba 35.5" round coffee table', store: 'article', price: 399, dims: [90, 90, 38],
  material: 'Laminated American black walnut',
  why: 'A round table is easier to walk around in a small living room, and the walnut grain is beautiful.',
  url: A(29856, 'amoeba-35-5-round-coffee-table-walnut'), finishes: [['Walnut', '#6e4a2e']],
  model: { main: 'wood', shape: 'round' } });
l({ id: 'article-lenia-coffee', cat: 'coffeeTable', name: 'Lenia 53.5" oval coffee table', store: 'article', price: 599, dims: [136, 68, 38],
  material: 'Solid black walnut',
  why: 'A surfboard-shaped oval in solid walnut: soft corners, big surface.',
  url: A(24417, 'lenia-53-5-oval-coffee-table-walnut'), finishes: [['Walnut', '#6e4a2e']],
  model: { main: 'wood', shape: 'oval' } });
l({ id: 'article-lenia-side', cat: 'sideTable', name: 'Lenia storage side table', store: 'article', price: 299, dims: [45, 45, 56],
  material: 'Walnut, storage cubby',
  why: 'Hides the remote and a book.',
  url: A(25370, 'lenia-storage-side-table-walnut'), finishes: [['Walnut', '#6e4a2e']],
  model: { main: 'wood' } });
l({ id: 'article-hurley-rug', cat: 'rug', name: 'Hurley 8x10 performance rug', store: 'article', price: 499, dims: [305, 244, 1],
  material: 'Performance fibre, stain resistant',
  why: 'A performance rug shrugs off spills: good for kids, pets and guests.',
  url: A(24976, 'hurley-8-x-10-performance-rug-beige-fleck'), finishes: [['Beige fleck', '#cbbba0']],
  model: { main: 'rug', pattern: 'fleck' } });
l({ id: 'article-hira-rug', cat: 'rug', name: 'Hira 8x10 rug', store: 'article', price: 899, dims: [305, 244, 2],
  material: 'Hand-made wool blend, thick loop pile',
  why: 'Soft, thick and natural ivory: it makes the room feel quiet.',
  url: A(23754, 'hira-8-x-10-rug-natural-ivory'), finishes: [['Natural ivory', '#e8e0cf']],
  model: { main: 'rug', pattern: 'beni' } });
l({ id: 'article-jokuna-media', cat: 'mediaUnit', name: 'Jokuna 47.5" media unit', store: 'article', price: 799, dims: [121, 40, 58],
  material: 'American walnut, sliding doors, cable cut-outs',
  why: 'Japandi sliding doors hide the clutter; the cable holes keep the wires out of sight.',
  url: A(18011, 'jokuna-47-5-media-unit-walnut'), finishes: [['Walnut', '#6e4a2e']],
  model: { main: 'wood' } });
l({ id: 'article-felix-media', cat: 'mediaUnit', name: 'Felix 72" media unit', store: 'article', price: 999, dims: [183, 43, 61],
  material: 'Walnut',
  why: 'Long and low: grounds a big TV wall.',
  url: A(24795, 'felix-72-media-unit-walnut'), finishes: [['Walnut', '#6e4a2e']],
  model: { main: 'wood' } });
l({ id: 'article-crescent-lamp', cat: 'floorLamp', name: 'Crescent floor lamp', store: 'article', price: 299, dims: [40, 40, 190],
  material: 'Matte black steel, marble base, adjustable shade',
  why: 'An arching lamp lights the seat from above, so you don\'t need a ceiling light.',
  url: A(3568, 'crescent-floor-lamp-black'), finishes: [['Matte black', '#232323']],
  model: { main: 'blackMetal', lamp: 'arc', reach: 0.85 }, addons: [BULB] });
l({ id: 'article-todd-lamp', cat: 'tableLamp', name: 'Todd table lamp', store: 'article', price: 99, dims: [25, 25, 48],
  material: 'Powder-coated steel dome',
  why: 'Scandinavian dome that directs light down onto a book.',
  url: A(24946, 'todd-table-lamp-black'), finishes: [['Black', '#232323']],
  model: { main: 'blackMetal', lamp: 'dome' }, addons: [BULB] });
l({ id: 'article-moon-lamp', cat: 'tableLamp', name: 'Moon table lamp', store: 'article', price: 149, dims: [25, 25, 40],
  material: 'Gold-coloured metal, frosted glass globe',
  why: 'A glowing globe gives soft all-round light at the bedside.',
  url: A(18786, 'moon-table-lamp-gold'), finishes: [['Gold', '#c4a060']],
  model: { main: 'metal', lamp: 'globe' }, addons: [BULB] });
l({ id: 'article-gemma-pendant', cat: 'ceilingLight', name: 'Gemma pendant lamp', store: 'article', price: 149, dims: [36, 36, 30],
  material: 'Brass-coloured metal dome',
  why: 'A brass dome over the table adds a warm gleam.',
  url: A(18736, 'gemma-pendant-lamp-brass'),
  finishes: [['Brass', '#b8925a', A(18736, 'gemma-pendant-lamp-brass')], ['Black', '#232323', A(18737, 'gemma-pendant-lamp-black')], ['Green', '#3f5446', A(18738, 'gemma-pendant-lamp-green')]],
  model: { main: 'metal', light: 'dome' }, addons: [BULB] });
l({ id: 'article-suru-pendant', cat: 'ceilingLight', name: 'Suru small pendant lamp', store: 'article', price: 199, dims: [46, 46, 40],
  material: 'Rattan woven over a metal frame',
  why: 'Island-style rattan throws dappled light: lovely in bedrooms and coastal rooms.',
  url: A(12215, 'suru-small-pendant-lamp'), finishes: [['Natural rattan', '#c9a878']],
  model: { main: 'jute', light: 'woven' }, addons: [BULB] });
l({ id: 'target-olive-tree', cat: 'plant', name: 'Asymmetrical faux olive tree (Threshold x Studio McGee)', store: 'target', price: 150, dims: [70, 70, 170],
  material: 'Artificial olive tree in a pot',
  why: 'A tall olive tree fills an empty corner and looks natural in photos. No watering.',
  url: U.target('asymmetrical-olive-tree-threshold-8482-designed-with-studio-mcgee/-/A-94685925'), finishes: [['Olive / stone pot', '#d6cdbd']],
  model: { main: 'matteCeramic', leaf: 'olive' } });
l({ id: 'article-newberry-shelf', cat: 'bookcase', name: 'Newberry wide bookcase', store: 'article', price: 549, dims: [79, 38, 178],
  material: 'Walnut shelves, gunmetal steel frame',
  why: 'Open shelves feel lighter than a closed cabinet and show off books and plants.',
  url: 'https://www.article.com/product/18769/newberry-31-25-wide-bookcase-walnut', finishes: [['Walnut', '#6e4a2e']],
  model: { main: 'wood', frame: 'etagere' } });
l({ id: 'target-mcgee-canvas', cat: 'wallArt', name: '30x30" framed canvas (Threshold x Studio McGee)', store: 'target', price: 70, dims: [76, 4, 76],
  material: 'Printed canvas, wood-look frame',
  why: 'A square abstract in soft tones ties the palette together.',
  url: U.target('30-34-x-30-34-beautiful-brushwork-framed-canvas-threshold-8482-designed-with-studio-mcgee/-/A-81785395'), finishes: [['Brushwork', '#b8a58a']],
  model: { main: 'art', art: 'abstract' } });
l({ id: 'target-mcgee-landscape', cat: 'wallArt', name: '36x36" landscape framed canvas (Threshold x Studio McGee)', store: 'target', price: 100, dims: [91, 4, 91],
  material: 'Printed canvas, wood-look frame',
  why: 'A misty landscape adds depth, like a window to somewhere else.',
  url: U.target('36-34-x-36-34-dreary-abstract-landscape-framed-wall-canvas-threshold-8482-designed-with-studio-mcgee/-/A-79502253'), finishes: [['Landscape', '#8c9b7a']],
  model: { main: 'art', art: 'landscape' } });
l({ id: 'article-basi-bed', cat: 'bed', name: 'Basi Queen platform bed', store: 'article', price: 999, dims: [165, 218, 76],
  material: 'Walnut veneer, solid plywood, floating base',
  why: 'The hidden base makes the bed look like it floats. No box spring needed.',
  url: A(25637, 'basi-queen-bed-frame-walnut'), finishes: [['Walnut', '#6e4a2e']],
  model: { main: 'wood', head: 'panel' },
  addons: [{ id: 'article-leesa-studio', name: 'Leesa Studio Queen mattress', store: 'article', price: 559, url: A(23863, 'leesa-studio-queen-mattress'), why: 'Memory foam with a 120-night trial.' }] });
l({ id: 'article-cooper-nightstand', cat: 'nightstand', name: 'Cooper 1-drawer nightstand', store: 'article', price: 299, dims: [45, 40, 55],
  material: 'Walnut, soft-close drawer',
  why: 'Small footprint, soft-close drawer.',
  url: A(26897, 'cooper-1-drawer-nightstand-walnut'), finishes: [['Walnut', '#6e4a2e']],
  model: { main: 'wood' } });
l({ id: 'article-cooper-dresser', cat: 'dresser', name: 'Cooper 6-drawer double dresser', store: 'article', price: 899, dims: [150, 45, 80],
  material: 'Walnut, soft-close drawers',
  why: 'Apartment-sized double dresser with a matching nightstand.',
  url: A(26893, 'cooper-6-drawer-double-dresser-walnut'), finishes: [['Walnut', '#6e4a2e']],
  model: { main: 'wood' } });
l({ id: 'article-kouva-bench', cat: 'bench', name: 'Kouva 47" storage bench', store: 'article', price: 499, dims: [120, 40, 46],
  material: 'Natural oak, upholstered seat, storage',
  why: 'A place to sit and put on shoes, with storage for spare blankets.',
  url: A(25779, 'kouva-47-bench-natural-oak-and-santolina-gray'), finishes: [['Natural oak / Santolina gray', '#a6a497']],
  model: { main: 'fabric' } });
l({ id: 'article-newberry-desk', cat: 'desk', name: 'Newberry 43.25" desk', store: 'article', price: 449, dims: [110, 55, 76],
  material: 'Walnut top, gunmetal steel frame',
  why: 'Warm walnut on a slim steel frame: big enough for a monitor, small enough for a bedroom.',
  url: A(18766, 'newberry-43-25-desk-walnut'), finishes: [['Walnut', '#6e4a2e']],
  model: { main: 'wood' } });
l({ id: 'ikea-markus', cat: 'officeChair', name: 'MARKUS office chair', store: 'ikea', price: 249, dims: [62, 60, 135],
  material: 'Mesh back, Vissle fabric, adjustable tilt and headrest',
  why: 'The most recommended budget ergonomic chair: 10-year guarantee, headrest, lockable tilt.',
  url: U.ikea('markus-office-chair-vissle-dark-gray-90289172'), finishes: [['Vissle dark gray', '#3f4144']],
  model: { main: 'fabric' } });
l({ id: 'ikea-flintan-arms', cat: 'officeChair', name: 'FLINTAN office chair with armrests', store: 'ikea', price: 99.99, dims: [67, 67, 108],
  material: 'Mesh back, lumbar support, removable seat cover',
  why: 'Ergonomic basics (lumbar support, armrests, tilt lock) for under $100.',
  url: U.ikea('flintan-office-chair-with-armrests-beige-s49424465'),
  finishes: [['Beige', '#d8cbb4', U.ikea('flintan-office-chair-with-armrests-beige-s49424465')], ['Black', '#262626', U.ikea('flintan-office-chair-with-armrests-black-s29424471')]],
  model: { main: 'fabric', v: 'basic' } });
l({ id: 'article-seno-dining', cat: 'diningTable', name: 'Seno 71" dining table', store: 'article', price: 799, dims: [180, 90, 76],
  material: 'Walnut, solid wood legs',
  why: 'A classic mid-century table that seats six.',
  url: A(27599, 'seno-71-dining-table-walnut'), finishes: [['Walnut', '#6e4a2e']],
  model: { main: 'wood', seats: 6 } });
l({ id: 'article-nosh-chair', cat: 'diningChair', name: 'Nosh dining chair', store: 'article', price: 175, dims: [48, 53, 81], unit: 'each (sold in pairs)',
  material: 'Solid walnut, textured upholstery',
  why: 'Designed to tuck snugly under the table, with real back support.',
  url: A(24358, 'nosh-dining-chair-walnut-and-chalk-gray'),
  finishes: [['Walnut / Chalk gray', '#b4b2ab', A(24358, 'nosh-dining-chair-walnut-and-chalk-gray')], ['Walnut / Hemlock green', '#4c5a4a', A(24359, 'nosh-dining-chair-walnut-and-hemlock-green')], ['Walnut / Quarry gray', '#77756f', A(24362, 'nosh-dining-chair-walnut-and-quarry-gray')]],
  kind: 'diningChair', model: { main: 'fabric' } });
l({ id: 'article-liv-sideboard', cat: 'sideboard', name: 'Liv 58" sideboard', store: 'article', price: 1299, dims: [147, 45, 76],
  material: 'Walnut, fluted fronts, brass handles',
  why: 'Fluted walnut and brass: storage that looks like furniture, not a cupboard.',
  url: A(25750, 'liv-58-sideboard-walnut'), finishes: [['Walnut', '#6e4a2e']],
  model: { main: 'wood' } });
l({ id: 'article-meron-mirror', cat: 'mirror', name: 'Meron round mirror', store: 'article', price: 249, dims: [76, 5, 76],
  material: 'Woven coconut midrib, powder-coated iron',
  why: 'A woven frame brings coastal texture to the wall.',
  url: A(13687, 'meron-round-wall-mirror-natural'), finishes: [['Natural', '#c9a878']],
  model: { main: 'jute', shape: 'round' } });
l({ id: 'article-gabriola-pillows', cat: 'pillows', name: 'Gabriola bouclé pillow set, 2', store: 'article', price: 99, unit: 'set of 2',
  material: 'Bouclé cover, down-blend insert',
  why: 'Matching bouclé cushions add texture that photographs beautifully.',
  url: A(21473, 'gabriola-pillow-set-ivory-boucle'),
  finishes: [['Ivory bouclé', '#e8e1d4', A(21473, 'gabriola-pillow-set-ivory-boucle')], ['Sandstone wool bouclé', '#cdb89b', A(22233, 'gabriola-pillow-set-sandstone-wool-boucle')]],
  model: { main: 'boucle' } });
l({ id: 'article-jadara-throw', cat: 'throw', name: 'Jadara wool throw', store: 'article', price: 129,
  material: 'Super-soft wool blend',
  why: 'A saturated colour on the sofa arm lifts a neutral room.',
  url: A(19331, 'jadara-peacock-blue-throw'), finishes: [['Peacock blue', '#2f5f73']], model: { main: 'knit' } });
l({ id: 'target-sateen-duvet', cat: 'bedding', name: 'Washed cotton sateen duvet cover set, Full/Queen (Threshold)', store: 'target', price: 70,
  material: '250 thread count cotton sateen, OEKO-TEX certified',
  why: 'Hotel-like sheen, soft, and washable at home.',
  url: U.target('washed-cotton-sateen-duvet-cover-and-sham-set-threshold/-/A-81902448'),
  finishes: [['White', '#f5f3ef'], ['Sage', '#a9b39b'], ['Light gray', '#c8c8c4'], ['Indigo', '#3b4a66', U.target('full-queen-washed-cotton-sateen-duvet-cover-and-sham-set-indigo-threshold-8482/-/A-89211205')]],
  model: { main: 'linen' } });
l({ id: 'target-linen-panel', cat: 'curtains', name: 'Light-filtering linen curtain panel (Threshold)', store: 'target', price: 35, unit: 'panel', perWindow: 2,
  material: 'Linen-rayon blend, rod pocket and back tabs',
  why: 'Real linen texture softens the light. Buy two per window so they look full.',
  url: U.target('1pc-light-filtering-linen-window-curtain-panel-threshold/-/A-54168343'), finishes: [['Cream', '#eee8dd'], ['White', '#fbfaf6']],
  model: { main: 'linen' }, addons: [ROD_BLACK] });
l({ id: 'target-performance-towels', cat: 'towels', name: 'Performance Plus bath towels, 6-pack (Threshold)', store: 'target', price: 50, unit: '6-pack',
  material: 'Heavyweight cotton terry, fade-resistant',
  why: 'Thick, fade-resistant towels that survive hotel-style washing.',
  url: U.target('threshold-6-pack-performance-plus-bath-towel-white/-/A-95033971'), finishes: [['White', '#f5f3ef']],
  model: { main: 'terry' } });

// =====================================================================================
// SUPREME: Design Within Reach
// =====================================================================================
const s = (o) => add({ tier: 'supreme', ...o });
const D = U.dwr;

s({ id: 'dwr-reid-sofa', cat: 'sofa', name: 'Reid Sofa', store: 'dwr', price: 5495, dims: [218, 94, 74],
  material: 'Down- and feather-wrapped foam seat, down-blend back cushions, wide arms',
  why: 'You sink into it rather than sit on it. Designed by Bernett and Dodziuk, made to last decades.',
  url: 'https://www.dwr.com/living-sofas-sectionals/reid-sofa/476317.html?lang=en_US',
  finishes: [['Oatmeal fabric', '#d8cfbf'], ['Graphite fabric', '#56585a'], ['Cognac leather', '#8a4e2b']],
  model: { main: 'fabric', seats: 3, arm: 'wide', base: 'plinth' } });
s({ id: 'dwr-reid-armchair', cat: 'armchair', name: 'Reid Armchair', store: 'dwr', price: 3195, dims: [89, 94, 74],
  material: 'Down- and feather-wrapped foam, fabric or full-grain leather',
  why: 'Matches the Reid sofa for a calm, unified look.',
  url: D('living-lounge-chairs/reid-armchair/2188'),
  finishes: [['Cognac leather', '#8a4e2b'], ['Oatmeal fabric', '#d8cfbf'], ['Olive velvet', '#5f6445']],
  model: { main: 'leather', seats: 1, arm: 'wide', base: 'legs', legs: 'metal' } });
s({ id: 'dwr-noguchi-table', cat: 'coffeeTable', name: 'Noguchi Table (Herman Miller)', store: 'dwr', price: 2495, dims: [128, 93, 40],
  material: 'Solid wood interlocking base, 3/4" glass top',
  why: 'Isamu Noguchi\'s 1948 sculpture you can put your coffee on. Authentic and signed.',
  url: D('living-accent-coffee-tables/noguchi-table/6115'),
  finishes: [['Walnut', '#5b3d25'], ['White ash', '#e1d6c3'], ['Black', '#222222']],
  kind: 'noguchi', model: { main: 'wood' } });
s({ id: 'dwr-saarinen-side', cat: 'sideTable', name: 'Saarinen Side Table, Oval', store: 'dwr', price: 1895, dims: [58, 41, 51],
  material: 'Marble top, cast-aluminium tulip base',
  why: 'The tulip base from 1957: one elegant leg instead of four.',
  url: D('living-side-end-tables/saarinen-side-table/2264'),
  finishes: [['White marble / white base', '#f1efea'], ['Arabescato marble', '#e7e3dc']],
  kind: 'tulipTable', model: { main: 'marble', shape: 'oval' } });
s({ id: 'dwr-jude-rug', cat: 'rug', name: 'Jude Handloom Wool Rug 8x10', store: 'dwr', price: 2495, dims: [305, 244, 2],
  material: '100% New Zealand wool, varied pile height',
  why: 'Subtle pile heights catch the light like a woven textile.',
  url: D('rug-type-area-rug/jude-handloom-wool-rug/2567197'), finishes: [['Natural', '#d9cfbd'], ['Fog', '#b9b6ae']],
  model: { main: 'rug', pattern: 'beni' } });
s({ id: 'dwr-line-credenza', cat: 'mediaUnit', name: 'Line Credenza, Large', store: 'dwr', price: 5395, dims: [183, 48, 75],
  material: 'Solid walnut and walnut veneer, 4 doors, 4 shelves',
  why: 'Horizontal lines give a restful look; the doors hide the media clutter.',
  url: D('storage-credenzas-sideboards/line-credenza/5157'), finishes: [['Walnut', '#5b3d25'], ['White oak', '#c7ab85']],
  model: { main: 'wood' } });
s({ id: 'dwr-arco', cat: 'floorLamp', name: 'Arco Floor Lamp (Flos)', store: 'dwr', price: 4295, dims: [40, 40, 240],
  material: 'Carrara marble base, stainless steel arc, polished shade',
  why: 'The Castiglioni brothers\' 1962 icon: overhead light over the sofa without wiring the ceiling. In MoMA\'s collection.',
  url: D('lighting-floor/arco-floor-lamp/780'), finishes: [['Stainless / Carrara', '#c7c9cb']],
  model: { main: 'metal', lamp: 'arc', reach: 1.9 } });
s({ id: 'dwr-nelson-saucer', cat: 'ceilingLight', name: 'Nelson Saucer Bubble Pendant, Small', store: 'dwr', price: 655, dims: [44, 44, 26],
  material: 'Translucent polymer over a steel frame',
  why: 'George Nelson\'s 1952 Bubble Lamp glows softly like a paper lantern, but lasts forever.',
  url: D('lighting-ceiling/nelson-saucer-bubble-pendant/6241'), finishes: [['White', '#f4f1ea']],
  model: { main: 'paper', light: 'saucer' }, addons: [BULB] });
s({ id: 'dwr-tolomeo', cat: 'deskLamp', name: 'Tolomeo Desk Lamp (Artemide)', store: 'dwr', price: 395, dims: [23, 60, 65],
  material: 'Polished aluminium, tension cables, fully adjustable',
  why: 'Compasso d\'Oro winner: holds any position, lasts a lifetime.',
  url: D('lighting-table-lamps/tolomeo-desk-lamp/7468'), finishes: [['Aluminium', '#c7c9cb']],
  kind: 'tableLamp', model: { main: 'metal', lamp: 'task' }, addons: [BULB] });
s({ id: 'dwr-string-shelving', cat: 'bookcase', name: 'String Wall Shelving', store: 'dwr', price: 795, dims: [78, 30, 200],
  material: 'Powder-coated steel ladders, walnut shelves',
  why: 'The 1949 Swedish system: floats on the wall and grows with you.',
  url: D('storage-shelving-systems/string-wall-shelving/2198146'), finishes: [['Walnut / white', '#5b3d25'], ['Oak / black', '#b58a5a']],
  model: { main: 'wood', frame: 'etagere' } });
s({ id: 'dwr-organic-forms', cat: 'wallArt', name: 'Organic Forms Framed Poster', store: 'dwr', price: 395, dims: [61, 4, 81],
  material: 'Archival print on cotton paper, maple frame',
  why: 'Archival Herman Miller artwork that floats inside its frame.',
  url: D('accessories-art/organic-forms-poster/2540051'), finishes: [['Natural maple frame', '#c7ab85']],
  model: { main: 'art', art: 'abstract' } });
s({ id: 'dwr-matera-bed', cat: 'bed', name: 'Matera Bed, Queen', store: 'dwr', price: 3995, dims: [170, 226, 97],
  material: 'Solid walnut or oak, slotted mortise-and-tenon joints',
  why: 'Beveled edges and slotted joints: a bed that is also a piece of joinery. No box spring needed.',
  url: D('bedroom-beds/matera-bed/5114'), finishes: [['Walnut', '#5b3d25'], ['Oak', '#b58a5a']],
  model: { main: 'wood', head: 'wood' },
  addons: [{ id: 'dwr-sonno-m', name: 'Sonno M Mattress, Queen', store: 'dwr', price: 1495, url: D('bedroom-mattresses-pillows/sonno-m-mattress/2516559'), why: 'Italian-made memory foam, 10-year warranty.' }] });
s({ id: 'dwr-matera-bedside', cat: 'nightstand', name: 'Matera Bedside Table', store: 'dwr', price: 995, dims: [56, 41, 46],
  material: 'Solid walnut',
  why: 'Matches the bed; the drawer closes softly.',
  url: D('bedroom-bedside-tables/matera-bedside-table/991'), finishes: [['Walnut', '#5b3d25'], ['Oak', '#b58a5a']],
  model: { main: 'wood' } });
s({ id: 'dwr-thin-edge', cat: 'dresser', name: 'Nelson Thin Edge Double Dresser (Herman Miller)', store: 'dwr', price: 6995, dims: [142, 48, 83],
  material: 'Sustainable veneers, aluminium legs, 85% recycled material',
  why: 'George Nelson\'s 1952 Rosewood Case Series: impossibly thin edges.',
  url: D('bedroom-dressers-armoires/nelson-thin-edge-double-dresser/3650'), finishes: [['Walnut', '#5b3d25'], ['White oak', '#c7ab85']],
  model: { main: 'wood' } });
s({ id: 'dwr-platform-bench', cat: 'bench', name: 'Nelson Platform Bench (Herman Miller)', store: 'dwr', price: 1395, dims: [122, 47, 36],
  material: 'Solid maple slats, finger-jointed base',
  why: 'A bench or a low table: the 1946 slatted design works at the foot of a bed or in a hall.',
  url: D('living-benches-stools/nelson-platform-bench/1022'), finishes: [['Natural maple', '#d8bd95'], ['Ebony', '#262321']],
  kind: 'platformBench', model: { main: 'wood' } });
s({ id: 'dwr-swag-desk', cat: 'desk', name: 'Nelson Swag Leg Desk (Herman Miller)', store: 'dwr', price: 3295, dims: [99, 71, 86],
  material: 'Walnut, swag-curved steel legs, colourful cubbies',
  why: 'George Nelson\'s 1958 desk with cubbies for everything; the centre one fits a laptop.',
  url: D('office-desks/nelson-swag-leg-desk/6255'), finishes: [['Walnut / white', '#5b3d25']],
  model: { main: 'wood' } });
s({ id: 'dwr-aeron', cat: 'officeChair', name: 'Aeron Chair (Herman Miller)', store: 'dwr', price: 1620, dims: [69, 66, 104],
  material: '8Z Pellicle mesh, PostureFit SL, 12-year warranty',
  why: 'Often named the best ergonomic chair ever made. The mesh keeps you cool.',
  url: D('office-chairs/aeron-chair/100077379'), finishes: [['Graphite', '#303133'], ['Mineral', '#b9bcbf']],
  model: { main: 'fabric', v: 'supreme' } });
s({ id: 'dwr-saarinen-dining', cat: 'diningTable', name: 'Saarinen Dining Table, Round 48"', store: 'dwr', price: 3695, dims: [122, 122, 72],
  material: 'Marble top, cast-aluminium tulip base',
  why: 'No legs to bump your knees: everyone gets a good seat. Seats four to five.',
  url: D('kitchen-dining-tables/saarinen-dining-table/7204'), finishes: [['White marble', '#f1efea'], ['Arabescato marble', '#e7e3dc']],
  model: { main: 'marble', shape: 'round', seats: 4 } });
s({ id: 'dwr-wishbone', cat: 'diningChair', name: 'Wishbone Chair (Carl Hansen)', store: 'dwr', price: 895, dims: [55, 51, 76],
  material: 'Steam-bent solid wood, hand-woven paper cord seat',
  why: 'Hans Wegner\'s 1949 chair: over 100 steps, mostly by hand.',
  url: D('kitchen-dining-chairs-benches/wishbone-chair/2582'), finishes: [['Oak / natural cord', '#c7ab85'], ['Walnut / natural cord', '#5b3d25'], ['Black / natural cord', '#262321']],
  kind: 'wishbone', model: { main: 'wood' } });
s({ id: 'dwr-line-credenza-dining', cat: 'sideboard', name: 'Line Credenza, Large', store: 'dwr', price: 5395, dims: [183, 48, 75],
  material: 'Solid walnut and walnut veneer',
  why: 'Stores the good plates and gives the wall a calm horizon line.',
  url: D('storage-credenzas-sideboards/line-credenza/5157'), finishes: [['Walnut', '#5b3d25'], ['White oak', '#c7ab85']],
  model: { main: 'wood' } });
s({ id: 'dwr-adnet-mirror', cat: 'mirror', name: 'Adnet Round Mirror (Gubi)', store: 'dwr', price: 795, dims: [70, 8, 70],
  material: 'Mirror wrapped in hand-stitched leather strap, brass buckle',
  why: 'Jacques Adnet\'s 1946 leather-strapped mirror: a jewel on the wall.',
  url: D('mirrors-wall-mirrors/adnet-round-mirror/705'), finishes: [['Cognac leather', '#8a4e2b'], ['Black leather', '#1f1f1f']],
  model: { main: 'leather', shape: 'round' } });
s({ id: 'dwr-string-bath', cat: 'tallCabinet', name: 'String Bathroom Shelving', store: 'dwr', price: 695, dims: [60, 30, 170],
  material: 'Powder-coated steel, ash or oak shelves',
  why: 'Floating shelves keep the floor clear and the bathroom calm.',
  url: D('bath/string-bathroom-shelving/2551983'), finishes: [['White / ash', '#f1efea']],
  kind: 'shelfUnit', model: { main: 'paint' } });
s({ id: 'dwr-oona-pillow', cat: 'pillows', name: 'Oona Pillow, baby alpaca', store: 'dwr', price: 225, unit: 'each',
  material: 'Peruvian baby alpaca, hand-finished',
  why: 'Baby alpaca is softer than cashmere.',
  url: D('pillows-throws-pillows/oona-pillow/2549900'), finishes: [['Cream', '#efe9df'], ['Camel', '#c19a6b'], ['Charcoal', '#3a3733']],
  model: { main: 'knit' } });
s({ id: 'dwr-oona-throw', cat: 'throw', name: 'Oona Alpaca Throw', store: 'dwr', price: 495,
  material: 'Baby alpaca, water-based dyes',
  why: 'Feather-light and warm: the throw you fight over.',
  url: D('pillows-throws-throw-blankets/oona-alpaca-throw/2527699'), finishes: [['Cream', '#efe9df']], model: { main: 'knit' } });
s({ id: 'dwr-linen-duvet', cat: 'bedding', name: 'DWR Duvet Cover, Linen, Full/Queen', store: 'dwr', price: 345,
  material: 'Turkish linen, machine washable',
  why: 'Linen gets softer with every wash and sleeps cool in summer.',
  url: D('bedding-sheets/design-within-reach-duvet-cover---linen/2577776'), finishes: [['White', '#f5f3ef'], ['Camel', '#c9ab86'], ['Light grey', '#c8c8c4']],
  model: { main: 'linen' } });
s({ id: 'dwr-aerocotton', cat: 'towels', name: 'DWR Aerocotton Towel Set', store: 'dwr', price: 85,
  material: '100% Turkish cotton, bath towel, hand towel and washcloth',
  why: 'An innovative spin makes these towels unusually plush and quick to dry.',
  url: D('accessories-bath/dwr-aerocotton-towel-set/10008815'), finishes: [['White', '#f5f3ef'], ['Stone', '#cfc6b6']],
  model: { main: 'terry' } });
s({ id: 'dwr-aerocotton-mat', cat: 'bathMat', name: 'DWR Aerocotton Bathmat', store: 'dwr', price: 65, dims: [86, 56, 1],
  material: '100% Turkish cotton',
  why: 'Plush underfoot, matches the towels.',
  url: 'https://www.dwr.com/bath-towels/dwr-aerocotton-bathmat/6643.html', finishes: [['White', '#f5f3ef']],
  model: { main: 'terry' } });

// =====================================================================================
// Existing fixtures (drawn in the room, never bought)
// =====================================================================================
const ex = (o) => add({ tier: 'basic', store: 'existing', price: 0, why: 'Kept as it is. The design works around it.', ...o });
ex({ id: 'existing-bathtub', cat: 'bathtub', name: 'Your bathtub', dims: [170, 75, 58], finishes: [['White', '#f6f6f3']], model: { main: 'ceramic' } });
ex({ id: 'existing-toilet', cat: 'toilet', name: 'Your toilet', dims: [38, 68, 78], finishes: [['White', '#f6f6f3']], model: { main: 'ceramic' } });
ex({ id: 'existing-vanity', cat: 'vanity', name: 'Your vanity', dims: [80, 48, 86], finishes: [['White', '#f1efea']], model: { main: 'laminate' } });

// ---- paint ----------------------------------------------------------------------
export const PAINT = {
  basic: { name: 'BEHR PREMIUM PLUS interior eggshell, 1 gal', store: 'homedepot', perLitre: 8.5, query: 'behr premium plus interior eggshell paint' },
  luxury: { name: 'BEHR ULTRA SCUFF DEFENSE interior eggshell, 1 gal', store: 'homedepot', perLitre: 13, query: 'behr ultra scuff defense interior paint' },
  supreme: { name: 'Mineral limewash paint, 1 gal', store: 'homedepot', perLitre: 28, query: 'limewash paint' },
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
export const productsInCategory = (cat) => PRODUCTS.filter((x) => x.cat === cat && !x.existing);
export const allProducts = () => PRODUCTS.slice();

// Direct product page for a finish, falling back to the product page, then a store search.
export function shopUrl(product, finishIndex = 0) {
  const f = product.finishes[finishIndex];
  if (f?.url) return f.url;
  if (product.url) return product.url;
  return RETAILERS[product.store]?.search(encodeURIComponent(product.query)) ?? null;
}

export function paintUrl(tier) {
  const p = PAINT[tier];
  return RETAILERS[p.store].search(encodeURIComponent(p.query));
}

export function storeName(id) {
  return RETAILERS[id]?.name ?? id;
}

// Every distinct link in the catalog, for tools/check-links.mjs.
export function allLinks() {
  const out = new Map();
  const put = (url, id, name) => { if (url && !out.has(url)) out.set(url, { id, url, name }); };
  for (const p of PRODUCTS) {
    put(p.url, p.id, p.name);
    p.finishes.forEach((f, i) => put(f.url, `${p.id}#${i}`, `${p.name} (${f.name})`));
    p.addons.forEach((a) => put(a.url, a.id, a.name));
  }
  return [...out.values()];
}
