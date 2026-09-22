// Kökskaos — the "voice" of the in-game recipe notebook: scribbled remarks left behind by the previous chef.
// Only flavour text lives here; the actual step-by-step instructions are generated from RECIPES in orders.js.
// Every entry is [svenska, English]. Keys in NOTES are recipe ids from RECIPES (one per recipe, no omissions).
// No imports on purpose — this file is plain data so it can be loaded anywhere (HUD, wall post-its, tests).

export const NOTES = {
  // ---------------- tier 0: Sunkhaket
  friesketchup: [
    'Stavarna i korgen, korgen i oljan. Två klickar ketchup — inte hela flaskan som sist.',
    'Sticks in the basket, basket in the oil. Two ketchup blobs — not the whole bottle again.',
  ],
  sausagefries: [
    'Korven tål panna, grill, gryta, ugn och fritös. Men inte att glömmas. BRÄNN INTE KORVEN!',
    "Sausage takes pan, grill, pot, oven or fryer. Just don't forget it. DON'T BURN THE SAUSAGE!",
  ],
  hotdog: [
    'Bröd, korv, EN ketchup, EN senap. Flaskan sprutar bara upp och ner. Fråga inte hur jag vet.',
    "Bun, sausage, ONE ketchup, ONE mustard. Bottles only squirt upside down. Don't ask how I know.",
  ],
  breakfast: [
    'Tappa ägget i pannan så spricker det själv. Två ägg, en korv. Kasta inte äggen. Snälla.',
    'Drop the egg in the pan — it cracks itself. Two eggs, one sausage. No egg throwing. Please.',
  ],
  burger: [
    'Dela brödet. Burgaren har TVÅ sidor — vänd! Botten, kött, ost, sallad, tomat, lock.',
    'Cut the bun. The patty has TWO sides — flip it! Bottom, patty, cheese, lettuce, tomato, top.',
  ],
  salad: [
    'Bara kniv, ingen spis. Sallad, tomat, gurka: hacka, lägg upp. Stek INTE salladen. Igen.',
    "Knife only, no hob. Lettuce, tomato, cucumber: chop, plate. Don't fry the lettuce. Again.",
  ],
  fishchips: [
    'Fisken kan åka i fritösen med pommesen — samma olja, halva jobbet. I pannan: vänd den!',
    'Fish can ride in the fryer with the fries — same oil, half the work. In a pan: flip it!',
  ],
  steakfries: [
    'Het panna, vänd biffen när den fått färg. Grönt = bra, rött = tunnan. Pommes = fritösen.',
    'Hot pan, flip the steak once it browns. Green = good, red = bin. Fries = the fryer.',
  ],
  onionrings: [
    'En lök = 4 ringar, gästen vill ha 5. Alltså två lökar. Gråt inte ner i fritösen.',
    "One onion = 4 rings, the guest wants 5. So, two onions. Don't cry into the fryer.",
  ],
  baconeggs: [
    'Baconet är klart på sekunder — stå kvar! Brödskivan i pannan = toast. Tre bacon, två ägg.',
    'Bacon is done in seconds — stay put! Bread in the pan = toast. Three rashers, two eggs.',
  ],
  grilledcheese: [
    'Rosta två brödskivor, två ostskivor emellan. Osten steks inte, den bara läggs på. Klart!',
    'Toast two slices, two cheese slices in between. Cheese is not fried, just placed. Done!',
  ],
  nuggets: [
    'Fem nuggets, fem pommes, samma korg. Ugnen duger för nuggets, men fritösen är snabbare.',
    'Five nuggets, five fries, same basket. Oven works for nuggets, but the fryer is quicker.',
  ],
  // ---------------- tier 1: Kvarterskrogen
  spaghetti: [
    'Vatten i grytan, lock på, tre spaghetti i. Tomat i mixern = sås. På pastan, inte golvet.',
    'Fill the pot, lid on, three spaghetti. Blend a tomato = sauce. Goes on the pasta, not the floor.',
  ],
  meatballmash: [
    'KOKA potatisen innan du mosar — rå potatis ger bara ett dovt ljud. Fem bullar i pannan.',
    'BOIL the potato before mashing — a raw spud just goes thud. Five meatballs in the pan.',
  ],
  pancakes: [
    'Flaskan upp och ner över HET panna: plupp, pannkaka. Vänd! Tre stycken, två klickar sylt.',
    'Batter bottle upside down over a HOT pan: plop, pancake. Flip! Three, plus two jam blobs.',
  ],
  chicken: [
    'Klubban: UGN eller fritös. Pannan räknas inte, hur du än stirrar. Två potatisar bredvid.',
    "Drumstick: OVEN or fryer. The pan doesn't count, however hard you stare. Add two potatoes.",
  ],
  carrots: [
    'Morot i slantar, slantarna i grytan. Fyra räcker — resten är kockens. Fisken i pannan.',
    'Carrot into coins, coins in the pot. Four needed — the rest are snacks. Fish in the pan.',
  ],
  fishfingers: [
    'Fyra pinnar i fritösen (panna och ugn duger också). En kokt potatis + stöten = lagom mos.',
    'Four fingers in the fryer (a pan or the oven work too). One boiled potato + masher = enough mash.',
  ],
  tomatosoup: [
    'Två tomater i mixern = sex klickar sås. VÄRM dem, annars är det kall ketchup. Bröd till.',
    "Blend two tomatoes = six sauce blobs. HEAT them or it's cold ketchup. Bread on the side.",
  ],
  meatballpasta: [
    'Bullarna rullar av tallriken om de läggs överst. Pasta först, sen sås, sen fyra bullar.',
    'Meatballs roll off if they go on top. Pasta first, then sauce, then four meatballs.',
  ],
  doubleburger: [
    'Två burgare, två ostskivor, ingen sallad — extra på tallriken kostar. Stapla högt och hoppas.',
    'Two patties, two cheese slices, no lettuce — extras on the plate cost you. Stack high and hope.',
  ],
  pizza: [
    'Kavla degen, sås + ost på, in i ugnen — den smälter ihop allt till pizza. Basilika ingår.',
    'Roll the dough, sauce + cheese on, into the oven — it bakes into a pizza. Basil is free.',
  ],
  // ---------------- tier 2: Storköket
  baconburger: [
    'Baconet blir klart före burgaren — lägg i det sist. Ost ovanpå, lock på. Ingen tomat här!',
    'Bacon finishes before the patty — put it in last. Cheese on top, bun top on. No tomato here!',
  ],
  schnitzel: [
    'Biff + köttklubba = schnitzel. Slå på BIFFEN, inte på kollegan. Citronskiva, pommes.',
    'Steak + mallet = schnitzel. Whack the STEAK, not your colleague. Lemon slice, fries.',
  ],
  pizzafunghi: [
    'Margherita + minst TRE svampskivor FÖRE ugnen. Champinjonen hackar sig inte själv.',
    "Margherita + at least THREE mushroom slices BEFORE the oven. They don't slice themselves.",
  ],
  pizzasalami: [
    'Salamin är korv i slantar — säg inget till gästen. Minst tre slantar + sås + ost, sen ugn.',
    "Salami = sliced sausage — don't tell the guest. Three+ slices, sauce and cheese, then oven.",
  ],
  mushroompasta: [
    'Svamp i pannan, pasta i grytan. Riv osten mot rivjärnet, inte kniven. Två nypor ovanpå.',
    'Mushrooms in the pan, pasta in the pot. Rub the cheese on the grater, not the knife. Two pinches on top.',
  ],
  cornchicken: [
    'Majskolven tar allt: gryta, panna, grill, ugn. Klubban är kräsen: ugn eller fritös.',
    'Corn takes anything: pot, pan, grill, oven. The drumstick is fussy: oven or fryer only.',
  ],
  steakbroccoli: [
    'Biff i pannan, broccoli + potatis i samma gryta. Biffen har TVÅ sidor — vänd den!',
    'Steak in the pan, broccoli + potatoes in the same pot. The steak has TWO sides — flip it!',
  ],
  // ---------------- tier 3: Stjärnkrogen
  salmonrice: [
    'Ris i kokande vatten — det sväller, fem räcker. Laxen i pannan, vänd. Citronskiva ovanpå.',
    'Rice in boiling water — it swells, five will do. Salmon in the pan, flip. Lemon on top.',
  ],
  shrimprice: [
    'Räkorna är klara på fem sekunder. FEM. Blinka inte. Ris i grytan, paprikan i strimlor, rå.',
    "Shrimp are done in five seconds. FIVE. Don't blink. Rice in the pot, raw pepper strips.",
  ],
  shrimpsalad: [
    'Bara räkorna får värme (koka/stek). Fyra räkor, tre blad, två gurkskivor, en citronskiva.',
    'Only the shrimp get heat (boil/fry). Four shrimp, three leaves, two cucumber slices, one lemon slice.',
  ],
  shrimptoast: [
    'Rosta brödet, blad på, fyra räkor, citron överst. I den ordningen — annars ramlar allt av.',
    'Toast the bread, leaf on, four shrimp, lemon on top. That order — or it all falls off.',
  ],
  vegwok: [
    'Hacka allt, allt i woken, skaka. Grejer som hoppar ur är fysik, inte du. Inget kött här!',
    "Chop it all, into the wok, shake. Bits jumping out? That's physics, not you. No meat here!",
  ],
  surfturf: [
    'Dyraste rätten vi har. Biff i pannan, räkor + broccoli i grytan, citronskiva ovanpå. Kasta den INTE.',
    'Priciest dish we have. Steak in the pan, shrimp + broccoli in the pot, lemon slice on top. Do NOT throw it.',
  ],
};

