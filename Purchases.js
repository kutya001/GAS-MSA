// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · Purchases.gs
//  Закупки, остатки на складе, оплаты по закупкам
// ══════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────
//  ЧТЕНИЕ ЗАКУПОК (с продуктом из MDM)
// ──────────────────────────────────────────────────────────────────────
function getPurchases(p) {
  try {
    var useCache = !p || (!p.wh_id && !p.class_id && !p.status && !p.dateFrom && !p.dateTo);
    if (useCache) {
      var cached = _cGet('purchases_all');
      if (cached) return _ok(cached);
    }

    var sMap  = _buildMap(SH.SUPPLIERS,  'id', 'name');
    var wMap  = _buildMap(SH.WAREHOUSES, 'id', 'name');
    var clMap = _buildMap(SH.CLASSES,    'id', 'name');
    var tpMap = _buildMap(SH.PROD_TYPES, 'id', 'name');

    // Карта продуктов MDM
    var prodMap = {};
    _rows(SH.MDM_PRODUCTS).forEach(function(r) {
      var av = {};
      try { av = JSON.parse(r.attribute_values || '{}'); } catch(e) {}
      prodMap[parseInt(r.id)] = {
        name:             r.name || '',
        sku:              r.sku  || '',
        template_id:      parseInt(r.template_id) || 0,
        attribute_values: av,
      };
    });

    var rows = _rows(SH.PURCHASES)
      .filter(function(r){ return r.id && r.status !== 'Удалено'; })
      .map(function(r) {
        var hasImei = (r.has_imei === 'TRUE' || r.has_imei === true || r.has_imei === 1);
        var prod    = prodMap[parseInt(r.product_id)] || {};
        return {
          id:            parseInt(r.id),
          wh_id:         parseInt(r.wh_id)       || 0,
          supplier_id:   parseInt(r.supplier_id) || 0,
          wh_name:       wMap[parseInt(r.wh_id)]       || '',
          supplier_name: sMap[parseInt(r.supplier_id)] || '',
          class_id:      parseInt(r.class_id)    || 0,
          type_id:       parseInt(r.type_id)     || 0,
          class_name:    clMap[parseInt(r.class_id)]   || '',
          type_name:     tpMap[parseInt(r.type_id)]    || '',
          product_id:    parseInt(r.product_id) || 0,
          product_name:  prod.name || '',
          product_sku:   prod.sku  || '',
          template_id:   prod.template_id || 0,
          attribute_values: prod.attribute_values || {},
          condition:     r.condition || 'Новый',
          has_imei:      hasImei,
          imei:          hasImei ? (r.imei || '') : '',
          qty:           hasImei ? 1 : (parseInt(r.qty) || 1),
          purchase_date: r.purchase_date || '',
          cost_usd:      parseFloat(r.cost_usd) || 0,
          rate:          parseFloat(r.rate)      || 88,
          cost_kgs:      parseFloat(r.cost_kgs)  || 0,
          status:        r.status || 'В наличии',
          note:          r.note   || '',
        };
      });

    if (p) {
      if (p.wh_id    && parseInt(p.wh_id))    rows = rows.filter(function(r){ return r.wh_id    === parseInt(p.wh_id);    });
      if (p.class_id && parseInt(p.class_id)) rows = rows.filter(function(r){ return r.class_id === parseInt(p.class_id); });
      if (p.type_id  && parseInt(p.type_id))  rows = rows.filter(function(r){ return r.type_id  === parseInt(p.type_id);  });
      if (p.status)   rows = rows.filter(function(r){ return r.status === p.status; });
      if (p.dateFrom || p.dateTo) rows = rows.filter(function(r){ return _inRange(r.purchase_date, p.dateFrom, p.dateTo); });
    }

    rows.sort(function(a, b){ return (b.purchase_date || '').localeCompare(a.purchase_date || ''); });

    var page  = parseInt(p && p.page) || 1;
    var size  = parseInt(p && p.size) || 100;
    var total = rows.length;
    var paged = (size >= 999) ? rows : rows.slice((page - 1) * size, page * size);
    var result = { rows: paged, total: total, page: page, size: size };

    if (useCache) _cSet('purchases_all', result, CACHE_TX);
    return _ok(result);
  } catch(e) { return _err(e.message); }
}

