// Renders the fight as two animated stick figures on a <canvas>, driven by
// smooth exponential interpolation towards whatever pose/snapshot the fight
// flow last pushed in -- so every strike, dodge, and takedown reads as
// motion instead of a static snapshot swap.

const HIP = [0, -50];
const NECK = [0, -85];
const HEAD = [0, -97];

// Each pose gives absolute local-space joint coordinates for the "front"
// (forward-facing) limb pair and the "back" limb pair, plus small lean
// deltas for head/neck/hip. Mirrored across x by `facing` at draw time.
const POSES = {
  idle: { hand: [10, -92], elbow: [8, -80], handB: [-8, -96], elbowB: [-10, -82], foot: [10, 0], knee: [6, -25], footB: [-14, 0], kneeB: [-10, -25], head: [0, 0], neck: [0, 0], hip: [0, 0] },
  punch_landed: { hand: [38, -86], elbow: [21, -86], handB: [-8, -96], elbowB: [-10, -82], foot: [12, 0], knee: [7, -25], footB: [-16, 0], kneeB: [-10, -25], head: [4, -2], neck: [2, -1], hip: [1, 0] },
  punch_miss: { hand: [34, -84], elbow: [19, -84], handB: [-8, -96], elbowB: [-10, -82], foot: [12, 0], knee: [7, -25], footB: [-16, 0], kneeB: [-10, -25], head: [2, -1], neck: [1, 0], hip: [0, 0] },
  hit: { hand: [6, -90], elbow: [6, -78], handB: [-14, -90], elbowB: [-14, -78], foot: [6, 2], knee: [4, -24], footB: [-18, 0], kneeB: [-12, -25], head: [-9, 3], neck: [-4, 1], hip: [-2, 0] },
  dodge: { hand: [8, -90], elbow: [8, -78], handB: [-10, -92], elbowB: [-10, -80], foot: [8, 0], knee: [6, -25], footB: [-16, 2], kneeB: [-10, -24], head: [-15, -6], neck: [-6, -2], hip: [-2, 0] },
  sprawl: { hand: [16, -42], elbow: [14, -58], handB: [10, -40], elbowB: [8, -58], foot: [24, 0], knee: [16, -18], footB: [-24, 0], kneeB: [-16, -18], head: [6, 16], neck: [4, 11], hip: [2, 7] },
  takedown_shoot: { hand: [30, -16], elbow: [22, -38], handB: [24, -8], elbowB: [18, -32], foot: [22, 0], knee: [16, -20], footB: [-6, 0], kneeB: [-4, -24], head: [18, 22], neck: [11, 15], hip: [6, 7] },
  escape: { hand: [10, -88], elbow: [8, -76], handB: [-16, -94], elbowB: [-16, -80], foot: [10, 0], knee: [6, -25], footB: [-18, 2], kneeB: [-12, -24], head: [-10, -4], neck: [-5, -1], hip: [-2, 0] },
  victory: { hand: [16, -112], elbow: [14, -98], handB: [-16, -112], elbowB: [-14, -98], foot: [10, 0], knee: [6, -25], footB: [-10, 0], kneeB: [-6, -25], head: [0, -2], neck: [0, -1], hip: [0, 0] },
};

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpPt(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }
function lerpPose(a, b, t) {
  const out = {};
  for (const k of Object.keys(a)) out[k] = lerpPt(a[k], b[k] || a[k], t);
  return out;
}

export class FightCanvas {
  constructor(canvas, playerName, opponentName) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.playerName = playerName;
    this.opponentName = opponentName;

    this.display = { playerHealth: 100, opponentHealth: 100, playerStamina: 100, opponentStamina: 100, playerX: 0.3, opponentX: 0.7, groundLift: 0 };
    this.target = { playerHealth: 100, opponentHealth: 100, playerStamina: 100, opponentStamina: 100, position: 'standing' };
    this.pose = { player: 'idle', opponent: 'idle' };
    this.currentPose = { player: { ...POSES.idle }, opponent: { ...POSES.idle } };
    this.targetPose = { player: 'idle', opponent: 'idle' };
    this.groundMode = { player: 'standing', opponent: 'standing' }; // 'standing' | 'ground_top' | 'ground_bottom' | 'down'
    this.caption = '';
    this.captionTarget = '';
    this.flashUntil = { player: 0, opponent: 0 };

