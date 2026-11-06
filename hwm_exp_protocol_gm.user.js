// ==UserScript==
// @name           hwm_exp_protocol_gm
// @author         ger98man
// @license        MIT
// @namespace      hwm_bmxcs_personal
// @description    На главной показывает, успеете ли взять следующую умелку текущей фракции до апа уровня, с прогнозом по боям ГТ. В протоколе загружает итоги боёв - всех или только ГТ. Фильтр протокола - hwm_warlog_filter_gm
// @version        2.5
// @tag            hwm-gm
// @homepageURL    https://github.com/ger98man/hwm-scripts-gm
// @updateURL      https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_exp_protocol_gm.user.js
// @downloadURL    https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_exp_protocol_gm.user.js
// @include        http*://*heroeswm.ru/home.php*
// @include        http*://*heroeswm.ru/war.php*
// @include        http*://*heroeswm.ru/pl_warlog.php*
// @include        http*://*lordswm.com/home.php*
// @include        http*://*lordswm.com/war.php*
// @include        http*://*lordswm.com/pl_warlog.php*
// @grant          GM_deleteValue
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_TITLE = 'Экспоумка';
  const SCRIPT_VERSION = GM_info.script.version;

  // Сколько умения нужно для каждого уровня умелки фракции (уровень 1 - первый элемент)
  const SKILL_THRESHOLDS = [20, 50, 90, 160, 280, 500, 900, 1600, 2900, 5300, 9600, 17300];
  const STORED_BATTLES = 200;
  const AVERAGED_BATTLES = 50;
  const LOAD_PARALLEL = 4;      // сколько боёв загружать одновременно
  const WARLOG_PAGES = 5;       // сколько страниц протокола просматривать при обновлении
  const BATTLE_TIMEOUT_MS = 30000;
  const DEFAULT_GT_TYPES = ['40']; // тип боя из комментария <!--40--> в строке протокола

  const KEY_BATTLES = 'gt_battles';
  const KEY_GT_TYPES = 'gt_types';
  const KEY_ONLY_GT = 'only_gt'; // выбор типа боёв в панели протокола: '1' - только ГТ, '0' - все
  const SHARED_GT_TYPES = 'hwm_gt_types'; // для скрипта фильтра (общий localStorage страницы)
  const LEGACY_KEYS = ['selected_fract', 'selected_level', 'battle_exp', 'nick']; // настройки версии 2.1

  function byId(id) {
    return document.getElementById(id);
  }

  function pageParam(name) {
    return new URLSearchParams(location.search).get(name) || '';
  }

  function groupDigits(value) {
    const parts = String(value).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+$)/g, ',');
    return parts.join('.');
  }

  function readJson(key) {
    try { return JSON.parse(GM_getValue(key, '[]')) || []; } catch (e) { return []; }
  }

  // Страницы игры в windows-1251. При ошибке сети колбэк получает пустую строку.
  function loadPageText(url, callback) {
    fetch(new URL(url, location.href).href, { credentials: 'include' })
      .then(function (response) { return response.arrayBuffer(); })
      .then(function (bytes) { return new TextDecoder('windows-1251').decode(bytes); },
            function () { return ''; })
      .then(callback);
  }

  // ------------------ база боёв

  function loadBattles() {
    return readJson(KEY_BATTLES);
  }

  // Строки итогов: "Ник получает 1,375 опыта, +0.4 очка ГТ и 2.76 умения." или "... и 0 умений."
  function parseResultLines(html) {
    const lines = [];
    html.split(/<br\s*\/?>/i).forEach(function (part) {
      const text = new DOMParser().parseFromString(part, 'text/html').body.textContent.trim();
      const found = /^(.+?) получает ([\d,]+) опыт\S*.*?([\d,.]+) умени[йяе]/.exec(text);
      if (!found) return;
      lines.push({
        Nick: found[1].trim(),
        Exp: parseFloat(found[2].replace(/,/g, '')),
        Ability: parseFloat(found[3].replace(/,/g, '')),
        GT: text.indexOf('очка ГТ') > -1,
      });
    });
    return lines;
  }

  // Бой считается боем ГТ, если очки ГТ есть хоть у кого-то: проигравший может их не получить
  function isGtBattle(battle) {
    return battle.Lines.some(function (line) { return line.GT; });
  }

  // warid растёт со временем, поэтому после сортировки в конце самые новые бои
  function storeBattle(warId, lines) {
    let battles = loadBattles();
    if (battles.some(function (battle) { return battle.WarId == warId; })) return;
    battles.push({ WarId: warId, Time: Date.now(), Lines: lines });
    battles.sort(function (a, b) { return parseInt(a.WarId, 10) - parseInt(b.WarId, 10); });
    battles = battles.slice(-STORED_BATTLES);
    GM_setValue(KEY_BATTLES, JSON.stringify(battles));
  }

  // Самый частый ник из записанных боёв среди тех, что есть на странице
  function detectNick(battles) {
    const pageText = document.body.textContent;
    const counts = new Map();
    battles.forEach(function (battle) {
      battle.Lines.forEach(function (line) {
        if (pageText.indexOf(line.Nick) > -1) counts.set(line.Nick, (counts.get(line.Nick) || 0) + 1);
      });
    });
    let best = '';
    let bestCount = 0;
    counts.forEach(function (count, nick) {
      if (count > bestCount) {
        best = nick;
        bestCount = count;
      }
    });
    return best;
  }

  // onlyGt - считать только по боям, где давали очки ГТ
  function averages(onlyGt) {
    const battles = loadBattles();
    const nick = detectNick(battles);
    if (!nick) return null;
    let exp = 0;
    let ability = 0;
    let count = 0;
    for (let i = battles.length - 1; i >= 0 && count < AVERAGED_BATTLES; i--) {
      if (onlyGt && !isGtBattle(battles[i])) continue;
      const own = battles[i].Lines.find(function (line) { return line.Nick == nick; });
      if (!own) continue;
      exp += own.Exp;
      ability += own.Ability;
      count++;
    }
    return count ? { Nick: nick, Count: count, Exp: exp / count, Ability: ability / count } : null;
  }

  // ------------------ страница боя

  function saveShownResult() {
    const el = byId('finalresult_text');
    if (!el || !el.textContent.trim()) return false;
    const warId = pageParam('warid');
    const lines = parseResultLines(el.innerHTML);
    if (warId && lines.length) storeBattle(warId, lines);
    return true;
  }

  // Бои, открытые во фрейме, сюда не попадают: итоги загружаются из протокола
  function watchBattle() {
    if (window.top !== window) return;
    const timer = setInterval(function () {
      if (saveShownResult()) clearInterval(timer);
    }, 1000);
  }

  // ------------------ главная: данные страницы

  function findExpToLevel() {
    const label = Array.from(document.getElementsByTagName('b')).find(function (b) {
      return b.textContent.indexOf('Боевой уровень') === 0;
    });
    const el = label && label.nextSibling && label.nextSibling.nextSibling;
    return el ? { Element: el, Exp: parseInt(el.textContent.replace(/,/g, ''), 10) } : null;
  }

  function findFactionsCell() {
    return Array.from(document.getElementsByTagName('td')).find(function (td) {
      return /^(?:\s|&nbsp;)*(?:<b>)?Рыцарь:/.test(td.innerHTML);
    });
  }

  // Текущая фракция выделена жирным: "<b>Маг: 5</b> (123.45) <font>...</font>", остальные - текст
  function readFactions() {
    const cell = findFactionsCell();
    if (!cell) return [];
    const factions = [];

    const bold = cell.querySelector('b');
    const boldValue = bold && bold.nextSibling && /\((\d+.\d+)\)/.exec(bold.nextSibling.textContent);
    if (boldValue) {
      const nameAndLevel = bold.textContent.split(': ');
      factions.push({ Name: nameAndLevel[0], Level: parseInt(nameAndLevel[1], 10), Ability: parseFloat(boldValue[1]), IsCurrent: true, IsMain: false });
    }

    cell.childNodes.forEach(function (node) {
      const text = node.textContent.trim();
      const value = /: \d+ \((\d+.\d+)\)/.exec(text);
      const next = node.nextSibling;
      if (!value || text.indexOf('Гильдия') > -1 || !next || next.nodeName !== 'FONT') return;
      const parts = text.split(': ');
      factions.push({ Name: parts[0], Level: parseInt(parts[1], 10), Ability: parseFloat(value[1]), IsCurrent: false, IsMain: false });
    });

    if (factions.length) {
      factions.reduce(function (best, faction) { return faction.Ability > best.Ability ? faction : best; }).IsMain = true;
    }
    return factions;
  }

  // Играемая сейчас фракция; если её не видно на странице - основная, затем первая из списка
  function currentFaction(factions) {
    return factions.find(function (faction) { return faction.IsCurrent; }) ||
      factions.find(function (faction) { return faction.IsMain; }) ||
      factions[0];
  }

  function skillGoal(factions) {
    const faction = currentFaction(factions);
    const level = faction.Level + 1;
    const goal = { Name: faction.Name, CurrentLevel: faction.Level, Level: level, Need: -1, Progress: 0, IsMax: faction.Level === SKILL_THRESHOLDS.length };
    if (!goal.IsMax) {
      const target = SKILL_THRESHOLDS[level - 1];
      const from = faction.Level > 0 ? SKILL_THRESHOLDS[faction.Level - 1] : 0;
      goal.Need = target - faction.Ability;
      goal.Progress = Math.max(0, Math.min(1, (faction.Ability - from) / (target - from)));
    }
    return goal;
  }

  // ------------------ главная: блок под опытом

  function caption(text) {
    return '<span class="hwm_ea_k">' + text + '</span>';
  }

  function headLine(goal, tail) {
    return '<div class="hwm_ea_head"><span class="hwm_ea_title">' + goal.Name + ' ' + goal.CurrentLevel +
      (goal.IsMax ? '' : ' → ' + goal.Level) + '</span><span class="hwm_ea_tail">' + tail + '</span></div>';
  }

  function badge(text) {
    return '<span class="hwm_ea_badge">' + text + '</span>';
  }

  function percent(goal) {
    return '<span class="hwm_ea_pct">' + Math.floor(goal.Progress * 100) + '%</span>';
  }

  function progressBar(goal) {
    return '<div class="hwm_ea_bar"><div style="width:' + (goal.Progress * 100).toFixed(1) + '%"></div></div>';
  }

  function renderMaxSkill(box, view) {
    box.className = 'hwm_ea_box';
    box.innerHTML = headLine(view.Goal, badge('max')) +
      '<div class="hwm_ea_note">Максимальная умелка фракции</div>';
    box.title = 'У фракции ' + view.Goal.Name + ' взята максимальная умелка';
  }

  function renderNoForecast(box, view) {
    box.className = 'hwm_ea_box';
    box.innerHTML = headLine(view.Goal, percent(view.Goal)) + progressBar(view.Goal) +
      '<div>' + caption('Нужно умки на 1000 опыта') + ' <b>' + view.NeedCoef.toFixed(2) + '</b></div>' +
      '<div class="hwm_ea_note">Боёв ГТ в базе нет: обновите умку в протоколе боёв</div>';
    box.title = goalTitle(view) + '\n' +
      'Боёв ГТ в базе нет, поэтому прогноза по боям нет';
  }

  function goalTitle(view) {
    return 'Цель: умелка ' + view.Goal.Level + ' фракции ' + view.Goal.Name + '\n' +
      'Осталось умки: ' + groupDigits(view.Goal.Need.toFixed(1)) +
      ', опыта до уровня: ' + groupDigits(view.ExpToLevel) + '\n' +
      'Нужно умки на 1000 опыта: ' + view.NeedCoef.toFixed(2);
  }

  // Успеваете, если ваш коэффициент не ниже нужного - это то же самое,
  // что боёв до умелки не больше, чем боёв до апа уровня
  function renderForecast(box, view) {
    const stats = view.Stats;
    const coef = stats.Ability / stats.Exp * 1000;
    const isInTime = coef >= view.NeedCoef;
    const battlesToSkill = Math.ceil(view.Goal.Need / stats.Ability);
    const battlesToLevel = Math.ceil(view.ExpToLevel / stats.Exp);

    box.className = 'hwm_ea_box ' + (isInTime ? 'hwm_ea_ok' : 'hwm_ea_bad');
    box.innerHTML =
      headLine(view.Goal, percent(view.Goal) + badge(isInTime ? '✓ успеваете' : '✗ не успеваете')) +
      progressBar(view.Goal) +
      '<div>' + caption('До умелки') + ' <b>~' + groupDigits(battlesToSkill) + '</b> боёв ' +
      caption('· до уровня') + ' <b>~' + groupDigits(battlesToLevel) + '</b> боёв</div>' +
      '<div>' + caption('Умка на 1000 опыта') + ' <b>' + coef.toFixed(2) + '</b> ' +
      caption('· нужно ≥') + ' <b>' + view.NeedCoef.toFixed(2) + '</b></div>';
    box.title = goalTitle(view) + '\n' +
      'По последним ' + stats.Count + ' боям ГТ (' + stats.Nick + '): ' +
      groupDigits(Math.round(stats.Exp)) + ' опыта, ' + stats.Ability.toFixed(2) + ' умки за бой\n' +
      'Ваша умка на 1000 опыта: ' + coef.toFixed(2) + '\n' +
      'Боёв до умелки: ~' + battlesToSkill + ', боёв до апа уровня: ~' + battlesToLevel + '\n' +
      (isInTime ? 'Успеваете взять умелку до апа' : 'Уровень апнется раньше умелки');
  }

  function findBox(after) {
    const existing = byId('hwm_exp_abil_options');
    if (existing) return existing;
    const box = document.createElement('div');
    box.id = 'hwm_exp_abil_options';
    after.parentNode.insertBefore(box, after.nextSibling);
    return box;
  }

  function renderHome() {
    const exp = findExpToLevel();
    const factions = readFactions();
    if (!exp || !factions.length) return;

    const goal = skillGoal(factions);
    const box = findBox(exp.Element);
    const view = { Goal: goal, Stats: averages(true), ExpToLevel: exp.Exp, NeedCoef: goal.Need / exp.Exp * 1000 };
    if (goal.IsMax) {
      renderMaxSkill(box, view);
      return;
    }
    if (!view.Stats) {
      renderNoForecast(box, view);
      return;
    }
    renderForecast(box, view);
  }

  // ------------------ протокол боёв

  function loadGtTypes() {
    return readJson(KEY_GT_TYPES);
  }

  function isGtType(type, learned) {
    return DEFAULT_GT_TYPES.indexOf(type) > -1 || learned.indexOf(type) > -1;
  }

  function findWarlogBox(doc) {
    return Array.from(doc.querySelectorAll('div.global_a_hover')).find(function (div) {
      return div.querySelector('a[href*="war.php?warid="]');
    }) || null;
  }

  function warIdOf(node) {
    const link = node.nodeName === 'A' ? node : node.querySelector('a[href*="war.php?warid="]');
    const found = link && /warid=(\d+)/.exec(link.getAttribute('href'));
    return found ? found[1] : '';
  }

  // Строка протокола - узлы до <br>: номер боя из ссылки, тип боя из комментария <!--126-->.
  // Скрипт фильтра оборачивает строки в span.hwm_ea_row, поэтому заглядываем и внутрь них
  function readWarlogRows(box) {
    const nodes = [];
    box.childNodes.forEach(function (node) {
      if (node.nodeType === 1 && node.classList.contains('hwm_ea_row')) nodes.push.apply(nodes, node.childNodes);
      else nodes.push(node);
    });

    const rows = [];
    let row = { WarId: '', Type: '' };
    nodes.forEach(function (node, index) {
      if (node.nodeType === 8) row.Type = node.nodeValue.trim();
      else if (node.nodeType === 1 && !row.WarId) row.WarId = warIdOf(node);
      if (node.nodeName === 'BR' || index === nodes.length - 1) {
        if (row.WarId) rows.push(row);
        row = { WarId: '', Type: '' };
      }
    });
    return rows;
  }

  // Типы боёв ГТ узнаём по записанным боям, в которых давали очки ГТ
  function learnGtTypes(rows) {
    const types = loadGtTypes();
    const gtWars = new Set(loadBattles().filter(isGtBattle).map(function (battle) { return battle.WarId; }));
    rows.forEach(function (row) {
      if (row.Type && gtWars.has(row.WarId) && types.indexOf(row.Type) === -1) types.push(row.Type);
    });
    const json = JSON.stringify(types);
    GM_setValue(KEY_GT_TYPES, json);
    try { localStorage.setItem(SHARED_GT_TYPES, json); } catch (e) {}
  }

  function warlogPageUrl(page) {
    return location.pathname + '?id=' + pageParam('id') + '&page=' + page;
  }

  // Итог боя лежит в данных battle.php, которые грузит сам war.php, поэтому открывать бой не нужно:
  // "...<font size="18"><b>Победившая сторона:</b></font><br />Ник получает ...<br />|#f_en..."
  function loadBattleResult(warId, callback) {
    const request = new XMLHttpRequest();
    request.open('GET', '/battle.php?warid=' + warId + '&lastturn=-1&lastmess=0&lastmess2=0&rand=' + Math.random(), true);
    request.timeout = BATTLE_TIMEOUT_MS;
    request.onloadend = function () {
      const text = request.status === 200 ? request.responseText : '';
      const pos = text.indexOf(' получает ');
      if (pos === -1) {
        callback(null);
        return;
      }
      let start = text.lastIndexOf('<font size="18">', pos);
      if (start < 0) start = text.lastIndexOf(';>', pos) + 2;
      const end = text.indexOf('|', pos);
      callback(parseResultLines(text.substring(start, end < 0 ? text.length : end)));
    };
    request.send(null);
  }

  function showStats(status, onlyGt) {
    const stats = averages(onlyGt);
    const kind = onlyGt ? ' боёв ГТ' : ' боёв';
    status.textContent = stats
      ? 'В базе ' + stats.Count + kind + ': ' + Math.round(stats.Exp) + ' опыта, ' + stats.Ability.toFixed(2) +
        ' умки за бой, умка на 1000 опыта ' + (stats.Ability / stats.Exp * 1000).toFixed(2)
      : (onlyGt ? 'Боёв ГТ в базе нет' : 'Боёв в базе нет');
  }

  // Читает несколько страниц протокола и догружает итоги боёв, которых нет в базе
  function reloadBattles(status, button, onlyGt, parallel) {
    if (!onlyGt && !confirm('Будут открыты итоги всех боёв. Бои ГТ определятся по очкам ГТ. Продолжить?')) return;
    button.disabled = true;

    const learned = loadGtTypes();
    const known = new Set(loadBattles().map(function (battle) { return battle.WarId; }));
    const queue = [];
    const seenRows = [];
    let loaded = 0;
    let done = 0;
    let started = 0;
    let startTime = 0;

    function finish() {
      learnGtTypes(seenRows);
      showStats(status, onlyGt);
      // Пустая очередь - обычное дело: итоги всех боёв с просмотренных страниц уже в базе
      const prefix = queue.length ? 'Загружено боёв: ' + loaded + ' из ' + queue.length + '. ' : 'Новых боёв нет. ';
      status.textContent = prefix + status.textContent;
      button.disabled = false;
    }

    function startNext() {
      if (started >= queue.length) return;
      const warId = queue[started++];
      loadBattleResult(warId, function (lines) {
        if (lines && lines.length) {
          storeBattle(warId, lines);
          loaded++;
        }
        done++;
        status.textContent = 'Загружено ' + done + ' из ' + queue.length + ' (' +
          ((Date.now() - startTime) / 1000 / done).toFixed(1) + ' сек на бой)...';
        if (done >= queue.length) finish();
        else startNext();
      });
    }

    function startLoading() {
      if (!queue.length) {
        finish();
        return;
      }
      startTime = Date.now();
      for (let i = 0; i < parallel; i++) startNext();
    }

    function readPage(page) {
      if (page >= WARLOG_PAGES || queue.length >= AVERAGED_BATTLES) {
        startLoading();
        return;
      }
      status.textContent = 'Читаю страницу протокола ' + (page + 1) + '...';
      loadPageText(warlogPageUrl(page), function (text) {
        const box = findWarlogBox(new DOMParser().parseFromString(text, 'text/html'));
        const rows = box ? readWarlogRows(box) : [];
        rows.forEach(function (row) {
          if (queue.length >= AVERAGED_BATTLES) return;
          seenRows.push(row);
          if (!known.has(row.WarId) && (!onlyGt || isGtType(row.Type, learned))) queue.push(row.WarId);
        });
        readPage(rows.length ? page + 1 : WARLOG_PAGES);
      });
    }

    readPage(0);
  }

  function setupWarlog() {
    const box = findWarlogBox(document);
    if (!box) return;
    learnGtTypes(readWarlogRows(box));

    const panel = document.createElement('div');
    panel.className = 'hwm_ea_panel';
    panel.innerHTML =
      '<b>Бои:</b> <select id="hwm_ea_type"><option value="gt">ГТ</option><option value="all">Все</option></select>' +
      '<button type="button" id="hwm_ea_reload">Обновить среднюю умку на 1000 опыта за последние ' + AVERAGED_BATTLES + ' боёв</button> ' +
      '<span id="hwm_ea_status" class="hwm_ea_k"></span>';
    box.parentNode.insertBefore(panel, box);

    const status = byId('hwm_ea_status');
    const button = byId('hwm_ea_reload');
    const select = byId('hwm_ea_type');

    function isOnlyGt() {
      return select.value === 'gt';
    }

    select.value = GM_getValue(KEY_ONLY_GT, '1') === '0' ? 'all' : 'gt';
    showStats(status, isOnlyGt());
    select.addEventListener('change', function () {
      GM_setValue(KEY_ONLY_GT, isOnlyGt() ? '1' : '0');
      showStats(status, isOnlyGt());
    });
    button.addEventListener('click', function () {
      reloadBattles(status, button, isOnlyGt(), LOAD_PARALLEL);
    });
  }

  // ------------------ запуск

  function addStyles() {
    GM_addStyle(
      '.hwm_ea_box {--ea:#a08a5c; margin:5px 0 0 8px; max-width:300px; padding:5px 8px; font-size:11px; line-height:1.45; color:#3b2a12; background:#fbf8f0; border:1px solid #d8cba9; border-left:3px solid var(--ea); border-radius:4px;}' +
      '.hwm_ea_ok {--ea:#3c8d2f;} .hwm_ea_bad {--ea:#c0392b;}' +
      '.hwm_ea_head {display:flex; justify-content:space-between; align-items:center; gap:8px;}' +
      '.hwm_ea_tail {display:flex; align-items:center; gap:6px; white-space:nowrap;}' +
      '.hwm_ea_title {font-weight:bold; font-size:12px;}' +
      '.hwm_ea_badge {font-size:10px; font-weight:bold; color:#fff; background:var(--ea); border-radius:8px; padding:0 6px; white-space:nowrap;}' +
      '.hwm_ea_pct {font-size:10px; color:#696156;}' +
      '.hwm_ea_bar {height:5px; margin:3px 0 4px; background:#e6dcc4; border-radius:3px; overflow:hidden;}' +
      '.hwm_ea_bar div {height:100%; background:var(--ea);}' +
      '.hwm_ea_k {color:#696156;}' +
      '.hwm_ea_panel {margin:4px 0 8px; padding:5px 8px; font-size:11px; background:#fbf8f0; border:1px solid #d8cba9; border-radius:4px;}' +
      '.hwm_ea_panel select, .hwm_ea_panel button {font-size:11px; margin-right:6px;}' +
      '.hwm_ea_note {font-size:9px; color:#8a806f; margin-top:1px;}'
    );
  }

  // Настройки убраны: фракция и уровень берутся со страницы, опыт - из боёв ГТ
  function dropLegacySettings() {
    LEGACY_KEYS.forEach(function (key) { GM_deleteValue(key); });
  }

  dropLegacySettings();

  if (location.pathname.indexOf('/war') === 0) {
    watchBattle();
  } else if (location.pathname.indexOf('/pl_warlog') === 0) {
    addStyles();
    setupWarlog();
  } else {
    addStyles();
    if (document.readyState === 'complete') renderHome();
    else window.addEventListener('load', renderHome);
  }
})();
