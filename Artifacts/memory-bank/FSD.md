# Functional Specification Document (FSD) — МобилТрек Pro

> **Дата последнего обновления:** 2026-04-09  
> **Статус:** Актуальный

## 1. Обзор системы

**МобилТрек Pro** — веб-приложение на Google Apps Script для управления продажами, закупками и складским учётом мобильных устройств.

### Ключевые модули

| Модуль | Файл бэкенда | Страница UI | Статус |
|--------|--------------|-------------|--------|
| Справочники | `Refs.js` | `PageRefs.html` | ✅ Реализован |
| Кошельки | `Wallets.js` | `PageWallets.html` | ✅ Реализован |
| Склады | `Warehouses.js` | `PageWarehouses.html` | ✅ Реализован |
| Закупки | `Purchases.js` | `PagePurchases.html` | ✅ Реализован |
| Продажи | `Sales.js` | `PageSales.html` | ✅ Реализован |
| Оплаты | `Payments.js` | `PagePayments.html` | ✅ Реализован |
| Аналитика | `Analytics.js` | `PageAnalytics.html` | ✅ Реализован |
| Дашборд | `Analytics.js` | `PageDashboard.html` | ✅ Реализован |
| MDM | `MDM.js` | `PageMDM.html` | ✅ Реализован |
| Долги | — | `PageDebts.html` | ✅ Реализован |
| Настройки | `WebApp.js` | `PageSettings.html` | ✅ Реализован |
| PhoneMarket | `MDM.js` | `PhoneMarket.html` | ✅ Реализован |

---

## 2. Справочники (Refs)

7 типов справочников:
- **Бренды** (`Ref_Бренды`): id, name, info
- **Модели** (`Ref_Модели`): id, name, brand_id → Бренды, info
- **Поставщики** (`Ref_Поставщики`): id, name, info
- **Менеджеры** (`Ref_Менеджеры`): id, name, info
- **Валюты** (`Ref_Валюты`): id, name, info
- **Классы** (`Ref_Классы`): id, name, info — 1-й уровень иерархии
- **Типы продуктов** (`Ref_ТипыПродуктов`): id, class_id, name, info — 2-й уровень

Дополнительно: **Категории** и **Статьи** для кассовых операций.

### API
- `getRefData(p)`, `addRef(p)`, `updateRef(p)`, `deleteRef(p)`
- `getCats()`, `addCat(p)`, `updateCat(p)`, `deleteCat(p)`
- `getArticles(p)`, `addArticle(p)`, `updateArticle(p)`

---

## 3. Кошельки и Кассовые операции

### Кошельки (`Кошельки`)
- id, name, currency_id, icon, start_balance
- **Materialized**: `current_balance`, `total_in`, `total_out`
- note, created_at

### Кассовые операции (`КассовыеОперации`)
- id, op_date, op_type (Приход/Расход), wallet_id, cat_id, article_id, amount, counterpart, comment, created_at

### API
- `getWallets()`, `addWallet(p)`, `updateWallet(p)`, `getWalletHistory(p)`
- `addCashOp(p)`, `getCashOps(p)`

---

## 4. Склады

### Склады (`Склады`)
- id, name, address, responsible, note
- **Materialized**: `current_items`, `current_cost_kgs`
- created_at

### API
- `getWarehouses()`, `addWarehouse(p)`, `updateWarehouse(p)`

---

## 5. Закупки

### Закупки (`Закупки`)
- id, purchase_date, wh_id, supplier_id
- cost_usd, rate, cost_kgs (вычисляемое)
- has_imei, imei, qty, condition
- class_id, type_id, **template_id** → MDM_Шаблоны, **product_id** → MDM_Номенклатура
- status (В наличии / Продано / Удалено)
- note, created_at

