// ==UserScript==
// @name           hwm_hero_mana_gm
// @author         ger98man
// @license        MIT
// @namespace      hwm_hero_mana
// @description    Показывает ману героев во время боя (сейчас/макс) под фигуркой героя
// @version        0.4
// @tag            hwm-gm
// @homepageURL    https://github.com/ger98man/hwm-scripts-gm
// @updateURL      https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_hero_mana_gm.user.js
// @downloadURL    https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_hero_mana_gm.user.js
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

  // Сдвиг подписи вниз от ног героя (в экранных пикселях), чтобы не закрывать ник героя
  const OFFSET_Y = 20;

  const style = document.createElement('style');
  style.textContent =
    '.hwm-hero-mana{position:fixed;z-index:50;pointer-events:none;transform:translateX(-50%);' +
    'padding:1px 5px;border-radius:4px;background:rgba(0,0,40,.75);color:#7fc8ff;' +
    'font:bold 12px Verdana,Arial,sans-serif;white-space:nowrap;text-shadow:0 0 2px #000;}' +
    '.hwm-hero-mana.empty{color:#ff7070;}';
  document.head.appendChild(style);

  const labels = {};

  function getField() {
    const root = w.war_scr && document.getElementById(w.war_scr);
    if (!root) return null;
    return root.querySelector('canvas') || root;
  }

  function getHeroes() {
    const pole = w.stage && w.stage.pole;
    if (!pole || !pole.obj || !w.heroes) return [];
    const list = [];
    for (const owner in w.heroes) {
      const id = w.heroes[owner];
      const hero = id && pole.obj[id];
      // rock - флаги и прочие декорации, которые тоже числятся героями
      if (hero && hero.hero && !hero.rock) list.push(hero);
    }
    return list;
  }

  function getLabel(key) {
    if (!labels[key]) {
      const el = document.createElement('div');
      el.className = 'hwm-hero-mana';
      document.body.appendChild(el);
      labels[key] = el;
    }
    return labels[key];
  }

  function update() {
    const field = getField();
    if (!field) return;
    const rect = field.getBoundingClientRect();
    // scr_x/scr_y героя - в пикселях canvas, переводим в экранные
    const kx = field.width ? rect.width / field.width : 1;
    const ky = field.height ? rect.height / field.height : 1;
    const used = {};

    for (const hero of getHeroes()) {
      const max = parseInt(hero.maxmanna) || 0;
      // Героя без маны совсем не показываем
      if (max <= 0 || typeof hero.scr_x !== 'number') continue;
      const now = Math.max(0, parseInt(hero.nowmanna) || 0);

      const key = String(hero.obj_index);
      used[key] = true;
      const el = getLabel(key);
      el.textContent = now + '/' + max;
      el.title = (hero.nametxt || '') + ': мана ' + now + '/' + max;
      el.classList.toggle('empty', now === 0);
      el.style.left = (rect.left + hero.scr_x * kx) + 'px';
      el.style.top = (rect.top + hero.scr_y * ky + OFFSET_Y) + 'px';
      el.style.display = rect.width > 0 && !hero.dead ? 'block' : 'none';
    }

    for (const key in labels) {
      if (!used[key]) labels[key].style.display = 'none';
    }
  }

  setInterval(update, 500);
})();
