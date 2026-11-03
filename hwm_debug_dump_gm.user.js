// ==UserScript==
// @name           hwm_debug_dump_gm
// @author         ger98man
// @namespace      hwm_debug_dump
// @description    Временный скрипт: собирает данные страницы боя / протокола боёв для доработки скриптов
// @version        0.7
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
  const isWar = location.pathname.indexOf('/war') === 0;
  let lastClick = null;

  function getField() {
    const root = w.war_scr && document.getElementById(w.war_scr);
    if (!root) return null;
    return root.querySelector('canvas') || root;
  }

  // Запоминаем последний клик по полю боя в долях от размера поля
  document.addEventListener('mousedown', function (e) {
    const field = isWar && getField();
    if (!field) return;
    const r = field.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    lastClick = {
      x: +((e.clientX - r.left) / r.width).toFixed(3),
      y: +((e.clientY - r.top) / r.height).toFixed(3),
    };
  }, true);

  // Элементы, в тексте которых есть слова про опыт/умение (итоги боя)
  function findResultBlocks() {
    const re = /опыт|умени|experience|skill/i;
    const found = [];
    document.querySelectorAll('div,td,span,font,p').forEach(function (el) {
      if (found.length >= 10) return;
      const own = Array.prototype.some.call(el.childNodes, function (n) {
        return n.nodeType === 3 && re.test(n.textContent);
      });
      if (own && el.offsetParent !== null) {
        const box = el.closest('[id]') || el.parentElement || el;
        found.push({ id: box.id, html: box.outerHTML.slice(0, 3000) });
      }
    });
    return found;
  }

  function collectWar() {
    const data = { url: location.href.replace(/[?&](sign|key|pass)=[^&]*/gi, ''), btype: w.btype, defxn: w.defxn, defyn: w.defyn,
      lastturn: w.lastturn, war_scr: w.war_scr, heroes: w.heroes, lastClickOnField: lastClick };
    const field = getField();
    if (field) {
      const r = field.getBoundingClientRect();
      data.field = { tag: field.tagName, w: Math.round(r.width), h: Math.round(r.height), canvasW: field.width, canvasH: field.height };
    }
    data.heroList = [];
    const pole = w.stage && w.stage.pole;
    if (pole && pole.obj && w.heroes) {
      for (const owner in w.heroes) {
        const h = pole.obj[w.heroes[owner]];
        if (!h) continue;
        const info = {};
        for (const k in h) {
          if (/^image_link\d+$/.test(k)) continue;
          const v = h[k];
          if (v === null || typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && v.length < 200))
            info[k] = v;
        }
        info.owner = owner;
        data.heroList.push(info);
      }
    }
    // Существа коротко (без героев) - для hwm_no_retaliation_gm
    data.creatures = [];
    if (pole && pole.obj) {
      for (const i in pole.obj) {
        const c = pole.obj[i];
        if (!c || c.hero) continue;
        data.creatures.push({ i: c.obj_index, name: c.nametxt, owner: c.owner, num: c.nownumber, x: c.x, y: c.y,
          scr_x: c.scr_x, scr_y: c.scr_y, ret: c.ret, uret: c.uretalation, noret: c.noretalation,
          damaged: c.damaged, magicdamage: c.magicdamage });
      }
    }
    data.atb = Array.isArray(w.atb) ? w.atb.slice(0, 15) : w.atb;
    if (typeof w.hwmNoRetDebug === 'function') {
      try { data.noRetaliation = w.hwmNoRetDebug(); } catch (e) { data.noRetaliation = 'ERROR: ' + e; }
    }
    data.resultBlocks = findResultBlocks();
    return data;
  }

  function collectWarlog() {
    const rows = [];
    document.querySelectorAll('a[href*="warid="]').forEach(function (a) {
      if (rows.length >= 40) return;
      const row = a.closest('tr') || a.parentElement;
      rows.push(row.outerHTML.slice(0, 1500));
    });
    return { url: location.href, rows: rows };
  }

  // Любая другая страница: HTML без скриптов, стилей и картинок-данных
  function collectPage() {
    const body = document.body.cloneNode(true);
    // Шапка игры, меню, модификаторы артов и подсказки одинаковы везде - убираем, чтобы влезало
    body.querySelectorAll('script,style,noscript,svg,link,#hwm_header,.sh_dd_container,#hintBlock,.art_mods,.art_durability_hidden').forEach(function (el) { el.remove(); });
    body.querySelectorAll('[hint],[onmouseover],[onmouseout],[hwm_hint_added]').forEach(function (el) {
      el.removeAttribute('hint');
      el.removeAttribute('onmouseover');
      el.removeAttribute('onmouseout');
      el.removeAttribute('hwm_hint_added');
    });
    body.querySelectorAll('img').forEach(function (img) {
      if (img.src.indexOf('art_fon_') > -1) img.remove();
    });
    body.querySelectorAll('img').forEach(function (img) {
      if (img.src.indexOf('data:') === 0) img.removeAttribute('src');
    });
    body.querySelectorAll('input[type=password],input[type=hidden]').forEach(function (el) { el.removeAttribute('value'); });
    const html = body.innerHTML.replace(/\s{2,}/g, ' ');
    return { url: location.href, title: document.title, htmlLength: html.length, html: html.slice(0, 150000) };
  }

  function collect() {
    if (isWar) return collectWar();
    if (location.pathname.indexOf('/pl_warlog.php') === 0) return collectWarlog();
    return collectPage();
  }

  function copyData() {
    let text;
    try {
      text = JSON.stringify(collect(), null, 1);
    } catch (e) {
      text = 'ERROR: ' + e;
    }
    GM_setClipboard(text);
    return text;
  }

  // Узкий язычок у левого края экрана, выезжает при наведении.
  // Тянется мышью вверх-вниз вдоль края, позиция запоминается.
  // Ещё можно копировать без кнопки: Ctrl+Shift+Y
  const POS_KEY = 'hwm_debug_dump_tab_y';
  const LABEL = 'Claude';
  const TITLE = 'Скопировать данные для Claude (Ctrl+Shift+Y). Можно двигать вверх-вниз';
  const css = document.createElement('style');
  css.textContent =
    '#hwm_dd_tab{position:fixed;left:0;z-index:2147483647;display:flex;align-items:center;height:26px;' +
    'padding:0 6px 0 3px;transform:translateX(calc(-100% + 7px));transition:transform .15s,opacity .15s;opacity:.55;' +
    'background:linear-gradient(#4a3a20,#2b2112);border:1px solid #b8964f;border-left:none;border-radius:0 6px 6px 0;' +
    'box-shadow:1px 1px 4px rgba(0,0,0,.6);color:#f0d999;font:bold 11px Verdana,Arial,sans-serif;' +
    'cursor:pointer;user-select:none;white-space:nowrap;}' +
    '#hwm_dd_tab:hover,#hwm_dd_tab.done{transform:none;opacity:1;}' +
    '#hwm_dd_tab.done{color:#9be38a;border-color:#6fa85e;}';
  document.head.appendChild(css);

  const btn = document.createElement('div');
  btn.id = 'hwm_dd_tab';
  btn.textContent = LABEL;
  btn.title = TITLE;
  function place(y) {
    btn.style.top = Math.max(0, Math.min(window.innerHeight - 26, y)) + 'px';
  }
  let posY = parseInt(localStorage[POS_KEY]);
  place(isNaN(posY) ? Math.round(window.innerHeight / 2) : posY);

  function flash(text) {
    btn.textContent = '✓ ' + text.length + ' симв.';
    btn.classList.add('done');
    setTimeout(function () {
      btn.textContent = LABEL;
      btn.classList.remove('done');
    }, 2000);
  }

  // Перетаскивание по вертикали: если мышь сдвинулась больше чем на 3px, это не клик
  btn.addEventListener('mousedown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const dy = e.clientY - btn.offsetTop, sy = e.clientY;
    let moved = false;
    function onMove(ev) {
      if (Math.abs(ev.clientY - sy) > 3) moved = true;
      if (moved) place(ev.clientY - dy);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      if (moved) {
        try { localStorage[POS_KEY] = btn.offsetTop; } catch (e) {}
      } else {
        flash(copyData());
      }
    }
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
  });

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyY') {
      e.preventDefault();
      flash(copyData());
    }
  });
  document.body.appendChild(btn);
})();
