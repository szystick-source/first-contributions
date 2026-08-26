// Interactive, step-driven MMA fight controller.
//
// Unlike a plain simulate-then-playback function, this runs one exchange
// ("tick") at a time and pauses -- via `this.pending` -- whenever the player
// needs to make a choice: picking a strategy before the fight and between
// rounds, or resolving a timing minigame at a key moment (finishing a hurt
// opponent, defending a takedown, escaping a submission). The UI drains
// `events` produced since its last read and animates them, then calls
// `advance()` again once any pending decision is resolved.

const TICKS_PER_ROUND = 14;

export const STRATEGIES = {
  aggressive: { label: 'Agresywnie', desc: 'Więcej mocy, więcej ryzyka.', dmgMult: 1.3, takenMult: 1.15, staminaMult: 1.25, takedownWeight: 0.7 },
  balanced: { label: 'Wyważona', desc: 'Bez wyraźnych wzmocnień ani osłabień.', dmgMult: 1.0, takenMult: 1.0, staminaMult: 1.0, takedownWeight: 1.0 },
  grappling: { label: 'Zapasy i kontrola', desc: 'Częściej szuka obalenia i pozycji górnej.', dmgMult: 0.85, takenMult: 0.9, staminaMult: 1.1, takedownWeight: 2.0 },
  defensive: { label: 'Defensywna', desc: 'Mniej obrażeń zadanych i otrzymanych, oszczędza siły.', dmgMult: 0.75, takenMult: 0.72, staminaMult: 0.8, takedownWeight: 0.9 },
};

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function makeCombatant(fighter, side) {
  return {
    id: fighter.id,
    name: fighter.name,
    side,
    skills: fighter.skills,
    health: 100,
    stamina: 100,
    knockdowns: 0,
    strikesLanded: 0,
    strikesThrown: 0,
    takedownsLanded: 0,
    controlTicks: 0,
  };
}

function staminaFactor(c) {
  if (c.stamina > 60) return 1;
  if (c.stamina > 40) return 0.9;
  if (c.stamina > 20) return 0.7;
  return 0.5;
}

function other(side) {
  return side === 'player' ? 'opponent' : 'player';
}

export class FightController {
  constructor(playerFighter, opponentFighter, opts = {}) {
    this.rounds = opts.rounds || (opts.isTitleShot ? 5 : 3);
    this.round = 1;
    this.position = 'standing';
    this.finished = null;
    this.result = null;
    this.strategy = { player: 'balanced' };
    this.minigameCooldown = 0;
    this.roundStats = this._freshRoundStats();
    this.roundScores = [];
    this.events = [];
    this.combatants = {
      player: makeCombatant(playerFighter, 'player'),
      opponent: makeCombatant(opponentFighter, 'opponent'),
    };
    this.pending = { type: 'strategy', context: 'prefight' };
  }

  _freshRoundStats() {
    return {
      player: { strikesLanded: 0, takedownsLanded: 0, controlTicks: 0 },
      opponent: { strikesLanded: 0, takedownsLanded: 0, controlTicks: 0 },
    };
  }

  snapshot() {
    const p = this.combatants.player;
    const o = this.combatants.opponent;
    return {
      playerHealth: Math.round(p.health),
      opponentHealth: Math.round(o.health),
      playerStamina: Math.round(p.stamina),
      opponentStamina: Math.round(o.stamina),
      position: this.position,
    };
  }

  setStrategy(key) {
    this.strategy.player = key;
    if (this.pending && this.pending.type === 'strategy') this.pending = null;
  }

  _push(evt) {
    evt.round = this.round;
    evt.snapshot = this.snapshot();
    this.events.push(evt);
  }

  _strategyOf(side) {
    return STRATEGIES[side === 'player' ? this.strategy.player : 'balanced'];
  }

  // Runs ticks until a decision is required (this.pending set) or the fight ends.
  advance() {
    if (this.finished || this.pending) return;
    while (!this.pending && !this.finished) {
      this._tick();
    }
  }

