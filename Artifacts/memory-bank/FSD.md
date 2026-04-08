# Functional Specification Document (FSD) — МобилТрек Pro

> **Дата последнего обновления:** 2026-04-08  
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

### API
- `getPurchases(p)`, `addPurchase(p)`, `updatePurchase(p)`, `deletePurchase(p)`, `getStock(p)`
- `getPurchasePayments(p)`, `addPurchasePayment(p)`

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
Чекбокс `is_installment` в блоке «💰 Оплата»: при включении поля `wallet_id` и `paid_kgs` скрываются (не обязательны), `debt_kgs = total_kgs`. Оплата производится позже через модуль Оплаты (Payments).

Каскадные операции при создании продажи:
1. Обновление статуса закупки → «Продано»
2. Обновление materialized-колонок склада
3. Создание кассовой операции (Приход)
4. Обновление баланса кошелька

### API
- `getSales(p)`, `addSale(p)`, `updateSale(p)`, `deleteSale(p)`

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

## Changelog

| Дата | Изменение |
|------|-----------|
| 2026-04-08 | Первоначальное создание FSD на основе существующей кодовой базы |
| 2026-04-08 | Удаление Ref_Назначения: 8→7 справочников, purpose_id удалён из Закупок и MDM_Шаблонов |
| 2026-04-08 | Закупки: каскад template_id(Назначение)→product_id(Номенклатура); Продажи: двойной режим IMEI/ручной; Настройки: base_currency → CUR |
| 2026-04-08 | Закупки: `_pAutoFillAttrs` — авто-заполнение характеристик из MDM; Продажи: рассрочка `is_installment` |
