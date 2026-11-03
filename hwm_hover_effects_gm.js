// ==UserScript==
// @name           hwm_hover_effects_gm
// @namespace      hwm_hover_effects
// @description    Во время боя при наведении мыши на отряд показывает в столбике чата над строкой ввода его эффекты, у которых есть время действия
// @version        0.5
// @match          https://www.heroeswm.ru/war*
// @match          https://heroeswm.ru/war*
// @match          https://mirror.heroeswm.ru/war*
// @match          https://my.lordswm.com/war*
// @match          https://www.lordswm.com/war*
// @grant          unsafeWindow
// @run-at         document-idle
// ==/UserScript==

// Таблицу эффектов строит сама игра: stage[war_scr].showmagicinfo(i) пишет её в #effects_list
// (окно "Эффекты" из инфо отряда). Вызываем её для отряда под курсором, забираем HTML
// и возвращаем окну прежнее содержимое. Клетку под курсором игра хранит в xr_last/yr_last,
// отряд в клетке - в mapobj.
// Постоянные эффекты (время "-") отбрасываем, остаются только те, что истекут.

(function () {
  'use strict';

  const w = unsafeWindow;

  // Как часто перечитывать эффекты (длительность меняется по ходу боя)
  const REFRESH_MS = 300;
  // Окна игры, при открытых которых таблицу не показываем
  const BLOCKING_WINDOWS = ['win_InfoCreatureEffect', 'win_InfoCreature', 'win_InfoHero', 'win_InfoHero2', 'win_BattleResult'];
  // Чат: классический (под полем) или плавающий
  const CHAT_IDS = ['area_chat_classic', 'area_chat'];
  const CHAT_INPUT_IDS = ['chattext', 'chattext_classic'];
  // Зазор между табличкой и строкой ввода чата
  const INPUT_GAP = 12;
  // Размер шрифта: обычный и самый мелкий, до которого ужимаем длинные строки
  const FONT_MAX = 14, FONT_MIN = 10;
  // Размер таблички, если чат закрыт (тогда она встаёт в левый нижний угол поля)
  const FALLBACK_W = 320, FALLBACK_H = 160;

  // Цвет строки, которым игра помечает эффект: зелёный - положительный, красный - отрицательный
  const GAME_POSITIVE = 'rgb(63, 91, 19)';
  const GAME_NEGATIVE = 'rgb(180, 5, 1)';

  const style = document.createElement('style');
  style.textContent =
    '#hwm_hover_eff{position:fixed;z-index:2147483646;pointer-events:none;display:none;box-sizing:border-box;overflow:hidden;' +
    'padding:0 8px;font:14px Verdana,Arial,sans-serif;color:#ddd;text-shadow:0 0 2px #000,0 0 2px #000;}' +
    '#hwm_hover_eff .hwm-he-name{font-weight:bold;margin-bottom:4px;white-space:nowrap;color:#f0d999;}' +
    '#hwm_hover_eff table{border-collapse:collapse;}' +
    '#hwm_hover_eff td{padding:2px 0;white-space:nowrap;font-size:inherit;}' +
    '#hwm_hover_eff td[width]{width:.6em;}' +
    '#hwm_hover_eff tr:first-child td{font-weight:bold;color:#888;}' +
    '#hwm_hover_eff tr.hwm-he-pos td{color:#6fdc4f;}' +
    '#hwm_hover_eff tr.hwm-he-neg td{color:#ff6b5b;}' +
    '#hwm_hover_eff tr.hwm-he-neu td{color:#8fb8ff;}';
  document.head.appendChild(style);

  const tip = document.createElement('div');
  tip.id = 'hwm_hover_eff';
  document.body.appendChild(tip);

  let mouseOnField = false;
  let fittedWidth = -1;
  let shownIndex = 0, shownAt = 0;

  function getScene() {
    if (!w.stage) return null;
    return w.stage[w.war_scr] || w.stage.pole || null;
  }

  function getField() {
    const root = w.war_scr && document.getElementById(w.war_scr);
    if (!root) return null;
    return root.querySelector('canvas') || root;
  }

  document.addEventListener('mousemove', function (e) {
    const field = getField();
    if (!field) {
      mouseOnField = false;
      return;
    }
    const r = field.getBoundingClientRect();
    mouseOnField = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }, true);

  function windowOpen() {
    const vis = w.buttons_visible;
    return !!vis && BLOCKING_WINDOWS.some(function (id) { return vis[id]; });
  }

  // Отряд в клетке под курсором (только живые существа, без героев и декораций)
  function hoveredIndex(scene) {
    const xr = w.xr_last, yr = w.yr_last;
    if (!(xr > 0 && yr > 0) || !w.mapobj || !w.defxn) return 0;
    const i = w.mapobj[yr * w.defxn + xr];
    const cre = i > 0 && scene.obj[i];
    if (!cre || cre.hero || cre.rock || cre.statix || !(cre.nownumber > 0)) return 0;
    if (!w.magic || !w.magic[i]) return 0;
    return i;
  }

  // Таблица эффектов от самой игры без постоянных эффектов; пустая строка - показывать нечего
  function effectsHtml(scene, i) {
    const list = document.getElementById('effects_list');
    const head = document.getElementById('effects_info_head');
    if (!list || typeof scene.showmagicinfo !== 'function') return '';
    const savedList = list.innerHTML;
    const savedHead = head ? head.innerHTML : '';
    let html = '';
    try {
      scene.showmagicinfo(i);
      const table = list.querySelector('table');
      if (table) {
        let left = 0;
        // Строки эффектов игра красит через style; шапка и "Нет эффектов" без него.
        // Последняя ячейка - время: "-" у постоянных эффектов
        Array.prototype.slice.call(table.rows).forEach(function (row) {
          if (!row.hasAttribute('style')) return;
          const time = row.cells[row.cells.length - 1];
          if (!time || time.textContent.trim() === '-') {
            row.remove();
            return;
          }
          left++;
          const color = row.style.color;
          row.className = color === GAME_POSITIVE ? 'hwm-he-pos' : color === GAME_NEGATIVE ? 'hwm-he-neg' : 'hwm-he-neu';
          row.removeAttribute('style');
        });
        if (left) html = table.outerHTML;
      }
    } catch (e) {
      html = '';
    } finally {
      list.innerHTML = savedList;
      if (head) head.innerHTML = savedHead;
    }
    return html;
  }

  // Строка ввода чата: видимое поле, которое по горизонтали попадает в столбик чата.
  // Сама строка может лежать вне контейнера чата, поэтому ищем её по всей странице
  function chatInputRect(area) {
    for (const id of CHAT_INPUT_IDS) {
      const input = document.getElementById(id);
      if (!input || !input.getClientRects().length) continue;
      const ir = input.getBoundingClientRect();
      if (ir.height > 0 && ir.right > area.left && ir.left < area.right) return ir;
    }
    return null;
  }

  // Столбик чата, если он открыт: его края и верх строки ввода.
  // offsetParent тут не годится - у закреплённого справа чата position:fixed, и он всегда null
  function chatArea() {
    for (const id of CHAT_IDS) {
      const el = document.getElementById(id);
      if (!el || !el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 50 || r.height < 30) continue;
      const ir = chatInputRect(r);
      const bottom = ir ? ir.top - INPUT_GAP : r.bottom;
      return { left: r.left, width: r.width, top: r.top, bottom: bottom };
    }
    return null;
  }

  // Табличка прижата низом к строке ввода чата и растёт вверх по содержимому
  function place() {
    let a = chatArea();
    if (!a) {
      const field = getField();
      if (!field) return;
      const f = field.getBoundingClientRect();
      a = { left: f.left + 4, width: FALLBACK_W, top: f.bottom - FALLBACK_H - 4, bottom: f.bottom - 4 };
    }
    tip.style.left = a.left + 'px';
    tip.style.width = a.width + 'px';
    tip.style.top = 'auto';
    tip.style.bottom = (window.innerHeight - a.bottom) + 'px';
    tip.style.maxHeight = Math.max(40, a.bottom - a.top) + 'px';
  }

  // Шрифт уменьшаем ровно настолько, чтобы самая длинная строка влезла в ширину чата
  function fitFont() {
    tip.style.fontSize = FONT_MAX + 'px';
    const avail = tip.clientWidth - 16;
    let need = 0;
    for (const el of tip.children) need = Math.max(need, el.scrollWidth);
    if (need > avail && avail > 0)
      tip.style.fontSize = Math.max(FONT_MIN, Math.floor(FONT_MAX * avail / need * 10) / 10) + 'px';
    fittedWidth = tip.clientWidth;
  }

  function hide() {
    tip.style.display = 'none';
    shownIndex = 0;
  }

  function update() {
    const scene = getScene();
    if (!scene || !scene.obj || !mouseOnField || windowOpen()) return hide();
    const i = hoveredIndex(scene);
    if (!i) return hide();

    const now = Date.now();
    let changed = false;
    if (i !== shownIndex || now - shownAt >= REFRESH_MS) {
      const html = effectsHtml(scene, i);
      if (!html) return hide();
      const cre = scene.obj[i];
      tip.innerHTML = '<div class="hwm-he-name"></div>' + html;
      tip.firstChild.textContent = (cre.nametxt || '') + ' [' + cre.nownumber + ']';
      tip.style.display = 'block';
      shownIndex = i;
      shownAt = now;
      changed = true;
    }
    place();
    if (changed || tip.clientWidth !== fittedWidth) fitFont();
  }

  setInterval(update, 50);
})();
