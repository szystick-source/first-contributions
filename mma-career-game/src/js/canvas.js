// Plays back a fight event timeline on a <canvas>, with animated fighter
// tokens, health/stamina bars, and a flash effect on landed strikes.

export class FightCanvas {
  constructor(canvas, playerName, opponentName) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.playerName = playerName;
    this.opponentName = opponentName;
    this.state = {
      playerHealth: 100,
      opponentHealth: 100,
      playerStamina: 100,
      opponentStamina: 100,
      position: 'standing',
      flash: null, // 'player' | 'opponent'
      caption: '',
    };
    this._timer = null;
  }

  stop() {
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
  }

  playEvents(events, { onEvent, onFinish, speedMs = 380 } = {}) {
    this.stop();
    let i = 0;
    const step = () => {
      if (i >= events.length) {
        onFinish && onFinish();
        return;
      }
      const evt = events[i];
      i += 1;
      this._applyEvent(evt);
      this.draw();
      onEvent && onEvent(evt);
      this._timer = setTimeout(step, evt.type === 'finish' ? speedMs * 2 : speedMs);
    };
    step();
  }

  _applyEvent(evt) {
    if (evt.snapshot) {
      this.state.playerHealth = evt.snapshot.playerHealth;
      this.state.opponentHealth = evt.snapshot.opponentHealth;
      this.state.playerStamina = evt.snapshot.playerStamina;
      this.state.opponentStamina = evt.snapshot.opponentStamina;
      this.state.position = evt.snapshot.position;
    }
    this.state.caption = evt.message || '';
    this.state.flash = null;
    if ((evt.type === 'strike' && evt.landed) || evt.type === 'ground_strike' || evt.type === 'knockdown') {
      this.state.flash = evt.attacker === 'player' ? 'opponent' : 'player';
    }
    if (evt.type === 'takedown' && evt.landed) {
      this.state.flash = evt.attacker === 'player' ? 'opponent' : 'player';
    }
  }

  draw() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Arena background.
    ctx.fillStyle = '#141922';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2a3342';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    this._drawBars();
    this._drawFighters();
    this._drawCaption();
  }

  _drawBars() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    this._drawBar(20, 40, w / 2 - 40, this.playerName, this.state.playerHealth, this.state.playerStamina, 'left');
    this._drawBar(w / 2 + 20, 40, w / 2 - 40, this.opponentName, this.state.opponentHealth, this.state.opponentStamina, 'right');
  }

  _drawBar(x, y, width, name, health, stamina, align) {
    const { ctx } = this;
    ctx.textAlign = align === 'left' ? 'left' : 'right';
    const textX = align === 'left' ? x : x + width;
    ctx.fillStyle = '#e8ebf0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(name, textX, y);

    const barX = align === 'left' ? x : x;
    ctx.fillStyle = '#2a3342';
    ctx.fillRect(barX, y + 8, width, 12);
    ctx.fillStyle = health > 50 ? '#3fbf5f' : health > 20 ? '#e0a83f' : '#d94f4f';
    const hpWidth = width * (health / 100);
    ctx.fillRect(align === 'left' ? barX : barX + (width - hpWidth), y + 8, hpWidth, 12);

    ctx.fillStyle = '#232b38';
    ctx.fillRect(barX, y + 24, width, 6);
    ctx.fillStyle = '#4f8fd9';
    const stWidth = width * (stamina / 100);
    ctx.fillRect(align === 'left' ? barX : barX + (width - stWidth), y + 24, stWidth, 6);
  }

  _drawFighters() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const midY = h / 2 + 30;
    let playerX = w * 0.3;
    let oppX = w * 0.7;

    if (this.state.position === 'ground:player') {
      playerX = w * 0.45;
      oppX = w * 0.55;
    } else if (this.state.position === 'ground:opponent') {
      playerX = w * 0.45;
      oppX = w * 0.55;
    }

    const groundY = this.state.position && this.state.position.startsWith('ground') ? midY + 40 : midY;

    this._drawFighterToken(playerX, groundY, '#4f8fd9', this.state.flash === 'player');
    this._drawFighterToken(oppX, groundY, '#d9704f', this.state.flash === 'opponent');

    if (this.state.position && this.state.position.startsWith('ground')) {
      ctx.fillStyle = '#8a94a6';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('— walka w parterze —', w / 2, groundY + 50);
    }
  }

  _drawFighterToken(x, y, color, flashed) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fillStyle = flashed ? '#ffffff' : color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0b0d10';
    ctx.stroke();
  }

  _drawCaption() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(20, h - 60, w - 40, 40);
    ctx.fillStyle = '#f5f7fa';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.state.caption, w / 2, h - 35);
  }
}
