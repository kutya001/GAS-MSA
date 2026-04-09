// ═══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · Helpers.js
//  Базовая инфраструктура: доступ к данным, кэш, блокировки, утилиты
// ═══════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════
//  БЛОКИРОВКА — обёртка для write-функций
// ══════════════════════════════════════════════════════════════════════
function _withLock(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(LOCK_MS);
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════════════════════════
//  ДОСТУП К SPREADSHEET (с кэшированием на время выполнения)
// ══════════════════════════════════════════════════════════════════════
var _ssCache = null;
var _shCache = {};

function _ss() {
  if (_ssCache) return _ssCache;
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID не задан. Запустите initDB().');
  _ssCache = SpreadsheetApp.openById(id);
  return _ssCache;
}

function _sh(name) {
  if (_shCache[name]) return _shCache[name];
  var sh = _ss().getSheetByName(name);
  if (!sh) throw new Error('Лист "' + name + '" не найден. Запустите initDB().');
  _shCache[name] = sh;
  return sh;
}

// Читает весь лист → массив объектов
function _rows(sheetName) {
  var sh   = _sh(sheetName);
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var heads  = data[0];
  var result = new Array(data.length - 1);
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < heads.length; j++) {
      var v = data[i][j];
      obj[heads[j]] = (v instanceof Date)
        ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd')
        : v;
    }
    result[i - 1] = obj;
  }
  return result;
}

// ──────────────────────────────────────────────────────────────────────
//  PK-СЧЁТЧИКИ через PropertiesService → O(1) _append
// ──────────────────────────────────────────────────────────────────────
function _nextId(sheetName) {
  var props = PropertiesService.getScriptProperties();
  var key   = 'SEQ_' + sheetName.replace(/[^A-Za-zА-Яа-я0-9]/g, '_').toUpperCase();
  var cur   = parseInt(props.getProperty(key) || '0');
  var next  = cur + 1;
  props.setProperty(key, String(next));
  return next;
}

// Синхронизирует счётчик с реальным MAX(id) листа (вызывается из initDB)
function _syncSeq(sheetName) {
  var props = PropertiesService.getScriptProperties();
  var key   = 'SEQ_' + sheetName.replace(/[^A-Za-zА-Яа-я0-9]/g, '_').toUpperCase();
  var sh    = _sh(sheetName);
  var data  = sh.getDataRange().getValues();
  var maxId = 0;
  for (var i = 1; i < data.length; i++) {
    var v = parseInt(data[i][0]);
    if (v > maxId) maxId = v;
  }
  props.setProperty(key, String(maxId));
}

// ──────────────────────────────────────────────────────────────────────
//  CRUD-ПРИМИТИВЫ
// ──────────────────────────────────────────────────────────────────────

// Вставка строки без чтения всего листа (O(1))
function _append(sheetName, obj) {
  var sh    = _sh(sheetName);
  var heads = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var newId = _nextId(sheetName);
  obj.id = newId;
  var row = new Array(heads.length);
  for (var i = 0; i < heads.length; i++) {
    row[i] = obj[heads[i]] !== undefined ? obj[heads[i]] : '';
  }
  sh.appendRow(row);
  return newId;
}

// Возвращает номер строки (1-based) по id в колонке A (TextFinder, O(1))
function _findRow(sh, id) {
  var found = sh.getRange('A:A')
                .createTextFinder(String(id))
                .matchEntireCell(true)
                .findNext();
  return found ? found.getRow() : -1;
}

// Точечное обновление полей строки — батч через setValues (1 запись вместо N)
function _update(sheetName, id, obj) {
  var sh    = _sh(sheetName);
  var rowN  = _findRow(sh, id);
  if (rowN < 2) return false;
  var ncol  = sh.getLastColumn();
  var heads = sh.getRange(1, 1, 1, ncol).getValues()[0];
  var vals  = sh.getRange(rowN, 1, 1, ncol).getValues()[0];
  var changed = false;
  for (var j = 0; j < heads.length; j++) {
    var h = heads[j];
    if (h !== 'id' && obj[h] !== undefined) {
      vals[j] = obj[h];
      changed = true;
    }
  }
  // Автоматически проставляем updated_at
  var uaIdx = heads.indexOf('updated_at');
  if (uaIdx >= 0) vals[uaIdx] = _now();
  if (changed) sh.getRange(rowN, 1, 1, ncol).setValues([vals]);
  return true;
}

