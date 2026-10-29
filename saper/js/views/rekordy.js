(function (K) {
  'use strict';

  const ui = K.ui;
  const h = ui.h;

  function date(iso) {
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function stat(value, label) {
    return h('div', { class: 'stat' }, h('b', { text: value }), h('span', { text: label }));
  }

  function levelCard(id) {
    const lv = K.game.LEVELS[id];
    const s = K.store.state.stats[id];
    const rate = s.played ? Math.round(s.won / s.played * 100) + '%' : '—';

    return ui.card(null,
      h('div', { class: 'row between' },
        ui.sectionTitle(lv.label, lv.cols + '×' + lv.rows + ' · ' + lv.mines + ' ' + ui.plural(lv.mines, 'mina', 'miny', 'min')),
        h('span', { class: 'badge', text: s.played + ' ' + ui.plural(s.played, 'gra', 'gry', 'gier') })
      ),
      h('div', { class: 'grid-3' },
        stat(s.times.length ? K.fmtTime(s.times[0].ms) : '—', 'rekord'),
        stat(rate, 'wygranych'),
        stat(s.streak + ' / ' + s.bestStreak, 'seria / max')
      ),
      s.times.length
        ? h('ol', { class: 'times' }, s.times.slice(0, 5).map(function (t, i) {
          return h('li', { class: i === 0 ? 'top' : null },
            h('span', { class: 'pos', text: i + 1 + '.' }),
            h('span', { class: 't', text: K.fmtTime(t.ms) }),
            h('span', { class: 'd', text: date(t.at) })
          );
        }))
        : h('p', { class: 'muted', text: 'Jeszcze żadnej wygranej na tym poziomie.' })
    );
  }

  function render() {
    const stats = K.store.state.stats;
    const any = K.game.ORDER.some(function (id) { return stats[id].played; });

    return [
      h('div', { class: 'page-head' },
        h('h1', { text: 'Rekordy' }),
        h('p', { class: 'muted', text: 'Najlepsze czasy i serie zwycięstw. Zostają tylko na tym urządzeniu.' })
      ),
      any ? null : ui.empty('Rozegraj pierwszą partię — tutaj pojawią się Twoje czasy.'),
      K.game.ORDER.map(levelCard),
      any ? h('div', { class: 'row' },
        ui.button('Wyczyść rekordy', {
          variant: 'danger',
          icon: 'trash',
          onClick: function () {
            ui.confirm({
              title: 'Wyczyścić rekordy?',
              body: 'Znikną czasy, serie i liczba rozegranych gier na wszystkich poziomach.',
              confirmLabel: 'Wyczyść',
              danger: true
            }).then(function (ok) {
              if (!ok) return;
              K.store.resetStats();
              K.refresh();
              ui.toast('Rekordy wyczyszczone.');
            });
          }
        })
      ) : null
    ];
  }

  K.views = K.views || {};
  K.views.rekordy = { render: render };
})(window.K = window.K || {});
