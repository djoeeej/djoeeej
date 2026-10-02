// ─────────────────────────────────────────────────────────────
// SHOP DETAILS — edit these. Anything left empty is hidden or
// shown as a clearly marked placeholder on the page.
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  name: 'Boulangerie D.O',
  wordmark: 'D.O',
  street: 'Rue Gambetta',   // add the street number, e.g. '59 rue Gambetta'
  city: '60100 Creil',
  phone: '',                // e.g. '03 44 00 00 00' — shown as a placeholder while empty
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Boulangerie+D.O+rue+Gambetta+60100+Creil',
  instagram: '',            // e.g. 'https://instagram.com/boulangerie.do'
  // One entry per day, Monday first. Use '' for unknown (shows a placeholder),
  // 'closed' for closed days, or the hours as text, e.g. '6 h 30 – 20 h'.
  hours: ['', '', '', '', '', '', ''],
};

const CATEGORIES = [
  { id: 'viennoiseries', name: 'Viennoiseries', gloss: 'Laminated and enriched doughs, for breakfast and the afternoon goûter' },
  { id: 'patisseries', name: 'Pâtisseries', gloss: 'Tarts, choux and layered cakes' },
  { id: 'pains', name: 'Pains', gloss: 'Bread, shaped and baked on site' },
];

