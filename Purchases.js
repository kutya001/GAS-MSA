// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · Purchases.gs
//  Закупки и остатки на складе
// ══════════════════════════════════════════════════════════════════════
function getPurchases(p) {
  try {
    var useCache = !p || (!p.wh_id && !p.brand_id && !p.status && !p.dateFrom && !p.dateTo);
    if (useCache) {
      var cached = _cGet('purchases_all');
      if (cached) return _ok(cached);
    }

    var bMap  = _buildMap(SH.BRANDS,     'id', 'name');
    var mMap  = _buildMap(SH.MODELS,     'id', 'name');
    var sMap  = _buildMap(SH.SUPPLIERS,  'id', 'name');
    var wMap  = _buildMap(SH.WAREHOUSES, 'id', 'name');
    var clMap = _buildMap(SH.CLASSES,    'id', 'name');
    var tpMap = _buildMap(SH.PROD_TYPES, 'id', 'name');
    var prMap = _buildMap(SH.PURPOSES,   'id', 'name');

    var rows = _rows(SH.PURCHASES)
      .filter(function(r){ return r.id && r.status !== 'Удалено'; })
      .map(function(r) {
        var hasImei = (r.has_imei === 'TRUE' || r.has_imei === true || r.has_imei === 1);
        return {
          id:            parseInt(r.id),
          brand_id:      parseInt(r.brand_id)    || 0,
          model_id:      parseInt(r.model_id)    || 0,
          wh_id:         parseInt(r.wh_id)       || 0,
          supplier_id:   parseInt(r.supplier_id) || 0,
          brand_name:    bMap[parseInt(r.brand_id)]    || '',
          model_name:    mMap[parseInt(r.model_id)]    || '',
          wh_name:       wMap[parseInt(r.wh_id)]       || '',
          supplier_name: sMap[parseInt(r.supplier_id)] || '',
          class_id:      parseInt(r.class_id)    || 0,
          type_id:       parseInt(r.type_id)     || 0,
          purpose_id:    parseInt(r.purpose_id)  || 0,
          class_name:    clMap[parseInt(r.class_id)]   || '',
          type_name:     tpMap[parseInt(r.type_id)]    || '',
          purpose_name:  prMap[parseInt(r.purpose_id)] || '',
          spec:          r.spec      || '',
          color:         r.color     || '',
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
      if (p.brand_id && parseInt(p.brand_id)) rows = rows.filter(function(r){ return r.brand_id === parseInt(p.brand_id); });
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

function addPurchase(p) {
  return _withLock(function() {
    try {
      var hasImei = (p.has_imei === true || p.has_imei === 'TRUE' || p.has_imei === 1);
      var costUsd = parseFloat(p.cost_usd) || 0;
      var rate    = parseFloat(p.rate)     || 88;
      var costKgs = Math.round(costUsd * rate);
      var qty     = hasImei ? 1 : (parseInt(p.qty) || 1);

      var obj = {
        brand_id: parseInt(p.brand_id) || '', model_id: parseInt(p.model_id) || '',
        spec: p.spec || '', color: p.color || '',
        wh_id: parseInt(p.wh_id) || '', supplier_id: parseInt(p.supplier_id) || '',
        has_imei: hasImei ? 'TRUE' : 'FALSE',
        imei: hasImei ? (p.imei || '') : '',
        qty: qty, condition: p.condition || 'Новый',
        purchase_date: p.purchase_date || _today(),
        cost_usd: costUsd, rate: rate, cost_kgs: costKgs,
        status: 'В наличии', note: p.note || '',
        class_id: parseInt(p.class_id) || '', type_id: parseInt(p.type_id) || '', purpose_id: parseInt(p.purpose_id) || '',
        created_at: _today(),
      };
      var newId = _append(SH.PURCHASES, obj);

      // Атомарно обновляем склад (Materialized Stock)
      if (parseInt(p.wh_id)) _adjustWarehouse(parseInt(p.wh_id), qty, costKgs, true);

      // Кассовая операция расхода при указанном кошельке оплаты
      if (parseInt(p.pay_wallet_id)) {
        var catId = _findOrCreateCat('Закуп товара', 'Расход');
        _appendCashOp({
          wallet_id: parseInt(p.pay_wallet_id), op_type: 'Расход',
          cat_id: catId, article_id: '', amount: costKgs,
          op_date: p.purchase_date || _today(),
          counterpart: '', comment: 'Оплата за закупку #' + newId,
        });
        _adjustBalance(parseInt(p.pay_wallet_id), costKgs, false);
      }

      _cDel(['purchases_all']);
      return _ok({ id: newId });
    } catch(e) { return _err(e.message); }
  });
}

function updatePurchase(p) {
  return _withLock(function() {
    try {
      var hasImei = (p.has_imei === true || p.has_imei === 'TRUE' || p.has_imei === 1);
      var costUsd = parseFloat(p.cost_usd) || 0;
      var rate    = parseFloat(p.rate)     || 88;
      _update(SH.PURCHASES, p.id, {
        brand_id: parseInt(p.brand_id) || '', model_id: parseInt(p.model_id) || '',
        spec: p.spec || '', color: p.color || '',
        wh_id: parseInt(p.wh_id) || '', supplier_id: parseInt(p.supplier_id) || '',
        has_imei: hasImei ? 'TRUE' : 'FALSE',
        imei: hasImei ? (p.imei || '') : '',
        qty: hasImei ? 1 : (parseInt(p.qty) || 1),
        condition: p.condition || 'Новый',
        purchase_date: p.purchase_date || '',
        cost_usd: costUsd, rate: rate, cost_kgs: Math.round(costUsd * rate),
        note: p.note || '',
        class_id: parseInt(p.class_id) || '', type_id: parseInt(p.type_id) || '', purpose_id: parseInt(p.purpose_id) || '',
      });
      _cDel(['purchases_all']);
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

function deletePurchase(p) {
  return _withLock(function() {
    try {
      // Убираем с materialized-счётчика склада если товар ещё в наличии
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
//  ОСТАТКИ НА СКЛАДЕ
// ══════════════════════════════════════════════════════════════════════
function getStock(p) {
  try {
    var bMap  = _buildMap(SH.BRANDS,     'id', 'name');
    var mMap  = _buildMap(SH.MODELS,     'id', 'name');
    var wMap  = _buildMap(SH.WAREHOUSES, 'id', 'name');
    var now   = new Date();

    var rows = _rows(SH.PURCHASES)
      .filter(function(r){ return r.id && r.status === 'В наличии'; })
      .map(function(r) {
        var hasImei = (r.has_imei === 'TRUE' || r.has_imei === true || r.has_imei === 1);
        var pd      = r.purchase_date ? new Date(r.purchase_date) : null;
        return {
          id:            parseInt(r.id),
          brand_id:      parseInt(r.brand_id),
          model_id:      parseInt(r.model_id),
          wh_id:         parseInt(r.wh_id),
          brand_name:    bMap[parseInt(r.brand_id)]    || '',
          model_name:    mMap[parseInt(r.model_id)]    || '',
          wh_name:       wMap[parseInt(r.wh_id)]       || '',
          spec:          r.spec || '', color: r.color || '',
          has_imei:      hasImei,
          imei:          hasImei ? (r.imei || '') : '',
          qty:           hasImei ? 1 : (parseInt(r.qty) || 1),
          cost_kgs:      parseFloat(r.cost_kgs) || 0,
          purchase_date: r.purchase_date || '',
          stale: pd ? (Math.floor((now - pd) / 86400000) > STALE_DAYS) : false,
        };
      });

    if (p) {
      if (p.wh_id    && parseInt(p.wh_id))    rows = rows.filter(function(r){ return r.wh_id    === parseInt(p.wh_id);    });
      if (p.brand_id && parseInt(p.brand_id)) rows = rows.filter(function(r){ return r.brand_id === parseInt(p.brand_id); });
    }

    var groups = {};
    rows.forEach(function(r) {
      var key = r.wh_name + '___' + r.brand_name;
      if (!groups[key]) groups[key] = { wh_name: r.wh_name, brand: r.brand_name, count: 0, cost_kgs: 0, items: [] };
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
