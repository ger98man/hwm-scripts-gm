// ==UserScript==
// @name           hwm_exp_protocol_gm
// @author         ger98man
// @license        MIT
// @namespace      hwm_bmxcs_personal
// @description    На главной показывает, успеете ли взять умелку фракции до апа уровня, с прогнозом по боям ГТ. В протоколе загружает итоги боёв ГТ. Фильтр протокола - hwm_warlog_filter_gm
// @version        2.0
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
// @grant          GM_listValues
// @grant          GM_setValue
// @grant          GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_TITLE = 'Экспоумка';
  const SCRIPT_VERSION = '2.0';

  // Сколько умения нужно для каждого уровня умелки фракции (уровень 1 - первый элемент)
  const SKILL_THRESHOLDS = [20, 50, 90, 160, 280, 500, 900, 1600, 2900, 5300, 9600, 17300];
  const DEFAULT_RATIO = 500;    // опыт / умка, пока нет боёв ГТ
  const STORED_BATTLES = 200;
  const AVERAGED_BATTLES = 50;
  const WARLOG_PAGES = 5;       // сколько страниц протокола просматривать при обновлении
  const BATTLE_TIMEOUT_MS = 30000;
  const DEFAULT_GT_TYPES = ['40']; // тип боя из комментария <!--40--> в строке протокола

  const KEY_FACTION = 'selected_fract';
  const KEY_LEVEL = 'selected_level';
  const KEY_BATTLE_EXP = 'battle_exp';
  const KEY_NICK = 'nick';
  const KEY_PARALLEL = 'load_parallel';
  const KEY_BATTLES = 'gt_battles';
  const KEY_GT_TYPES = 'gt_types';
  const SHARED_GT_TYPES = 'hwm_gt_types'; // для скрипта фильтра (общий localStorage страницы)

  function byId(id) {
    return document.getElementById(id);
  }

  function pageParam(name) {
    return new URLSearchParams(location.search).get(name) || '';
  }

  function escapeAttr(text) {
    return String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
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

  // Ник из настроек, иначе самый частый из записанных боёв среди тех, что есть на странице
  function detectNick(battles) {
    const saved = GM_getValue(KEY_NICK, '');
    if (saved) return saved;
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

  function gtAverages() {
    const battles = loadBattles();
    const nick = detectNick(battles);
    if (!nick) return null;
    let exp = 0;
    let ability = 0;
    let count = 0;
    for (let i = battles.length - 1; i >= 0 && count < AVERAGED_BATTLES; i--) {
      if (!isGtBattle(battles[i])) continue;
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

  function chooseFaction(name, factions) {
    return factions.find(function (faction) {
      return name === '' ? faction.IsMain : faction.Name === name;
    }) || factions[0];
  }

  function skillGoal(factions) {
    const faction = chooseFaction(GM_getValue(KEY_FACTION, ''), factions);
    const level = Math.max(parseInt(GM_getValue(KEY_LEVEL, 0), 10), faction.Level + 1);
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

  function renderMaxSkill(box, goal, head) {
    box.className = 'hwm_ea_box';
    box.innerHTML =
      '<div class="hwm_ea_head">' + head + '<span class="hwm_ea_badge">max</span></div>' +
      '<div class="hwm_ea_note">Максимальная умелка. Выберите другую фракцию в настройках</div>';
    box.title =
      'Вы апнули максимальную умелку фракции ' + goal.Name + '\n' +
      'Смените фракцию и уровень умелки который хотите взять на этом уровне';
  }

  function renderNoForecast(box, goal, head, bar, needRatio) {
    box.className = 'hwm_ea_box';
    box.innerHTML =
      '<div class="hwm_ea_head">' + head + '<span class="hwm_ea_pct">' + Math.floor(goal.Progress * 100) + '%</span></div>' +
      bar +
      '<div>' + caption('Нужно умки') + ' <b>' + groupDigits(goal.Need.toFixed(1)) + '</b>' +
      ' ' + caption('· нужно соотношение ≤') + ' <b>' + groupDigits(needRatio) + '</b></div>' +
      '<div class="hwm_ea_note">Укажите опыт за бой в настройках или проведите бой ГТ</div>';
  }

  function renderForecast(box, goal, head, bar, needRatio, expToLevel, stats, manualExp, battleExp, battleAbility) {
    const battlesToSkill = Math.ceil(goal.Need / battleAbility);
    const battlesToLevel = Math.ceil(expToLevel / battleExp);
    const inTime = battlesToSkill <= battlesToLevel;
    const ratio = Math.round(battleExp / battleAbility);
    const expSource = manualExp > 0 ? 'Опыт из настроек' : 'Опыт по ' + stats.Count + ' боям ГТ';
    const ratioSource = stats ? ', соотношение по ' + stats.Count + ' боям ГТ' : ', соотношение по умолчанию';

    box.className = 'hwm_ea_box ' + (inTime ? 'hwm_ea_ok' : 'hwm_ea_bad');
    box.innerHTML =
      '<div class="hwm_ea_head">' + head + '<span class="hwm_ea_badge">' + (inTime ? '✓ успеваете' : '✗ не успеваете') + '</span></div>' +
      bar +
      '<div>' + caption('До умелки') + ' <b>~' + battlesToSkill + '</b> боёв ' + caption('· до апа') + ' <b>~' + battlesToLevel + '</b> боёв</div>' +
      '<div>' + caption(stats ? 'Соотношение ГТ' : 'Соотношение') + ' <b>' + groupDigits(ratio) + '</b>' +
      ' ' + caption('· нужно ≤') + ' <b>' + groupDigits(needRatio) + '</b></div>' +
      '<div>' + caption('Нужно умки') + ' <b>' + groupDigits(goal.Need.toFixed(1)) + '</b></div>' +
      '<div class="hwm_ea_note">' + expSource + ratioSource + ': ' + groupDigits(Math.round(battleExp)) + ' опыта, ' +
      battleAbility.toFixed(2) + ' умки за бой</div>';
    box.title +=
      '\n\n' + (manualExp > 0 ? 'Опыт за бой из настроек' : 'Опыт за бой - среднее по боям ГТ') + ', ' +
      (stats ? 'соотношение - среднее по последним ' + stats.Count + ' боям ГТ (' + stats.Nick + ')'
        : 'соотношение по умолчанию ' + DEFAULT_RATIO + ' (боёв ГТ ещё не записано)') + '\n' +
      'Опыт за бой: ' + Math.round(battleExp) + ', умка за бой: ' + battleAbility.toFixed(2) +
      ' (соотношение ' + ratio + ', нужно ≤ ' + needRatio + ')\n' +
      'Боёв до умелки: ~' + battlesToSkill + '\n' +
      'Боёв до апа уровня: ~' + battlesToLevel + '\n' +
      (inTime ? 'Успеваете взять умелку до апа' : 'Уровень апнется раньше умелки');
  }

  function renderHome() {
    const exp = findExpToLevel();
    const factions = readFactions();
    if (!exp || !factions.length) return;

    let box = byId('hwm_exp_abil_options');
    if (!box) {
      box = document.createElement('div');
      box.id = 'hwm_exp_abil_options';
      exp.Element.parentNode.insertBefore(box, exp.Element.nextSibling);
      box.addEventListener('click', openSettings);
    }

    const goal = skillGoal(factions);
    const head = '<span class="hwm_ea_title">' + goal.Name + ' ' + goal.CurrentLevel + (goal.IsMax ? '' : ' → ' + goal.Level) + '</span>';
    if (goal.IsMax) {
      renderMaxSkill(box, goal, head);
      return;
    }

    const needRatio = Math.round(exp.Exp / goal.Need).toString();
    const bar = '<div class="hwm_ea_bar"><div style="width:' + (goal.Progress * 100).toFixed(1) + '%"></div></div>';
    box.title =
      'Что б взять ' + goal.Level + 'ю умелку фракции ' + goal.Name + ' до апа уровня\n' +
      'Вам нужно набрать ' + goal.Need + ' умения с соотношением ' + needRatio;

    // Опыт за бой: из настроек, иначе среднее по ГТ. Умка за бой: опыт / соотношение по ГТ
    const stats = gtAverages();
    const manualExp = parseInt(GM_getValue(KEY_BATTLE_EXP, 0), 10) || 0;
    const ratio = stats ? stats.Exp / stats.Ability : DEFAULT_RATIO;
    const battleExp = manualExp > 0 ? manualExp : (stats ? stats.Exp : 0);
    const battleAbility = battleExp / ratio;
    if (battleExp > 0 && battleAbility > 0) {
      renderForecast(box, goal, head, bar, needRatio, exp.Exp, stats, manualExp, battleExp, battleAbility);
    } else {
      renderNoForecast(box, goal, head, bar, needRatio);
    }
  }

  // ------------------ главная: настройки

  function closeSettings() {
    byId('hwm_ea_overlay').remove();
    byId('hwm_ea_dialog').remove();
    renderHome();
  }

  // Записанные бои не трогаем: их долго собирать заново
  function resetSettings() {
    if (!confirm('Скинуть настройки? Записанные бои сохранятся.')) return;
    GM_listValues().forEach(function (key) {
      if (key !== KEY_BATTLES && key !== KEY_GT_TYPES) GM_deleteValue(key);
    });
    closeSettings();
  }

  function fillLevels(factions) {
    const select = byId('hwm_ea_level');
    const faction = chooseFaction(byId('hwm_ea_faction').value, factions);
    const saved = parseInt(GM_getValue(KEY_LEVEL, 0), 10);
    select.innerHTML = '';
    for (let level = faction.Level + 1; level <= SKILL_THRESHOLDS.length; level++) {
      select.add(new Option(level, level, false, level === saved));
    }
  }

  function fillFactions(factions) {
    const select = byId('hwm_ea_faction');
    const chosen = chooseFaction(GM_getValue(KEY_FACTION, ''), factions);
    factions.forEach(function (faction) {
      const suffix = faction.IsMain ? ' (Основа)' : faction.IsCurrent ? ' (Играете сейчас)' : '';
      select.add(new Option(faction.Name + suffix, faction.Name, false, faction === chosen));
    });
  }

  function openSettings() {
    if (byId('hwm_ea_dialog')) return;
    const stats = gtAverages();
    const factions = readFactions();
    const manualExp = parseInt(GM_getValue(KEY_BATTLE_EXP, 0), 10) || 0;

    const overlay = document.createElement('div');
    overlay.id = 'hwm_ea_overlay';
    overlay.addEventListener('click', closeSettings);
    document.body.appendChild(overlay);

    const dialog = document.createElement('div');
    dialog.id = 'hwm_ea_dialog';
    dialog.innerHTML =
      '<div id="hwm_ea_close" title="Закрыть">x</div>' +
      '<div class="hwm_ea_title">' + SCRIPT_TITLE + ' ' + SCRIPT_VERSION + '</div><hr/>' +
      '<div><b>Выберите фракцию и уровень умелки который хотите взять на этом уровне:</b></div>' +
      '<div><select id="hwm_ea_faction"></select> Фракция</div>' +
      '<div><select id="hwm_ea_level"></select> Уровень умелки</div>' +
      '<div><input type="number" min="0" id="hwm_ea_battle_exp" value="' + (manualExp > 0 ? manualExp : '') + '" placeholder="' +
        (stats ? 'среднее ГТ: ' + Math.round(stats.Exp) : 'например 5000') + '"/> Опыт за бой (пусто = среднее по ГТ; умка = опыт / ' +
        (stats ? 'соотношение ГТ ' + Math.round(stats.Exp / stats.Ability) : DEFAULT_RATIO + ', пока нет боёв ГТ') + ')</div>' +
      '<div><input type="text" id="hwm_ea_nick" value="' + escapeAttr(GM_getValue(KEY_NICK, '')) + '" placeholder="определяется сам"/> Ваш ник в бою</div>' +
      '<div class="hwm_ea_note">Записано боёв: ' + loadBattles().length + '. Считаем по последним ' + AVERAGED_BATTLES + ' боям ГТ.</div><hr/>' +
      '<a href="#" id="hwm_ea_reset">Скинуть настройки</a>';
    document.body.appendChild(dialog);

    fillFactions(factions);
    fillLevels(factions);

    byId('hwm_ea_close').addEventListener('click', closeSettings);
    byId('hwm_ea_reset').addEventListener('click', function (e) {
      e.preventDefault();
      resetSettings();
    });
    byId('hwm_ea_faction').addEventListener('change', function () {
      GM_setValue(KEY_FACTION, this.value);
      GM_deleteValue(KEY_LEVEL);
      fillLevels(factions);
    });
    byId('hwm_ea_level').addEventListener('change', function () {
      GM_setValue(KEY_LEVEL, this.value);
    });
    byId('hwm_ea_battle_exp').addEventListener('change', function () {
      GM_setValue(KEY_BATTLE_EXP, parseInt(this.value, 10) || 0);
    });
    byId('hwm_ea_nick').addEventListener('change', function () {
      GM_setValue(KEY_NICK, this.value.trim());
    });
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

  function showGtStats(status) {
    const stats = gtAverages();
    status.textContent = stats
      ? 'В базе ' + stats.Count + ' боёв ГТ: ' + Math.round(stats.Exp) + ' опыта, ' + stats.Ability.toFixed(2) +
        ' умки за бой, соотношение ' + Math.round(stats.Exp / stats.Ability)
      : 'Боёв ГТ в базе нет';
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
      showGtStats(status);
      status.textContent = 'Загружено боёв: ' + loaded + ' из ' + queue.length + '. ' + status.textContent;
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
      '<button type="button" id="hwm_ea_reload">Обновить умку по боям ГТ</button> ' +
      'бои: <select id="hwm_ea_scope"><option value="gt">ГТ</option><option value="all">все</option></select> ' +
      'потоков: <select id="hwm_ea_parallel"><option>1</option><option>2</option><option>4</option><option>6</option><option>8</option></select> ' +
      '<span id="hwm_ea_status" class="hwm_ea_k"></span>';
    box.parentNode.insertBefore(panel, box);

    const status = byId('hwm_ea_status');
    const button = byId('hwm_ea_reload');
    const parallel = byId('hwm_ea_parallel');
    parallel.value = GM_getValue(KEY_PARALLEL, '4');
    if (parallel.selectedIndex < 0) parallel.value = '4';

    showGtStats(status);
    parallel.addEventListener('change', function () {
      GM_setValue(KEY_PARALLEL, parallel.value);
    });
    button.addEventListener('click', function () {
      reloadBattles(status, button, byId('hwm_ea_scope').value !== 'all', parseInt(parallel.value, 10) || 1);
    });
  }

  // ------------------ запуск

  function addStyles() {
    GM_addStyle(
      '#hwm_ea_overlay {position:fixed; left:0; top:0; width:100%; height:100%; z-index:1104; background:rgba(0,0,0,.7);}' +
      '#hwm_ea_dialog {position:fixed; left:calc(50% - 300px); top:50px; z-index:1105; box-sizing:border-box; width:600px; max-height:calc(100% - 100px); overflow:auto; padding:15px; background:#F6F3EA; border-radius:5px;}' +
      '#hwm_ea_dialog select, #hwm_ea_dialog input {width:220px; box-sizing:border-box;}' +
      '#hwm_ea_close {float:right; width:15px; height:15px; border:1px solid #abc; text-align:center; cursor:pointer;}' +
      '.hwm_ea_box {--ea:#a08a5c; margin:5px 0 0 8px; max-width:300px; padding:5px 8px; font-size:11px; line-height:1.45; color:#3b2a12; background:#fbf8f0; border:1px solid #d8cba9; border-left:3px solid var(--ea); border-radius:4px; cursor:pointer;}' +
      '.hwm_ea_box:hover {background:#f3ecdb;}' +
      '.hwm_ea_ok {--ea:#3c8d2f;} .hwm_ea_bad {--ea:#c0392b;}' +
      '.hwm_ea_head {display:flex; justify-content:space-between; align-items:center; gap:8px;}' +
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