  resolveMinigame(success) {
    const pending = this.pending;
    this.pending = null;
    this.minigameCooldown = 3;
    if (pending.kind === 'finish_strike') {
      this._resolveStrike(pending.attacker, pending.defender, success ? 1.7 : 0.4);
    } else if (pending.kind === 'defend_takedown') {
      this._resolveTakedown(pending.attacker, pending.defender, success ? false : true);
    } else if (pending.kind === 'defend_submission') {
      this._resolveSubmission(pending.top, pending.bottom, success ? -1 : 1.6);
    }
    if (!this.finished) this.advance();
  }

  _tick() {
    if (this.minigameCooldown > 0) this.minigameCooldown -= 1;
    const stats = this.roundStats;
    const p = this.combatants.player;
    const o = this.combatants.opponent;
    const initiativeToPlayer = p.skills.speed + Math.random() * 20 >= o.skills.speed + Math.random() * 20;
    const attacker = initiativeToPlayer ? p : o;
    const defender = initiativeToPlayer ? o : p;

    if (this.position === 'standing') {
      const takedownWeight = this._strategyOf(attacker.side).takedownWeight;
      const wantsTakedown = attacker.skills.wrestling * takedownWeight > attacker.skills.striking + 5 && Math.random() < 0.35;
      if (wantsTakedown) {
        if (attacker.side === 'opponent' && this.minigameCooldown === 0 && Math.random() < 0.75) {
          this.pending = { type: 'minigame', kind: 'defend_takedown', attacker: attacker.side, defender: defender.side };
          return;
        }
        this._resolveTakedown(attacker.side, defender.side);
      } else {
        if (attacker.side === 'player' && defender.health <= 40 && defender.health > 0 && this.minigameCooldown === 0 && Math.random() < 0.75) {
          this.pending = { type: 'minigame', kind: 'finish_strike', attacker: attacker.side, defender: defender.side };
          return;
        }
        this._resolveStrike(attacker.side, defender.side, 1);
      }
    } else {
      const topSide = this.position.split(':')[1];
      const bottomSide = other(topSide);
      const top = this.combatants[topSide];
      const bottom = this.combatants[bottomSide];
      const wantsSub = Math.random() < clamp01((top.skills.grappling - bottom.skills.grappling + 20) / 260) * staminaFactor(top) * 0.45;
      if (wantsSub) {
        if (bottomSide === 'player' && this.minigameCooldown === 0 && Math.random() < 0.75) {
          this.pending = { type: 'minigame', kind: 'defend_submission', top: topSide, bottom: bottomSide };
          return;
        }
        this._resolveSubmission(topSide, bottomSide, 1);
      } else {
        this._resolveGroundPound(topSide, bottomSide);
        stats[topSide].controlTicks += 1;
        if (!this.finished && Math.random() < 0.25 + (bottom.skills.wrestling - top.skills.wrestling) / 300) {
          this.position = 'standing';
        }
      }
    }

    if (!this.pending && !this.finished) {
      this._maybeEndTick();
    }
  }

  _maybeEndTick() {
    this._tickCount = (this._tickCount || 0) + 1;
    if (this._tickCount >= TICKS_PER_ROUND) {
      this._tickCount = 0;
      this._endRound();
    }
  }

