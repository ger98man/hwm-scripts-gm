// ==UserScript==
// @name           hwm_sklad_rent_gm
// @author         ger98man
// @namespace      hwm_sklad_rent
// @description    Клановый склад: одной кнопкой арендовать тот же набор артефактов (самые дешёвые без крафта)
// @version        0.1
// @tag            hwm-gm
// @homepageURL    https://github.com/ger98man/hwm-scripts-gm
// @updateURL      https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_sklad_rent_gm.user.js
// @downloadURL    https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_sklad_rent_gm.user.js
// @match          https://*.heroeswm.ru/sklad_info.php*
// @match          https://heroeswm.ru/sklad_info.php*
// @match          https://*.lordswm.com/sklad_info.php*
// @grant          GM_getValue
// @grant          GM_setValue
// @run-at         document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const SET_KEY = 'rent_set';
  const BCNT_KEY = 'rent_bcnt';
  const CATEGORIES = [0, 1, 2, 6]; // оружие, броня, ювелирка, рюкзак
  const REQUEST_DELAY = 400;

  const skladId = new URLSearchParams(location.search).get('id');
  if (!skladId) return;

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  // Коды артефактов из блока "Ваша аренда"
  function getCurrentRent(doc) {
    const header = Array.prototype.find.call(doc.querySelectorAll('b'), function (b) {
      return b.textContent.trim() === 'Ваша аренда';
    });
    if (!header) return null;
    const row = header.closest('tr') && header.closest('tr').nextElementSibling;
    if (!row) return null;
    const codes = [];
    row.querySelectorAll('a[name]').forEach(function (a) { codes.push(a.getAttribute('name')); });
    return codes;
  }

  // Строки склада, которые можно арендовать прямо сейчас
  function parseRentRows(doc) {
    const result = [];
    doc.querySelectorAll('select[name="bcnt"]').forEach(function (select) {
      const row = select.closest('tr');
      const key = select.id.replace(/^bcnt/, '');
      const form = doc.querySelector('form[name="f' + CSS.escape(key) + '"]');
      const link = row && row.querySelector('a[name]');
      const priceCell = row && row.querySelector('td[width="80"] b');
      const title = row && row.querySelector('font');
      if (!form || !link || !priceCell || !title) return;

      const text = title.textContent.trim();
      const name = (/^'([^']+)'/.exec(text) || [])[1] || text;
      result.push({
        key: key,
        code: link.getAttribute('name'),
        name: name,
        title: text,
        crafted: /\[[A-Z0-9]+\]\s*$/.test(name),
        price: parseInt(priceCell.textContent.replace(/\D/g, ''), 10),
        maxBattles: select.options.length,
        params: collectParams(form, row),
      });
    });
    return result;
  }

  // Поля формы аренды: hidden-поля стоят в строке после <form>, браузер связывает их с формой
  function collectParams(form, row) {
    const params = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.name && el.type !== 'submit') params[el.name] = el.value;
    });
    if (!params.sign && row) {
      row.querySelectorAll('input[type="hidden"]').forEach(function (el) {
        if (el.name) params[el.name] = el.value;
      });
    }
    return params;
  }

  async function fetchDoc(url) {
    const resp = await fetch(url, { credentials: 'same-origin' });
    const buf = await resp.arrayBuffer();
    const html = new TextDecoder(document.characterSet || 'utf-8').decode(buf);
    return new DOMParser().parseFromString(html, 'text/html');
  }

  async function loadAllRows() {
    const rows = [];
    for (const cat of CATEGORIES) {
      const doc = await fetchDoc('sklad_info.php?id=' + skladId + '&cat=' + cat);
      parseRentRows(doc).forEach(function (r) { r.cat = cat; rows.push(r); });
      await sleep(REQUEST_DELAY);
    }
    return rows;
  }

  // Для каждого артефакта набора - самый дешёвый некрафтовый того же вида
  function pickItems(set, rows) {
    const used = {};
    const picked = [];
    const missing = [];
    set.forEach(function (code) {
      const candidates = rows
        .filter(function (r) { return r.code === code && !r.crafted && !used[r.key]; })
        .sort(function (a, b) { return a.price - b.price; });
      if (candidates.length) {
        used[candidates[0].key] = true;
        picked.push(candidates[0]);
      } else {
        missing.push(code);
      }
    });
    return { picked: picked, missing: missing };
  }

  async function rentItem(item, battles) {
    const params = Object.assign({}, item.params, { bcnt: String(Math.min(battles, item.maxBattles)) });
    const resp = await fetch('sklad_info.php?' + new URLSearchParams(params).toString(), { credentials: 'same-origin' });
    return resp.ok;
  }

  // ------------------ UI

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99998;background:#f6f3ea;border:1px solid #8b7a55;' +
    'border-radius:4px;padding:8px;font:12px Verdana,Arial;max-width:420px;box-shadow:0 0 6px rgba(0,0,0,.3);';
  document.body.appendChild(panel);

  function savedSet() {
    try { return JSON.parse(GM_getValue(SET_KEY, '[]')) || []; } catch (e) { return []; }
  }

  function render(message) {
    const set = savedSet();
    const battles = parseInt(GM_getValue(BCNT_KEY, 1), 10) || 1;
    panel.innerHTML =
      '<b>Аренда набора</b><br>' +
      (set.length ? 'Сохранён набор: ' + set.length + ' шт. (' + set.join(', ') + ')' : 'Набор не сохранён: возьмите вещи в аренду и откройте склад') +
      '<br>Боёв: <select id="hsr_bcnt">' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<option' + (n === battles ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
      '</select> ' +
      '<button id="hsr_go"' + (set.length ? '' : ' disabled') + '>Арендовать набор</button>' +
      (message ? '<div id="hsr_msg" style="margin-top:6px;">' + message + '</div>' : '');
    panel.querySelector('#hsr_bcnt').addEventListener('change', function (e) { GM_setValue(BCNT_KEY, e.target.value); });
    panel.querySelector('#hsr_go').addEventListener('click', run);
  }

  async function run() {
    const set = savedSet();
    const battles = parseInt(GM_getValue(BCNT_KEY, 1), 10) || 1;
    render('Ищу вещи на складе...');
    let rows;
    try {
      rows = await loadAllRows();
    } catch (e) {
      render('Ошибка загрузки склада: ' + e);
      return;
    }
    const plan = pickItems(set, rows);
    if (!plan.picked.length) {
      render('Свободных вещей из набора нет' + (plan.missing.length ? ': ' + plan.missing.join(', ') : ''));
      return;
    }

    const total = plan.picked.reduce(function (s, r) { return s + r.price * Math.min(battles, r.maxBattles); }, 0);
    const text = plan.picked.map(function (r) {
      return '- ' + r.title + ': ' + r.price + ' x ' + Math.min(battles, r.maxBattles);
    }).join('\n');
    const ok = confirm('Арендовать ' + plan.picked.length + ' шт. на ' + battles + ' боёв?\n\n' + text +
      '\n\nИтого примерно: ' + total + ' золота (+1% комиссия)' +
      (plan.missing.length ? '\n\nНе найдено свободных без крафта: ' + plan.missing.join(', ') : ''));
    if (!ok) {
      render('Отменено');
      return;
    }

    let done = 0;
    for (const item of plan.picked) {
      render('Арендую ' + (done + 1) + ' / ' + plan.picked.length + ': ' + item.name);
      try {
        if (await rentItem(item, battles)) done++;
      } catch (e) { /* продолжаем со следующей вещью */ }
      await sleep(REQUEST_DELAY);
    }
    render('Готово: отправлено ' + done + ' из ' + plan.picked.length + '. Обновляю страницу...');
    setTimeout(function () { location.reload(); }, 1000);
  }

  // Текущая аренда: первый раз запоминаем сами, дальше - только по кнопке,
  // чтобы частично взятый набор не затёр сохранённый
  const current = getCurrentRent(document);
  if (current && current.length) {
    const saved = savedSet();
    if (!saved.length) {
      GM_setValue(SET_KEY, JSON.stringify(current));
      render('Набор сохранён по текущей аренде');
    } else if (current.slice().sort().join() !== saved.slice().sort().join()) {
      render('Текущая аренда отличается от сохранённого набора: ' + current.join(', ') +
        '<br><button id="hsr_save">Сохранить текущую аренду как набор</button>');
      panel.querySelector('#hsr_save').addEventListener('click', function () {
        GM_setValue(SET_KEY, JSON.stringify(current));
        render('Набор сохранён по текущей аренде');
      });
    } else {
      render('');
    }
  } else {
    render('');
  }
})();
