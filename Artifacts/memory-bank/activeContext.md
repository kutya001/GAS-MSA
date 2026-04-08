# Active Context — Текущая работа

> **Дата последнего обновления:** 2026-04-08

## Текущий фокус

- Закупки и Продажи: развитые платёжные блоки с валидацией, рассрочкой, IMEI-уникальностью, inline-оплатами, редактирование продаж.

## Недавние изменения

| Дата | Что сделано |
|------|------------|
| 2026-04-08 | **FormEngine.html**: async validate — `_save()` умеет ждать Promise из `validate()` |
| 2026-04-08 | **Purchases.js**: `checkImeiUnique(p)` — серверная проверка уникальности IMEI; IMEI-проверка в `addPurchase`/`updatePurchase`; моментальная оплата при создании (`pay_wallet_id`/`pay_amount` → PurchasePayment + CashOp + adjustBalance) |
| 2026-04-08 | **Sales.js**: `updateSale(p)` — редактирование продажи (buyer, wa, sale_date, manager_id, total_kgs, note); `getSalePayments(p)` — оплаты конкретной продажи |
| 2026-04-08 | **PagePurchases.html**: Block 3 — рассрочка (`supplier_installment` checkbox, create-only), inline `pay_wallet_id`/`pay_amount` (create-only), `_pCalcKgs` автозаполняет pay_amount; `_renderPurchasePayments(id, purchaseId, costKgs)` — fully-paid badge, remaining amount, disabled when paid; `_addPurchasePayment` — validation sum ≤ cost; async IMEI validate в `validate()`; onSave передаёт pay-параметры; afterMount передаёт `rec.cost_kgs` |
| 2026-04-08 | **PageSales.html**: удалён `canEdit: false` + `viewActions` → кнопка «Редактировать» доступна; `_renderSalePayments(containerId, sale)` — inline таблица оплат (initial + Оплаты), fully-paid, inline add-payment; `_addSalePayment(saleId)` — добавление через addPayment API; Block 3 поля (is_installment, wallet_id, paid_kgs, _debt) → create-only; `sale_payments` container; imei_search renderEdit — read-only товар в edit; validate — skip purchase_id в edit; onSave — edit path через updateSale; afterMount — edit mode с disabled has_imei, autoFillSelects, payments table |

## Текущие задачи

- [x] FormEngine: async validate (Promise support)
- [x] Purchases: checkImeiUnique + серверная IMEI-проверка в add/update
- [x] Purchases: моментальная оплата при создании закупки
- [x] Purchases: Block 3 — рассрочка checkbox + inline payment fields (create-only)
- [x] Purchases: _renderPurchasePayments — fully-paid, remaining, cost validation
- [x] Purchases: async IMEI validate на фронте
- [x] Sales: updateSale + getSalePayments бэкенд
- [x] Sales: убран canEdit: false → редактирование доступно
- [x] Sales: _renderSalePayments — inline таблица оплат + inline add
- [x] Sales: Block 3 create-only payment fields
- [x] Sales: edit mode — read-only товар, autoFillSelects, payments table
- [x] Sales: onSave edit path → updateSale
- [x] Обновление артефактов

## Известные проблемы

- MDM-формулы (тип `calculated`): определён в схеме, но движок вычислений не реализован.

## Следующие шаги

- Определяется пользователем.
