// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · Sales.gs
//  Продажи
// ══════════════════════════════════════════════════════════════════════
function getSales(p) {
  try {
    var bMap   = _buildMap(SH.BRANDS,   'id', 'name');
    var mMap   = _buildMap(SH.MODELS,   'id', 'name');
    var mgMap  = _buildMap(SH.MANAGERS, 'id', 'name');
    var wMap   = _buildMap(SH.WALLETS,  'id', 'name');
    var purMap = {};
    _rows(SH.PURCHASES).forEach(function(r){ purMap[parseInt(r.id)] = r; });

    var rows = _rows(SH.SALES)
      .filter(function(r){ return r.id; })
      .map(function(r) {
        var pur = purMap[parseInt(r.purchase_id)] || {};
        return {
          id:           parseInt(r.id),
          purchase_id:  parseInt(r.purchase_id)  || 0,
          brand_name:   bMap[parseInt(pur.brand_id)]  || '',
          model_name:   mMap[parseInt(pur.model_id)]  || '',
          spec:         pur.spec       || '',
          buyer:        r.buyer        || '',
          wa:           r.wa           || '',
          sale_date:    r.sale_date    || '',
          manager_id:   parseInt(r.manager_id)   || 0,
          manager_name: mgMap[parseInt(r.manager_id)] || '',
          wallet_id:    parseInt(r.wallet_id)    || 0,
          wallet_name:  wMap[parseInt(r.wallet_id)]   || '',
          total_kgs:    parseFloat(r.total_kgs)  || 0,
          paid_kgs:     parseFloat(r.paid_kgs)   || 0,
          debt_kgs:     parseFloat(r.debt_kgs)   || 0,
          note:         r.note || '',
        };
      });

    if (p) {
      if (p.mgr_id && parseInt(p.mgr_id)) rows = rows.filter(function(r){ return r.manager_id === parseInt(p.mgr_id); });
      if (p.brand_id && parseInt(p.brand_id)) {
        rows = rows.filter(function(r){
          return parseInt((purMap[r.purchase_id] || {}).brand_id) === parseInt(p.brand_id);
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
        note: p.note || '', created_at: _today(),
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