// ──────────────────────────────────────────────────────────────────────
//  ПРОВЕРКА УНИКАЛЬНОСТИ IMEI
// ──────────────────────────────────────────────────────────────────────
function checkImeiUnique(p) {
  try {
    var imei = String(p.imei || '').trim();
    if (!imei || !/^\d{15}$/.test(imei)) return _ok({ unique: true });
    var excludeId = parseInt(p.exclude_id) || 0;
    var found = _rows(SH.PURCHASES).some(function(r) {
      return r.imei === imei && r.status !== 'Удалено' && parseInt(r.id) !== excludeId;
    });
    return _ok({ unique: !found });
  } catch(e) { return _err(e.message); }
}

// ──────────────────────────────────────────────────────────────────────
//  СОЗДАНИЕ ЗАКУПКИ (+ создание MDM-продукта)
// ──────────────────────────────────────────────────────────────────────
function addPurchase(p) {
  return _withLock(function() {
    try {
      var hasImei = (p.has_imei === true || p.has_imei === 'TRUE' || p.has_imei === 1);
      var costUsd = parseFloat(p.cost_usd) || 0;
      var rate    = parseFloat(p.rate)     || 88;
      var costKgs = Math.round(costUsd * rate);
      var qty     = hasImei ? 1 : (parseInt(p.qty) || 1);

      // IMEI uniqueness check (server-side)
      if (hasImei && p.imei) {
        var dup = _rows(SH.PURCHASES).find(function(r) {
          return r.imei === p.imei && r.status !== 'Удалено';
        });
        if (dup) return _err('IMEI ' + p.imei + ' уже существует (Закупка #' + dup.id + ')');
      }

      // Создаём или привязываем продукт MDM
      var productId = parseInt(p.product_id) || 0;
      if (!productId && p.template_id) {
        var av = (typeof p.attribute_values === 'string')
          ? p.attribute_values
          : JSON.stringify(p.attribute_values || {});
        productId = _append(SH.MDM_PRODUCTS, {
          template_id: parseInt(p.template_id),
          sku:  (p.sku || '').trim(),
          name: (p.product_name || '').trim(),
          attribute_values: av,
          created_at: _today(),
        });
        _cDel(['mdm_products_all', 'mdm_context']);
      }

      var obj = {
        purchase_date: p.purchase_date || _today(),
        wh_id: parseInt(p.wh_id) || '', supplier_id: parseInt(p.supplier_id) || '',
        cost_usd: costUsd, rate: rate, cost_kgs: costKgs,
        has_imei: hasImei ? 'TRUE' : 'FALSE',
        imei: hasImei ? (p.imei || '') : '',
        qty: qty, condition: p.condition || 'Новый',
        class_id: parseInt(p.class_id) || '', type_id: parseInt(p.type_id) || '',
        product_id: productId || '',
        status: 'В наличии', note: p.note || '',
        created_at: _today(),
      };
      var newId = _append(SH.PURCHASES, obj);

      // Атомарно обновляем склад (Materialized Stock)
      if (parseInt(p.wh_id)) _adjustWarehouse(parseInt(p.wh_id), qty, costKgs, true);

      // Моментальная оплата поставщику (если передана)
      if (p.pay_wallet_id && p.pay_amount) {
        var payAmt = parseFloat(p.pay_amount) || 0;
        if (payAmt > 0) {
          _append(SH.PURCHASE_PAYMENTS, {
            purchase_id: newId,
            wallet_id: parseInt(p.pay_wallet_id),
            amount: payAmt,
            pay_date: p.purchase_date || _today(),
            note: 'Оплата при закупке',
            created_at: _today(),
          });
          var catId = _findOrCreateCat('Закуп товара', 'Расход');
          _appendCashOp({
            wallet_id: parseInt(p.pay_wallet_id), op_type: 'Расход',
            cat_id: catId, article_id: '', amount: Math.round(payAmt),
            op_date: p.purchase_date || _today(),
            counterpart: '', comment: 'Оплата за закупку #' + newId,
          });
          _adjustBalance(parseInt(p.pay_wallet_id), Math.round(payAmt), false);
        }
      }

      _cDel(['purchases_all']);
      return _ok({ id: newId, product_id: productId });
    } catch(e) { return _err(e.message); }
  });
}