// Shouty post-it notes stuck on the kitchen walls. Short enough to fit a sticky note (≈34 chars per language).
export const TIPS = [
  ['BRÄNN INTE KORVEN!', "DON'T BURN THE SAUSAGE!"],
  ['Grönt = PERFEKT. Rött = tunnan.', 'Green = PERFECT. Red = bin.'],
  ['Tallriken på luckan → servitören', 'Plate on the pass → waiter'],
  ['Tab = mina anteckningar', 'Tab = my notes'],
  ['Kasta inte pannor på servitören', "Don't throw pans at the waiter"],
  ['Flaskan UPP OCH NER = det sprutar', 'Bottle UPSIDE DOWN = it squirts'],
  ['LOCK PÅ GRYTAN = kokar fortare', 'LID ON THE POT = boils faster'],
  ['Pommes = FRITÖSEN. Inget annat.', 'Fries = THE FRYER. Nothing else.'],
  ['T = räta upp kniven!!', 'T = straighten the knife!!'],
  ['Yr efter en smäll? Stå still.', 'Dizzy after a bonk? Stand still.'],
  ['Arga gäster = mindre pengar', 'Angry guests = less money'],
  ['KOKA potatisen innan du mosar', 'BOIL the potato before mashing'],
  ['Svep handen = en hel näve bitar', 'Sweep your hand = a handful'],
  ['Ägg spricker. KASTA INTE ägg.', 'Eggs crack. DO NOT throw eggs.'],
];

// First page of the notebook.
export const INTRO = [
  'Den här boken låg i lådan under fritösen, full av kaffefläckar och utan namn — bara "kocken före dig". Tryck Tab när du kört fast (Tab igen eller Esc stänger). Det tryckta är receptet, klottret är vad jag lärde mig den hårda vägen.',
  'Found this book in the drawer under the fryer, coffee-stained and unsigned — just "the chef before you". Press Tab whenever you are stuck (Tab again or Esc closes it). The printed part is the recipe; the scribbles are what I learned the hard way.',
];

// The one line about doneness colours worth remembering.
export const DONENESS = [
  'Gult: vänta. Grönt: NU! Orange: för länge, men går att servera. Rött: BRÄND — tunnan, direkt.',
  'Yellow: wait. Green: NOW! Orange: too long, but still servable. Red: BURNT — bin it, straight away.',
];
