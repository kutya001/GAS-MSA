// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · POS.gs
//  Модуль POS-терминала: быстрые продажи и возвраты
// ══════════════════════════════════════════════════════════════════════

/**
 * Получает каталог товаров для POS
 * Сетку товаров в наличии сгруппированную по продуктам MDM
 */
function getPOSCatalog() {
  try {
    const stock = getStock().data;
    if (!stock) return _ok([]);
    
    // Группируем по product_name или product_id
    // getStock возвращает плоский список items в группах
    const catalog = [];
    const itemMap = {};
    
    stock.groups.forEach(g => {
      g.items.forEach(item => {
        // Мы хотим сгруппировать одинаковые товары без IMEI
        // Товары с IMEI должны показываться как "выбор из списка"
        const key = item.product_name + '||' + item.wh_id;
        if (!itemMap[key]) {
          itemMap[key] = {
            product_name: item.product_name,
            wh_id: item.wh_id,
            wh_name: item.wh_name,
            class_name: item.class_name,
            price: item.cost_kgs * 1.2, // Заглушка цены (в реальности берем из прайса)
            has_imei: item.has_imei,
            total_qty: 0,
            variants: []
          };
          catalog.push(itemMap[key]);
        }
        
        itemMap[key].total_qty += item.qty;
        if (item.has_imei) {
          itemMap[key].variants.push({
            purchase_id: item.id,
            imei: item.imei,
            cost: item.cost_kgs
          });
        } else {
          // Для товаров без IMEI записываем purchase_id первого попавшегося (или список для списания)
          itemMap[key].purchase_id = item.id;
          itemMap[key].cost = item.cost_kgs;
        }
      });
    });
    
    return _ok(catalog);
  } catch (e) {
    return _err(e.message);
  }
}

/**
 * Основной метод продажи через POS
 * p.cart: [{purchase_id, qty, price, name, has_imei}]
 * p.wallet_id
 * p.shift_id
 * p.buyer
 * p.manager_id
 */
function processPosSale(p) {
  return _withLock(function() {
    try {
      const cart = p.cart || [];
      if (!cart.length) return _err('Корзина пуста');
      if (!p.wallet_id) return _err('Не указан кошелёк оплаты');
      if (!p.shift_id) return _err('Смена не открыта');
      
      const receiptId = 'POS-' + _nextId('SEQ_POS');
      const saleDate = _today();
      let totalAmount = 0;
      
      const isInstallment = p.is_installment === true;
      const initialPayment = isInstallment ? (parseFloat(p.initial_payment) || 0) : 0;
      
      // 1. Обработка каждого товара в корзине
      cart.forEach(item => {
        const pur = _findById(SH.PURCHASES, item.purchase_id);
        if (!pur) throw new Error('Товар не найден: ' + item.name);
        
        // ВАЖНО: Если это рассрочка, мы распределяем оплату или просто ставим долг.
        // По архитектуре Продаж: total_kgs / paid_kgs / debt_kgs.
        // Для простоты POS: если товаров несколько, первый забирает initial payment, остальные в долг? 
        // Нет, лучше: каждая строка Продажи имеет свою долю debt.
        
        const qty = item.has_imei ? 1 : parseInt(item.qty);
        const itemTotal = item.price * qty;
        totalAmount += itemTotal;
      });
      
      const installmentDebt = isInstallment ? (totalAmount - initialPayment) : 0;
      
      // Повторный проход для записи (теперь знаем общий итог и долг)
      cart.forEach(item => {
        const pur = _findById(SH.PURCHASES, item.purchase_id);
        const qty = item.has_imei ? 1 : parseInt(item.qty);
        const itemTotal = item.price * qty;
        
        // Доля долга для этой строки (пропорционально сумме)
        const itemDebt = totalAmount > 0 ? (itemTotal / totalAmount) * installmentDebt : 0;
        const itemPaid = itemTotal - itemDebt;

        const saleObj = {
          purchase_id: item.purchase_id,
          qty: qty, // Новое поле: сохраняем проданное кол-во
          buyer: p.buyer || 'Розничный покупатель',
          wa: p.phone || '',
          sale_date: saleDate,
          manager_id: p.manager_id || '',
          wallet_id: p.wallet_id || '',
          total_kgs: itemTotal,
          paid_kgs: itemPaid,
          debt_kgs: itemDebt,
          note: 'POS-чек ' + receiptId + (isInstallment ? ' [РАССРОЧКА]' : ''),
          shift_id: p.shift_id,
          receipt_id: receiptId,
          is_returned: 'FALSE',
          created_at: _now()
        };
        _append(SH.SALES, saleObj);
        
        // Обновляем закупки
        if (item.has_imei || parseInt(pur.qty) === qty) {
          _update(SH.PURCHASES, item.purchase_id, { status: 'Продано' });
        } else {
          _update(SH.PURCHASES, item.purchase_id, { qty: parseInt(pur.qty) - qty });
        }
        
        // Обновляем склад (Materialized)
        _adjustWarehouse(parseInt(pur.wh_id), qty, parseFloat(pur.cost_kgs) || 0, false);
      });
      
      // 2. Кассовая операция (только на ФАКТИЧЕСКИ полученную сумму)
      const actualCash = isInstallment ? initialPayment : totalAmount;
      if (actualCash > 0 && p.wallet_id) {
        const catId = _findOrCreateCat('Выручка от продаж', 'Приход');
        _appendCashOp({
          wallet_id: parseInt(p.wallet_id),
          op_type: 'Приход',
          cat_id: catId,
          amount: actualCash,
          op_date: saleDate,
          counterpart: p.buyer || 'Розничный покупатель',
          comment: 'Чек #' + receiptId + (isInstallment ? ' (Взнос)' : ''),
          shift_id: p.shift_id
        });
        
        // 3. Обновление баланса (Materialized)
        _adjustBalance(parseInt(p.wallet_id), actualCash, true);
      }
      
      // Инвалидация кэша
      _cDel(['purchases_all', 'sales_all', 'wallets', 'dashboard']);
      
      return _ok({ receipt_id: receiptId });
    } catch (e) {
      return _err(e.message);
    }
  });
}

