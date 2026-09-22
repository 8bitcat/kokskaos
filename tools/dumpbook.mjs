// dumps every notebook page (sv + en, all recipes regardless of level) to a text file for review
import fs from 'node:fs';
const { RECIPES } = await import('../js/orders.js');
const { recipePage, techPages, setText } = await import('../js/cookbook.js');
const txt = await import('../js/cookbook_text.js').catch(() => ({}));
setText({ NOTES: txt.NOTES || {}, TIPS: txt.TIPS || [], INTRO: txt.INTRO || ['', ''], DONENESS: txt.DONENESS || ['', ''] });
const K = { stock: [{ kind: 'potato', src: 'crate', label: 'POTATIS' }, { kind: 'steak', src: 'fridge', label: 'KÖTT' }] };
let out = '';
for (const lang of ['sv', 'en']) {
  out += `\n==================== ${lang.toUpperCase()} ====================\n`;
  for (const t of techPages(lang)) out += `\n## [tech] ${t.title}\n` + t.lines.map(l => ' - ' + l).join('\n') + '\n';
  for (const r of RECIPES) { const p = recipePage(r, lang, K); out += `\n## ${p.icon} ${p.title} (${p.id}, lvl ${p.lvl})\nNOTE: ${p.note}\nING: ${p.ingredients.join(' | ')}\n` + p.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n'; }
}
fs.writeFileSync(process.argv[2] || 'book.txt', out); console.log('pages dumped:', RECIPES.length * 2, 'chars', out.length);