  _resolveStrike(attackerSide, defenderSide, biasMult) {
    const attacker = this.combatants[attackerSide];
    const defender = this.combatants[defenderSide];
    const strat = this._strategyOf(attackerSide);
    const defStrat = this._strategyOf(defenderSide);
    attacker.strikesThrown += 1;

    const atkPower = (attacker.skills.striking * 0.6 + attacker.skills.power * 0.4) * staminaFactor(attacker);
    const defSkill = (defender.skills.striking * 0.5 + defender.skills.speed * 0.5) * staminaFactor(defender);
    const hitChance = clamp01(0.35 + (atkPower - defSkill) / 200);
    const landed = Math.random() < hitChance || biasMult > 1.3;
    attacker.stamina = Math.max(0, attacker.stamina - rand(3, 6) * strat.staminaMult);

    if (!landed) {
      this._push({ type: 'strike', landed: false, attacker: attackerSide, message: `${attacker.name} rzuca cios, ${defender.name} unika.`, pose: this._pose(attackerSide, 'punch_miss', 'dodge') });
      return;
    }

    attacker.strikesLanded += 1;
    this.roundStats[attackerSide].strikesLanded += 1;
    const rawDamage = rand(5, 15) * (attacker.skills.power / 50) * staminaFactor(attacker) * strat.dmgMult * biasMult;
    const mitigation = (defender.skills.chin / 220) * (2 - defStrat.takenMult);
    const damage = Math.max(1, rawDamage * (1 - mitigation) * defStrat.takenMult);
    defender.health = Math.max(0, defender.health - damage);
    defender.stamina = Math.max(0, defender.stamina - damage * 0.5);

    const knockdownChance = clamp01((damage - 3) / 18) * (1 - defender.skills.chin / 150);
    const isKnockdown = defender.health > 0 && Math.random() < knockdownChance;
    const refStoppage = defender.health > 0 && defender.health <= 18 && Math.random() < 0.45;

    if (isKnockdown) {
      defender.knockdowns += 1;
      defender.stamina = Math.max(0, defender.stamina - 15);
      this._push({ type: 'knockdown', attacker: attackerSide, defender: defenderSide, damage: Math.round(damage), message: `${attacker.name} przewraca ${defender.name} celnym trafieniem!`, pose: this._pose(attackerSide, 'punch_landed', 'knockdown') });
    } else {
      this._push({ type: 'strike', landed: true, attacker: attackerSide, damage: Math.round(damage), message: `${attacker.name} trafia ${defender.name} (obrażenia: ${Math.round(damage)}).`, pose: this._pose(attackerSide, 'punch_landed', 'hit') });
    }

    if (defender.health <= 0 || (isKnockdown && defender.knockdowns >= 3) || refStoppage) {
      this._finish('KO/TKO', attackerSide, 'victory', 'knockdown');
    }
  }

  _resolveTakedown(attackerSide, defenderSide, forcedResult) {
    const attacker = this.combatants[attackerSide];
    const defender = this.combatants[defenderSide];
    const strat = this._strategyOf(attackerSide);
    const atkSkill = attacker.skills.wrestling * staminaFactor(attacker) * strat.takedownWeight;
    const defSkill = (defender.skills.wrestling * 0.6 + defender.skills.grappling * 0.4) * staminaFactor(defender);
    const chance = clamp01(0.4 + (atkSkill - defSkill) / 180);
    attacker.stamina = Math.max(0, attacker.stamina - 8);
    const landed = forcedResult !== undefined ? forcedResult : Math.random() < chance;

    if (!landed) {
      this._push({ type: 'takedown', landed: false, attacker: attackerSide, message: `${attacker.name} próbuje obalenia, ${defender.name} broni się.`, pose: this._pose(attackerSide, 'takedown_shoot', 'sprawl') });
      return;
    }
    attacker.takedownsLanded += 1;
    this.roundStats[attackerSide].takedownsLanded += 1;
    this.position = `ground:${attackerSide}`;
    this._push({ type: 'takedown', landed: true, attacker: attackerSide, message: `${attacker.name} obala ${defender.name} na matę!`, pose: this._pose(attackerSide, 'takedown_shoot', 'ground_bottom') });
  }

  _resolveSubmission(topSide, bottomSide, biasMult) {
    const top = this.combatants[topSide];
    const bottom = this.combatants[bottomSide];
    this._push({ type: 'submission_attempt', attacker: topSide, message: `${top.name} szuka duszenia/dźwigni na ${bottom.name}!`, pose: this._pose(topSide, 'ground_top_sub', 'ground_bottom_defend') });

    if (biasMult < 0) {
      bottom.stamina = Math.max(0, bottom.stamina - 3);
      this._push({ type: 'escape', attacker: bottomSide, message: `${bottom.name} wyrywa się z uchwytu!`, pose: this._pose(bottomSide, 'escape', null) });
      return;
    }

    const finishChance = clamp01(((top.skills.grappling - bottom.skills.grappling) / 60 + 0.15) * biasMult);
    if (Math.random() < finishChance) {
      this._finish('Poddanie', topSide, 'ground_top_sub', 'tap');
      return;
    }
    bottom.stamina = Math.max(0, bottom.stamina - 6 * biasMult);
  }

