// ==UserScript==
// @name           hwm_market_price_gm
// @author         ger98man
// @license        MIT
// @namespace      hwm_market_price
// @description    Рынок: за какую цену выставить арт с вашей прочностью, чтобы он был выгоднее лотов на странице, с учётом стоимости ремонта, падения максимальной прочности и комиссии 1%
// @version        0.1
// @tag            hwm-gm
// @homepageURL    https://github.com/ger98man/hwm-scripts-gm
// @updateURL      https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_market_price_gm.user.js
// @downloadURL    https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_market_price_gm.user.js
// @match          https://*.heroeswm.ru/auction.php*
// @match          https://heroeswm.ru/auction.php*
// @match          https://*.lordswm.com/auction.php*
// @grant          GM_getValue
// @grant          GM_setValue
// @run-at         document-idle
// @noframes
// ==/UserScript==

// Модель цены. Покупатель платит за бои: арт с прочностью cur/max даёт cur боёв, после каждого
// ремонта (цена R, не меняется) прочность восстанавливается до max-1, max-2, ... Покупатель сам
// выбирает, сколько раз чинить: столько, чтобы средняя цена боя (цена + ремонты) / (бои) была
// минимальной. Эта «цена боя с ремонтами» и сравнивается между лотами: поэтому арт с большей
// максимальной прочностью стоит дороже при той же текущей.
// Комиссия рынка 1% снимается с продавца: показываем, сколько останется на руки.