### Каскад формы
Класс → Тип → **Назначение** (template_id, select) → **Номенклатура** (product_id, select).
- `_pUpdateTemplates(form)` — фильтрует шаблоны по class_id + type_id, заполняет select template_id.
- `_pUpdateProducts(form)` — фильтрует номенклатуру по template_id, заполняет select product_id.
- `_pAutoFillAttrs(form)` — при выборе продукта подтягивает его `attribute_values` в блок характеристик.
- `_findTemplateById(tplId)` — поиск шаблона по ID (заменил `_findPurchaseTemplate`).

### Оплаты по закупкам (`ОплатыЗакупок`)
- id, purchase_id, wallet_id, amount, pay_date, note, created_at

### Моментальная оплата при создании
При создании закупки, если не отмечена рассрочка (`supplier_installment`), можно сразу оплатить поставщику: передаются `pay_wallet_id` и `pay_amount` → `addPurchase` создаёт запись в ОплатыЗакупок + КассовуюОперацию (Расход) + корректирует баланс кошелька.

### IMEI-уникальность
- `checkImeiUnique({imei, exclude_id})` — серверная проверка по всей таблице Закупки (status ≠ Удалено).
- `addPurchase` и `updatePurchase` проверяют IMEI на дубликаты серверной стороне.
- Фронтенд `validate()` вызывает `checkImeiUnique` асинхронно (Promise) перед сохранением.

### Форма закупки — Block 3 (Оплаты поставщику)
- **Режим создания**: чекбокс `supplier_installment` («📅 Рассрочка»); если не отмечен — поля `pay_wallet_id` и `pay_amount` (автозаполнение из cost_kgs).
- **Режим view/edit**: таблица оплат через `_renderPurchasePayments(id, purchaseId, costKgs)` — fully-paid badge (✅), остаток, inline-форма добавления оплаты; `_addPurchasePayment` — валидация суммы ≤ себестоимости.

### API
- `getPurchases(p)`, `addPurchase(p)`, `updatePurchase(p)`, `deletePurchase(p)`, `getStock(p)`
- `getPurchasePayments(p)`, `addPurchasePayment(p)`
- `checkImeiUnique(p)`

---

## 6. Продажи

### Продажи (`Продажи`)
- id, purchase_id, buyer, wa, sale_date, manager_id, wallet_id
- has_imei, **is_installment**, class_id, type_id, template_id
- total_kgs, paid_kgs, **debt_kgs** (materialized)
- note, created_at

### Двойной режим формы
Полем `has_imei` (чекбокс) выбирается режим:
1. **IMEI-режим** (has_imei = true): IMEI-поиск → привязка purchase_id → авто-заполнение и блокировка Class/Type/Template (`_sAutoFillSelects(pur)`).
2. **Ручной режим** (has_imei = false): каскад Class→Type→Template; пользователь выбирает шаблон вручную, рендерятся редактируемые характеристики (`_sUpdateBlock2Manual(tpl)`).

### Рассрочка
Чекбокс `is_installment` в блоке «💰 Оплата» (create-only): при включении поля `wallet_id` и `paid_kgs` скрываются (не обязательны), `debt_kgs = total_kgs`. Оплата производится позже через inline-форму или модуль Оплаты.

### Редактирование продажи
Кнопка «✏️ Редактировать» доступна в view-режиме. В edit-режиме:
- Товар (purchase_id, IMEI) — read-only, нельзя изменить.
- Редактируются: buyer, wa, sale_date, manager_id, total_kgs, note.
- `updateSale(p)` пересчитывает `debt_kgs = max(0, newTotal - curPaid)`.

### Block 3 — Оплата (view/edit)
В view/edit режиме показывается `_renderSalePayments(containerId, sale)`: таблица всех оплат (начальная оплата при продаже + записи из Оплаты), fully-paid badge (✅), остаток долга, inline-форма добавления оплаты (`_addSalePayment` → `addPayment` API).

В create-режиме: is_installment, wallet_id, paid_kgs, _debt — стандартные edit-поля.

Каскадные операции при создании продажи:
1. Обновление статуса закупки → «Продано»
2. Обновление materialized-колонок склада
3. Создание кассовой операции (Приход)
4. Обновление баланса кошелька

