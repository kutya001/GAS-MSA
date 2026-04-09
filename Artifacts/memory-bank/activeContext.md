# Active Context — Текущая работа

> **Дата последнего обновления:** 2026-04-09

## Текущий фокус

- Оптимизация производительности бэкенда и фронтенда; добавление поля updated_at; формат timestamps.

## Недавние изменения

| Дата | Что сделано |
|------|------------|
| 2026-04-09 | **Helpers.js**: кэширование `_ss()` и `_sh()` на время выполнения (устранены повторные вызовы SpreadsheetApp.openById и getSheetByName); `_update()` → batch setValues + авто-простановка updated_at; `_now()` — формат dd.MM.yyyy - HH-mm-ss |
| 2026-04-09 | **Wallets.js**: `_adjustBalance()` — прямая запись через setValues вместо вызова _update (убрано 4 лишних API-вызова); `created_at: _now()` |
| 2026-04-09 | **Warehouses.js**: `_adjustWarehouse()` — прямая запись через setValues; `created_at: _now()` |
| 2026-04-09 | **WebApp.js**: `getMasterData()` — комбинированная загрузка всех справочников одним вызовом (1 round-trip вместо 7) |
| 2026-04-09 | **ScriptHelpers.html**: `loadMasterData()` → один вызов `api('getMasterData')` вместо 7 `Promise.all`; mock обновлён |
| 2026-04-09 | **DBinit.js**: добавлено `updated_at` в SCHEMA для Кошельки, КассовыеОперации, Склады, Закупки, Продажи, Оплаты, ОплатыЗакупок, MDM_Номенклатура |
| 2026-04-09 | **Purchases.js, Sales.js, Payments.js, MDM.js**: `created_at: _today()` → `created_at: _now()` |

## Текущие задачи

- [x] Кэширование _ss()/_sh() — устранение повторных открытий SpreadsheetApp
- [x] _update() → batch setValues (1 запись вместо N)
- [x] _adjustBalance/_adjustWarehouse → прямая запись (без вызова _update)
- [x] getMasterData() — 1 API-вызов вместо 7
- [x] Добавление updated_at в SCHEMA (8 таблиц)
- [x] _update() авто-простановка updated_at
- [x] Формат created_at → dd.MM.yyyy - HH-mm-ss (_now())
- [x] Обновление артефактов

## Известные проблемы

- MDM-формулы (тип `calculated`): определён в схеме, но движок вычислений не реализован.

## Следующие шаги

- Определяется пользователем.
