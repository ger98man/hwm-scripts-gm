// ==UserScript==
// @name           hwm_no_retaliation_gm
// @author         ger98man
// @license        MIT
// @namespace      hwm_no_retaliation
// @description    Во время боя помечает отряды, у которых снята отдача (ответ уже потрачен до их следующего хода)
// @version        0.5
// @tag            hwm-gm
// @homepageURL    https://github.com/ger98man/hwm-scripts-gm
// @updateURL      https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_no_retaliation_gm.user.js
// @downloadURL    https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_no_retaliation_gm.user.js
// @match          https://www.heroeswm.ru/war*
// @match          https://heroeswm.ru/war*
// @match          https://mirror.heroeswm.ru/war*
// @match          https://my.lordswm.com/war*
// @match          https://www.lordswm.com/war*
// @grant          unsafeWindow
// @run-at         document-idle
// ==/UserScript==

// Поле obj.ret сервер присылает только при загрузке отряда и дальше не обновляет,
// поэтому отдачу считаем сами по ударам:
// - ход отряда = atb[0] (голова шкалы инициативы); в свой ход отряд получает отдачу обратно;
// - удар по ходящему отряду от того, кого он в этот ход бил, = ответ, отдача снята;
// - удар по ходящему отряду ДО его удара (Хищные рефлексы, Готовность) засчитываем,
//   когда ходящий потом бьёт именно этот отряд.
// Урон от магии (огненный щит, мины и т.п.) отдачу не тратит, его пропускаем.
// Скрипт открыт посреди боя - отряды, ответившие раньше, отметятся только после
// следующего ответа; через раунд всё сходится само.

