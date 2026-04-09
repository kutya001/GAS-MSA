# System Architecture — МобилТрек Pro

> **Дата последнего обновления:** 2026-04-09

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
│  WebApp.js     — doGet(e), include(), routing    │
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

┌─────────────────────────────────────────────────┐
│             PhoneMarket (публичная витрина)       │
│                                                  │
│  URL: ?p=catalog → PhoneMarket.html              │
│  google.script.run.getPublicCatalog()            │
│  Tailwind CSS + vanilla JS (standalone SPA)      │
│  Классы/Типы → фильтры/навигация                │
│  Products + resolved specs + stock из Закупок    │
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
| `_ss()` | Получить SpreadsheetApp по ID (кэшируется на время выполнения) |
| `_sh(name)` | Получить лист по имени из `SH` (кэшируется на время выполнения) |
| `_rows(sheetName)` | Все строки как массив объектов |
| `_append(sheetName, obj)` | Вставка строки с авто-PK |
| `_update(sheetName, id, obj)` | Batch-обновление через setValues + авто updated_at |
| `_delete(sheetName, id)` | Удаление строки по ID |
| `_findById(sheetName, id)` | Найти одну запись |
| `_buildMap(sheet, keyCol, valCol)` | Словарь для JOIN'ов |
| `_nextId(key)` | Следующий ID из PropertiesService |
| `_withLock(fn)` | Обёртка с LockService |
| `_cGet(key)`, `_cSet(key, data, ttl)`, `_cDel(keys)` | Chunk-based кэш |
| `_ok(data)`, `_err(msg)` | Стандартные обёртки ответов |
| `_today()` | Текущая дата в TZ (yyyy-MM-dd) |
| `_now()` | Текущий timestamp (dd.MM.yyyy - HH-mm-ss) |

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

## 8. Публичная витрина PhoneMarket

Отдельная страница, доступная по `?p=catalog`, не входящая в admin-панель.

### 8.1 Маршрутизация

`doGet(e)` в WebApp.js проверяет `e.parameter.p`:
- `p=catalog` → `PhoneMarket.html` (витрина)
- без параметра → `Frontend.html` (admin-панель)

Реальный URL деплоя получается через `ScriptApp.getService().getUrl()` и передаётся в шаблоны как `webAppUrl` (в iframe `location.href` — URL песочницы googleusercontent.com, не деплоя).

### 8.1.1 Двусторонняя навигация

- **Admin → PhoneMarket**: кнопка «Каталог PhoneMarket ↗» в сайдбаре Frontend.html (`window.open(WEBAPP_URL+'?p=catalog')`)
- **PhoneMarket → Admin**: кнопка «← Панель управления» в header (desktop + mobile) PhoneMarket.html (`window.open(WEBAPP_URL)`)
- Обе страницы получают `WEBAPP_URL` через GAS template scriptlet `<?!= webAppUrl ?>` (force-print, без HTML-экранирования — `<?= ?>` ломает JS внутри `<script>`)

### 8.2 Backend API

`getPublicCatalog()` в MDM.js — денормализованный каталог:
- **classes**: `[{id, name}]` из `Ref_Классы`
- **types**: `[{id, class_id, name}]` из `Ref_ТипыПродуктов`
- **products**: `[{id, name, sku, tpl_name, class_id, type_id, class_name, type_name, specs:{}, stock}]`
  - `specs` — resolved-атрибуты: reference→имя из справочника, boolean→«Да»/«Нет»
  - `stock` — количество единиц из таблицы Закупки со status «В наличии»
- Кэш: `public_catalog` (TTL = CACHE_TX = 60 сек)

### 8.3 Frontend (PhoneMarket.html)

Standalone HTML: Tailwind CSS CDN + Google Fonts (Inter, Nunito) + vanilla JS ES6+.

**Страницы (client-side routing через `navigate(view, param1, param2)`):**
- **home** — hero-секция, категории-карточки (из classes), товары в наличии, весь ассортимент
- **catalog** — class-вкладки + type-подфильтры + сортировка (name/name-desc/stock/sku) + сетка карточек
- **product** — breadcrumbs, SVG-изображение, specs-таблица, бейдж наличия, похожие товары

**Ключевые функции:**
- `getPublicCatalog()` → загрузка при инициализации через `google.script.run`
- `renderProductCard(p)` — карточка с SVG, specs preview (3 атрибута), stock badge
- `stockBadge(stock, size)` — зелёный «В наличии (N шт)» / красный «Нет в наличии»
- `getProductSVG(product)` — hash-based SVG placeholder (phone icon для телефонов, letter icon для остальных)
- `handleSearch(query)` — поиск по name, sku, type, class, specs values
- `buildNavLinks()` — динамические ссылки в хедере из классов
- `esc(str)` — XSS-safe HTML encoding

## 9. Деплой

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
| 2026-04-09 | Оптимизация производительности: кэширование _ss/_sh, batch _update (setValues), _adjustBalance/_adjustWarehouse прямая запись, getMasterData() комбо-API; добавлено updated_at во все таблицы с created_at; формат created_at/updated_at → dd.MM.yyyy - HH-mm-ss |
| 2026-04-09 | Публичная витрина PhoneMarket: getPublicCatalog() API, doGet(?p=catalog) маршрутизация, PhoneMarket.html (Tailwind + vanilla JS), stock из Закупок, resolved specs из MDM |
| 2026-04-09 | Двусторонняя навигация Admin ↔ PhoneMarket; исправление URL: location.href → ScriptApp.getService().getUrl() + GAS template variable webAppUrl → WEBAPP_URL |
| 2026-04-09 | Багфикс: `<?= webAppUrl ?>` → `<?!= webAppUrl ?>` (force-print) — экранирование ломало JS; `PhoneMarket.html.html` добавлен в `.claspignore` |
