// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · Wallets.gs
//  Кошельки, кассовые операции
//  Materialized Balance: current_balance, total_in, total_out
// ══════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════
//  КОШЕЛЬКИ
// ══════════════════════════════════════════════════════════════════════
function getWallets() {
  try {
    var cached = _cGet('wallets');
    if (cached) return _ok(cached);

    var wallets    = _rows(SH.WALLETS).filter(function(r){ return r.id && r.name; });
    var currencies = _rows(SH.CURRENCIES);
    var currMap = {};
    currencies.forEach(function(c){ currMap[parseInt(c.id)] = c.name; });

    var result = wallets.map(function(w) {
      return {
        id:        parseInt(w.id),
        name:      w.name,
        currency:  currMap[parseInt(w.currency_id)] || String(w.currency_id) || 'KGS',
        icon:      w.icon || '💰',
        note:      w.note || '',
        balance:   Math.round(parseFloat(w.current_balance) || (parseFloat(w.start_balance) || 0)),
        total_in:  Math.round(parseFloat(w.total_in)  || 0),
        total_out: Math.round(parseFloat(w.total_out) || 0),
      };
    });

    _cSet('wallets', result, CACHE_TTL);
    return _ok(result);
  } catch(e) { return _err(e.message); }
}

function addWallet(p) {
  return _withLock(function() {
    try {
      var startBal = parseFloat(p.start_balance) || 0;
      var obj = {
        name:            p.name || '',
        currency_id:     parseInt(p.currency_id) || 1,
        icon:            p.icon || '💰',
        start_balance:   startBal,
        note:            p.note || '',
        current_balance: startBal,
        total_in:        0,
        total_out:       0,
        created_at:      _now(),
      };
      var newId = _append(SH.WALLETS, obj);
      _cDel(['wallets']);
      return _ok({ id: newId });
    } catch(e) { return _err(e.message); }
  });
}

