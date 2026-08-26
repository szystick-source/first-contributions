import { gameState } from './state.js';
import { WEIGHT_CLASSES, ARCHETYPES, NATIONALITIES, SKILL_KEYS, SKILL_LABELS } from './data.js';
import { createPlayerFighter, overallRating, isInjured, clamp } from './fighter.js';
import { INTENSITIES, runTrainingWeek } from './training.js';
import { advanceWeek } from './calendar.js';
import { simulateFight } from './fightSim.js';
import { payoutFight } from './finance.js';
import { postFightInterviewOptions, applyMediaChoice, applyPersonalEventChoice } from './media.js';
import { FightCanvas } from './canvas.js';

const root = document.getElementById('app');

const ui = {
  screen: 'loading',
  creation: { name: '', nationality: NATIONALITIES[0], weightClassId: WEIGHT_CLASSES[3].id, archetype: 'balanced' },
  trainingFocus: [],
  trainingIntensity: 'normal',
  fightCanvas: null,
  fightLog: [],
  lastFightResult: null,
};

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function render() {
  root.innerHTML = '';
  const screens = {
    loading: renderLoading,
    title: renderTitle,
    creation: renderCreation,
    hub: renderHub,
    training: renderTraining,
    'fight-intro': renderFightIntro,
    'fight-viewer': renderFightViewer,
    'post-fight': renderPostFight,
    'personal-event': renderPersonalEvent,
    retired: renderRetired,
  };
  const fn = screens[ui.screen] || renderTitle;
  root.appendChild(fn());
}

// ---------- Loading / Title ----------

async function init() {
  const loaded = await gameState.load();
  ui.screen = loaded && gameState.data.player ? 'hub' : 'title';
  render();
}

function renderLoading() {
  return el(`<div class="screen title-screen"><h1>MMA Career</h1><p>Wczytywanie...</p></div>`);
}

function renderTitle() {
  const wrap = el(`
    <div class="screen title-screen">
      <h1>MMA CAREER</h1>
      <p>Poprowadź karierę zawodnika MMA od lokalnych gal po mistrzostwo świata.</p>
      <div style="display:flex; gap:10px;">
        <button class="primary" id="new-career">Nowa kariera</button>
      </div>
    </div>
  `);
  wrap.querySelector('#new-career').addEventListener('click', () => {
    ui.screen = 'creation';
    render();
  });
  return wrap;
}

// ---------- Character creation ----------

function renderCreation() {
  const c = ui.creation;
  const wrap = el(`<div class="screen"><h1>Stwórz zawodnika</h1><div class="panel" style="max-width:520px;"></div></div>`);
  const panel = wrap.querySelector('.panel');

  panel.appendChild(el(`
    <div class="card">
      <label>Imię i nazwisko</label><br/>
      <input id="f-name" type="text" placeholder="Losowe, jeśli puste" value="${c.name}" style="width:100%; margin-top:6px;" />
    </div>
  `));

  const natCard = el(`<div class="card"><label>Narodowość</label><br/><select id="f-nat" style="width:100%; margin-top:6px;"></select></div>`);
  const natSelect = natCard.querySelector('#f-nat');
  NATIONALITIES.forEach((n) => natSelect.appendChild(el(`<option value="${n}" ${n === c.nationality ? 'selected' : ''}>${n}</option>`)));
  panel.appendChild(natCard);

  const wcCard = el(`<div class="card"><label>Kategoria wagowa</label><br/><select id="f-wc" style="width:100%; margin-top:6px;"></select></div>`);
  const wcSelect = wcCard.querySelector('#f-wc');
  WEIGHT_CLASSES.forEach((w) => wcSelect.appendChild(el(`<option value="${w.id}" ${w.id === c.weightClassId ? 'selected' : ''}>${w.name} (do ${w.limitKg}kg)</option>`)));
  panel.appendChild(wcCard);

  const archCard = el(`<div class="card"><label>Styl walki</label><div class="choice-list" id="f-arch" style="margin-top:8px;"></div></div>`);
  const archList = archCard.querySelector('#f-arch');
  Object.entries(ARCHETYPES).forEach(([key, def]) => {
    const opt = el(`<div class="focus-option ${key === c.archetype ? 'selected' : ''}" data-key="${key}"><strong>${def.label}</strong></div>`);
    opt.addEventListener('click', () => {
      c.archetype = key;
      render();
    });
    archList.appendChild(opt);
  });
  panel.appendChild(archCard);

  const actions = el(`<div style="display:flex; gap:10px; margin-top:10px;"><button id="back">Wstecz</button><button class="primary" id="confirm">Rozpocznij karierę</button></div>`);
  panel.appendChild(actions);

  panel.querySelector('#f-name').addEventListener('input', (e) => { c.name = e.target.value; });
  panel.querySelector('#f-nat').addEventListener('change', (e) => { c.nationality = e.target.value; });
  panel.querySelector('#f-wc').addEventListener('change', (e) => { c.weightClassId = e.target.value; });
  actions.querySelector('#back').addEventListener('click', () => { ui.screen = 'title'; render(); });
  actions.querySelector('#confirm').addEventListener('click', () => {
    gameState.reset();
    gameState.data.player = createPlayerFighter(c);
    gameState.logEvent(`${gameState.data.player.name} rozpoczyna karierę w MMA!`);
    gameState.save();
    ui.screen = 'hub';
    render();
  });

  return wrap;
}

