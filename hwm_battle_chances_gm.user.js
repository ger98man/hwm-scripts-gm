// ==UserScript==
// @name           hwm_battle_chances_gm
// @author         ger98man
// @license        MIT
// @namespace      hwm_battle_chances
// @description    В бою показывает вероятности: текущий шанс удачи и боевого духа с учётом счётчиков отряда, шанс вероятностного умения по наведённой цели (отбрасывающий удар медведей и прочие) и шанс попадания по бестелесным (призраки, духи, привидения) с учётом двух предыдущих исходов
// @version        0.4
// @tag            hwm-gm
// @homepageURL    https://github.com/ger98man/hwm-scripts-gm
// @updateURL      https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_battle_chances_gm.user.js
// @downloadURL    https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_battle_chances_gm.user.js
// @match          https://www.heroeswm.ru/war*
// @match          https://heroeswm.ru/war*
// @match          https://mirror.heroeswm.ru/war*
// @match          https://my.lordswm.com/war*
// @match          https://www.lordswm.com/war*
// @grant          unsafeWindow
// @run-at         document-idle
// ==/UserScript==

// Удача и боевой дух: шанс не равен "10% за единицу", он плавает по ходу боя.
// Справка игры (/ob-igre-udacha-i-boevoy-duh) даёт формулу со счётчиками у каждого отряда:
//   P = p ^ (1 + [сработало раз] - [не сработало раз] * p/(1-p)),  p = удача/10 или мораль/10
// Счётчики у удачи и морали отдельные. После срабатывания шанс падает, после серии
// несрабатываний растёт; в среднем на бесконечности выходит 10% на единицу.
// В клиенте этих счётчиков нет (проверено дампом объектов боя), поэтому считаем их сами:
//   - испытание удачи = физическая атака отряда (учитываем и ответный удар);
//   - испытание морали = ход отряда (голова шкалы АТБ);
//   - срабатывание = строка лога ("посетила удача", "рвутся в бой" и т.п.),
//     привязываем её к последнему испытанию, так как порядок лога и урона не гарантирован.
// Это модель, а не документированное поведение: счётчики видны в панели, чтобы расхождение
// с сервером было заметно. Если скрипт открыт посреди боя, счётчики неполные - помечаем "~".
//
// Вероятностные умения (отбрасывающий удар, ослепление, оглушение и прочие): справка говорит
// только что шанс зависит от суммарного здоровья отряда и цели, без чисел. Числа из FAQ:
//   HP отряда >  HP цели: P = 25% + 3% * (HP отряда / HP цели)
//   HP отряда <= HP цели: P = 25% - 3% * (HP цели / HP отряда),  предел [5%; 75%]
// Источник неофициальный, а формула у всех этих умений одна, поэтому для медведей это
// и есть шанс отбрасывающего удара. Показываем только процент, без названия умения:
// каким полем отряда помечено само умение - пока неизвестно.
//
// Шанс попадания по бестелесным (призраки, духи, привидения): физическая атака успешна лишь
// в половине случаев, но подряд не бывает трёх промахов и трёх попаданий - после двух
// промахов всегда попадание, после двух попаданий всегда промах. Поэтому шанс равен ровно
// 0%, 50% или 100%, если помнить два предыдущих исхода по этой цели. Попадания видим хуком
// на урон, промахи - строкой лога, магический урон счёт сбрасывает.

