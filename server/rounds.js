const { nanoid } = require('nanoid');

const TICK_INTERVAL_MS = 1000;

// In-memory manager for the currently active round (session).
// Emits:  popup   { alias, chars }        -> admin screen, on every correct-char batch
//         tick    { totalChars, participants } -> once per second
//         round:started / round:finished  -> everyone
class RoundManager {
  constructor(io) {
    this.io = io;
    this.round = null;
    this.tickTimer = null;
  }

  isActive() {
    return Boolean(this.round && this.round.status === 'active');
  }

  start() {
    if (this.isActive()) return this.current();
    this.round = {
      id: nanoid(8),
      startedAt: new Date(),
      status: 'active',
      totalChars: 0,
      participants: new Map() // userId -> { alias, chars, cpm, accuracy }
    };
    this.io.emit('round:started', { id: this.round.id, startedAt: this.round.startedAt });
    this._startTicking();
    console.log(`[round] started ${this.round.id}`);
    return this.current();
  }

  addTyping({ userId, alias, chars = 0, cpm = 0, accuracy = 0 }) {
    if (!this.isActive() || !userId || chars <= 0) return;
    let p = this.round.participants.get(userId);
    if (!p) {
      p = { alias: alias || 'Аноним', chars: 0, cpm: 0, accuracy: 0 };
      this.round.participants.set(userId, p);
    }
    if (alias) p.alias = alias;
    p.chars += chars;
    p.cpm = Math.round(cpm);
    p.accuracy = Math.round(accuracy);
    this.round.totalChars += chars;

    // Kahoot-style floating label with the student's pseudonym
    this.io.emit('popup', { alias: p.alias, chars });
  }

  tickPayload() {
    if (!this.round) return { active: false, totalChars: 0, participants: [] };
    const total = this.round.totalChars;
    const participants = [...this.round.participants.entries()]
      .map(([userId, p]) => ({
        userId,
        alias: p.alias,
        chars: p.chars,
        cpm: p.cpm,
        accuracy: p.accuracy,
        share: total > 0 ? Math.round((p.chars / total) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.chars - a.chars);
    return {
      active: this.isActive(),
      id: this.round.id,
      startedAt: this.round.startedAt,
      totalChars: total,
      participants
    };
  }

  current() {
    return this.tickPayload();
  }

  // Finishes the active round and returns the snapshot for persistence.
  finish(label) {
    if (!this.isActive()) return null;
    const state = this.tickPayload();
    this.round.status = 'finished';
    this._stopTicking();
    this.io.emit('round:finished', { id: state.id, label });
    console.log(`[round] finished ${state.id} (${label}): ${state.totalChars} chars`);

    const active = state.participants
      .filter((p) => p.chars > 0)
      .map((p) => ({
        alias: p.alias,
        userId: p.userId,
        chars: p.chars,
        cpm: p.cpm,
        accuracy: p.accuracy,
        share: p.share
      }));
    const avg = (key) =>
      active.length ? Math.round(active.reduce((s, p) => s + p[key], 0) / active.length) : 0;

    const snapshot = {
      label,
      startedAt: this.round.startedAt,
      finishedAt: new Date(),
      totalChars: this.round.totalChars,
      participantsCount: active.length,
      avgCpm: avg('cpm'),
      avgAccuracy: avg('accuracy'),
      participants: active
    };
    this.round = null;
    return snapshot;
  }

  _startTicking() {
    this._stopTicking();
    this.tickTimer = setInterval(() => {
      if (!this.isActive()) return this._stopTicking();
      this.io.emit('tick', this.tickPayload());
    }, TICK_INTERVAL_MS);
  }

  _stopTicking() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }
}

module.exports = RoundManager;
