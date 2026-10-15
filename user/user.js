/* Keyboard Trainer — student interface */
(() => {
  const $ = (id) => document.getElementById(id);

  const screens = {
    login: $('screen-login'),
    texts: $('screen-texts'),
    trainer: $('screen-trainer'),
    result: $('screen-result')
  };

  const LEVEL_LABELS = { easy: 'лёгкий', medium: 'средний', hard: 'сложный' };

  let user = KT.store.get('kt_user'); // { userId, alias }
  let texts = [];
  let currentText = null;

  // ---- Trainer state ----
  let target = '';
  let index = 0; // current position in target
  let correctTotal = 0; // total correct keystrokes
  const counted = new Set(); // indices already counted (no re-earn after backspace)
  let errors = 0;
  let startedAt = null;
  let finished = false;
  let roundActive = false;

  // ---- Socket ----
  const socket = io();
  let pendingChars = 0; // correct chars not yet reported to the round

  // ================= Screens =================
  function show(name) {
    Object.values(screens).forEach((s) => s.classList.add('hidden'));
    screens[name].classList.remove('hidden');
  }

  // ================= Auth =================
  function initLogin() {
    if (user) {
      enterTexts();
      return;
    }
    show('login');
    const tryLogin = async () => {
      const alias = $('login-alias').value.trim();
      const code = $('login-code').value.trim();
      $('login-error').textContent = '';
      if (!alias || !code) {
        $('login-error').textContent = 'Введите псевдоним и код';
        return;
      }
      try {
        $('login-btn').disabled = true;
        const data = await KT.api('/api/users/login', {
          method: 'POST',
          body: JSON.stringify({ alias, code })
        });
        user = data;
        KT.store.set('kt_user', data);
        enterTexts();
      } catch (err) {
        $('login-error').textContent = err.message;
      } finally {
        $('login-btn').disabled = false;
      }
    };
    $('login-btn').addEventListener('click', tryLogin);
    $('login-code').addEventListener('keydown', (e) => e.key === 'Enter' && tryLogin());
    $('login-alias').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('login-code').focus();
    });
  }

  $('logout-btn').addEventListener('click', () => {
    KT.store.remove('kt_user');
    user = null;
    show('login');
  });

  // ================= Texts =================
  async function enterTexts() {
    show('texts');
    $('texts-alias').textContent = user.alias;
    if (!texts.length) {
      try {
        texts = await KT.api('/api/texts');
      } catch (err) {
        texts = [];
        console.error(err);
      }
    }
    const grid = $('texts-list');
    grid.innerHTML = '';
    texts.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'text-card';
      card.innerHTML = `
        <div class="badges">
          <span class="badge ${t.lang}">${t.lang === 'ru' ? 'рус' : 'eng'}</span>
          <span class="badge ${t.level}">${LEVEL_LABELS[t.level] || t.level}</span>
        </div>
        <h3>${escapeHtml(t.title)}</h3>
        <p>${escapeHtml(t.content)}</p>`;
      card.addEventListener('click', () => startTrainer(t));
      grid.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);
  }

  // ================= Trainer =================
  function startTrainer(text) {
    currentText = text;
    target = text.content;
    index = 0;
    correctTotal = 0;
    counted.clear();
    errors = 0;
    startedAt = null;
    finished = false;
    pendingChars = 0;

    // render target as spans
    const box = $('target-text');
    box.innerHTML = '';
    [...target].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.dataset.i = i;
      span.textContent = ch;
      box.appendChild(span);
    });
    box.innerHTML = box.innerHTML; // reparse
    updateCursor();
    updateStats();
    $('progress-fill').style.width = '0%';
    $('focus-hint').classList.add('hidden');

    show('trainer');
    document.addEventListener('keydown', onKey);
    box.addEventListener('click', () => $('focus-hint').classList.add('hidden'));
  }

  function charEl(i) {
    return document.querySelector(`#target-text .char[data-i="${i}"]`);
  }

  function updateCursor() {
    document.querySelectorAll('#target-text .current').forEach((el) => el.classList.remove('current'));
    const el = charEl(index);
    if (el && !finished) el.classList.add('current');
  }

  function onKey(e) {
    if (screens.trainer.classList.contains('hidden')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'Escape') {
      finishTrainer();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (index > 0) {
        index -= 1;
        const el = charEl(index);
        if (el) {
          el.classList.remove('ok', 'bad');
        }
        updateCursor();
        updateProgress();
      }
      return;
    }
    if (e.key.length !== 1 && e.key !== 'Enter') return;

    e.preventDefault();
    if (finished) return;

    const expected = target[index];
    const typed = e.key === 'Enter' ? '\n' : e.key;
    if (typed !== expected) {
      errors += 1;
      const el = charEl(index);
      if (el) {
        el.classList.add('bad');
        setTimeout(() => el.classList.remove('bad'), 180);
      }
      updateStats();
      return;
    }

    if (startedAt === null) startedAt = Date.now();
    const el = charEl(index);
    if (el) {
      el.classList.remove('bad');
      el.classList.add('ok');
    }
    if (!counted.has(index)) {
      counted.add(index);
      correctTotal += 1;
      pendingChars += 1;
      flushRoundBatch(); // throttled inside
    }
    index += 1;

    updateCursor();
    updateProgress();
    updateStats();

    if (index >= target.length) finishTrainer();
  }

  function updateProgress() {
    const pct = target.length ? (index / target.length) * 100 : 0;
    $('progress-fill').style.width = `${pct}%`;
  }

  function elapsedSec() {
    if (!startedAt) return 0;
    return Math.max((Date.now() - startedAt) / 1000, 0.5);
  }

  function computeCpm() {
    return Math.round(correctTotal / (elapsedSec() / 60));
  }

  function computeAccuracy() {
    const total = correctTotal + errors;
    return total ? Math.round((correctTotal / total) * 100) : 100;
  }

  function updateStats() {
    $('stat-cpm').textContent = startedAt ? computeCpm() : 0;
    $('stat-accuracy').textContent = `${computeAccuracy()}%`;
    $('stat-errors').textContent = errors;
  }

  // ---- Round reporting (batched) ----
  const FLUSH_MS = 180;
  let lastFlush = 0;

  function flushRoundBatch(force = false) {
    if (!user || pendingChars <= 0) return;
    const now = Date.now();
    if (!force && now - lastFlush < FLUSH_MS) return;
    lastFlush = now;
    socket.emit('type', {
      userId: user.userId,
      alias: user.alias,
      chars: pendingChars,
      cpm: computeCpm(),
      accuracy: computeAccuracy()
    });
    pendingChars = 0;
  }

  // safety net: deliver accumulated chars even if typing paused
  setInterval(() => flushRoundBatch(), FLUSH_MS);

  function finishTrainer() {
    if (finished) return;
    finished = true;
    flushRoundBatch(true);
    document.removeEventListener('keydown', onKey);

    const cpm = startedAt ? computeCpm() : 0;
    const accuracy = computeAccuracy();
    const duration = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;

    KT.api('/api/results', {
      method: 'POST',
      body: JSON.stringify({
        userId: user.userId,
        textId: currentText._id,
        cpm,
        accuracy,
        typedChars: correctTotal,
        errors,
        duration
      })
    }).catch(() => {}); // best-effort; progress storage is disabled for now

    $('result-cpm').textContent = cpm;
    $('result-accuracy').textContent = `${accuracy}%`;
    $('result-chars').textContent = correctTotal;
    $('result-time').textContent = `${duration}с`;
    show('result');
  }

  $('stop-btn').addEventListener('click', finishTrainer);
  $('again-btn').addEventListener('click', () => startTrainer(currentText));
  $('to-texts-btn').addEventListener('click', () => {
    currentText = null;
    enterTexts();
  });
  $('back-btn').addEventListener('click', () => {
    finished = true;
    flushRoundBatch(true);
    document.removeEventListener('keydown', onKey);
    enterTexts();
  });

  // lost focus while typing → show resume hint
  window.addEventListener('blur', () => {
    if (startedAt && !finished && !screens.trainer.classList.contains('hidden')) {
      $('focus-hint').classList.remove('hidden');
    }
  });
  $('focus-hint').addEventListener('click', () => $('focus-hint').classList.add('hidden'));

  // ================= Round state =================
  function renderRoundBar(state) {
    roundActive = Boolean(state && state.active);
    const total = state ? state.totalChars : 0;
    let share = 0;
    if (state && user) {
      const me = (state.participants || []).find((p) => p.userId === user.userId);
      if (me) share = me.share;
    }
    for (const [barId, totalId, shareId] of [
      ['round-bar', 'round-total', 'round-my-share'],
      ['trainer-round', 'trainer-round-total', 'trainer-round-share']
    ]) {
      const bar = $(barId);
      if (!roundActive) {
        bar.classList.add('hidden');
      } else {
        bar.classList.remove('hidden');
        $(totalId).textContent = total.toLocaleString('ru-RU');
        $(shareId).textContent = `${share}%`;
      }
    }
  }

  socket.on('round:state', renderRoundBar);
  socket.on('round:started', () => renderRoundBar({ active: true, totalChars: 0, participants: [] }));
  socket.on('tick', (state) => {
    // keep total/share fresh; participants share is computed server-side
    renderRoundBar(state);
  });
  socket.on('round:finished', () => renderRoundBar({ active: false }));

  // admin changed the text list → refresh for students on the selection screen
  socket.on('texts:changed', () => {
    if (!screens.texts.classList.contains('hidden')) {
      texts = [];
      enterTexts();
    }
  });

  // ================= Boot =================
  initLogin();
})();