// Удаление строки по id (O(1))
function _delete(sheetName, id) {
  var sh   = _sh(sheetName);
  var rowN = _findRow(sh, id);
  if (rowN < 2) return false;
  sh.deleteRow(rowN);
  return true;
}

// Чтение одной строки по id (TextFinder)
function _findById(sheetName, id) {
  var sh    = _sh(sheetName);
  var rowN  = _findRow(sh, id);
  if (rowN < 2) return null;
  var ncol  = sh.getLastColumn();
  var heads = sh.getRange(1, 1, 1, ncol).getValues()[0];
  var vals  = sh.getRange(rowN, 1, 1, ncol).getValues()[0];
  var obj   = {};
  for (var i = 0; i < heads.length; i++) {
    var v = vals[i];
    obj[heads[i]] = (v instanceof Date) ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : v;
  }
  return obj;
}

// Словарь id→value для JOIN (строит map из целого листа)
function _buildMap(sheetName, keyCol, valCol) {
  var map  = {};
  var rows = _rows(sheetName);
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r[keyCol] !== undefined && r[keyCol] !== '') map[parseInt(r[keyCol])] = r[valCol];
  }
  return map;
}

// ══════════════════════════════════════════════════════════════════════
//  КЭШ с чанкированием (лимит 100 КБ/ключ в CacheService)
// ══════════════════════════════════════════════════════════════════════
function _cGet(key) {
  try {
    var cache = CacheService.getScriptCache();
    var meta  = cache.get(key + '_meta');
    if (!meta) return null;
    var m = JSON.parse(meta);
    if (m.chunks === 1) {
      var v = cache.get(key + '_0');
      return v ? JSON.parse(v) : null;
    }
    var parts = [];
    for (var i = 0; i < m.chunks; i++) {
      var part = cache.get(key + '_' + i);
      if (!part) return null;
      parts.push(part);
    }
    return JSON.parse(parts.join(''));
  } catch(e) { return null; }
}

function _cSet(key, data, ttl) {
  try {
    var cache  = CacheService.getScriptCache();
    var t      = ttl || CACHE_TTL;
    var s      = JSON.stringify(data);
    var chunks = [];
    for (var i = 0; i < s.length; i += CHUNK) chunks.push(s.slice(i, i + CHUNK));
    var puts = {};
    for (var j = 0; j < chunks.length; j++) puts[key + '_' + j] = chunks[j];
    puts[key + '_meta'] = JSON.stringify({ chunks: chunks.length });
    cache.putAll(puts, t);
  } catch(e) {}
}

function _cDel(keys) {
  try {
    var toRemove = ['refData_meta', 'refData_0'];
    if (keys) {
      keys.forEach(function(k) {
        toRemove.push(k + '_meta');
        for (var i = 0; i < 10; i++) toRemove.push(k + '_' + i);
      });
    }
    CacheService.getScriptCache().removeAll(toRemove);
  } catch(e) {}
}

// ══════════════════════════════════════════════════════════════════════
//  СТАНДАРТНЫЕ ОТВЕТЫ И УТИЛИТЫ
// ══════════════════════════════════════════════════════════════════════
function _ok(data)  { return { status: 'ok',    data: data }; }
function _err(msg)  { return { status: 'error', message: String(msg) }; }
function _today()   { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function _now()     { return Utilities.formatDate(new Date(), TZ, 'dd.MM.yyyy - HH-mm-ss'); }

function _inRange(d, from, to) {
  if (!d) return true;
  var s = String(d);
  if (from && s < String(from)) return false;
  if (to   && s > String(to))   return false;
  return true;
}
