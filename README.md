# hwm-scripts-gm

Юзерскрипты для HeroesWM / LordsWM. Нужен [Tampermonkey](https://www.tampermonkey.net/): нажмите «Установить», он сам предложит поставить скрипт и будет обновлять его из этого репозитория.

| Скрипт | Версия | Описание | |
|---|---|---|---|
| `battle_damage_tooltip_gm` | 3.2.4 | Просмотр урона любого отряда, улучшенный лог боя, фиксы и фичи (перечислены в описаниее) | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/battle_damage_tooltip_gm.user.js) |
| `hwm_battle_chances_gm` | 0.8 | В бою показывает вероятности: текущий шанс удачи и боевого духа с учётом счётчиков отряда, шанс вероятностного умения атакующего по наведённой цели с названием умения из базы игры (отбрасывающий удар, ослепление, оглушение и прочие) и шанс попадания по бестелесным (призраки, духи, привидения) с учётом двух предыдущих исходов | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_battle_chances_gm.user.js) |
| `hwm_battle_stats_gm` | 0.1 | В бою показывает суммарное здоровье обеих команд и рейтинг отрядов и героев по нанесённому урону | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_battle_stats_gm.user.js) |
| `hwm_combat_info_gm` | 1.1 | В бою под окном информации об отряде показывает здоровье и численность, а под окном героя — здоровье армий обеих сторон | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_combat_info_gm.user.js) |
| `hwm_debug_dump_gm` | 1.0 | Копирует в буфер данные страницы (бой, протокол боёв, любая другая) в виде JSON: для отладки и доработки скриптов | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_debug_dump_gm.user.js) |
| `hwm_exp_protocol_gm` | 2.2 | На главной показывает, успеете ли взять умелку фракции до апа уровня, с прогнозом по боям ГТ. В протоколе загружает итоги боёв ГТ. Фильтр протокола - hwm_warlog_filter_gm | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_exp_protocol_gm.user.js) |
| `hwm_hero_mana_gm` | 0.4 | Показывает ману героев во время боя (сейчас/макс) под фигуркой героя | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_hero_mana_gm.user.js) |
| `hwm_hover_effects_gm` | 0.6 | Во время боя при наведении мыши на отряд показывает в столбике чата над строкой ввода его эффекты, у которых есть время действия | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_hover_effects_gm.user.js) |
| `hwm_no_retaliation_gm` | 0.3 | Во время боя помечает отряды, у которых снята отдача (ответ уже потрачен до их следующего хода) | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_no_retaliation_gm.user.js) |
| `hwm_res_value_gm` | 0.1 | Примерная стоимость ресурсов, элементов и частей на странице персонажа (цены редактируются) | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_res_value_gm.user.js) |
| `hwm_sklad_rent_gm` | 0.1 | Клановый склад: одной кнопкой арендовать тот же набор артефактов (самые дешёвые без крафта) | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_sklad_rent_gm.user.js) |
| `hwm_warlog_filter_gm` | 1.2 | Фильтр протокола боёв по типу боя (с добором строк со следующих страниц) и винрейт ГТ на странице. | [Установить](https://raw.githubusercontent.com/ger98man/hwm-scripts-gm/main/hwm_warlog_filter_gm.user.js) |

## Лицензия

Все скрипты распространяются по лицензии [MIT](LICENSE). `battle_damage_tooltip_gm` основан на скрипте другого автора под той же лицензией: авторство исходного скрипта указано в его `@author`.

## Разработка

После клонирования включите хук, который перед коммитом поднимает `@version` изменённых скриптов и обновляет версии в таблице выше:

```bash
git config core.hooksPath .githooks
```
