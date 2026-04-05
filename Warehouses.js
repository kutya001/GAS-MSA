// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · Warehouses.gs
//  Склады
//  Materialized Stock: current_items, current_cost_kgs
// ══════════════════════════════════════════════════════════════════════
function getWarehouses() {
  try {
    var whs = _rows(SH.WAREHOUSES).filter(function(r){ return r.id && r.name; });
    var result = whs.map(function(w) {
      return {
        id:          parseInt(w.id),
        name:        w.name,
        address:     w.address     || '',
        responsible: w.responsible || '',
        note:        w.note        || '',
        items:    parseInt(parseFloat(w.current_items) || 0),
        cost_kgs: Math.round(parseFloat(w.current_cost_kgs) || 0),
      };
    });
    return _ok(result);
  } catch(e) { return _err(e.message); }
}

function addWarehouse(p) {
  return _withLock(function() {
    try {
      var obj = {
        name: p.name || '', address: p.address || '',
        responsible: p.responsible || '', note: p.note || '',
        current_items: 0, current_cost_kgs: 0,
        created_at: _today(),
      };
      var newId = _append(SH.WAREHOUSES, obj);
      _cDel(['refData']);
      return _ok({ id: newId });
    } catch(e) { return _err(e.message); }
  });
}

function updateWarehouse(p) {
  return _withLock(function() {
    try {
      _update(SH.WAREHOUSES, p.id, {
        name: p.name || '', address: p.address || '',
        responsible: p.responsible || '', note: p.note || '',
      });
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

// Атомарное обновление остатков склада (Materialized Stock)
function _adjustWarehouse(whId, qty, costKgs, add) {
  var sh   = _sh(SH.WAREHOUSES);
  var rowN = _findRow(sh, whId);
  if (rowN < 2) return;
  var ncol  = sh.getLastColumn();
  var heads = sh.getRange(1, 1, 1, ncol).getValues()[0];
  var vals  = sh.getRange(rowN, 1, 1, ncol).getValues()[0];
  var obj   = {};
  for (var i = 0; i < heads.length; i++) obj[heads[i]] = vals[i];
  var curItems = parseFloat(obj.current_items) || 0;
  var curCost  = parseFloat(obj.current_cost_kgs) || 0;
  var delta = add ? 1 : -1;
  _update(SH.WAREHOUSES, whId, {
    current_items:    Math.max(0, curItems + delta * qty),
    current_cost_kgs: Math.max(0, Math.round(curCost + delta * costKgs * qty)),
  });
}
