(function (K) {
  'use strict';

  const ICONS = {
    more: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2.1 5.1-5.1 2.1 2.1-5.1z"/>',
    scale: '<path d="M12 4v16M8.5 20h7M4 7.5l8-1.5 8 1.5"/><path d="M4 7.5 1.5 13.5a2.5 2.5 0 0 0 5 0zM20 7.5l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
    thought: '<path d="M8.5 17.5A4.5 4.5 0 0 1 8 8.6a5 5 0 0 1 9.3-1.3 3.6 3.6 0 0 1-.3 10.2z"/><circle cx="6" cy="20" r="1.2"/>',
    bulb: '<path d="M9.5 18.5h5M10.5 21.5h3"/><path d="M12 2.5a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 1.9h5c.1-.7.5-1.4 1.1-1.9A6 6 0 0 0 12 2.5z"/>',
    mood: '<circle cx="12" cy="12" r="9"/><path d="M8.2 14.2s1.4 1.8 3.8 1.8 3.8-1.8 3.8-1.8"/><path d="M9 9.6v.6M15 9.6v.6"/>',
    check: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="m8.5 12.5 2.4 2.4 4.6-5"/><path d="M8 2v3M16 2v3"/>',
    wind: '<path d="M3 8.5h11a3 3 0 1 0-3-3M3 12.5h15M3 16.5h8.5a3 3 0 1 1-3 3"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M4.3 4.3l1.9 1.9M17.8 17.8l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.3 19.7l1.9-1.9M17.8 6.2l1.9-1.9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 4h4M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    note: '<path d="M5 4h11l4 4v12H5z"/><path d="M15 4v5h5M8.5 13h7M8.5 16.5h4"/>'
  };

  function icon(name, cls) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
    svg.innerHTML = ICONS[name] || '';
    return svg;
  }

  function append(node, kids) {
    kids.forEach(function (child) {
      if (child === null || child === undefined || child === false || child === true) return;
      if (Array.isArray(child)) return append(node, child);
      node.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
    });
  }

  function h(tag, props) {
    const node = document.createElement(tag);
    const kids = Array.prototype.slice.call(arguments, 2);
    if (props) {
      Object.keys(props).forEach(function (key) {
        const value = props[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key === 'style') Object.assign(node.style, value);
        else if (key === 'value') node.value = value;
        else if (key === 'checked' || key === 'disabled' || key === 'selected') node[key] = !!value;
        else if (key.indexOf('on') === 0 && typeof value === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), value);
        } else node.setAttribute(key, value === true ? '' : value);
      });
    }
    append(node, kids);
    return node;
  }

  function button(label, opts) {
    const o = opts || {};
    const el = h('button', {
      class: 'btn' + (o.variant ? ' btn-' + o.variant : ''),
      type: 'button',
      onClick: o.onClick,
      title: o.title,
      'aria-label': o.ariaLabel
    }, o.icon ? icon(o.icon) : null, label ? h('span', { text: label }) : null);
    return el;
  }

  function card(props) {
    const kids = Array.prototype.slice.call(arguments, 1);
    return h('section', { class: 'card' + (props && props.class ? ' ' + props.class : '') }, kids);
  }

  function sectionTitle(title, sub) {
    return h('div', { class: 'section-title' },
      h('h2', { text: title }),
      sub ? h('p', { class: 'muted', text: sub }) : null
    );
  }

  function field(label, control, hint) {
    return h('label', { class: 'field' },
      h('span', { class: 'field-label', text: label }),
      control,
      hint ? h('span', { class: 'field-hint', text: hint }) : null
    );
  }

  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 44) + 'px';
  }

  function textarea(opts) {
    const o = opts || {};
    const el = h('textarea', {
      class: 'input',
      rows: o.rows || 2,
      placeholder: o.placeholder || '',
      value: o.value || '',
      onInput: function (e) {
        autoGrow(el);
        if (o.onInput) o.onInput(e.target.value);
      }
    });
    requestAnimationFrame(function () { autoGrow(el); });
    return el;
  }

  function input(opts) {
    const o = opts || {};
    return h('input', {
      class: 'input',
      type: o.type || 'text',
      placeholder: o.placeholder || '',
      value: o.value === undefined ? '' : o.value,
      onInput: function (e) { if (o.onInput) o.onInput(e.target.value); }
    });
  }

  function empty(text, actionLabel, onAction) {
    return h('div', { class: 'empty' },
      h('p', { text: text }),
      actionLabel ? button(actionLabel, { variant: 'primary', icon: 'plus', onClick: onAction }) : null
    );
  }

  /* Arkusz wysuwany od dołu: zamyka go dotknięcie tła, Escape albo
     przeciągnięcie w dół — tak jak w systemowych panelach telefonu. */
  function sheet(opts) {
    const o = opts || {};
    let armed = false, active = false, startY = 0, shift = 0, vel = 0, stamp = 0;

    const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'grabber' }),
      o.title ? h('h3', { text: o.title }) : null,
      o.sub ? h('p', { class: 'muted', text: o.sub }) : null,
      o.content || null,
      o.actions ? h('div', { class: 'sheet-actions' }, o.actions) : null
    );
    const scrim = h('div', { class: 'scrim', onClick: function () { close(false); } });

    function close(result) {
      if (panel.dataset.closing) return;
      panel.dataset.closing = '1';
      panel.classList.remove('on');
      scrim.classList.remove('on');
      document.body.classList.remove('sheet-open', 'sheet-drag');
      document.body.style.removeProperty('--sheet-k');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { panel.remove(); scrim.remove(); }, 480);
      if (o.onClose) o.onClose(result);
    }
    function onKey(e) { if (e.key === 'Escape') close(false); }

    function armDrag(y, target) {
      if (target && target.closest && target.closest('input, textarea, select')) return;
      armed = true; active = false; startY = y; shift = 0; vel = 0; stamp = performance.now();
    }
    function moveDrag(y, ev) {
      if (!armed) return;
      const delta = y - startY;
      if (!active) {
        if (delta > 6 && panel.scrollTop <= 0) {
          active = true;
          panel.style.transition = 'none';
          document.body.classList.add('sheet-drag');
        } else if (delta < -4 || panel.scrollTop > 0) { armed = false; return; }
        else return;
      }
      if (ev && ev.cancelable) ev.preventDefault();
      const now = performance.now();
      vel = (delta - shift) / Math.max(1, now - stamp) * 1000;
      stamp = now;
      shift = delta > 0 ? delta : delta / 5;
      const k = Math.max(0, Math.min(1, 1 - shift / Math.max(260, panel.offsetHeight)));
      panel.style.transform = 'translate(-50%,' + shift.toFixed(1) + 'px)';
      scrim.style.opacity = k.toFixed(3);
      document.body.style.setProperty('--sheet-k', k.toFixed(3));
    }
    function endDrag() {
      if (!active) { armed = false; return; }
      const dist = shift, speed = vel;
      armed = false; active = false;
      document.body.classList.remove('sheet-drag');
      panel.style.transition = '';
      const shouldClose = dist > Math.min(190, (panel.offsetHeight || 400) * 0.26) || speed > 550;
      requestAnimationFrame(function () {
        panel.style.transform = '';
        scrim.style.opacity = '';
        document.body.style.removeProperty('--sheet-k');
        if (shouldClose) close(false);
      });
    }

    panel.addEventListener('touchstart', function (e) { armDrag(e.touches[0].clientY, e.target); }, { passive: true });
    panel.addEventListener('touchmove', function (e) { moveDrag(e.touches[0].clientY, e); }, { passive: false });
    panel.addEventListener('touchend', endDrag, { passive: true });
    panel.addEventListener('touchcancel', endDrag, { passive: true });
    panel.addEventListener('mousedown', function (e) { if (e.button === 0) armDrag(e.clientY, e.target); });
    window.addEventListener('mousemove', function (e) { if (armed) moveDrag(e.clientY, null); }, { passive: true });
    window.addEventListener('mouseup', endDrag);

    document.body.appendChild(scrim);
    document.body.appendChild(panel);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(function () {
      scrim.classList.add('on');
      panel.classList.add('on');
      document.body.classList.add('sheet-open');
      if (K.light) K.light.collect();
    });

    return { close: close, panel: panel };
  }

  function toast(message) {
    const node = h('div', { class: 'toast', role: 'status', text: message });
    document.body.appendChild(node);
    requestAnimationFrame(function () { node.classList.add('show'); });
    setTimeout(function () {
      node.classList.remove('show');
      setTimeout(function () { node.remove(); }, 300);
    }, 2600);
  }

  function confirm(opts) {
    return new Promise(function (resolve) {
      let settled = false;
      function finish(result) {
        if (settled) return;
        settled = true;
        resolve(result);
      }
      const panel = sheet({
        title: opts.title,
        sub: opts.body,
        actions: [
          button(opts.cancelLabel || 'Anuluj', { onClick: function () { finish(false); panel.close(); } }),
          button(opts.confirmLabel || 'Potwierdź', {
            variant: opts.danger ? 'danger' : 'primary',
            onClick: function () { finish(true); panel.close(); }
          })
        ],
        onClose: function () { finish(false); }
      });
    });
  }

  function relativeDate(iso) {
    const day = K.dayKey(iso);
    const diff = K.daysBetween(day, K.today());
    if (diff === 0) return 'dziś';
    if (diff === 1) return 'wczoraj';
    if (diff === 2) return 'przedwczoraj';
    if (diff > 0 && diff < 7) return diff + ' dni temu';
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function dayLabel(dayKey) {
    return new Date(dayKey + 'T00:00:00').toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (n === 1) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  K.ui = {
    h: h,
    icon: icon,
    button: button,
    card: card,
    sectionTitle: sectionTitle,
    field: field,
    textarea: textarea,
    input: input,
    empty: empty,
    sheet: sheet,
    toast: toast,
    confirm: confirm,
    relativeDate: relativeDate,
    dayLabel: dayLabel,
    plural: plural
  };
})(window.K = window.K || {});
