import { gameState } from './state.js';
import { WEIGHT_CLASSES, ARCHETYPES, NATIONALITIES, SKILL_KEYS, SKILL_LABELS, ORGANIZATIONS, getOrganization } from './data.js';
import { createPlayerFighter, overallRating, isInjured, clamp } from './fighter.js';
import { INTENSITIES, runTrainingWeek } from './training.js';
import { advanceWeek } from './calendar.js';
import { applyFightOutcome } from './matchmaking.js';
import { FightController, STRATEGIES } from './fightSim.js';
import { payoutFight } from './finance.js';
import { postFightInterviewOptions, applyMediaChoice, applyPersonalEventChoice } from './media.js';
import { getRoster, buildDisplayRanking } from './roster.js';
import { FightCanvas } from './canvas.js';

const root = document.getElementById('app');

const ui = {
  screen: 'loading',
  tab: 'dashboard',
  creation: { name: '', nationality: NATIONALITIES[0], weightClassId: WEIGHT_CLASSES[3].id, archetype: 'balanced' },
  trainingFocus: [],
  trainingIntensity: 'normal',
  rankingOrgId: null,
  rankingWeightClassId: null,
  confirmingRetire: false,
  confirmingDeleteId: null,
  fight: null, // { ctrl, canvas, eventCursor, offer }
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
    menu: renderMenu,
    creation: renderCreation,
    shell: renderShell,
    'fight-intro': renderFightIntro,
    'fight-viewer': renderFightViewer,
    'post-fight': renderPostFight,
    'personal-event': renderPersonalEvent,
    retired: renderRetired,
  };
  const fn = screens[ui.screen] || renderMenu;
  root.appendChild(fn());
}

// ---------- Loading / Career menu ----------

async function init() {
  const loaded = await gameState.load();
  const active = loaded && gameState.data && gameState.data.player;
  ui.screen = active && !gameState.data.player.retired ? 'shell' : 'menu';
  ui.tab = 'dashboard';
  render();
}

function renderLoading() {
  return el(`<div class="screen title-screen"><h1>MMA Career</h1><p>Wczytywanie...</p></div>`);
}

function careerSummaryLine(data) {
  const f = data.player;
  const org = getOrganization(f.orgId);
  const rankLabel = f.retired ? 'Zakończona' : f.rank == null ? 'Niesklasyfikowany' : f.rank === 0 ? 'Mistrz' : `#${f.rank + 1}`;
  return `${org.name} &middot; ${rankLabel} &middot; ${f.record.wins}W-${f.record.losses}L-${f.record.draws}D`;
}

function renderMenu() {
  const careers = gameState.listCareers().filter((c) => c.data.player);
  const wrap = el(`
    <div class="screen title-screen fade-in">
      <h1>MMA CAREER</h1>
      <p>${careers.length ? 'Wybierz karierę, którą chcesz kontynuować, albo zacznij nową.' : 'Poprowadź karierę zawodnika MMA od lokalnej gali po pas mistrzowski UFC.'}</p>
      <div class="career-list" id="career-list"></div>
      <button class="primary" id="new-career">Nowa kariera</button>
    </div>
  `);

  const list = wrap.querySelector('#career-list');
  careers.forEach(({ id, data }) => {
    const f = data.player;
    const card = el(`
      <div class="card career-card">
        <h3 style="margin:0 0 4px;">${f.name}</h3>
        <p style="margin:0 0 4px; color:var(--text-dim); font-size:0.88rem;">${careerSummaryLine(data)}</p>
        <p style="margin:0 0 10px; color:var(--text-faint); font-size:0.8rem;">Tydzień ${data.week}, Rok ${data.year}</p>
        <div style="display:flex; gap:8px;" id="actions"></div>
      </div>
    `);
    const actions = card.querySelector('#actions');

    if (ui.confirmingDeleteId === id) {
      actions.appendChild(el(`<span style="align-self:center; color:var(--text-dim); font-size:0.85rem;">Usunąć na stałe?</span>`));
      const yesBtn = el(`<button>Tak, usuń</button>`);
      const noBtn = el(`<button>Anuluj</button>`);
      yesBtn.addEventListener('click', () => { gameState.deleteCareer(id); gameState.save(); ui.confirmingDeleteId = null; render(); });
      noBtn.addEventListener('click', () => { ui.confirmingDeleteId = null; render(); });
      actions.appendChild(yesBtn);
      actions.appendChild(noBtn);
    } else {
      const goBtn = el(`<button class="primary">Kontynuuj</button>`);
      const delBtn = el(`<button>Usuń</button>`);
      goBtn.addEventListener('click', () => {
        gameState.selectCareer(id);
        gameState.save();
        ui.tab = 'dashboard';
        ui.screen = f.retired ? 'retired' : 'shell';
        render();
      });
      delBtn.addEventListener('click', () => { ui.confirmingDeleteId = id; render(); });
      actions.appendChild(goBtn);
      actions.appendChild(delBtn);
    }

    list.appendChild(card);
  });

  wrap.querySelector('#new-career').addEventListener('click', () => {
    ui.screen = 'creation';
    render();
  });
  return wrap;
}