(function () {
  'use strict';

  const w = unsafeWindow;

  const REFRESH_MS = 300;
  // Удары одного отряда, пришедшие за это время, считаем одной атакой (сплеш, вихрь, боевое па)
  const ATTACK_WINDOW_MS = 500;
  // На столько строка лога про удачу/мораль может разойтись по времени со своим испытанием
  const LINE_WINDOW_MS = 2000;
  const PANEL_KEY = 'hwm_battle_chances_panel';
  // Запас от цифр урона до подписи и от курсора до подписи, когда цифр нет
  const LABEL_GAP = 4;
  const CURSOR_GAP = 28;
  // Внутри контейнера цифр урона вторая строка стоит на uron_data.y + 36 (show_polep.js)
  const URON_LINE2_Y = 36;
  // Запасной размер шрифта цифр урона, если глобальной переменной игры нет
  const URON_FONT_SIZE = 35;
  // Окна игры, при открытых которых блок у курсора не показываем
  const BLOCKING_WINDOWS = ['win_InfoCreatureEffect', 'win_InfoCreature', 'win_InfoHero', 'win_InfoHero2', 'win_BattleResult'];

  // Поля отряда для умения "Бестелесное существо". Поле не выяснено, поэтому таких существ
  // опознаём по имени (ниже), а это задел на случай, когда флаг станет известен.
  const INCORPOREAL_FIELDS = [];

  // Бестелесные существа по внутреннему имени игры. Сверено по army_info.php:
  // ghost - Привидения / Ghosts, spectre - Призраки / Apparitions, poltergeist - Духи /
  // Poltergeists. У астральных (ghostdragon) и призрачных (spectraldragon) драконов
  // бестелесности нет, поэтому имя сверяем целиком, а не по началу.
  const INCORPOREAL_NAMES = ['ghost', 'spectre', 'poltergeist'];

  // Магия сбрасывает счёт попаданий по бестелесному. Исключение - "Разложение":
  // если выяснится, каким значением игра помечает его в magicdamage, добавьте сюда
  const NO_RESET_MAGIC = [];

  // Перк, дающий вторую попытку срабатывания умения (P2 = 2P - P^2). Номер не выяснен.
  const SECOND_TRY_PERK = null;

  const IS_RU = location.hostname.indexOf('heroeswm') > -1;

  const TEXT = IS_RU
    ? { luckShort: 'ЛАК', moraleShort: 'БД' }
    : { luckShort: 'LUCK', moraleShort: 'MORALE' };

  // Подписи бестелесных существ: запас на случай, когда внутреннего имени в объекте нет
  const INCORPOREAL_TITLES = IS_RU
    ? ['привидения', 'призраки', 'духи']
    : ['ghosts', 'apparitions', 'poltergeists'];

  // Фразы лога берём те же, что уже выверены в battle_damage_tooltip_gm
  const PHRASES = IS_RU ? {
    luck: ['посетила удача'], unluck: ['посетила неудача'],
    morale: ['рвутся в бой'], dismorale: ['ожидают в страхе'],
    miss: [' не попали в '],
  } : {
    luck: ['Luck befalls'], unluck: ['Bad luck befalls'],
    morale: ['bursting for more action'], dismorale: ['freeze in fear'],
    miss: [' missed ', ' did not hit ', " didn't hit "],
  };

  const style = document.createElement('style');
  style.textContent =
    '#hwm_bc_panel,#hwm_bc_tip{position:fixed;z-index:2147483645;box-sizing:border-box;' +
    'display:none;white-space:nowrap;}' +
    '#hwm_bc_panel{min-width:84px;cursor:move;user-select:none;padding:4px 8px;' +
    'background:rgba(30,24,14,.92);border:1px solid #b8964f;border-radius:4px;color:#f0e6cc;' +
    'font:12px Verdana,Arial,sans-serif;line-height:1.45;}' +
    // Подпись у цифр урона: без плашки и тем же начертанием, что и сами цифры
    '#hwm_bc_tip{pointer-events:none;font:bold 15px Arial,Verdana,sans-serif;line-height:1.15;' +
    'text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 3px #000;}' +
    '#hwm_bc_panel b{color:#f0d999;}' +
    '#hwm_bc_panel .hwm-bc-val,#hwm_bc_tip .hwm-bc-val{color:#9fe08a;font-weight:bold;}' +
    '#hwm_bc_panel .hwm-bc-neg,#hwm_bc_tip .hwm-bc-neg{color:#ff8a7a;font-weight:bold;}' +
    '#hwm_bc_tip .hwm-bc-hit{color:#7fc8ff;font-weight:bold;}';
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'hwm_bc_panel';
  document.body.appendChild(panel);

  const tip = document.createElement('div');
  tip.id = 'hwm_bc_tip';
  document.body.appendChild(tip);

  // --- формулы ---

  // Текущий шанс удачи или морали по формуле из справки игры
  function adaptiveChance(value, hits, misses) {
    const p = Math.min(Math.abs(value), 10) / 10;
    if (!(p > 0)) return 0;
    if (p >= 1) return 1;
    const exponent = 1 + hits - misses * p / (1 - p);
    const chance = Math.pow(p, exponent);
    return Math.min(1, Math.max(0, chance));
  }

  // Шанс вероятностного умения от суммарного здоровья отряда и цели
  function abilityChance(hpSelf, hpTarget) {
    if (!(hpSelf > 0) || !(hpTarget > 0)) return null;
    const raw = hpSelf > hpTarget
      ? 0.25 + 0.03 * (hpSelf / hpTarget)
      : 0.25 - 0.03 * (hpTarget / hpSelf);
    return Math.min(0.75, Math.max(0.05, raw));
  }

  // Вторая попытка срабатывания: хотя бы один успех из двух
  function withSecondTry(chance) {
    return 2 * chance - chance * chance;
  }

  // Мелкие шансы с десятой долей, ноль и всё от 10% - целым числом
  function percent(chance) {
    if (chance === null) return '-';
    const value = chance * 100;
    if (value === 0 || value >= 10) return Math.round(value) + '%';
    return value.toFixed(1) + '%';
  }

  // --- данные боя ---

  function getScene() {
    if (!w.stage) return null;
    return w.stage[w.war_scr] || w.stage.pole || null;
  }

  function getField() {
    const root = w.war_scr && document.getElementById(w.war_scr);
    if (!root) return null;
    return root.querySelector('canvas') || root;
  }

  function getUnit(index) {
    const scene = getScene();
    return index > 0 && scene && scene.obj ? scene.obj[index] || null : null;
  }

  // Суммарное здоровье отряда, как в hwm_combat_info_gm
  function stackHp(unit) {
    const count = unit.nownumber || 0;
    if (!(count > 0)) return 0;
    return (count - 1) * unit.maxhealth + unit.nowhealth;
  }

  // Герой-владелец отряда. Его удача не действует на него самого, но прикладывается
  // ко всем его отрядам, поэтому для отряда это основа
  function ownerHero(unit) {
    const index = w.heroes && w.heroes[unit.owner];
    const hero = index ? getUnit(index) : null;
    return hero && hero.hero && !hero.rock ? hero : null;
  }

  // Параметр самого отряда, а если у отряда он не выставлен - параметр его героя
  function ownParam(unit, field) {
    const own = parseFloat(unit[field]) || 0;
    if (own !== 0 || unit.hero) return own;
    const hero = ownerHero(unit);
    return hero ? parseFloat(hero[field]) || 0 : 0;
  }

  function stackLuck(unit) {
    return ownParam(unit, 'luck') + (parseFloat(unit.luckaddon) || 0);
  }

  // Мораль зависит от позиции (аура храбрости и прочее) и от того, кто перед нами:
  // у нежити и механизмов её нет совсем. Это умеет сама игра, поэтому её ответу верим,
  // включая ноль, и считаем сами только если функции нет или она упала
  function stackMorale(unit) {
    const scene = getScene();
    if (scene && typeof scene.getmorale === 'function') {
      try {
        const value = scene.getmorale(unit.obj_index, unit.x, unit.y);
        if (typeof value === 'number' && isFinite(value)) return value;
      } catch (e) {}
    }
    return ownParam(unit, 'morale') + (parseFloat(unit.moraleaddon) || 0);
  }

  // Активный отряд: между ходами activeobj равен 0, тогда берём голову шкалы АТБ
  function activeIndex() {
    const active = parseInt(w.activeobj) || 0;
    if (active > 0) return active;
    return (Array.isArray(w.atb) && parseInt(w.atb[0])) || 0;
  }

  function infoWindowOpen() {
    const visible = w.buttons_visible;
    return !!visible && BLOCKING_WINDOWS.some(function (id) { return visible[id]; });
  }

  // Отряд под курсором; героев, декорации и мёртвых не берём
  function hoveredIndex() {
    const xr = w.xr_last, yr = w.yr_last;
    if (!(xr > 0 && yr > 0) || !w.mapobj || !w.defxn) return 0;
    const index = w.mapobj[yr * w.defxn + xr];
    const unit = index > 0 && getUnit(index);
    if (!unit || unit.hero || unit.rock || unit.statix || !(unit.nownumber > 0)) return 0;
    return index;
  }

  // Внутреннее имя существа без суффикса анимации: spectreani -> spectre
  function baseName(unit) {
    return String(unit.lname || unit.filename || '').toLowerCase().replace(/ani$/, '');
  }

  function isIncorporeal(unit) {
    if (INCORPOREAL_FIELDS.some(function (field) { return !!unit[field]; })) return true;
    if (INCORPOREAL_NAMES.indexOf(baseName(unit)) > -1) return true;
    return INCORPOREAL_TITLES.indexOf(String(unit.nametxt || '').toLowerCase()) > -1;
  }

  // Исходы двух последних физических ударов по бестелесному отряду: true - попадание
  const streak = {};

  function noteStreak(index, isHit) {
    const list = streak[index] || (streak[index] = []);
    list.push(isHit);
    if (list.length > 2) list.shift();
  }

  // Шанс попадания по бестелесному: после двух промахов всегда попадание,
  // после двух попаданий всегда промах, в остальных случаях половина
  function hitChance(index) {
    const list = streak[index];
    if (list && list.length === 2 && list[0] === list[1]) return list[0] ? 0 : 1;
    return 0.5;
  }

  function hasSecondTry(index) {
    if (SECOND_TRY_PERK === null || typeof w.battle_is_it_perk !== 'function') return false;
    try { return !!w.battle_is_it_perk(index, SECOND_TRY_PERK); } catch (e) { return false; }
  }

  // --- счётчики удачи и морали ---

  const luckHits = {}, luckMisses = {};
  const moraleHits = {}, moraleMisses = {};
  // Последнее испытание: к нему привязываем пришедшую строку лога
  let lastAttacker = 0, lastAttackAt = 0;
  let lastTurnUnit = 0, lastTurnAt = 0;
  // Строка лога пришла раньше своего испытания - ждём его
  let pendingLuck = 0, pendingUnluck = 0, pendingMorale = 0, pendingDismorale = 0;
  // Когда отряд последний раз бил: для склейки одной атаки по нескольким целям
  const lastHitAt = {};
  // Чей ход сейчас. Ход, который шёл до загрузки скрипта, за испытание не считаем:
  // сервер его уже разрешил, а мы этого не видели
  let turnUnit = 0;
  let turnSeeded = false;
  // Счётчики заведены не с начала боя
  let partial = false;

  function count(store, index) {
    store[index] = (store[index] || 0) + 1;
  }

  function resetCounters() {
    for (const key in luckHits) delete luckHits[key];
    for (const key in luckMisses) delete luckMisses[key];
    for (const key in moraleHits) delete moraleHits[key];
    for (const key in moraleMisses) delete moraleMisses[key];
    for (const key in lastHitAt) delete lastHitAt[key];
    for (const key in streak) delete streak[key];
    lastAttacker = 0;
    lastAttackAt = 0;
    lastTurnUnit = 0;
    lastTurnAt = 0;
    pendingLuck = pendingUnluck = pendingMorale = pendingDismorale = 0;
    turnUnit = 0;
    turnSeeded = false;
  }

  // Испытание удачи: атака отряда. Если строка лога про удачу уже пришла - это успех
  function noteAttack(attacker) {
    const now = Date.now();
    if (now - (lastHitAt[attacker] || 0) < ATTACK_WINDOW_MS) return;
    lastHitAt[attacker] = now;
    lastAttacker = attacker;
    lastAttackAt = now;
    if (pendingLuck && now - pendingLuck < LINE_WINDOW_MS) {
      pendingLuck = 0;
      count(luckHits, attacker);
      return;
    }
    if (pendingUnluck && now - pendingUnluck < LINE_WINDOW_MS) {
      pendingUnluck = 0;
      count(luckHits, attacker);
      return;
    }
    count(luckMisses, attacker);
  }

  // Испытание морали: ход отряда
  function noteTurn() {
    const front = (Array.isArray(w.atb) && parseInt(w.atb[0])) || 0;
    if (!(front > 0) || front === turnUnit) return;
    turnUnit = front;
    if (!turnSeeded) {
      turnSeeded = true;
      return;
    }
    const now = Date.now();
    lastTurnUnit = front;
    lastTurnAt = now;
    if (pendingMorale && now - pendingMorale < LINE_WINDOW_MS) {
      pendingMorale = 0;
      count(moraleHits, front);
      return;
    }
    if (pendingDismorale && now - pendingDismorale < LINE_WINDOW_MS) {
      pendingDismorale = 0;
      count(moraleHits, front);
      return;
    }
    count(moraleMisses, front);
  }

  // Срабатывание удачи: переводим последнее испытание из несработавших в сработавшие
  function noteLuckLine() {
    const now = Date.now();
    if (lastAttacker > 0 && now - lastAttackAt < LINE_WINDOW_MS && (luckMisses[lastAttacker] || 0) > 0) {
      luckMisses[lastAttacker]--;
      count(luckHits, lastAttacker);
      return;
    }
    pendingLuck = now;
  }

  function noteMoraleLine() {
    const now = Date.now();
    if (lastTurnUnit > 0 && now - lastTurnAt < LINE_WINDOW_MS && (moraleMisses[lastTurnUnit] || 0) > 0) {
      moraleMisses[lastTurnUnit]--;
      count(moraleHits, lastTurnUnit);
      return;
    }
    pendingMorale = now;
  }

  // Промах. Строка лога называет отряд, но одноимённых различить нельзя, поэтому ищем
  // среди живых бестелесных те, чьё имя есть в строке: если такой один - промах по нему,
  // если несколько - счёт по ним сбрасываем, чтобы не показать уверенные 0% или 100%
  function noteMissLine(line) {
    const all = scene && scene.obj ? scene.obj : {};
    const found = [];
    for (const key in all) {
      const unit = all[key];
      if (!unit || !(unit.nownumber > 0) || !isIncorporeal(unit)) continue;
      if (unit.nametxt && line.indexOf(unit.nametxt) > -1) found.push(unit.obj_index);
    }
    if (found.length === 1) {
      noteStreak(found[0], false);
      return;
    }
    found.forEach(function (index) { delete streak[index]; });
  }

  function hasPhrase(line, list) {
    return list.some(function (phrase) { return line.indexOf(phrase) > -1; });
  }

  let logRead = 0;
  let logStarted = false;

  // Новые строки лога. Фильтры battle_damage_tooltip_gm могут переписать log_lines:
  // если массив укоротился, считаем счётчики неполными и продолжаем с конца
  function readLog() {
    const lines = w.log_lines;
    if (!Array.isArray(lines)) return;
    if (!logStarted) {
      logStarted = true;
      logRead = lines.length;
      if (lines.length > 0) partial = true;
      return;
    }
    if (lines.length < logRead) {
      logRead = lines.length;
      partial = true;
      return;
    }
    while (logRead < lines.length) {
      const line = String(lines[logRead++] || '');
      if (hasPhrase(line, PHRASES.luck) || hasPhrase(line, PHRASES.unluck)) noteLuckLine();
      if (hasPhrase(line, PHRASES.morale) || hasPhrase(line, PHRASES.dismorale)) noteMoraleLine();
      if (hasPhrase(line, PHRASES.miss)) noteMissLine(line);
    }
  }

  // --- хук на урон ---

  let scene = null;
  let hookFn = null;
  let hooked = false;

  // Игра вызывает procceddamage(i) для каждого получившего урон, атакующий - в obj[i].damaged
  function onDamage(i) {
    const victim = this.obj[i];
    if (!victim) return;
    // Магия удачу не проверяет, зато сбрасывает счёт попаданий по бестелесному
    if (victim.magicdamage) {
      const kind = String(victim.magicdamage);
      const keeps = NO_RESET_MAGIC.some(function (name) { return kind.indexOf(name) > -1; });
      if (!keeps && isIncorporeal(victim)) delete streak[i];
      return;
    }
    // Физический удар дошёл до бестелесного: это попадание
    if (isIncorporeal(victim)) noteStreak(i, true);
    const attacker = parseInt(victim.damaged) || 0;
    if (!(attacker > 0)) return;
    const unit = this.obj[attacker];
    // Удача не действует на самого героя
    if (!unit || unit.hero) return;
    noteAttack(attacker);
  }

  // Обёртку ставим один раз за бой и больше не трогаем. hwm_no_retaliation_gm и
  // hwm_battle_stats_gm оборачивают ту же функцию и всегда вызывают предыдущую, поэтому
  // наша обёртка работает и под ними. Если переставлять её каждый раз, когда сверху чужая,
  // скрипты начинают перебивать друг друга и срывают хуки друг у друга совсем
  function installHook() {
    const current = getScene();
    if (current !== scene) {
      scene = current;
      hookFn = null;
      hooked = false;
      resetCounters();
      logStarted = false;
      partial = false;
    }
    if (!scene || hooked || typeof scene.procceddamage !== 'function') return;
    hooked = true;
    const original = scene.procceddamage;
    const wrapper = function () {
      try { onDamage.apply(this, arguments); } catch (e) {}
      return original.apply(this, arguments);
    };
    wrapper.hwmChancesWrapped = true;
    hookFn = wrapper;
    scene.procceddamage = wrapper;
  }

  w.hwmChancesDebug = function () {
    return {
      installed: hooked, onTop: !!(scene && scene.procceddamage === hookFn),
      partial: partial, logRead: logRead, turnUnit: turnUnit,
      luckHits: luckHits, luckMisses: luckMisses,
      moraleHits: moraleHits, moraleMisses: moraleMisses, streak: streak,
      stacks: (function () {
        const out = [];
        const all = scene && scene.obj ? scene.obj : {};
        for (const key in all) {
          const unit = all[key];
          if (!unit || unit.rock || !(unit.nownumber > 0)) continue;
          out.push({
            i: unit.obj_index, name: unit.nametxt, owner: unit.owner, hero: unit.hero,
            rawLuck: unit.luck, rawLuckAddon: unit.luckaddon,
            rawMorale: unit.morale, rawMoraleAddon: unit.moraleaddon,
            heroLuck: ownerHero(unit) && ownerHero(unit).luck,
            usedLuck: stackLuck(unit), usedMorale: stackMorale(unit),
            lname: unit.lname, incorporeal: isIncorporeal(unit),
          });
        }
        return out;
      })(),
    };
  };

  // --- отрисовка ---

  function row(label, value, className) {
    const line = document.createElement('div');
    const name = document.createElement('b');
    name.textContent = label + ': ';
    line.appendChild(name);
    const box = document.createElement('span');
    if (className) box.className = className;
    box.textContent = value;
    line.appendChild(box);
    return line;
  }

  // Строка панели: только текущий шанс, "~" - счётчики неполные, "-" - шанса нет
  function panelRow(label, chance, isNegative) {
    const text = chance === null ? '-' : (partial ? '~' : '') + percent(chance);
    return row(label, text, isNegative ? 'hwm-bc-neg' : 'hwm-bc-val');
  }

  function renderPanel(unit) {
    panel.textContent = '';
    const index = unit.obj_index;
    const luck = stackLuck(unit);
    const morale = stackMorale(unit);

    // Удача героя не действует на него самого, только на его отряды
    const luckChance = unit.hero ? null
      : adaptiveChance(luck, luckHits[index] || 0, luckMisses[index] || 0);
    const moraleChance = adaptiveChance(morale, moraleHits[index] || 0, moraleMisses[index] || 0);

    panel.appendChild(panelRow(TEXT.luckShort, luckChance, luck < 0));
    panel.appendChild(panelRow(TEXT.moraleShort, moraleChance, morale < 0));
  }

  // Голый процент под цифрами урона: подписи там не нужны, место занято полем боя.
  // Шанс умения зелёный, шанс попадания по бестелесному голубой, нулевой шанс красный
  function chanceLine(chance, className) {
    const line = document.createElement('div');
    line.className = className;
    line.textContent = percent(chance);
    return line;
  }

  // Подпись у цифр урона - только шансы самого удара: удачу и БД показывает панель.
  // Возвращает false, если показывать нечего, и тогда подпись прячется
  function renderTip(target, attacker) {
    tip.textContent = '';
    const index = target.obj_index;
    const lines = [];

    if (attacker) {
      const chance = abilityChance(stackHp(attacker), stackHp(target));
      const final = chance !== null && hasSecondTry(attacker.obj_index) ? withSecondTry(chance) : chance;
      lines.push(chanceLine(final, 'hwm-bc-val'));
    }

    // Шанс попадания по бестелесному зависит от двух предыдущих исходов по этой цели:
    // после двух промахов удар гарантированно дойдёт, после двух попаданий гарантированно нет
    if (isIncorporeal(target)) {
      const chance = hitChance(index);
      lines.push(chanceLine(chance, chance === 0 ? 'hwm-bc-neg' : 'hwm-bc-hit'));
    }

    if (!lines.length) return false;

    for (const line of lines) tip.appendChild(line);
    return true;
  }

  // --- панель: позиция и перетаскивание ---

  const saved = (function () {
    try { return JSON.parse(localStorage.getItem(PANEL_KEY)) || null; } catch (e) { return null; }
  })();
  let panelPos = saved && typeof saved.x === 'number' ? saved : null;

  function savePos() {
    try { localStorage.setItem(PANEL_KEY, JSON.stringify(panelPos)); } catch (e) {}
  }

  // По умолчанию справа от поля боя, у его верхнего края
  function defaultPos() {
    const field = getField();
    const rect = field && field.getBoundingClientRect();
    if (!rect || !(rect.width > 0)) return { x: 8, y: 8 };
    const right = rect.right + 8;
    const fits = right + panel.offsetWidth <= window.innerWidth;
    return { x: fits ? right : Math.max(8, rect.right - panel.offsetWidth - 8), y: Math.max(8, rect.top) };
  }

  function placePanel() {
    if (!panelPos) panelPos = defaultPos();
    const maxX = Math.max(0, window.innerWidth - panel.offsetWidth);
    const maxY = Math.max(0, window.innerHeight - panel.offsetHeight);
    panel.style.left = Math.min(Math.max(0, panelPos.x), maxX) + 'px';
    panel.style.top = Math.min(Math.max(0, panelPos.y), maxY) + 'px';
  }

  let dragFrom = null;

  panel.addEventListener('mousedown', function (e) {
    dragFrom = { x: e.clientX, y: e.clientY, left: panel.offsetLeft, top: panel.offsetTop };
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!dragFrom) return;
    panelPos = { x: dragFrom.left + e.clientX - dragFrom.x, y: dragFrom.top + e.clientY - dragFrom.y };
    placePanel();
  });

  document.addEventListener('mouseup', function () {
    if (!dragFrom) return;
    dragFrom = null;
    savePos();
  });

  // --- блок у курсора ---

  let mouse = { x: 0, y: 0 };
  let onField = false;

  document.addEventListener('mousemove', function (e) {
    mouse = { x: e.clientX, y: e.clientY };
    const field = getField();
    if (!field) {
      onField = false;
      return;
    }
    const rect = field.getBoundingClientRect();
    onField = e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top && e.clientY <= rect.bottom;
  }, true);

  // Цифры урона рисует сама игра: контейнер myuron висит у курсора (showuron
  // в onmousemovep.js), внутри него две строки на uron_data.y + 3 и + 36, а дочерний
  // myuron2 масштабируется под размер поля. Отсюда и считаем левый нижний угол цифр
  // в координатах canvas - те же, что и scr_x/scr_y у отрядов
  function uronCorner() {
    const box = w.myuron;
    if (!box || typeof w.get_X !== 'function' || typeof w.get_Y !== 'function') return null;
    try {
      if (typeof w.get_visible === 'function' && !w.get_visible(box)) return null;
      const x = w.get_X(box), y = w.get_Y(box);
      if (!isFinite(x) || !isFinite(y)) return null;
      const scale = (typeof w.get_scaleY === 'function' && w.myuron2 ? w.get_scaleY(w.myuron2) : 1) || 1;
      const data = w.uron_data || {};
      const font = parseFloat(w.uron_font_size) || URON_FONT_SIZE;
      const left = parseFloat(data.x) || 0;
      const top = parseFloat(data.y) || 0;
      return { x: x + left * scale, y: y + (top + URON_LINE2_Y + font) * scale };
    } catch (e) { return null; }
  }

  // Под цифрами урона, а если игра их не рисует - от курсора, с переворотом у краёв экрана
  function placeTip() {
    const field = getField();
    const rect = field && field.getBoundingClientRect();
    const corner = rect && rect.width > 0 && field.width ? uronCorner() : null;
    if (corner) {
      const kx = rect.width / field.width;
      const ky = field.height ? rect.height / field.height : kx;
      tip.style.left = Math.round(rect.left + corner.x * kx) + 'px';
      tip.style.top = Math.round(rect.top + corner.y * ky + LABEL_GAP) + 'px';
      return;
    }
    const width = tip.offsetWidth, height = tip.offsetHeight;
    const right = mouse.x + CURSOR_GAP;
    const below = mouse.y + CURSOR_GAP;
    const x = right + width <= window.innerWidth ? right : Math.max(0, mouse.x - CURSOR_GAP - width);
    const y = below + height <= window.innerHeight ? below : Math.max(0, mouse.y - CURSOR_GAP - height);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }

  // --- обновление ---

  let panelKey = '';
  let tipKey = '';
  let tipShown = false;

  // Отряд для панели: под курсором, иначе выбранный в окне информации, иначе активный
  function panelUnit() {
    const hovered = onField && !infoWindowOpen() ? getUnit(hoveredIndex()) : null;
    if (hovered && !hovered.rock) return hovered;
    const selected = w.cur_unit_info === undefined ? 0 : parseInt(w.cur_unit_info) || 0;
    if (selected > 0 && infoWindowOpen()) {
      const unit = getUnit(selected);
      if (unit && !unit.rock) return unit;
    }
    const active = getUnit(activeIndex());
    return active && !active.rock ? active : null;
  }

  function updatePanel() {
    const unit = panelUnit();
    if (!unit) {
      panel.style.display = 'none';
      panelKey = '';
      return;
    }
    const index = unit.obj_index;
    const key = [index, stackLuck(unit), stackMorale(unit), luckHits[index] || 0,
      luckMisses[index] || 0, moraleHits[index] || 0, moraleMisses[index] || 0, partial].join('|');
    if (key !== panelKey) {
      renderPanel(unit);
      panelKey = key;
    }
    panel.style.display = 'block';
    placePanel();
  }

  function updateTip() {
    const targetIndex = onField && !infoWindowOpen() ? hoveredIndex() : 0;
    const target = getUnit(targetIndex);
    if (!target) {
      tip.style.display = 'none';
      tipKey = '';
      tipShown = false;
      return;
    }
    // Шанс умения считается при атаке, поэтому для него нужен живой чужой отряд.
    // Без него блок всё равно показывает шансы самого наведённого отряда
    const candidate = getUnit(activeIndex());
    const attacker = candidate && !candidate.rock && candidate.nownumber > 0 &&
      candidate.obj_index !== targetIndex && candidate.side !== target.side ? candidate : null;
    const own = attacker ? attacker.obj_index : 0;
    const key = [own, targetIndex, attacker ? stackHp(attacker) : 0, stackHp(target),
      (streak[targetIndex] || []).join(',')].join('|');
    if (key !== tipKey) {
      tipShown = renderTip(target, attacker);
      tipKey = key;
    }
    if (!tipShown) {
      tip.style.display = 'none';
      return;
    }
    tip.style.display = 'block';
    placeTip();
  }

  function update() {
    installHook();
    noteTurn();
    readLog();
    updatePanel();
    updateTip();
  }

  setInterval(update, REFRESH_MS);
})();
