# System Architecture — МобилТрек Pro

> **Дата последнего обновления:** 2026-04-08

## 1. Общая архитектура

```
┌─────────────────────────────────────────────────┐
│                   Браузер                        │
│  Frontend.html (layout)                          │
│  ├── Styles.html (CSS)                           │
│  ├── Components.html (модалки, тосты, KPI)       │
│  ├── ScriptHelpers.html (api(), g(), renderTbl)  │
│  ├── TableEngine.html (движок таблиц)            │
│  ├── FormEngine.html (движок форм)               │
│  └── Page*.html (страницы модулей)               │
│         │                                        │
│         │ google.script.run → api()              │
└─────────┼───────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────┐
│              Google Apps Script (V8)              │
│                                                  │
│  WebApp.js     — doGet(), include()              │
│  Config.js     — SH, TZ, CACHE_TTL              │
│  Helpers.js    — _ss, _sh, _rows, _append, ...   │
│  DBinit.js     — SCHEMA, initDB()               │
│  Refs.js       — CRUD справочников               │
│  Wallets.js    — Кошельки + кассовые операции     │
│  Warehouses.js — Склады                          │
│  Purchases.js  — Закупки                         │
│  Sales.js      — Продажи                         │
│  Payments.js   — Оплаты                          │
│  Analytics.js  — Дашборд, отчёты                 │
│  MDM.js        — Master Data Management          │
│         │                                        │
└─────────┼───────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────┐
│            Google Sheets (Database)              │
│                                                  │
│  20 листов: Ref_*, Кошельки, КассовыеОперации,  │
│  Склады, Закупки, Продажи, Оплаты,              │
│  Категории, Статьи, MDM_*                        │
│                                                  │
│  Иерархия классификации:                         │
│  Ref_Классы → Ref_ТипыПродуктов (2 уровня)      │
│  MDM_Шаблоны = 3-й уровень (привязан к типу)    │
└─────────────────────────────────────────────────┘
```

## 2. Слой данных

### 2.1 Конфигурация (`Config.js`)

```
SH = { ... }        — маппинг ключей на имена листов
TZ = "Asia/Bishkek"  — часовой пояс
CACHE_TTL = 300      — TTL кэша справочников (сек)
CACHE_TX = 60        — TTL кэша транзакций (сек)
LOCK_MS = 15000      — таймаут блокировки (мс)
CHUNK = 80000        — размер чанка кэша (байт)
```

### 2.2 Хелперы (`Helpers.js`)

| Функция | Назначение |
|---------|-----------|
| `_ss()` | Получить SpreadsheetApp по ID |
| `_sh(name)` | Получить лист по имени из `SH` |
| `_rows(sheetName)` | Все строки как массив объектов |
| `_append(sheetName, obj)` | Вставка строки с авто-PK |
| `_update(sheetName, id, obj)` | Обновление по ID через TextFinder |
| `_delete(sheetName, id)` | Удаление строки по ID |
| `_findById(sheetName, id)` | Найти одну запись |
| `_buildMap(sheet, keyCol, valCol)` | Словарь для JOIN'ов |
| `_nextId(key)` | Следующий ID из PropertiesService |
| `_withLock(fn)` | Обёртка с LockService |
| `_cGet(key)`, `_cSet(key, data, ttl)`, `_cDel(keys)` | Chunk-based кэш |
| `_ok(data)`, `_err(msg)` | Стандартные обёртки ответов |
| `_today()` | Текущая дата в TZ |

### 2.3 Схема БД (`DBinit.js`)

Объект `SCHEMA` определяет структуру всех листов. Функция `initDB()` создаёт отсутствующие листы и заголовки. `rebuildMaterialized()` пересчитывает materialized-колонки.

## 3. Materialized-паттерн

Для мгновенного чтения балансов без пересчёта:

| Сущность | Materialized-колонки | Обновление через |
|----------|---------------------|-----------------|
| Кошельки | `current_balance`, `total_in`, `total_out` | `_adjustBalance(walletId, amount, type)` |
| Склады | `current_items`, `current_cost_kgs` | `_adjustWarehouse(whId, qty, cost, direction)` |
| Продажи | `debt_kgs` | Обновление при `addPayment()` |

## 4. Кэширование

- **CacheService** с лимитом 100 КБ/ключ.
- JSON разбивается на чанки по `CHUNK` (80 КБ).
- Справочники: TTL = 300 сек, транзакции: TTL = 60 сек.
- Инвалидация через `_cDel()` после каждой мутации.

## 5. Безопасность

- Все write-операции обёрнуты в `_withLock()` (LockService).
- MDM-формулы: **запрещён** `eval()` / `new Function()`, требуется AST-парсер.
- Параметры валидируются на бэкенде перед записью.

## 6. Фронтенд-архитектура

- **Не SPA** — шаблонизация через `<?!= include('...') ?>`.
- Единый объект состояния `ST` (текущая страница, данные таблиц, фильтры).
- `api()` — обёртка над `google.script.run` с Promise, лоадером, обработкой ошибок.
- `renderTbl()` — универсальный рендерер таблиц с сортировкой и пагинацией.
- `openM(id)` / `closeM(id)` — модальные окна.
- CSS-переменные для тем (light/dark).

## 7. Деплой

```
clasp push    — файлы .js → .gs
clasp deploy  — публикация Web App
```

## Changelog

| Дата | Изменение |
|------|-----------|
| 2026-04-08 | Первоначальное создание на основе кодовой базы |
