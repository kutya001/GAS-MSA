// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · Sales.gs
//  Продажи
// ══════════════════════════════════════════════════════════════════════
function getSales(p) {
  try {
    var mgMap  = _buildMap(SH.MANAGERS, 'id', 'name');
    var wMap   = _buildMap(SH.WALLETS,  'id', 'name');
    var whMap  = _buildMap(SH.WAREHOUSES, 'id', 'name');
    var clMap  = _buildMap(SH.CLASSES,    'id', 'name');
    var tpMap  = _buildMap(SH.PROD_TYPES, 'id', 'name');

    // Карта продуктов MDM
    var prodMap = {};
    _rows(SH.MDM_PRODUCTS).forEach(function(r) {
      var av = {};
      try { av = JSON.parse(r.attribute_values || '{}'); } catch(e) {}
      prodMap[parseInt(r.id)] = { name: r.name || '', sku: r.sku || '', template_id: parseInt(r.template_id) || 0, attribute_values: av };
    });

    var purMap = {};
    _rows(SH.PURCHASES).forEach(function(r){ purMap[parseInt(r.id)] = r; });

    var rows = _rows(SH.SALES)
      .filter(function(r){ return r.id; })
      .map(function(r) {
        var pur  = purMap[parseInt(r.purchase_id)] || {};
        var prod = prodMap[parseInt(pur.product_id)] || {};
        var hasImei = (pur.has_imei === 'TRUE' || pur.has_imei === true || pur.has_imei === 1);
        var costKgs = parseFloat(pur.cost_kgs) || 0;
        var totalKgs = parseFloat(r.total_kgs) || 0;
        return {
          id:           parseInt(r.id),
          purchase_id:  parseInt(r.purchase_id)  || 0,
          product_name: prod.name || '',
          product_sku:  prod.sku  || '',
          class_id:     parseInt(pur.class_id)   || 0,
          type_id:      parseInt(pur.type_id)    || 0,
          class_name:   clMap[parseInt(pur.class_id)]   || '',
          type_name:    tpMap[parseInt(pur.type_id)]    || '',
          has_imei:     hasImei,
          imei:         hasImei ? (pur.imei || '') : '',
          cost_kgs:     costKgs,
          cost_usd:     parseFloat(pur.cost_usd) || 0,
          profit_kgs:   totalKgs - costKgs,
          wh_name:      whMap[parseInt(pur.wh_id)] || '',
          template_id:  prod.template_id || 0,
          attribute_values: prod.attribute_values || {},
          buyer:        r.buyer        || '',
          wa:           r.wa           || '',
          sale_date:    r.sale_date    || '',
          manager_id:   parseInt(r.manager_id)   || 0,
          manager_name: mgMap[parseInt(r.manager_id)] || '',
          wallet_id:    parseInt(r.wallet_id)    || 0,
          wallet_name:  wMap[parseInt(r.wallet_id)]   || '',
          total_kgs:    totalKgs,
          paid_kgs:     parseFloat(r.paid_kgs)   || 0,
          debt_kgs:     parseFloat(r.debt_kgs)   || 0,
          note:         r.note || '',
        };
      });

    if (p) {
      if (p.mgr_id && parseInt(p.mgr_id)) rows = rows.filter(function(r){ return r.manager_id === parseInt(p.mgr_id); });
      if (p.class_id && parseInt(p.class_id)) {
        var fClass = parseInt(p.class_id);
        rows = rows.filter(function(r){
          return parseInt((purMap[r.purchase_id] || {}).class_id) === fClass;
        });
      }
      if (p.status === 'Оплачено') rows = rows.filter(function(r){ return r.debt_kgs <= 0; });
      if (p.status === 'Долг')     rows = rows.filter(function(r){ return r.debt_kgs >  0; });
      if (p.dateFrom || p.dateTo)  rows = rows.filter(function(r){ return _inRange(r.sale_date, p.dateFrom, p.dateTo); });
    }
    rows.sort(function(a, b){ return (b.sale_date || '').localeCompare(a.sale_date || ''); });

    var page  = parseInt(p && p.page) || 1;
    var size  = parseInt(p && p.size) || 100;
    var paged = (size >= 999) ? rows : rows.slice((page - 1) * size, page * size);
    return _ok({ rows: paged, total: rows.length });
  } catch(e) { return _err(e.message); }
}

