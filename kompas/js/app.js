(function (K) {
  'use strict';

  const h = K.ui.h;
  const icon = K.ui.icon;
  const DEFAULT_ROUTE = 'pulpit';

  // Pasek na dole mieści pięć pozycji; reszta wchodzi pod „Więcej”.
  const TABS = [
    { id: 'pulpit', label: 'Pulpit', icon: 'compass' },
    { id: 'decyzje', label: 'Decyzje', icon: 'scale' },
    { id: 'mysli', label: 'Myśli', icon: 'thought' },
    { id: 'nastroj', label: 'Nastrój', icon: 'mood' },
    { id: 'more', label: 'Więcej', icon: 'more' }
  ];
  const MORE = ['problemy', 'nawyki', 'spokoj', 'ustawienia'];
  const ORDER = ['pulpit', 'decyzje', 'mysli', 'nastroj', 'problemy', 'nawyki', 'spokoj', 'ustawienia'];

  // Kompas bywa jedną z kilku apek pod wspólnym adresem. Gdy siedzi w
  // podkatalogu /kompas/, katalog wyżej jest ich spisem — w trybie
  // pełnoekranowym nie ma przycisku wstecz, więc droga powrotna musi być
  // w samej apce. Otwarty z pliku albo z korzenia: nie ma dokąd wracać.
  const MENU_HREF = (location.protocol.indexOf('http') === 0 &&
    /\/kompas\/(index\.html)?$/.test(location.pathname)) ? '../' : null;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = null;
  let mainEl = null;
  let tabbarEl = null;
  let pillEl = null;
  let lastRoute = DEFAULT_ROUTE;

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    const id = parts[0] && K.views[parts[0]] ? parts[0] : DEFAULT_ROUTE;
    return { id: id, param: parts[1] || null };
  }

  function applyTheme() {
    const theme = K.store.state.settings.theme || 'auto';
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }

  /* ---------- światło pod szkłem ----------
     Tafle liczą, gdzie względem nich pada światło: krawędź jaśnieje po tej
     stronie, a refleks wędruje po szkle przy przewijaniu i ruchu palca. */

  let lightX = 0.5, lightY = 0.08, aimX = 0.5, aimY = 0.08, raf = 0, panes = [], drift = 0;

  function collect() {
    panes = Array.prototype.slice.call(document.querySelectorAll('.card, .tabbar, .sheet'));
    paint();
  }
  function paint() {
    const vw = innerWidth, vh = innerHeight;
    const lx = lightX * vw, ly = lightY * vh, diag = Math.hypot(vw, vh);
    for (let i = 0; i < panes.length; i++) {
      const el = panes[i], r = el.getBoundingClientRect();
      if (!r.width || r.bottom < -80 || r.top > vh + 80) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      el.style.setProperty('--gang', (Math.atan2(cy - ly, cx - lx) * 57.2958 + 90).toFixed(1) + 'deg');
      el.style.setProperty('--gx', clamp((lx - r.left) / r.width * 100, -30, 130).toFixed(0) + '%');
      el.style.setProperty('--gy', clamp((ly - r.top) / r.height * 100, -70, 170).toFixed(0) + '%');
      el.style.setProperty('--gi', (1 - clamp(Math.hypot(cx - lx, cy - ly) / diag * 1.45, 0, 0.74)).toFixed(2));
    }
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function tick() {
    raf = 0;
    lightX += (aimX - lightX) * 0.14;
    lightY += (aimY - lightY) * 0.14;
    paint();
    if (Math.abs(aimX - lightX) > 0.0015 || Math.abs(aimY - lightY) > 0.0015) raf = requestAnimationFrame(tick);
  }
  function aim(x, y) {
    aimX = clamp(x, -0.2, 1.2);
    aimY = clamp(y, -0.3, 1.3);
    if (!raf && !REDUCED) raf = requestAnimationFrame(tick);
  }

  function startLight() {
    document.body.appendChild(h('div', { id: 'grain', 'aria-hidden': 'true' }));
    addEventListener('scroll', paint, { passive: true });
    addEventListener('resize', collect, { passive: true });
    addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse') aim(e.clientX / innerWidth, e.clientY / innerHeight * 0.8);
    }, { passive: true });
    addEventListener('touchmove', function (e) {
      const t = e.touches[0];
      if (t) aim(t.clientX / innerWidth, t.clientY / innerHeight * 0.7);
    }, { passive: true });
    setInterval(function () {
      if (document.hidden || REDUCED) return;
      drift += 1;
      aim(0.5 + Math.sin(drift / 9) * 0.28, 0.12 + Math.cos(drift / 13) * 0.1);
    }, 2400);
    K.light = { collect: collect, paint: paint };
  }

  /* ---------- szkielet ---------- */

  function buildTopbar() {
    return h('header', { class: 'topbar' },
      MENU_HREF ? h('button', {
        class: 'icon-btn',
        title: 'Wszystkie apki',
        'aria-label': 'Wróć do spisu apek',
        onClick: function () { location.href = MENU_HREF; }
      }, icon('back')) : null,
      h('div', { class: 'brand' },
        h('div', { class: 'mark' }, icon('compass')),
        h('strong', { text: 'Kompas' })
      ),
      h('div', { class: 'spacer' }),
      h('button', {
        class: 'icon-btn', title: 'Uspokój się', 'aria-label': 'Uspokój się',
        onClick: function () { K.go('spokoj'); }
      }, icon('wind')),
      h('button', {
        class: 'icon-btn', title: 'Ustawienia', 'aria-label': 'Ustawienia',
        onClick: function () { K.go('ustawienia'); }
      }, icon('gear'))
    );
  }

  function openMore() {
    const active = current ? current.id : DEFAULT_ROUTE;
    const panel = K.ui.sheet({
      title: 'Więcej',
      content: h('div', { class: 'sheet-nav' }, MORE.map(function (id) {
        const item = K.data.nav.filter(function (n) { return n.id === id; })[0];
        return h('button', {
          class: id === active ? 'on' : null,
          onClick: function () { panel.close(); K.go(id); }
        }, icon(item.icon), h('span', { text: item.label }));
      }))
    });
  }

  function buildTabbar() {
    pillEl = h('span', { id: 'tabpill', 'aria-hidden': 'true' });
    tabbarEl = h('nav', { class: 'tabbar', role: 'tablist', 'aria-label': 'Sekcje' },
      pillEl,
      TABS.map(function (tab) {
        return h('button', {
          role: 'tab',
          dataset: { tab: tab.id },
          'aria-selected': 'false',
          onClick: function () {
            if (suppressClick) return;
            if (tab.id === 'more') { syncPill(); openMore(); return; }
            K.go(tab.id);
          }
        }, icon(tab.icon), h('span', { text: tab.label }));
      })
    );
    armTabGesture();
    return tabbarEl;
  }

  /* ---------- bąbelek pod palcem ---------- */

  let dragging = false, dragMoved = false, suppressClick = false, hoverIdx = 0;
  let downX = 0, lastX = 0, lastT = 0, speed = 0;

  function tabButtons() { return Array.prototype.slice.call(tabbarEl.querySelectorAll('button[data-tab]')); }
  function idxOfRoute(id) {
    const direct = TABS.map(function (t) { return t.id; }).indexOf(id);
    return direct >= 0 ? direct : TABS.length - 1;   // widoki spod „Więcej” świecą na piątej
  }
  function placePill(idx, x, stretch) {
    const btns = tabButtons(), b = btns[clamp(idx, 0, btns.length - 1)];
    if (!b || !b.offsetWidth) return;
    pillEl.style.width = b.offsetWidth + 'px';
    pillEl.style.transform = 'translate3d(' + Math.round((x === null || x === undefined ? b.offsetLeft : x) * 10) / 10 +
      'px,0,0) scaleX(' + (stretch || 1) + ')';
  }
  function highlight(i) {
    tabButtons().forEach(function (b, j) { b.classList.toggle('hot', j === i); });
  }
  function syncPill() {
    hoverIdx = idxOfRoute(current ? current.id : DEFAULT_ROUTE);
    placePill(hoverIdx);
    highlight(hoverIdx);
  }
  function idxAt(clientX) {
    const btns = tabButtons();
    let best = 0, bestD = Infinity;
    btns.forEach(function (b, i) {
      const r = b.getBoundingClientRect(), d = Math.abs(clientX - (r.left + r.width / 2));
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
  function xAt(clientX) {
    const btns = tabButtons(), navX = tabbarEl.getBoundingClientRect().left;
    const first = btns[0].offsetLeft, last = btns[btns.length - 1].offsetLeft;
    let x = clientX - navX - btns[0].offsetWidth / 2;
    if (x < first) x = first - (first - x) / 2.8;
    if (x > last) x = last + (x - last) / 2.8;
    return x;
  }

  function armTabGesture() {
    tabbarEl.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return;
      const btns = tabButtons();
      if (!btns.length || !btns[0].offsetWidth) return;
      dragging = true; dragMoved = false;
      downX = lastX = e.clientX; lastT = performance.now(); speed = 0;
      try { tabbarEl.setPointerCapture(e.pointerId); } catch (err) {}
      pillEl.classList.remove('free');
      hoverIdx = idxAt(e.clientX);
      placePill(hoverIdx);
      highlight(hoverIdx);
    });
    tabbarEl.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const now = performance.now(), dt = Math.max(1, now - lastT);
      speed = (e.clientX - lastX) / dt * 1000;
      lastX = e.clientX; lastT = now;
      if (!dragMoved && Math.abs(e.clientX - downX) < 5) return;
      dragMoved = true;
      pillEl.classList.add('free');
      placePill(hoverIdx, xAt(e.clientX), clamp(1 + Math.abs(speed) / 4500, 1, 1.14));
      const i = idxAt(e.clientX);
      if (i !== hoverIdx) {
        hoverIdx = i;
        highlight(i);
        try { if (navigator.vibrate) navigator.vibrate(5); } catch (err) {}
      }
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      pillEl.classList.remove('free');
      placePill(hoverIdx);
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 150);
      const tab = TABS[hoverIdx];
      if (!tab) return;
      if (tab.id === 'more') { syncPill(); openMore(); return; }
      if (tab.id !== (current && current.id)) K.go(tab.id);
      else highlight(idxOfRoute(current.id));
    }
    tabbarEl.addEventListener('pointerup', endDrag);
    tabbarEl.addEventListener('pointercancel', function () { dragging = false; pillEl.classList.remove('free'); syncPill(); });
    tabbarEl.addEventListener('keydown', function (e) {
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const btns = tabButtons(), i = clamp(idxOfRoute(current ? current.id : DEFAULT_ROUTE) + dir, 0, btns.length - 1);
      btns[i].focus();
      if (TABS[i].id === 'more') openMore(); else K.go(TABS[i].id);
    });
    addEventListener('resize', syncPill);
  }

  /* ---------- render ---------- */

  function render() {
    const route = parseHash();
    const view = K.views[route.id];

    if (current && current.view.destroy && (current.id !== route.id || current.param !== route.param)) {
      current.view.destroy();
    }

    const sameView = current && current.id === route.id;
    const scrollTop = sameView ? window.scrollY : 0;
    const dir = ORDER.indexOf(route.id) > ORDER.indexOf(lastRoute) ? 1
      : ORDER.indexOf(route.id) < ORDER.indexOf(lastRoute) ? -1 : 0;
    lastRoute = route.id;
    current = { id: route.id, param: route.param, view: view };

    const inner = h('div', { class: 'main-inner fade-in' }, view.render(route.param));
    inner.style.setProperty('--dir', dir);
    mainEl.textContent = '';
    mainEl.appendChild(inner);

    tabButtons().forEach(function (b, i) {
      b.setAttribute('aria-selected', i === idxOfRoute(route.id) ? 'true' : 'false');
    });
    syncPill();
    window.scrollTo(0, scrollTop);
    collect();
  }

  function boot() {
    applyTheme();
    mainEl = h('main', { class: 'main' });

    const app = document.getElementById('app');
    app.appendChild(buildTopbar());
    app.appendChild(mainEl);
    document.body.appendChild(buildTabbar());
    startLight();

    window.addEventListener('hashchange', render);
    K.store.onChange(function () {
      applyTheme();
      render();
    });

    if (!location.hash) location.hash = '#/' + DEFAULT_ROUTE;
    render();
    requestAnimationFrame(function () { syncPill(); collect(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { syncPill(); collect(); });

    if (!K.store.persistent) {
      K.ui.toast('Uwaga: przeglądarka blokuje zapis danych. Wpisy nie przetrwają zamknięcia karty.');
    }
  }

  K.go = function (path) { location.hash = '#/' + path; };
  K.refresh = render;

  // Offline działa tylko na http(s); z pliku na dysku nie ma czego rejestrować.
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})(window.K = window.K || {});
