// Kökskaos — the chef's notebook: turns recipe data into easy step-by-step instructions (sv/en) by tracing where every
// ingredient comes from (fridge/crate/shelf → knife/masher/blender/... → hob/fryer/pot/oven), plus technique pages.
// The jokes and scribbles come from cookbook_text.js (loaded separately so the game runs without it).
import { RECIPES } from './orders.js';
import { ITEMS } from './items.js';

let TXT = { NOTES: {}, TIPS: [], INTRO: ['', ''], DONENESS: ['', ''] };
export function setText(t) { TXT = { ...TXT, ...t }; }
export const getText = () => TXT;

// Swedish definite forms for the things you put on the board / in the blender ("lägg potatisen på skärbrädan")
const SV_DEF = { potato: 'potatisen', tomato: 'tomaten', lettuce: 'salladshuvudet', cheese: 'osten', bun: 'hamburgerbrödet', bread: 'limpan', carrot: 'moroten',
  cucumber: 'gurkan', onion: 'löken', lemon: 'citronen', mushroom: 'champinjonen', paprika: 'paprikan', sausage: 'korven', steak: 'biffen', pizzadough: 'degen',
  ketchup: 'ketchupflaskan', mustard: 'senapsflaskan', jam: 'syltflaskan', battermix: 'smetflaskan' };