// ---------- Hub ----------

function fighterCardPanel(fighter) {
  const rows = SKILL_KEYS.map((k) => `
    <div class="stat-row">
      <span>${SKILL_LABELS[k]}</span>
      <div class="bar-track"><div class="bar-fill hp" style="width:${fighter.skills[k]}%"></div></div>
    </div>
  `).join('');

  const wc = WEIGHT_CLASSES.find((w) => w.id === fighter.weightClassId);
  const injuries = fighter.injuries.length
    ? fighter.injuries.map((i) => `<span class="badge">${i.name} (${i.weeksLeft} tyg.)</span>`).join(' ')
    : '<span class="badge">Zdrowy</span>';

  return el(`
    <div class="panel fighter-card">
      <h2>${fighter.name}</h2>
      <div class="badge">${wc ? wc.name : ''}</div>
      <div class="badge">Wiek: ${fighter.age}</div>
      <div class="badge">OVR: ${overallRating(fighter)}</div>
      <p>Rekord: ${fighter.record.wins}W-${fighter.record.losses}L-${fighter.record.draws}D</p>
      <div class="stat-row"><span>Zdrowie</span><div class="bar-track"><div class="bar-fill hp" style="width:${fighter.health}%"></div></div></div>
      <div class="stat-row"><span>Zmęczenie</span><div class="bar-track"><div class="bar-fill stamina" style="width:${fighter.fatigue}%"></div></div></div>
      <div class="stat-row"><span>Morale</span><div class="bar-track"><div class="bar-fill morale" style="width:${fighter.morale}%"></div></div></div>
      <div class="stat-row"><span>Sława</span><div class="bar-track"><div class="bar-fill fame" style="width:${fighter.fame}%"></div></div></div>
      <p>Kontuzje: ${injuries}</p>
      <h3>Statystyki</h3>
      ${rows}
      <h3>Finanse</h3>
      <p>Gotówka: $${fighter.money.toLocaleString('pl-PL')}</p>
      <p>Sponsorzy: ${fighter.sponsors.length ? fighter.sponsors.map((s) => `${s.name} (+$${s.weeklyIncome}/tydz.)`).join(', ') : 'brak'}</p>
      <p>Obserwujący: ${fighter.socialFollowers.toLocaleString('pl-PL')}</p>
    </div>
  `);
}

