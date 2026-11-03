// ==UserScript==
// @name           hwm_res_value_gm
// @namespace      hwm_res_value
// @description    Примерная стоимость ресурсов, элементов и частей на странице персонажа (цены редактируются)
// @version        0.1
// @match          https://www.heroeswm.ru/pl_info.php*
// @match          https://heroeswm.ru/pl_info.php*
// @match          https://mirror.heroeswm.ru/pl_info.php*
// @grant          none
// @run-at         document-end
// ==/UserScript==

(function () {
  'use strict';

  const STORE_KEY = 'hwm_res_value_prices';

  // Примерные цены в золоте за 1 шт. Рынок плавает - поправь под себя прямо в таблице,
  // изменения сохраняются в localStorage.
  const DEFAULT_PRICES = {
    'Древесина': 180,
    'Руда': 180,
    'Ртуть': 360,
    'Сера': 360,
    'Кристаллы': 360,
    'Самоцветы': 360,

    'Абразив': 350,
    'Змеиный яд': 400,
    'Клык тигра': 500,
    'Ледяной кристалл': 1000,
    'Лунный камень': 1500,
    'Огненный кристалл': 1800,
    'Осколок метеорита': 1500,
    'Цветок ведьм': 250,
    'Цветок ветров': 900,
    'Цветок папоротника': 1000,
    'Ядовитый гриб': 200,

    'Частей очень редкого отряда': 0,
    'Части артефактов (за 1 шт.)': 0,
  };

  // Коды элементов для ссылки на рынок
  const AUCTION_CODES = {
    'Абразив': 'abrasive',
    'Змеиный яд': 'snake_poison',
    'Клык тигра': 'tiger_tusk',
    'Ледяной кристалл': 'ice_crystal',
    'Лунный камень': 'moon_stone',
    'Огненный кристалл': 'fire_crystal',
    'Осколок метеорита': 'meteorit',
    'Цветок ведьм': 'witch_flower',
    'Цветок ветров': 'wind_flower',
    'Цветок папоротника': 'fern_flower',
    'Ядовитый гриб': 'badgrib',
  };

  const BASE_RES = ['Золото', 'Древесина', 'Руда', 'Ртуть', 'Сера', 'Кристаллы', 'Самоцветы'];
  const ART_PARTS_KEY = 'Части артефактов (за 1 шт.)';

  function loadPrices() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) {}
    return Object.assign({}, DEFAULT_PRICES, saved);
  }

  function savePrices(prices) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(prices)); } catch (e) {}
  }

  const toNum = (s) => parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0;
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');

  // Верхняя полоска: картинка с title="Золото" и т.п., число - в следующей ячейке
  function parseBaseResources() {
    const res = {};
    document.querySelectorAll('img.rs[title]').forEach((img) => {
      const name = img.title;
      if (!BASE_RES.includes(name) || name in res) return;
      const td = img.closest('td');
      const next = td && td.nextElementSibling;
      if (next) res[name] = toNum(next.textContent);
    });
    return res;
  }

  // Ячейка под заголовком "Ресурсы"
  function findResourcesCell() {
    for (const b of document.querySelectorAll('td.wb > b')) {
      if (b.textContent.trim() !== 'Ресурсы') continue;
      const row = b.closest('tr').nextElementSibling;
      return row && row.cells[0];
    }
    return null;
  }

  function parseLines(el) {
    const out = [];
    el.textContent.split('\n').forEach((line) => {
      const m = line.replace(/ /g, ' ').match(/^\s*(.+?):\s*([\d,]+)\s*$/);
      if (m) out.push([m[1].trim(), toNum(m[2])]);
    });
    return out;
  }

  function parseCell(cell) {
    const clone = cell.cloneNode(true);
    const partsBlock = clone.querySelector('#pl_info_parts_desc_block');
    const realParts = cell.querySelector('#pl_info_parts_desc_block_inside');
    if (partsBlock) partsBlock.remove();
    // Строка-заголовок "Части артефактов (13):" без числа после двоеточия - сама отфильтруется
    const elements = parseLines(clone);
    const artParts = realParts ? parseLines(realParts) : [];
    return { elements, artParts };
  }

  function buildRows() {
    const rows = [];
    const base = parseBaseResources();
    BASE_RES.forEach((name) => {
      if (base[name]) rows.push({ name, qty: base[name], gold: name === 'Золото' });
    });
    const cell = findResourcesCell();
    let artParts = [];
    if (cell) {
      const parsed = parseCell(cell);
      parsed.elements.forEach(([name, qty]) => rows.push({ name, qty }));
      artParts = parsed.artParts;
      const total = artParts.reduce((s, [, q]) => s + q, 0);
      if (total) rows.push({ name: ART_PARTS_KEY, qty: total, details: artParts });
    }
    return { rows, cell };
  }

  function render() {
    const { rows, cell } = buildRows();
    if (!rows.length) return;
    const prices = loadPrices();

    const box = document.createElement('div');
    box.style.cssText = 'margin:6px 4px;padding:4px 6px;border:1px solid #b5a98c;' +
      'background:#f5f0e1;font-size:11px;';

    const head = document.createElement('div');
    head.style.cssText = 'cursor:pointer;font-weight:bold;';
    const body = document.createElement('div');
    body.style.display = 'none';
    head.onclick = () => { body.style.display = body.style.display === 'none' ? 'block' : 'none'; };

    const table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;margin-top:4px;width:100%;';

    const sumCells = [];
    rows.forEach((r) => {
      const tr = table.insertRow();
      const tdName = tr.insertCell();
      if (AUCTION_CODES[r.name]) {
        const a = document.createElement('a');
        a.href = '/auction.php?cat=elements&sort=4&art_type=' + AUCTION_CODES[r.name];
        a.target = '_blank';
        a.textContent = r.name;
        a.title = 'Открыть на рынке';
        tdName.appendChild(a);
      } else {
        tdName.textContent = r.name;
      }
      if (r.details) tdName.title = r.details.map(([n, q]) => n + ': ' + q).join('\n');

      const tdQty = tr.insertCell();
      tdQty.textContent = fmt(r.qty);
      tdQty.style.textAlign = 'right';

      const tdPrice = tr.insertCell();
      tdPrice.style.textAlign = 'right';
      if (r.gold) {
        tdPrice.textContent = '1';
      } else {
        if (!(r.name in prices)) prices[r.name] = 0;
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.min = '0';
        inp.value = prices[r.name];
        inp.style.cssText = 'width:55px;font-size:11px;text-align:right;';
        inp.oninput = () => {
          prices[r.name] = Math.max(0, parseFloat(inp.value) || 0);
          savePrices(prices);
          update();
        };
        tdPrice.appendChild(inp);
      }

      const tdSum = tr.insertCell();
      tdSum.style.cssText = 'text-align:right;padding-left:6px;';
      sumCells.push([r, tdSum]);
    });

    const reset = document.createElement('a');
    reset.href = '#';
    reset.textContent = 'сбросить цены по умолчанию';
    reset.style.fontSize = '10px';
    reset.onclick = (e) => {
      e.preventDefault();
      try { localStorage.removeItem(STORE_KEY); } catch (err) {}
      box.remove();
      render();
    };

    body.appendChild(table);
    body.appendChild(reset);
    box.appendChild(head);
    box.appendChild(body);

    function update() {
      let total = 0;
      let gold = 0;
      sumCells.forEach(([r, td]) => {
        const v = r.qty * (r.gold ? 1 : (prices[r.name] || 0));
        td.textContent = fmt(v);
        total += v;
        if (r.gold) gold = v;
      });
      head.textContent = '≈ Стоимость всего: ' + fmt(total) + ' зол.' +
        (gold ? ' (без золота: ' + fmt(total - gold) + ')' : '') + ' ▾';
    }
    update();

    if (cell) cell.insertBefore(box, cell.firstChild);
    else document.body.appendChild(box);
  }

  render();
})();
