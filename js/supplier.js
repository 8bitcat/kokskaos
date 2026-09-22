// Kökskaos — the supplier: order raw ingredients from the wall phone; a crate with everything lands on the DELIVERY spot.
// SUPPLY is shared by the order menu (any player) and the host, which validates, charges the till and drops the crate.
import { ITEMS } from './items.js';

export const SUPPLY_MAX = 30;            // items per crate
export const SUPPLY = [
  // cat 0: veggies
  { k: 'potato', p: 3, i: '🥔', c: 0 }, { k: 'onion', p: 3, i: '🧅', c: 0 }, { k: 'carrot', p: 3, i: '🥕', c: 0 }, { k: 'tomato', p: 4, i: '🍅', c: 0 },
  { k: 'lettuce', p: 5, i: '🥬', c: 0 }, { k: 'cucumber', p: 4, i: '🥒', c: 0 }, { k: 'mushroom', p: 4, i: '🍄', c: 0 }, { k: 'paprika', p: 5, i: '🫑', c: 0 },
  { k: 'broccoli', p: 5, i: '🥦', c: 0 }, { k: 'corn', p: 6, i: '🌽', c: 0 }, { k: 'lemon', p: 4, i: '🍋', c: 0 },
  // cat 1: meat & fish
  { k: 'steak', p: 18, i: '🥩', c: 1 }, { k: 'patty', p: 10, i: '🍔', c: 1 }, { k: 'chicken', p: 14, i: '🍗', c: 1 }, { k: 'sausage', p: 6, i: '🌭', c: 1 },
  { k: 'meatball', p: 3, i: '🧆', c: 1 }, { k: 'bacon', p: 4, i: '🥓', c: 1 }, { k: 'fish', p: 14, i: '🐟', c: 1 }, { k: 'salmon', p: 22, i: '🍣', c: 1 },
  { k: 'shrimp', p: 4, i: '🦐', c: 1 }, { k: 'fishfinger', p: 4, i: '🐠', c: 1 }, { k: 'nugget', p: 3, i: '🍗', c: 1 },
  // cat 2: dairy, eggs, dry goods
  { k: 'cheese', p: 12, i: '🧀', c: 2 }, { k: 'egg', p: 3, i: '🥚', c: 2 }, { k: 'bun', p: 4, i: '🍔', c: 2 }, { k: 'hotdogbun', p: 3, i: '🌭', c: 2 },
  { k: 'bread', p: 8, i: '🍞', c: 2 }, { k: 'spaghetti', p: 2, i: '🍝', c: 2 }, { k: 'pizzadough', p: 8, i: '🍕', c: 2 }, { k: 'rice', p: 1, i: '🍚', c: 2 },
];
export const SUPPLY_BY_KIND = Object.fromEntries(SUPPLY.map(s => [s.k, s]));
const CATS = [['Grönt', 'Veggies'], ['Kött & fisk', 'Meat & fish'], ['Mejeri, ägg & torrvaror', 'Dairy, eggs & dry goods']];

// build the order menu inside `el` (the shared #dialog). onOrder(items) gets { kind: count }.
export function openSupplier(el, { lang, running, till, onOrder, onClose }) {
  const li = lang === 'en' ? 1 : 0, L = (sv, en) => (li ? en : sv), cart = {};
  const count = () => Object.values(cart).reduce((a, b) => a + b, 0), cost = () => SUPPLY.reduce((s, x) => s + (cart[x.k] || 0) * x.p, 0);
  el.innerHTML = `<div class="panel wide supply"><h2>📞 ${L('Grossisten', 'The wholesaler')}</h2>
    <p>${running ? L(`Under serveringen dras beställningen från kassan (${till} kr just nu).`, `During service the order is paid from the till (${till} kr right now).`) : L('Fri lek: allt är gratis! Lådan landar på den gul-svarta LEVERANS-rutan.', 'Free play: everything is free! The crate lands on the yellow-and-black DELIVERY spot.')}
    ${L(`Max ${SUPPLY_MAX} saker per låda.`, `Max ${SUPPLY_MAX} items per crate.`)}</p>
    <div class="scats">${CATS.map((c, ci) => `<h3>${c[li]}</h3><div class="sgrid">${SUPPLY.filter(s => s.c === ci).map(s => `<div class="sit" data-k="${s.k}"><span class="ri">${s.i}</span><b>${ITEMS[s.k].n[li]}</b><small>${s.p} kr</small><div class="qty"><button data-d="-1">−</button><i>0</i><button data-d="1">+</button><button data-d="5">+5</button></div></div>`).join('')}</div>`).join('')}</div>
    <div class="wfoot"><span id="stot"></span><button class="btn small" id="sorder"></button><button class="btn ghost small" id="sclose">${L('Stäng', 'Close')}</button></div></div>`;
  const draw = () => {
    const n = count(), c = running ? cost() : 0, poor = running && c > till;
    el.querySelector('#stot').textContent = n ? `${n} ${L('st', 'items')} · ${running ? c + ' kr' : L('gratis', 'free')}${poor ? ' — ' + L('kassan räcker inte!', 'the till is short!') : ''}` : L('Välj råvaror med + och −', 'Pick ingredients with + and −');
    const b = el.querySelector('#sorder'); b.textContent = L('Beställ', 'Order'); b.classList.toggle('disabled', !n || poor);
    for (const d of el.querySelectorAll('.sit')) { const k = d.dataset.k; d.querySelector('i').textContent = cart[k] || 0; d.classList.toggle('on', !!cart[k]); }
  };
  for (const d of el.querySelectorAll('.sit')) for (const b of d.querySelectorAll('button')) b.onclick = () => {
    const k = d.dataset.k, add = +b.dataset.d, room = SUPPLY_MAX - count();
    cart[k] = Math.max(0, (cart[k] || 0) + Math.min(add, room)); if (!cart[k]) delete cart[k]; draw();
  };
  const close = () => { document.removeEventListener('keydown', onKey, true); onClose(); };
  const onKey = (e) => { if (e.code === 'Escape') { e.preventDefault(); close(); } };
  document.addEventListener('keydown', onKey, true);
  el.querySelector('#sclose').onclick = close;
  el.querySelector('#sorder').onclick = () => { if (!count()) return; onOrder({ ...cart }); close(); };
  el.style.display = 'flex'; draw();
}