// ──────────────────────────────────────────────────────────────────────
//  ОБНОВЛЕНИЕ ЗАКУПКИ (+ обновление MDM-продукта)
// ──────────────────────────────────────────────────────────────────────
function updatePurchase(p) {
  return _withLock(function() {
    try {
      var hasImei = (p.has_imei === true || p.has_imei === 'TRUE' || p.has_imei === 1);
      var costUsd = parseFloat(p.cost_usd) || 0;
      var rate    = parseFloat(p.rate)     || 88;

      // IMEI uniqueness check (server-side, excluding self)
      if (hasImei && p.imei) {
        var dup = _rows(SH.PURCHASES).find(function(r) {
          return r.imei === p.imei && r.status !== 'Удалено' && parseInt(r.id) !== parseInt(p.id);
        });
        if (dup) return _err('IMEI ' + p.imei + ' уже существует (Закупка #' + dup.id + ')');
      }

      // Обновляем MDM-продукт если переданы атрибуты
      if (p.product_id && p.attribute_values) {
        var av = (typeof p.attribute_values === 'string')
          ? p.attribute_values
          : JSON.stringify(p.attribute_values || {});
        var updProd = { attribute_values: av };
        if (p.product_name) updProd.name = p.product_name;
        if (p.sku !== undefined) updProd.sku = p.sku;
        _update(SH.MDM_PRODUCTS, p.product_id, updProd);
        _cDel(['mdm_products_all', 'mdm_context']);
      }

      _update(SH.PURCHASES, p.id, {
        purchase_date: p.purchase_date || '',
        wh_id: parseInt(p.wh_id) || '', supplier_id: parseInt(p.supplier_id) || '',
        cost_usd: costUsd, rate: rate, cost_kgs: Math.round(costUsd * rate),
        has_imei: hasImei ? 'TRUE' : 'FALSE',
        imei: hasImei ? (p.imei || '') : '',
        qty: hasImei ? 1 : (parseInt(p.qty) || 1),
        condition: p.condition || 'Новый',
        class_id: parseInt(p.class_id) || '', type_id: parseInt(p.type_id) || '',
        product_id: parseInt(p.product_id) || '',
        note: p.note || '',
      });
      _cDel(['purchases_all']);
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

// ──────────────────────────────────────────────────────────────────────
//  УДАЛЕНИЕ ЗАКУПКИ
// ──────────────────────────────────────────────────────────────────────
function deletePurchase(p) {
  return _withLock(function() {
    try {
      var pur = _findById(SH.PURCHASES, p.id);
      if (pur && pur.status === 'В наличии') {
        var qty = (pur.has_imei === 'TRUE') ? 1 : (parseInt(pur.qty) || 1);
        _adjustWarehouse(parseInt(pur.wh_id), qty, parseFloat(pur.cost_kgs) || 0, false);
      }
      _update(SH.PURCHASES, p.id, { status: 'Удалено' });
      _cDel(['purchases_all']);
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

// ══════════════════════════════════════════════════════════════════════
//  ОПЛАТЫ ПО ЗАКУПКАМ
// ══════════════════════════════════════════════════════════════════════
function getPurchasePayments(p) {
  try {
    var walletMap = _buildMap(SH.WALLETS, 'id', 'name');
    var rows = _rows(SH.PURCHASE_PAYMENTS)
      .filter(function(r){ return r.id; })
      .map(function(r) {
        return {
          id:          parseInt(r.id),
          purchase_id: parseInt(r.purchase_id),
          wallet_id:   parseInt(r.wallet_id),
          wallet_name: walletMap[parseInt(r.wallet_id)] || '',
          amount:      parseFloat(r.amount) || 0,
          pay_date:    r.pay_date || '',
          note:        r.note || '',
        };
      });

    if (p && p.purchase_id) {
      var pid = parseInt(p.purchase_id);
      rows = rows.filter(function(r){ return r.purchase_id === pid; });
    }
    rows.sort(function(a, b){ return (b.pay_date || '').localeCompare(a.pay_date || ''); });
    return _ok(rows);
  } catch(e) { return _err(e.message); }
}

function addPurchasePayment(p) {
  return _withLock(function() {
    try {
      var amt = parseFloat(p.amount) || 0;
      if (amt <= 0) return _err('Сумма должна быть больше 0');

      var newId = _append(SH.PURCHASE_PAYMENTS, {
        purchase_id: parseInt(p.purchase_id),
        wallet_id:   parseInt(p.wallet_id),
        amount:      amt,
        pay_date:    p.pay_date || _today(),
        note:        p.note || '',
        created_at:  _today(),
      });

      // Кассовая операция расхода
      if (parseInt(p.wallet_id)) {
        var catId = _findOrCreateCat('Закуп товара', 'Расход');
        _appendCashOp({
          wallet_id: parseInt(p.wallet_id), op_type: 'Расход',
          cat_id: catId, article_id: '', amount: Math.round(amt),
          op_date: p.pay_date || _today(),
          counterpart: '', comment: 'Оплата за закупку #' + p.purchase_id,
        });
        _adjustBalance(parseInt(p.wallet_id), Math.round(amt), false);
      }

      _cDel(['wallets', 'dashboard']);
      return _ok({ id: newId });
    } catch(e) { return _err(e.message); }
  });
}

// ══════════════════════════════════════════════════════════════════════
//  ОСТАТКИ НА СКЛАДЕ
// ══════════════════════════════════════════════════════════════════════
function getStock(p) {
  try {
    var wMap  = _buildMap(SH.WAREHOUSES, 'id', 'name');
    var clMap = _buildMap(SH.CLASSES,    'id', 'name');
    var now   = new Date();

    // Карта продуктов MDM
    var prodMap = {};
    _rows(SH.MDM_PRODUCTS).forEach(function(r) {
      prodMap[parseInt(r.id)] = { name: r.name || '', sku: r.sku || '' };
    });

    var rows = _rows(SH.PURCHASES)
      .filter(function(r){ return r.id && r.status === 'В наличии'; })
      .map(function(r) {
        var hasImei = (r.has_imei === 'TRUE' || r.has_imei === true || r.has_imei === 1);
        var pd      = r.purchase_date ? new Date(r.purchase_date) : null;
        var prod    = prodMap[parseInt(r.product_id)] || {};
        return {
          id:            parseInt(r.id),
          wh_id:         parseInt(r.wh_id),
          wh_name:       wMap[parseInt(r.wh_id)]       || '',
          class_name:    clMap[parseInt(r.class_id)]    || '',
          product_name:  prod.name || '',
          has_imei:      hasImei,
          imei:          hasImei ? (r.imei || '') : '',
          qty:           hasImei ? 1 : (parseInt(r.qty) || 1),
          cost_kgs:      parseFloat(r.cost_kgs) || 0,
          purchase_date: r.purchase_date || '',
          stale: pd ? (Math.floor((now - pd) / 86400000) > STALE_DAYS) : false,
        };
      });

    if (p) {
      if (p.wh_id && parseInt(p.wh_id)) rows = rows.filter(function(r){ return r.wh_id === parseInt(p.wh_id); });
    }

    var groups = {};
    rows.forEach(function(r) {
      var key = r.wh_name + '___' + r.class_name;
      if (!groups[key]) groups[key] = { wh_name: r.wh_name, brand: r.class_name, count: 0, cost_kgs: 0, items: [] };
      var q = r.has_imei ? 1 : r.qty;
      groups[key].count    += q;
      groups[key].cost_kgs += r.cost_kgs * q;
      groups[key].items.push(r);
    });

    var groupArr     = Object.keys(groups).sort().map(function(k){ var g = groups[k]; g.cost_kgs = Math.round(g.cost_kgs); return g; });
    var totalItems   = rows.reduce(function(s,r){ return s + (r.has_imei ? 1 : r.qty); }, 0);
    var totalCostKgs = Math.round(rows.reduce(function(s,r){ return s + r.cost_kgs*(r.has_imei?1:r.qty); }, 0));
    var staleCount   = rows.filter(function(r){ return r.stale; }).reduce(function(s,r){ return s+(r.has_imei?1:r.qty); }, 0);

    return _ok({ totalItems: totalItems, totalCostKgs: totalCostKgs, staleCount: staleCount, groups: groupArr });
  } catch(e) { return _err(e.message); }
}