/**
 * Оформление возврата
 * p.sale_ids: [] - массив ID из таблицы Продажи
 * p.wallet_id - куда возвращаем деньги
 * p.shift_id - текущая смена
 */
function processPosReturn(p) {
  return _withLock(function() {
    try {
      const saleIds = p.sale_ids || [];
      if (!saleIds.length) return _err('Не выбраны товары для возврата');
      
      let returnAmount = 0;
      
      saleIds.forEach(saleId => {
        const sale = _findById(SH.SALES, saleId);
        if (!sale) throw new Error('Запись о продаже не найдена');
        if (sale.is_returned === 'TRUE') throw new Error('Товар уже возвращен');
        
        // 1. Помечаем возврат
        _update(SH.SALES, saleId, { is_returned: 'TRUE' });
        
        // 2. Возвращаем товар в Закупки
        const pur = _findById(SH.PURCHASES, sale.purchase_id);
        const returnedQty = sale.qty ? parseInt(sale.qty) : 1;

        if (pur.has_imei === 'TRUE') {
          _update(SH.PURCHASES, sale.purchase_id, { status: 'В наличии', qty: 1 });
        } else {
          // Возвращаем именно то количество, которое было в строке продажи
          if (pur.status === 'Продано') {
            _update(SH.PURCHASES, sale.purchase_id, { status: 'В наличии', qty: returnedQty });
          } else {
            _update(SH.PURCHASES, sale.purchase_id, { qty: parseInt(pur.qty) + returnedQty });
          }
        }
        
        // 3. Обновляем склад на фактическое кол-во
        _adjustWarehouse(parseInt(pur.wh_id), returnedQty, parseFloat(pur.cost_kgs) || 0, true);
        
        returnAmount += parseFloat(sale.paid_kgs) || 0;
      });
      
      // 4. Кассовая операция расхода (возврат денег)
      const catId = _findOrCreateCat('Возвраты покупателям', 'Расход');
      _appendCashOp({
        wallet_id: parseInt(p.wallet_id),
        op_type: 'Расход',
        cat_id: catId,
        amount: returnAmount,
        comment: 'Возврат по чеку',
        shift_id: p.shift_id
      });
      
      // 5. Обновление баланса
      _adjustBalance(parseInt(p.wallet_id), returnAmount, false);
      
      _cDel(['purchases_all', 'sales_all', 'wallets', 'dashboard']);
      return _ok({ status: 'ok' });
    } catch (e) {
      return _err(e.message);
    }
  });
}

