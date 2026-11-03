// ==UserScript==
// @name           hwm_combat_info_gm
// @author         ger98man
// @license        MIT
// @namespace      hwm_combat_info
// @description    В бою под окном информации об отряде или герое показывает здоровье, численность, позицию на шкале АТБ, живые отряды армии и умения по фракциям
// @version        1.0
// @tag            hwm-gm
// @homepageURL    https://github.com/ger98man/hwm-scripts-gm
// @updateURL      https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_combat_info_gm.user.js
// @downloadURL    https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_combat_info_gm.user.js
// @match          https://www.heroeswm.ru/war*
// @match          https://heroeswm.ru/war*
// @match          https://mirror.heroeswm.ru/war*
// @match          https://my.lordswm.com/war*
// @match          https://www.lordswm.com/war*
// @grant          unsafeWindow
// @run-at         document-idle
// ==/UserScript==

(function () {
  'use strict';

  const w = unsafeWindow;

  const REFRESH_MS = 300;
  const GAP = 4;
  // Окна игры с информацией о выбранном отряде или герое
  const INFO_WINDOWS = ['win_InfoCreature', 'win_InfoCreatureEffect', 'win_InfoHero', 'win_InfoHero2'];

  const TEXT = location.hostname.indexOf('heroeswm') > -1 ? {
    size: 'Численность', health: 'Здоровье', atb: 'Позиция АТБ', army: 'Здоровье армии', alive: 'Живых отрядов', skills: 'Умения',
    factions: ['Рыцарь', 'Некромант', 'Маг', 'Эльф', 'Варвар', 'Тёмный эльф', 'Демон', 'Гном', 'Степной варвар', 'Фараон'],
  } : {
    size: 'Stack size', health: 'Health', atb: 'ATB position', army: 'Army health', alive: 'Stacks alive', skills: 'Skills',
    factions: ['Knight', 'Necromancer', 'Wizard', 'Elf', 'Barbarian', 'Dark elf', 'Demon', 'Dwarf', 'Tribal', 'Pharaoh'],
  };

  const style = document.createElement('style');
  style.textContent =
    '#hwm_ci_box{position:fixed;z-index:2147483645;display:none;box-sizing:border-box;padding:4px 8px;pointer-events:none;' +
    'background:rgba(30,24,14,.92);border:1px solid #b8964f;border-radius:4px;color:#f0e6cc;' +
    'font:12px Verdana,Arial,sans-serif;line-height:1.4;}' +
    '#hwm_ci_box b{color:#f0d999;}';
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.id = 'hwm_ci_box';
  document.body.appendChild(box);

  function allUnits() {
    const pole = w.stage && w.stage.pole;
    return pole && pole.obj ? pole.obj : {};
  }

  function selectedUnit() {
    return w.cur_unit_info === undefined ? null : allUnits()[w.cur_unit_info] || null;
  }

  function openWindow() {
    for (const id of INFO_WINDOWS) {
      const el = document.getElementById(id);
      if (el && getComputedStyle(el).display !== 'none') return el;
    }
    return null;
  }

  // Текущее здоровье считаем по верхнему существу отряда. Если игра урезала здоровье существ
  // (maxhealth меньше realhealth), исходный максимум неизвестен: max равен null
  function stackHealth(unit) {
    const count = unit.nownumber || 0;
    return {
      now: count > 0 ? (count - 1) * unit.maxhealth + unit.nowhealth : 0,
      max: unit.maxhealth === unit.realhealth ? unit.maxnumber * unit.realhealth : null,
    };
  }

  function formatHealth(health) {
    if (health.max === null) return health.now + '/?';
    const percent = health.max > 0 ? Math.round(health.now / health.max * 100) : 0;
    return health.now + '/' + health.max + ' (' + percent + '%)';
  }

  // Призванные прямо в бою отряды не считаем: в начальной армии их не было
  function armyLines(hero) {
    const units = allUnits();
    const army = Object.keys(units).map(function (key) {
      return units[key];
    }).filter(function (unit) {
      return unit && !unit.hero && !unit.rock && unit.owner === hero.owner && !unit.summoned2;
    });
    const healths = army.map(stackHealth);
    const unknown = healths.some(function (health) { return health.max === null; });
    const total = {
      now: healths.reduce(function (sum, health) { return sum + health.now; }, 0),
      max: unknown ? null : healths.reduce(function (sum, health) { return sum + health.max; }, 0),
    };
    const alive = army.filter(function (unit) { return unit.nownumber > 0; }).length;
    return [[TEXT.army, formatHealth(total)], [TEXT.alive, alive + '/' + army.length]];
  }

  function factionSkills(owner) {
    const levels = w.umelka && w.umelka[owner];
    if (!levels) return null;
    const parts = [];
    TEXT.factions.forEach(function (name, index) {
      const level = levels[index + 1];
      if (level > 0) parts.push(name + ' ' + level);
    });
    return parts.length ? parts.join(', ') : null;
  }

  function describe(unit) {
    const lines = [];
    if (unit.hero) {
      lines.push.apply(lines, armyLines(unit));
      const skills = factionSkills(unit.owner);
      if (skills) lines.push([TEXT.skills, skills]);
    } else {
      lines.push([TEXT.size, unit.nownumber + '/' + unit.maxnumber]);
      lines.push([TEXT.health, formatHealth(stackHealth(unit))]);
    }
    if (unit.nowinit !== undefined) lines.push([TEXT.atb, unit.nowinit]);
    return lines;
  }

  function render(lines) {
    box.textContent = '';
    lines.forEach(function (line) {
      const row = document.createElement('div');
      const label = document.createElement('b');
      label.textContent = line[0] + ': ';
      row.appendChild(label);
      row.appendChild(document.createTextNode(line[1]));
      box.appendChild(row);
    });
  }

  // Под окном игры, а если снизу не хватает места, то над ним
  function placeNear(win) {
    const rect = win.getBoundingClientRect();
    box.style.display = 'block';
    box.style.maxWidth = Math.max(rect.width, 260) + 'px';
    const below = rect.bottom + GAP;
    const fitsBelow = below + box.offsetHeight <= window.innerHeight;
    box.style.left = Math.max(0, rect.left) + 'px';
    box.style.top = (fitsBelow ? below : Math.max(0, rect.top - GAP - box.offsetHeight)) + 'px';
  }

  let shown = '';

  function update() {
    const win = openWindow();
    const unit = win && selectedUnit();
    if (!unit) {
      box.style.display = 'none';
      shown = '';
      return;
    }
    const lines = describe(unit);
    const key = JSON.stringify(lines);
    if (key !== shown) {
      render(lines);
      shown = key;
    }
    placeNear(win);
  }

  setInterval(update, REFRESH_MS);
})();
