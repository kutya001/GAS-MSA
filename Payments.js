// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · Payments.gs
//  Оплаты по продажам (частичные и полные)
// ══════════════════════════════════════════════════════════════════════
function getPayments(p) {
  try {
    var saleMap   = {};
    _rows(SH.SALES).forEach(function(s){ saleMap[parseInt(s.id)] = s; });
    var walletMap = _buildMap(SH.WALLETS, 'id', 'name');

    var rows = _rows(SH.PAYMENTS)
      .filter(function(r){ return r.id; })
      .map(function(r) {
        var sale = saleMap[parseInt(r.sale_id)] || {};
        return {
          id:          parseInt(r.id),
          sale_id:     parseInt(r.sale_id),
          buyer:       sale.buyer || '',
          amount:      parseFloat(r.amount)    || 0,
          wallet_name: walletMap[parseInt(r.wallet_id)] || '',
          pay_date:    r.pay_date   || '',
          debt_after:  parseFloat(r.debt_after) || 0,
          note:        r.note || '',
        };
      });

    if (p && (p.dateFrom || p.dateTo))
      rows = rows.filter(function(r){ return _inRange(r.pay_date, p.dateFrom, p.dateTo); });
    rows.sort(function(a, b){ return (b.pay_date || '').localeCompare(a.pay_date || ''); });

    var page  = parseInt(p && p.page) || 1;
    var size  = parseInt(p && p.size) || 100;
    var paged = (size >= 999) ? rows : rows.slice((page - 1) * size, page * size);
    return _ok({ rows: paged, total: rows.length });
  } catch(e) { return _err(e.message); }
}

function addPayment(p) {
  return _withLock(function() {
    try {
      var sale = _findById(SH.SALES, p.sale_id);
      if (!sale) return _err('Продажа #' + p.sale_id + ' не найдена');

      var amt     = parseFloat(p.amount)      || 0;
      var curDebt = parseFloat(sale.debt_kgs) || 0;
      var curPaid = parseFloat(sale.paid_kgs) || 0;
      if (amt > curDebt + 0.01) return _err('Сумма превышает остаток долга (' + Math.round(curDebt) + ' ₸)');

      var newDebt = Math.max(0, curDebt - amt);
      var newId   = _append(SH.PAYMENTS, {
        sale_id: parseInt(p.sale_id), wallet_id: parseInt(p.wallet_id),
        amount: amt, pay_date: p.pay_date || _today(),
        debt_after: Math.round(newDebt), note: p.note || '', created_at: _today(),
      });

      // Обновляем долг в продаже
      _update(SH.SALES, p.sale_id, { paid_kgs: Math.round(curPaid + amt), debt_kgs: Math.round(newDebt) });

      // Приход в кассу + обновление баланса
      if (parseInt(p.wallet_id)) {
        var catId = _findOrCreateCat('Выручка от продаж', 'Приход');
        _appendCashOp({
          wallet_id: parseInt(p.wallet_id), op_type: 'Приход',
          cat_id: catId, article_id: '', amount: Math.round(amt),
          op_date: p.pay_date || _today(),
          counterpart: sale.buyer || '', comment: 'Оплата долга по продаже #' + p.sale_id,
        });
        _adjustBalance(parseInt(p.wallet_id), Math.round(amt), true);
      }

      _cDel(['wallets', 'dashboard']);
      return _ok({ id: newId, newDebt: Math.round(newDebt) });
    } catch(e) { return _err(e.message); }
  });
}
