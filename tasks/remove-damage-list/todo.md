# TODO

Файлы: `battle_damage_tooltip_gm.user.js` (единственный)

Подход: вырезать разметку панели, её переменные, обработчики и функцию `refresh()`;
оставшийся мёртвый код (`evalStrength`, `damageMultipliers`, `coeff_on`) удалить тоже.

- [x] Переводы ru/en: `btnListCollapsed`, `btnListOpen`, `btnChangeSide`, `damageTo`, `defaultCreature`, `sCoeffLabel`, `sCoeffTip`
- [x] Разметка: `#dmg_list_container`, `#dmg_list_refresh`, `#choose_cre`, `#change_side`
- [x] Переменные: `isOpen`, `chosen`, `select`, `refresh_button`, `side_button`, `dmg_list_container`, `defender_obj_id`, `selected_id`
- [x] `readjust_elements()` — убрать ссылки на удалённые элементы
- [x] Обработчики: `choose_cre`, `dmg_list_refresh`, `change_side`, `coeff_on`, все `if (isOpen) refresh()`
- [x] `case "collapse"` — закрывать только индивидуальный расчёт
- [x] Удалить `refresh()`, `evalStrength`, `damageMultipliers`, `coeff_on`
- [x] Проверка: `node --check`, grep на остатки идентификаторов

Что может сломаться: ❌ используется и индивидуальным расчётом — кнопку сохранить.
`mag_damage_on` / `cre_distance_on` влияют и на индивидуальный расчёт — сохранить.
