---
description: "Use when writing or modifying Google Apps Script code, backend functions, frontend HTML/CSS/JS, or database schema for this GAS web-app project. Covers runtime constraints, coding style, architecture patterns, and data layer conventions."
applyTo: "**/*.{js,html,json}"
---

# Google Apps Script — Project Conventions

## Runtime: GAS V8

- Движок — V8, но **без ES6-модулей** (нет `import`/`export`).
- **Все файлы `.gs`/`.js` разделяют единое глобальное пространство** — функции и переменные видны между файлами без импортов.
- Используй `var` вместо `let`/`const` — проект следует этому стилю.
- Нет `async`/`await` на серверной стороне. `google.script.run` — единственный мост к бэкенду.
- Лимиты: 6 мин на выполнение, 100 КБ на ключ CacheService, 500 КБ PropertiesService.

## Архитектура

**Никогда не пиши весь код в одном файле.** Разделяй по логическим модулям.

### Бэкенд (`.js` → `.gs`)

Каждая доменная область — отдельный файл:

| Файл | Роль |
|------|------|
| `Config.js` | Константы (`SH`, `TZ`, `CACHE_TTL`), конфигурация |
| `Helpers.js` | Инфраструктура: `_ss`, `_sh`, `_rows`, `_append`, `_update`, `_delete`, `_findById`, `_buildMap`, `_withLock`, `_ok`, `_err`, `_today`, кэш (`_cGet`/`_cSet`/`_cDel`) |
| `DBinit.js` | Схема листов (`SCHEMA`), seed-данные, `initDB()`, `rebuildMaterialized()` |
| `Refs.js` | CRUD справочников: бренды, модели, поставщики, менеджеры, валюты |
| `Wallets.js` | Кошельки, кассовые операции, `_adjustBalance` |
| `Warehouses.js` | Склады, `_adjustWarehouse` |
| `Purchases.js` | Закупки |
| `Sales.js` | Продажи |
| `Payments.js` | Оплаты |
| `Analytics.js` | Дашборд, отчёты, аналитика |
| `WebApp.js` | `doGet()`, подключение HTML-файлов через `include()` |
| `appsscript.json` | Манифест GAS |

Все `.js` файлы компилируются в `.gs` и делят **единое глобальное пространство** — импорты не нужны. При создании новой сущности — создавай новый файл.

### Фронтенд (`.html`)

**Не используй SPA.** GAS поддерживает `HtmlService.createTemplateFromFile()` — используй это для подключения частей.

| Файл | Роль |
|------|------|
| `Frontend.html` | Главный layout: sidebar, topbar, подключение остальных файлов |
| `Styles.html` | Все CSS (токены, компоненты, адаптив) внутри `<style>` |
| `Components.html` | Общие UI-компоненты: модалки, тосты, KPI-карточки |
| `PageDashboard.html` | Страница дашборда |
| `PagePurchases.html` | Страница закупок |
| `PageSales.html` | Страница продаж |
| `PageWallets.html` | Страница кошельков |
| `PageWarehouses.html` | Страница складов |
| `PageCashOps.html` | Страница кассовых операций |
| `PageRefs.html` | Страница справочников |
| `PageAnalytics.html` | Страница аналитики/отчётов |
| `ScriptHelpers.html` | Общий JS: `api()`, `g()`, `q()`, `fillSel()`, `renderTbl()`, `_setHTML()`, `openM()`/`closeM()`, toast, состояние `ST` |

Подключение через хелпер `include()`:
```js
// WebApp.js
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```
```html
<!-- Frontend.html -->
<?!= include('Styles') ?>
<?!= include('Components') ?>
<?!= include('PageDashboard') ?>
<?!= include('ScriptHelpers') ?>
```

Каждый `Page*.html` содержит HTML разметку страницы и `<script>` с логикой именно этой страницы (загрузка данных, рендеринг, обработчики форм). Общий JS — в `ScriptHelpers.html`.

## Стиль кода

### Именование

- **Публичные серверные функции** (вызываемые из фронтенда): `verbNoun` — `getPurchases`, `addWallet`, `updateRef`, `deleteArticle`.
- **Приватные хелперы** (только внутри бэкенда): `_camelCase` — `_append`, `_findRow`, `_adjustBalance`, `_withLock`.
- **Фронтенд-функции**: camelCase — `loadPurchases`, `savePurchase`, `openSaleModal`.
- **Аббревиатуры в рендерерах допустимы**: `renderP`, `rPRow`.
- **Обработчики событий**: `on`-префикс — `onNav`, `onCoType`.
- **Константы/конфиг**: `UPPER_CASE` — `SH`, `TZ`, `CACHE_TTL`, `SCHEMA`.
- **DOM-хелперы**: короткие имена — `g(id)`, `q(sel)`, `fillSel()`.

### Комментарии

