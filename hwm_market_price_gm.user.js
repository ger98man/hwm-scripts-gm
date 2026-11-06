// ==UserScript==
// @name           hwm_market_price_gm
// @author         ger98man
// @license        MIT
// @namespace      hwm_market_price
// @description    Рынок: за какую цену выставить арт с вашей прочностью, чтобы он был выгоднее лотов на странице, с учётом стоимости ремонта, падения максимальной прочности и комиссии 1%
// @version        0.3
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
  const SAVE_VERSION = 2; // старые настройки могли сохранить неверно разобранную стоимость ремонта
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
    try {
      const data = JSON.parse(GM_getValue(KEY, '{}')) || {};
      // стоимость ремонта из прошлых версий недостоверна: запросим её заново
      if (data.v !== SAVE_VERSION) data.rep = null;
      return data;
    } catch (e) { return {}; }
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

  function firstNumber(node) {
    if (!node) return 0;
    const found = /\d[\d,.\s]*\d|\d/.exec(node.textContent);
    return found ? num(found[0]) : 0;
  }

  // Число берётся из блока рядом с подписью, а не поиском по тексту всей страницы: в тексте
  // `art_info.php` цена стоит вплотную к подвалу - «Стоимость ремонта:12,8002007-2026»,
  // и регулярка вместо 12,800 давала 6 (хвост года), проверено на живой странице `arm_handgun2`.
  function findRepairCost(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const label = Array.prototype.find.call(doc.querySelectorAll('b'), function (b) {
      return /Стоимость\s+ремонта/i.test(b.textContent);
    });
    if (!label) return 0;
    return firstNumber(label) || firstNumber(label.nextElementSibling);
  }

  // ------------------ панель

  const lots = parseLots();
  const table = lots.length ? lots[0].row.closest('table') : document.querySelector('form[name="sel"]');
  if (!table) return;

  const saved = loadSaved();
  const style = document.createElement('style');
  style.textContent =
    '.mp_panel{margin:6px 0;padding:8px 10px;border:1px solid #b9a77a;border-radius:4px;background:#f7f1df;font-size:12px;text-align:left}' +
    '.mp_title{font-weight:bold;margin-bottom:6px}' +
    '.mp_inputs{display:flex;flex-wrap:nowrap;align-items:center;gap:14px;white-space:nowrap}' +
    '.mp_inputs label{display:flex;align-items:center;gap:4px;color:#444}' +
    '.mp_inputs input{padding:1px 3px;font-size:12px}' +
    '.mp_note{color:#888;font-size:11px;margin-top:5px}' +
    '.mp_table{width:100%;margin-top:8px;border-collapse:collapse;background:#fff;border:1px solid #d8cba5}' +
    '.mp_table th{background:#e9dfc2;color:#333;font-weight:normal;padding:4px 8px;text-align:right;border-bottom:1px solid #d8cba5;cursor:help}' +
    '.mp_table td{padding:4px 8px;text-align:right;border-bottom:1px solid #eee5cc;font-variant-numeric:tabular-nums}' +
    '.mp_table th:first-child,.mp_table td:first-child{text-align:left}' +
    '.mp_table td.mp_hint{text-align:left;color:#888;font-size:11px}' +
    '.mp_table tr.mp_best td{background:#eef6e6}' +
    '.mp_table tr.mp_mine td{background:#fbf6e6;border-top:2px solid #d8cba5}' +
    '.mp_price{font-weight:bold}' +
    '.mp_repair{margin-top:6px}' +
    '.mp_good{color:#060;font-weight:bold}.mp_bad{color:#a00;font-weight:bold}.mp_warn{color:#a60;margin-top:6px}';
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'mp_panel';
  panel.innerHTML =
    '<div class="mp_title">Цена для продажи</div>' +
    '<div class="mp_inputs">' +
    '<label title="Текущая / максимальная прочность вашего арта">Прочность <input id="mp_cur" type="number" min="1" style="width:46px">' +
    ' / <input id="mp_max" type="number" min="1" style="width:46px"></label>' +
    '<label title="Стоимость одного ремонта">Ремонт <input id="mp_rep" type="number" min="0" style="width:66px"> зол.</label>' +
    '<label title="На сколько золотых подрезать цену конкурента">Шаг <input id="mp_step" type="number" min="0" style="width:46px"> зол.</label>' +
    '<label title="Проверить свою цену: какое место займёт лот">Моя цена <input id="mp_my" type="number" min="1" style="width:76px"></label>' +
    '</div>' +
    '<div id="mp_out"></div>' +
    '<div id="mp_note" class="mp_note"></div>';
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

  function place(market, perBattle) {
    return market.filter(function (item) { return item.plan.perBattle < perBattle; }).length + 1;
  }

  function resultRow(className, label, price, input, market, hint) {
    const plan = bestPlan(price, input.cur, input.max, input.rep);
    return '<tr class="' + className + '"><td>' + label + '</td>' +
      '<td class="mp_price">' + groupDigits(price) + '</td>' +
      '<td>' + groupDigits(net(price)) + '</td>' +
      '<td>' + fmtBattle(plan.perBattle) + '</td>' +
      '<td>' + plan.repairs + '</td>' +
      '<td>' + place(market, plan.perBattle) + ' из ' + (market.length + 1) + '</td>' +
      '<td class="mp_hint">' + hint + '</td></tr>';
  }

  function render() {
    const input = readInputs();
    save({ v: SAVE_VERSION, cur: input.cur, max: input.max, rep: input.rep, step: input.step });
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

    const target = function (perBattle) { return priceForTarget(perBattle, input.cur, input.max, input.rep); };
    let html = '<table class="mp_table"><tr>' +
      '<th>Вариант</th>' +
      '<th title="Цена, которую ставить в лот">Цена</th>' +
      '<th title="Что останется после комиссии рынка 1%">На руки</th>' +
      '<th title="Средняя цена боя для покупателя с учётом выгодных ремонтов">Цена боя</th>' +
      '<th title="Сколько раз покупателю выгодно чинить арт">Ремонтов</th>' +
      '<th title="Место среди лотов «Купить сразу» по цене боя">Место</th>' +
      '<th></th></tr>';
    html += resultRow('mp_best', 'Быстро', target(best - stepPerBattle), input, market, 'дешевле всех по цене боя');
    if (market.length > 1) html += resultRow('', 'Вторым', target(second - stepPerBattle), input, market, 'между 1-м и 2-м лотом');
    if (market.length > 2) html += resultRow('', 'По медиане', target(median), input, market, 'дороже, продаётся дольше');
    if (input.my > 0) html += resultRow('mp_mine', 'Моя цена', input.my, input, market, 'введена вручную');
    html += '</table>';

    // Чинить ли перед продажей: после ремонта арт станет (max-1)/(max-1)
    if (input.rep > 0 && input.max - 1 > input.cur) {
      const asIs = target(best - stepPerBattle);
      const fixed = priceForTarget(best - stepPerBattle, input.max - 1, input.max - 1, input.rep);
      const gain = net(fixed) - input.rep - net(asIs);
      html += '<div class="mp_repair">Починить перед продажей до ' + (input.max - 1) + '/' + (input.max - 1) +
        ' и выставить за ' + groupDigits(fixed) + ': ' +
        (gain > 0 ? '<span class="mp_good">выгоднее на ' + groupDigits(gain) + '</span>'
                  : '<span class="mp_bad">невыгодно, теряете ' + groupDigits(-gain) + '</span>') +
        ' (с учётом ремонта и комиссии).</div>';
    }

    if (!input.rep) html += '<div class="mp_warn">Стоимость ремонта не задана: расчёт без ремонтов.</div>';
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
