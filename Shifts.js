// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · Shifts.gs
//  Модуль управления кассовыми сменами
// ══════════════════════════════════════════════════════════════════════

/**
 * Проверяет наличие открытой смены для указанного менеджера
 * p.manager_id (optional) - если не передан, ищет для любого (?) или текущего
 */
function getShiftStatus(p) {
  try {
    const managerId = parseInt(p && p.manager_id);
    const shifts = _rows(SH.SHIFTS);
    
    // Ищем последнюю открытую смену
    const openShift = shifts.find(r => {
      const isManager = managerId ? parseInt(r.manager_id) === managerId : true;
      return isManager && r.status === 'Открыта';
    });
    
    return _ok(openShift || null);
  } catch (e) {
    return _err(e.message);
  }
}

/**
 * Открывает новую смену
 * p.manager_id
 * p.note
 */
function openShift(p) {
  return _withLock(function() {
    try {
      if (!p.manager_id) return _err('Не указан менеджер');
      
      // Проверяем, нет ли уже открытой смены для этого менеджера
      const status = getShiftStatus({ manager_id: p.manager_id });
      if (status.data) return _err('Смена уже открыта');
      
      // Получаем текущие балансы всех POS-кошельков для фиксации
      const walletsRes = getWallets();
      const balances = {};
      if (walletsRes.status === 'ok') {
        walletsRes.data.filter(w => w.is_pos).forEach(w => {
          balances[w.id] = w.balance;
        });
      }
      
      const obj = {
        manager_id: parseInt(p.manager_id),
        opened_at: _now(),
        status: 'Открыта',
        start_balances: JSON.stringify(balances),
        note: p.note || '',
        created_at: _now()
      };
      
      const id = _append(SH.SHIFTS, obj);
      _cDel(['shifts', 'dashboard']);
      
      return _ok({ id: id });
    } catch (e) {
      return _err(e.message);
    }
  });
}

/**
 * Закрывает смену
 * p.id - ID смены
 * p.note
 */
function closeShift(p) {
  return _withLock(function() {
    try {
      const shiftId = parseInt(p.id);
      const shift = _findById(SH.SHIFTS, shiftId);
      if (!shift) return _err('Смена не найдена');
      if (shift.status === 'Закрыта') return _err('Смена уже закрыта');
      
      // Считаем выручку за смену
      const ops = _rows(SH.CASH_OPS).filter(r => parseInt(r.shift_id) === shiftId);
      let revenue = 0;
      ops.forEach(r => {
        if (r.op_type === 'Приход') revenue += (parseFloat(r.amount) || 0);
        else revenue -= (parseFloat(r.amount) || 0);
      });
      
      // Фиксируем конечные балансы
      const walletsRes = getWallets();
      const endBalances = {};
      if (walletsRes.status === 'ok') {
        walletsRes.data.filter(w => w.is_pos).forEach(w => {
          endBalances[w.id] = w.balance;
        });
      }
      
      const updateObj = {
        closed_at: _now(),
        status: 'Закрыта',
        end_balances: JSON.stringify(endBalances),
        revenue_kgs: revenue,
        note: p.note || shift.note,
        updated_at: _now()
      };
      
      _update(SH.SHIFTS, shiftId, updateObj);
      _cDel(['shifts', 'dashboard']);
      
      return _ok({ revenue: revenue });
    } catch (e) {
      return _err(e.message);
    }
  });
}

/**
 * История смен
 */
function getShiftHistory(p) {
  try {
    const managers = _buildMap(SH.MANAGERS, 'id', 'name');
    const rows = _rows(SH.SHIFTS)
      .map(r => {
        return {
          id: parseInt(r.id),
          manager_id: parseInt(r.manager_id),
          manager_name: managers[parseInt(r.manager_id)] || '?',
          opened_at: r.opened_at,
          closed_at: r.closed_at,
          status: r.status,
          revenue: parseFloat(r.revenue_kgs) || 0,
          note: r.note || ''
        };
      })
      .sort((a, b) => b.id - a.id);
      
    return _ok(rows);
  } catch (e) {
    return _err(e.message);
  }
}

/**
 * Получает полную детализацию по смене
 */
function getShiftDetails(p) {
  try {
    const shiftId = parseInt(p.shift_id);
    const shift = _findById(SH.SHIFTS, shiftId);
    if (!shift) return _err('Смена #'+shiftId+' не найдена');
    
    // 1. Смена и балансы (парсим JSON)
    shift.start_balances = JSON.parse(shift.start_balances || '{}');
    shift.end_balances = JSON.parse(shift.end_balances || '{}');
    
    // 2. Продажи за смену
    const prodMap = _buildMap(SH.MDM_PRODUCTS, 'id', 'name');
    const sales = _rows(SH.SALES)
      .filter(r => parseInt(r.shift_id) === shiftId)
      .map(r => {
         const pur = _findById(SH.PURCHASES, r.purchase_id) || {};
         return {
           id: parseInt(r.id),
           receipt_id: r.receipt_id,
           product_name: prodMap[parseInt(pur.product_id)] || '?',
           total: parseFloat(r.total_kgs) || 0,
           is_returned: r.is_returned === 'TRUE'
         };
      });
      
    // 3. Кассовые операции за смену
    const catMap = _buildMap(SH.CATS, 'id', 'name');
    const ops = _rows(SH.CASH_OPS)
      .filter(r => parseInt(r.shift_id) === shiftId)
      .map(r => {
        return {
          id: parseInt(r.id),
          op_date: r.op_date,
          op_type: r.op_type,
          cat_name: catMap[parseInt(r.cat_id)] || '?',
          amount: parseFloat(r.amount) || 0,
          comment: r.comment || ''
        };
      });
      
    return _ok({
      shift: shift,
      sales: sales,
      ops: ops
    });
  } catch (e) {
    return _err(e.message);
  }
}
