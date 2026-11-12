/* Sinapse — interface, sessões de treino e progresso. */
(function () {
  'use strict';
  const SM = window.SinapseMath;
  const BANK = window.SINAPSE_BANK || [];
  const BANK_ID = {};
  BANK.forEach((q) => { BANK_ID[q.id] = q; });
  const CATS = { ciencias: 'Ciências', tecnologia: 'Tecnologia', historia: 'História', geografia: 'Geografia', artes: 'Artes e literatura', cultura: 'Cultura e esportes' };
  const LV = SM.LEVELS;
  const KEY = 'sinapse.v1';
  const TRACK = { math: 'Matemática', gk: 'Conhecimentos gerais', misto: 'Misto' };
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (v) => (v < 0 ? '−' + Math.abs(v) : String(v));

  // ---------- estado salvo no navegador ----------
  function fresh() {
    return { v: 1, start: null, r: { math: 300, gk: 300 }, cnt: { math: 0, gk: 0 }, hist: { math: [], gk: [] }, xp: 0, skills: {}, seen: {}, review: [], days: {}, best: { sprint: 0, combo: 0 }, daily: null, ach: {}, total: { n: 0, ok: 0, sessions: 0, perfect: 0 }, flags: {}, sound: true, track: 'misto' };
  }
  let S = fresh();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && raw.v === 1) S = Object.assign(fresh(), raw);
  } catch (e) { /* sem armazenamento: o app funciona, só não lembra */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* idem */ } }

  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function streak() {
    const d = new Date(); let n = 0;
    if (!S.days[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (S.days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const band = (r) => Math.min(6, Math.floor(r / 400));
  const xpLevel = () => Math.floor(Math.sqrt(S.xp / 50)) + 1;
  const mathQR = (L) => 200 + 400 * (L - 1);
  const gkQR = (d) => 300 + 450 * (d - 1);

  function rate(track, qr, ok) {
    const r = S.r[track], exp = 1 / (1 + Math.pow(10, (qr - r) / 400)), k = S.cnt[track] < 30 ? 64 : 32;
    const nr = clamp(Math.round(r + k * ((ok ? 1 : 0) - exp)), 0, 3000);
    S.r[track] = nr; S.cnt[track]++;
    return nr - r;
  }

  // ---------- montagem de perguntas ----------
  function shuffled(arr, rng) {
    const c = arr.slice();
    for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
    return c;
  }
  function withOptions(q, o, rng) {
    const order = shuffled([0, 1, 2, 3], rng);
    q.type = 'mc'; q.opts = order.map((i) => o[i]); q.ci = order.indexOf(0);
    return q;
  }
  function makeMath(id, rng) {
    rng = rng || Math.random;
    const m = SM.make(id, rng);
    const q = { track: 'math', skill: m.s, skillName: SM.SKILLS[m.s], lv: m.L, qr: mathQR(m.L), p: m.p, x: m.x || '', eHtml: m.e, ref: 'm:' + id };
    if (m.o) return withOptions(q, m.o, rng);
    q.type = 'num'; q.a = m.a;
    return q;
  }
  function makeGk(item, rng) {
    const q = { track: 'gk', skill: item.c, skillName: CATS[item.c], lv: item.d, qr: gkQR(item.d), p: item.q, x: '', eHtml: esc(item.e), ref: 'gk:' + item.id };
    return withOptions(q, item.o, rng || Math.random);
  }
  function fromRef(ref) {
    if (ref.indexOf('m:') === 0) return SM.BY_ID[ref.slice(2)] ? makeMath(ref.slice(2)) : null;
    const it = BANK_ID[ref.slice(3)];
    return it ? makeGk(it) : null;
  }
  function pickMath(L, skill, last, fast) {
    let pool = SM.G.filter((g) => (!skill || g.s === skill) && (!fast || g.fast));
    const levels = Array.from(new Set(pool.map((g) => g.L)));
    const near = levels.reduce((a, b) => (Math.abs(b - L) < Math.abs(a - L) ? b : a), levels[0]);
    pool = pool.filter((g) => g.L === near);
    const alt = pool.filter((g) => g.id !== last);
    const g = (alt.length ? alt : pool)[Math.floor(Math.random() * (alt.length ? alt.length : pool.length))];
    return makeMath(g.id);
  }
  function pickGk(d, cat, used) {
    let pool = BANK.filter((q) => (!cat || q.c === cat) && !used.has(q.id));
    if (!pool.length) pool = BANK.filter((q) => !cat || q.c === cat);
    const levels = Array.from(new Set(pool.map((q) => q.d)));
    const near = levels.reduce((a, b) => (Math.abs(b - d) < Math.abs(a - d) ? b : a), levels[0]);
    pool = pool.filter((q) => q.d === near);
    const min = Math.min.apply(null, pool.map((q) => S.seen[q.id] || 0));
    pool = pool.filter((q) => (S.seen[q.id] || 0) === min);
    const it = pool[Math.floor(Math.random() * pool.length)];
    used.add(it.id);
    return makeGk(it);
  }
  function buildDaily() {
    const key = dayKey(), rng = SM.mulberry32(Number(key.replace(/-/g, '')));
    const list = [];
    for (let L = 1; L <= 5; L++) {
      const gens = SM.G.filter((g) => g.L === L);
      list.push(makeMath(gens[Math.floor(rng() * gens.length)].id, rng));
      const pool = BANK.filter((q) => q.d === L);
      if (pool.length) list.push(makeGk(pool[Math.floor(rng() * pool.length)], rng));
    }
    return list;
  }

  // ---------- sessão ----------
  let ses = null, timer = null, toastT = null;

  function start(o) {
    stopTimer();
    ses = { mode: o.mode, track: o.track || 'math', level: o.level ? Number(o.level) : null, skill: o.skill || null, cat: o.cat || null, total: 10, i: 0, log: [], combo: 0, xp: 0, r0: { math: S.r.math, gk: S.r.gk }, q: null, fb: null, buf: '', used: new Set(), last: null, list: null, done: false, newAch: [] };
    if (o.mode === 'diario') { ses.list = buildDaily(); ses.total = ses.list.length; }
    if (o.mode === 'revisao') {
      ses.list = S.review.slice(0, 10).map(fromRef).filter(Boolean); ses.total = ses.list.length;
      if (!ses.total) { ses = null; return; }
    }
    if (o.mode === 'sprint') {
      ses.total = Infinity; ses.end = Date.now() + 60000;
      timer = setInterval(tick, 100);
    }
    advance();
    window.scrollTo(0, 0);
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function tick() {
    if (!ses || ses.done) return stopTimer();
    const left = ses.end - Date.now();
    if (left <= 0) return finish();
    const bar = $('#timebar'), lab = $('#timeleft');
    if (bar) bar.style.width = (left / 600) + '%';
    if (lab) lab.textContent = Math.ceil(left / 1000) + ' s';
  }
  function nextQuestion() {
    if (ses.list) return ses.list[ses.i];
    if (ses.mode === 'sprint') {
      const pl = Math.min(band(S.r.math) + 1, 5);
      const L = clamp(pl - Math.floor(Math.random() * 3), 1, 5);
      return pickMath(L, null, ses.last, true);
    }
    const tr = ses.track === 'misto' ? (ses.i % 2 ? 'gk' : 'math') : ses.track;
    const target = S.r[tr] + (Math.random() * 500 - 250);
    if (tr === 'math') {
      const L = ses.level || clamp(Math.round((target - 200) / 400) + 1, 1, 7);
      return pickMath(L, ses.skill, ses.last, false);
    }
    const d = ses.level ? Math.min(5, ses.level) : clamp(Math.round((target - 300) / 450) + 1, 1, 5);
    return pickGk(d, ses.cat, ses.used);
  }
  function advance() {
    if (ses.i >= ses.total) return finish();
    ses.q = nextQuestion(); ses.last = ses.q.ref.slice(2);
    ses.fb = null; ses.buf = ''; ses.t0 = Date.now();
    render();
  }
  function submit(val) {
    if (!ses || ses.fb || ses.done) return;
    const q = ses.q;
    if (q.type === 'num' && (val === '' || val === '-' || isNaN(Number(val)))) return;
    const ok = q.type === 'mc' ? val === q.ci : Number(val) === q.a;
    const dt = (Date.now() - ses.t0) / 1000;
    const dr = ses.mode === 'treino' ? rate(q.track, q.qr, ok) : 0;
    const sk = S.skills[q.skill] || (S.skills[q.skill] = { n: 0, ok: 0 });
    sk.n++; if (ok) sk.ok++;
    const dk = dayKey(), day = S.days[dk] || (S.days[dk] = { n: 0, ok: 0 });
    day.n++; if (ok) day.ok++;
    S.total.n++; if (ok) S.total.ok++;
    if (q.track === 'gk') { const id = q.ref.slice(3); S.seen[id] = (S.seen[id] || 0) + 1; }
    ses.combo = ok ? ses.combo + 1 : 0;
    S.best.combo = Math.max(S.best.combo, ses.combo);
    let xp = 0;
    if (ok) xp = ses.mode === 'sprint' ? 5 : 10 + 4 * (q.lv - 1) + Math.min(ses.combo - 1, 5) * 2 + (dt < 8 ? 3 : 0);
    S.xp += xp; ses.xp += xp;
    const at = S.review.indexOf(q.ref);
    if (!ok && at < 0) { S.review.unshift(q.ref); S.review.length = Math.min(S.review.length, 40); }
    if (ok && at >= 0 && ses.mode === 'revisao') { S.review.splice(at, 1); if (!S.review.length) S.flags.cleared = true; }
    ses.log.push({ q: q, ok: ok, val: val, dr: dr });
    save(); beep(ok);
    if (ses.mode === 'sprint') {
      ses.i++; ses.flash = ok ? 'ok' : 'bad';
      return advance();
    }
    ses.fb = { ok: ok, dr: dr, xp: xp };
    render();
    const nx = $('#next'); if (nx) nx.focus();
  }
  function finish() {
    stopTimer();
    const okN = ses.log.filter((l) => l.ok).length;
    ses.done = true; ses.okN = okN;
    if (ses.log.length) {
      S.total.sessions++;
      if (ses.mode === 'treino') ['math', 'gk'].forEach((t) => { if (ses.log.some((l) => l.q.track === t)) { S.hist[t].push(S.r[t]); if (S.hist[t].length > 40) S.hist[t].shift(); } });
      if (ses.mode !== 'sprint' && ses.log.length >= 10 && okN === ses.log.length) S.total.perfect++;
      if (ses.mode === 'sprint') { ses.record = okN > S.best.sprint; S.best.sprint = Math.max(S.best.sprint, okN); }
      if (ses.mode === 'diario' && (!S.daily || S.daily.date !== dayKey())) S.daily = { date: dayKey(), score: okN, total: ses.log.length, marks: ses.log.map((l) => (l.ok ? 1 : 0)) };
    }
    ses.newAch = checkAch();
    save(); render(); window.scrollTo(0, 0);
  }

  // ---------- conquistas ----------
  const ACH = [
    ['primeira', 'Primeiro treino', 'Conclua uma sessão.', () => S.total.sessions >= 1],
    ['perfeito', 'Dez de dez', 'Acerte todas as perguntas de uma sessão.', () => S.total.perfect >= 1],
    ['combo10', 'Em chamas', 'Acerte 10 seguidas.', () => S.best.combo >= 10],
    ['combo25', 'Imparável', 'Acerte 25 seguidas.', () => S.best.combo >= 25],
    ['cem', 'Cem respostas', 'Responda 100 perguntas.', () => S.total.n >= 100],
    ['quinhentas', 'Quinhentas respostas', 'Responda 500 perguntas.', () => S.total.n >= 500],
    ['dias3', 'Três dias seguidos', 'Treine 3 dias seguidos.', () => streak() >= 3],
    ['dias7', 'Semana completa', 'Treine 7 dias seguidos.', () => streak() >= 7],
    ['sprint15', 'Cálculo rápido', 'Faça 15 pontos no Sprint.', () => S.best.sprint >= 15],
    ['sprint25', 'Calculadora humana', 'Faça 25 pontos no Sprint.', () => S.best.sprint >= 25],
    ['diario', 'Desafio cumprido', 'Complete um Desafio do dia.', () => !!S.daily],
    ['limpa', 'Sem pendências', 'Zere a fila de revisão.', () => !!S.flags.cleared],
    ['todos', 'Generalista', 'Responda perguntas dos 15 temas.', () => Object.keys(S.skills).length >= 15],
    ['avancado', 'Matemática avançada', 'Chegue a 1200 em Matemática.', () => S.r.math >= 1200],
    ['mestre', 'Mestre dos números', 'Chegue a 2000 em Matemática.', () => S.r.math >= 2000],
    ['lendario', 'Lendário', 'Chegue a 2400 em Matemática.', () => S.r.math >= 2400],
    ['sabio', 'Enciclopédia', 'Chegue a 1600 em Conhecimentos gerais.', () => S.r.gk >= 1600]
  ];
  function checkAch() {
    const got = [];
    ACH.forEach((a) => { if (!S.ach[a[0]] && a[3]()) { S.ach[a[0]] = dayKey(); got.push(a[1]); } });
    return got;
  }

  // ---------- som ----------
  let actx = null;
  function beep(ok) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime;
      (ok ? [660, 880] : [196]).forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = ok ? 'sine' : 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + (ok ? 0.16 : 0.3));
        o.connect(g); g.connect(actx.destination);
        o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.35);
      });
    } catch (e) { /* sem áudio */ }
  }
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ---------- telas ----------
  let confirmReset = false;
  function view() { return location.hash === '#progresso' ? 'progresso' : 'treinar'; }

  function renderChips() {
    const st = streak();
    $('#chips').innerHTML =
      '<span class="chip" title="Dias seguidos de treino"><b>' + st + '</b> ' + (st === 1 ? 'dia seguido' : 'dias seguidos') + '</span>' +
      '<span class="chip" title="' + S.xp + ' pontos de experiência">Nível <b>' + xpLevel() + '</b></span>' +
      '<button class="chip" data-act="sound" aria-pressed="' + S.sound + '">Som ' + (S.sound ? 'ligado' : 'desligado') + '</button>';
    document.querySelectorAll('.tabs a').forEach((a) => {
      if (!ses && a.dataset.tab === view()) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function pin(track, cls) {
    const r = S.r[track], p = clamp(r / 2800 * 100, 0, 100).toFixed(1);
    return '<div class="pin ' + cls + '" style="--p:' + p + '%"><i>' + TRACK[track] + ' · <span class="num">' + r + '</span> · ' + LV[band(r)] + '</i></div>';
  }
  function ruler() {
    return '<div class="ruler-box"><p class="eyebrow">Sua posição na régua</p>' +
      '<div class="ruler" role="img" aria-label="Matemática: ' + S.r.math + ' pontos, nível ' + LV[band(S.r.math)] + '. Conhecimentos gerais: ' + S.r.gk + ' pontos, nível ' + LV[band(S.r.gk)] + '.">' +
      '<div class="seg7">' + LV.map((_, i) => '<span>' + i * 400 + '</span>').join('') + '</div>' + pin('math', 'up') + pin('gk', 'down gk') + '</div>' +
      '<div class="ruler-legend">' + LV.map((n) => '<span>' + n + '</span>').join('') + '</div></div>';
  }
  function meter(sk) {
    const pct = sk && sk.n ? Math.round(sk.ok / sk.n * 100) : 0;
    return '<div class="meter"><i style="width:' + pct + '%"></i></div>';
  }
  function renderHome() {
    const first = S.total.n === 0;
    const dailyDone = S.daily && S.daily.date === dayKey();
    const starts = [['zero', 'Do zero', 300], ['medio', 'Já sei o básico', 1000], ['alto', 'Avançado', 1800]];
    let h = '<section class="hero"><div>' +
      '<p class="eyebrow">Matemática e conhecimentos gerais</p>' +
      '<h1>Do <em>7 + 5</em> aos <em>autovalores</em>.</h1>' +
      '<p class="lead">Dez perguntas por sessão. Acertou, a próxima sobe; errou, o Sinapse volta um passo e mostra a resolução. São ' + SM.G.length + ' tipos de exercício gerados na hora e ' + BANK.length + ' perguntas de cultura geral.</p>' +
      '<div class="go"><div class="seg" role="group" aria-label="Trilha">' +
      ['misto', 'math', 'gk'].map((t) => '<button data-act="track" data-track="' + t + '" aria-pressed="' + (S.track === t) + '">' + TRACK[t] + '</button>').join('') +
      '</div><button class="btn primary big" data-act="start" data-mode="treino" data-track="' + S.track + '">Começar treino</button></div>';
    if (first) h += '<div class="startpick"><span>Ponto de partida:</span>' + starts.map((s) => '<button class="btn small" data-act="setstart" data-r="' + s[2] + '" aria-pressed="' + (S.r.math === s[2]) + '"' + (S.r.math === s[2] ? ' style="border-color:var(--ink)"' : '') + '>' + s[1] + '</button>').join('') + '</div>';
    h += '</div>' + ruler() + '</section>';

    h += '<section class="section"><header><h2>Outros modos</h2></header><div class="modes">' +
      '<button class="mode" data-act="start" data-mode="sprint"><h3>Sprint de 60 segundos</h3><p>Contas rápidas contra o relógio. Cada acerto vale um ponto.</p><span class="stat">Recorde: ' + S.best.sprint + '</span></button>' +
      '<button class="mode" data-act="start" data-mode="diario"><h3>Desafio do dia</h3><p>As mesmas dez perguntas para todo mundo, da mais fácil à mais difícil.</p><span class="stat">' + (dailyDone ? 'Hoje: ' + S.daily.score + '/' + S.daily.total + ' · jogar de novo' : 'Ainda não feito hoje') + '</span></button>' +
      '<button class="mode" data-act="start" data-mode="revisao"' + (S.review.length ? '' : ' disabled') + '><h3>Revisão de erros</h3><p>Refaz o que você errou. Acertou, sai da fila.</p><span class="stat">' + (S.review.length ? S.review.length + ' na fila' : 'Fila vazia') + '</span></button>' +
      '</div></section>';

    h += '<section class="section"><header><h2>Os sete níveis</h2><p class="hint">Escolha um degrau para treinar só nele.</p></header><div class="ladder">';
    LV.forEach((name, i) => {
      const L = i + 1, topics = SM.G.filter((g) => g.L === L).map((g) => g.t);
      const hm = band(S.r.math) === i, hg = band(S.r.gk) === i;
      h += '<div class="rung' + (hm || hg ? ' here' : '') + '"><span class="n">' + L + '</span><div><h3>' + name + ' <small>' + i * 400 + (i === 6 ? '+' : '–' + (i * 400 + 399)) + '</small>' +
        (hm ? '<span class="tag">você em matemática</span>' : '') + (hg ? '<span class="tag">você em conhecimentos</span>' : '') + '</h3>' +
        '<p class="topics">' + topics.join(' · ') + '</p></div><div class="acts">' +
        '<button class="btn small" data-act="start" data-mode="treino" data-track="math" data-level="' + L + '">Matemática</button>' +
        (L <= 5 ? '<button class="btn small" data-act="start" data-mode="treino" data-track="gk" data-level="' + L + '">Conhecimentos</button>' : '') +
        '</div></div>';
    });
    h += '</div></section>';

    h += '<section class="section"><header><h2>Treinar por tema</h2><p class="hint">A dificuldade se ajusta dentro do tema.</p></header><div class="themes">';
    const card = (id, name, kind, attr) => {
      const sk = S.skills[id];
      return '<button class="theme" data-act="start" data-mode="treino" ' + attr + '><span class="t"><b>' + name + '</b><span>' + kind + '</span></span>' + meter(sk) +
        '<small>' + (sk ? sk.ok + ' de ' + sk.n + ' certas (' + Math.round(sk.ok / sk.n * 100) + '%)' : 'Ainda não treinado') + '</small></button>';
    };
    Object.keys(SM.SKILLS).forEach((id) => { h += card(id, SM.SKILLS[id], 'mat', 'data-track="math" data-skill="' + id + '"'); });
    Object.keys(CATS).forEach((id) => { h += card(id, CATS[id], 'geral', 'data-track="gk" data-cat="' + id + '"'); });
    h += '</div></section>';
    return h;
  }

  function modeName() {
    if (ses.mode === 'sprint') return 'Sprint de 60 segundos';
    if (ses.mode === 'diario') return 'Desafio do dia';
    if (ses.mode === 'revisao') return 'Revisão de erros';
    if (ses.skill) return SM.SKILLS[ses.skill];
    if (ses.cat) return CATS[ses.cat];
    if (ses.level) return TRACK[ses.track] + ' · nível ' + ses.level;
    return 'Treino · ' + TRACK[ses.track];
  }
  function renderSession() {
    const q = ses.q, fb = ses.fb, sprint = ses.mode === 'sprint';
    let h = '<div class="ses"><div class="ses-head"><div class="where">' + esc(modeName()) + '<small>' + esc(q.skillName) + ' · ' + (q.track === 'math' ? LV[q.lv - 1] : 'nível ' + q.lv + ' de 5') + '</small></div><div class="right">';
    if (sprint) h += '<span class="chip"><b id="timeleft">' + Math.ceil((ses.end - Date.now()) / 1000) + ' s</b></span><span class="chip">Pontos <b>' + ses.log.filter((l) => l.ok).length + '</b></span>';
    else h += '<span class="chip"><b>' + (ses.i + 1) + '/' + ses.total + '</b></span>';
    h += '<button class="btn small" data-act="quit">Sair</button></div></div>';
    if (sprint) h += '<div class="timebar"><i id="timebar" style="width:' + Math.max(0, (ses.end - Date.now()) / 600) + '%"></i></div>';
    else {
      h += '<div class="dots" aria-hidden="true">';
      for (let i = 0; i < ses.total; i++) h += '<i class="' + (ses.log[i] ? (ses.log[i].ok ? 'ok' : 'bad') : i === ses.i ? 'now' : '') + '"></i>';
      h += '</div>';
    }
    h += '<div class="card' + (ses.flash ? ' flash-' + ses.flash : '') + '">';
    h += '<p class="q-p' + (q.x ? '' : ' solo') + '">' + esc(q.p) + '</p>';
    if (q.x) h += '<div class="q-x">' + q.x + '</div>';
    if (q.type === 'mc') {
      const last = fb ? ses.log[ses.log.length - 1] : null;
      h += '<div class="opts">' + q.opts.map((o, i) => {
        let c = 'opt' + (q.track === 'math' ? ' mathopt' : '');
        if (fb && i === q.ci) c += ' right'; else if (fb && last.val === i) c += ' wrong';
        return '<button class="' + c + '" data-act="opt" data-i="' + i + '"' + (fb ? ' disabled' : '') + '><kbd>' + (i + 1) + '</kbd><span>' + esc(o) + '</span></button>';
      }).join('') + '</div>';
    } else if (!fb) {
      h += '<div class="entry"><div class="display' + (ses.buf ? '' : ' empty') + '" aria-live="polite">' + (ses.buf ? esc(ses.buf.replace('-', '−')) : 'Digite a resposta') + '<span class="caret"></span></div>' +
        '<div class="keypad">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((k) => '<button data-act="key" data-k="' + k + '">' + k + '</button>').join('') +
        '<button data-act="key" data-k="-" aria-label="Trocar sinal">±</button><button data-act="key" data-k="back" aria-label="Apagar">⌫</button>' +
        '<button class="okk" data-act="key" data-k="enter">Responder</button></div></div>';
    }
    if (fb) {
      const ans = q.type === 'num' ? fmt(q.a) : q.opts[q.ci];
      const mine = q.type === 'num' ? fmt(Number(ses.log[ses.log.length - 1].val)) : null;
      h += '<div class="fb ' + (fb.ok ? 'ok' : 'bad') + '" role="status"><strong>' + (fb.ok ? 'Certo' : 'Resposta: ' + esc(ans)) +
        '<small>' + (fb.ok ? '+' + fb.xp + ' XP' : mine !== null ? 'você respondeu ' + mine : '') + (ses.mode === 'treino' ? ' · régua ' + (fb.dr >= 0 ? '+' : '−') + Math.abs(fb.dr) : '') + (fb.ok && ses.combo >= 3 ? ' · ' + ses.combo + ' seguidas' : '') + '</small></strong>' +
        '<p>' + q.eHtml + '</p></div><div class="fb-row"><button class="btn primary" id="next" data-act="next">' + (ses.i + 1 >= ses.total ? 'Ver resultado' : 'Próxima') + ' <span class="mono" aria-hidden="true">↵</span></button></div>';
    }
    h += '</div></div>';
    ses.flash = null;
    return h;
  }
  function renderResult() {
    const n = ses.log.length, ok = ses.okN, sprint = ses.mode === 'sprint';
    const title = !n ? 'Sessão encerrada' : sprint ? ok + (ok === 1 ? ' ponto' : ' pontos') : ok + ' de ' + n;
    let h = '<div class="ses result"><p class="eyebrow">' + esc(modeName()) + '</p><h1>' + title + '</h1>';
    if (ses.newAch.length) h += '<div class="newach">Conquista' + (ses.newAch.length > 1 ? 's' : '') + ' nova' + (ses.newAch.length > 1 ? 's' : '') + ': ' + ses.newAch.map(esc).join(', ') + '</div>';
    h += '<div class="tiles"><div class="tile"><span>Experiência</span><b>+' + ses.xp + '</b><small>nível ' + xpLevel() + '</small></div>';
    if (sprint) h += '<div class="tile"><span>Recorde</span><b>' + S.best.sprint + '</b><small>' + (ses.record ? 'recorde novo' : 'seu melhor') + '</small></div>';
    if (ses.mode === 'treino') ['math', 'gk'].forEach((t) => {
      if (!ses.log.some((l) => l.q.track === t)) return;
      const d = S.r[t] - ses.r0[t];
      h += '<div class="tile"><span>' + TRACK[t] + '</span><b>' + S.r[t] + '</b><small class="' + (d >= 0 ? 'up' : 'down') + '">' + (d >= 0 ? '+' : '−') + Math.abs(d) + ' na régua · ' + LV[band(S.r[t])] + '</small></div>';
    });
    h += '</div><div class="rowbtns"><button class="btn primary" data-act="again">Jogar de novo</button><button class="btn" data-act="home">Voltar ao início</button>' +
      (ses.mode === 'diario' && n ? '<button class="btn" data-act="share">Copiar resultado</button>' : '') + '</div>';
    if (n) {
      h += '<ul class="review">' + ses.log.map((l) => {
        const q = l.q, ans = q.type === 'num' ? fmt(q.a) : q.opts[q.ci];
        return '<li><span class="ic ' + (l.ok ? 'ok' : 'bad') + '">' + (l.ok ? '✓' : '✗') + '</span><span>' + esc(q.p) + (q.x ? ' <span class="qx">' + q.x.replace(/<br>/g, ' ; ') + '</span>' : '') + '</span>' +
          '<small>Resposta: ' + esc(ans) + (l.ok ? '' : ' — ' + q.eHtml) + '</small></li>';
      }).join('') + '</ul>';
    }
    return h + '</div>';
  }

  function spark(track) {
    const pts = S.hist[track];
    let h = '<div class="chart"><h3>' + TRACK[track] + ' <span>' + S.r[track] + ' · ' + LV[band(S.r[track])] + '</span></h3>';
    if (pts.length < 2) return h + '<p class="empty">Conclua dois treinos nesta trilha para ver a curva.</p></div>';
    const W = 300, H = 90, lo = Math.min.apply(null, pts) - 40, hi = Math.max.apply(null, pts) + 40;
    const X = (i) => 6 + i * (W - 12) / (pts.length - 1), Y = (v) => H - 8 - (v - lo) / (hi - lo) * (H - 16);
    const line = pts.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    h += '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Evolução em ' + TRACK[track] + ': de ' + pts[0] + ' para ' + pts[pts.length - 1] + ' em ' + pts.length + ' sessões.">' +
      '<path d="' + line + ' L' + X(pts.length - 1).toFixed(1) + ' ' + H + ' L6 ' + H + ' Z" fill="var(--blue-soft)" stroke="none"/>' +
      '<path d="' + line + '" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      pts.map((v, i) => '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="' + (i === pts.length - 1 ? 4.5 : 7) + '" fill="' + (i === pts.length - 1 ? 'var(--blue)' : 'transparent') + '" stroke="' + (i === pts.length - 1 ? 'var(--surface)' : 'none') + '" stroke-width="2"><title>Sessão ' + (i + 1) + ': ' + v + '</title></circle>').join('') +
      '</svg><div class="axis"><span>início ' + pts[0] + '</span><span>' + pts.length + ' sessões</span><span>agora ' + pts[pts.length - 1] + '</span></div></div>';
    return h;
  }
  function activity() {
    const days = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push({ d: d, v: (S.days[dayKey(d)] || { n: 0 }).n }); }
    const max = Math.max(1, Math.max.apply(null, days.map((x) => x.v)));
    return '<div class="chart"><h3>Últimos 14 dias <span>perguntas por dia</span></h3><div class="bars" role="img" aria-label="Perguntas respondidas por dia nos últimos 14 dias.">' +
      days.map((x) => '<i class="' + (x.v ? '' : 'zero') + '" style="height:' + (x.v / max * 100) + '%" data-tip="' + x.d.getDate() + '/' + (x.d.getMonth() + 1) + ': ' + x.v + '"></i>').join('') +
      '</div><div class="axis"><span>' + days[0].d.getDate() + '/' + (days[0].d.getMonth() + 1) + '</span><span>máx. ' + max + '</span><span>hoje</span></div></div>';
  }
  function renderProgress() {
    const acc = S.total.n ? Math.round(S.total.ok / S.total.n * 100) + '%' : '–';
    let h = '<section class="section"><header><h2>Seu progresso</h2><p class="hint">Fica salvo neste navegador.</p></header>' +
      '<div class="tiles"><div class="tile"><span>Perguntas respondidas</span><b>' + S.total.n + '</b><small>' + S.total.sessions + ' sessões</small></div>' +
      '<div class="tile"><span>Aproveitamento</span><b>' + acc + '</b><small>' + S.total.ok + ' certas</small></div>' +
      '<div class="tile"><span>Dias seguidos</span><b>' + streak() + '</b><small>' + Object.keys(S.days).length + (Object.keys(S.days).length === 1 ? ' dia' : ' dias') + ' de treino</small></div>' +
      '<div class="tile"><span>Maior sequência</span><b>' + S.best.combo + '</b><small>acertos seguidos</small></div>' +
      '<div class="tile"><span>Experiência</span><b>' + S.xp + '</b><small>nível ' + xpLevel() + ' · próximo em ' + (50 * xpLevel() * xpLevel()) + '</small></div></div></section>';
    h += '<section class="section">' + ruler() + '<div class="charts">' + spark('math') + spark('gk') + activity() + '</div></section>';
    h += '<section class="section"><header><h2>Aproveitamento por tema</h2></header><div class="skills">';
    const row = (id, name) => { const sk = S.skills[id]; return '<div class="skill"><span>' + name + '</span>' + meter(sk) + '<span>' + (sk ? Math.round(sk.ok / sk.n * 100) + '% de ' + sk.n : 'sem dados') + '</span></div>'; };
    Object.keys(SM.SKILLS).forEach((id) => { h += row(id, SM.SKILLS[id]); });
    Object.keys(CATS).forEach((id) => { h += row(id, CATS[id]); });
    h += '</div></section>';
    const got = ACH.filter((a) => S.ach[a[0]]).length;
    h += '<section class="section"><header><h2>Conquistas</h2><p class="hint">' + got + ' de ' + ACH.length + '</p></header><div class="achs">' +
      ACH.map((a) => '<div class="ach' + (S.ach[a[0]] ? ' got' : '') + '"><b>' + a[1] + '</b><small>' + a[2] + '</small></div>').join('') + '</div></section>';
    h += '<section class="section"><div class="resetbox">' + (confirmReset
      ? '<span>Apagar todo o progresso deste navegador?</span><button class="btn small danger" data-act="reset-yes">Apagar tudo</button><button class="btn small" data-act="reset-no">Cancelar</button>'
      : '<button class="btn small" data-act="reset-ask">Apagar progresso</button>') + '</div></section>';
    return h;
  }

  function render() {
    renderChips();
    const app = $('#app');
    if (ses) app.innerHTML = ses.done ? renderResult() : renderSession();
    else app.innerHTML = view() === 'progresso' ? renderProgress() : renderHome();
  }

  // ---------- eventos ----------
  function key(k) {
    if (!ses || ses.fb || ses.done || ses.q.type !== 'num') return;
    if (k === 'enter') return submit(ses.buf);
    if (k === 'back') ses.buf = ses.buf.slice(0, -1);
    else if (k === '-') ses.buf = ses.buf[0] === '-' ? ses.buf.slice(1) : '-' + ses.buf;
    else if (ses.buf.replace('-', '').length < 8) ses.buf += k;
    render();
  }
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const a = el.dataset.act, d = el.dataset;
    if (a === 'start') start({ mode: d.mode, track: d.track, level: d.level, skill: d.skill, cat: d.cat });
    else if (a === 'track') { S.track = d.track; save(); render(); }
    else if (a === 'setstart') { S.r.math = S.r.gk = Number(d.r); save(); render(); }
    else if (a === 'opt') submit(Number(d.i));
    else if (a === 'key') key(d.k);
    else if (a === 'next') { ses.i++; advance(); }
    else if (a === 'quit') { if (ses.log.length && ses.mode !== 'revisao') finish(); else { stopTimer(); ses = null; render(); } }
    else if (a === 'again') start({ mode: ses.mode, track: ses.track, level: ses.level, skill: ses.skill, cat: ses.cat });
    else if (a === 'home') { ses = null; render(); window.scrollTo(0, 0); }
    else if (a === 'sound') { S.sound = !S.sound; save(); render(); }
    else if (a === 'reset-ask') { confirmReset = true; render(); }
    else if (a === 'reset-no') { confirmReset = false; render(); }
    else if (a === 'reset-yes') { S = fresh(); confirmReset = false; save(); render(); toast('Progresso apagado'); }
    else if (a === 'share') {
      const txt = 'Sinapse · Desafio do dia ' + new Date().toLocaleDateString('pt-BR') + ': ' + ses.okN + '/' + ses.log.length + ' ' + ses.log.map((l) => (l.ok ? '🟩' : '🟥')).join('');
      try { navigator.clipboard.writeText(txt).then(() => toast('Resultado copiado'), () => toast(txt)); } catch (e) { toast(txt); }
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (!ses || ses.done || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    if (ses.fb) { if (k === 'Enter' || k === ' ') { ev.preventDefault(); ses.i++; advance(); } return; }
    if (ses.q.type === 'mc') { if (k >= '1' && k <= '4') { ev.preventDefault(); submit(Number(k) - 1); } return; }
    if (k >= '0' && k <= '9') { ev.preventDefault(); key(k); }
    else if (k === '-') { ev.preventDefault(); key('-'); }
    else if (k === 'Backspace') { ev.preventDefault(); key('back'); }
    else if (k === 'Enter') { ev.preventDefault(); key('enter'); }
  });
  window.addEventListener('hashchange', () => { if (ses && !ses.done) return; ses = null; confirmReset = false; render(); });

  render();
})();