function renderHub() {
  const fighter = gameState.data.player;
  const wrap = el(`<div class="screen"><div class="grid"><div id="left"></div><div id="right"></div></div></div>`);
  wrap.querySelector('#left').appendChild(fighterCardPanel(fighter));

  const right = wrap.querySelector('#right');
  right.appendChild(el(`<h1>Tydzień ${gameState.data.week}, Rok ${gameState.data.year}</h1>`));

  if (fighter.retired) {
    ui.screen = 'retired';
    render();
    return wrap;
  }

  if (gameState.data.pendingMediaEvent) {
    right.appendChild(el(`<div class="card"><strong>Wymaga uwagi:</strong> masz nierozwiązane wydarzenie osobiste/medialne.</div>`));
    const goBtn = el(`<button class="primary">Zajmij się tym</button>`);
    goBtn.addEventListener('click', () => { ui.screen = 'personal-event'; render(); });
    right.appendChild(goBtn);
  }

  if (gameState.data.pendingOffer && !gameState.data.pendingMediaEvent) {
    const offer = gameState.data.pendingOffer;
    const card = el(`
      <div class="card">
        <h3>Oferta walki: ${offer.orgName} ${offer.isTitleShot ? '<span class="badge">WALKA O PAS</span>' : ''}</h3>
        <p>Przeciwnik: <strong>${offer.opponent.name}</strong> (${offer.opponent.record.wins}-${offer.opponent.record.losses}, sława ${offer.opponent.fame})</p>
        <p>Pula nagród: $${offer.purse.toLocaleString('pl-PL')} + bonus za zwycięstwo $${offer.winBonus.toLocaleString('pl-PL')}</p>
        <div style="display:flex; gap:10px; margin-top:8px;">
          <button class="primary" id="accept">Przyjmij walkę</button>
          <button id="decline">Odrzuć</button>
        </div>
      </div>
    `);
    card.querySelector('#accept').addEventListener('click', () => { ui.screen = 'fight-intro'; render(); });
    card.querySelector('#decline').addEventListener('click', () => {
      gameState.logEvent(`Odrzucono ofertę walki od ${offer.orgName}.`);
      gameState.data.pendingOffer = null;
      gameState.save();
      render();
    });
    right.appendChild(card);
  }

  const canAct = !gameState.data.pendingOffer && !gameState.data.pendingMediaEvent && !fighter.retired;

  const nav = el(`<div class="nav"></div>`);
  const trainBtn = el(`<button class="primary" ${canAct ? '' : 'disabled'}>Trenuj / kolejny tydzień</button>`);
  trainBtn.addEventListener('click', () => { ui.screen = 'training'; render(); });
  nav.appendChild(trainBtn);

  const retireBtn = el(`<button>Zakończ karierę</button>`);
  retireBtn.addEventListener('click', () => {
    if (confirm('Czy na pewno chcesz zakończyć karierę?')) {
      fighter.retired = true;
      gameState.save();
      ui.screen = 'retired';
      render();
    }
  });
  nav.appendChild(retireBtn);
  right.appendChild(nav);

  const logCard = el(`<div class="panel"><h3>Ostatnie wydarzenia</h3><ul class="log-list"></ul></div>`);
  const logList = logCard.querySelector('.log-list');
  gameState.data.events.slice(0, 12).forEach((e) => {
    logList.appendChild(el(`<li>R${e.year} T${e.week}: ${e.text}</li>`));
  });
  right.appendChild(logCard);

  return wrap;
}

// ---------- Training ----------

function renderTraining() {
  const fighter = gameState.data.player;
  const wrap = el(`<div class="screen"><h1>Plan treningowy</h1></div>`);
  const panel = el(`<div class="panel" style="max-width:600px;"></div>`);
  wrap.appendChild(panel);

  if (isInjured(fighter)) {
    panel.appendChild(el(`<p>Jesteś kontuzjowany — trening ograniczony do lekkiej regeneracji.</p>`));
    ui.trainingIntensity = 'light';
  }

  panel.appendChild(el(`<p>Wybierz maksymalnie 2 umiejętności do priorytetowego rozwoju:</p>`));
  const grid = el(`<div class="skill-grid"></div>`);
  SKILL_KEYS.forEach((k) => {
    const selected = ui.trainingFocus.includes(k);
    const opt = el(`<div class="focus-option ${selected ? 'selected' : ''}">${SKILL_LABELS[k]}</div>`);
    opt.addEventListener('click', () => {
      if (ui.trainingFocus.includes(k)) {
        ui.trainingFocus = ui.trainingFocus.filter((x) => x !== k);
      } else if (ui.trainingFocus.length < 2) {
        ui.trainingFocus.push(k);
      }
      render();
    });
    grid.appendChild(opt);
  });
  panel.appendChild(grid);

  panel.appendChild(el(`<p style="margin-top:14px;">Intensywność:</p>`));
  const intensityRow = el(`<div class="choice-list"></div>`);
  Object.entries(INTENSITIES).forEach(([key, def]) => {
    const disabled = isInjured(fighter) && key !== 'light';
    const opt = el(`<div class="focus-option ${ui.trainingIntensity === key ? 'selected' : ''}" style="${disabled ? 'opacity:0.4;pointer-events:none;' : ''}">${def.label} (zmęczenie +${def.fatigue}, ryzyko kontuzji ${Math.round(def.injuryChance * 100)}%)</div>`);
    opt.addEventListener('click', () => { ui.trainingIntensity = key; render(); });
    intensityRow.appendChild(opt);
  });
  panel.appendChild(intensityRow);

  const actions = el(`<div style="display:flex; gap:10px; margin-top:16px;"><button id="back">Wstecz</button><button class="primary" id="go">Trenuj i przejdź do kolejnego tygodnia</button></div>`);
  panel.appendChild(actions);
  actions.querySelector('#back').addEventListener('click', () => { ui.screen = 'hub'; render(); });
  actions.querySelector('#go').addEventListener('click', () => {
    const result = runTrainingWeek(fighter, ui.trainingFocus, ui.trainingIntensity);
    const gains = Object.entries(result.gains).map(([k, v]) => `${SKILL_LABELS[k]} +${v}`).join(', ');
    gameState.logEvent(gains ? `Trening: ${gains}.` : 'Trening bez znaczących postępów.');
    if (result.injury) gameState.logEvent(`Kontuzja podczas treningu: ${result.injury.name}!`);
    advanceWeek(gameState);
    gameState.save();
    ui.trainingFocus = [];
    ui.screen = 'hub';
    render();
  });

  return wrap;
}