/**
 * Обмен товара
 */
function processPosExchange(p) {
  return _withLock(function() {
    try {
      const oldSaleId = p.sale_id;
      const newPurId = p.new_purchase_id;
      const walletId = parseInt(p.wallet_id);
      
      const oldSale = _findById(SH.SALES, oldSaleId);
      const newPur = _findById(SH.PURCHASES, newPurId);
      
      if (!oldSale || !newPur) return _err('Данные не найдены');
      if (newPur.status !== 'В наличии') return _err('Новый товар недоступен');
      
      // 1. Возврат старого
      _update(SH.SALES, oldSaleId, { is_returned: 'TRUE' });
      _update(SH.PURCHASES, oldSale.purchase_id, { status: 'В наличии' });
      _adjustWarehouse(parseInt(newPur.wh_id), 1, parseFloat(newPur.cost_kgs), true); // В теории старый на свой склад
      
      // 2. Продажа нового
      const diff = p.new_price - parseFloat(oldSale.total_kgs);
      const receiptId = 'EXCH-' + _nextId('SEQ_POS');
      
      const saleObj = {
        purchase_id: newPurId,
        buyer: oldSale.buyer,
        sale_date: _today(),
        manager_id: p.manager_id || oldSale.manager_id,
        wallet_id: walletId,
        total_kgs: p.new_price,
        paid_kgs: p.new_price,
        debt_kgs: 0,
        note: 'Обмен чека ' + oldSale.receipt_id,
        shift_id: p.shift_id,
        receipt_id: receiptId,
        is_returned: 'FALSE',
        created_at: _now()
      };
      _append(SH.SALES, saleObj);
      _update(SH.PURCHASES, newPurId, { status: 'Продано' });
      _adjustWarehouse(parseInt(newPur.wh_id), 1, parseFloat(newPur.cost_kgs), false);

      // 3. Кассовая операция на РАЗНИЦУ
      if (Math.abs(diff) > 0.01) {
        const opType = diff > 0 ? 'Приход' : 'Расход';
        const catName = diff > 0 ? 'Доплата при обмене' : 'Возврат при обмене';
        const catId = _findOrCreateCat(catName, opType);
        
        _appendCashOp({
          wallet_id: walletId,
          op_type: opType,
          cat_id: catId,
          amount: Math.abs(diff),
          comment: 'Обмен ' + oldSale.receipt_id + ' -> ' + receiptId,
          shift_id: p.shift_id
        });
        _adjustBalance(walletId, Math.abs(diff), diff > 0);
      }
      
      _cDel(['purchases_all', 'sales_all', 'wallets', 'dashboard']);
      return _ok({ receipt_id: receiptId });
    } catch (e) {
      return _err(e.message);
    }
  });
}

/**
 * Поиск позиций чека (для возврата/обмена)
 */
function getSaleByReceipt(p) {
  try {
    const q = String(p.query).toUpperCase();
    if (!q) return _err('Введите номер чека или IMEI');

    const sales = _rows(SH.SALES);
    const purMap = _buildMap(SH.PURCHASES, 'id', null);
    const prodMap = _buildMap(SH.MDM_PRODUCTS, 'id', 'name');

    const filtered = sales.filter(s => {
      if (s.is_returned === 'TRUE') return false;
      const pur = purMap[parseInt(s.purchase_id)] || {};
      return s.receipt_id.toUpperCase() === q || (pur.imei && pur.imei.toUpperCase() === q);
    }).map(s => {
      const pur = purMap[parseInt(s.purchase_id)] || {};
      return {
        id: parseInt(s.id),
        receipt_id: s.receipt_id,
        product_name: prodMap[parseInt(pur.product_id)] || '?',
        imei: pur.imei || '',
        total: parseFloat(s.total_kgs) || 0,
        sale_date: s.sale_date
      };
    });

    return _ok(filtered);
  } catch (e) {
    return _err(e.message);
  }
}
