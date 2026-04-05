// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · Analytics.gs
//  Дашборд, отчёты аналитики, долги
// ══════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════
//  ДАШБОРД — кэш Шаг 4
// ══════════════════════════════════════════════════════════════════════
function getDashboard() {
  try {
    var cached = _cGet('dashboard');
    if (cached) return _ok(cached);

    var today     = _today();
    var thisMonth = today.slice(0, 7);

    var sales     = _rows(SH.SALES).filter(function(r){ return r.id; });
    var purchases = _rows(SH.PURCHASES).filter(function(r){ return r.id; });
    var bMap   = _buildMap(SH.BRANDS, 'id', 'name');
    var purMap = {}; purchases.forEach(function(p){ purMap[parseInt(p.id)] = p; });
    var nowMs  = new Date().getTime();

    var revenueToday = 0, revenueMonth = 0, soldMonth = 0, debtTotal = 0, profitTotal = 0;
    sales.forEach(function(s) {
      var paid  = parseFloat(s.paid_kgs)  || 0;
      var debt  = parseFloat(s.debt_kgs)  || 0;
      var total = parseFloat(s.total_kgs) || 0;
      debtTotal += debt;
      if (String(s.sale_date) === today) revenueToday += paid;
      if (String(s.sale_date || '').slice(0, 7) === thisMonth) { revenueMonth += paid; soldMonth++; }
      var pur  = purMap[parseInt(s.purchase_id)] || {};
      var qty  = (pur.has_imei === 'TRUE' || pur.has_imei === true) ? 1 : (parseInt(pur.qty) || 1);
      profitTotal += total - (parseFloat(pur.cost_kgs) || 0) * qty;
    });

    var staleItems = purchases.filter(function(p) {
      if (p.status !== 'В наличии') return false;
      var pd = p.purchase_date ? new Date(p.purchase_date) : null;
      return pd && (nowMs - pd.getTime()) / 86400000 > STALE_DAYS;
    }).length;

    var monthMap = {};
    sales.forEach(function(s) {
      var m = String(s.sale_date || '').slice(0, 7); if (!m) return;
      if (!monthMap[m]) monthMap[m] = { rev: 0, cost: 0 };
      var pur  = purMap[parseInt(s.purchase_id)] || {};
      var qty  = (pur.has_imei === 'TRUE' || pur.has_imei === true) ? 1 : (parseInt(pur.qty) || 1);
      monthMap[m].rev  += parseFloat(s.total_kgs) || 0;
      monthMap[m].cost += (parseFloat(pur.cost_kgs) || 0) * qty;
    });
    var monthly = Object.keys(monthMap).sort().slice(-6).map(function(m) {
      return { m: m.slice(5,7)+'/'+m.slice(2,4), rev: Math.round(monthMap[m].rev), prof: Math.round(monthMap[m].rev - monthMap[m].cost) };
    });

    var brandRevMap = {};
    sales.forEach(function(s) {
      var pur = purMap[parseInt(s.purchase_id)] || {};
      var bn  = bMap[parseInt(pur.brand_id)] || 'Прочее';
      brandRevMap[bn] = (brandRevMap[bn] || 0) + (parseFloat(s.total_kgs) || 0);
    });
    var brands = Object.keys(brandRevMap).sort(function(a,b){ return brandRevMap[b]-brandRevMap[a]; }).slice(0,6)
      .map(function(b){ return { b: b, v: Math.round(brandRevMap[b]) }; });

    var result = {
      kpi: {
        revenueToday:  Math.round(revenueToday),
        revenueMonth:  Math.round(revenueMonth),
        soldMonth:     soldMonth,
        profitTotal:   Math.round(profitTotal),
        debtTotal:     Math.round(debtTotal),
        staleItems:    staleItems,
      },
      monthly: monthly, brands: brands,
    };
    _cSet('dashboard', result, CACHE_TX);
    return _ok(result);
  } catch(e) { return _err(e.message); }
}

