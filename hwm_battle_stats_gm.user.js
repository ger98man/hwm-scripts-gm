// ==UserScript==
// @name           hwm_battle_stats_gm
// @author         ger98man
// @license        MIT
// @namespace      hwm_battle_stats
// @description    В бою показывает суммарное здоровье обеих команд и рейтинг отрядов и героев по нанесённому урону
// @version        0.1
// @tag            hwm-gm
// @homepageURL    https://github.com/ger98man/hwm-scripts-gm
// @updateURL      https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_battle_stats_gm.user.js
// @downloadURL    https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_battle_stats_gm.user.js
// @match          https://www.heroeswm.ru/war*
// @match          https://heroeswm.ru/war*
// @match          https://mirror.heroeswm.ru/war*
// @match          https://my.lordswm.com/war*
// @match          https://www.lordswm.com/war*
// @grant          unsafeWindow
// @run-at         document-idle
// ==/UserScript==

// Нанесённого урона игра нигде не хранит, поэтому считаем его сами.
// Игра вызывает scene.procceddamage(i) на каждого получившего урон, а того, кто ударил,
// кладёт в obj[i].damaged (так же работает hwm_no_retaliation_gm). Величины удара в вызове нет,
// поэтому берём её из падения здоровья цели: сколько здоровья она потеряла, столько и
// записываем указанному источнику. Падение учитывается один раз: lastHp двигается вместе
// с подсчётом, а проверяем мы и вокруг вызова хука, и по таймеру - то, что игра применяет
// позже (яд, анимация), догоняет таймер.
// Что в счёт не попадает: урон без источника (obj[i].damaged == 0 - мины, огненный щит)
// и удар по уже упавшему здоровью, если игра применила два удара между проверками -
// такой урон уходит последнему источнику.
// Команды: у объекта героя есть side (1 или -1), сторона отряда - это side героя его владельца.
// Декоративные объекты игры тоже лежат в heroes (флаг, hero и rock сразу), их пропускаем.