// ---------- Character creation ----------

function renderCreation() {
  const c = ui.creation;
  const wrap = el(`<div class="screen fade-in"><h1>Stwórz zawodnika</h1><div class="panel" style="max-width:520px;"></div></div>`);
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
  actions.querySelector('#back').addEventListener('click', () => { ui.screen = 'menu'; render(); });
  actions.querySelector('#confirm').addEventListener('click', () => {
    gameState.createCareer();
    gameState.data.player = createPlayerFighter(c);
    gameState.logEvent(`${gameState.data.player.name} rozpoczyna karierę w MMA!`);
    gameState.save();
    ui.tab = 'dashboard';
    ui.screen = 'shell';
    render();
  });

  return wrap;
}

// ---------- Shell (persistent tabs) ----------

const TABS = [
  { id: 'dashboard', label: 'Start' },
  { id: 'training', label: 'Trening' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'finance', label: 'Finanse' },
  { id: 'career', label: 'Kariera' },
];

function fighterCardPanel(fighter) {
  const rows = SKILL_KEYS.map((k) => `
    <div class="stat-row">
      <span>${SKILL_LABELS[k]}</span>
      <div class="bar-track"><div class="bar-fill hp" style="width:${fighter.skills[k]}%"></div></div>
      <span class="stat-val">${Math.round(fighter.skills[k])}</span>
    </div>
  `).join('');

  const wc = WEIGHT_CLASSES.find((w) => w.id === fighter.weightClassId);
  const org = getOrganization(fighter.orgId);
  const injuries = fighter.injuries.length
    ? fighter.injuries.map((i) => `<span class="badge badge-danger">${i.name} (${i.weeksLeft} tyg.)</span>`).join(' ')
    : '<span class="badge badge-good">Zdrowy</span>';
  const rankLabel = fighter.rank == null ? 'Niesklasyfikowany' : fighter.rank === 0 ? 'MISTRZ' : `#${fighter.rank + 1}`;

  return el(`
    <div class="panel fighter-card">
      <div class="fighter-card-head">
        <h2>${fighter.name}</h2>
        <div class="ovr-chip"><span class="ovr-num">${overallRating(fighter)}</span><span class="ovr-label">OVR</span></div>
      </div>
      <div class="badge">${wc ? wc.name : ''}</div>
      <div class="badge">Wiek: ${fighter.age}</div>
      <div class="badge badge-gold">${org.name} &middot; ${rankLabel}</div>
      <p class="record-line">${fighter.record.wins}<em>W</em>&ndash;${fighter.record.losses}<em>L</em>&ndash;${fighter.record.draws}<em>D</em></p>
      <div class="stat-row"><span>Zdrowie</span><div class="bar-track"><div class="bar-fill hp" style="width:${fighter.health}%"></div></div><span class="stat-val">${Math.round(fighter.health)}</span></div>
      <div class="stat-row"><span>Zmęczenie</span><div class="bar-track"><div class="bar-fill stamina" style="width:${fighter.fatigue}%"></div></div><span class="stat-val">${Math.round(fighter.fatigue)}</span></div>
      <div class="stat-row"><span>Morale</span><div class="bar-track"><div class="bar-fill morale" style="width:${fighter.morale}%"></div></div><span class="stat-val">${Math.round(fighter.morale)}</span></div>
      <div class="stat-row"><span>Sława</span><div class="bar-track"><div class="bar-fill fame" style="width:${fighter.fame}%"></div></div><span class="stat-val">${Math.round(fighter.fame)}</span></div>
      <p>Kontuzje: ${injuries}</p>
      <h3>Statystyki</h3>
      ${rows}
      <h3>Finanse</h3>
      <p class="money-line">$${fighter.money.toLocaleString('pl-PL')}</p>
    </div>
  `);
}