function updateWallet(p) {
  return _withLock(function() {
    try {
      _update(SH.WALLETS, p.id, {
        name: p.name || '', currency_id: parseInt(p.currency_id) || 1,
        icon: p.icon || '💰', note: p.note || '',
      });
      _cDel(['wallets']);
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

// Атомарное обновление баланса кошелька (Materialized Balance, прямая запись)
function _adjustBalance(walletId, amount, isIncome) {
  var sh    = _sh(SH.WALLETS);
  var rowN  = _findRow(sh, walletId);
  if (rowN < 2) return;
  var ncol  = sh.getLastColumn();
  var heads = sh.getRange(1, 1, 1, ncol).getValues()[0];
  var vals  = sh.getRange(rowN, 1, 1, ncol).getValues()[0];

  var cbIdx = heads.indexOf('current_balance');
  var tiIdx = heads.indexOf('total_in');
  var toIdx = heads.indexOf('total_out');
  var sbIdx = heads.indexOf('start_balance');
  var uaIdx = heads.indexOf('updated_at');

  var cur  = parseFloat(vals[cbIdx]) || (parseFloat(vals[sbIdx]) || 0);
  var tIn  = parseFloat(vals[tiIdx])  || 0;
  var tOut = parseFloat(vals[toIdx]) || 0;
  var amt  = parseFloat(amount) || 0;

  if (isIncome) { cur += amt; tIn  += amt; }
  else          { cur -= amt; tOut += amt; }

  vals[cbIdx] = Math.round(cur);
  vals[tiIdx] = Math.round(tIn);
  vals[toIdx] = Math.round(tOut);
  if (uaIdx >= 0) vals[uaIdx] = _now();

  sh.getRange(rowN, 1, 1, ncol).setValues([vals]);
  _cDel(['wallets']);
}

function getWalletHistory(p) {
  try {
    var wid    = parseInt(p.wallet_id);
    var catMap = _buildMap(SH.CATS,     'id', 'name');
    var artMap = _buildMap(SH.ARTICLES, 'id', 'name');

    var rows = _rows(SH.CASH_OPS)
      .filter(function(r){ return parseInt(r.wallet_id) === wid && _inRange(r.op_date, p.dateFrom, p.dateTo); })
      .map(function(r) {
        return {
          op_date:      r.op_date,
          op_type:      r.op_type,
          cat_name:     catMap[parseInt(r.cat_id)]     || '',
          article_name: artMap[parseInt(r.article_id)] || '',
          counterpart:  r.counterpart || '',
          comment:      r.comment     || '',
          amount:       parseFloat(r.amount) || 0,
        };
      })
      .sort(function(a, b){ return (b.op_date || '').localeCompare(a.op_date || ''); });

    return _ok({ rows: rows, total: rows.length });
  } catch(e) { return _err(e.message); }
}

// ══════════════════════════════════════════════════════════════════════
//  КАССОВЫЕ ОПЕРАЦИИ
// ══════════════════════════════════════════════════════════════════════
function getCashOps(p) {
  try {
    var catMap = _buildMap(SH.CATS,     'id', 'name');
    var artMap = _buildMap(SH.ARTICLES, 'id', 'name');
    var wltMap = _buildMap(SH.WALLETS,  'id', 'name');

    var rows = _rows(SH.CASH_OPS)
      .filter(function(r){ return r.id; })
      .map(function(r) {
        return {
          id:           parseInt(r.id),
          op_date:      r.op_date     || '',
          op_type:      r.op_type     || '',
          wallet_id:    parseInt(r.wallet_id),
          wallet_name:  wltMap[parseInt(r.wallet_id)]  || '',
          cat_id:       parseInt(r.cat_id),
          cat_name:     catMap[parseInt(r.cat_id)]     || '',
          article_id:   parseInt(r.article_id),
          article_name: artMap[parseInt(r.article_id)] || '',
          counterpart:  r.counterpart  || '',
          comment:      r.comment      || '',
          amount:       parseFloat(r.amount) || 0,
        };
      });

    if (p) {
      if (p.wallet_id && parseInt(p.wallet_id)) rows = rows.filter(function(r){ return r.wallet_id === parseInt(p.wallet_id); });
      if (p.op_type)   rows = rows.filter(function(r){ return r.op_type === p.op_type; });
      if (p.cat_id && parseInt(p.cat_id)) rows = rows.filter(function(r){ return r.cat_id === parseInt(p.cat_id); });
      if (p.dateFrom || p.dateTo) rows = rows.filter(function(r){ return _inRange(r.op_date, p.dateFrom, p.dateTo); });
    }
    rows.sort(function(a, b){ return (b.op_date || '').localeCompare(a.op_date || ''); });

    var page  = parseInt(p && p.page) || 1;
    var size  = parseInt(p && p.size) || 100;
    var paged = (size >= 999) ? rows : rows.slice((page - 1) * size, page * size);
    return _ok({ rows: paged, total: rows.length });
  } catch(e) { return _err(e.message); }
}

function addCashOp(p) {
  return _withLock(function() {
    try {
      if (!parseInt(p.wallet_id))          return _err('Не указан кошелёк');
      if (!parseInt(p.cat_id))             return _err('Не указана категория');
      if (!(parseFloat(p.amount) > 0))     return _err('Некорректная сумма');

      var id = _appendCashOp({
        wallet_id:   parseInt(p.wallet_id),
        op_type:     p.op_type     || 'Расход',
        cat_id:      parseInt(p.cat_id),
        article_id:  parseInt(p.article_id) || '',
        amount:      parseFloat(p.amount),
        op_date:     p.op_date     || _today(),
        counterpart: p.counterpart || '',
        comment:     p.comment     || '',
      });
      // Атомарное обновление баланса
      _adjustBalance(parseInt(p.wallet_id), parseFloat(p.amount), p.op_type === 'Приход');
      _cDel(['wallets', 'dashboard']);
      return _ok({ id: id });
    } catch(e) { return _err(e.message); }
  });
}

// ──────────────────────────────────────────────────────────────────────
//  ПРИВАТНЫЙ ХЕЛПЕР
// ──────────────────────────────────────────────────────────────────────
// Добавляет запись в КассовыеОперации без блокировки (вызов внутри _withLock)
function _appendCashOp(p) {
  var obj = {
    wallet_id:   p.wallet_id,   op_type:     p.op_type     || 'Расход',
    cat_id:      p.cat_id||'',  article_id:  p.article_id  || '',
    amount:      parseFloat(p.amount)||0,
    op_date:     p.op_date     || _today(),
    counterpart: p.counterpart || '', comment: p.comment || '',
    created_at:  _now(),
  };
  return _append(SH.CASH_OPS, obj);
}
