/* Junta estilos, banco de perguntas e scripts em um único HTML.
   Uso: node build.js [caminho-do-fragmento]
   Gera index.html (abre direto no navegador) e, se pedido, um fragmento sem <html>/<body>. */
'use strict';
const fs = require('fs');
const path = require('path');
const here = (p) => path.join(__dirname, p);
const read = (p) => fs.readFileSync(here(p), 'utf8');

function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }

const bank = [];
const ids = new Set();
for (const f of fs.readdirSync(here('data')).filter((n) => n.endsWith('.json')).sort()) {
  for (const q of JSON.parse(read('data/' + f))) {
    if (!q.c || !q.q || !Array.isArray(q.o) || q.o.length !== 4 || new Set(q.o).size !== 4 || !(q.d >= 1 && q.d <= 5)) throw new Error('Pergunta inválida em ' + f + ': ' + JSON.stringify(q));
    const id = hash(q.q);
    if (ids.has(id)) throw new Error('Pergunta repetida: ' + q.q);
    ids.add(id);
    bank.push({ id, c: q.c, d: q.d, q: q.q, o: q.o, e: q.e || '' });
  }
}
const safe = (js) => js.replace(/<\/(script)/gi, '<\\/$1');
const fragment = [
  '<title>Sinapse</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap">',
  '<style>' + read('src/styles.css') + '</style>',
  '<header class="wrap"><div class="top-in"><a class="logo" href="#treinar">Sinap<span>se</span></a>' +
    '<nav class="tabs" aria-label="Seções"><a href="#treinar" data-tab="treinar">Treinar</a><a href="#progresso" data-tab="progresso">Progresso</a></nav>' +
    '<div class="chips" id="chips"></div></div></header>',
  '<main class="wrap" id="app"></main>',
  '<script>window.SINAPSE_BANK=' + safe(JSON.stringify(bank)) + ';</script>',
  '<script>' + safe(read('src/math.js')) + '</script>',
  '<script>' + safe(read('src/app.js')) + '</script>'
].join('\n');

fs.writeFileSync(here('index.html'), '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n' + fragment + '\n</body>\n</html>\n');
if (process.argv[2]) fs.writeFileSync(process.argv[2], fragment);
console.log('ok — ' + bank.length + ' perguntas, index.html com ' + Math.round(fs.statSync(here('index.html')).size / 1024) + ' KB');