function renderShell() {
  const fighter = gameState.data.player;
  if (fighter.retired) {
    ui.screen = 'retired';
    return renderRetired();
  }

  const wrap = el(`
    <div class="shell fade-in">
      <aside id="dossier"></aside>
      <div class="main-col">
        <nav class="tabbar" id="tabbar"></nav>
        <div class="tab-panel" id="tab-panel"></div>
      </div>
    </div>
  `);
  wrap.querySelector('#dossier').appendChild(fighterCardPanel(fighter));

  const tabbar = wrap.querySelector('#tabbar');
  TABS.forEach((t) => {
    const btn = el(`<button class="tab-btn ${ui.tab === t.id ? 'active' : ''}">${t.label}</button>`);
    btn.addEventListener('click', () => { ui.tab = t.id; render(); });
    tabbar.appendChild(btn);
  });

  const panel = wrap.querySelector('#tab-panel');
  const tabRenderers = { dashboard: renderDashboardTab, training: renderTrainingTab, ranking: renderRankingTab, finance: renderFinanceTab, career: renderCareerTab };
  panel.appendChild((tabRenderers[ui.tab] || renderDashboardTab)(fighter));

  return wrap;
}

function renderDashboardTab(fighter) {
  const wrap = el(`<div class="tab-content fade-in"><h1>Tydzień ${gameState.data.week}, Rok ${gameState.data.year}</h1></div>`);

  if (gameState.data.pendingMediaEvent) {
    const card = el(`<div class="card"><strong>Wymaga uwagi:</strong> masz nierozwiązane wydarzenie osobiste/medialne.</div>`);
    const goBtn = el(`<button class="primary" style="margin-top:8px;">Zajmij się tym</button>`);
    goBtn.addEventListener('click', () => { ui.screen = 'personal-event'; render(); });
    card.appendChild(goBtn);
    wrap.appendChild(card);
  }

  if (gameState.data.pendingOffer && !gameState.data.pendingMediaEvent) {
    const offer = gameState.data.pendingOffer;
    const card = el(`
      <div class="card">
        <h3>${offer.isCallUp ? `Awans do ${offer.orgName}!` : `Oferta walki: ${offer.orgName}`} ${offer.isTitleShot ? '<span class="badge badge-gold">WALKA O PAS</span>' : ''}</h3>
        <p>Przeciwnik: <strong>${offer.opponent.name}</strong> (${offer.opponent.record.wins}-${offer.opponent.record.losses}, OVR ${overallRating(offer.opponent)})</p>
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
    wrap.appendChild(card);
  }

  const canAct = !gameState.data.pendingOffer && !gameState.data.pendingMediaEvent && !fighter.retired;
  const nav = el(`<div class="nav"></div>`);
  const trainBtn = el(`<button class="primary" ${canAct ? '' : 'disabled'}>Idź na trening</button>`);
  trainBtn.addEventListener('click', () => { ui.tab = 'training'; render(); });
  nav.appendChild(trainBtn);

  if (ui.confirmingRetire) {
    const confirmWrap = el(`<div style="display:flex; gap:8px; align-items:center;"><span>Na pewno zakończyć karierę?</span></div>`);
    const yesBtn = el(`<button class="primary">Tak, zakończ</button>`);
    const noBtn = el(`<button>Anuluj</button>`);
    yesBtn.addEventListener('click', () => { fighter.retired = true; gameState.save(); ui.confirmingRetire = false; ui.screen = 'retired'; render(); });
    noBtn.addEventListener('click', () => { ui.confirmingRetire = false; render(); });
    confirmWrap.appendChild(yesBtn);
    confirmWrap.appendChild(noBtn);
    nav.appendChild(confirmWrap);
  } else {
    const retireBtn = el(`<button>Zakończ karierę</button>`);
    retireBtn.addEventListener('click', () => { ui.confirmingRetire = true; render(); });
    nav.appendChild(retireBtn);

    const switchBtn = el(`<button>Zmień karierę</button>`);
    switchBtn.addEventListener('click', () => { gameState.save(); ui.screen = 'menu'; render(); });
    nav.appendChild(switchBtn);
  }
  wrap.appendChild(nav);

  const logCard = el(`<div class="panel"><h3>Ostatnie wydarzenia</h3><ul class="log-list"></ul></div>`);
  const logList = logCard.querySelector('.log-list');
  gameState.data.events.slice(0, 8).forEach((e) => logList.appendChild(el(`<li>R${e.year} T${e.week}: ${e.text}</li>`)));
  wrap.appendChild(logCard);

  return wrap;
}

function renderTrainingTab(fighter) {
  const wrap = el(`<div class="tab-content fade-in"><h1>Plan treningowy</h1></div>`);
  const panel = el(`<div class="panel" style="max-width:640px;"></div>`);
  wrap.appendChild(panel);

  const canAct = !gameState.data.pendingOffer && !gameState.data.pendingMediaEvent;
  if (!canAct) {
    panel.appendChild(el(`<p>Zajmij się najpierw sprawami na karcie Start (oferta walki lub wydarzenie).</p>`));
    return wrap;
  }

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
      if (ui.trainingFocus.includes(k)) ui.trainingFocus = ui.trainingFocus.filter((x) => x !== k);
      else if (ui.trainingFocus.length < 2) ui.trainingFocus.push(k);
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

  const actions = el(`<div style="display:flex; gap:10px; margin-top:16px;"><button class="primary" id="go">Trenuj i przejdź do kolejnego tygodnia</button></div>`);
  panel.appendChild(actions);
  actions.querySelector('#go').addEventListener('click', () => {
    const result = runTrainingWeek(fighter, ui.trainingFocus, ui.trainingIntensity);
    const gains = Object.entries(result.gains).map(([k, v]) => `${SKILL_LABELS[k]} +${v}`).join(', ');
    gameState.logEvent(gains ? `Trening: ${gains}.` : 'Trening bez znaczących postępów.');
    if (result.injury) gameState.logEvent(`Kontuzja podczas treningu: ${result.injury.name}!`);
    advanceWeek(gameState);
    gameState.save();
    ui.trainingFocus = [];
    ui.tab = 'dashboard';
    render();
  });

  return wrap;
}

function renderRankingTab(fighter) {
  ui.rankingOrgId = ui.rankingOrgId || fighter.orgId;
  ui.rankingWeightClassId = ui.rankingWeightClassId || fighter.weightClassId;

  const wrap = el(`<div class="tab-content fade-in"><h1>Rankingi</h1></div>`);

  const ladder = el(`<div class="org-ladder"></div>`);
  ORGANIZATIONS.forEach((org, i) => {
    const isCurrent = org.id === fighter.orgId;
    const chip = el(`<div class="org-chip ${isCurrent ? 'current' : ''} ${ui.rankingOrgId === org.id ? 'selected' : ''}">${org.name}</div>`);
    chip.addEventListener('click', () => { ui.rankingOrgId = org.id; render(); });
    ladder.appendChild(chip);
    if (i < ORGANIZATIONS.length - 1) ladder.appendChild(el(`<div class="org-arrow">&rarr;</div>`));
  });
  wrap.appendChild(ladder);

  const wcSelectWrap = el(`<div style="margin:14px 0;"><label>Kategoria wagowa</label><br/><select id="rk-wc" style="margin-top:6px;"></select></div>`);
  const wcSelect = wcSelectWrap.querySelector('#rk-wc');
  WEIGHT_CLASSES.forEach((w) => wcSelect.appendChild(el(`<option value="${w.id}" ${w.id === ui.rankingWeightClassId ? 'selected' : ''}>${w.name}</option>`)));
  wcSelect.addEventListener('change', (e) => { ui.rankingWeightClassId = e.target.value; render(); });
  wrap.appendChild(wcSelectWrap);

  const roster = getRoster(gameState, ui.rankingOrgId, ui.rankingWeightClassId);
  const entries = buildDisplayRanking(roster, fighter, ui.rankingOrgId);

  const table = el(`<div class="panel"><table class="rank-table"><thead><tr><th>#</th><th>Zawodnik</th><th>Rekord</th><th>OVR</th></tr></thead><tbody></tbody></table></div>`);
  const tbody = table.querySelector('tbody');
  entries.forEach((f, i) => {
    const row = el(`<tr class="${f.isPlayer ? 'me' : ''}">
      <td>${i === 0 ? '<span class="badge badge-gold">C</span>' : `#${i + 1}`}</td>
      <td>${f.name}${f.isPlayer ? ' <span class="badge">TY</span>' : ''}</td>
      <td>${f.record.wins}-${f.record.losses}-${f.record.draws}</td>
      <td>${overallRating(f)}</td>
    </tr>`);
    tbody.appendChild(row);
  });
  wrap.appendChild(table);

  if (ui.rankingOrgId === fighter.orgId && fighter.rank == null) {
    wrap.appendChild(el(`<p class="badge">Jesteś niesklasyfikowany w ${getOrganization(fighter.orgId).name} -- wygraj walkę wejściową, by wejść do rankingu.</p>`));
  }

  return wrap;
}

function renderFinanceTab(fighter) {
  const wrap = el(`<div class="tab-content fade-in"><h1>Finanse</h1></div>`);
  wrap.appendChild(el(`<div class="panel"><h3>Gotówka</h3><p class="money-line">$${fighter.money.toLocaleString('pl-PL')}</p></div>`));

  const sponsorPanel = el(`<div class="panel"><h3>Sponsorzy</h3></div>`);
  if (fighter.sponsors.length) {
    fighter.sponsors.forEach((s) => sponsorPanel.appendChild(el(`<p>${s.name} — <span class="stat-val">+$${s.weeklyIncome}</span>/tydz. (jeszcze ${s.weeksLeft} tyg.)</p>`)));
  } else {
    sponsorPanel.appendChild(el(`<p>Brak aktywnych sponsorów. Buduj sławę, by ich przyciągnąć.</p>`));
  }
  wrap.appendChild(sponsorPanel);

  wrap.appendChild(el(`<div class="panel"><h3>Media</h3><p>Obserwujący: <span class="stat-val">${fighter.socialFollowers.toLocaleString('pl-PL')}</span></p></div>`));
  return wrap;
}

function renderCareerTab(fighter) {
  const wrap = el(`<div class="tab-content fade-in"><h1>Kariera</h1></div>`);
  wrap.appendChild(el(`
    <div class="panel">
      <h3>Rekord</h3>
      <p class="record-line">${fighter.record.wins}<em>W</em>&ndash;${fighter.record.losses}<em>L</em>&ndash;${fighter.record.draws}<em>D</em></p>
      <p>KO/TKO: <span class="stat-val">${fighter.record.koWins}</span> &nbsp; Poddania: <span class="stat-val">${fighter.record.subWins}</span></p>
    </div>
  `));

  const logCard = el(`<div class="panel"><h3>Historia</h3><ul class="log-list"></ul></div>`);
  const logList = logCard.querySelector('.log-list');
  gameState.data.events.forEach((e) => logList.appendChild(el(`<li>R${e.year} T${e.week}: ${e.text}</li>`)));
  wrap.appendChild(logCard);

  return wrap;
}

// ---------- Fight flow ----------

function renderFightIntro() {
  const offer = gameState.data.pendingOffer;
  const opp = offer.opponent;
  const skillRows = SKILL_KEYS.map((k) => `
    <div class="stat-row"><span>${SKILL_LABELS[k]}</span><div class="bar-track"><div class="bar-fill hp" style="width:${opp.skills[k]}%"></div></div><span class="stat-val">${Math.round(opp.skills[k])}</span></div>
  `).join('');

  const wrap = el(`
    <div class="screen fade-in">
      <h1>${offer.orgName}</h1>
      <div class="panel" style="max-width:640px;">
        <h2>${gameState.data.player.name} vs ${opp.name}</h2>
        <p>${offer.isTitleShot ? 'To walka o pas mistrzowski!' : offer.isCallUp ? 'Twoja pierwsza walka w nowej organizacji.' : 'Walka niemistrzowska.'}</p>
        <p>Kategoria: ${offer.weightClass ? offer.weightClass.name : ''}</p>
        <p>Rekord przeciwnika: ${opp.record.wins}-${opp.record.losses}-${opp.record.draws} &middot; OVR ${overallRating(opp)}</p>
        <h3>Statystyki przeciwnika</h3>
        ${skillRows}
        <p style="margin-top:12px;">Pula: $${offer.purse.toLocaleString('pl-PL')} (+ $${offer.winBonus.toLocaleString('pl-PL')} za zwycięstwo)</p>
        <div style="display:flex; gap:10px; margin-top:12px;">
          <button id="back">Wstecz</button>
          <button class="primary" id="start">Rozpocznij walkę</button>
        </div>
      </div>
    </div>
  `);
  wrap.querySelector('#back').addEventListener('click', () => { ui.screen = 'shell'; render(); });
  wrap.querySelector('#start').addEventListener('click', () => {
    ui.screen = 'fight-viewer';
    render();
  });
  return wrap;
}

function strategyPanel(ctrl, contextLabel, onPick) {
  const wrap = el(`<div class="panel decision-panel fade-in"><h3>${contextLabel}</h3><div class="choice-list"></div></div>`);
  const list = wrap.querySelector('.choice-list');
  Object.entries(STRATEGIES).forEach(([key, def]) => {
    const opt = el(`<button style="text-align:left;"><strong>${def.label}</strong><br/><span style="font-weight:400; font-size:0.85em; color:var(--text-dim);">${def.desc}</span></button>`);
    opt.addEventListener('click', () => onPick(key));
    list.appendChild(opt);
  });
  return wrap;
}

function minigameConfig(ctrl, pending) {
  const p = ctrl.combatants.player.skills;
  const o = ctrl.combatants.opponent.skills;
  const specs = {
    finish_strike: { title: 'Wykorzystaj okazję!', hint: 'Przeciwnik jest zszokowany. Trafij w oknie, by dołożyć mocny cios.', diff: p.power - o.chin },
    defend_takedown: { title: 'Broń się przed obaleniem!', hint: `${ctrl.combatants.opponent.name} idzie po nogi. Sprawluj w idealnym momencie.`, diff: p.wrestling - o.wrestling },
    defend_submission: { title: 'Wyrwij się z uchwytu!', hint: `${ctrl.combatants.opponent.name} szuka poddania. Trafij w oknie, by się wyswobodzić.`, diff: p.grappling - o.grappling },
  };
  const spec = specs[pending.kind];
  const zoneWidth = clamp(0.26 + spec.diff / 400, 0.12, 0.42);
  return { title: spec.title, hint: spec.hint, zoneStart: 0.5 - zoneWidth / 2, zoneEnd: 0.5 + zoneWidth / 2, period: 1300 };
}

function minigamePanel(ctrl, pending, onResolve) {
  const cfg = minigameConfig(ctrl, pending);
  const wrap = el(`
    <div class="panel decision-panel fade-in minigame">
      <h3>${cfg.title}</h3>
      <p>${cfg.hint}</p>
      <div class="minigame-track"><div class="minigame-zone" style="left:${cfg.zoneStart * 100}%; width:${(cfg.zoneEnd - cfg.zoneStart) * 100}%"></div><div class="minigame-marker"></div></div>
      <button class="primary" id="mg-go">TERAZ!</button>
    </div>
  `);
  const marker = wrap.querySelector('.minigame-marker');
  const start = performance.now();
  let raf;
  const loop = (t) => {
    const phase = ((t - start) % cfg.period) / cfg.period;
    const pos = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
    marker.style.left = pos * 100 + '%';
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  wrap.querySelector('#mg-go').addEventListener('click', () => {
    cancelAnimationFrame(raf);
    const now = performance.now();
    const phase = ((now - start) % cfg.period) / cfg.period;
    const pos = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
    const success = pos >= cfg.zoneStart && pos <= cfg.zoneEnd;
    onResolve(success);
  });
  wrap._cleanup = () => cancelAnimationFrame(raf);
  return wrap;
}

function renderFightViewer() {
  const offer = gameState.data.pendingOffer;
  const player = gameState.data.player;
  const ctrl = new FightController(player, offer.opponent, { isTitleShot: offer.isTitleShot });

  const wrap = el(`
    <div class="screen fade-in">
      <h1>${player.name} vs ${offer.opponent.name}</h1>
      <canvas id="fight-canvas" width="760" height="380"></canvas>
      <div id="decision-area"></div>
      <div id="fight-outcome"></div>
      <div style="text-align:center; margin-top:12px;"><button id="skip">Przewiń walkę</button></div>
    </div>
  `);

  const canvasEl = wrap.querySelector('#fight-canvas');
  const fc = new FightCanvas(canvasEl, player.name, offer.opponent.name);
  fc.draw();
  fc.start();

  const decisionArea = wrap.querySelector('#decision-area');
  let eventCursor = 0;
  let playbackTimer = null;
  let skipped = false;

  function clearDecisionArea() {
    if (decisionArea.firstChild && decisionArea.firstChild._cleanup) decisionArea.firstChild._cleanup();
    decisionArea.innerHTML = '';
  }

  function drainEvents() {
    if (eventCursor < ctrl.events.length) {
      const evt = ctrl.events[eventCursor++];
      fc.applyEvent(evt);
      playbackTimer = setTimeout(drainEvents, skipped ? 0 : 520);
      return;
    }
    showDecisionOrOutcome();
  }

  function showDecisionOrOutcome() {
    clearDecisionArea();
    if (ctrl.finished) {
      fc.stop();
      showFightOutcome(wrap.querySelector('#fight-outcome'), ctrl, offer);
      return;
    }
    if (!ctrl.pending) return;
    if (ctrl.pending.type === 'strategy') {
      const label = ctrl.pending.context === 'prefight' ? 'Wybierz strategię na walkę' : `Wybierz strategię na rundę ${ctrl.round}`;
      decisionArea.appendChild(strategyPanel(ctrl, label, (key) => {
        ctrl.setStrategy(key);
        ctrl.advance();
        drainEvents();
      }));
    } else if (ctrl.pending.type === 'minigame') {
      decisionArea.appendChild(minigamePanel(ctrl, ctrl.pending, (success) => {
        ctrl.resolveMinigame(success);
        drainEvents();
      }));
    }
  }

  wrap.querySelector('#skip').addEventListener('click', () => {
    skipped = true;
    if (playbackTimer) clearTimeout(playbackTimer);
    while (!ctrl.finished && ctrl.pending) {
      if (ctrl.pending.type === 'strategy') ctrl.setStrategy('balanced');
      else if (ctrl.pending.type === 'minigame') ctrl.resolveMinigame(Math.random() < 0.5);
      ctrl.advance();
    }
    const last = ctrl.events[ctrl.events.length - 1];
    if (last) fc.applyEvent(last);
    fc.draw();
    eventCursor = ctrl.events.length;
    showDecisionOrOutcome();
  });

  showDecisionOrOutcome();

  return wrap;
}

function showFightOutcome(container, ctrl, offer) {
  const won = ctrl.result.winnerSide === 'player';
  const lost = ctrl.result.winnerSide === 'opponent';
  const cls = ctrl.result.isDraw ? 'draw' : won ? 'win' : 'lose';
  const label = ctrl.result.isDraw ? 'REMIS' : won ? 'ZWYCIĘSTWO' : 'PORAŻKA';

  container.innerHTML = '';
  container.appendChild(el(`
    <div class="result-banner ${cls} fade-in">
      ${label} — ${ctrl.result.method}${ctrl.result.round ? `, runda ${ctrl.result.round}` : ''}
    </div>
  `));

  const btn = el(`<div style="text-align:center;"><button class="primary" id="continue">Dalej</button></div>`);
  container.appendChild(btn);
  btn.querySelector('#continue').addEventListener('click', () => finalizeFight(ctrl, offer, won, lost));
}

function finalizeFight(ctrl, offer, won, lost) {
  const fighter = gameState.data.player;

  if (won) fighter.record.wins += 1;
  else if (lost) fighter.record.losses += 1;
  else fighter.record.draws += 1;
  if (won && ctrl.result.method === 'KO/TKO') fighter.record.koWins += 1;
  if (won && ctrl.result.method === 'Poddanie') fighter.record.subWins += 1;

  const damageTaken = 100 - ctrl.combatants.player.health;
  fighter.health = clamp(fighter.health - damageTaken * 0.4);
  if (damageTaken > 40 && Math.random() < 0.3) {
    fighter.injuries.push({ name: 'Kontuzja powalkowa', severity: 'średnia', weeksLeft: 3 });
    gameState.logEvent('Zawodnik odniósł kontuzję podczas walki.');
  }

  const payout = payoutFight(fighter, offer, won, ctrl.result.method);
  const rankEvents = applyFightOutcome(gameState, offer, won);
  rankEvents.forEach((e) => gameState.logEvent(e));
  gameState.logEvent(`${won ? 'Wygrana' : lost ? 'Przegrana' : 'Remis'} z ${offer.opponent.name} (${ctrl.result.method}). Zarobek: $${payout.total.toLocaleString('pl-PL')}.`);

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
    <div class="screen fade-in">
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
      ui.tab = 'dashboard';
      ui.screen = 'shell';
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
    <div class="screen fade-in">
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
      ui.screen = 'shell';
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
    <div class="screen title-screen fade-in">
      <h1>Koniec kariery</h1>
      <p>${fighter.name} kończy karierę z rekordem ${fighter.record.wins}W-${fighter.record.losses}L-${fighter.record.draws}D.</p>
      <p>Zarobione pieniądze: $${fighter.money.toLocaleString('pl-PL')} | Sława: ${fighter.fame} | Obserwujący: ${fighter.socialFollowers.toLocaleString('pl-PL')}</p>
      <div style="display:flex; gap:10px;">
        <button class="primary" id="new">Nowa kariera</button>
        <button id="menu">Menu karier</button>
      </div>
    </div>
  `);
  wrap.querySelector('#new').addEventListener('click', () => { ui.screen = 'creation'; render(); });
  wrap.querySelector('#menu').addEventListener('click', () => { ui.screen = 'menu'; render(); });
  return wrap;
}

init();
