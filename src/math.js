/* Sinapse — geradores de exercícios de matemática (7 níveis).
   Cada gerador devolve { p: enunciado, x: expressão em HTML (opcional),
   a: resposta inteira  OU  o: [correta, errada, errada, errada], e: explicação }. */
(function (root) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function helpers(rng) {
    const int = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const nz = (a, b) => { let v; do { v = int(a, b); } while (v === 0); return v; };
    const shuffle = (arr) => {
      const c = arr.slice();
      for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [c[i], c[j]] = [c[j], c[i]];
      }
      return c;
    };
    return { int, pick, nz, shuffle, rng };
  }

  // ---------- formatação ----------
  const M = '−'; // sinal de menos tipográfico
  const n = (v) => (v < 0 ? M + Math.abs(v) : String(v));
  const par = (v) => (v < 0 ? '(' + n(v) + ')' : String(v));
  const sup = (v) => '<sup>' + v + '</sup>';
  const sub = (v) => '<sub>' + v + '</sub>';
  const pm = (v) => (v < 0 ? ' ' + M + ' ' : ' + ') + Math.abs(v);

  function poly(terms, x) {
    x = x || 'x';
    let out = '';
    terms.filter((t) => t[0] !== 0).forEach(function (t, i) {
      const c = t[0], e = t[1], a = Math.abs(c);
      const body = e === 0 ? String(a) : (a === 1 ? '' : a) + x + (e === 1 ? '' : sup(e));
      out += i === 0 ? (c < 0 ? M : '') + body : (c < 0 ? ' ' + M + ' ' : ' + ') + body;
    });
    return out || '0';
  }
  const lin = (a, b) => poly([[a, 1], [b, 0]]);

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
  function frac(p, q) {
    if (q < 0) { p = -p; q = -q; }
    const g = gcd(p, q) || 1;
    p /= g; q /= g;
    return q === 1 ? n(p) : n(p) + '/' + q;
  }
  function fact(k) { let r = 1; for (let i = 2; i <= k; i++) r *= i; return r; }
  function comb(nn, k) { let r = 1; for (let i = 1; i <= k; i++) r = (r * (nn - k + i)) / i; return Math.round(r); }
  function modpow(a, b, m) { let r = 1; a %= m; while (b > 0) { if (b & 1) r = (r * a) % m; a = (a * a) % m; b >>= 1; } return r; }
  function phi(v) { let r = 0; for (let i = 1; i <= v; i++) if (gcd(i, v) === 1) r++; return r; }

  function options(correct, wrongs) {
    const seen = new Set([String(correct)]);
    const o = [String(correct)];
    for (const w of wrongs) {
      const s = String(w);
      if (!seen.has(s)) { seen.add(s); o.push(s); }
      if (o.length === 4) break;
    }
    return o;
  }
  function matrix(rows) {
    const cells = rows.map((r) => r.map((v) => '<i>' + n(v) + '</i>').join('')).join('');
    return '<span class="mx" style="--n:' + rows.length + '">' + cells + '</span>';
  }
  const integral = (lo, hi, body) =>
    '<span class="int">∫<span class="lims"><sup>' + n(hi) + '</sup><sub>' + n(lo) + '</sub></span></span> ' + body + ' dx';
  const limit = (to, body) => 'lim' + sub('x→' + to) + ' ' + body;
  const cplx = (a, b) => n(a) + (b < 0 ? ' ' + M + ' ' : ' + ') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'i';

  const LEVELS = ['Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Especialista', 'Mestre', 'Lendário'];
  const SKILLS = {
    aritmetica: 'Aritmética',
    fracoes: 'Frações e porcentagem',
    algebra: 'Álgebra',
    geometria: 'Geometria e trigonometria',
    funcoes: 'Funções e sequências',
    contagem: 'Contagem e probabilidade',
    calculo: 'Cálculo',
    numeros: 'Teoria dos números',
    linear: 'Matrizes e complexos'
  };
  const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];

  const G = [];
  const add = (id, L, s, t, fast, g) => G.push({ id, L, s, t, fast, g });

  // ================= NÍVEL 1 — Iniciante =================
  add('soma1', 1, 'aritmetica', 'Soma até 20', true, (r) => {
    const a = r.int(1, 10), b = r.int(1, 10);
    return { p: 'Quanto é?', x: a + ' + ' + b, a: a + b, e: a + ' + ' + b + ' = ' + (a + b) + '.' };
  });
  add('sub1', 1, 'aritmetica', 'Subtração até 20', true, (r) => {
    const a = r.int(5, 20), b = r.int(1, a - 1);
    return { p: 'Quanto é?', x: a + ' ' + M + ' ' + b, a: a - b, e: a + ' ' + M + ' ' + b + ' = ' + (a - b) + '.' };
  });
  add('falta1', 1, 'algebra', 'Número que falta', true, (r) => {
    const a = r.int(1, 10), b = r.int(1, 10);
    return { p: 'Qual número completa a conta?', x: a + ' + ? = ' + (a + b), a: b, e: (a + b) + ' ' + M + ' ' + a + ' = ' + b + '.' };
  });
  add('dobro1', 1, 'aritmetica', 'Dobro e metade', true, (r) => {
    const v = r.int(2, 20);
    return r.rng() < 0.5
      ? { p: 'Qual é o dobro de ' + v + '?', a: 2 * v, e: 'Dobro é somar o número com ele mesmo: ' + v + ' + ' + v + ' = ' + 2 * v + '.' }
      : { p: 'Qual é a metade de ' + 2 * v + '?', a: v, e: v + ' + ' + v + ' = ' + 2 * v + ', então a metade é ' + v + '.' };
  });
  add('seq1', 1, 'funcoes', 'Sequências simples', false, (r) => {
    const s = r.int(1, 9), k = r.int(2, 5);
    const t = [0, 1, 2, 3].map((i) => s + i * k);
    return { p: 'Qual é o próximo número da sequência?', x: t.join(', ') + ', ?', a: s + 4 * k, e: 'A sequência soma ' + k + ' a cada passo: ' + t[3] + ' + ' + k + ' = ' + (s + 4 * k) + '.' };
  });

  // ================= NÍVEL 2 — Básico =================
  add('soma2', 2, 'aritmetica', 'Soma com dezenas', true, (r) => {
    const a = r.int(12, 99), b = r.int(12, 99);
    return { p: 'Quanto é?', x: a + ' + ' + b, a: a + b, e: a + ' + ' + b + ' = ' + (a + b) + '.' };
  });
  add('sub2', 2, 'aritmetica', 'Subtração com dezenas', true, (r) => {
    const a = r.int(30, 150), b = r.int(11, a - 1);
    return { p: 'Quanto é?', x: a + ' ' + M + ' ' + b, a: a - b, e: a + ' ' + M + ' ' + b + ' = ' + (a - b) + '.' };
  });
  add('mult2', 2, 'aritmetica', 'Tabuada', true, (r) => {
    const a = r.int(2, 10), b = r.int(2, 10);
    return { p: 'Quanto é?', x: a + ' × ' + b, a: a * b, e: a + ' × ' + b + ' = ' + a * b + '.' };
  });
  add('div2', 2, 'aritmetica', 'Divisão exata', true, (r) => {
    const b = r.int(2, 10), q = r.int(2, 12);
    return { p: 'Quanto é?', x: b * q + ' ÷ ' + b, a: q, e: b + ' × ' + q + ' = ' + b * q + ', então ' + b * q + ' ÷ ' + b + ' = ' + q + '.' };
  });
  add('mult2b', 2, 'aritmetica', 'Multiplicação por um dígito', true, (r) => {
    let a; do { a = r.int(11, 29); } while (a % 10 === 0);
    const b = r.int(2, 9);
    const d = Math.floor(a / 10) * 10, u = a % 10;
    return { p: 'Quanto é?', x: a + ' × ' + b, a: a * b, e: 'Separe em ' + d + ' × ' + b + ' + ' + u + ' × ' + b + ' = ' + d * b + ' + ' + u * b + ' = ' + a * b + '.' };
  });
  add('ret2', 2, 'geometria', 'Área e perímetro', false, (r) => {
    const a = r.int(3, 12), b = r.int(2, 9);
    return r.rng() < 0.5
      ? { p: 'Um retângulo tem lados de ' + a + ' cm e ' + b + ' cm. Qual é a área, em cm²?', a: a * b, e: 'Área do retângulo = base × altura = ' + a + ' × ' + b + ' = ' + a * b + ' cm².' }
      : { p: 'Um retângulo tem lados de ' + a + ' cm e ' + b + ' cm. Qual é o perímetro, em cm?', a: 2 * (a + b), e: 'Perímetro = 2 × (' + a + ' + ' + b + ') = ' + 2 * (a + b) + ' cm.' };
  });

  // ================= NÍVEL 3 — Intermediário =================
  add('ordem3', 3, 'aritmetica', 'Ordem das operações', true, (r) => {
    const a = r.int(2, 20), b = r.int(2, 9), c = r.int(2, 9), d = r.int(1, 10);
    const ans = a + b * c - d;
    return { p: 'Quanto é?', x: a + ' + ' + b + ' × ' + c + ' ' + M + ' ' + d, a: ans, e: 'Primeiro a multiplicação: ' + b + ' × ' + c + ' = ' + b * c + '. Depois ' + a + ' + ' + b * c + ' ' + M + ' ' + d + ' = ' + n(ans) + '.' };
  });
  add('neg3', 3, 'aritmetica', 'Números negativos', true, (r) => {
    const a = r.int(2, 15), b = r.int(2, 12), c = r.int(2, 15);
    const v = r.int(0, 3);
    if (v === 0) return { p: 'Quanto é?', x: M + a + ' + ' + b + ' ' + M + ' ' + c, a: -a + b - c, e: M + a + ' + ' + b + ' = ' + n(b - a) + '; depois ' + n(b - a) + ' ' + M + ' ' + c + ' = ' + n(b - a - c) + '.' };
    if (v === 1) return { p: 'Quanto é?', x: '(' + M + a + ') × ' + b, a: -a * b, e: 'Sinais diferentes dão resultado negativo: ' + n(-a * b) + '.' };
    if (v === 2) return { p: 'Quanto é?', x: '(' + M + a + ') × (' + M + b + ')', a: a * b, e: 'Sinais iguais dão resultado positivo: ' + a * b + '.' };
    return { p: 'Quanto é?', x: a + ' ' + M + ' (' + M + b + ')', a: a + b, e: 'Subtrair um negativo é somar: ' + a + ' + ' + b + ' = ' + (a + b) + '.' };
  });
  add('frac3', 3, 'fracoes', 'Fração de uma quantidade', true, (r) => {
    const d = r.int(2, 8), nu = r.int(1, d - 1), k = r.int(2, 12);
    return { p: 'Quanto é ' + nu + '/' + d + ' de ' + d * k + '?', a: nu * k, e: d * k + ' ÷ ' + d + ' = ' + k + '; vezes ' + nu + ' dá ' + nu * k + '.' };
  });
  add('perc3', 3, 'fracoes', 'Porcentagem', true, (r) => {
    const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 75]), v = 20 * r.int(1, 20);
    return { p: 'Quanto é ' + p + '% de ' + v + '?', a: (p * v) / 100, e: p + '% = ' + p + '/100. ' + v + ' × ' + p + ' ÷ 100 = ' + (p * v) / 100 + '.' };
  });
  add('pot3', 3, 'aritmetica', 'Potências', true, (r) => {
    const v = r.int(0, 2);
    if (v === 0) { const a = r.int(4, 15); return { p: 'Quanto é?', x: a + sup(2), a: a * a, e: a + ' × ' + a + ' = ' + a * a + '.' }; }
    if (v === 1) { const a = r.int(2, 6); return { p: 'Quanto é?', x: a + sup(3), a: a * a * a, e: a + ' × ' + a + ' × ' + a + ' = ' + a * a * a + '.' }; }
    const e = r.int(4, 10);
    return { p: 'Quanto é?', x: '2' + sup(e), a: Math.pow(2, e), e: 'Dobrando ' + e + ' vezes a partir de 1: ' + Math.pow(2, e) + '.' };
  });
  add('raiz3', 3, 'aritmetica', 'Raiz quadrada', true, (r) => {
    const k = r.int(4, 20);
    return { p: 'Quanto é?', x: '√' + k * k, a: k, e: k + ' × ' + k + ' = ' + k * k + ', então √' + k * k + ' = ' + k + '.' };
  });
  add('media3', 3, 'aritmetica', 'Média aritmética', false, (r) => {
    const m = r.int(10, 40), d = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
    d.push(-(d[0] + d[1] + d[2]));
    const v = d.map((x) => m + x);
    return { p: 'Qual é a média aritmética de ' + v.slice(0, 3).join(', ') + ' e ' + v[3] + '?', a: m, e: 'Soma = ' + 4 * m + '; dividida por 4 dá ' + m + '.' };
  });
  add('tri3', 3, 'geometria', 'Triângulos', false, (r) => {
    if (r.rng() < 0.5) {
      const b = 2 * r.int(2, 10), h = r.int(3, 12);
      return { p: 'Um triângulo tem base ' + b + ' cm e altura ' + h + ' cm. Qual é a área, em cm²?', a: (b * h) / 2, e: 'Área = base × altura ÷ 2 = ' + b + ' × ' + h + ' ÷ 2 = ' + (b * h) / 2 + ' cm².' };
    }
    const a = r.int(30, 80), b = r.int(20, 150 - a);
    return { p: 'Dois ângulos de um triângulo medem ' + a + '° e ' + b + '°. Quanto mede o terceiro, em graus?', a: 180 - a - b, e: 'Os ângulos internos somam 180°: 180 ' + M + ' ' + a + ' ' + M + ' ' + b + ' = ' + (180 - a - b) + '°.' };
  });

  // ================= NÍVEL 4 — Avançado =================
  add('eq4', 4, 'algebra', 'Equação do 1º grau', true, (r) => {
    const a = r.int(2, 9), x = r.nz(-9, 12), b = r.nz(-20, 20), c = a * x + b;
    return { p: 'Resolva. Quanto vale x?', x: lin(a, b) + ' = ' + n(c), a: x, e: a + 'x = ' + n(c) + (b < 0 ? ' + ' : ' ' + M + ' ') + Math.abs(b) + ' = ' + n(c - b) + ', então x = ' + n(x) + '.' };
  });
  add('eq4b', 4, 'algebra', 'Equação com x dos dois lados', false, (r) => {
    const a = r.int(4, 9), c = r.int(1, a - 2), x = r.nz(-8, 10), b = r.nz(-15, 15), d = (a - c) * x + b;
    return { p: 'Resolva. Quanto vale x?', x: lin(a, b) + ' = ' + lin(c, d), a: x, e: 'Juntando os termos: ' + (a - c) + 'x = ' + n(d - b) + ', então x = ' + n(x) + '.' };
  });
  add('prop4', 4, 'fracoes', 'Regra de três', false, (r) => {
    const u = r.int(2, 15), n1 = r.int(2, 9);
    let n2; do { n2 = r.int(3, 15); } while (n2 === n1);
    return { p: 'Se ' + n1 + ' ingressos custam R$ ' + u * n1 + ', quanto custam ' + n2 + ' ingressos, em reais?', a: u * n2, e: 'Cada ingresso custa ' + u * n1 + ' ÷ ' + n1 + ' = R$ ' + u + '. Então ' + n2 + ' × ' + u + ' = R$ ' + u * n2 + '.' };
  });
  add('mmc4', 4, 'numeros', 'MMC e MDC', false, (r) => {
    const g = r.int(2, 6);
    let m, k; do { m = r.int(2, 7); k = r.int(2, 7); } while (m === k || gcd(m, k) !== 1);
    const a = g * m, b = g * k;
    return r.rng() < 0.5
      ? { p: 'Qual é o MMC de ' + a + ' e ' + b + '?', a: g * m * k, e: 'MDC = ' + g + '. MMC = ' + a + ' × ' + b + ' ÷ ' + g + ' = ' + g * m * k + '.' }
      : { p: 'Qual é o MDC de ' + a + ' e ' + b + '?', a: g, e: a + ' = ' + g + ' × ' + m + ' e ' + b + ' = ' + g + ' × ' + k + '; ' + m + ' e ' + k + ' não têm fator comum.' };
  });
  add('pit4', 4, 'geometria', 'Teorema de Pitágoras', false, (r) => {
    const t = r.pick(TRIPLES), k = r.int(1, 3), a = t[0] * k, b = t[1] * k, c = t[2] * k;
    return r.rng() < 0.6
      ? { p: 'Os catetos de um triângulo retângulo medem ' + a + ' e ' + b + '. Quanto mede a hipotenusa?', a: c, e: a + '² + ' + b + '² = ' + (a * a + b * b) + ' = ' + c + '².' }
      : { p: 'A hipotenusa de um triângulo retângulo mede ' + c + ' e um cateto mede ' + a + '. Quanto mede o outro cateto?', a: b, e: c + '² ' + M + ' ' + a + '² = ' + (c * c - a * a) + ' = ' + b + '².' };
  });
  add('sist4', 4, 'algebra', 'Sistema de equações', false, (r) => {
    const x = r.int(-5, 15), y = r.int(-5, 15);
    return { p: 'No sistema abaixo, quanto vale x?', x: 'x + y = ' + n(x + y) + '<br>x ' + M + ' y = ' + n(x - y), a: x, e: 'Somando as duas equações: 2x = ' + n(2 * x) + ', então x = ' + n(x) + ' (e y = ' + n(y) + ').' };
  });
  add('fsoma4', 4, 'fracoes', 'Soma de frações', false, (r) => {
    let b, d; do { b = r.int(2, 8); d = r.int(2, 8); } while (b === d);
    const a = r.int(1, b - 1), c = r.int(1, d - 1), num = a * d + c * b, den = b * d;
    return {
      p: 'Quanto é? Dê a resposta simplificada.', x: a + '/' + b + ' + ' + c + '/' + d,
      o: options(frac(num, den), [frac(a + c, b + d), frac(a * c, den), frac(a + c, den), frac(num, b + d), frac(num + 1, den), frac(num - 1, den), frac(num + 2, den)]),
      e: 'Denominador comum ' + den + ': ' + a * d + '/' + den + ' + ' + c * b + '/' + den + ' = ' + num + '/' + den + (frac(num, den) !== num + '/' + den ? ' = ' + frac(num, den) : '') + '.'
    };
  });
  add('pvar4', 4, 'fracoes', 'Aumentos e descontos', false, (r) => {
    const P = 20 * r.int(2, 40), p = r.pick([5, 10, 15, 20, 25, 30, 40, 50]), up = r.rng() < 0.5;
    const delta = (P * p) / 100, ans = up ? P + delta : P - delta;
    return { p: 'Um produto de R$ ' + P + ' teve ' + (up ? 'aumento' : 'desconto') + ' de ' + p + '%. Qual é o novo preço, em reais?', a: ans, e: p + '% de ' + P + ' = ' + delta + '. ' + P + (up ? ' + ' : ' ' + M + ' ') + delta + ' = ' + ans + '.' };
  });

  // ================= NÍVEL 5 — Especialista =================
  add('quad5', 5, 'algebra', 'Equação do 2º grau', false, (r) => {
    let r1, r2; do { r1 = r.nz(-9, 9); r2 = r.nz(-9, 9); } while (r1 === r2);
    const S = r1 + r2, P = r1 * r2, lo = Math.min(r1, r2), hi = Math.max(r1, r2);
    return { p: 'Qual é a maior raiz da equação?', x: poly([[1, 2], [-S, 1], [P, 0]]) + ' = 0', a: hi, e: 'As raízes somam ' + n(S) + ' e têm produto ' + n(P) + ': são ' + n(lo) + ' e ' + n(hi) + '.' };
  });
  add('log5', 5, 'funcoes', 'Logaritmos', true, (r) => {
    const b = r.pick([2, 3, 5, 10]);
    const k = b === 2 ? r.int(3, 10) : b === 3 ? r.int(2, 5) : b === 5 ? r.int(2, 4) : r.int(2, 6);
    return { p: 'Quanto vale?', x: 'log' + sub(b) + ' ' + Math.pow(b, k), a: k, e: b + sup(k) + ' = ' + Math.pow(b, k) + ', então o logaritmo é ' + k + '.' };
  });
  add('pa5', 5, 'funcoes', 'Progressão aritmética', false, (r) => {
    const a1 = r.int(-10, 20), q = r.nz(-6, 9);
    if (r.rng() < 0.5) {
      const k = r.int(8, 30);
      return { p: 'Numa PA de primeiro termo ' + n(a1) + ' e razão ' + n(q) + ', qual é o ' + k + 'º termo?', a: a1 + (k - 1) * q, e: 'aₙ = a₁ + (n ' + M + ' 1)·r = ' + n(a1) + ' + ' + (k - 1) + ' × ' + par(q) + ' = ' + n(a1 + (k - 1) * q) + '.' };
    }
    const k = r.int(5, 20), last = a1 + (k - 1) * q;
    return { p: 'Numa PA de primeiro termo ' + n(a1) + ' e razão ' + n(q) + ', qual é a soma dos ' + k + ' primeiros termos?', a: (k * (a1 + last)) / 2, e: 'O ' + k + 'º termo é ' + n(last) + '. Soma = ' + k + ' × (' + n(a1) + ' + ' + par(last) + ') ÷ 2 = ' + n((k * (a1 + last)) / 2) + '.' };
  });
  add('pg5', 5, 'funcoes', 'Progressão geométrica', false, (r) => {
    const a1 = r.int(1, 5), q = r.pick([2, 3, -2]), k = r.int(4, 8), ans = a1 * Math.pow(q, k - 1);
    return { p: 'Numa PG de primeiro termo ' + a1 + ' e razão ' + n(q) + ', qual é o ' + k + 'º termo?', a: ans, e: 'aₙ = a₁ · q' + sup('n' + M + '1') + ' = ' + a1 + ' × ' + par(q) + sup(k - 1) + ' = ' + n(ans) + '.' };
  });
  add('comb5', 5, 'contagem', 'Combinações e anagramas', false, (r) => {
    if (r.rng() < 0.5) {
      const k = r.int(2, 4), nn = r.int(k + 2, 10);
      return { p: 'De quantas maneiras se pode formar uma comissão de ' + k + ' pessoas escolhidas entre ' + nn + '?', a: comb(nn, k), e: 'A ordem não importa: C(' + nn + ', ' + k + ') = ' + nn + '! ÷ (' + k + '! × ' + (nn - k) + '!) = ' + comb(nn, k) + '.' };
    }
    const w = r.pick(['AMOR', 'LIVRO', 'ESCOLA', 'CASA', 'ARARA', 'BANANA', 'PORTA', 'MACACO', 'TERRA', 'NUMERO']);
    const cnt = {}; for (const ch of w) cnt[ch] = (cnt[ch] || 0) + 1;
    const reps = Object.keys(cnt).filter((c) => cnt[c] > 1);
    let ans = fact(w.length); reps.forEach((c) => { ans /= fact(cnt[c]); });
    return { p: 'Quantos anagramas tem a palavra ' + w + '?', a: ans, e: reps.length ? w.length + '! dividido pelas repetições (' + reps.map((c) => c + ' aparece ' + cnt[c] + '×').join(', ') + ') = ' + ans + '.' : 'As ' + w.length + ' letras são diferentes: ' + w.length + '! = ' + ans + '.' };
  });
  add('fun5', 5, 'funcoes', 'Função quadrática', false, (r) => {
    if (r.rng() < 0.5) {
      const a = r.nz(-3, 4), b = r.int(-6, 6), c = r.int(-9, 9), k = r.nz(-4, 5), ans = a * k * k + b * k + c;
      return { p: 'Calcule f(' + n(k) + ').', x: 'f(x) = ' + poly([[a, 2], [b, 1], [c, 0]]), a: ans, e: 'f(' + n(k) + ') = ' + par(a) + ' × ' + k * k + pm(b * k) + pm(c) + ' = ' + n(ans) + '.' };
    }
    const h = r.nz(-6, 6), kk = r.int(-9, 12);
    return { p: 'Qual é o valor mínimo da função?', x: 'f(x) = ' + poly([[1, 2], [-2 * h, 1], [h * h + kk, 0]]), a: kk, e: 'Completando o quadrado: f(x) = (x' + pm(-h) + ')² ' + (kk < 0 ? M : '+') + ' ' + Math.abs(kk) + '. O mínimo ocorre em x = ' + n(h) + ' e vale ' + n(kk) + '.' };
  });
  add('trig5', 5, 'geometria', 'Ângulos notáveis', false, (r) => {
    const T = {
      sen: { 0: '0', 30: '1/2', 45: '√2/2', 60: '√3/2', 90: '1' },
      cos: { 0: '1', 30: '√3/2', 45: '√2/2', 60: '1/2', 90: '0' },
      tg: { 0: '0', 30: '√3/3', 45: '1', 60: '√3' }
    };
    const f = r.pick(['sen', 'cos', 'tg']), ang = Number(r.pick(Object.keys(T[f]))), ok = T[f][ang];
    return { p: 'Quanto vale?', x: f + ' ' + ang + '°', o: options(ok, r.shuffle(['0', '1/2', '√2/2', '√3/2', '1', '√3/3', '√3'])), e: 'Valor notável: ' + f + ' ' + ang + '° = ' + ok + '.' };
  });
  add('exp5', 5, 'algebra', 'Equação exponencial', true, (r) => {
    const b = r.pick([2, 3, 5]), k = b === 2 ? r.int(3, 10) : b === 3 ? r.int(2, 5) : r.int(2, 4);
    if (r.rng() < 0.5) return { p: 'Resolva. Quanto vale x?', x: b + sup('x') + ' = ' + Math.pow(b, k), a: k, e: Math.pow(b, k) + ' = ' + b + sup(k) + ', então x = ' + k + '.' };
    const c = r.nz(-3, 3);
    return { p: 'Resolva. Quanto vale x?', x: b + sup('x' + pm(c)) + ' = ' + Math.pow(b, k), a: k - c, e: Math.pow(b, k) + ' = ' + b + sup(k) + ', então x' + pm(c) + ' = ' + k + ' e x = ' + n(k - c) + '.' };
  });
  add('prob5', 5, 'contagem', 'Probabilidade', false, (r) => {
    const s = r.int(2, 12), c = 6 - Math.abs(7 - s);
    const others = r.shuffle([1, 2, 3, 4, 5, 6].map((v) => frac(v, 36))).concat(['1/11', '1/8']);
    return { p: 'Lançando dois dados comuns, qual é a probabilidade de a soma ser ' + s + '?', o: options(frac(c, 36), others), e: 'Há ' + c + ' resultado' + (c > 1 ? 's' : '') + ' favoráve' + (c > 1 ? 'is' : 'l') + ' entre 36 possíveis: ' + c + '/36' + (frac(c, 36) !== c + '/36' ? ' = ' + frac(c, 36) : '') + '.' };
  });

  // ================= NÍVEL 6 — Mestre =================
  add('der6', 6, 'calculo', 'Derivada de polinômio', false, (r) => {
    const a = r.int(1, 4), b = r.int(-5, 5), c = r.int(-9, 9), d = r.int(-9, 9), k = r.int(-2, 3);
    const ans = 3 * a * k * k + 2 * b * k + c;
    return { p: 'Calcule f′(' + n(k) + ').', x: 'f(x) = ' + poly([[a, 3], [b, 2], [c, 1], [d, 0]]), a: ans, e: 'f′(x) = ' + poly([[3 * a, 2], [2 * b, 1], [c, 0]]) + '. Em x = ' + n(k) + ': ' + n(ans) + '.' };
  });
  add('int6', 6, 'calculo', 'Integral definida', false, (r) => {
    if (r.rng() < 0.6) {
      const a = r.int(1, 5), b = r.int(-4, 6), k = r.int(1, 5), ans = a * k * k + b * k;
      return { p: 'Calcule a integral.', x: integral(0, k, '(' + lin(2 * a, b) + ')'), a: ans, e: 'Primitiva: ' + poly([[a, 2], [b, 1]]) + '. Avaliando de 0 a ' + k + ': ' + n(ans) + '.' };
    }
    const a = r.int(1, 4), k = r.int(1, 4);
    return { p: 'Calcule a integral.', x: integral(0, k, 3 * a + 'x' + sup(2)), a: a * k * k * k, e: 'Primitiva: ' + poly([[a, 3]]) + '. Avaliando de 0 a ' + k + ': ' + a * k * k * k + '.' };
  });
  add('lim6', 6, 'calculo', 'Limites', false, (r) => {
    if (r.rng() < 0.5) {
      const a = r.int(2, 12);
      return { p: 'Calcule o limite.', x: limit(a, '(x' + sup(2) + ' ' + M + ' ' + a * a + ') / (x ' + M + ' ' + a + ')'), a: 2 * a, e: 'Fatorando: x² ' + M + ' ' + a * a + ' = (x ' + M + ' ' + a + ')(x + ' + a + '). Simplificando, sobra x + ' + a + ' → ' + 2 * a + '.' };
    }
    const b = r.int(1, 4), q = r.int(2, 6), c = r.nz(-9, 9), d = r.nz(-9, 9);
    return { p: 'Calcule o limite.', x: limit('∞', '(' + poly([[b * q, 2], [c, 1], [d, 0]]) + ') / (' + poly([[b, 2], [d, 0]]) + ')'), a: q, e: 'Graus iguais: o limite é a razão dos coeficientes líderes, ' + b * q + ' ÷ ' + b + ' = ' + q + '.' };
  });
  add('det6', 6, 'linear', 'Determinante 2×2', false, (r) => {
    const a = r.int(-6, 9), b = r.int(-6, 9), c = r.int(-6, 9), d = r.int(-6, 9);
    return { p: 'Calcule o determinante.', x: matrix([[a, b], [c, d]]), a: a * d - b * c, e: 'ad ' + M + ' bc = ' + par(a) + ' × ' + par(d) + ' ' + M + ' ' + par(b) + ' × ' + par(c) + ' = ' + n(a * d - b * c) + '.' };
  });
  add('mod6', 6, 'numeros', 'Aritmética modular', false, (r) => {
    const m = r.pick([5, 7, 11, 13]);
    let a; do { a = r.int(2, 9); } while (a % m === 0);
    const b = r.int(11, 60), ans = modpow(a, b, m), q = Math.floor(b / (m - 1)), rest = b % (m - 1);
    return { p: 'Qual é o resto da divisão por ' + m + '?', x: a + sup(b), a: ans, e: 'Por Fermat, ' + a + sup(m - 1) + ' ≡ 1 (mod ' + m + '). Como ' + b + ' = ' + (m - 1) + ' × ' + q + ' + ' + rest + ', sobra ' + a + sup(rest) + ' ≡ ' + ans + '.' };
  });
  add('cplx6', 6, 'linear', 'Números complexos', false, (r) => {
    if (r.rng() < 0.4) {
      const t = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10]]), sa = r.pick([1, -1]), sb = r.pick([1, -1]);
      return { p: 'Qual é o módulo do número complexo?', x: 'z = ' + cplx(sa * t[0], sb * t[1]), a: t[2], e: '|z| = √(' + t[0] + '² + ' + t[1] + '²) = √' + t[2] * t[2] + ' = ' + t[2] + '.' };
    }
    const a = r.nz(-5, 6), b = r.nz(-5, 6), c = r.nz(-5, 6), d = r.nz(-5, 6);
    return { p: 'Qual é a parte real do produto?', x: '(' + cplx(a, b) + ')(' + cplx(c, d) + ')', a: a * c - b * d, e: 'Como i² = ' + M + '1, a parte real é ac ' + M + ' bd = ' + n(a * c) + ' ' + M + ' ' + par(b * d) + ' = ' + n(a * c - b * d) + '.' };
  });
  add('pginf6', 6, 'funcoes', 'Soma de PG infinita', false, (r) => {
    const q = r.pick([2, 3, 4, 5]), a = (q - 1) * r.int(1, 8), ans = (a * q) / (q - 1);
    return { p: 'Qual é a soma da PG infinita de primeiro termo ' + a + ' e razão 1/' + q + '?', a: ans, e: 'S = a₁ ÷ (1 ' + M + ' q) = ' + a + ' ÷ (' + (q - 1) + '/' + q + ') = ' + ans + '.' };
  });
  add('binom6', 6, 'contagem', 'Binômio de Newton', false, (r) => {
    const nn = r.int(4, 6), k = r.int(1, nn - 1), a = r.int(2, 3), ans = comb(nn, k) * Math.pow(a, nn - k);
    return { p: 'Qual é o coeficiente de x' + sup(k) + ' no desenvolvimento?', x: '(x + ' + a + ')' + sup(nn), a: ans, e: 'Termo geral: C(' + nn + ', ' + k + ') · x' + sup(k) + ' · ' + a + sup(nn - k) + ' = ' + comb(nn, k) + ' × ' + Math.pow(a, nn - k) + ' = ' + ans + '.' };
  });

  // ================= NÍVEL 7 — Lendário =================
  add('det7', 7, 'linear', 'Determinante 3×3', false, (r) => {
    const m = [0, 1, 2].map(() => [r.int(-4, 5), r.int(-4, 5), r.int(-4, 5)]);
    const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
    const c1 = e * i - f * h, c2 = d * i - f * g, c3 = d * h - e * g, ans = a * c1 - b * c2 + c * c3;
    return { p: 'Calcule o determinante.', x: matrix(m), a: ans, e: 'Cofatores na 1ª linha: ' + par(a) + ' × ' + par(c1) + ' ' + M + ' ' + par(b) + ' × ' + par(c2) + ' + ' + par(c) + ' × ' + par(c3) + ' = ' + n(ans) + '.' };
  });
  add('cadeia7', 7, 'calculo', 'Regra da cadeia', false, (r) => {
    const a = r.int(2, 3), nn = r.int(3, 4), v = r.nz(-3, 3), k = r.int(-2, 2), b = v - a * k;
    const ans = nn * a * Math.pow(v, nn - 1);
    return { p: 'Calcule f′(' + n(k) + ').', x: 'f(x) = (' + lin(a, b) + ')' + sup(nn), a: ans, e: 'f′(x) = ' + nn + ' × ' + a + ' × (' + lin(a, b) + ')' + sup(nn - 1) + '. Em x = ' + n(k) + ' o parêntese vale ' + n(v) + ': ' + n(ans) + '.' };
  });
  add('prod7', 7, 'calculo', 'Regra do produto', false, (r) => {
    const a = r.int(1, 5), b = r.int(1, 4), c = r.nz(-4, 4), k = r.int(-2, 3);
    const ans = 2 * k * (b * k + c) + b * (k * k + a);
    return { p: 'Calcule f′(' + n(k) + ').', x: 'f(x) = (x' + sup(2) + ' + ' + a + ')(' + lin(b, c) + ')', a: ans, e: 'f′(x) = 2x(' + lin(b, c) + ') + ' + b + '(x² + ' + a + '). Em x = ' + n(k) + ': ' + n(2 * k * (b * k + c)) + ' + ' + par(b * (k * k + a)) + ' = ' + n(ans) + '.' };
  });
  add('int7', 7, 'calculo', 'Integral de polinômio', false, (r) => {
    const p = r.int(1, 3), q = r.int(-3, 4), c = r.int(-5, 6), lo = r.int(1, 2), hi = lo + r.int(1, 2);
    const F = (x) => p * x * x * x + q * x * x + c * x, ans = F(hi) - F(lo);
    return { p: 'Calcule a integral.', x: integral(lo, hi, '(' + poly([[3 * p, 2], [2 * q, 1], [c, 0]]) + ')'), a: ans, e: 'Primitiva F(x) = ' + poly([[p, 3], [q, 2], [c, 1]]) + '. F(' + hi + ') ' + M + ' F(' + lo + ') = ' + n(F(hi)) + ' ' + M + ' ' + par(F(lo)) + ' = ' + n(ans) + '.' };
  });
  add('lim7', 7, 'calculo', 'Limites fundamentais', false, (r) => {
    const v = r.int(0, 2);
    if (v === 0) {
      const b = r.int(1, 4), q = r.int(2, 6);
      return { p: 'Calcule o limite.', x: limit(0, 'sen(' + b * q + 'x) / ' + (b === 1 ? '' : b) + 'x'), a: q, e: 'Como sen(u)/u → 1 quando u → 0, o limite é ' + b * q + ' ÷ ' + b + ' = ' + q + '.' };
    }
    if (v === 1) {
      const a = r.int(2, 9);
      return { p: 'Calcule o limite.', x: limit(0, '(e' + sup(a + 'x') + ' ' + M + ' 1) / x'), a: a, e: 'É a derivada de e' + sup(a + 'x') + ' em x = 0, que vale ' + a + '.' };
    }
    const a = 2 * r.int(1, 4);
    return { p: 'Calcule o limite.', x: limit(0, '(1 ' + M + ' cos(' + a + 'x)) / x' + sup(2)), a: (a * a) / 2, e: '1 ' + M + ' cos(u) ≈ u²/2 perto de zero. Com u = ' + a + 'x: ' + a + '² ÷ 2 = ' + (a * a) / 2 + '.' };
  });
  add('inv7', 7, 'numeros', 'Inverso modular', false, (r) => {
    const p = r.pick([11, 13, 17, 19, 23]), a = r.int(2, p - 2);
    let x = 1; while ((a * x) % p !== 1) x++;
    return { p: 'Qual inteiro x, entre 1 e ' + (p - 1) + ', satisfaz a congruência?', x: a + 'x ≡ 1 (mod ' + p + ')', a: x, e: a + ' × ' + x + ' = ' + a * x + ' = ' + p + ' × ' + Math.floor((a * x) / p) + ' + 1.' };
  });
  add('phi7', 7, 'numeros', 'Função φ de Euler', false, (r) => {
    const v = r.pick([12, 18, 20, 24, 30, 36, 40, 45, 48, 60, 72, 84, 90, 100, 105, 120]);
    const ps = []; let t = v; for (let p = 2; p <= t; p++) { if (t % p === 0) { ps.push(p); while (t % p === 0) t /= p; } }
    return { p: 'Quantos inteiros de 1 a ' + v + ' são primos com ' + v + '?', x: 'φ(' + v + ')', a: phi(v), e: 'φ(n) = n × ∏(1 ' + M + ' 1/p) sobre os primos ' + ps.join(', ') + ': ' + v + ' × ' + ps.map((p) => (p - 1) + '/' + p).join(' × ') + ' = ' + phi(v) + '.' };
  });
  add('ult7', 7, 'numeros', 'Potências módulo 100', false, (r) => {
    const a = r.pick([3, 7, 9, 11, 13, 17]), b = r.int(12, 99), ans = modpow(a, b, 100);
    return { p: 'Qual é o resto da divisão por 100?', x: a + sup(b), a: ans, e: 'Como mdc(' + a + ', 100) = 1, vale ' + a + sup(20) + ' ≡ 1 (mod 100). Reduzindo o expoente: ' + b + ' mod 20 = ' + (b % 20) + ', e ' + a + sup(b % 20) + ' ≡ ' + ans + '.' };
  });
  add('auto7', 7, 'linear', 'Autovalores', false, (r) => {
    const m = r.int(1, 2);
    let l1, l2; do { l1 = r.nz(-4, 6); l2 = r.nz(-4, 6); } while (l1 === l2);
    const A = [[l1 * (m + 1) - m * l2, l2 - l1], [m * (m + 1) * (l1 - l2), (m + 1) * l2 - m * l1]];
    return { p: 'Qual é o maior autovalor da matriz?', x: matrix(A), a: Math.max(l1, l2), e: 'Traço = ' + n(l1 + l2) + ' e determinante = ' + n(l1 * l2) + ': λ² ' + (l1 + l2 < 0 ? '+' : M) + ' ' + Math.abs(l1 + l2) + 'λ ' + (l1 * l2 < 0 ? M : '+') + ' ' + Math.abs(l1 * l2) + ' = 0, com raízes ' + n(Math.min(l1, l2)) + ' e ' + n(Math.max(l1, l2)) + '.', _m: A };
  });
  add('soma7', 7, 'funcoes', 'Somatórios', false, (r) => {
    if (r.rng() < 0.5) {
      const k = r.int(5, 15), ans = (k * (k + 1) * (2 * k + 1)) / 6;
      return { p: 'Quanto vale a soma dos quadrados?', x: '1' + sup(2) + ' + 2' + sup(2) + ' + … + ' + k + sup(2), a: ans, e: 'n(n + 1)(2n + 1) ÷ 6 = ' + k + ' × ' + (k + 1) + ' × ' + (2 * k + 1) + ' ÷ 6 = ' + ans + '.' };
    }
    const k = r.int(4, 10), t = (k * (k + 1)) / 2;
    return { p: 'Quanto vale a soma dos cubos?', x: '1' + sup(3) + ' + 2' + sup(3) + ' + … + ' + k + sup(3), a: t * t, e: 'A soma dos cubos é o quadrado da soma 1 + … + n: ' + t + '² = ' + t * t + '.' };
  });
  add('conta7', 7, 'contagem', 'Contagem avançada', false, (r) => {
    const v = r.int(0, 2);
    if (v === 0) { const k = r.int(5, 15); return { p: 'Quantas soluções inteiras não negativas tem a equação?', x: 'x + y + z = ' + k, a: comb(k + 2, 2), e: 'Barras e estrelas: C(' + k + ' + 2, 2) = C(' + (k + 2) + ', 2) = ' + comb(k + 2, 2) + '.' }; }
    if (v === 1) { const k = r.int(4, 9); return { p: 'Quantas soluções inteiras não negativas tem a equação?', x: 'x + y + z + w = ' + k, a: comb(k + 3, 3), e: 'Barras e estrelas: C(' + k + ' + 3, 3) = C(' + (k + 3) + ', 3) = ' + comb(k + 3, 3) + '.' }; }
    const k = r.pick([4, 5, 6]), D = { 4: 9, 5: 44, 6: 265 }[k];
    return { p: 'De quantas maneiras ' + k + ' pessoas podem sortear um amigo-secreto sem que ninguém tire o próprio nome?', a: D, e: 'São os desarranjos: D(n) = (n ' + M + ' 1)·(D(n ' + M + ' 1) + D(n ' + M + ' 2)), com D(2) = 1 e D(3) = 2. D(' + k + ') = ' + D + '.' };
  });

  const BY_ID = {};
  G.forEach((g) => { BY_ID[g.id] = g; });

  function make(id, rng) {
    const g = BY_ID[id];
    const q = g.g(helpers(rng));
    q.gen = id; q.L = g.L; q.s = g.s;
    return q;
  }

  const api = { G, BY_ID, LEVELS, SKILLS, mulberry32, make, gcd };
  root.SinapseMath = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