    this._raf = null;
    this._lastT = null;
  }

  start() {
    if (this._raf) return;
    this._lastT = performance.now();
    const loop = (t) => {
      const dt = Math.min(64, t - this._lastT);
      this._lastT = t;
      this._step(dt);
      this.draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  // Called once per fight event: sets the new target bars/position/poses;
  // the render loop eases towards them every frame.
  applyEvent(evt) {
    if (evt.snapshot) {
      this.target.playerHealth = evt.snapshot.playerHealth;
      this.target.opponentHealth = evt.snapshot.opponentHealth;
      this.target.playerStamina = evt.snapshot.playerStamina;
      this.target.opponentStamina = evt.snapshot.opponentStamina;
      this.target.position = evt.snapshot.position;
    }
    this.captionTarget = evt.message || '';

    const now = performance.now();
    if (evt.type === 'finish') {
      const loserSide = evt.winner === 'player' ? 'opponent' : 'player';
      this.groundMode[evt.winner] = evt.method === 'Poddanie' ? this.groundMode[evt.winner] : 'standing';
      this._setPose(evt.winner, 'victory');
      this.groundMode[loserSide] = evt.method === 'KO/TKO' ? 'down' : this.groundMode[loserSide];
      if (evt.method === 'KO/TKO') this._setPose(loserSide, 'idle');
      return;
    }

    if (evt.pose) {
      for (const side of Object.keys(evt.pose)) {
        const poseName = evt.pose[side];
        if (poseName === 'ground_bottom' || poseName === 'ground_bottom_defend') {
          this.groundMode[side] = 'ground_bottom';
        } else if (poseName === 'ground_top_strike' || poseName === 'ground_top_sub') {
          this.groundMode[side] = 'ground_top';
        } else if (poseName === 'knockdown') {
          this.groundMode[side] = 'down';
          this.flashUntil[side] = now + 700;
        } else {
          this.groundMode[side] = 'standing';
          this._setPose(side, poseName);
        }
        if (poseName === 'punch_landed') this.flashUntil[side === 'player' ? 'opponent' : 'player'] = now + 160;
      }
    }

    if (evt.type === 'takedown' && evt.landed) {
      this.groundMode[evt.attacker] = 'ground_top';
    }

    if (this.target.position === 'standing' && evt.type !== 'finish') {
      this.groundMode.player = this.groundMode.player === 'down' ? 'down' : 'standing';
      this.groundMode.opponent = this.groundMode.opponent === 'down' ? 'down' : 'standing';
    }
  }

  resetIdle() {
    this.groundMode = { player: 'standing', opponent: 'standing' };
    this._setPose('player', 'idle');
    this._setPose('opponent', 'idle');
  }

  _setPose(side, name) {
    if (!POSES[name]) name = 'idle';
    this.targetPose[side] = name;
  }

  _step(dt) {
    const k = 1 - Math.exp(-dt / 140);
    for (const key of ['playerHealth', 'opponentHealth', 'playerStamina', 'opponentStamina']) {
      this.display[key] = lerp(this.display[key], this.target[key], k);
    }

    const groundTargetX = { player: 0.44, opponent: 0.56 };
    const standTargetX = { player: 0.28, opponent: 0.72 };
    for (const side of ['player', 'opponent']) {
      const targetX = this.groundMode[side] !== 'standing' || this.groundMode[otherSide(side)] !== 'standing' ? groundTargetX[side] : standTargetX[side];
      const key = side + 'X';
      this.display[key] = lerp(this.display[key], targetX, k);
    }

    for (const side of ['player', 'opponent']) {
      const tName = this.targetPose[side];
      const target = POSES[tName] || POSES.idle;
      this.currentPose[side] = lerpPose(this.currentPose[side], target, Math.min(1, k * 1.6));
    }

    if (this.caption !== this.captionTarget) this.caption = this.captionTarget;
  }

  draw() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#141110';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3d2f24';
    ctx.lineWidth = 5;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    this._drawBars();
    this._drawFighter('player', this.display.playerX * w, '#4a95c9');
    this._drawFighter('opponent', this.display.opponentX * w, '#ff4d2e');

    if (this.groundMode.player !== 'standing' || this.groundMode.opponent !== 'standing') {
      ctx.fillStyle = '#a9998a';
      ctx.font = '13px "Source Sans 3", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('— walka w parterze —', w / 2, h / 2 + 82);
    }

    this._drawCaption();
  }

  _drawBars() {
    const { canvas } = this;
    const w = canvas.width;
    this._drawBar(24, 34, w / 2 - 48, this.playerName, this.display.playerHealth, this.display.playerStamina, 'left');
    this._drawBar(w / 2 + 24, 34, w / 2 - 48, this.opponentName, this.display.opponentHealth, this.display.opponentStamina, 'right');
  }

  _drawBar(x, y, width, name, health, stamina, align) {
    const { ctx } = this;
    ctx.textAlign = align === 'left' ? 'left' : 'right';
    const textX = align === 'left' ? x : x + width;
    ctx.fillStyle = '#f3ece1';
    ctx.font = '600 15px "Oswald", sans-serif';
    ctx.fillText(name.toUpperCase(), textX, y);

    ctx.fillStyle = '#241d18';
    ctx.fillRect(x, y + 8, width, 11);
    ctx.fillStyle = health > 50 ? '#45b06f' : health > 20 ? '#d4a53a' : '#e2503a';
    const hpWidth = width * (health / 100);
    ctx.fillRect(align === 'left' ? x : x + (width - hpWidth), y + 8, hpWidth, 11);

    ctx.fillStyle = '#201a15';
    ctx.fillRect(x, y + 23, width, 5);
    ctx.fillStyle = '#4a95c9';
    const stWidth = width * (stamina / 100);
    ctx.fillRect(align === 'left' ? x : x + (width - stWidth), y + 23, stWidth, 5);
  }

  _drawFighter(side, ox, color) {
    const mode = this.groundMode[side];
    const groundY = this.canvas.height / 2 + 46;
    const facing = side === 'player' ? 1 : -1;
    const flashed = performance.now() < this.flashUntil[side];
    const drawColor = flashed ? '#ffffff' : color;

    if (mode === 'down') {
      this._drawDown(ox, groundY, facing, drawColor);
    } else if (mode === 'ground_bottom') {
      this._drawGroundBottom(ox, groundY + 26, facing, drawColor);
    } else if (mode === 'ground_top') {
      this._drawGroundTop(ox, groundY + 6, facing, drawColor);
    } else {
      this._drawStanding(ox, groundY, facing, this.currentPose[side], drawColor);
    }
  }

  _tx(ox, groundY, facing, pt) {
    return [ox + pt[0] * facing, groundY + pt[1]];
  }

  _line(a, b, color, width = 5) {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }

  _drawStanding(ox, groundY, facing, pose, color) {
    const tx = (pt) => this._tx(ox, groundY, facing, pt);
    const hip = [HIP[0] + pose.hip[0], HIP[1] + pose.hip[1]];
    const neck = [NECK[0] + pose.neck[0], NECK[1] + pose.neck[1]];
    const head = [HEAD[0] + pose.head[0], HEAD[1] + pose.head[1]];

    this._line(tx(hip), tx(neck), color);
    this._line(tx(hip), tx(pose.knee), color);
    this._line(tx(pose.knee), tx(pose.foot), color);
    this._line(tx(hip), tx(pose.kneeB), color);
    this._line(tx(pose.kneeB), tx(pose.footB), color);
    this._line(tx(neck), tx(pose.elbowB), color, 4);
    this._line(tx(pose.elbowB), tx(pose.handB), color, 4);
    this._line(tx(neck), tx(pose.elbow), color, 4);
    this._line(tx(pose.elbow), tx(pose.hand), color, 4);

    const hp = tx(head);
    this.ctx.beginPath();
    this.ctx.fillStyle = color;
    this.ctx.arc(hp[0], hp[1], 10, 0, Math.PI * 2);
    this.ctx.fill();
  }

  _drawGroundBottom(ox, groundY, facing, color) {
    const tx = (pt) => this._tx(ox, groundY, facing, pt);
    const hip = tx([-18, -6]);
    const chest = tx([6, -10]);
    const head = tx([20, -12]);
    this._line(hip, chest, color);
    this._line(chest, head, color, 4);
    this._line(hip, tx([-30, -22]), color);
    this._line(tx([-30, -22]), tx([-24, -2]), color);
    this._line(hip, tx([-14, -24]), color);
    this._line(tx([-14, -24]), tx([-2, -8]), color);
    this._line(chest, tx([2, 4]), color, 4);
    this.ctx.beginPath();
    this.ctx.fillStyle = color;
    this.ctx.arc(head[0], head[1], 9, 0, Math.PI * 2);
    this.ctx.fill();
  }

  _drawGroundTop(ox, groundY, facing, color) {
    const tx = (pt) => this._tx(ox, groundY, facing, pt);
    const hip = tx([-4, -6]);
    const chest = tx([16, -34]);
    const head = tx([26, -44]);
    this._line(hip, chest, color);
    this._line(chest, head, color, 4);
    this._line(hip, tx([-16, -2]), color);
    this._line(tx([-16, -2]), tx([-22, -18]), color);
    this._line(hip, tx([10, 4]), color);
    this._line(tx([10, 4]), tx([2, -14]), color);
    this._line(chest, tx([2, -18]), color, 4);
    this._line(tx([2, -18]), tx([-8, -30]), color, 4);
    this._line(chest, tx([30, -14]), color, 4);
    this.ctx.beginPath();
    this.ctx.fillStyle = color;
    this.ctx.arc(head[0], head[1], 9, 0, Math.PI * 2);
    this.ctx.fill();
  }

  _drawDown(ox, groundY, facing, color) {
    const tx = (pt) => this._tx(ox, groundY, facing, pt);
    const hip = tx([-14, -8]);
    const chest = tx([12, -6]);
    const head = tx([28, -6]);
    this._line(hip, chest, color);
    this._line(chest, head, color, 4);
    this._line(hip, tx([-28, -2]), color);
    this._line(hip, tx([-24, -16]), color);
    this._line(chest, tx([4, 6]), color, 4);
    this._line(chest, tx([10, -18]), color, 4);
    this.ctx.beginPath();
    this.ctx.fillStyle = color;
    this.ctx.arc(head[0], head[1], 9, 0, Math.PI * 2);
    this.ctx.fill();
  }

  _drawCaption() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = 'rgba(16,13,12,0.72)';
    ctx.fillRect(16, h - 54, w - 32, 38);
    ctx.fillStyle = '#f3ece1';
    ctx.font = '14px "Source Sans 3", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.caption, w / 2, h - 30);
  }
}

function otherSide(side) { return side === 'player' ? 'opponent' : 'player'; }
