/* Verifica a estrutura de todos os geradores e reconfere algumas respostas por outro caminho. */
'use strict';
const assert = require('assert');
const SM = require('../src/math.js');

let total = 0;
const perLevel = {};
for (const g of SM.G) {
  perLevel[g.L] = (perLevel[g.L] || 0) + 1;
  assert.ok(SM.SKILLS[g.s], g.id + ': tema desconhecido ' + g.s);
  assert.ok(SM.TIPS[g.id] && !/undefined|NaN/.test(SM.TIPS[g.id]), g.id + ': sem dica');
  for (let seed = 1; seed <= 400; seed++) {
    const q = SM.make(g.id, SM.mulberry32(seed * 7919 + g.id.length));
    total++;
    assert.ok(q.p && typeof q.p === 'string', g.id + ': sem enunciado');
    assert.ok(q.e && typeof q.e === 'string', g.id + ': sem explicação');
    assert.ok(!/NaN|undefined|Infinity/.test(q.p + (q.x || '') + q.e), g.id + ': texto inválido: ' + q.p + ' | ' + q.x + ' | ' + q.e);
    if (q.o) {
      assert.strictEqual(q.o.length, 4, g.id + ': precisa de 4 opções, veio ' + JSON.stringify(q.o));
      assert.strictEqual(new Set(q.o).size, 4, g.id + ': opções repetidas ' + JSON.stringify(q.o));
    } else {
      assert.ok(Number.isInteger(q.a), g.id + ': resposta não inteira ' + q.a + ' em ' + q.p + ' ' + q.x);
      assert.ok(Math.abs(q.a) < 1e7, g.id + ': resposta grande demais ' + q.a);
    }
    if (g.id === 'auto7') {
      const [[a, b], [c, d]] = q._m;
      const tr = a + d, det = a * d - b * c;
      assert.strictEqual(q.a * q.a - tr * q.a + det, 0, 'auto7: resposta não é autovalor');
      const other = tr - q.a;
      assert.ok(other < q.a, 'auto7: não é o maior autovalor');
    }
  }
}
for (let L = 1; L <= 7; L++) assert.ok(perLevel[L] >= 5, 'nível ' + L + ' com poucos geradores');

if (process.argv.includes('--amostra')) {
  for (const g of SM.G) {
    const q = SM.make(g.id, SM.mulberry32(42));
    console.log('[' + g.L + '] ' + g.id + ' :: ' + q.p + (q.x ? ' :: ' + q.x : '') + ' => ' + (q.o ? q.o.join(' | ') : q.a) + '\n      ' + q.e);
  }
}
console.log('ok — ' + SM.G.length + ' geradores, ' + total + ' exercícios verificados', perLevel);