- Пиши комментарии **на русском языке**.
- Используй визуальные разделители для секций:
```js
// ══════════════════════════════════════════════════════════════════════
//  НАЗВАНИЕ СЕКЦИИ
// ══════════════════════════════════════════════════════════════════════
```
- Для подсекций:
```js
// ──────────────────────────────────────────────────────────────────────
//  Название подсекции
// ──────────────────────────────────────────────────────────────────────
```

## Бэкенд: паттерны

### CRUD-операции

Каждая сущность реализует стандартный набор:
- `getXxx(p)` — чтение (с фильтрами, пагинацией)
- `addXxx(p)` — создание
- `updateXxx(p)` — обновление
- `deleteXxx(p)` — удаление

Все параметры приходят одним объектом `p`.

### Ответы

Всегда возвращай через обёртки:
```js
return _ok(data);    // { status: 'ok', data: ... }
return _err(msg);    // { status: 'error', message: ... }
```

### Write-операции — обязательный LockService

Оборачивай **все** функции, изменяющие данные, в `_withLock`:
```js
function addXxx(p) {
  return _withLock(function() {
    try {
      // ...
      return _ok({ id: newId });
    } catch(e) { return _err(e.message); }
  });
}
```

### Доступ к данным

- `_ss()` / `_sh(name)` — спредшит и лист по имени из `SH`.
- `_rows(sheetName)` — все строки как массив объектов.
- `_append(sheetName, obj)` — O(1) вставка с авто-PK через PropertiesService.
- `_update(sheetName, id, obj)` — O(1) точечное обновление через TextFinder.
- `_delete(sheetName, id)` — O(1) удаление строки.
- `_findById(sheetName, id)` — получить одну запись.
- `_buildMap(sheet, keyCol, valCol)` — словарь для JOIN.

### Кэширование

- Справочники: `_cGet`/`_cSet` с TTL = `CACHE_TTL` (300 сек).
- Транзакционные данные: TTL = `CACHE_TX` (60 сек).
- После мутации **обязательно** инвалидируй: `_cDel(['ключ'])`.
- Chunk-based: один JSON разбивается на куски по `CHUNK` байт.

### Materialized-паттерн

Кошельки хранят `current_balance`, `total_in`, `total_out`.
Склады хранят `current_items`, `current_cost_kgs`.
При каждой операции обновляй их атомарно через `_adjustBalance` / `_adjustWarehouse`.
Не считай баланс на лету — читай из materialized-колонок.

## Фронтенд: паттерны

### Многофайловая структура

- **Не используй SPA-подход** (один HTML с hash-роутером и скрытыми `.page` div-ами).
- Каждая страница — отдельный `Page*.html` со своей разметкой и `<script>`.
- Общий layout (`Frontend.html`) подключает все части через `<?!= include('...') ?>`.
- Навигация: через sidebar-ссылки, переключение видимости секций `onNav(page)`, либо серверный рендеринг через `doGet(e)` с параметром `?p=page`.

### Состояние

- Единый объект `ST` хранит: текущую страницу, данные таблиц, ID редактируемых записей, справочники, графики.
- Таблицы: `ST.T[key]` → `{ data, filtered, col, dir, pg }`.

### Вызов бэкенда

```js
var result = await api('backendFunction', params);
```
Обёртка `api()` использует `google.script.run` с Promise, показывает лоадер, обрабатывает ошибки.

### Рендеринг таблиц

- `renderTbl(tKey, bodyId, rowFn, infId, pgnId)` — универсальный рендерер.
- `_setHTML()` использует DocumentFragment для минимизации reflow.
- Сортировка и фильтрация — клиентские.

### Модальные окна

- `openM(id)` / `closeM(id)` — открытие/закрытие (toggle класс `.open`).
- Форма: `g(id)` читает значение, валидация перед `api()`, после успеха — toast + закрытие + перезагрузка данных.

### CSS

- Все стили вынесены в `Styles.html` (внутри `<style>`).
- CSS-переменные в `:root` / `[data-theme=dark]` — токены дизайна.
- Сокращённые имена классов: `.sb` (sidebar), `.kpi`, `.fbar`, `.tw` (table wrapper), `.btn-p` (primary), `.fi` (filter input).
- Отзывчивый layout через `@media`.

## Схема данных

Имена листов определены в объекте `SH` (`Config.js`). Структура колонок — в `SCHEMA` (`DBinit.js`).
При добавлении нового листа:
1. Добавь ключ в `SH` (`Config.js`).
2. Добавь схему в `SCHEMA` (`DBinit.js`).
3. Добавь seed-данные в `_seedData` (если нужно).
4. Создай CRUD-функции **в отдельном `.js` файле** по стандартному шаблону.
5. Создай `Page*.html` для UI этой сущности.

## Деплой

Проект управляется через `clasp`. Файлы `.js` компилируются в `.gs` при пуше.
