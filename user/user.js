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
  let combo = 0; // consecutive correct keystrokes (client-side only)

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

  // ================= On-screen keyboard hint =================
  // Physical key positions with the character produced without / with Shift.
  const KEYBOARD_LAYOUTS = {
    en: [
      [
        { id: 'Backquote', base: '`', shift: '~' },
        { id: 'Digit1', base: '1', shift: '!' },
        { id: 'Digit2', base: '2', shift: '@' },
        { id: 'Digit3', base: '3', shift: '#' },
        { id: 'Digit4', base: '4', shift: '$' },
        { id: 'Digit5', base: '5', shift: '%' },
        { id: 'Digit6', base: '6', shift: '^' },
        { id: 'Digit7', base: '7', shift: '&' },
        { id: 'Digit8', base: '8', shift: '*' },
        { id: 'Digit9', base: '9', shift: '(' },
        { id: 'Digit0', base: '0', shift: ')' },
        { id: 'Minus', base: '-', shift: '_' },
        { id: 'Equal', base: '=', shift: '+' },
        { id: 'Backspace', label: '⌫', width: 2 }
      ],
      [
        { id: 'KeyQ', base: 'q', shift: 'Q' },
        { id: 'KeyW', base: 'w', shift: 'W' },
        { id: 'KeyE', base: 'e', shift: 'E' },
        { id: 'KeyR', base: 'r', shift: 'R' },
        { id: 'KeyT', base: 't', shift: 'T' },
        { id: 'KeyY', base: 'y', shift: 'Y' },
        { id: 'KeyU', base: 'u', shift: 'U' },
        { id: 'KeyI', base: 'i', shift: 'I' },
        { id: 'KeyO', base: 'o', shift: 'O' },
        { id: 'KeyP', base: 'p', shift: 'P' },
        { id: 'BracketLeft', base: '[', shift: '{' },
        { id: 'BracketRight', base: ']', shift: '}' },
        { id: 'Backslash', base: '\\', shift: '|' }
      ],
      [
        { id: 'KeyA', base: 'a', shift: 'A' },
        { id: 'KeyS', base: 's', shift: 'S' },
        { id: 'KeyD', base: 'd', shift: 'D' },
        { id: 'KeyF', base: 'f', shift: 'F' },
        { id: 'KeyG', base: 'g', shift: 'G' },
        { id: 'KeyH', base: 'h', shift: 'H' },
        { id: 'KeyJ', base: 'j', shift: 'J' },
        { id: 'KeyK', base: 'k', shift: 'K' },
        { id: 'KeyL', base: 'l', shift: 'L' },
        { id: 'Semicolon', base: ';', shift: ':' },
        { id: 'Quote', base: "'", shift: '"' },
        { id: 'Enter', label: 'Enter', width: 2.5 }
      ],
      [
        { id: 'ShiftLeft', label: 'Shift', width: 2.2, modifier: 'shift' },
        { id: 'KeyZ', base: 'z', shift: 'Z' },
        { id: 'KeyX', base: 'x', shift: 'X' },
        { id: 'KeyC', base: 'c', shift: 'C' },
        { id: 'KeyV', base: 'v', shift: 'V' },
        { id: 'KeyB', base: 'b', shift: 'B' },
        { id: 'KeyN', base: 'n', shift: 'N' },
        { id: 'KeyM', base: 'm', shift: 'M' },
        { id: 'Comma', base: ',', shift: '<' },
        { id: 'Period', base: '.', shift: '>' },
        { id: 'Slash', base: '/', shift: '?' },
        { id: 'ShiftRight', label: 'Shift', width: 2.2, modifier: 'shift' }
      ],
      [{ id: 'Space', label: 'Пробел', width: 9 }]
    ],
    ru: [
      [
        { id: 'Backquote', base: 'ё', shift: 'Ё' },
        { id: 'Digit1', base: '1', shift: '!' },
        { id: 'Digit2', base: '2', shift: '"' },
        { id: 'Digit3', base: '3', shift: '№' },
        { id: 'Digit4', base: '4', shift: ';' },
        { id: 'Digit5', base: '5', shift: '%' },
        { id: 'Digit6', base: '6', shift: ':' },
        { id: 'Digit7', base: '7', shift: '?' },
        { id: 'Digit8', base: '8', shift: '*' },
        { id: 'Digit9', base: '9', shift: '(' },
        { id: 'Digit0', base: '0', shift: ')' },
        { id: 'Minus', base: '-', shift: '_' },
        { id: 'Equal', base: '=', shift: '+' },
        { id: 'Backspace', label: '⌫', width: 2 }
      ],
      [
        { id: 'KeyQ', base: 'й', shift: 'Й' },
        { id: 'KeyW', base: 'ц', shift: 'Ц' },
        { id: 'KeyE', base: 'у', shift: 'У' },
        { id: 'KeyR', base: 'к', shift: 'К' },
        { id: 'KeyT', base: 'е', shift: 'Е' },
        { id: 'KeyY', base: 'н', shift: 'Н' },
        { id: 'KeyU', base: 'г', shift: 'Г' },
        { id: 'KeyI', base: 'ш', shift: 'Ш' },
        { id: 'KeyO', base: 'щ', shift: 'Щ' },
        { id: 'KeyP', base: 'з', shift: 'З' },
        { id: 'BracketLeft', base: 'х', shift: 'Х' },
        { id: 'BracketRight', base: 'ъ', shift: 'Ъ' },
        { id: 'Backslash', base: '\\', shift: '/' }
      ],
      [
        { id: 'KeyA', base: 'ф', shift: 'Ф' },
        { id: 'KeyS', base: 'ы', shift: 'Ы' },
        { id: 'KeyD', base: 'в', shift: 'В' },
        { id: 'KeyF', base: 'а', shift: 'А' },
        { id: 'KeyG', base: 'п', shift: 'П' },
        { id: 'KeyH', base: 'р', shift: 'Р' },
        { id: 'KeyJ', base: 'о', shift: 'О' },
        { id: 'KeyK', base: 'л', shift: 'Л' },
        { id: 'KeyL', base: 'д', shift: 'Д' },
        { id: 'Semicolon', base: 'ж', shift: 'Ж' },
        { id: 'Quote', base: 'э', shift: 'Э' },
        { id: 'Enter', label: 'Enter', width: 2.5 }
      ],
      [
        { id: 'ShiftLeft', label: 'Shift', width: 2.2, modifier: 'shift' },
        { id: 'KeyZ', base: 'я', shift: 'Я' },
        { id: 'KeyX', base: 'ч', shift: 'Ч' },
        { id: 'KeyC', base: 'с', shift: 'С' },
        { id: 'KeyV', base: 'м', shift: 'М' },
        { id: 'KeyB', base: 'и', shift: 'И' },
        { id: 'KeyN', base: 'т', shift: 'Т' },
        { id: 'KeyM', base: 'ь', shift: 'Ь' },
        { id: 'Comma', base: 'б', shift: 'Б' },
        { id: 'Period', base: 'ю', shift: 'Ю' },
        { id: 'Slash', base: '.', shift: ',' },
        { id: 'ShiftRight', label: 'Shift', width: 2.2, modifier: 'shift' }
      ],
      [{ id: 'Space', label: 'Пробел', width: 9 }]
    ]
  };

  let keyIndex = {};

  function registerKey(ch, id, shift) {
    if (!ch || [...ch].length !== 1) return;
    if (!(ch in keyIndex)) keyIndex[ch] = { id, shift };
  }

  function renderKeyboard(lang) {
    const rows = KEYBOARD_LAYOUTS[lang] || KEYBOARD_LAYOUTS.en;
    const kb = $('keyboard');
    kb.innerHTML = '';
    keyIndex = {};

    rows.forEach((row) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';
      row.forEach((k) => {
        const keyEl = document.createElement('div');
        keyEl.className = 'key';
        keyEl.dataset.key = k.id;
        if (k.width) {
          keyEl.style.flexGrow = k.width;
          if (!k.base) keyEl.classList.add('wide');
        }
        if (k.modifier) keyEl.dataset.modifier = k.modifier;
        keyEl.textContent = k.label || k.base || '';
        rowEl.appendChild(keyEl);

        if (k.base) registerKey(k.base, k.id, false);
        if (k.shift) registerKey(k.shift, k.id, true);
      });
      kb.appendChild(rowEl);
    });

    keyIndex['\n'] = { id: 'Enter', shift: false };
    keyIndex[' '] = { id: 'Space', shift: false };
    kb.classList.remove('hidden');
  }

  function updateKeyHint() {
    const kb = $('keyboard');
    if (!kb) return;
    kb.querySelectorAll('.key.active, .key.shift-active').forEach((el) => {
      el.classList.remove('active', 'shift-active');
    });

    if (finished || index >= target.length) return;
    const hit = keyIndex[target[index]];
    if (!hit) return;

    const keyEl = kb.querySelector(`.key[data-key="${hit.id}"]`);
    if (keyEl) keyEl.classList.add('active');
    if (hit.shift) {
      kb.querySelectorAll('.key[data-modifier="shift"]').forEach((el) => {
        el.classList.add('shift-active');
      });
    }
  }

  // ================= Combo badge =================
  // Local-only counter: "Комбо xN" — N consecutive correct keystrokes.
  function renderCombo(anim) {
    const el = $('combo');
    if (!el) return;
    el.textContent = `Комбо x${combo}`;
    // reset animation classes, force reflow so the animation restarts
    el.classList.remove('combo-pop', 'combo-shake');
    void el.offsetWidth;
    if (combo > 0) {
      el.classList.remove('hidden');
      if (anim === 'pop') el.classList.add('combo-pop');
    } else if (anim === 'shake') {
      // show "Комбо x0" shaking, hide once the shake ends (see listener below)
      el.classList.remove('hidden');
      el.classList.add('combo-shake');
    } else {
      el.classList.add('hidden');
    }
  }

  // registered once: hides the badge after a shake reset — never self-retriggering
  $('combo').addEventListener('animationend', (e) => {
    if (e.animationName === 'combo-shake' && combo === 0) {
      $('combo').classList.add('hidden');
    }
  });

  // ================= Achievements =================
  // Client-side only: toasts fly in from the right, badges show on the result
  // screen. Progress resets on every trainer start (per spec — no server stats).
  const ACHIEVEMENTS = [
    { id: 'first', icon: '🔤', title: 'Первый символ', desc: 'Верный символ', check: (s) => s.chars >= 1 },
    { id: 'typist', icon: '⌨️', title: 'Печатор', desc: '10 символов', check: (s) => s.chars >= 10 },
    { id: 'skilled', icon: '🛠️', title: 'Умелец', desc: '100 символов', check: (s) => s.chars >= 100 },
    { id: 'hero', icon: '🦸', title: 'Клавиатурный герой', desc: '500 символов', check: (s) => s.chars >= 500 },
    { id: 'double', icon: '✌️', title: 'Двойное комбо', desc: 'Комбо ×2', check: (s) => s.combo >= 2 },
    { id: 'flawless', icon: '🎯', title: 'Безошибочник', desc: 'Комбо ×10', check: (s) => s.combo >= 10 },
    { id: 'balance', icon: '⚖️', title: 'Идеальный баланс', desc: 'Комбо ×25', check: (s) => s.combo >= 25 },
    { id: 'the-end', icon: '🏁', title: 'Это конец?', desc: 'Допечатать текст до конца', check: (s) => s.completed }
  ];

  let ach = { chars: 0, completed: false, earned: new Set() };

  function checkAchievements() {
    const state = { chars: ach.chars, combo, completed: ach.completed };
    for (const a of ACHIEVEMENTS) {
      if (ach.earned.has(a.id)) continue; // one-time, no duplicate toasts
      if (a.check(state)) {
        ach.earned.add(a.id);
        showToast(a);
      }
    }
  }

  function showToast(a) {
    const box = $('ach-toasts');
    if (!box) return;
    while (box.children.length >= 4) box.firstElementChild.remove(); // cap the stack
    const el = document.createElement('div');
    el.className = 'ach-toast';
    el.innerHTML =
      '<span class="toast-icon"></span><div class="toast-body"><span class="toast-label">Достижение</span><b></b><span class="toast-desc"></span></div>';
    el.querySelector('.toast-icon').textContent = a.icon;
    el.querySelector('b').textContent = a.title;
    el.querySelector('.toast-desc').textContent = a.desc;
    box.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 400); // slide-out duration
    }, 2600);
  }

  function renderResultAchievements() {
    const wrap = $('result-achievements');
    const list = $('result-ach-list');
    list.innerHTML = '';
    const earned = ACHIEVEMENTS.filter((a) => ach.earned.has(a.id));
    if (!earned.length) {
      wrap.classList.add('hidden');
      return;
    }
    $('result-ach-count').textContent = `${earned.length} из ${ACHIEVEMENTS.length}`;
    earned.forEach((a) => {
      const chip = document.createElement('span');
      chip.className = 'ach-badge';
      chip.textContent = `${a.icon} ${a.title}`;
      list.appendChild(chip);
    });
    wrap.classList.remove('hidden');
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
    combo = 0;
    renderCombo();
    ach = { chars: 0, completed: false, earned: new Set() }; // progress resets every start

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
    renderKeyboard(text.lang);
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
    updateKeyHint();
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
        combo = 0;
        renderCombo();
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
      combo = 0;
      renderCombo('shake');
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
      ach.chars += 1;
      pendingChars += 1;
      flushRoundBatch(); // throttled inside
    }
    combo += 1;
    renderCombo('pop');
    checkAchievements();
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
    if (index >= target.length) ach.completed = true; // "Это конец?" — full text only
    checkAchievements();
    updateKeyHint(); // clears the key highlight
    combo = 0;
    renderCombo();
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
    renderResultAchievements();
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
