// Deterministic-ish round based MMA fight simulator.
// Produces a stream of timeline events (for canvas playback) plus a final result.

const TICKS_PER_ROUND = 14;

function rand(min, max) {
  return min + Math.random() * (max - min);
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
    subAttempts: 0,
  };
}

function staminaFactor(c) {
  // Below 40 stamina, effectiveness drops noticeably ("gassing out").
  if (c.stamina > 60) return 1;
  if (c.stamina > 40) return 0.9;
  if (c.stamina > 20) return 0.7;
  return 0.5;
}

function attemptStrike(attacker, defender, events, ctx) {
  attacker.strikesThrown += 1;
  const atkPower = (attacker.skills.striking * 0.6 + attacker.skills.power * 0.4) * staminaFactor(attacker);
  const defSkill = (defender.skills.striking * 0.5 + defender.skills.speed * 0.5) * staminaFactor(defender);
  const hitChance = clamp01(0.35 + (atkPower - defSkill) / 200);
  const landed = Math.random() < hitChance;

  attacker.stamina = Math.max(0, attacker.stamina - rand(3, 6));

  if (!landed) {
    events.push({ ...ctx, type: 'strike', landed: false, attacker: attacker.side, message: `${attacker.name} rzuca cios, ${defender.name} unika.` });
    return;
  }

  attacker.strikesLanded += 1;
  const rawDamage = rand(5, 15) * (attacker.skills.power / 50) * staminaFactor(attacker);
  const mitigation = defender.skills.chin / 220;
  const damage = Math.max(1, rawDamage * (1 - mitigation));
  defender.health = Math.max(0, defender.health - damage);
  defender.stamina = Math.max(0, defender.stamina - damage * 0.5);

  const knockdownChance = clamp01((damage - 3) / 18) * (1 - defender.skills.chin / 150);
  const isKnockdown = defender.health > 0 && Math.random() < knockdownChance;
  // A badly hurt, gassed fighter can be stopped by the referee even without
  // technically reaching zero health ("no longer intelligently defending").
  const refStoppage = defender.health > 0 && defender.health <= 18 && Math.random() < 0.45;

  if (isKnockdown) {
    defender.knockdowns += 1;
    defender.stamina = Math.max(0, defender.stamina - 15);
    events.push({ ...ctx, type: 'knockdown', attacker: attacker.side, defender: defender.side, damage: Math.round(damage), message: `${attacker.name} przewraca ${defender.name} celnym trafieniem!` });
  } else {
    events.push({ ...ctx, type: 'strike', landed: true, attacker: attacker.side, damage: Math.round(damage), message: `${attacker.name} trafia ${defender.name} (obrażenia: ${Math.round(damage)}).` });
  }

  if (defender.health <= 0 || (isKnockdown && defender.knockdowns >= 3) || refStoppage) {
    events.push({ ...ctx, type: 'finish', method: 'KO/TKO', winner: attacker.side, message: `Sędzia przerywa walkę! ${attacker.name} wygrywa przez KO/TKO!` });
    ctx.finished = { method: 'KO/TKO', winnerSide: attacker.side };
  }
}

function attemptTakedown(attacker, defender, events, ctx) {
  const atkSkill = attacker.skills.wrestling * staminaFactor(attacker);
  const defSkill = (defender.skills.wrestling * 0.6 + defender.skills.grappling * 0.4) * staminaFactor(defender);
  const chance = clamp01(0.4 + (atkSkill - defSkill) / 180);
  attacker.stamina = Math.max(0, attacker.stamina - 8);
  const landed = Math.random() < chance;

  if (!landed) {
    events.push({ ...ctx, type: 'takedown', landed: false, attacker: attacker.side, message: `${attacker.name} próbuje obalenia, ${defender.name} broni się.` });
    return null;
  }
  attacker.takedownsLanded += 1;
  events.push({ ...ctx, type: 'takedown', landed: true, attacker: attacker.side, message: `${attacker.name} obala ${defender.name} na matę!` });
  return attacker.side; // side now on top
}

