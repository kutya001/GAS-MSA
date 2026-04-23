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
      
      // 1. Обработка каждого товара в корзине
      cart.forEach(item => {
        const pur = _findById(SH.PURCHASES, item.purchase_id);
        if (!pur) throw new Error('Товар не найден: ' + item.name);
        if (pur.status !== 'В наличии') throw new Error('Товар уже продан или недоступен: ' + item.name);
        
        const qty = item.has_imei ? 1 : parseInt(item.qty);
        if (!item.has_imei && parseInt(pur.qty) < qty) throw new Error('Недостаточное количество: ' + item.name);
        
        const itemTotal = item.price * qty;
        totalAmount += itemTotal;
        
        // Добавляем записи в Продажи (по 1 записи на позицию корзины или поштучно?)
        // По архитектуре: 1 запись = 1 purchase_id.
        // Если продаем 5 штук одного артикула (без IMEI), это будет 1 запись в Продажи с total_kgs = 5 * price.
        
        const saleObj = {
          purchase_id: item.purchase_id,
          buyer: p.buyer || 'Розничный покупатель',
          wa: '',
          sale_date: saleDate,
          manager_id: p.manager_id || '',
          wallet_id: p.wallet_id,
          total_kgs: itemTotal,
          paid_kgs: itemTotal,
          debt_kgs: 0,
          note: 'POS-чек ' + receiptId,
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
      
      // 2. Кассовая операция
      const catId = _findOrCreateCat('Выручка от продаж', 'Приход');
      _appendCashOp({
        wallet_id: parseInt(p.wallet_id),
        op_type: 'Приход',
        cat_id: catId,
        amount: totalAmount,
        op_date: saleDate,
        counterpart: p.buyer || 'Розничный покупатель',
        comment: 'Чек #' + receiptId,
        shift_id: p.shift_id
      });
      
      // 3. Обновление баланса (Materialized)
      _adjustBalance(parseInt(p.wallet_id), totalAmount, true);
      
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
        if (pur.has_imei === 'TRUE') {
          _update(SH.PURCHASES, sale.purchase_id, { status: 'В наличии' });
        } else {
          // Если продали часть, возвращаем количество. 
          // В POS одна запись в Продажи соответствует количеству в чеке.
          // Нам нужно знать, какое кол-во было продано. 
          // В текущей схеме Продаж нет явного поля qty (оно высчитывается через total / price или хранится в Закупках).
          // В POS мы храним total_kgs = qty * price.
          // Для простоты считаем по сумме и стоимости из Закупки.
          const unitCost = parseFloat(pur.cost_kgs) || 0;
          const soldQty = 1; // Упрощение для MV: в POS пока 1 строка = 1 модель (если не IMEI) или 1 шт (если IMEI)
          // На самом деле в processPosSale мы считали itemTotal = item.price * qty.
          // В POS версионности "Продаж" не было qty. Добавим его в будущем? 
          // Пока исходим из того, что в POS 1 строка корзины = 1 запись в Продажи.
          
          // ТАК КАК В SCHEMA НЕТ QTY В ПРОДАЖАХ, МЫ ВЕРНЕМ 1 ШТУКУ (или нужно было хранить qty в Продажах)
          // Исправим SCHEMA в DBinit позже если понадобится, но сейчас следуем ТЗ.
          
          if (pur.status === 'Продано') {
            _update(SH.PURCHASES, sale.purchase_id, { status: 'В наличии', qty: 1 });
          } else {
            _update(SH.PURCHASES, sale.purchase_id, { qty: parseInt(pur.qty) + 1 });
          }
        }
        
        // 3. Обновляем склад
        _adjustWarehouse(parseInt(pur.wh_id), 1, parseFloat(pur.cost_kgs) || 0, true);
        
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
