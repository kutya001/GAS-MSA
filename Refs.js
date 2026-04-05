// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · Refs.gs
//  Справочники (бренды, модели, поставщики, менеджеры, валюты),
//  категории, статьи и связанные хелперы
// ══════════════════════════════════════════════════════════════════════

// Таблица соответствия ключа справочника → имени листа из SH
var REF_MAP = {
  brands:     'BRANDS',
  models:     'MODELS',
  suppliers:  'SUPPLIERS',
  managers:   'MANAGERS',
  currencies: 'CURRENCIES',
};

// ══════════════════════════════════════════════════════════════════════
//  СПРАВОЧНИКИ
// ══════════════════════════════════════════════════════════════════════
function getRefData() {
  try {
    var cached = _cGet('refData');
    if (cached) return _ok(cached);
    var data = {
      brands:     _rows(SH.BRANDS).filter(function(r){ return r.id && r.name; }),
      models:     _rows(SH.MODELS).filter(function(r){ return r.id && r.name; }),
      suppliers:  _rows(SH.SUPPLIERS).filter(function(r){ return r.id && r.name; }),
      managers:   _rows(SH.MANAGERS).filter(function(r){ return r.id && r.name; }),
      currencies: _rows(SH.CURRENCIES).filter(function(r){ return r.id && r.name; }),
    };
    _cSet('refData', data, CACHE_TTL);
    return _ok(data);
  } catch(e) { return _err(e.message); }
}

function addRef(p) {
  return _withLock(function() {
    try {
      if (!REF_MAP[p.tab]) return _err('Неизвестный справочник: ' + p.tab);
      var shName = SH[REF_MAP[p.tab]];
      var obj = { name: p.name || '', info: p.info || '' };
      if (p.tab === 'models' && p.brand_id) obj.brand_id = parseInt(p.brand_id);
      var newId = _append(shName, obj);
      _cDel(['refData']);
      return _ok({ id: newId });
    } catch(e) { return _err(e.message); }
  });
}

function updateRef(p) {
  return _withLock(function() {
    try {
      if (!REF_MAP[p.tab]) return _err('Неизвестный справочник: ' + p.tab);
      var obj = { name: p.name || '', info: p.info || '' };
      if (p.tab === 'models' && p.brand_id) obj.brand_id = parseInt(p.brand_id);
      _update(SH[REF_MAP[p.tab]], p.id, obj);
      _cDel(['refData']);
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

function deleteRef(p) {
  return _withLock(function() {
    try {
      if (!REF_MAP[p.tab]) return _err('Неизвестный справочник: ' + p.tab);
      _delete(SH[REF_MAP[p.tab]], p.id);
      _cDel(['refData']);
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

// ══════════════════════════════════════════════════════════════════════
//  КАТЕГОРИИ
// ══════════════════════════════════════════════════════════════════════
function getCats() {
  try {
    return _ok(_rows(SH.CATS).filter(function(r){ return r.id && r.name; }));
  } catch(e) { return _err(e.message); }
}

function addCat(p) {
  return _withLock(function() {
    try {
      var id = _append(SH.CATS, { op_type: p.op_type || 'Расход', name: p.name || '', note: p.note || '' });
      return _ok({ id: id });
    } catch(e) { return _err(e.message); }
  });
}

function updateCat(p) {
  return _withLock(function() {
    try {
      _update(SH.CATS, p.id, { op_type: p.op_type, name: p.name || '', note: p.note || '' });
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

function deleteCat(p) {
  return _withLock(function() {
    try {
      _delete(SH.CATS, p.id);
      // Каскадное удаление статей данной категории
      var sh   = _sh(SH.ARTICLES);
      var data = sh.getDataRange().getValues();
      var ci   = data[0].indexOf('cat_id');
      if (ci >= 0) {
        for (var i = data.length - 1; i >= 1; i--) {
          if (parseInt(data[i][ci]) === parseInt(p.id)) sh.deleteRow(i + 1);
        }
      }
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

// ══════════════════════════════════════════════════════════════════════
//  СТАТЬИ
// ══════════════════════════════════════════════════════════════════════
function getArticles() {
  try {
    return _ok(_rows(SH.ARTICLES).filter(function(r){ return r.id && r.name; }));
  } catch(e) { return _err(e.message); }
}

function addArticle(p) {
  return _withLock(function() {
    try {
      var id = _append(SH.ARTICLES, { cat_id: parseInt(p.cat_id), name: p.name || '', note: p.note || '' });
      return _ok({ id: id });
    } catch(e) { return _err(e.message); }
  });
}

function updateArticle(p) {
  return _withLock(function() {
    try {
      _update(SH.ARTICLES, p.id, { cat_id: parseInt(p.cat_id), name: p.name || '', note: p.note || '' });
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

function deleteArticle(p) {
  return _withLock(function() {
    try { _delete(SH.ARTICLES, p.id); return _ok({}); }
    catch(e) { return _err(e.message); }
  });
}

// ──────────────────────────────────────────────────────────────────────
//  ПРИВАТНЫЙ ХЕЛПЕР
// ──────────────────────────────────────────────────────────────────────
// Возвращает id категории по имени и типу, при отсутствии — создаёт
function _findOrCreateCat(name, opType) {
  var cats = _rows(SH.CATS);
  for (var i = 0; i < cats.length; i++) {
    if (cats[i].name === name && cats[i].op_type === opType) return parseInt(cats[i].id);
  }
  return _append(SH.CATS, { op_type: opType, name: name, note: 'Авто-создано' });
}