### API
- `getSales(p)`, `addSale(p)`, `updateSale(p)`
- `getSalePayments(p)`

---

## 7. Оплаты (Рассрочки)

### Оплаты (`Оплаты`)
- id, sale_id, wallet_id, amount, pay_date, debt_after, note, created_at

### API
- `getPayments(p)`, `addPayment(p)`

---

## 8. Аналитика / Дашборд

KPI-метрики:
- Выручка за сегодня / месяц
- Прибыль
- Общий долг
- Залежавшиеся товары (>30 дней)
- Тренды выручки/прибыли (6 мес.)
- Топ брендов по выручке

### API
- `getDashboard()`

---

## 9. MDM (Master Data Management)

EAV-модель для гибких атрибутов номенклатуры.

### Сущности
- **MDM_Справочники**: id, name, items (JSON-массив строк)
- **MDM_Шаблоны**: id, class_id, type_id, name, description
- **MDM_Атрибуты**: id, template_id, name, type, description, is_required, display_style, options, ref_table, formula, sort_order
- **MDM_Номенклатура**: id, template_id, sku, name, attribute_values (JSON), created_at

### Типы атрибутов (12)
string, integer, float, boolean, date, time, datetime, color_rgb, enum_radio, enum_checkbox, reference, calculated

### API
- `getMdmDictionaries()`, `addMdmDictionary(p)`, `updateMdmDictionary(p)`, `deleteMdmDictionary(p)`
- `getMdmTemplates()`, `saveMdmTemplate(p)`, `deleteMdmTemplate(p)`
- `getMdmProducts(p)`, `saveMdmProduct(p)`, `deleteMdmProduct(p)`
- `getPublicCatalog()` — денормализованный каталог для публичной витрины

> Подробная спецификация MDM: [Artifacts/Documents/FSD MDM Интеграция.md](../Documents/FSD%20MDM%20Интеграция.md)

---

## 10. Настройки

- Название компании
- **Базовая валюта** (`base_currency`) — код валюты (USD, KGS, RUB и т.д.), используется фронтендом как глобальная переменная `CUR` для отображения сумм
- Сохранение через PropertiesService

При `loadMasterData()` фронтенд вызывает `api('getSettings')` и устанавливает `CUR = settings.base_currency`.

### API
- `getSettings()`, `saveSettings(p)`

---

## 11. FormEngine (движок форм)

Класс `MainForm` в `FormEngine.html` — универсальный движок модальных форм. Реестр экземпляров: `MF_INST[id]`.

### Режимы
- `view` — просмотр (island-блоки с парами label/value)
- `edit` — редактирование существующей записи
- `create` — создание новой записи

### Бейдж режима
Цветной бейдж в заголовке `.mh`: `Создание` (зелёный), `Редактирование` (оранжевый), `Просмотр` (синий). CSS-классы: `.mf-badge-create`, `.mf-badge-edit`, `.mf-badge-view`.

### Стандартные кнопки подвала
- **View**: 🗑 Удалить (btn-rd, если canDelete) | flex-spacer | доп.действия | Закрыть (btn-g) | ✏️ Редактировать (btn-p)
- **Edit / Create**: Отмена (btn-g) | 💾 Сохранить (btn-p)

### Фоновая синхронизация
`_save()` закрывает форму **сразу** после валидации, затем вызывает `onSave(values, editId)` в фоне. Ошибки API показываются через toast. `_delete()` аналогично.

### Drag-safe overlay
Overlay-клик проверяет `mousedown` + `mouseup`: оба должны быть на элементе `.ov`. Это предотвращает случайное закрытие при drag изнутри формы наружу.

### Отслеживание несохранённых изменений
- При открытии в edit/create снимается `_initSnap` (снимок значений полей через `_gatherValues()`).
- `tryClose()` — публичный метод: в view-режиме закрывает сразу; в edit/create проверяет `_hasChanges()`.
- Если есть изменения — изменённые поля подсвечиваются (`.mf-changed`, оранжевая рамка с пульсацией), показывается диалог `.mf-unsaved-ov` с кнопками **«Отменить изменения»** и **«Сохранить изменения»**.
- Кнопка ✕ и Escape тоже роутятся через `tryClose()`.

