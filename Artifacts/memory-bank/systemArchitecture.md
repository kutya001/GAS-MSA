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
| Продажи | `debt_kgs` | Обновление при `addPayment()`, `updateSale()` |

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

### 6.1 Глобальные переменные

- **`CUR`** — код базовой валюты (по умолчанию `'KGS'`). Загружается из настроек при `loadMasterData()` → `api('getSettings')`. Используется во всех страницах вместо захардкоженного символа валюты.

### 6.2 Сворачиваемый сайдбар

- CSS-класс `.sb.collapsed` (ширина 56 px, скрыты `.sb-txt` и `.sb-sec`, иконки центрированы).
- `toggleSidebar()` — переключает класс `collapsed` и CSS-переменную `--sbw`; сохраняет состояние в `localStorage`.
- `applySidebarState()` — восстанавливает состояние при загрузке, вызывается из `init()`.
- Кнопка-шеврон в `.sb-foot` (Frontend.html).

### 6.3 Каскады форм

Шаблон каскадного заполнения select'ов через `FormEngine.fillField()`:
- **Закупки**: Класс → Тип → Назначение (`template_id`) → Номенклатура (`product_id`). Хелперы: `_pUpdateTemplates()`, `_pUpdateProducts()`, `_pAutoFillAttrs()`, `_findTemplateById()`. При выборе продукта характеристики авто-заполняются из MDM. Block 3: supplier_installment (рассрочка) + inline pay_wallet_id/pay_amount (только create); view/edit — `_renderPurchasePayments(id, pid, costKgs)` с fully-paid badge и inline add-form.
- **Продажи**: Двойной режим через `has_imei`:
  - IMEI-режим: `_sAutoFillSelects(pur)` заполняет и блокирует Class/Type/Template.
  - Ручной: каскад Class → Type → Template; `_sUpdateBlock2Manual(tpl)` рендерит характеристики.
  - Редактирование: товар read-only, редактируются документные поля + цена.
  - Block 3: create — is_installment/wallet_id/paid_kgs/_debt; view/edit — `_renderSalePayments(containerId, sale)` с inline таблицей оплат, fully-paid, inline add-payment.

### 6.4 FormEngine — движок форм

Класс `MainForm` (`FormEngine.html`), реестр `MF_INST[id]`.

**Жизненный цикл формы:**
1. `openView/openEdit/openCreate` → `_ensureBuilt()` → `_render()` → `openM(id)`
2. В edit/create: `afterMount()` → `setTimeout(() => _initSnap = _gatherValues())` (снимок после хуков)
3. Закрытие: `tryClose()` → dirty-check → `close()` или `_showUnsavedDialog()`
4. Сохранение: `_save()` → валидация → `close()` → `await onSave()` (фоново)

**Ключевые механизмы:**
- **Бейдж режима**: `.mf-badge` + `.mf-badge-create/edit/view` в `.mh`
- **Drag-safe overlay**: `mousedown` + `mouseup` оба на `.ov` (не `click`)
- **Unsaved changes**: `_initSnap` → `_hasChanges()` → `_highlightChanged()` (`.mf-changed`) → `_showUnsavedDialog()` (`.mf-unsaved-ov`)
- **Background sync**: `_save()` вызывает `close()` ДО `onSave()`; `_delete()` аналогично
- **showIf-aware required**: `_save()` пропускает required для полей с `showIf=false`
- **Async validate**: `_save()` поддерживает Promise из `validate()`: `if (err && typeof err.then === 'function') err = await err;` — для асинхронных проверок (IMEI uniqueness)
- **Стандартные кнопки**: View → Удалить|spacer|Закрыть|Редактировать; Edit/Create → Отмена|Сохранить

### 6.5 IMEI-уникальность

- **Сервер**: `checkImeiUnique({imei, exclude_id})` — проверка по таблице Закупки (не Удалено). Дополнительно проверка в `addPurchase`/`updatePurchase`.
- **Фронт**: validate() возвращает Promise от `api('checkImeiUnique')` — FormEngine автоматически `await`'s it.

### 6.6 Inline-оплаты

В view/edit режиме Закупок и Продаж отображается таблица оплат с возможностью добавлять новые:
- **Закупки**: `_renderPurchasePayments(containerId, purchaseId, costKgs)` + `_addPurchasePayment(purchaseId, costKgs)`. Валидация: сумма оплат ≤ себестоимости. Fully-paid → форма добавления скрыта.
- **Продажи**: `_renderSalePayments(containerId, sale)` + `_addSalePayment(saleId)`. Показывает начальную оплату (при продаже) + последующие из таблицы Оплаты. Fully-paid badge. Валидация через `addPayment` API (серверная: amt ≤ curDebt).

**Toast-уведомления**: верхний правый угол (`top:16px;right:14px`), 4 типа: s/e/i/w.

**Escape/overlay**: ScriptHelpers Escape-handler роутит через `MF_INST[id].tryClose()`; глобальный click-overlay удалён.

## 7. Деплой

```
clasp push    — файлы .js → .gs
clasp deploy  — публикация Web App
```

## Changelog

| Дата | Изменение |
|------|-----------|
| 2026-04-08 | Первоначальное создание на основе кодовой базы |
| 2026-04-08 | Добавлены: CUR-переменная, сворачиваемый сайдбар, каскады форм Закупок/Продаж |
| 2026-04-08 | Закупки: _pAutoFillAttrs; Продажи: рассрочка is_installment; FormEngine: showIf-aware валидация |
| 2026-04-08 | FormEngine rewrite: бейдж режима, drag-safe overlay, unsaved changes, background sync, toast top-right, стандартные кнопки |
| 2026-04-08 | Async validate, IMEI uniqueness (сервер+фронт), inline оплаты закупок/продаж, редактирование продаж, моментальная оплата поставщику при создании |