const lc = (s) => (/^(French |Pizza |Fish &)/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

// ------------------------------------------------------------------ phrases
const P = {
  sv: {
    bench: 'står framme på bänken', fridge: (l) => `i kylen "${l}"`, crate: (l) => `i backen "${l}"`, shelf: (l) => `på hyllan "${l}"`,
    the: (k, name) => SV_DEF[k] || lc(name),
    get: (n, name, where) => `Hämta ${n} × ${name} (${where}).`,
    cut: (what, n, piece, pair, times) => `Lägg ${what} på skärbrädan, håll kniven ovanför och hugg RAKT NER → ${n ? n + ' × ' : ''}${piece}${pair ? ' — båda halvorna på ett hugg' : ''}${times > 1 ? ` (gör det ${times} gånger)` : ''}.` + (n > 1 ? ' Ta en bit så följer grannarna med i handen.' : ''),
    blend: (what, n, piece) => `Lägg ${what} i mixerkannan, ställ kannan PÅ mixern och fäll den röda spaken. Efter ett par sekunder → ${n} × ${piece}. Tippa kannan för att hälla ut (R + musen).`,
    mash: (n) => `Lägg den KOKTA potatisen på skärbrädan och dunka den med potatisstöten → ${n} × mos per potatis.`,
    pound: () => `Lägg biffen på skärbrädan och dunka den med köttklubban tills den blir platt → schnitzel.`,
    roll: () => `Lägg degen på bänken och dunka den platt med kaveln → pizzabotten.`,
    grate: () => `Gnid eller dunka osten mot rivjärnet → riven ost trillar ut.`,
    squeeze: (bottle, n, piece) => `Hämta ${bottle} och håll den UPP OCH NER (R + musen) rakt över tallriken → ${n} × ${piece}. Vänd tillbaka den så slutar den spruta.`,
    batterPan: (t, n, flip) => `Ställ en panna på plattan, vrid vredet åt höger och vänta tills den är het. Håll smetflaskan UPP OCH NER (R + musen) rakt över pannan → varje klick blir en pannkaka. Gör ${n}. Ca ${t} s per sida — ${flip} Ta upp dem så fort texten blir grön.`,
    eggFry: (t, n, first) => (first ? 'Ställ en panna på plattan, vrid vredet åt höger och vänta tills den är het. ' : 'I pannan (som ovan): ') + (n > 1 ? `Släpp äggen ett i taget från handhöjd ner i pannan — de spricker av sig själva.` : `Släpp ägget från handhöjd ner i pannan — det spricker av sig självt.`) + ` Ca ${t} s, ingen vändning. Ta upp så fort texten blir grön.`,
    fuse: (top) => `Bygg pizzan på en plåt: pizzabotten, 2 klickar tomatsås (tomat i mixern) och 2 ostskivor (skär osten med kniven)${top}. Allt ska ligga UPPE på botten, inte bredvid.`,
    fuseOven: () => `In i ugnen: fäll ner ugnsluckan, skjut in plåten, stäng och vrid det RÖDA vredet åt höger. Efter ca 11–15 s säger det pling och allt bakas ihop till en pizza — ta ut den DIREKT, annars bränns den.`,
    tops: { pizzafunghi: ' + 3 svampskivor (skiva champinjoner med kniven)', pizzasalami: ' + 3 korvslantar (skiva en korv med kniven)' },
    flip: 'VÄND: ta tag, håll in R och dra musen tills den ligger upp och ner (eller kasta upp pannan). Båda sidornas % ska bli gröna.', flipAgain: 'vänd som ovan.',
    cook: {
      fry: (t, sides, first, flip) => (first ? 'Stek: ställ en panna på plattan, vrid vredet åt höger och vänta tills pannan är het. Lägg i maten. ' : 'Stek i pannan (som ovan). ') + (sides ? `Ca ${t} s per sida — ${flip} ` : `Ca ${t} s. `) + 'Ta upp så fort texten blir grön.',
      grill: (t, sides, first, flip) => `Grilla direkt på en tänd platta (vredet åt höger). Ca ${t} s${sides ? ' per sida — ' + flip : '.'} Lyft av så fort texten blir grön.`,
      deepfry: (t, sides, first) => (first ? 'Fritera: vrid fritösens vred åt höger och lägg maten i fritöskorgen i oljan. ' : 'I fritösen (som ovan). ') + `Ca ${t} s. Så fort texten blir grön: lyft korgen i det röda handtaget eller fiska upp med fritössilen.`,
      boil: (t, sides, first) => (first ? 'Koka: fyll en gryta under kranen (lyft kranspaken) och ställ den på plattan. Vrid vredet åt höger och vänta på bubblor — lock på så kokar det upp fortare. Lägg i maten. ' : 'Koka i grytan (som ovan). ') + `Ca ${t} s. Ta upp (med handen eller fritössilen) så fort texten blir grön.`,
      bake: (t, sides, first) => (first ? 'Ugn: lägg maten på en plåt, fäll ner ugnsluckan i handtaget, skjut in plåten, stäng luckan och vrid det RÖDA vredet åt höger. ' : 'In i ugnen (som ovan). ') + `Ca ${t} s. Dra ut plåten så fort texten blir grön.`,
      warm: (t) => `Värm såsen: häll den från mixerkannan ner i en het panna (vredet åt höger), ca ${t} s. Tippa sedan pannan över tallriken (R + musen).`,
      pasta: (t) => `Sätt på vattnet FÖRST: gryta under kranen (lyft kranspaken), på plattan, vredet åt höger, lock på. Gör resten medan det kokar upp. När det bubblar: ta av locket och lägg i spaghettin, ca ${t} s — klar när den blir mjuk och slingrig. Ta upp den DIREKT (med handen eller fritössilen): efter ~10 s till i vattnet är den BRÄND.`,
    },
    also: (list) => `Funkar också: ${list}.`,
    done: 'Titta på texten när du siktar: gul = tillagas (precis innan grönt duger, men ger mindre), grön PERFEKT = ta upp NU, orange = för mycket (går att servera men ger mindre), röd BRÄND = tunnan. Mat som ligger kvar i het panna, kokande vatten, olja eller ugn fortsätter tillagas — bränd efter ungefär dubbla tiden.',
    plate: (list) => `Lägg upp på en tallrik: ${list}. BARA det — extra bitar på tallriken kostar 8 kr styck. Skålar funkar också.`,
    serve: 'Ställ tallriken på serveringsluckan. Skylten ovanför säger vad som saknas. När tallriken stämmer med beställningen hämtar servitören den.',
    raw: 'som den är', warmed: 'värmd', methods: { fry: 'stekt', grill: 'grillad', deepfry: 'friterad', boil: 'kokt', bake: 'ugnsbakad' },
    locked: (lvl) => `Låses upp på kocknivå ${lvl}`, ingredients: 'Det här behövs', steps: 'Så här gör man', price: 'kr',
    intro: 'Kockens anteckningar', tech: 'Så funkar köket', menu: 'Dagens meny', nextLevel: 'Kommande rätter', tips: 'Kom ihåg',
    flipPages: '← → bläddrar · Tab eller Esc stänger',
  },
  en: {
    bench: 'on the bench', fridge: (l) => `in the fridge "${l}"`, crate: (l) => `in the crate "${l}"`, shelf: (l) => `on the shelf "${l}"`,
    the: (k, name) => 'the ' + lc(name),
    get: (n, name, where) => `Grab ${n} × ${name} (${where}).`,
    cut: (what, n, piece, pair, times) => `Put ${what} on the cutting board, hold the knife above it and chop STRAIGHT DOWN → ${n ? n + ' × ' : ''}${piece}${pair ? ' — both halves from one chop' : ''}${times > 1 ? ` (do it ${times} times)` : ''}.` + (n > 1 ? ' Grab one piece and its neighbours come along in your hand.' : ''),
    blend: (what, n, piece) => `Drop ${what} in the blender jar, stand the jar ON the base and flip the red switch. After a couple of seconds → ${n} × ${piece}. Tip the jar to pour (R + mouse).`,
    mash: (n) => `Put the BOILED potato on the cutting board and whack it with the masher → ${n} × mash per potato.`,
    pound: () => `Put the steak on the cutting board and whack it with the meat mallet until it is flat → schnitzel.`,
    roll: () => `Put the dough on the bench and whack it flat with the rolling pin → pizza base.`,
    grate: () => `Rub or whack the cheese against the grater → grated cheese falls out.`,
    squeeze: (bottle, n, piece) => `Grab ${bottle} and hold it UPSIDE DOWN (R + mouse) right over the plate → ${n} × ${piece}. Turn it back up to stop.`,
    batterPan: (t, n, flip) => `Put a pan on the burner, turn the knob to the right and wait until it is hot. Hold the batter bottle UPSIDE DOWN (R + mouse) right over the pan → each blob becomes a pancake. Make ${n}. About ${t} s per side — ${flip} Take them out as soon as the text turns green.`,
    eggFry: (t, n, first) => (first ? 'Put a pan on the burner, turn the knob to the right and wait until it is hot. ' : 'In the pan (as above): ') + (n > 1 ? 'Drop the eggs one at a time from hand height into the pan — they crack by themselves.' : 'Drop the egg from hand height into the pan — it cracks by itself.') + ` About ${t} s, no flipping. Take it out as soon as the text turns green.`,
    fuse: (top) => `Build the pizza on a tray: pizza base, 2 blobs of tomato sauce (tomato in the blender) and 2 cheese slices (cut the cheese with the knife)${top}. Everything must sit ON the base, not beside it.`,
    fuseOven: () => `Into the oven: pull the oven door down, slide the tray in, close it and turn the RED knob to the right. After about 11–15 s it dings and everything bakes into one pizza — take it out RIGHT AWAY or it burns.`,
    tops: { pizzafunghi: ' + 3 mushroom slices (slice mushrooms with the knife)', pizzasalami: ' + 3 sausage slices (slice a sausage with the knife)' },
    flip: 'FLIP it: grab it, hold R and drag the mouse until it is upside down (or toss the pan). Both sides\' % must turn green.', flipAgain: 'flip it as above.',
    cook: {
      fry: (t, sides, first, flip) => (first ? 'Fry: put a pan on the burner, turn the knob to the right and wait until the pan is hot. Drop the food in. ' : 'Fry in the pan (as above). ') + (sides ? `About ${t} s per side — ${flip} ` : `About ${t} s. `) + 'Take it out as soon as the text turns green.',
      grill: (t, sides, first, flip) => `Grill straight on a lit burner (knob to the right). About ${t} s${sides ? ' per side — ' + flip : '.'} Lift it off as soon as the text turns green.`,
      deepfry: (t, sides, first) => (first ? 'Deep-fry: turn the fryer knob to the right and drop the food into the fryer basket in the oil. ' : 'In the fryer (as above). ') + `About ${t} s. As soon as the text turns green: lift the basket by its red handle or fish it out with the spider strainer.`,
      boil: (t, sides, first) => (first ? 'Boil: fill a pot under the tap (lift the lever) and put it on the burner. Turn the knob to the right and wait for bubbles — a lid brings it to the boil faster. Drop the food in. ' : 'Boil it in the pot (as above). ') + `About ${t} s. Take it out (by hand or with the spider strainer) as soon as the text turns green.`,
      bake: (t, sides, first) => (first ? 'Oven: put the food on a tray, pull the oven door down by its handle, slide the tray in, close the door and turn the RED knob to the right. ' : 'Into the oven (as above). ') + `About ${t} s. Pull the tray out as soon as the text turns green.`,
      warm: (t) => `Heat the sauce: pour it from the blender jar into a hot pan (knob to the right), about ${t} s. Then tip the pan over the plate (R + mouse).`,
      pasta: (t) => `Put the water on FIRST: pot under the tap (lift the lever), onto the burner, knob to the right, lid on. Make the rest while it comes to the boil. When it bubbles: take the lid off and drop the spaghetti in, about ${t} s — done when it goes soft and wiggly. Take it out RIGHT AWAY (by hand or with the spider strainer): ~10 more seconds in the water and it is BURNT.`,
    },
    also: (list) => `Also works: ${list}.`,
    done: 'Watch the text while aiming: yellow = cooking (just before green still passes, but pays less), green PERFECT = take it out NOW, orange = overdone (still servable, pays less), red BURNT = bin it. Food left in a hot pan, boiling water, oil or the oven keeps cooking — burnt after roughly double the time.',
    plate: (list) => `Plate it up: ${list}. JUST that — every extra bit on the plate costs 8 kr. Bowls work too.`,
    serve: 'Put the plate on the pass. The sign above it says what is missing. When the plate matches the order, a waiter collects it.',
    raw: 'as is', warmed: 'heated', methods: { fry: 'fried', grill: 'grilled', deepfry: 'deep-fried', boil: 'boiled', bake: 'baked' },
    locked: (lvl) => `Unlocks at chef level ${lvl}`, ingredients: 'You need', steps: 'How to make it', price: 'kr',
    intro: "The chef's notes", tech: 'How the kitchen works', menu: "Today's menu", nextLevel: 'Coming up', tips: 'Remember',
    flipPages: '← → flip pages · Tab or Esc closes',
  },
};

// ------------------------------------------------------------------ where does an ingredient come from?
function originOf(k) {
  for (const kind in ITEMS) {
    const d = ITEMS[kind];
    if (d.cut && (Array.isArray(d.cut.into) ? d.cut.into.includes(k) : d.cut.into === k)) return chain(kind, { how: 'cut', from: kind, to: k, n: Array.isArray(d.cut.into) ? 1 : d.cut.n, sibs: Array.isArray(d.cut.into) ? d.cut.into.filter(x => x !== k) : null });
    if (d.use) for (const tool in d.use) if (d.use[tool].into === k) return chain(kind, { how: tool, from: kind, to: k, n: d.use[tool].n, cooked: d.use[tool].cooked });
    if (d.blend && d.blend.into === k) return chain(kind, { how: 'blend', from: kind, to: k, n: d.blend.n });
    if (d.fragile === k) return chain(kind, { how: 'crack', from: kind, to: k, n: 1 });
    if (d.cook && d.cook.becomes === k) return chain(kind, { how: 'boilBecomes', from: kind, to: k, n: 1 });
    if (d.squeeze === k) return chain(kind, { how: 'squeeze', from: kind, to: k, n: 14 });
    if (d.onHot === k) return chain(kind, { how: 'batter', from: kind, to: k, n: 1 });
  }
  if (/^pizza(funghi|salami)?$/.test(k)) { const o = originOf('pizzabase'); return { base: o.base, steps: [...o.steps, { how: 'fuse', to: k, n: 1 }] }; }
  return { base: k, steps: [] };
}
function chain(kind, step) { const o = originOf(kind); return { base: o.base, steps: [...o.steps, step] }; }

// ------------------------------------------------------------------ one recipe → notebook page data
export function recipePage(rec, lang, K) {
  const p = P[lang] || P.sv, li = lang === 'en' ? 1 : 0;
  const name = (k, cooked) => (cooked && ITEMS[k].cookedName ? ITEMS[k].cookedName : ITEMS[k].n)[li];
  const low = (k, cooked) => lc(name(k, cooked));
  const where = (k) => { const s = K && K.stock.find(x => x.kind === k); return s && s.label ? (p[s.src] || p.shelf)(s.label) : p.bench; };
  const ingredients = [], steps = [], spare = {};   // spare: pieces an earlier step already produced (the bun top after cutting the bun)
  const used = new Set();                            // appliances already explained on this page ("as above")
  let flipShown = false;
  const flipTxt = () => { const t = flipShown ? p.flipAgain : p.flip; flipShown = true; return t; };
  for (const q of rec.req) {
    const need = q.n, o = originOf(q.k), def = ITEMS[q.k], isSauce = q.k === 'sauce' || def.condiment;
    let yieldN = 1; for (const s of o.steps) yieldN *= s.how === 'squeeze' ? 99 : (s.n || 1);
    const baseN = Math.max(1, Math.ceil(need / yieldN));
    const label = q.cooked ? (isSauce ? p.warmed : p.methods[q.cooked[0]]) : (def.cook ? p.raw : '');
    ingredients.push(`${need} × ${name(q.k, !!q.cooked)}${label ? ' — ' + label : ''}`);
    const haveSpare = (spare[q.k] || 0) >= need;
    if (haveSpare) spare[q.k] -= need;
    else if (!o.steps.length) steps.push(p.get(baseN, low(o.base), where(o.base)));
    else if (!o.steps.every(s => s.how === 'squeeze')) steps.push(p.get(baseN, low(o.base), where(o.base)));
    const hows = new Set(o.steps.map(s => s.how));
    for (const s of o.steps) {
      if (haveSpare) break;
      if (s.sibs) for (const sb of s.sibs) spare[sb] = (spare[sb] || 0) + baseN;
      const what = () => (baseN > 1 && s.from === o.base ? `${baseN} × ${low(s.from)}` : p.the(s.from, name(s.from)));
      if (s.how === 'cut') steps.push(p.cut(p.the(s.from, name(s.from)), s.n === 1 ? 0 : s.n, s.sibs ? [s.to, ...s.sibs].map(x => low(x)).join(' + ') : low(s.to), !!s.sibs, s.from === o.base ? baseN : 1));
      else if (s.how === 'crack') { const t = ITEMS[s.to].cook.t.fry; steps.push(p.eggFry(t, need, !used.has('fry'))); used.add('fry'); }
      else if (s.how === 'blend') steps.push(p.blend(what(), s.n * baseN, low(s.to)));
      else if (s.how === 'mash') { steps.push(p.cook.boil(ITEMS[s.from].cook.t.boil, false, !used.has('boil'))); used.add('boil'); steps.push(p.mash(s.n)); }
      else if (s.how === 'pound') steps.push(p.pound());
      else if (s.how === 'roll') steps.push(p.roll());
      else if (s.how === 'grate') steps.push(p.grate());
      else if (s.how === 'squeeze' && !hows.has('batter')) steps.push(p.squeeze(p.the(s.from, name(s.from)), need, low(s.to)));
      else if (s.how === 'batter') { steps.push(p.batterPan(ITEMS[s.to].cook.t.fry, need, flipTxt())); used.add('fry'); }
      else if (s.how === 'fuse') { steps.push(p.fuse(p.tops[s.to] || '')); steps.push(p.fuseOven()); used.add('bake'); }
      else if (s.how === 'boilBecomes') { steps.push(p.cook.pasta(ITEMS[s.from].cook.t.boil)); used.add('boil'); }
    }
    const implied = ['boilBecomes', 'fuse', 'batter', 'crack'].some(h => hows.has(h));
    if (q.cooked && !implied) {
      const m = q.cooked[0], ck = def.cook, t = ck ? (ck.t[m] || ck.t.fry || 10) : 10, sides = !!(ck && ck.sides === 2);
      const main = isSauce ? p.cook.warm(t) : p.cook[m](t, sides, !used.has(m), sides ? flipTxt() : '');
      used.add(isSauce ? 'fry' : m);
      steps.push(main + (q.cooked.length > 1 && !isSauce ? ' ' + p.also(q.cooked.slice(1).map(x => p.methods[x]).join(', ')) : ''));
    }
  }
  steps.push(p.plate(rec.req.map(q => `${q.n} × ${low(q.k, !!q.cooked)}`).join(', ')));
  steps.push(p.serve);
  const note = TXT.NOTES[rec.id];
  return { id: rec.id, title: rec.n[li], icon: rec.icon, price: rec.price, photo: `img/recipes/${rec.id}.jpg`, note: note ? note[li] : '', ingredients, steps, doneness: p.done, lvl: rec.lvl };
}

// ------------------------------------------------------------------ technique pages
export function techPages(lang) {
  const li = lang === 'en' ? 1 : 0, p = P[lang] || P.sv;
  const t = (sv, en) => (li ? en : sv);
  return [
    { id: 'hob', title: t('Spisen', 'The hob'), photo: 'img/howto/hob.jpg', lines: [
      t('Ta tag i ett vred och dra åt höger → plattan tänds. Tillbaka åt vänster = av.', 'Grab a knob and drag it to the right → the burner lights. Back to the left = off.'),
      t('Varje vred hör till en platta: de två yttre = bakre plattorna, de två inre = främre. Det röda vredet i mitten är ugnen.', 'Each knob belongs to one burner: the two outer ones = back burners, the two inner ones = front. The red knob in the middle is the oven.'),
      t('Pannan blir het efter några sekunder. Maten steks bara i en HET panna som står PÅ plattan.', 'The pan gets hot after a few seconds. Food only fries in a HOT pan sitting ON the burner.'),
      t('Biff, burgare, fisk och pannkakor steks en sida i taget — VÄND dem: ta tag, håll in R och dra musen tills den ligger upp och ner (eller kasta upp pannan). Sikta på maten: båda sidornas % ska bli gröna.', 'Steak, patties, fish and pancakes cook one side at a time — FLIP them: grab it, hold R and drag the mouse until it is upside down (or toss the pan). Aim at the food: both sides\' % must turn green.'),
      t('T rätar upp det du håller — så en vänd biff vänds tillbaka. Ta upp maten när texten blir grön: den fortsätter stekas så länge den ligger kvar.', 'T levels whatever you hold — so a flipped steak flips back. Take food out when the text turns green: it keeps frying as long as it stays in.')] },
    { id: 'fryer', title: t('Fritösen', 'The fryer'), photo: 'img/howto/fryer.jpg', lines: [
      t('Vrid fritösens vred (på framsidan) åt höger. Oljan blir het på några sekunder.', 'Turn the fryer knob (on the front) to the right. The oil heats up in seconds.'),
      t('Lägg maten i fritöskorgen som hänger i oljan. Pommes, lökringar, nuggets, fisk...', 'Drop food into the fryer basket hanging in the oil. Fries, onion rings, nuggets, fish...'),
      t('Näve: ta en potatisstav så följer grannarna med, och svep handen över fler stavar för att plocka upp dem (upp till 12). Släpp över korgen.', 'Handful: grab one potato stick and its neighbours come along — sweep your hand over more sticks to scoop them up (up to 12). Let go over the basket.'),
      t('Lyft korgen i det röda handtaget så fort texten blir grön — eller fiska upp med fritössilen.', 'Lift the basket by its red handle as soon as the text turns green — or fish it out with the spider strainer.')] },
    { id: 'boil', title: t('Kranen & kokning', 'The tap & boiling'), photo: 'img/howto/boil.jpg', lines: [
      t('Ställ en gryta under kranen och lyft kranspaken. Vattnet fyller på.', 'Put a pot under the tap and lift the lever. It fills up.'),
      t('Gryta med vatten på en tänd platta → efter en stund bubblar det. Då lägger du i maten.', 'A pot of water on a lit burner → after a while it bubbles. Then the food goes in.'),
      t('Lägg ett lock på så kokar det upp dubbelt så fort. Måttkannan kan bära vattnet om grytan är för tung.', 'Put a lid on and it comes to the boil twice as fast. The jug can carry water if the pot is too heavy.'),
      t('Spaghetti blir mjuk och slingrig när den är klar — ta upp den direkt, den bränns fort.', 'Spaghetti goes soft and wiggly when done — take it out right away, it burns fast.')] },
    { id: 'oven', title: t('Ugnen', 'The oven'), photo: 'img/howto/oven.jpg', lines: [
      t('Fäll ner ugnsluckan i handtaget. Lägg maten på en plåt och skjut in den.', 'Pull the oven door down by its handle. Put food on a tray and slide it in.'),
      t('Stäng ugnsluckan och vrid det RÖDA vredet åt höger. Öppen ugnslucka = ugnen bakar mycket långsammare.', 'Close the oven door and turn the RED knob to the right. Open door = the oven bakes much slower.'),
      t('Pizza: botten + sås + ost på plåten → in → efter en stund säger det pling och allt har bakats ihop till en pizza. Ta ut den direkt.', 'Pizza: base + sauce + cheese on the tray → in → after a while it dings and everything has baked into one pizza. Take it out right away.')] },
    { id: 'knife', title: t('Kniven & verktygen', 'The knife & tools'), photo: 'img/howto/knife.jpg', lines: [
      t('Ta kniven — den pekar automatiskt framåt (T rätar upp den). Håll bladet över maten och hugg RAKT NER: dra musen snabbt nedåt.', 'Grab the knife — it points forward automatically (T straightens it). Hold the blade over the food and chop STRAIGHT DOWN: flick the mouse down fast.'),
      t('Potatis → stavar → fritösen = pommes. Tomat → skivor. Sallad → blad. Hamburgerbröd → botten + lock. Limpa → 5 brödskivor.', 'Potato → sticks → fryer = fries. Tomato → slices. Lettuce → leaves. Bun → bottom + top. Loaf → 5 slices.'),
      t('Små bitar tar man en näve av: ta en bit så följer grannarna av samma sort med, svep handen över fler så plockas de upp.', 'Small bits come by the handful: grab one and its neighbours of the same kind come along, sweep your hand over more to scoop them up.'),
      t('Potatisstöten mosar kokt potatis. Köttklubban plattar biff till schnitzel. Kaveln plattar pizzadeg. Rivjärnet river ost.', 'The masher mashes boiled potato. The mallet flattens steak into schnitzel. The rolling pin flattens pizza dough. The grater grates cheese.')] },
    { id: 'squeeze', title: t('Flaskor & mixern', 'Bottles & the blender'), photo: 'img/howto/squeeze.jpg', lines: [
      t('Ketchup, senap, sylt och pannkakssmet: håll flaskan upp och ner (R + musen) så sprutar den. Vänd tillbaka den så slutar den.', 'Ketchup, mustard, jam and pancake batter: hold the bottle upside down (R + mouse) and it squirts. Turn it back up to stop.'),
      t('Mixern: lägg tomater i kannan, ställ kannan PÅ mixern och fäll den röda spaken → 3 klickar tomatsås per tomat. Tippa kannan för att hälla ut.', 'The blender: tomatoes in the jar, stand the jar ON the base and flip the red switch → 3 blobs of tomato sauce per tomato. Tip the jar to pour.'),
      t('Sås och smet är små klickar med egen fysik — de trillar gärna av tallriken. Var rädd om dem.', 'Sauce and batter are little blobs with their own physics — they love rolling off the plate. Be gentle.')] },
    { id: 'pass', title: t('Serveringsluckan', 'The pass'), photo: 'img/howto/pass.jpg', lines: [
      t('Dra i den röda spaken vid serveringsluckan → serveringen börjar och beställningar dyker upp (lappar uppe till vänster).', 'Pull the red lever by the pass (the serving hatch) → service starts and orders appear (tickets top-left).'),
      t('Lägg upp rätten på en tallrik — bara det som står i receptet, extra bitar kostar 8 kr styck — och ställ den på luckan. Skylten säger vad som saknas eller är fel (rå, bränd, fel tillagning).', 'Plate the dish — only what the recipe says, every extra bit costs 8 kr — and put it on the pass. The sign says what is missing or wrong (raw, burnt, wrong method).'),
      t('Stämmer allt hämtar servitören. Snabbt = mer betalt. Gästerna blir sura om de får vänta.', 'When it matches, a waiter collects it. Fast = more pay. Guests get grumpy if they wait.'), p.done] },
    { id: 'bin', title: t('Tunnan', 'The bin'), photo: 'img/howto/bin.jpg', lines: [
      t('Bränd mat, missar och golvmat: släng dem i de gröna tunnorna. Puff — borta.', 'Burnt food, mistakes and floor food: throw them in the green bins. Poof — gone.'),
      t('Råvaror fylls på av sig själva i kylar, backar och hyllor. Verktyg som ligger länge på golvet hittar hem själva.', 'Ingredients restock themselves in fridges, crates and shelves. Tools left on the floor find their own way home.')] },
  ];
}

// all pages for the notebook: intro, technique, menu recipes, coming-up recipes
export function buildBook(lang, menuIds, tier, level, K) {
  const li = lang === 'en' ? 1 : 0, p = P[lang] || P.sv, have = new Set(menuIds);
  const pages = [{ kind: 'intro', title: p.intro, text: TXT.INTRO[li], doneness: TXT.DONENESS[li] || p.done, tips: TXT.TIPS.map(t => t[li]), flip: p.flipPages }];
  for (const t of techPages(lang)) pages.push({ kind: 'tech', ...t });
  for (const r of RECIPES) if (have.has(r.id)) pages.push({ kind: 'recipe', ...recipePage(r, lang, K) });
  const next = RECIPES.filter(r => !have.has(r.id) && r.tier <= tier).sort((a, b) => a.lvl - b.lvl).slice(0, 8);
  for (const r of next) pages.push({ kind: 'locked', id: r.id, title: r.n[li], icon: r.icon, lvl: r.lvl, text: p.locked(r.lvl), photo: `img/recipes/${r.id}.jpg` });
  return { pages, labels: { ingredients: p.ingredients, steps: p.steps, price: p.price, tech: p.tech, menu: p.menu, next: p.nextLevel, tips: p.tips, flip: p.flipPages } };
}