// ══════════════════════════════════════════════════════════════════════
//  АНАЛИТИКА
// ══════════════════════════════════════════════════════════════════════
function getAnalytics(p) {
  try {
    var cacheKey = 'analytics_' + (p && p.dateFrom || '') + '_' + (p && p.dateTo || '');
    var cached = _cGet(cacheKey);
    if (cached) return _ok(cached);

    var bMap  = _buildMap(SH.BRANDS, 'id', 'name');
    var mMap  = _buildMap(SH.MODELS, 'id', 'name');
    var purMap = {};
    _rows(SH.PURCHASES).forEach(function(r){ purMap[parseInt(r.id)] = r; });
    var sales = _rows(SH.SALES)
      .filter(function(r){ return r.id && _inRange(r.sale_date, p && p.dateFrom, p && p.dateTo); });

    var mMap2 = {};
    sales.forEach(function(s) {
      var m = String(s.sale_date||'').slice(0,7); if(!m) return;
      if(!mMap2[m]) mMap2[m] = { rev:0, profit:0 };
      var pur  = purMap[parseInt(s.purchase_id)] || {};
      var qty  = (pur.has_imei==='TRUE'||pur.has_imei===true)?1:(parseInt(pur.qty)||1);
      mMap2[m].rev    += parseFloat(s.total_kgs)||0;
      mMap2[m].profit += (parseFloat(s.total_kgs)||0) - (parseFloat(pur.cost_kgs)||0)*qty;
    });
    var monthly = Object.keys(mMap2).sort().map(function(m){
      return { m:m.slice(5,7)+'/'+m.slice(2,4), rev:Math.round(mMap2[m].rev), profit:Math.round(mMap2[m].profit) };
    });

    var brandMap = {};
    sales.forEach(function(s) {
      var pur  = purMap[parseInt(s.purchase_id)]||{};
      var bn   = bMap[parseInt(pur.brand_id)]||'Прочее';
      var qty  = (pur.has_imei==='TRUE'||pur.has_imei===true)?1:(parseInt(pur.qty)||1);
      if(!brandMap[bn]) brandMap[bn]={brand:bn,sold:0,rev:0,profit:0};
      brandMap[bn].sold++;
      brandMap[bn].rev    += parseFloat(s.total_kgs)||0;
      brandMap[bn].profit += (parseFloat(s.total_kgs)||0)-(parseFloat(pur.cost_kgs)||0)*qty;
    });
    var brandStats = Object.values(brandMap).sort(function(a,b){return b.rev-a.rev;}).map(function(b){
      return {brand:b.brand,sold:b.sold,rev:Math.round(b.rev),profit:Math.round(b.profit),
              margin:b.rev>0?Math.round(b.profit/b.rev*100):0};
    });

    var cntMap={}, profMap={};
    sales.forEach(function(s){
      var pur  = purMap[parseInt(s.purchase_id)]||{};
      var key  = (bMap[parseInt(pur.brand_id)]||'')+' '+(mMap[parseInt(pur.model_id)]||'');
      var qty  = (pur.has_imei==='TRUE'||pur.has_imei===true)?1:(parseInt(pur.qty)||1);
      cntMap[key]  = (cntMap[key]||0)+1;
      profMap[key] = (profMap[key]||0)+(parseFloat(s.total_kgs)||0)-(parseFloat(pur.cost_kgs)||0)*qty;
    });
    var topByCount  = Object.keys(cntMap).sort(function(a,b){return cntMap[b]-cntMap[a];}).slice(0,10)
      .map(function(k){return{model:k,cnt:cntMap[k]};});
    var topByProfit = Object.keys(profMap).sort(function(a,b){return profMap[b]-profMap[a];}).slice(0,10)
      .map(function(k){return{model:k,profit:Math.round(profMap[k])};});

    var result = { monthly:monthly, brandStats:brandStats, topByCount:topByCount, topByProfit:topByProfit };
    _cSet(cacheKey, result, CACHE_TX);
    return _ok(result);
  } catch(e) { return _err(e.message); }
}

// ══════════════════════════════════════════════════════════════════════
//  ДОЛГИ
// ══════════════════════════════════════════════════════════════════════
function getDebts() {
  try {
    var sales    = _rows(SH.SALES).filter(function(r){ return r.id; });
    var payments = _rows(SH.PAYMENTS).filter(function(r){ return r.id; });
    var saleMap  = {}; sales.forEach(function(s){ saleMap[parseInt(s.id)] = s; });

    // Долги покупателей
    var buyerMap = {};
    sales.forEach(function(s) {
      var debt = parseFloat(s.debt_kgs) || 0;
      if (debt <= 0) return;
      if (!buyerMap[s.buyer]) buyerMap[s.buyer] = { buyer: s.buyer, debt_kgs: 0, last_pay: '', pay_count: 0 };
      buyerMap[s.buyer].debt_kgs += debt;
    });
    payments.forEach(function(pay) {
      var sale = saleMap[parseInt(pay.sale_id)]; if (!sale) return;
      var b = buyerMap[sale.buyer]; if (!b) return;
      b.pay_count++;
      if (!b.last_pay || String(pay.pay_date) > b.last_pay) b.last_pay = pay.pay_date;
    });
    var buyers = Object.values(buyerMap).sort(function(a,b){ return b.debt_kgs - a.debt_kgs; });

    // Долги поставщикам (по закупкам)
    var suppliers = _rows(SH.SUPPLIERS).filter(function(r){ return r.id; });
    var purchases = _rows(SH.PURCHASES).filter(function(r){ return r.id && r.supplier_id; });
    var sMap      = {}; suppliers.forEach(function(s){ sMap[parseInt(s.id)] = s; });
    var supDebt   = {};
    purchases.forEach(function(pur) {
      var sid = parseInt(pur.supplier_id); if (!sid) return;
      if (!supDebt[sid]) supDebt[sid] = { name: (sMap[sid] || {}).name || '', total_usd: 0 };
      var qty = (pur.has_imei === 'TRUE' || pur.has_imei === true) ? 1 : (parseInt(pur.qty) || 1);
      supDebt[sid].total_usd += (parseFloat(pur.cost_usd) || 0) * qty;
    });
    var suppliersArr = Object.keys(supDebt).map(function(sid) {
      var s = supDebt[sid];
      return { name: s.name, total: Math.round(s.total_usd*100)/100, paid: 0, rest: Math.round(s.total_usd*100)/100,
               currency: 'USD', status: s.total_usd > 0 ? 'Долг' : 'Оплачено' };
    });

    return _ok({ buyers: buyers, suppliers: suppliersArr });
  } catch(e) { return _err(e.message); }
}
