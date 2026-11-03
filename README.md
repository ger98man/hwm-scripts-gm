# hwm-scripts-gm

Юзерскрипты для HeroesWM / LordsWM. Нужен [Tampermonkey](https://www.tampermonkey.net/): нажмите «Установить», он сам предложит поставить скрипт и будет обновлять его из этого репозитория.

| Скрипт | Версия | Описание | |
|---|---|---|---|
| `battle_damage_tooltip_gm` | 3.2.3 | Просмотр урона любого отряда, улучшенный лог боя, фиксы и фичи (перечислены в описаниее) | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/battle_damage_tooltip_gm.user.js) |
| `hwm_debug_dump_gm` | 0.7 | Временный скрипт: собирает данные страницы боя / протокола боёв для доработки скриптов | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_debug_dump_gm.user.js) |
| `hwm_exp_protocol_gm` | 1.25 | Личная версия: экспоумка, прогноз умелки по боям ГТ, загрузка боёв ГТ из протокола. Фильтр протокола - hwm_warlog_filter_gm. Не обновляется с greasyfork. | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_exp_protocol_gm.user.js) |
| `hwm_hero_mana_gm` | 0.3 | Показывает ману героев во время боя (сейчас/макс) под фигуркой героя | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_hero_mana_gm.user.js) |
| `hwm_hover_effects_gm` | 0.5 | Во время боя при наведении мыши на отряд показывает в столбике чата над строкой ввода его эффекты, у которых есть время действия | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_hover_effects_gm.user.js) |
| `hwm_no_retaliation_gm` | 0.3 | Во время боя помечает отряды, у которых снята отдача (ответ уже потрачен до их следующего хода) | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_no_retaliation_gm.user.js) |
| `hwm_res_value_gm` | 0.1 | Примерная стоимость ресурсов, элементов и частей на странице персонажа (цены редактируются) | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_res_value_gm.user.js) |
| `hwm_sklad_rent_gm` | 0.1 | Клановый склад: одной кнопкой арендовать тот же набор артефактов (самые дешёвые без крафта) | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_sklad_rent_gm.user.js) |
| `hwm_warlog_filter_gm` | 1.1 | Фильтр протокола боёв по типу боя (с добором строк со следующих страниц) и винрейт ГТ на странице. | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_warlog_filter_gm.user.js) |
| `lwm_combat_info_gm` | 0.1 | Displays extra information during combats | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/lwm_combat_info_gm.user.js) |

## Лицензии

Файл [LICENSE](LICENSE) (MIT) действует для всего, что написано автором репозитория. Для отдельных скриптов смотрите поле `@license` в заголовке, оно важнее общего файла:

- `battle_damage_tooltip_gm` — MIT, авторство исходного скрипта указано в `@author`.
- `hwm_warlog_filter_gm` — MIT, кроме вспомогательных функций из `hwm_exp_ability` от Pahan.
- `hwm_exp_protocol_gm` — лицензия не указана: основан на `hwm_exp_ability` от Pahan, у которого её нет.
- `lwm_combat_info_gm` — лицензия не указана: основан на LWM Combat Info от Thirdwater, у которого её нет.