// ---------- Fight flow ----------

function renderFightIntro() {
  const offer = gameState.data.pendingOffer;
  const opp = offer.opponent;
  const wrap = el(`
    <div class="screen">
      <h1>${offer.orgName}</h1>
      <div class="panel" style="max-width:600px;">
        <h2>${gameState.data.player.name} vs ${opp.name}</h2>
        <p>${offer.isTitleShot ? 'To walka o pas mistrzowski!' : 'Walka niemistrzowska.'}</p>
        <p>Kategoria: ${offer.weightClass ? offer.weightClass.name : ''}</p>
        <p>Rekord przeciwnika: ${opp.record.wins}-${opp.record.losses}-${opp.record.draws}, sława ${opp.fame}</p>
        <p>Pula: $${offer.purse.toLocaleString('pl-PL')} (+ $${offer.winBonus.toLocaleString('pl-PL')} za zwycięstwo)</p>
        <div style="display:flex; gap:10px; margin-top:12px;">
          <button id="back">Wstecz</button>
          <button class="primary" id="start">Rozpocznij walkę</button>
        </div>
      </div>
    </div>
  `);
  wrap.querySelector('#back').addEventListener('click', () => { ui.screen = 'hub'; render(); });
  wrap.querySelector('#start').addEventListener('click', () => {
    const sim = simulateFight(gameState.data.player, opp, { isTitleShot: offer.isTitleShot });
    ui.lastFightResult = sim;
    ui.screen = 'fight-viewer';
    render();
  });
  return wrap;
}

function renderFightViewer() {
  const offer = gameState.data.pendingOffer;
  const sim = ui.lastFightResult;
  const wrap = el(`
    <div class="screen">
      <h1>${gameState.data.player.name} vs ${offer.opponent.name}</h1>
      <canvas id="fight-canvas" width="760" height="360"></canvas>
      <div id="fight-outcome"></div>
      <div style="text-align:center; margin-top:12px;">
        <button id="skip">Pomiń animację</button>
      </div>
    </div>
  `);

  const canvasEl = wrap.querySelector('#fight-canvas');
  const fc = new FightCanvas(canvasEl, gameState.data.player.name, offer.opponent.name);
  fc.draw();

  const finish = () => {
    fc.stop();
    showFightOutcome(wrap.querySelector('#fight-outcome'), sim, offer);
  };

  fc.playEvents(sim.events, { onFinish: finish });

  wrap.querySelector('#skip').addEventListener('click', () => {
    fc.stop();
    const last = sim.events[sim.events.length - 1];
    if (last && last.snapshot) fc._applyEvent(last);
    fc.draw();
    finish();
  });

  return wrap;
}

function showFightOutcome(container, sim, offer) {
  const fighter = gameState.data.player;
  const won = sim.result.winnerSide === 'player';
  const lost = sim.result.winnerSide === 'opponent';
  const cls = sim.result.isDraw ? 'draw' : won ? 'win' : 'lose';
  const label = sim.result.isDraw ? 'REMIS' : won ? 'ZWYCIĘSTWO' : 'PORAŻKA';

  container.innerHTML = '';
  container.appendChild(el(`
    <div class="result-banner ${cls}">
      ${label} — ${sim.result.method}${sim.result.round ? `, runda ${sim.result.round}` : ''}
    </div>
  `));

  const btn = el(`<div style="text-align:center;"><button class="primary" id="continue">Dalej</button></div>`);
  container.appendChild(btn);
  btn.querySelector('#continue').addEventListener('click', () => {
    finalizeFight(sim, offer, won, lost);
  });
}

