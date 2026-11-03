// ==UserScript==
// @name           hwm_debug_dump_gm
// @author         ger98man
// @license        MIT
// @namespace      hwm_debug_dump
// @description    Копирует в буфер данные страницы (бой, протокол боёв, любая другая) в виде JSON: для отладки и доработки скриптов
// @version        1.0
// @tag            hwm-gm
// @homepageURL    https://github.com/ger98man/hwm-scripts-gm
// @updateURL      https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_debug_dump_gm.user.js
// @downloadURL    https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_debug_dump_gm.user.js
// @match          https://*.heroeswm.ru/*
// @match          https://heroeswm.ru/*
// @match          https://*.lordswm.com/*
// @grant          unsafeWindow
// @grant          GM_setClipboard
// @run-at         document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const w = unsafeWindow;
  const IS_WAR = location.pathname.indexOf('/war') === 0;
  const IS_WARLOG = location.pathname.indexOf('/pl_warlog.php') === 0;

  // Параметры ссылки, которые нельзя выносить за пределы браузера
  const SECRET_PARAMS = ['sign', 'key', 'pass'];
  const MAX_WARLOG_ROWS = 40;
  const MAX_ROW_LENGTH = 1500;
  const MAX_PAGE_LENGTH = 150000;
  const MAX_STRING_FIELD = 200;

  const POS_KEY = 'hwm_debug_dump_tab_y';
  const TAB_HEIGHT = 26;
  const TAB_LABEL = 'Дамп';

  let lastClick = null;

  function safeUrl() {
    const url = new URL(location.href);
    SECRET_PARAMS.forEach(function (name) { url.searchParams.delete(name); });
    return url.href;
  }

  function battlefield() {
    const root = w.war_scr && document.getElementById(w.war_scr);
    return root ? root.querySelector('canvas') || root : null;
  }

  // Запоминаем последний клик по полю боя в долях от размера поля
  function rememberClick(e) {
    const field = IS_WAR && battlefield();
    if (!field) return;
    const r = field.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    lastClick = {
      x: +((e.clientX - r.left) / r.width).toFixed(3),
      y: +((e.clientY - r.top) / r.height).toFixed(3),
    };
  }

  // Простые поля объекта, без картинок и длинных строк
  function plainFields(obj) {
    const result = {};
    Object.keys(obj).forEach(function (key) {
      const value = obj[key];
      const simple = value === null || typeof value === 'number' || typeof value === 'boolean' ||
        (typeof value === 'string' && value.length < MAX_STRING_FIELD);
      if (simple && !/^image_link\d+$/.test(key)) result[key] = value;
    });
    return result;
  }

  function dumpBattle() {
    const pole = w.stage && w.stage.pole;
    const objects = pole && pole.obj ? pole.obj : {};
    const field = battlefield();
    const rect = field && field.getBoundingClientRect();
    const finalResult = document.getElementById('finalresult_text');

    const heroes = Object.keys(w.heroes || {}).filter(function (owner) {
      return objects[w.heroes[owner]];
    }).map(function (owner) {
      return Object.assign(plainFields(objects[w.heroes[owner]]), { owner: owner });
    });

    const creatures = Object.keys(objects).map(function (key) {
      return objects[key];
    }).filter(function (unit) {
      return unit && !unit.hero;
    }).map(function (unit) {
      return { i: unit.obj_index, name: unit.nametxt, owner: unit.owner, num: unit.nownumber, x: unit.x, y: unit.y,
        scr_x: unit.scr_x, scr_y: unit.scr_y, ret: unit.ret, uret: unit.uretalation, noret: unit.noretalation,
        damaged: unit.damaged, magicdamage: unit.magicdamage };
    });

    const dump = {
      url: safeUrl(),
      btype: w.btype,
      defxn: w.defxn,
      defyn: w.defyn,
      lastturn: w.lastturn,
      war_scr: w.war_scr,
      lastClickOnField: lastClick,
      field: field ? { tag: field.tagName, w: Math.round(rect.width), h: Math.round(rect.height), canvasW: field.width, canvasH: field.height } : null,
      heroes: heroes,
      creatures: creatures,
      atb: Array.isArray(w.atb) ? w.atb.slice(0, 15) : w.atb,
      finalResult: finalResult ? finalResult.innerHTML : null,
    };
    if (typeof w.hwmNoRetDebug === 'function') {
      try { dump.noRetaliation = w.hwmNoRetDebug(); } catch (e) { dump.noRetaliation = 'ERROR: ' + e; }
    }
    return dump;
  }

  function dumpWarlog() {
    const links = Array.from(document.querySelectorAll('a[href*="warid="]')).slice(0, MAX_WARLOG_ROWS);
    return {
      url: safeUrl(),
      rows: links.map(function (link) {
        return (link.closest('tr') || link.parentElement).outerHTML.slice(0, MAX_ROW_LENGTH);
      }),
    };
  }

  // Любая другая страница: HTML без шапки, скриптов, подсказок и значений скрытых полей
  function dumpPage() {
    const copy = document.body.cloneNode(true);
    copy.querySelectorAll('script,style,noscript,svg,link,#hwm_header,#hwm_dd_tab,.sh_dd_container,#hintBlock,.art_mods,.art_durability_hidden,img[src*="art_fon_"]')
      .forEach(function (el) { el.remove(); });
    copy.querySelectorAll('[hint],[onmouseover],[onmouseout],[hwm_hint_added]').forEach(function (el) {
      ['hint', 'onmouseover', 'onmouseout', 'hwm_hint_added'].forEach(function (attr) { el.removeAttribute(attr); });
    });
    copy.querySelectorAll('img[src^="data:"]').forEach(function (img) { img.removeAttribute('src'); });
    copy.querySelectorAll('input[type=password],input[type=hidden]').forEach(function (el) { el.removeAttribute('value'); });
    const html = copy.innerHTML.replace(/\s{2,}/g, ' ');
    return { url: safeUrl(), title: document.title, htmlLength: html.length, html: html.slice(0, MAX_PAGE_LENGTH) };
  }

  function copyDump() {
    let text;
    try {
      text = JSON.stringify(IS_WAR ? dumpBattle() : IS_WARLOG ? dumpWarlog() : dumpPage(), null, 1);
    } catch (e) {
      text = 'ERROR: ' + e;
    }
    GM_setClipboard(text);
    showCopied(text.length);
  }

  // Язычок у левого края экрана: выезжает при наведении, тянется вверх-вниз, позиция запоминается.
  // Копировать можно и без него: Ctrl+Shift+Y
  const css = document.createElement('style');
  css.textContent =
    '#hwm_dd_tab{position:fixed;left:0;z-index:2147483647;display:flex;align-items:center;height:' + TAB_HEIGHT + 'px;' +
    'padding:0 6px 0 3px;transform:translateX(calc(-100% + 7px));transition:transform .15s,opacity .15s;opacity:.55;' +
    'background:linear-gradient(#4a3a20,#2b2112);border:1px solid #b8964f;border-left:none;border-radius:0 6px 6px 0;' +
    'box-shadow:1px 1px 4px rgba(0,0,0,.6);color:#f0d999;font:bold 11px Verdana,Arial,sans-serif;' +
    'cursor:pointer;user-select:none;white-space:nowrap;}' +
    '#hwm_dd_tab:hover,#hwm_dd_tab.done{transform:none;opacity:1;}' +
    '#hwm_dd_tab.done{color:#9be38a;border-color:#6fa85e;}';
  document.head.appendChild(css);

  const tab = document.createElement('div');
  tab.id = 'hwm_dd_tab';
  tab.textContent = TAB_LABEL;
  tab.title = 'Скопировать данные страницы (Ctrl+Shift+Y). Можно двигать вверх-вниз';

  function moveTab(y) {
    tab.style.top = Math.max(0, Math.min(window.innerHeight - TAB_HEIGHT, y)) + 'px';
  }

  function showCopied(length) {
    tab.textContent = '✓ ' + length + ' симв.';
    tab.classList.add('done');
    setTimeout(function () {
      tab.textContent = TAB_LABEL;
      tab.classList.remove('done');
    }, 2000);
  }

  // Если мышь сдвинулась больше чем на 3px, это перетаскивание, а не клик
  function startDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    const grabOffset = e.clientY - tab.offsetTop;
    const startY = e.clientY;
    let dragging = false;

    function onMove(ev) {
      dragging = dragging || Math.abs(ev.clientY - startY) > 3;
      if (dragging) moveTab(ev.clientY - grabOffset);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      if (!dragging) {
        copyDump();
        return;
      }
      try { localStorage.setItem(POS_KEY, tab.offsetTop); } catch (err) {}
    }
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
  }

  let savedY = NaN;
  try { savedY = parseInt(localStorage.getItem(POS_KEY), 10); } catch (e) {}
  moveTab(isNaN(savedY) ? Math.round(window.innerHeight / 2) : savedY);

  tab.addEventListener('mousedown', startDrag);
  document.addEventListener('mousedown', rememberClick, true);
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyY') {
      e.preventDefault();
      copyDump();
    }
  });
  document.body.appendChild(tab);
})();