(function () {
  'use strict';

  const artType = new URLSearchParams(location.search).get('art_type');
  if (!artType) return;

  const KEY = 'price_' + artType;
  const MAX_REPAIRS = 200;
  const FEE = 0.01; // комиссия рынка с продавца

  function net(price) {
    return Math.floor(price * (1 - FEE));
  }

  // ------------------ утилиты

  function num(text) {
    return parseInt(String(text).replace(/[^\d]/g, ''), 10);
  }

  function groupDigits(value) {
    return String(Math.round(value)).replace(/\B(?=(\d{3})+$)/g, ',');
  }

  function fmtBattle(value) {
    return isFinite(value) ? value.toFixed(1) : '—';
  }

  function loadSaved() {
    try { return JSON.parse(GM_getValue(KEY, '{}')) || {}; } catch (e) { return {}; }
  }

  function save(data) {
    GM_setValue(KEY, JSON.stringify(data));
  }

  function loadPageText(url) {
    return fetch(new URL(url, location.href).href, { credentials: 'include' })
      .then(function (response) { return response.arrayBuffer(); })
      .then(function (bytes) { return new TextDecoder('windows-1251').decode(bytes); })
      .catch(function () { return ''; });
  }

  // ------------------ модель

  // Сколько раз чинить и какая выходит средняя цена боя. Бои после n-го ремонта: max - n.
  function bestPlan(price, cur, max, repair) {
    let best = { perBattle: price / cur, repairs: 0, battles: cur };
    let battles = cur;
    for (let n = 1; n <= MAX_REPAIRS && max - n > 0; n++) {
      battles += max - n;
      const perBattle = (price + n * repair) / battles;
      if (perBattle < best.perBattle) best = { perBattle: perBattle, repairs: n, battles: battles };
    }
    return best;
  }

  // Наибольшая цена, при которой средняя цена боя нашего арта не выше target.
  // Для каждого числа ремонтов n: price <= target * бои(n) - n * R; берём лучший вариант.
  function priceForTarget(target, cur, max, repair) {
    let best = target * cur;
    let battles = cur;
    for (let n = 1; n <= MAX_REPAIRS && max - n > 0; n++) {
      battles += max - n;
      best = Math.max(best, target * battles - n * repair);
    }
    return Math.floor(best);
  }

  // ------------------ лоты на странице

  function parseLots() {
    const lots = [];
    document.querySelectorAll('tr.wb').forEach(function (row) {
      const cells = row.children;
      if (cells.length < 4) return;
      const dur = /Прочность:\s*(\d+)\s*\/\s*(\d+)/.exec(cells[0].textContent);
      const priceBox = cells[2].querySelector('div[id^="au"]');
      if (!dur || !priceBox) return;
      const price = num(priceBox.textContent);
      if (!price) return;
      const lotLink = cells[0].querySelector('a[name]');
      lots.push({
        row: row,
        id: lotLink ? lotLink.getAttribute('name') : '',
        cur: parseInt(dur[1], 10),
        max: parseInt(dur[2], 10),
        price: price,
        buyNow: cells[1].textContent.indexOf('Купить сразу') > -1,
      });
    });
    return lots;
  }

  // ------------------ стоимость ремонта со страницы арта

  function findRepairCost(html) {
    const text = new DOMParser().parseFromString(html, 'text/html').body.textContent.replace(/\s+/g, ' ');
    const found = /ремонт\S*[^\d]{0,40}?(\d[\d,. ]*\d|\d)/i.exec(text);
    return found ? num(found[1]) : 0;
  }

  // ------------------ панель

  const lots = parseLots();
  const table = lots.length ? lots[0].row.closest('table') : document.querySelector('form[name="sel"]');
  if (!table) return;

  const saved = loadSaved();
  const panel = document.createElement('div');
  panel.style.cssText = 'margin:6px 0;padding:6px 8px;border:1px solid #b9a77a;background:#f7f1df;font-size:12px;text-align:left;';
  panel.innerHTML =
    '<b>Цена для продажи</b> ' +
    '&nbsp; Моя прочность: <input id="mp_cur" type="number" min="1" style="width:50px">' +
    ' / <input id="mp_max" type="number" min="1" style="width:50px">' +
    ' &nbsp; Ремонт: <input id="mp_rep" type="number" min="0" style="width:70px"> зол.' +
    ' &nbsp; Шаг: <input id="mp_step" type="number" min="0" style="width:50px"> зол.' +
    ' &nbsp; Моя цена: <input id="mp_my" type="number" min="1" style="width:80px" placeholder="проверить">' +
    '<div id="mp_note" style="color:#777;margin-top:3px"></div>' +
    '<div id="mp_out" style="margin-top:4px"></div>';
  table.parentNode.insertBefore(panel, table);

  const el = function (id) { return panel.querySelector('#' + id); };
  const inputs = { cur: el('mp_cur'), max: el('mp_max'), rep: el('mp_rep'), step: el('mp_step'), my: el('mp_my') };

  const sample = lots[0];
  inputs.cur.value = saved.cur || (sample ? sample.max : '');
  inputs.max.value = saved.max || (sample ? sample.max : '');
  inputs.rep.value = saved.rep != null ? saved.rep : '';
  inputs.step.value = saved.step != null ? saved.step : 1;

  const notes = [];
  const onlyWhole = document.querySelector('input[name="chb3"]');
  if (onlyWhole && onlyWhole.checked) notes.push('Включено «Только целые»: повреждённые лоты не учтены.');
  if (lots.some(function (lot) { return !lot.buyNow; })) notes.push('Лоты-торги показаны, но в расчёт цены не идут.');

  function readInputs() {
    return {
      cur: parseInt(inputs.cur.value, 10),
      max: parseInt(inputs.max.value, 10),
      rep: inputs.rep.value === '' ? null : Math.max(0, parseInt(inputs.rep.value, 10) || 0),
      step: Math.max(0, parseInt(inputs.step.value, 10) || 0),
      my: parseInt(inputs.my.value, 10),
    };
  }

  function markLot(lot, plan) {
    let cell = lot.row.querySelector('.mp_cell');
    if (!cell) {
      cell = document.createElement('div');
      cell.className = 'mp_cell';
      cell.style.cssText = 'font-size:11px;color:#555;margin-top:2px';
      lot.row.children[2].appendChild(cell);
    }
    cell.textContent = 'бой: ' + fmtBattle(plan.perBattle) + (plan.repairs ? ' (ремонтов: ' + plan.repairs + ')' : '');
  }

  function recommendation(label, target, input, extra) {
    const price = priceForTarget(target, input.cur, input.max, input.rep);
    const plan = bestPlan(price, input.cur, input.max, input.rep);
    return '<tr><td>' + label + '</td><td><b>' + groupDigits(price) + '</b></td><td>' + fmtBattle(plan.perBattle) +
      '</td><td>' + groupDigits(net(price)) + '</td><td>' + (extra || '') + '</td></tr>';
  }

  function render() {
    const input = readInputs();
    save({ cur: input.cur, max: input.max, rep: input.rep, step: input.step });
    el('mp_note').textContent = notes.join(' ');
    const out = el('mp_out');

    if (!(input.cur > 0 && input.max >= input.cur)) {
      out.textContent = 'Укажите прочность: текущая от 1 до максимальной.';
      return;
    }

    const market = lots.map(function (lot) {
      const plan = bestPlan(lot.price, lot.cur, lot.max, input.rep);
      markLot(lot, plan);
      return { lot: lot, plan: plan };
    }).filter(function (item) { return item.lot.buyNow; })
      .sort(function (a, b) { return a.plan.perBattle - b.plan.perBattle; });

    if (!market.length) {
      out.textContent = 'На странице нет лотов «Купить сразу» для сравнения.';
      return;
    }

    // Шаг в золоте переводим в цену боя по нашему арту: снижение цены на step золотых
    const best = market[0].plan.perBattle;
    const myBattles = bestPlan(priceForTarget(best, input.cur, input.max, input.rep), input.cur, input.max, input.rep).battles;
    const stepPerBattle = input.step / myBattles;
    const second = market[1] ? market[1].plan.perBattle : best;
    const median = market[Math.floor((market.length - 1) / 2)].plan.perBattle;

    let html = '<table cellpadding="2" style="border-collapse:collapse">' +
      '<tr style="color:#777"><td>Вариант</td><td>Цена</td><td>Бой</td><td>На руки</td><td></td></tr>';
    html += recommendation('Быстро: дешевле всех', best - stepPerBattle, input, 'первым в списке по цене боя');
    if (market.length > 1) html += recommendation('Вторым', second - stepPerBattle, input, 'между 1-м и 2-м лотом');
    if (market.length > 2) html += recommendation('По медиане', median, input, 'ждать покупателя дольше');
    html += '</table>';

    // Чинить ли перед продажей: после ремонта арт станет (max-1)/(max-1)
    if (input.rep > 0 && input.max - 1 > input.cur) {
      const asIs = priceForTarget(best - stepPerBattle, input.cur, input.max, input.rep);
      const fixed = priceForTarget(best - stepPerBattle, input.max - 1, input.max - 1, input.rep);
      const gain = net(fixed) - input.rep - net(asIs);
      html += '<div style="margin-top:4px">Починить перед продажей: цена ' + groupDigits(fixed) + ' (' +
        (input.max - 1) + '/' + (input.max - 1) + '), с учётом ремонта и комиссии ' +
        (gain > 0 ? '<b style="color:#060">выгоднее на ' + groupDigits(gain) + '</b>'
                  : '<b style="color:#a00">невыгодно (' + groupDigits(gain) + ')</b>') + '.</div>';
    }

    if (input.my > 0) {
      const plan = bestPlan(input.my, input.cur, input.max, input.rep);
      const place = market.filter(function (item) { return item.plan.perBattle < plan.perBattle; }).length + 1;
      html += '<div style="margin-top:4px">Моя цена ' + groupDigits(input.my) + ' (на руки ' + groupDigits(net(input.my)) + '): бой ' + fmtBattle(plan.perBattle) +
        (plan.repairs ? ' при ' + plan.repairs + ' ремонтах' : '') + ', место ' + place + ' из ' + (market.length + 1) + '.</div>';
    }

    if (!input.rep) html += '<div style="color:#a60;margin-top:4px">Стоимость ремонта не задана: расчёт без ремонтов.</div>';
    out.innerHTML = html;
  }

  Object.keys(inputs).forEach(function (name) {
    inputs[name].addEventListener('input', render);
  });
  render();

  if (saved.rep == null) {
    loadPageText('art_info.php?id=' + encodeURIComponent(artType)).then(function (html) {
      const cost = findRepairCost(html);
      if (cost && !inputs.rep.value) {
        inputs.rep.value = cost;
        notes.push('Стоимость ремонта взята со страницы арта, проверьте.');
        render();
      }
    });
  }
})();