function finalizeFight(sim, offer, won, lost) {
  const fighter = gameState.data.player;

  if (won) fighter.record.wins += 1;
  else if (lost) fighter.record.losses += 1;
  else fighter.record.draws += 1;
  if (won && sim.result.method === 'KO/TKO') fighter.record.koWins += 1;
  if (won && sim.result.method === 'Poddanie') fighter.record.subWins += 1;

  const damageTaken = 100 - sim.stats.player.health;
  fighter.health = clamp(fighter.health - damageTaken * 0.4);
  if (damageTaken > 40 && Math.random() < 0.3) {
    fighter.injuries.push({ name: 'Kontuzja powalkowa', severity: 'średnia', weeksLeft: 3 });
    gameState.logEvent('Zawodnik odniósł kontuzję podczas walki.');
  }

  const payout = payoutFight(fighter, offer, won, sim.result.method);
  gameState.logEvent(`${won ? 'Wygrana' : lost ? 'Przegrana' : 'Remis'} z ${offer.opponent.name} (${sim.result.method}). Zarobek: $${payout.total.toLocaleString('pl-PL')}.`);

  ui.pendingInterview = { won, opponentName: offer.opponent.name };
  gameState.data.pendingOffer = null;
  gameState.save();
  ui.screen = 'post-fight';
  render();
}

function renderPostFight() {
  const { won, opponentName } = ui.pendingInterview;
  const options = postFightInterviewOptions(won, opponentName);
  const wrap = el(`
    <div class="screen">
      <h1>Konferencja prasowa</h1>
      <div class="panel" style="max-width:600px;">
        <p>Dziennikarze pytają o Twój występ. Jak reagujesz?</p>
        <div class="choice-list" id="options"></div>
      </div>
    </div>
  `);
  const optionsEl = wrap.querySelector('#options');
  options.forEach((opt) => {
    const btn = el(`<button>${opt.label}</button>`);
    btn.addEventListener('click', () => {
      applyMediaChoice(gameState.data.player, opt);
      gameState.logEvent(`Wywiad: "${opt.label}".`);
      advanceWeek(gameState);
      gameState.save();
      ui.screen = 'hub';
      render();
    });
    optionsEl.appendChild(btn);
  });
  return wrap;
}

// ---------- Personal / media events ----------

function renderPersonalEvent() {
  const event = gameState.data.pendingMediaEvent;
  const wrap = el(`
    <div class="screen">
      <h1>Wydarzenie</h1>
      <div class="panel" style="max-width:600px;">
        <p>${event.text}</p>
        <div class="choice-list" id="options"></div>
      </div>
    </div>
  `);
  const optionsEl = wrap.querySelector('#options');
  event.options.forEach((opt) => {
    const btn = el(`<button>${opt.label}</button>`);
    btn.addEventListener('click', () => {
      applyPersonalEventChoice(gameState.data.player, opt);
      gameState.logEvent(`Wydarzenie: ${event.text} -> "${opt.label}".`);
      gameState.data.pendingMediaEvent = null;
      gameState.save();
      ui.screen = 'hub';
      render();
    });
    optionsEl.appendChild(btn);
  });
  return wrap;
}

// ---------- Retirement ----------

function renderRetired() {
  const fighter = gameState.data.player;
  const wrap = el(`
    <div class="screen title-screen">
      <h1>Koniec kariery</h1>
      <p>${fighter.name} kończy karierę z rekordem ${fighter.record.wins}W-${fighter.record.losses}L-${fighter.record.draws}D.</p>
      <p>Zarobione pieniądze: $${fighter.money.toLocaleString('pl-PL')} | Sława: ${fighter.fame} | Obserwujący: ${fighter.socialFollowers.toLocaleString('pl-PL')}</p>
      <button class="primary" id="new">Nowa kariera</button>
    </div>
  `);
  wrap.querySelector('#new').addEventListener('click', async () => {
    await gameState.deleteSave();
    gameState.reset();
    ui.screen = 'title';
    render();
  });
  return wrap;
}

init();
