(function (K) {
  'use strict';

  const ui = K.ui;
  const h = ui.h;

  function choice(options, current, onPick) {
    return h('div', { class: 'chips' }, options.map(function (o) {
      return h('button', {
        class: 'chip' + (o[0] === current ? ' on' : ''),
        type: 'button',
        'aria-pressed': o[0] === current ? 'true' : 'false',
        onClick: function () { onPick(o[0]); }
      }, o[1]);
    }));
  }

  function set(key, value) {
    K.store.update(function (s) { s.settings[key] = value; });
    K.refresh();
  }

  function render() {
    const st = K.store.state.settings;

    return [
      h('div', { class: 'page-head' },
        h('h1', { text: 'Ustawienia' }),
        h('p', { class: 'muted', text: 'Gra działa bez sieci i niczego nie wysyła.' })
      ),

      ui.card(null,
        ui.sectionTitle('Wygląd'),
        choice([['auto', 'Jak system'], ['light', 'Jasny'], ['dark', 'Ciemny']], st.theme, function (v) { set('theme', v); })
      ),

      ui.card(null,
        ui.sectionTitle('Sterowanie'),
        h('div', { class: 'stack sm' },
          h('span', { class: 'field-label', text: 'Dwukrotne dotknięcie liczby' }),
          choice([[true, 'Włączone'], [false, 'Wyłączone']], st.chord, function (v) { set('chord', v); }),
          h('p', { class: 'field-hint', text: 'Otwiera sąsiadów liczby, gdy wokół stoi już tyle flag, ile ona pokazuje.' })
        ),
        h('hr', { class: 'divider' }),
        h('div', { class: 'stack sm' },
          h('span', { class: 'field-label', text: 'Wibracje' }),
          choice([[true, 'Włączone'], [false, 'Wyłączone']], st.vibrate, function (v) { set('vibrate', v); }),
          h('p', { class: 'field-hint', text: 'Krótki stuk przy fladze, dłuższy przy wybuchu. iPhone ich nie obsługuje.' })
        )
      ),

      ui.card(null,
        ui.sectionTitle('Jak grać'),
        K.rules()
      )
    ];
  }

  K.views = K.views || {};
  K.views.ustawienia = { render: render };
})(window.K = window.K || {});