function groundExchange(top, bottom, events, ctx) {
  top.controlTicks += 1;
  const subChance = clamp01((top.skills.grappling - bottom.skills.grappling + 20) / 260) * staminaFactor(top);
  top.subAttempts += 1;

  if (Math.random() < subChance * 0.45) {
    events.push({ ...ctx, type: 'submission_attempt', attacker: top.side, message: `${top.name} szuka duszenia/dźwigni na ${bottom.name}!` });
    const finishChance = clamp01((top.skills.grappling - bottom.skills.grappling) / 60 + 0.15);
    if (Math.random() < finishChance) {
      events.push({ ...ctx, type: 'finish', method: 'Poddanie', winner: top.side, message: `${bottom.name} klepie! ${top.name} wygrywa przez poddanie!` });
      ctx.finished = { method: 'Poddanie', winnerSide: top.side };
      return;
    }
    bottom.stamina = Math.max(0, bottom.stamina - 6);
    return;
  }

  // Ground and pound.
  const dmg = rand(2, 6) * staminaFactor(top);
  bottom.health = Math.max(0, bottom.health - dmg);
  top.stamina = Math.max(0, top.stamina - 4);
  events.push({ ...ctx, type: 'ground_strike', attacker: top.side, damage: Math.round(dmg), message: `${top.name} kontroluje pozycję i uderza z góry.` });

  const groundRefStoppage = bottom.health > 0 && bottom.health <= 15 && Math.random() < 0.4;
  if (bottom.health <= 0 || groundRefStoppage) {
    events.push({ ...ctx, type: 'finish', method: 'KO/TKO', winner: top.side, message: `Sędzia przerywa walkę! ${top.name} wygrywa przez KO/TKO w parterze!` });
    ctx.finished = { method: 'KO/TKO', winnerSide: top.side };
  }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function scoreRound(a, b, aStats, bStats) {
  const aScore = aStats.strikesLanded * 1 + aStats.takedownsLanded * 3 + aStats.controlTicks * 0.5;
  const bScore = bStats.strikesLanded * 1 + bStats.takedownsLanded * 3 + bStats.controlTicks * 0.5;
  if (Math.abs(aScore - bScore) < 0.01) return { a: 10, b: 10 };
  return aScore > bScore ? { a: 10, b: 9 } : { a: 9, b: 10 };
}

export function simulateFight(playerFighter, opponentFighter, opts = {}) {
  const rounds = opts.rounds || (opts.isTitleShot ? 5 : 3);
  const player = makeCombatant(playerFighter, 'player');
  const opponent = makeCombatant(opponentFighter, 'opponent');

  const events = [];
  let position = 'standing'; // 'standing' | 'ground:player' | 'ground:opponent'
  let finished = null;
  const roundScores = [];

  outer:
  for (let round = 1; round <= rounds; round++) {
    events.push({
      round,
      tick: 0,
      type: 'round_start',
      message: `Runda ${round} rozpoczyna się.`,
      snapshot: {
        playerHealth: Math.round(player.health),
        opponentHealth: Math.round(opponent.health),
        playerStamina: Math.round(player.stamina),
        opponentStamina: Math.round(opponent.stamina),
        position,
      },
    });
    const roundStats = {
      player: { strikesLanded: 0, takedownsLanded: 0, controlTicks: 0 },
      opponent: { strikesLanded: 0, takedownsLanded: 0, controlTicks: 0 },
    };

    for (let tick = 1; tick <= TICKS_PER_ROUND; tick++) {
      const ctx = { round, tick, finished: null };
      const eventsBeforeTick = events.length;
      const initiativeToPlayer = (player.skills.speed + Math.random() * 20) >= (opponent.skills.speed + Math.random() * 20);
      const [attacker, defender] = initiativeToPlayer ? [player, opponent] : [opponent, player];

      if (position === 'standing') {
        const wantsTakedown = attacker.skills.wrestling > attacker.skills.striking + 5 && Math.random() < 0.35;
        if (wantsTakedown) {
          const topSide = attemptTakedown(attacker, defender, events, ctx);
          if (topSide) position = `ground:${topSide}`;
        } else {
          attemptStrike(attacker, defender, events, ctx);
        }
      } else {
        const topSide = position.split(':')[1];
        const top = topSide === 'player' ? player : opponent;
        const bottom = topSide === 'player' ? opponent : player;
        groundExchange(top, bottom, events, ctx);
        const stat = roundStats[top.side];
        stat.controlTicks += 1;
        // Chance to scramble back to standing.
        if (Math.random() < 0.25 + (bottom.skills.wrestling - top.skills.wrestling) / 300) {
          position = 'standing';
        }
      }

      // Tally this tick's landed strikes/takedowns into round stats for scoring.
      const lastEvent = events[events.length - 1];
      if (lastEvent.type === 'strike' && lastEvent.landed) roundStats[lastEvent.attacker].strikesLanded += 1;
      if (lastEvent.type === 'takedown' && lastEvent.landed) roundStats[lastEvent.attacker].takedownsLanded += 1;
      if (lastEvent.type === 'ground_strike') roundStats[lastEvent.attacker].strikesLanded += 0.5;

      // Attach a health/stamina/position snapshot to every event emitted this
      // tick so the UI can play back the fight without re-running the sim.
      const snapshot = {
        playerHealth: Math.round(player.health),
        opponentHealth: Math.round(opponent.health),
        playerStamina: Math.round(player.stamina),
        opponentStamina: Math.round(opponent.stamina),
        position,
      };
      for (let i = eventsBeforeTick; i < events.length; i++) events[i].snapshot = snapshot;

      if (ctx.finished) {
        finished = ctx.finished;
        finished.round = round;
        break outer;
      }
    }

    const scores = scoreRound(player, opponent, roundStats.player, roundStats.opponent);
    roundScores.push(scores);
    events.push({
      round,
      tick: TICKS_PER_ROUND,
      type: 'round_end',
      message: `Koniec rundy ${round}. (${scores.a}-${scores.b})`,
      snapshot: {
        playerHealth: Math.round(player.health),
        opponentHealth: Math.round(opponent.health),
        playerStamina: Math.round(player.stamina),
        opponentStamina: Math.round(opponent.stamina),
        position,
      },
    });

    // Recover a little stamina between rounds.
    player.stamina = Math.min(100, player.stamina + 15);
    opponent.stamina = Math.min(100, opponent.stamina + 15);
    position = 'standing';
  }

  let result;
  if (finished) {
    result = {
      method: finished.method,
      round: finished.round,
      winnerSide: finished.winnerSide,
      isDraw: false,
    };
  } else {
    const totalA = roundScores.reduce((s, r) => s + r.a, 0);
    const totalB = roundScores.reduce((s, r) => s + r.b, 0);
    result = {
      method: 'Decyzja sędziów',
      round: rounds,
      winnerSide: totalA === totalB ? null : totalA > totalB ? 'player' : 'opponent',
      isDraw: totalA === totalB,
      scorecards: { player: totalA, opponent: totalB },
    };
  }

  return {
    events,
    result,
    stats: { player, opponent },
  };
}