function addSale(p) {
  return _withLock(function() {
    try {
      var total = parseFloat(p.total_kgs) || 0;
      var paid  = parseFloat(p.paid_kgs)  || 0;
      var debt  = Math.max(0, total - paid);

      var obj = {
        purchase_id: parseInt(p.purchase_id),
        buyer: p.buyer || '', wa: p.wa || '',
        sale_date: p.sale_date || _today(),
        manager_id: parseInt(p.manager_id) || '',
        wallet_id:  parseInt(p.wallet_id)  || '',
        total_kgs: total, paid_kgs: paid, debt_kgs: debt,
        note: p.note || '', created_at: _now(),
      };
      var newId = _append(SH.SALES, obj);

      // Статус закупки → Продано + уменьшаем склад (Materialized Stock)
      var pur = _findById(SH.PURCHASES, p.purchase_id);
      _update(SH.PURCHASES, p.purchase_id, { status: 'Продано' });
      if (pur) {
        var qty = (pur.has_imei === 'TRUE' || pur.has_imei === true) ? 1 : (parseInt(pur.qty) || 1);
        _adjustWarehouse(parseInt(pur.wh_id), qty, parseFloat(pur.cost_kgs) || 0, false);
      }

      // Кассовая операция + обновление баланса кошелька
      if (paid > 0 && parseInt(p.wallet_id)) {
        var catId = _findOrCreateCat('Выручка от продаж', 'Приход');
        _appendCashOp({
          wallet_id: parseInt(p.wallet_id), op_type: 'Приход',
          cat_id: catId, article_id: '', amount: Math.round(paid),
          op_date: p.sale_date || _today(),
          counterpart: p.buyer || '', comment: 'Продажа #' + newId,
        });
        _adjustBalance(parseInt(p.wallet_id), Math.round(paid), true);
      }

      _cDel(['purchases_all', 'sales_all', 'wallets', 'dashboard']);
      return _ok({ id: newId });
    } catch(e) { return _err(e.message); }
  });
}

// ──────────────────────────────────────────────────────────────────────
//  ОБНОВЛЕНИЕ ПРОДАЖИ
// ──────────────────────────────────────────────────────────────────────
function updateSale(p) {
  return _withLock(function() {
    try {
      var sale = _findById(SH.SALES, p.id);
      if (!sale) return _err('Продажа #' + p.id + ' не найдена');

      var newTotal = parseFloat(p.total_kgs) || 0;
      var curPaid  = parseFloat(sale.paid_kgs) || 0;
      var newDebt  = Math.max(0, newTotal - curPaid);

      _update(SH.SALES, p.id, {
        buyer: p.buyer || '',
        wa: p.wa || '',
        sale_date: p.sale_date || '',
        manager_id: parseInt(p.manager_id) || '',
        total_kgs: newTotal,
        debt_kgs: Math.round(newDebt),
        note: p.note || '',
      });

      _cDel(['sales_all', 'dashboard']);
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

// ──────────────────────────────────────────────────────────────────────
//  ОПЛАТЫ ПО ПРОДАЖАМ — получение для конкретной продажи
// ──────────────────────────────────────────────────────────────────────
function getSalePayments(p) {
  try {
    var walletMap = _buildMap(SH.WALLETS, 'id', 'name');
    var rows = _rows(SH.PAYMENTS)
      .filter(function(r) { return r.id && parseInt(r.sale_id) === parseInt(p.sale_id); })
      .map(function(r) {
        return {
          id:          parseInt(r.id),
          sale_id:     parseInt(r.sale_id),
          wallet_id:   parseInt(r.wallet_id),
          wallet_name: walletMap[parseInt(r.wallet_id)] || '',
          amount:      parseFloat(r.amount) || 0,
          pay_date:    r.pay_date || '',
          note:        r.note || '',
        };
      });
    rows.sort(function(a, b) { return (a.pay_date || '').localeCompare(b.pay_date || ''); });
    return _ok(rows);
  } catch(e) { return _err(e.message); }
}