  _resolveGroundPound(topSide, bottomSide) {
    const top = this.combatants[topSide];
    const bottom = this.combatants[bottomSide];
    const strat = this._strategyOf(topSide);
    const dmg = rand(2, 6) * staminaFactor(top) * strat.dmgMult;
    bottom.health = Math.max(0, bottom.health - dmg);
    top.stamina = Math.max(0, top.stamina - 4);
    this.roundStats[topSide].strikesLanded += 0.5;
    this._push({ type: 'ground_strike', attacker: topSide, damage: Math.round(dmg), message: `${top.name} kontroluje pozycję i uderza z góry.`, pose: this._pose(topSide, 'ground_top_strike', 'ground_bottom') });

    const groundRefStoppage = bottom.health > 0 && bottom.health <= 15 && Math.random() < 0.4;
    if (bottom.health <= 0 || groundRefStoppage) {
      this._finish('KO/TKO', topSide, 'victory', 'knockdown');
    }
  }

  _pose(attackerSide, attackerPose, defenderPose) {
    const defenderSide = other(attackerSide);
    const pose = { [attackerSide]: attackerPose };
    if (defenderPose) pose[defenderSide] = defenderPose;
    return pose;
  }

  _finish(method, winnerSide, winnerPose, loserPose) {
    this.finished = { method, round: this.round, winnerSide };
    this._push({
      type: 'finish',
      method,
      winner: winnerSide,
      message: method === 'KO/TKO'
        ? `Sędzia przerywa walkę! ${this.combatants[winnerSide].name} wygrywa przez KO/TKO!`
        : `${this.combatants[other(winnerSide)].name} klepie! ${this.combatants[winnerSide].name} wygrywa przez poddanie!`,
      pose: this._pose(winnerSide, winnerPose, loserPose),
    });
    this.result = { method, round: this.round, winnerSide, isDraw: false };
  }

  _endRound() {
    const stats = this.roundStats;
    const a = stats.player;
    const b = stats.opponent;
    const aScore = a.strikesLanded + a.takedownsLanded * 3 + a.controlTicks * 0.5;
    const bScore = b.strikesLanded + b.takedownsLanded * 3 + b.controlTicks * 0.5;
    const scores = Math.abs(aScore - bScore) < 0.01 ? { a: 10, b: 10 } : aScore > bScore ? { a: 10, b: 9 } : { a: 9, b: 10 };
    this.roundScores.push(scores);
    this._push({ type: 'round_end', message: `Koniec rundy ${this.round}. (${scores.a}-${scores.b})` });

    this.combatants.player.stamina = Math.min(100, this.combatants.player.stamina + 15);
    this.combatants.opponent.stamina = Math.min(100, this.combatants.opponent.stamina + 15);
    this.position = 'standing';
    this.roundStats = this._freshRoundStats();

    if (this.round >= this.rounds) {
      const totalA = this.roundScores.reduce((s, r) => s + r.a, 0);
      const totalB = this.roundScores.reduce((s, r) => s + r.b, 0);
      this.finished = { method: 'Decyzja sędziów', round: this.rounds, winnerSide: totalA === totalB ? null : totalA > totalB ? 'player' : 'opponent' };
      this.result = {
        method: 'Decyzja sędziów',
        round: this.rounds,
        winnerSide: this.finished.winnerSide,
        isDraw: totalA === totalB,
        scorecards: { player: totalA, opponent: totalB },
      };
      return;
    }

    this.round += 1;
    this.pending = { type: 'strategy', context: 'between-rounds' };
    this._push({ type: 'round_start', message: `Runda ${this.round} rozpoczyna się.` });
  }
}
