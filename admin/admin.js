/* Keyboard Trainer — admin interface */
(() => {
  const $ = (id) => document.getElementById(id);

  const screens = {
    login: $('screen-login'),
    dashboard: $('screen-dashboard'),
    archive: $('screen-archive'),
    texts: $('screen-texts'),
    settings: $('screen-settings')
  };

  let roundActive = false;
  let lastTotal = 0;
  const MAX_POPUPS = 6;
  const POPUP_LIFETIME_MS = 2400;

  function show(name) {
    Object.values(screens).forEach((s) => s.classList.add('hidden'));
    screens[name].classList.remove('hidden');
  }

  // ================= Auth =================
  async function tryLogin() {
    const password = $('admin-password').value;
    $('admin-login-error').textContent = '';
    try {
      $('admin-login-btn').disabled = true;
      const data = await KT.api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      KT.store.set('kt_admin_token', data.token);
      enterDashboard();
    } catch (err) {
      $('admin-login-error').textContent = err.message;
    } finally {
      $('admin-login-btn').disabled = false;
    }
  }

  $('admin-login-btn').addEventListener('click', tryLogin);
  $('admin-password').addEventListener('keydown', (e) => e.key === 'Enter' && tryLogin());

  $('admin-logout-btn').addEventListener('click', () => {
    KT.store.remove('kt_admin_token');
    show('login');
  });

  // ================= Navigation =================
  $('nav-dashboard').addEventListener('click', enterDashboard);
  $('nav-archive').addEventListener('click', enterArchive);
  $('nav-texts').addEventListener('click', enterTexts);
  $('nav-settings').addEventListener('click', enterSettings);
  $('archive-back-btn').addEventListener('click', enterDashboard);
  $('archive-texts-btn').addEventListener('click', enterTexts);
  $('texts-back-btn').addEventListener('click', enterDashboard);
  $('texts-archive-btn').addEventListener('click', enterArchive);
  $('settings-back-btn').addEventListener('click', enterDashboard);

  // ================= Settings =================
  const INDIVIDUAL_KEY = 'kt_show_individual';

  function showIndividual() {
    return KT.store.get(INDIVIDUAL_KEY, true) !== false;
  }

  function enterSettings() {
    $('show-individual').checked = showIndividual();
    show('settings');
  }

  function applyIndividualVisibility() {
    $('show-individual').checked = showIndividual();
    $('participants-card').classList.toggle('hidden', !showIndividual());
    if (!showIndividual()) {
      $('participants-body').innerHTML = '';
    }
  }

  $('show-individual').addEventListener('change', (e) => {
    KT.store.set(INDIVIDUAL_KEY, e.target.checked);
    applyIndividualVisibility();
  });

  // ================= Dashboard =================
  async function enterDashboard() {
    show('dashboard');
    applyIndividualVisibility();
    refreshStats();
    // pick up current round state
    try {
      const state = await KT.api('/api/rounds/current');
      renderRound(state);
    } catch {
      /* ignore */
    }
  }

  async function refreshStats() {
    try {
      const s = await KT.api('/api/admin/stats');
      $('stat-students').textContent = s.students;
      $('stat-rounds').textContent = s.rounds;
      $('stat-chars').textContent = s.totalChars.toLocaleString('ru-RU');
      $('stat-cpm').textContent = s.avgCpm;
      $('stat-accuracy').textContent = `${s.avgAccuracy}%`;
    } catch (err) {
      if (err.status === 401) {
        KT.store.remove('kt_admin_token');
        show('login');
      }
    }
  }

  // ================= Round control =================
  function renderRound(state) {
    roundActive = Boolean(state && state.active);
    $('start-round-btn').disabled = roundActive;
    $('finish-round-btn').disabled = !roundActive;
    $('round-status').textContent = roundActive
      ? `Сессия идёт с ${KT.formatDate(state.startedAt)}`
      : 'Сессия не запущена';
    renderTotal(state ? state.totalChars : 0);
    renderParticipants(state ? state.participants : []);
  }

  function renderTotal(total) {
    const el = $('total-chars');
    el.textContent = Number(total).toLocaleString('ru-RU');
    if (total > lastTotal) {
      el.classList.add('bump');
      setTimeout(() => el.classList.remove('bump'), 120);
    }
    lastTotal = total;
  }

  function renderParticipants(list) {
    const body = $('participants-body');
    if (!showIndividual()) {
      body.innerHTML = '';
      return;
    }
    if (!list || !list.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted">Пока никто не печатает…</td></tr>';
      return;
    }
    body.innerHTML = list
      .map(
        (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><b>${escapeHtml(p.alias)}</b></td>
        <td>${p.chars.toLocaleString('ru-RU')}</td>
        <td>
          <span class="share-bar" style="width:${Math.max(p.share, 1) * 2}px"></span>
          ${p.share}%
        </td>
        <td>${p.cpm}</td>
        <td>${p.accuracy}%</td>
      </tr>`
      )
      .join('');
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

  $('start-round-btn').addEventListener('click', async () => {
    try {
      const state = await KT.api('/api/rounds/start', { method: 'POST' });
      lastTotal = 0;
      renderRound(state);
      refreshStats();
    } catch (err) {
      alert(err.message);
    }
  });

  $('finish-round-btn').addEventListener('click', () => {
    $('finish-label').value = '';
    $('finish-error').textContent = '';
    $('finish-modal').classList.remove('hidden');
    $('finish-label').focus();
  });

  $('finish-cancel-btn').addEventListener('click', () => {
    $('finish-modal').classList.add('hidden');
  });

  $('finish-confirm-btn').addEventListener('click', async () => {
    const label = $('finish-label').value.trim();
    if (!label) {
      $('finish-error').textContent = 'Введите подпись сессии';
      return;
    }
    try {
      await KT.api('/api/rounds/finish', {
        method: 'POST',
        body: JSON.stringify({ label })
      });
      $('finish-modal').classList.add('hidden');
      renderRound({ active: false, totalChars: lastTotal, participants: [] });
      refreshStats();
    } catch (err) {
      $('finish-error').textContent = err.message;
    }
  });
  $('finish-label').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('finish-confirm-btn').click();
  });

  // ================= Archive =================
  async function enterArchive() {
    show('archive');
    const body = $('archive-body');
    body.innerHTML = '<tr><td colspan="6" class="muted">Загрузка…</td></tr>';
    try {
      const rows = await KT.api('/api/rounds/archive');
      if (!rows.length) {
        body.innerHTML = '<tr><td colspan="6" class="muted">Архив пуст — завершите первую сессию.</td></tr>';
        return;
      }
      body.innerHTML = rows
        .map(
          (r) => `
        <tr>
          <td><b>${escapeHtml(r.label)}</b></td>
          <td>${KT.formatDate(r.finishedAt)}</td>
          <td>${(r.totalChars || 0).toLocaleString('ru-RU')}</td>
          <td>${r.participantsCount || 0}</td>
          <td>${r.avgCpm ?? (r.avgWpm ? r.avgWpm * 5 : 0)}</td>
          <td>${r.avgAccuracy || 0}%</td>
        </tr>`
        )
        .join('');
    } catch (err) {
      body.innerHTML = `<tr><td colspan="6" class="error">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // ================= Texts management =================
  let textsCache = [];

  async function enterTexts() {
    show('texts');
    await loadTexts();
  }

  async function loadTexts() {
    const body = $('texts-body');
    body.innerHTML = '<tr><td colspan="5" class="muted">Загрузка…</td></tr>';
    try {
      textsCache = await KT.api('/api/admin/texts');
      renderTexts();
    } catch (err) {
      if (err.status === 401) {
        KT.store.remove('kt_admin_token');
        show('login');
        return;
      }
      body.innerHTML = `<tr><td colspan="5" class="error">${escapeHtml(err.message)}</td></tr>`;
    }
  }

  const LANG_LABELS = { ru: 'рус', en: 'eng' };
  const LEVEL_LABELS = { easy: 'лёгкий', medium: 'средний', hard: 'сложный' };

  function renderTexts() {
    const body = $('texts-body');
    if (!textsCache.length) {
      body.innerHTML = '<tr><td colspan="5" class="muted">Текстов пока нет — добавьте первый.</td></tr>';
      return;
    }
    body.innerHTML = textsCache
      .map(
        (t) => `
      <tr>
        <td><b>${escapeHtml(t.title)}</b></td>
        <td><span class="badge ${t.lang}">${LANG_LABELS[t.lang] || t.lang}</span></td>
        <td><span class="badge ${t.level}">${LEVEL_LABELS[t.level] || t.level}</span></td>
        <td><div class="text-preview">${escapeHtml(t.content)}</div></td>
        <td>
          <div class="row-actions">
            <button class="btn secondary small" data-edit="${t._id}">Изменить</button>
            <button class="btn danger small" data-delete="${t._id}">Удалить</button>
          </div>
        </td>
      </tr>`
      )
      .join('');
  }

  $('texts-body').addEventListener('click', async (e) => {
    const editId = e.target.getAttribute('data-edit');
    const deleteId = e.target.getAttribute('data-delete');
    if (editId) {
      const t = textsCache.find((x) => x._id === editId);
      if (t) openTextModal(t);
    } else if (deleteId) {
      const t = textsCache.find((x) => x._id === deleteId);
      if (!t) return;
      if (!confirm(`Удалить текст «${t.title}»?`)) return;
      try {
        await KT.api(`/api/admin/texts/${deleteId}`, { method: 'DELETE' });
        await loadTexts();
      } catch (err) {
        alert(err.message);
      }
    }
  });

  function openTextModal(text) {
    $('text-error').textContent = '';
    $('text-modal-title').textContent = text ? 'Редактировать текст' : 'Новый текст';
    $('text-id').value = text ? text._id : '';
    $('text-title').value = text ? text.title : '';
    $('text-lang').value = text ? text.lang : 'ru';
    $('text-level').value = text ? text.level : 'easy';
    $('text-content').value = text ? text.content : '';
    $('text-modal').classList.remove('hidden');
    $('text-title').focus();
  }

  $('texts-new-btn').addEventListener('click', () => openTextModal(null));
  $('text-cancel-btn').addEventListener('click', () => $('text-modal').classList.add('hidden'));

  $('text-save-btn').addEventListener('click', async () => {
    const id = $('text-id').value;
    const payload = {
      title: $('text-title').value.trim(),
      content: $('text-content').value.trim(),
      lang: $('text-lang').value,
      level: $('text-level').value
    };
    if (!payload.title || !payload.content) {
      $('text-error').textContent = 'Заполните заголовок и текст';
      return;
    }
    try {
      $('text-save-btn').disabled = true;
      if (id) {
        await KT.api(`/api/admin/texts/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await KT.api('/api/admin/texts', { method: 'POST', body: JSON.stringify(payload) });
      }
      $('text-modal').classList.add('hidden');
      await loadTexts();
    } catch (err) {
      $('text-error').textContent = err.message;
    } finally {
      $('text-save-btn').disabled = false;
    }
  });

  $('text-content').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) $('text-save-btn').click();
  });

  // ================= Realtime =================
  const socket = io();

  socket.on('texts:changed', () => {
    if (!screens.texts.classList.contains('hidden')) loadTexts();
  });

  socket.on('tick', (state) => renderRound(state));
  socket.on('round:started', (info) => {
    lastTotal = 0;
    renderRound({ active: true, totalChars: 0, participants: [], startedAt: info.startedAt });
  });
  socket.on('round:finished', () => {
    renderRound({ active: false, totalChars: lastTotal, participants: [] });
    refreshStats();
  });
  socket.on('round:state', (state) => renderRound(state));

  // Kahoot-style floating pseudonyms
  socket.on('popup', ({ alias, chars }) => {
    if (screens.dashboard.classList.contains('hidden')) return;
    const layer = $('popup-layer');
    while (layer.children.length >= MAX_POPUPS) {
      layer.removeChild(layer.firstChild);
    }
    const el = document.createElement('div');
    el.className = 'popup';
    el.textContent = `${alias} +${chars}`;
    const rect = layer.getBoundingClientRect();
    const x = 10 + Math.random() * Math.max(rect.width - 220, 50);
    const y = 20 + Math.random() * Math.max(rect.height - 120, 50);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), POPUP_LIFETIME_MS);
  });

  // ================= Boot =================
  if (KT.store.get('kt_admin_token')) {
    enterDashboard();
  } else {
    show('login');
  }
})();
