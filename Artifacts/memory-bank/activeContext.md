# Active Context — Текущая работа

> **Дата последнего обновления:** 2026-04-09

## Текущий фокус

- Публичный каталог PhoneMarket: витрина товарного ассортимента из MDM с наличием со склада.

## Недавние изменения

| Дата | Что сделано |
|------|------------|
| 2026-04-09 | **PhoneMarket.html** (НОВЫЙ): публичная витрина-каталог товаров. Загрузка данных через `google.script.run.getPublicCatalog()`. Главная (hero + категории + товары в наличии), каталог (класс-вкладки + тип-фильтры + сортировка + сетка карточек), карточка товара (SVG-placeholder, specs-таблица, наличие, похожие). Поиск по name/sku/type/specs. Бейджи «В наличии (N шт)» / «Нет в наличии» |
| 2026-04-09 | **MDM.js**: добавлен `getPublicCatalog()` — денормализованный каталог для витрины: классы, типы, товары с resolved-атрибутами (reference→имя, boolean→Да/Нет) + остаток из Закупок (status=«В наличии»); кэш `public_catalog` (CACHE_TX) |
| 2026-04-09 | **WebApp.js**: `doGet(e)` принимает query parameter `?p=catalog` → рендерит PhoneMarket.html; без параметра — Frontend.html (admin panel) как раньше |
| 2026-04-09 | **Двусторонняя навигация**: Frontend.html — кнопка «Каталог PhoneMarket ↗» в сайдбаре; PhoneMarket.html — кнопка «← Панель управления» в header/mobile menu |
| 2026-04-09 | **Исправление навигации**: `location.href` внутри GAS iframe — URL песочницы (googleusercontent.com), не деплоя. Заменён на `ScriptApp.getService().getUrl()` через GAS template variable `webAppUrl` → глобальная `WEBAPP_URL` на фронтенде. Исправлены: WebApp.js (doGet передаёт webAppUrl в шаблоны), Frontend.html (WEBAPP_URL для кнопки каталога), PhoneMarket.html (WEBAPP_URL для кнопки «Панель управления» и buildNavLinks) |
| 2026-04-09 | **Багфикс**: `<?= webAppUrl ?>` → `<?!= webAppUrl ?>` — GAS printing scriptlet `<?= ?>` экранирует HTML-сущности внутри `<script>`, ломая JS парсинг. Force-print `<?!= ?>` не экранирует (URL из ScriptApp — доверенный). Добавлен `PhoneMarket.html.html` в `.claspignore` для исключения из деплоя |
| 2026-04-09 | **PageMDM.html**: полный редизайн интерфейса — двухколоночный layout; контекстное добавление |
| 2026-04-09 | Оптимизация производительности: кэш _ss/_sh, batch _update, getMasterData(), _now(), updated_at в 8 таблиц |

## Текущие задачи

- [x] Редизайн PageMDM.html: двухколоночный layout
- [x] PhoneMarket: бэкенд API `getPublicCatalog()`
- [x] PhoneMarket: маршрутизация `doGet(?p=catalog)`
- [x] PhoneMarket: фронтенд витрина (home, catalog, product, search)
- [x] PhoneMarket: наличие товара из Закупок (stock badge)
- [x] Двусторонняя навигация Admin ↔ PhoneMarket
- [x] Исправление URL навигации (location.href → ScriptApp.getService().getUrl())
- [x] Багфикс: `<?= ?>` → `<?!= ?>` для webAppUrl; PhoneMarket.html.html исключён из деплоя

## Известные проблемы

- MDM-формулы (тип `calculated`): определён в схеме, но движок вычислений не реализован.
- После `clasp push` нужно обновить деплой (`clasp deploy`) — URL `/exec` показывает последнюю задеплоенную версию, а не HEAD.

## Следующие шаги

- Определяется пользователем.