### Валидация
1. Required-поля: пропускаются если `showIf` возвращает `false` (скрытые поля).
2. Кастомная: `cfg.validate(values, form)` → строка ошибки, `null`, или **Promise** (async validate — например, IMEI uniqueness).
3. `_save()` поддерживает `await` для Promise из validate: `if (err && typeof err.then === 'function') err = await err;`
4. Валидация выполняется ДО закрытия формы; `onSave` вызывается только если валидация пройдена.

### Toast-уведомления
Позиция: **верхний правый угол** (`top:16px; right:14px`). Типы: `s` (успех), `e` (ошибка), `i` (инфо), `w` (предупреждение).

---

## 12. PhoneMarket (публичный каталог)

Публичная витрина-каталог всего товарного ассортимента из MDM с актуальным наличием.

### Доступ
URL: `WEBAPP_URL?p=catalog`. Маршрутизация в `doGet(e)` WebApp.js.

Навигация двусторонняя:
- Admin → PhoneMarket: кнопка «Каталог PhoneMarket ↗» в сайдбаре
- PhoneMarket → Admin: кнопка «← Панель управления» в header

URL деплоя передаётся через `ScriptApp.getService().getUrl()` → GAS template `<?!= webAppUrl ?>` (force-print) → `WEBAPP_URL`. Важно: использовать `<?!= ?>`, а не `<?= ?>` — последний экранирует спецсимволы внутри `<script>`, ломая JS-парсер.

### Бэкенд API
`getPublicCatalog()` (MDM.js) — денормализованные данные:
- **classes**: `[{id, name}]`
- **types**: `[{id, class_id, name}]`
- **products**: `[{id, name, sku, tpl_name, class_id, type_id, class_name, type_name, specs:{attr_name: value}, stock}]`
  - `specs` — resolved: reference→имя, boolean→«Да»/«Нет»
  - `stock` — кол-во из Закупок со status=«В наличии»

### Фронтенд (страницы)
- **home**: hero-секция + категории (classes) + товары в наличии + весь ассортимент
- **catalog**: class-вкладки + type-подфильтры + сортировка (name/stock/sku) + сетка карточек
- **product**: breadcrumbs + SVG + specs-таблица + бейдж наличия + похожие товары

### Наличие
Бейджи на каждой карточке и странице товара:
- Зелёный: «В наличии (N шт)»
- Красный: «Нет в наличии»

### Поиск
По полям: name, sku, tpl_name, type_name, class_name, значения specs. Ограничение: 10 результатов.

### Технологии
- Tailwind CSS v3 (CDN)
- Google Fonts: Inter + Nunito
- Vanilla JS ES6+
- SVG-placeholder генерация по хэшу имени товара
- XSS-защита через `esc()` helper

---

## Changelog

| Дата | Изменение |
|------|-----------|
| 2026-04-08 | Первоначальное создание FSD на основе существующей кодовой базы |
| 2026-04-08 | Удаление Ref_Назначения: 8→7 справочников, purpose_id удалён из Закупок и MDM_Шаблонов |
| 2026-04-08 | Закупки: каскад template_id(Назначение)→product_id(Номенклатура); Продажи: двойной режим IMEI/ручной; Настройки: base_currency → CUR |
| 2026-04-08 | Закупки: `_pAutoFillAttrs` — авто-заполнение характеристик из MDM; Продажи: рассрочка `is_installment` |
| 2026-04-08 | FormEngine rewrite: бейдж режима, drag-safe overlay, unsaved changes tracking, background sync, стандартные кнопки, toast top-right |
| 2026-04-08 | FormEngine async validate (Promise support); Purchases: checkImeiUnique, моментальная оплата, IMEI server-side validate, Block 3 рассрочка/inline payment; Sales: updateSale, getSalePayments, редактирование, inline таблица оплат, edit mode |