// Quantities are for home kitchens, by weight. Scaling in the page
// multiplies every number below; items with q: null never scale.
const PRODUCTS = [
  // ───────────────────────────── VIENNOISERIES
  {
    id: 'croissant',
    category: 'viennoiseries',
    name: 'Croissant au beurre',
    ipa: '/kʁwa.sɑ̃ o bœʁ/',
    en: 'All-butter croissant',
    short: 'Crisp outside, honeycomb inside',
    definition:
      'A crescent of yeast-leavened dough laminated with butter. Thin sheets of butter are folded into the dough again and again, so in the oven the water in the butter turns to steam and pushes the layers apart, leaving a shattering crust and an open, honeycombed crumb.',
    origin:
      'Its ancestor is the Austrian kipferl, which reached Paris with the Viennese bakeries of the 1830s — hence “viennoiserie”. The laminated croissant we know took shape in French bakeries in the early 20th century. The story that it was invented to celebrate a 1683 victory over the Ottomans is a legend.',
    taste: 'Flaky and crackling outside, soft and stretchy inside, with a clean, milky butter flavour and very little sweetness.',
    yield: { n: 12, unit: 'croissants', unit1: 'croissant' },
    times: { prep: '1 h 15', rest: '14 h, overnight', bake: '16–18 min' },
    level: 'Advanced',
    allergens: ['Gluten', 'Milk', 'Eggs'],
    components: [
      { title: 'Dough (détrempe)', items: [
        { q: 500, u: 'g', n: 'strong white flour (French T45 or T55)' },
        { q: 55, u: 'g', n: 'caster sugar' },
        { q: 10, u: 'g', n: 'fine salt' },
        { q: 20, u: 'g', n: 'fresh yeast', note: 'or 7 g instant dried yeast' },
        { q: 140, u: 'g', n: 'cold water' },
        { q: 140, u: 'g', n: 'cold whole milk' },
        { q: 40, u: 'g', n: 'unsalted butter, softened' },
      ]},
      { title: 'Laminating butter', items: [
        { q: 280, u: 'g', n: 'cold unsalted butter, 82 % fat (beurre de tourage)' },
      ]},
      { title: 'Egg wash', items: [
        { q: 1, u: '', n: 'egg' },
        { q: 15, u: 'g', n: 'milk' },
        { q: null, u: '', n: 'pinch of salt' },
      ]},
    ],
    steps: [
      'Mix the flour, sugar and salt, then add the yeast on one side of the bowl so it doesn’t touch the salt. Add the cold water, milk and soft butter and knead on low speed for 4–5 min, just until smooth. The dough should stay cool (about 24 °C) and not become elastic.',
      'Flatten it into a 2 cm-thick rectangle, wrap tightly and refrigerate for at least 2 h, ideally overnight.',
      'Beat the laminating butter between two sheets of baking paper into a 17 × 17 cm square, 1 cm thick. Chill it until it is cold but bends without cracking — the same firmness as the dough.',
      'Roll the dough into a 35 × 18 cm rectangle. Set the butter in the centre, fold both ends over it so they meet in the middle, and pinch the seam closed.',
      'Roll into a 60 × 20 cm strip and give it a double (book) fold: fold both ends to the centre, then fold in half. Wrap and chill for 30 min.',
      'Roll again to 60 × 20 cm and give it a single (letter) fold, in thirds. Wrap and chill for 30 min.',
      'Roll the dough into a 60 × 25 cm rectangle, 4–5 mm thick. Cut 12 long triangles with a 9 cm base.',
      'Cut a 1 cm notch in the middle of each base, stretch the triangle gently, and roll it up from the base without pressing. Place on lined trays with the tip underneath.',
      'Proof at 25–27 °C for about 2 h, until doubled and wobbly when you shake the tray. Never go above 28 °C or the butter will melt out.',
      'Brush gently with egg wash. Bake at 180 °C (fan) for 16–18 min, until deep golden. Cool on a rack for 15 min.',
    ],
    tip: 'Keep everything cold. If the butter breaks into shards while rolling, it is too cold — wait 5 min. If it starts to seep out, chill the dough for 15 min.',
  },
  {
    id: 'pain-au-chocolat',
    category: 'viennoiseries',
    name: 'Pain au chocolat',
    ipa: '/pɛ̃ o ʃɔ.kɔ.la/',
    en: 'Chocolate croissant',
    short: 'Two bars of dark chocolate, rolled in croissant dough',
    definition:
      'A rectangle of croissant dough rolled around two sticks of dark baking chocolate. The same laminated dough as the croissant, shaped as a little parcel, so every bite has flaky pastry and a seam of chocolate that softens in the oven.',
    origin:
      'It belongs to the family of Viennese pastries that settled in France in the 19th century and became a French breakfast staple in the 20th. In south-west France and in Quebec it is called a chocolatine — a naming debate the French take very seriously.',
    taste: 'Buttery, crisp layers with two lines of bittersweet chocolate that stay soft for hours.',
    yield: { n: 12, unit: 'pains au chocolat', unit1: 'pain au chocolat' },
    times: { prep: '1 h 15', rest: '14 h, overnight', bake: '16–18 min' },
    level: 'Advanced',
    allergens: ['Gluten', 'Milk', 'Eggs', 'Soy (in chocolate)'],
    components: [
      { title: 'Dough (détrempe)', items: [
        { q: 500, u: 'g', n: 'strong white flour (French T45 or T55)' },
        { q: 55, u: 'g', n: 'caster sugar' },
        { q: 10, u: 'g', n: 'fine salt' },
        { q: 20, u: 'g', n: 'fresh yeast', note: 'or 7 g instant dried yeast' },
        { q: 140, u: 'g', n: 'cold water' },
        { q: 140, u: 'g', n: 'cold whole milk' },
        { q: 40, u: 'g', n: 'unsalted butter, softened' },
      ]},
      { title: 'Laminating butter', items: [
        { q: 280, u: 'g', n: 'cold unsalted butter, 82 % fat (beurre de tourage)' },
      ]},
      { title: 'Filling', items: [
        { q: 24, u: '', n: 'chocolate batons (bâtons boulangers, about 5 g each, 44–48 % cocoa)' },
      ]},
      { title: 'Egg wash', items: [
        { q: 1, u: '', n: 'egg' },
        { q: 15, u: 'g', n: 'milk' },
        { q: null, u: '', n: 'pinch of salt' },
      ]},
    ],
    steps: [
      'Make, chill and laminate the dough exactly as for croissants: mix the détrempe, chill overnight, lock in the 17 × 17 cm butter square, then give one double fold and one single fold with 30 min in the fridge after each.',
      'Roll the dough into a rectangle 4–5 mm thick and cut 12 rectangles of 8 × 15 cm.',
      'Lay a chocolate baton across one short end, fold the dough over it, add a second baton, and roll to the end. Place seam-side down on lined trays and press lightly.',
      'Proof at 25–27 °C for about 2 h, until doubled and wobbly.',
      'Brush with egg wash and bake at 180 °C (fan) for 16–18 min, until deep golden. Cool on a rack for 15 min.',
    ],
    tip: 'Put the seam underneath and right in the middle — if it sits at the side, the roll opens up as it proofs.',
  },
  {
    id: 'chausson-aux-pommes',
    category: 'viennoiseries',
    name: 'Chausson aux pommes',
    ipa: '/ʃo.sɔ̃ o pɔm/',
    en: 'Apple turnover',
    short: 'Puff pastry folded over vanilla apple compote',
    definition:
      'A turnover of puff pastry folded over a filling of apple compote, sealed with a fluted edge, scored with a leaf pattern and brushed with syrup. “Chausson” means slipper, for its folded shape. It is one of the classic viennoiseries in every French boulangerie, eaten at breakfast or for the afternoon goûter.',
    origin:
      'The town of Saint-Calais, in the Sarthe, traces it to 1630: when an epidemic struck the town, the lady of the château is said to have handed out flour and apples to the poor. Saint-Calais still celebrates with a chausson aux pommes festival every September.',
    taste: 'Crackling, buttery flakes around a soft, tangy-sweet apple filling with vanilla, under a sticky, lacquered top.',
    yield: { n: 8, unit: 'chaussons', unit1: 'chausson' },
    times: { prep: '1 h 15', rest: '3 h', bake: '30–35 min' },
    level: 'Intermediate',
    allergens: ['Gluten', 'Milk', 'Eggs'],
    components: [
      { title: 'Puff pastry (pâte feuilletée)', items: [
        { q: 300, u: 'g', n: 'plain flour (French T55)' },
        { q: 6, u: 'g', n: 'fine salt' },
        { q: 150, u: 'g', n: 'cold water' },
        { q: 30, u: 'g', n: 'unsalted butter, melted' },
        { q: 220, u: 'g', n: 'cold unsalted butter, 82 % fat, for laminating' },
      ], note: 'Short on time? Use 600 g of all-butter puff pastry instead.' },
      { title: 'Apple compote', items: [
        { q: 800, u: 'g', n: 'apples, about 5 (Golden, Reine des Reinettes or Boskoop)' },
        { q: 50, u: 'g', n: 'caster sugar' },
        { q: 15, u: 'g', n: 'unsalted butter' },
        { q: 0.5, u: '', n: 'vanilla pod, split', note: 'or 1 tsp vanilla extract' },
        { q: 15, u: 'g', n: 'lemon juice (1 tbsp)' },
        { q: 30, u: 'g', n: 'water (2 tbsp)' },
        { q: null, u: '', n: 'pinch of ground cinnamon (optional)' },
      ]},
      { title: 'Egg wash', items: [
        { q: 1, u: '', n: 'egg yolk' },
        { q: 15, u: 'g', n: 'milk' },
        { q: null, u: '', n: 'pinch of salt' },
      ]},
      { title: 'Shine syrup', items: [
        { q: 30, u: 'g', n: 'caster sugar' },
        { q: 30, u: 'g', n: 'water' },
      ]},
    ],
    steps: [
      'Make the détrempe: mix the flour, salt, water and melted butter just until it comes together. Shape into a ball, cut a deep cross in the top, wrap and chill for 1 h.',
      'Beat the laminating butter between baking paper into a 13 cm square. It should be cold but pliable.',
      'Roll the dough out from the cross into four flaps, set the butter in the centre and fold the flaps over it to seal it in completely.',
      'Roll into a 45 × 15 cm strip, fold in three like a letter, turn a quarter and repeat. That is two single turns. Wrap and chill for 30 min. Repeat twice more for six turns in total — about 729 layers of butter.',
      'Meanwhile, make the compote: peel, core and dice the apples into 1 cm cubes. Cook them covered over medium heat with the sugar, butter, vanilla, lemon juice and water for 15–20 min, stirring now and then, until soft but with some pieces left. Uncover for the last 5 min to cook off the liquid. Remove the pod and cool completely in the fridge — warm filling melts the pastry layers.',
      'Roll the pastry 3 mm thick and cut 8 discs with a 14 cm fluted cutter. Roll each disc across its middle to stretch it into an oval about 16 cm long.',
      'Brush the edge of one half with water, put 60 g (a heaped tablespoon) of cold compote on that half, fold the other half over and press the edges firmly to seal. Turn smooth side up onto a lined tray.',
      'Brush with egg wash, chill for 30 min, then brush again.',
      'With the tip of a knife, score a leaf pattern on top without cutting through, and pierce 2–3 small holes to let steam out.',
      'Bake at 200 °C for 10 min, then lower to 180 °C and bake for 20–25 min more, until puffed and deep golden.',
      'Boil the sugar and water for 1 min and brush it over the chaussons as soon as they come out of the oven. Let them cool for 15 min — the filling is very hot.',
    ],
    tip: 'The second coat of egg wash after chilling is what gives the deep, even colour; the syrup at the end gives the shine.',
  },
  {
    id: 'brioche',
    category: 'viennoiseries',
    name: 'Brioche à tête',
    ipa: '/bʁi.jɔʃ a tɛt/',
    en: 'Brioche with a top knot',
    short: 'Butter and egg brioche in a fluted mould',
    definition:
      'A rich yeast dough made with eggs instead of water and a large amount of butter, baked in a small fluted mould with a little ball of dough — the “tête”, or head — on top. It is the Parisian form of brioche.',
    origin:
      'Brioche has been baked in France since the Middle Ages, and Normandy’s butter is often credited for its richness. The famous line “let them eat brioche” comes from Rousseau’s Confessions, written before Marie-Antoinette could have said it.',
    taste: 'Feathery and tender, pulling apart in soft strands, with a deep golden, shiny crust and a sweet, eggy, buttery flavour.',
    yield: { n: 10, unit: 'brioches', unit1: 'brioche' },
    times: { prep: '45 min', rest: '15 h, overnight', bake: '12–15 min' },
    level: 'Intermediate',
    allergens: ['Gluten', 'Milk', 'Eggs'],
    components: [
      { title: 'Brioche dough', items: [
        { q: 250, u: 'g', n: 'strong white flour (French T45)' },
        { q: 30, u: 'g', n: 'caster sugar' },
        { q: 5, u: 'g', n: 'fine salt' },
        { q: 10, u: 'g', n: 'fresh yeast', note: 'or 4 g instant dried yeast' },
        { q: 150, u: 'g', n: 'cold eggs (about 3)' },
        { q: 15, u: 'g', n: 'cold whole milk' },
        { q: 125, u: 'g', n: 'unsalted butter, cubed, cool but soft' },
      ]},
      { title: 'Egg wash', items: [
        { q: 1, u: '', n: 'egg' },
        { q: null, u: '', n: 'pinch of salt' },
      ]},
      { title: 'For the moulds', items: [
        { q: 15, u: 'g', n: 'soft butter' },
      ]},
    ],
    steps: [
      'Put the flour, sugar, salt and yeast in a stand mixer, keeping the yeast and salt apart. Add the eggs and milk and knead on low for 5 min, then on medium for 8–10 min, until the dough comes away from the sides of the bowl.',
      'Add the butter a few cubes at a time, letting each addition disappear before the next. Knead until the dough is smooth, glossy and stretches into a thin, translucent sheet. It should stay below 25 °C.',
      'Cover and leave at room temperature for 1 h. Knock it back, cover and refrigerate overnight (about 12 h).',
      'Butter ten 8 cm fluted brioche moulds. Divide the cold dough into 10 pieces of about 55 g and roll each into a tight ball.',
      'With the side of your hand, roll each ball a quarter of the way along to form a small head joined by a thin neck. Drop it into the mould body first, then push the head into the centre with a floured finger.',
      'Proof at about 26 °C for 2 h, until doubled.',
      'Brush carefully with egg wash, wait 10 min and brush again. Bake at 180 °C for 12–15 min, until deep golden brown.',
      'Unmould straight away and cool on a rack.',
    ],
    tip: 'Cold dough is much easier to shape: work straight from the fridge, and if it softens, put it back for 10 min.',
  },

  // ───────────────────────────── PÂTISSERIES
  {
    id: 'eclair',
    category: 'patisseries',
    name: 'Éclair au chocolat',
    ipa: '/e.klɛʁ o ʃɔ.kɔ.la/',
    en: 'Chocolate éclair',
    short: 'Choux pastry, chocolate cream, glossy glaze',
    definition:
      'A long finger of choux pastry baked hollow, filled with chocolate pastry cream and dipped in shiny chocolate fondant. Choux is cooked twice — once on the stove, once in the oven — and puffs up with steam, which leaves the space inside for the filling.',
    origin:
      'Choux pastry was refined by the great 19th-century pastry chefs, Antonin Carême among them, and the éclair appears in French cookbooks by the middle of that century. “Éclair” means lightning: some say because it is eaten in a flash, others for the gleam of its glaze.',
    taste: 'A light, eggy shell, cool and silky chocolate cream, and a sweet, glossy top that snaps softly.',
    yield: { n: 12, unit: 'éclairs', unit1: 'éclair' },
    times: { prep: '1 h', rest: '2 h', bake: '35–40 min' },
    level: 'Intermediate',
    allergens: ['Gluten', 'Milk', 'Eggs', 'Soy (in chocolate)'],
    components: [
      { title: 'Choux pastry (pâte à choux)', items: [
        { q: 125, u: 'g', n: 'water' },
        { q: 125, u: 'g', n: 'whole milk' },
        { q: 110, u: 'g', n: 'unsalted butter' },
        { q: 5, u: 'g', n: 'fine salt' },
        { q: 5, u: 'g', n: 'caster sugar' },
        { q: 140, u: 'g', n: 'plain flour (French T55)' },
        { q: 250, u: 'g', n: 'eggs (about 5), beaten' },
      ]},
      { title: 'Chocolate pastry cream', items: [
        { q: 500, u: 'g', n: 'whole milk' },
        { q: 100, u: 'g', n: 'egg yolks (about 5)' },
        { q: 100, u: 'g', n: 'caster sugar' },
        { q: 40, u: 'g', n: 'cornflour' },
        { q: 120, u: 'g', n: 'dark chocolate, 64–70 %, chopped' },
        { q: 25, u: 'g', n: 'unsalted butter' },
      ]},
      { title: 'Chocolate glaze', items: [
        { q: 300, u: 'g', n: 'white pâtissier fondant' },
        { q: 40, u: 'g', n: 'dark chocolate, 70 %, melted' },
        { q: 15, u: 'g', n: 'sugar syrup or water, to loosen' },
      ]},
    ],
    steps: [
      'Bring the water, milk, butter, salt and sugar to a full boil. Take off the heat, tip in all the flour and beat until smooth.',
      'Return to medium heat and stir for 1–2 min to dry the dough, until it forms a ball and leaves a thin film on the pan.',
      'Transfer to a bowl and beat for 1 min to cool slightly. Add the egg a little at a time, beating well, until the dough is glossy and falls from the spatula in a thick V-shaped ribbon. You may not need all of it.',
      'Pipe 13–14 cm lengths with an 18 mm French star tip onto a lined tray, leaving space between them.',
      'Bake at 165 °C (fan) for 35–40 min, until deep golden and firm. Don’t open the oven for the first 25 min or they will collapse. Cool on a rack.',
      'For the cream, heat the milk. Whisk the yolks, sugar and cornflour, pour on half the hot milk while whisking, then return everything to the pan. Boil for 2 min, whisking constantly.',
      'Off the heat, stir in the chocolate and butter until smooth. Cover with cling film touching the surface and chill for 2 h.',
      'Whisk the cold cream until smooth. Pierce three small holes underneath each éclair and pipe in about 50 g of cream.',
      'Warm the fondant with the melted chocolate to 35–37 °C, loosening it with a little syrup until it coats like thick cream. Dip the top of each éclair, run a finger around the edge to tidy it, and leave to set for 15 min.',
    ],
    tip: 'Keep the glaze below 37 °C. Any hotter and it sets dull instead of glossy.',
  },
  {
    id: 'tarte-aux-fraises',
    category: 'patisseries',
    name: 'Tarte aux fraises',
    ipa: '/taʁt o fʁɛz/',
    en: 'Strawberry tart',
    short: 'Sweet pastry, vanilla cream, fresh strawberries',
    definition:
      'A crisp sweet-pastry shell filled with vanilla pastry cream and covered with fresh strawberries brushed with a light glaze. It is the tart that fills French bakery windows from spring to early summer.',
    origin:
      'Fruit tarts on pastry cream became a fixture of French pâtisserie in the 19th century. The best come in strawberry season, from April to July, made with fragrant French varieties such as Gariguette and Mara des Bois.',
    taste: 'Buttery, crumbly pastry, cool vanilla cream and juicy, slightly tart berries under a shiny glaze.',
    yield: { n: 8, unit: 'slices', unit1: 'slice', size: 'one 24 cm tart' },
    times: { prep: '50 min', rest: '3 h 30', bake: '20–25 min' },
    level: 'Intermediate',
    allergens: ['Gluten', 'Milk', 'Eggs', 'Nuts (almonds)'],
    components: [
      { title: 'Sweet pastry (pâte sucrée)', items: [
        { q: 200, u: 'g', n: 'plain flour (French T55)' },
        { q: 100, u: 'g', n: 'cold unsalted butter, diced' },
        { q: 80, u: 'g', n: 'icing sugar' },
        { q: 25, u: 'g', n: 'ground almonds' },
        { q: 50, u: 'g', n: 'egg (1)' },
        { q: 1, u: 'g', n: 'salt (a pinch)' },
      ]},
      { title: 'Vanilla pastry cream', items: [
        { q: 400, u: 'g', n: 'whole milk' },
        { q: 1, u: '', n: 'vanilla pod, split and scraped' },
        { q: 80, u: 'g', n: 'egg yolks (about 4)' },
        { q: 80, u: 'g', n: 'caster sugar' },
        { q: 35, u: 'g', n: 'cornflour' },
        { q: 30, u: 'g', n: 'unsalted butter' },
      ]},
      { title: 'Topping', items: [
        { q: 500, u: 'g', n: 'strawberries (Gariguette or Mara des Bois)' },
        { q: 50, u: 'g', n: 'redcurrant jelly or neutral glaze' },
      ]},
    ],
    steps: [
      'Rub the butter into the flour, icing sugar, ground almonds and salt until the mixture looks like sand. Add the egg and bring it together without kneading. Flatten, wrap and chill for 1 h.',
      'Roll the pastry 3 mm thick and line a 24 cm tart ring or tin. Prick the base with a fork and chill for 30 min.',
      'Line with baking paper and baking beans and bake at 170 °C (fan) for 15 min. Remove the paper and beans and bake for 5–10 min more, until evenly golden. Cool completely.',
      'Make the pastry cream: heat the milk with the vanilla pod and seeds. Whisk the yolks, sugar and cornflour, pour on half the hot milk while whisking, return everything to the pan and boil for 2 min, whisking. Stir in the butter, remove the pod, cover with film touching the surface and chill for 2 h.',
      'Whisk the cold cream until smooth and spread it in the shell in an even 1.5 cm layer.',
      'Hull the strawberries and halve them lengthways. Arrange them in tight circles from the outside in.',
      'Warm the jelly with a teaspoon of water and brush it over the strawberries. Chill for 30 min and serve the same day.',
    ],
    tip: 'Brush the cooled shell with a thin layer of melted white chocolate before adding the cream: it keeps the pastry crisp for hours.',
  },
  {
    id: 'mille-feuille',
    category: 'patisseries',
    name: 'Mille-feuille',
    ipa: '/mil.fœj/',
    en: 'Custard slice',
    short: 'Three layers of puff pastry, vanilla cream, feathered glaze',
    definition:
      'Three sheets of crisp, well-baked puff pastry sandwiched with vanilla pastry cream, finished with white fondant feathered with chocolate. The name means “a thousand leaves”: six single turns give the pastry about 729 layers of butter.',
    origin:
      'Puff pastry desserts appear in French cookbooks from the 17th century. The mille-feuille as it is sold today took shape in 19th-century Paris, where the pâtissier Adolphe Seugnot is often credited with making it famous. In North America it is called a Napoleon.',
    taste: 'Crunchy, caramelised pastry against soft vanilla cream, with a sweet, smooth top.',
    yield: { n: 8, unit: 'slices', unit1: 'slice', size: 'one 30 × 12 cm cake' },
    times: { prep: '1 h 30', rest: '4 h', bake: '25–30 min' },
    level: 'Advanced',
    allergens: ['Gluten', 'Milk', 'Eggs', 'Soy (in chocolate)'],
    components: [
      { title: 'Puff pastry (pâte feuilletée)', items: [
        { q: 250, u: 'g', n: 'plain flour (French T55)' },
        { q: 5, u: 'g', n: 'fine salt' },
        { q: 125, u: 'g', n: 'cold water' },
        { q: 25, u: 'g', n: 'unsalted butter, melted' },
        { q: 190, u: 'g', n: 'cold unsalted butter, 82 % fat, for laminating' },
      ], note: 'Short on time? Use 500 g of all-butter puff pastry instead.' },
      { title: 'Vanilla pastry cream', items: [
        { q: 750, u: 'g', n: 'whole milk' },
        { q: 1, u: '', n: 'vanilla pod, split and scraped' },
        { q: 140, u: 'g', n: 'egg yolks (about 7)' },
        { q: 150, u: 'g', n: 'caster sugar' },
        { q: 60, u: 'g', n: 'cornflour' },
        { q: 50, u: 'g', n: 'unsalted butter' },
      ]},
      { title: 'Glaze', items: [
        { q: 250, u: 'g', n: 'white pâtissier fondant' },
        { q: 30, u: 'g', n: 'dark chocolate, melted' },
      ]},
    ],
    steps: [
      'Make the puff pastry with six single turns, as for the chausson aux pommes, and chill it for 1 h.',
      'Roll it into a 36 × 30 cm rectangle, 2 mm thick. Prick it all over with a fork and chill for 30 min.',
      'Bake at 180 °C (fan) between two baking trays — one on top to keep it flat — for 25–30 min, until deep amber all the way through. Pale pastry turns soggy. Cool, trim the edges and cut into 3 strips of 12 × 30 cm.',
      'Make the pastry cream as for the tarte aux fraises, cover with film touching the surface and chill for 2 h. Whisk it smooth and put it in a piping bag with a 12 mm plain tip.',
      'Glaze the flattest strip first: warm the fondant to 35–37 °C and spread it evenly. Straight away, pipe thin lines of chocolate along the length 1.5 cm apart, then drag the tip of a knife across them, alternating direction each time, to make the feathered pattern. Leave to set.',
      'Assemble: a plain strip, a layer of piped cream, the second strip, more cream, then the glazed strip on top. Chill for 1 h.',
      'Slice into 8 with a sharp serrated knife, using a gentle sawing motion.',
    ],
    tip: 'Turn the pastry strips upside down before assembling: the flat underside makes a neater cake.',
  },
  {
    id: 'paris-brest',
    category: 'patisseries',
    name: 'Paris-Brest',
    ipa: '/pa.ʁi bʁɛst/',
    en: 'Praline cream choux ring',
    short: 'Choux ring, hazelnut praline cream, flaked almonds',
    definition:
      'A ring of choux pastry topped with flaked almonds, split and filled with crème mousseline au praliné — a pastry cream whipped with butter and caramelised hazelnut paste — then dusted with icing sugar.',
    origin:
      'Created in 1910 by Louis Durand, a pâtissier in Maisons-Laffitte, to honour the Paris–Brest–Paris bicycle race. Its round shape is meant to look like a bicycle wheel.',
    taste: 'Crisp, nutty choux and a rich, light hazelnut-caramel cream that melts on the tongue.',
    yield: { n: 8, unit: 'individual rings', unit1: 'ring' },
    times: { prep: '1 h 15', rest: '2 h', bake: '35–40 min' },
    level: 'Advanced',
    allergens: ['Gluten', 'Milk', 'Eggs', 'Nuts (hazelnuts, almonds)'],
    components: [
      { title: 'Choux pastry', items: [
        { q: 65, u: 'g', n: 'water' },
        { q: 60, u: 'g', n: 'whole milk' },
        { q: 55, u: 'g', n: 'unsalted butter' },
        { q: 2, u: 'g', n: 'fine salt' },
        { q: 3, u: 'g', n: 'caster sugar' },
        { q: 70, u: 'g', n: 'plain flour (French T55)' },
        { q: 125, u: 'g', n: 'eggs (about 2½), beaten' },
        { q: 40, u: 'g', n: 'flaked almonds' },
      ]},
      { title: 'Praline mousseline cream', items: [
        { q: 250, u: 'g', n: 'whole milk' },
        { q: 60, u: 'g', n: 'egg yolks (about 3)' },
        { q: 60, u: 'g', n: 'caster sugar' },
        { q: 25, u: 'g', n: 'cornflour' },
        { q: 40, u: 'g', n: 'unsalted butter, for the hot cream' },
        { q: 110, u: 'g', n: 'unsalted butter, very soft, for whipping' },
        { q: 120, u: 'g', n: 'hazelnut praline paste (50 % nuts)' },
      ]},
      { title: 'To finish', items: [
        { q: 20, u: 'g', n: 'icing sugar' },
      ]},
    ],
    steps: [
      'Make the choux pastry as for the éclairs: boil the water, milk, butter, salt and sugar, beat in the flour, dry the dough for 1–2 min, then beat in the egg gradually until glossy.',
      'Draw eight 8 cm circles on baking paper and turn it over. Using a 14 mm star tip, pipe a ring on each circle, then a second ring inside it, touching. Sprinkle generously with flaked almonds and tip off the excess.',
      'Bake at 165 °C (fan) for 35–40 min, until deep golden. Keep the oven closed for the first 25 min. Cool on a rack.',
      'Make a pastry cream with the milk, yolks, sugar and cornflour, boiling it for 2 min. Off the heat, whisk in the first 40 g of butter. Cover with film touching the surface and cool to room temperature, about 20 °C.',
      'Beat the cream until smooth, then beat in the very soft butter and the praline paste for 5 min, until pale and light.',
      'Slice the rings in half horizontally. Pipe the cream onto the bases in tall rosettes with a star tip, put the tops back on and dust with icing sugar.',
    ],
    tip: 'The cream and the butter must be the same temperature, around 20 °C, or the mousseline will split. If it does, warm the bowl briefly and beat again.',
  },
  {
    id: 'tarte-au-citron',
    category: 'patisseries',
    name: 'Tarte au citron meringuée',
    ipa: '/taʁt o si.tʁɔ̃ mə.ʁɛ̃.ɡe/',
    en: 'Lemon meringue tart',
    short: 'Sharp lemon cream under torched meringue',
    definition:
      'A sweet-pastry shell filled with tangy, buttery lemon cream and topped with Italian meringue, piped and toasted with a torch. Italian meringue is cooked by hot sugar syrup, so it is stable and holds its shape for a day.',
    origin:
      'Meringue appears in French cookbooks at the end of the 17th century. The French lemon tart, with its silky butter-enriched lemon cream, is a classic of the 20th-century pâtisserie window; the meringue version is its most famous variation.',
    taste: 'Bright, sharp lemon softened by butter, against marshmallowy, caramel-edged meringue and crisp pastry.',
    yield: { n: 8, unit: 'slices', unit1: 'slice', size: 'one 24 cm tart' },
    times: { prep: '1 h', rest: '3 h 30', bake: '20–25 min' },
    level: 'Intermediate',
    allergens: ['Gluten', 'Milk', 'Eggs', 'Nuts (almonds)'],
    components: [
      { title: 'Sweet pastry (pâte sucrée)', items: [
        { q: 200, u: 'g', n: 'plain flour (French T55)' },
        { q: 100, u: 'g', n: 'cold unsalted butter, diced' },
        { q: 80, u: 'g', n: 'icing sugar' },
        { q: 25, u: 'g', n: 'ground almonds' },
        { q: 50, u: 'g', n: 'egg (1)' },
        { q: 1, u: 'g', n: 'salt (a pinch)' },
      ]},
      { title: 'Lemon cream', items: [
        { q: 150, u: 'g', n: 'fresh lemon juice (3–4 lemons)' },
        { q: 2, u: '', n: 'unwaxed lemons, finely grated zest' },
        { q: 150, u: 'g', n: 'caster sugar' },
        { q: 150, u: 'g', n: 'eggs (3)' },
        { q: 20, u: 'g', n: 'cornflour' },
        { q: 120, u: 'g', n: 'unsalted butter, diced, cool' },
      ]},
      { title: 'Italian meringue', items: [
        { q: 100, u: 'g', n: 'egg whites (about 3)' },
        { q: 200, u: 'g', n: 'caster sugar' },
        { q: 60, u: 'g', n: 'water' },
      ]},
    ],
    steps: [
      'Make the sweet pastry, line a 24 cm tart ring and blind-bake it until fully golden, as for the tarte aux fraises. Cool completely.',
      'Rub the lemon zest into the sugar with your fingertips to release its oils. Whisk in the eggs and cornflour, then the lemon juice.',
      'Cook over medium heat, whisking constantly, until the cream thickens and boils. Boil for 1 min, then strain into a jug.',
      'Let it cool to 40–45 °C, then blend in the butter with a stick blender until silky. Pour into the shell, smooth the top and chill for 2 h.',
      'For the meringue, heat the sugar and water. When the syrup reaches 110 °C, start whisking the egg whites. At 118 °C, pour the syrup in a thin stream down the side of the bowl while whisking on high.',
      'Keep whisking for about 10 min, until the meringue is thick, glossy and only just warm.',
      'Pipe the meringue over the lemon cream in small peaks with a 12 mm tip and toast the tips with a kitchen torch. Keep chilled and eat within 24 h.',
    ],
    tip: 'Blending the butter in while the cream is warm, not hot, is what gives the smooth, almost mousse-like texture.',
  },
  {
    id: 'macarons',
    category: 'patisseries',
    name: 'Macarons à la framboise',
    ipa: '/ma.ka.ʁɔ̃ a la fʁɑ̃.bwaz/',
    en: 'Raspberry macarons',
    short: 'Almond shells, raspberry white-chocolate ganache',
    definition:
      'Two smooth almond-meringue shells with a ruffled “foot”, sandwiched with raspberry and white chocolate ganache. Made by the Italian-meringue method, where hot syrup is whipped into the egg whites for a sturdy, glossy batter.',
    origin:
      'Single almond macarons have been baked in French towns such as Nancy and Saint-Émilion for centuries. The filled double macaron — the macaron parisien — appeared in Paris in the early 20th century; the house of Ladurée credits Pierre Desfontaines.',
    taste: 'A thin crisp shell, a soft chewy centre, and a creamy, tangy raspberry filling.',
    yield: { n: 30, unit: 'macarons', unit1: 'macaron' },
    times: { prep: '1 h 15', rest: '24 h', bake: '13–15 min' },
    level: 'Advanced',
    allergens: ['Nuts (almonds)', 'Eggs', 'Milk', 'Soy (in chocolate)'],
    components: [
      { title: 'Shells', items: [
        { q: 150, u: 'g', n: 'finely ground blanched almonds' },
        { q: 150, u: 'g', n: 'icing sugar' },
        { q: 55, u: 'g', n: 'egg whites, for the almond paste' },
        { q: 150, u: 'g', n: 'caster sugar' },
        { q: 40, u: 'g', n: 'water' },
        { q: 55, u: 'g', n: 'egg whites, for the meringue' },
        { q: null, u: '', n: 'raspberry-red powdered food colouring' },
      ]},
      { title: 'Raspberry ganache', items: [
        { q: 200, u: 'g', n: 'white chocolate, chopped' },
        { q: 100, u: 'g', n: 'raspberry purée, sieved (from about 150 g raspberries)' },
        { q: 50, u: 'g', n: 'whipping cream (35 % fat)' },
        { q: 15, u: 'g', n: 'unsalted butter, soft' },
      ]},
    ],
    steps: [
      'Make the ganache first: bring the raspberry purée and cream to a simmer, pour over the white chocolate and stir from the centre until smooth. Stir in the butter once it cools to about 35 °C. Cover and chill until thick enough to pipe, at least 3 h.',
      'Sift the ground almonds and icing sugar together. Mix with the first 55 g of egg whites and the colouring into a thick paste.',
      'Heat the caster sugar and water. When the syrup reaches 110 °C, start whisking the second 55 g of whites. At 118 °C, pour the syrup in a thin stream onto the whites, whisking on high, and whisk until the meringue is glossy and cooled to about 50 °C.',
      'Fold the meringue into the almond paste in three additions. Keep folding and pressing the batter against the side of the bowl until it flows off the spatula in a thick ribbon and the trail disappears in about 30 seconds.',
      'Pipe 3.5 cm rounds with a 10 mm plain tip on lined trays. Tap the trays firmly on the counter to release air bubbles.',
      'Leave the shells for 20–30 min, until a skin forms and they are no longer sticky to the touch.',
      'Bake at 150 °C (fan) for 13–15 min. Cool completely before lifting them off the paper.',
      'Pair the shells by size, pipe a generous dot of ganache on half of them and sandwich. Refrigerate for 24 h so the shells soften slightly, and serve at room temperature.',
    ],
    tip: 'Age your egg whites: separate them a day or two ahead and keep them covered in the fridge. They make a steadier meringue.',
  },

  // ───────────────────────────── PAINS
  {
    id: 'baguette',
    category: 'pains',
    name: 'Baguette de tradition',
    ipa: '/ba.ɡɛt də tʁa.di.sjɔ̃/',
    en: 'Traditional French baguette',
    short: 'Flour, water, salt, yeast — nothing else',
    definition:
      'A long, thin loaf with a crackling crust, open creamy crumb and sharp, raised score marks. Under the French bread decree of 1993, a “baguette de tradition française” may contain only flour, water, salt and yeast or sourdough — no additives, and never frozen.',
    origin:
      'Long loaves were sold in Paris from the 19th century, and the baguette became France’s everyday bread in the 20th. In 2022, the artisanal know-how and culture of the baguette were added to UNESCO’s list of Intangible Cultural Heritage.',
    taste: 'A thin, shattering crust with roasted, nutty notes and a soft, chewy, slightly sweet crumb with irregular holes.',
    yield: { n: 3, unit: 'baguettes', unit1: 'baguette' },
    times: { prep: '45 min', rest: '16 h, overnight', bake: '22–25 min' },
    level: 'Intermediate',
    allergens: ['Gluten'],
    components: [
      { title: 'Dough', items: [
        { q: 500, u: 'g', n: 'bread flour (French T65 “tradition”)' },
        { q: 325, u: 'g', n: 'water, about 20 °C' },
        { q: 25, u: 'g', n: 'water, added later (bassinage)' },
        { q: 10, u: 'g', n: 'fine sea salt' },
        { q: 3, u: 'g', n: 'fresh yeast', note: 'or 1 g instant dried yeast' },
      ]},
      { title: 'For shaping and baking', items: [
        { q: null, u: '', n: 'rice flour or semolina, for dusting' },
        { q: 200, u: 'ml', n: 'boiling water, for steam' },
      ]},
    ],
    steps: [
      'Mix the flour and the first 325 g of water just until no dry flour remains. Cover and rest for 30–60 min (autolyse).',
      'Add the salt, crumbled yeast and the remaining 25 g of water. Knead for 5–8 min, until smooth and stretchy.',
      'Cover and leave at about 24 °C for 1 h 30, giving the dough a set of stretch-and-folds after 30 and 60 min.',
      'Cover tightly and refrigerate for 12–15 h.',
      'Tip the cold dough onto the counter and divide into 3 pieces of about 285 g. Pre-shape each loosely into a log and rest for 30 min.',
      'Shape into 35–40 cm baguettes with tapered ends. Lay them seam up on a floured linen cloth, pleating the cloth between them.',
      'Proof for 45–60 min at room temperature, until a floured fingertip leaves a dent that springs back slowly. Meanwhile heat the oven to 250 °C for 45 min with a baking stone or upturned tray and an empty tray on the bottom shelf.',
      'Roll the baguettes onto a peel or board, seam down. Score each with 5 long, overlapping cuts held almost parallel to the loaf, blade at a shallow angle.',
      'Slide them onto the hot stone, pour the boiling water into the bottom tray and close the door. Bake for 10 min, then open the door briefly to let the steam out and bake at 240 °C for 12–15 min more, until deep golden brown.',
      'Cool on a rack for at least 20 min. Listen: a good crust crackles as it cools.',
    ],
    tip: 'The overnight rest in the fridge does the work — it develops the flavour and the creamy crumb with only a pinch of yeast.',
  },
  {
    id: 'pain-de-campagne',
    category: 'pains',
    name: 'Pain de campagne',
    ipa: '/pɛ̃ d(ə) kɑ̃.paɲ/',
    en: 'Country sourdough loaf',
    short: 'Sourdough, a little rye, thick crust',
    definition:
      'A large round country loaf leavened with natural sourdough, with a little rye flour for depth. It has a thick, crackling crust, a chewy, open crumb and a gentle tang, and it keeps well for several days.',
    origin:
      'For centuries this was the everyday bread of rural France, baked in big rounds in village ovens to last the week. Parisian bakers revived it in the 20th century as a rustic counterpart to the white baguette.',
    taste: 'Deeply caramelised crust, moist and chewy crumb, with a mild sourness and an earthy note from the rye.',
    yield: { n: 1, unit: 'large loaves', unit1: 'large loaf', size: 'one loaf of about 1 kg' },
    times: { prep: '45 min', rest: '17 h, overnight', bake: '40–45 min' },
    level: 'Intermediate',
    allergens: ['Gluten'],
    components: [
      { title: 'Dough', items: [
        { q: 450, u: 'g', n: 'bread flour (French T65)' },
        { q: 50, u: 'g', n: 'wholemeal rye flour (French T130 or T170)' },
        { q: 350, u: 'g', n: 'water, about 26 °C' },
        { q: 100, u: 'g', n: 'active sourdough starter (100 % hydration)' },
        { q: 10, u: 'g', n: 'fine sea salt' },
      ]},
      { title: 'For shaping', items: [
        { q: null, u: '', n: 'rice flour, for the proofing basket' },
      ]},
    ],
    steps: [
      'Feed your starter 4–6 h ahead so it is bubbly and at its peak.',
      'Mix both flours with the water until no dry flour remains. Cover and rest for 1 h.',
      'Add the starter and salt and squeeze and fold them through the dough for 5 min, until it feels smooth.',
      'Leave to rise at about 24 °C for 4 h. In the first 2 h, give it a set of stretch-and-folds every 30 min.',
      'Turn the dough out and pre-shape it into a loose round. Rest for 20 min.',
      'Shape a tight round loaf and place it seam up in a proofing basket dusted with rice flour. Cover and refrigerate for 12 h.',
      'Heat the oven to 250 °C with a cast-iron casserole and its lid inside for 45 min.',
      'Turn the cold loaf onto baking paper, score it — a square or a cross — and lower it into the hot casserole. Bake with the lid on for 20 min.',
      'Remove the lid, lower to 230 °C and bake for 20–25 min more, until the crust is a deep chestnut brown.',
      'Cool on a rack for at least 1 h before slicing; the crumb is still setting.',
    ],
    tip: 'Bake it darker than you think. Most of the flavour is in a well-caramelised crust.',
  },
];