(function () {
  'use strict';

  const w = unsafeWindow;

  // Зазор между плашкой численности и крестиком (в пикселях canvas)
  const GAP_X = 2;
  // Если плашку не удалось найти - крестик под ногами отряда (экранные пиксели)
  const FALLBACK_Y = 10;
  // Сколько раз за бой можно заново повесить хук, если игра или другой скрипт его заменили
  const MAX_HOOKS = 8;

  const style = document.createElement('style');
  style.textContent =
    '.hwm-noret{position:fixed;z-index:50;pointer-events:none;box-sizing:border-box;' +
    'border-radius:3px;background:rgba(40,0,0,.75);border:1px solid #ff3b30;color:#ff3b30;}' +
    '.hwm-noret svg{display:block;width:100%;height:100%;}';
  document.head.appendChild(style);

  const labels = {};
  // Отряды, уже ответившие с момента своего последнего хода
  const spent = new Set();
  // В текущем ходу: кого ударил ходящий отряд, и кто ударил его первым
  const struck = new Set();
  const struckFirst = new Set();
  let actor = 0;

  let scene = null;
  let hookFn = null;
  let hookCount = 0;
  // Для hwm_debug_dump_gm: сколько ударов увидел хук и последние из них
  let damageCalls = 0;
  const lastHits = [];

  w.hwmNoRetDebug = function () {
    return {
      hooked: !!(scene && scene.procceddamage === hookFn),
      hookCount: hookCount, damageCalls: damageCalls, actor: actor,
      atb0: w.atb && w.atb[0], activeobj: w.activeobj,
      spent: Array.from(spent), struck: Array.from(struck), struckFirst: Array.from(struckFirst),
      lastHits: lastHits.slice(),
    };
  };

  function getScene() {
    if (!w.stage) return null;
    return w.stage[w.war_scr] || w.stage.pole || null;
  }

  function getField() {
    const root = w.war_scr && document.getElementById(w.war_scr);
    if (!root) return null;
    return root.querySelector('canvas') || root;
  }

  function resetBattle() {
    spent.clear();
    struck.clear();
    struckFirst.clear();
    actor = 0;
  }

  // Новый ход: отряд получает отдачу обратно, удары прошлого хода больше не считаются
  function noteTurn() {
    const front = w.atb && w.atb[0];
    if (front > 0 && front !== actor) {
      actor = front;
      spent.delete(front);
      struck.clear();
      struckFirst.clear();
    }
    return actor;
  }

  function markSpent(index) {
    const cre = scene && scene.obj[index];
    // Бесконечный ответ не кончается; Укоренение в защите отвечает на всё до своего хода
    if (!cre || cre.hero || cre.uretalation) return;
    if (cre.takeroots && w.magic && w.magic[index] && w.magic[index].def) return;
    spent.add(index);
  }

  // Игра вызывает procceddamage(i) для каждого получившего урон, атакующий - в obj[i].damaged
  function onDamage(i) {
    const victim = this.obj[i];
    damageCalls++;
    if (victim) {
      lastHits.push({ victim: i, attacker: victim.damaged, magic: victim.magicdamage || '', atb0: w.atb && w.atb[0] });
      if (lastHits.length > 20) lastHits.shift();
    }
    if (!victim || victim.magicdamage) return;
    const attacker = victim.damaged;
    if (!(attacker > 0)) return;
    const now = noteTurn();
    if (!now) return;
    if (attacker === now) {
      struck.add(i);
      if (struckFirst.delete(i)) markSpent(i);
    } else if (i === now) {
      if (struck.has(attacker)) markSpent(attacker);
      else struckFirst.add(attacker);
    }
  }

  function installHook() {
    const cur = getScene();
    if (cur !== scene) {
      scene = cur;
      hookFn = null;
      hookCount = 0;
      resetBattle();
    }
    if (!scene || typeof scene.procceddamage !== 'function') return;
    // Наш хук на месте или спрятан под чужой обёрткой (чужая обёртка тоже его вызовет)
    if (scene.procceddamage === hookFn || scene.procceddamage.hwmNoRetWrapped) return;
    if (hookCount >= MAX_HOOKS) return;
    hookCount++;
    const original = scene.procceddamage;
    const wrapper = function () {
      // Если наших обёрток вдруг несколько, считает только самая новая
      if (wrapper === hookFn) {
        try { onDamage.apply(this, arguments); } catch (e) {}
      }
      return original.apply(this, arguments);
    };
    wrapper.hwmNoRetWrapped = true;
    hookFn = wrapper;
    scene.procceddamage = wrapper;
  }

  function getLabel(key) {
    if (!labels[key]) {
      const el = document.createElement('div');
      el.className = 'hwm-noret';
      // Рисуем линиями: положение символа ✖ в плашке зависит от шрифта
      el.innerHTML = '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" ' +
        'stroke-linecap="round"><path d="M2.2 2.2 7.8 7.8M7.8 2.2 2.2 7.8"/></svg>';
      el.title = 'без отдачи';
      document.body.appendChild(el);
      labels[key] = el;
    }
    return labels[key];
  }

  // Плашка численности: игра ставит её в (scr_x + number.tx, scr_y), в пикселях canvas
  // (set_number / set_number_outside в show_polep.js). Возвращает её прямоугольник или null.
  function badgeBox(cre) {
    const num = cre.number;
    if (!num || typeof num.tx !== 'number') return null;
    try {
      if (typeof w.get_visible === 'function' && !w.get_visible(num)) return null;
      let width = 0, height = 0;
      if (cre.number_rect && typeof w.get_width === 'function') {
        width = w.get_width(cre.number_rect);
        height = w.get_height(cre.number_rect);
      }
      if (!(width > 0) && cre.ntext && typeof w.get_width === 'function') {
        const pad = Math.max(2, 3 * (cre.scaling || 1));
        width = w.get_width(cre.ntext) + pad * 2 + 2;
        height = w.get_height(cre.ntext) + 2;
      }
      if (!(width > 0) || !(height > 0)) return null;
      return { x: cre.scr_x + num.tx, y: cre.scr_y, w: width, h: height };
    } catch (e) { return null; }
  }

  function update() {
    installHook();
    noteTurn();
    const field = getField();
    const used = {};

    if (field && scene && scene.obj) {
      const rect = field.getBoundingClientRect();
      // scr_x/scr_y - в пикселях canvas, переводим в экранные
      const kx = field.width ? rect.width / field.width : 1;
      const ky = field.height ? rect.height / field.height : 1;

      spent.forEach(function (index) {
        const cre = scene.obj[index];
        // Погибший отряд метку теряет: поднятый заново снова отвечает
        if (!cre || !(cre.nownumber > 0)) {
          spent.delete(index);
          return;
        }
        // Невидимый/улетевший отряд игра уводит за поле - метку не рисуем
        if (typeof cre.scr_x !== 'number' || !(cre.x > 0 && cre.y > 0)) return;
        const key = String(index);
        used[key] = true;
        const el = getLabel(key);
        const box = badgeBox(cre);
        const size = Math.round(box ? box.h * ky : 16);
        el.style.width = el.style.height = size + 'px';
        // Целые координаты: на дробных рамка плашки размывается по-разному у разных отрядов
        const left = box ? box.x + box.w + GAP_X : cre.scr_x;
        const centerY = (box ? box.y + box.h / 2 : cre.scr_y) * ky + (box ? 0 : FALLBACK_Y);
        el.style.left = Math.round(rect.left + left * kx - (box ? 0 : size / 2)) + 'px';
        el.style.top = Math.round(rect.top + centerY - size / 2) + 'px';
        el.style.display = rect.width > 0 ? 'block' : 'none';
      });
    }

    for (const key in labels) {
      if (!used[key]) labels[key].style.display = 'none';
    }
  }

  setInterval(update, 200);
})();