(function () {
  'use strict';

  const w = unsafeWindow;

  const REFRESH_MS = 200;
  // Сколько раз за бой можно заново повесить хук, если игра или другой скрипт его заменили
  const MAX_HOOKS = 8;
  const DRAG_THRESHOLD = 3;
  const POS_KEY = 'hwm_battle_stats_pos';
  const OPEN_KEY = 'hwm_battle_stats_open';

  const IS_RU = location.hostname.indexOf('heroeswm') > -1;

  const TEXT = IS_RU ? {
    title: 'Статистика боя', health: 'Здоровье команд', damage: 'Нанесённый урон',
    empty: 'Урона ещё не было', unavailable: 'Урон не считается: игра не отдала обработчик',
    hint: 'Потяните за заголовок, щёлкните чтобы свернуть',
  } : {
    title: 'Battle stats', health: 'Team health', damage: 'Damage dealt',
    empty: 'No damage yet', unavailable: 'Damage is not counted: no game handler',
    hint: 'Drag the header, click to collapse',
  };

  const SIDE_COLORS = { '1': '#8ab4f8', '-1': '#ff8a7a' };
  const NEUTRAL_COLOR = '#d8c89a';

  /* ---------- данные боя ---------- */

  function scene() {
    if (!w.stage) return null;
    return w.stage[w.war_scr] || w.stage.pole || null;
  }

  function units() {
    const current = scene();
    return current && current.obj ? current.obj : {};
  }

  // Всё, что может получать урон: отряды и осадные объекты, но не герои
  function isTarget(unit) {
    return !!unit && !unit.hero;
  }

  // Отряды, из которых складывается здоровье команды
  function isStack(unit) {
    return !!unit && !unit.hero && !unit.rock;
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

  function sidesByOwner() {
    const list = units();
    const sides = {};
    Object.keys(w.heroes || {}).forEach(function (owner) {
      const hero = list[w.heroes[owner]];
      if (hero && !hero.rock) sides[owner] = hero.side;
    });
    return sides;
  }

  function heroNames() {
    const list = units();
    const names = {};
    Object.keys(w.heroes || {}).forEach(function (owner) {
      const hero = list[w.heroes[owner]];
      if (!hero || hero.rock) return;
      if (!names[hero.side]) names[hero.side] = [];
      names[hero.side].push(hero.nametxt || owner);
    });
    return names;
  }

  /* ---------- подсчёт урона ---------- */

  // Индекс отряда -> нанесённый им урон
  const damage = {};
  // Индекс цели -> кто ударил её в последний раз
  const source = {};
  // Индекс цели -> её здоровье на момент последнего подсчёта
  const lastHp = {};
  // Индекс цели -> её максимум здоровья на тот же момент
  const lastMax = {};

  let hookedScene = null;
  let damageHook = null;
  let hookCount = 0;

  function resetBattle() {
    [damage, source, lastHp, lastMax].forEach(function (store) {
      Object.keys(store).forEach(function (key) { delete store[key]; });
    });
  }

  // Падение здоровья цели с прошлой проверки записываем её последнему источнику.
  // Рост здоровья (лечение, поднятие) только сдвигает отметку
  function settle(index) {
    const unit = units()[index];
    if (!isTarget(unit)) return;
    const now = stackHealth(unit).now;
    const was = lastHp[index];
    const wasMax = lastMax[index];
    lastHp[index] = now;
    lastMax[index] = unit.maxhealth;
    // Смена максимума здоровья пересчитывает здоровье отряда: это не урон
    if (was === undefined || wasMax !== unit.maxhealth || now >= was) return;
    const by = source[index];
    if (!(by > 0)) return;
    damage[by] = (damage[by] || 0) + (was - now);
  }

  function settleAll() {
    const list = units();
    Object.keys(list).forEach(function (key) { settle(key); });
  }

  function onDamage(i) {
    // Удар меняет источник, поэтому сначала закрываем ещё не учтённое падение прежним
    settle(i);
    const victim = this.obj[i];
    if (victim && victim.damaged > 0) source[i] = victim.damaged;
  }

  // Поверх обработчика игры могла встать обёртка другого скрипта: она вызовет нашу,
  // поэтому чужую обёртку не трогаем, а свою при подмене ставим заново
  function installHook() {
    const current = scene();
    if (current !== hookedScene) {
      hookedScene = current;
      damageHook = null;
      hookCount = 0;
      resetBattle();
    }
    if (!hookedScene || typeof hookedScene.procceddamage !== 'function') return;
    if (hookedScene.procceddamage === damageHook || hookedScene.procceddamage.hwmStatsWrapped) return;
    if (hookCount >= MAX_HOOKS) return;
    hookCount++;
    const original = hookedScene.procceddamage;
    const wrapper = function (i) {
      // Если наших обёрток вдруг несколько, считает только самая новая
      const isNewest = wrapper === damageHook;
      if (isNewest) {
        try { onDamage.apply(this, arguments); } catch (e) {}
      }
      const result = original.apply(this, arguments);
      if (isNewest) {
        try { settle(i); } catch (e) {}
      }
      return result;
    };
    wrapper.hwmStatsWrapped = true;
    damageHook = wrapper;
    hookedScene.procceddamage = wrapper;
  }

  function isCounting() {
    return !!damageHook;
  }

  /* ---------- сводка ---------- */

  function teams() {
    const list = units();
    const sides = sidesByOwner();
    const names = heroNames();
    const bySide = {};

    Object.keys(names).forEach(function (side) {
      bySide[side] = { side: Number(side), names: names[side], now: 0, max: 0, unknown: false };
    });
    Object.keys(list).forEach(function (key) {
      const unit = list[key];
      if (!isStack(unit)) return;
      const team = bySide[sides[unit.owner]];
      if (!team) return;
      // Призванных в бою считаем наравне с остальными: иначе здоровье команды выходит
      // больше её максимума и процент получается больше ста
      const health = stackHealth(unit);
      team.now += health.now;
      if (health.max === null) {
        team.unknown = true;
        return;
      }
      team.max += health.max;
    });

    return Object.keys(bySide).map(function (side) { return bySide[side]; }).sort(function (a, b) {
      return b.side - a.side;
    });
  }

  // Одноимённые отряды одной стороны нумеруем по порядку индексов, иначе в рейтинге
  // окажется безымянно одна из двух «Инквизиторов». Нумеруем по всем отрядам стороны,
  // а не только по попавшим в рейтинг: иначе номер пропадёт, когда ударил лишь один из них
  function displayNames(list, sides) {
    const groups = {};
    Object.keys(list).map(Number).sort(function (a, b) {
      return a - b;
    }).forEach(function (index) {
      const unit = list[index];
      if (!unit || sides[unit.owner] === undefined) return;
      const key = sides[unit.owner] + '|' + (unit.nametxt || '?');
      if (!groups[key]) groups[key] = [];
      groups[key].push(index);
    });
    const names = {};
    Object.keys(groups).forEach(function (key) {
      const indexes = groups[key];
      const name = key.slice(key.indexOf('|') + 1);
      indexes.forEach(function (index, position) {
        names[index] = indexes.length > 1 ? name + ' (' + (position + 1) + ')' : name;
      });
    });
    return names;
  }

  function ranking() {
    const list = units();
    const sides = sidesByOwner();
    const names = displayNames(list, sides);
    const rows = Object.keys(damage).filter(function (index) {
      return damage[index] > 0 && list[index] && sides[list[index].owner] !== undefined;
    }).map(function (index) {
      const unit = list[index];
      return {
        name: names[index],
        hero: !!unit.hero,
        side: sides[unit.owner],
        damage: damage[index],
      };
    });

    const totals = {};
    rows.forEach(function (row) { totals[row.side] = (totals[row.side] || 0) + row.damage; });
    return rows.map(function (row) {
      return Object.assign({}, row, {
        share: totals[row.side] > 0 ? row.damage / totals[row.side] * 100 : 0,
      });
    }).sort(function (a, b) {
      return b.damage - a.damage;
    });
  }

  /* ---------- панель ---------- */

  const style = document.createElement('style');
  style.textContent =
    '#hwm_bs_panel{position:fixed;z-index:2147483644;width:260px;box-sizing:border-box;' +
    'background:rgba(30,24,14,.94);border:1px solid #b8964f;border-radius:5px;color:#f0e6cc;' +
    'font:12px Verdana,Arial,sans-serif;line-height:1.35;box-shadow:1px 1px 6px rgba(0,0,0,.6);}' +
    '#hwm_bs_head{display:flex;align-items:center;justify-content:space-between;gap:6px;' +
    'padding:4px 8px;background:linear-gradient(#4a3a20,#2b2112);border-radius:4px 4px 0 0;' +
    'color:#f0d999;font-weight:bold;cursor:move;user-select:none;}' +
    '#hwm_bs_panel.collapsed #hwm_bs_head{border-radius:4px;}' +
    '#hwm_bs_panel.collapsed #hwm_bs_body{display:none;}' +
    '#hwm_bs_body{padding:4px 8px 6px;}' +
    '.hwm_bs_cap{margin:3px 0 2px;color:#b8964f;font-size:11px;text-transform:uppercase;}' +
    '.hwm_bs_team{margin-bottom:4px;}' +
    '.hwm_bs_team_top{display:flex;justify-content:space-between;gap:6px;}' +
    '.hwm_bs_names{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.hwm_bs_hp{white-space:nowrap;}' +
    '.hwm_bs_bar{height:4px;margin-top:2px;background:rgba(0,0,0,.45);border-radius:2px;overflow:hidden;}' +
    '.hwm_bs_bar>div{height:100%;}' +
    '.hwm_bs_rank{max-height:220px;overflow-y:auto;}' +
    '.hwm_bs_row{display:flex;align-items:baseline;gap:6px;}' +
    '.hwm_bs_row>.n{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.hwm_bs_row>.d{white-space:nowrap;}' +
    '.hwm_bs_row>.s{width:34px;text-align:right;white-space:nowrap;color:#9c8c66;}' +
    '.hwm_bs_row.hero>.n{font-style:italic;}' +
    '.hwm_bs_note{color:#9c8c66;}';
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'hwm_bs_panel';
  const head = document.createElement('div');
  head.id = 'hwm_bs_head';
  head.title = TEXT.hint;
  const headTitle = document.createElement('span');
  headTitle.textContent = TEXT.title;
  const headMark = document.createElement('span');
  head.appendChild(headTitle);
  head.appendChild(headMark);
  const body = document.createElement('div');
  body.id = 'hwm_bs_body';
  panel.appendChild(head);
  panel.appendChild(body);
  document.body.appendChild(panel);

  function readStored(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function writeStored(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function setCollapsed(isCollapsed) {
    panel.classList.toggle('collapsed', isCollapsed);
    headMark.textContent = isCollapsed ? '▸' : '▾';
    writeStored(OPEN_KEY, isCollapsed ? '0' : '1');
  }

  function placePanel(left, top) {
    const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - head.offsetHeight);
    panel.style.left = Math.max(0, Math.min(maxLeft, left)) + 'px';
    panel.style.top = Math.max(0, Math.min(maxTop, top)) + 'px';
  }

  function savePosition() {
    writeStored(POS_KEY, panel.offsetLeft + ',' + panel.offsetTop);
  }

  // Если мышь сдвинулась больше чем на DRAG_THRESHOLD, это перетаскивание, а не клик
  function startDrag(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const grabX = e.clientX - panel.offsetLeft;
    const grabY = e.clientY - panel.offsetTop;
    const startX = e.clientX;
    const startY = e.clientY;
    let isDragging = false;

    function onMove(ev) {
      isDragging = isDragging || Math.abs(ev.clientX - startX) > DRAG_THRESHOLD ||
        Math.abs(ev.clientY - startY) > DRAG_THRESHOLD;
      if (isDragging) placePanel(ev.clientX - grabX, ev.clientY - grabY);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      if (!isDragging) {
        setCollapsed(!panel.classList.contains('collapsed'));
        return;
      }
      savePosition();
    }
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
  }

  head.addEventListener('mousedown', startDrag);
  window.addEventListener('resize', function () {
    placePanel(panel.offsetLeft, panel.offsetTop);
  });

  // По умолчанию у правого края: поле боя занимает левую часть окна
  const storedPos = (readStored(POS_KEY) || '').split(',');
  const storedLeft = parseInt(storedPos[0], 10);
  const storedTop = parseInt(storedPos[1], 10);
  placePanel(isNaN(storedLeft) ? window.innerWidth : storedLeft, isNaN(storedTop) ? 8 : storedTop);
  setCollapsed(readStored(OPEN_KEY) === '0');

  /* ---------- отрисовка ---------- */

  function sideColor(side) {
    return SIDE_COLORS[String(side)] || NEUTRAL_COLOR;
  }

  function num(value) {
    return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function caption(text) {
    const el = document.createElement('div');
    el.className = 'hwm_bs_cap';
    el.textContent = text;
    return el;
  }

  function note(text) {
    const el = document.createElement('div');
    el.className = 'hwm_bs_note';
    el.textContent = text;
    return el;
  }

  function teamBlock(team) {
    const color = sideColor(team.side);
    const percent = team.max > 0 ? team.now / team.max * 100 : 0;

    const names = document.createElement('div');
    names.className = 'hwm_bs_names';
    names.style.color = color;
    names.textContent = team.names.join(', ');
    names.title = names.textContent;

    const hp = document.createElement('div');
    hp.className = 'hwm_bs_hp';
    hp.textContent = team.unknown || !team.max
      ? num(team.now) + '/?'
      : num(team.now) + '/' + num(team.max) + ' (' + Math.round(percent) + '%)';

    const top = document.createElement('div');
    top.className = 'hwm_bs_team_top';
    top.appendChild(names);
    top.appendChild(hp);

    const fill = document.createElement('div');
    fill.style.width = Math.max(0, Math.min(100, percent)) + '%';
    fill.style.background = color;
    const bar = document.createElement('div');
    bar.className = 'hwm_bs_bar';
    bar.appendChild(fill);

    const block = document.createElement('div');
    block.className = 'hwm_bs_team';
    block.appendChild(top);
    block.appendChild(bar);
    return block;
  }

  function rankRow(row) {
    const name = document.createElement('span');
    name.className = 'n';
    name.style.color = sideColor(row.side);
    name.textContent = row.name;
    name.title = row.name;

    const value = document.createElement('span');
    value.className = 'd';
    value.textContent = num(row.damage);

    const share = document.createElement('span');
    share.className = 's';
    share.textContent = Math.round(row.share) + '%';

    const el = document.createElement('div');
    el.className = row.hero ? 'hwm_bs_row hero' : 'hwm_bs_row';
    el.appendChild(name);
    el.appendChild(value);
    el.appendChild(share);
    return el;
  }

  function render(summary) {
    body.textContent = '';
    body.appendChild(caption(TEXT.health));
    summary.teams.forEach(function (team) { body.appendChild(teamBlock(team)); });
    body.appendChild(caption(TEXT.damage));
    if (!summary.counting) {
      body.appendChild(note(TEXT.unavailable));
      return;
    }
    if (!summary.rows.length) {
      body.appendChild(note(TEXT.empty));
      return;
    }
    const rank = document.createElement('div');
    rank.className = 'hwm_bs_rank';
    summary.rows.forEach(function (row) { rank.appendChild(rankRow(row)); });
    body.appendChild(rank);
  }

  let shown = '';

  function update() {
    installHook();
    settleAll();
    const summary = { teams: teams(), rows: ranking(), counting: isCounting() };
    if (!summary.teams.length) {
      panel.style.display = 'none';
      shown = '';
      return;
    }
    panel.style.display = 'block';
    const key = JSON.stringify(summary);
    if (key === shown) return;
    render(summary);
    shown = key;
  }

  setInterval(update, REFRESH_MS);
})();