// Photos: real, freely licensed photos from Wikimedia Commons. The visitor's
// browser asks Commons for each file, along with its author and licence, which
// are credited on the page. List several file names per product: the first one
// that still exists is used. To use your own photo instead, put it in images/
// and set  local: 'images/croissant.webp'  (your own photos need no credit).
const PHOTOS = {
  croissant: { commons: ['Croissants au beurre (18953292873).jpg', 'Croissant, whole.jpg'] },
  'pain-au-chocolat': { commons: ['Pain au chocolat Luc Viatour.jpg', 'Pain au chocolat.JPG'] },
  'chausson-aux-pommes': { commons: ['Chaussons aux pommes.jpg', 'Chausson aux pommes.jpg'] },
  brioche: { commons: ['Sicilian brioche.jpg', 'Brioche.jpg', 'Brioche Nanterre (mars 2021).jpg'] },
  eclair: { commons: ['Deux éclairs au chocolat.jpg', 'Éclairs au chocolat (13190996733).jpg'] },
  'tarte-aux-fraises': { url: 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2Zyc3RyYXdiZXJyeV90YXJ0X2Nha2Vfc3VpdGVzLWltYWdlLWt5YmNtaWhsLmpwZw.jpg', author: 'rawpixel', site: 'Rawpixel', license: 'CC0', page: 'https://www.rawpixel.com/image/6031774/photo-image-public-domain-fruit-food' },
  'mille-feuille': { commons: ['Mille-feuille 20100916.jpg', 'Mille-feuille 02.jpg'] },
  'paris-brest': { commons: ['Paris-Brest IMG 0875.JPG', 'Paris-brest 1.jpg'] },
  'tarte-au-citron': { commons: ['Tarte au citron meringuée 02.jpg', 'Tarte au citron meringuée sur le comptoir du restaurant La Cocagne (Lyon).jpg', 'Tarte au citron meringuée crème chantilly.jpg'] },
  macarons: { commons: ['Macarons, French made mini cakes.JPG', 'French macaroons.jpg'] },
  baguette: { url: 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJob2FsdXUwMDAwMS1pbWFnZS1rd3Z3d3hicS5qcGc.jpg', author: 'rawpixel', site: 'Rawpixel', license: 'CC0', page: 'https://www.rawpixel.com/image/5917689/image-public-domain-food-free' },
  'pain-de-campagne': { commons: ['Boule de campagne 01.jpg', 'Miche de pain.JPG'] },
};
