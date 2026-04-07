// ═══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · MDM.gs  v1.1
//  ─────────────────────────────────────────────────────────────────────
//  Master Data Management — управление мастер-данными номенклатуры:
//    • Шаблоны     (Templates)     — метаданные категорий
//    • Атрибуты    (Attributes)    — EAV-поля шаблонов
//    • Номенклатура (Products)     — карточки товаров
//
//  Справочники — из существующих таблиц БД (Ref_Бренды, Ref_Модели …).
//  Архитектура по FSD: гибридная модель EAV + JSON attributeValues.
//  Зависимости:  Config.js (SH), Helpers.js (_rows, _append, …)
// ═══════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════
//  ДОПУСТИМЫЕ ТИПЫ АТРИБУТОВ
// ══════════════════════════════════════════════════════════════════════
var MDM_ATTR_TYPES = [
  'string','integer','float','boolean',
  'date','time','datetime','color_rgb',
  'enum_radio','enum_checkbox',
  'reference','calculated'
];

// Таблицы БД, доступные как справочники для атрибутов типа «reference»
var MDM_REF_TABLES = {
  brands:     { sheet: 'BRANDS',     label: 'Бренды' },
  models:     { sheet: 'MODELS',     label: 'Модели' },
  suppliers:  { sheet: 'SUPPLIERS',  label: 'Поставщики' },
  managers:   { sheet: 'MANAGERS',   label: 'Менеджеры' },
  currencies: { sheet: 'CURRENCIES', label: 'Валюты' },
  wallets:    { sheet: 'WALLETS',    label: 'Кошельки' },
  warehouses: { sheet: 'WAREHOUSES', label: 'Склады' },
  cats:       { sheet: 'CATS',       label: 'Категории' },
  articles:   { sheet: 'ARTICLES',   label: 'Статьи' },
};

// ══════════════════════════════════════════════════════════════════════
//  ШАБЛОНЫ (Templates) + АТРИБУТЫ (Attributes)
// ══════════════════════════════════════════════════════════════════════

/**
 * Получить все шаблоны с вложенными атрибутами
 */
function getTemplates() {
  try {
    var cached = _cGet('mdm_templates');
    if (cached) return _ok(cached);

    var tRows = _rows(SH.MDM_TEMPLATES).filter(function(r) { return r.id; });
    var aRows = _rows(SH.MDM_ATTRS).filter(function(r) { return r.id && r.template_id; });

    // Группируем атрибуты по template_id
    var attrMap = {};
    for (var i = 0; i < aRows.length; i++) {
      var a  = aRows[i];
      var tid = parseInt(a.template_id);
      if (!attrMap[tid]) attrMap[tid] = [];
      attrMap[tid].push({
        id:            parseInt(a.id),
        template_id:   tid,
        name:          a.name || '',
        type:          a.type || 'string',
        description:   a.description || '',
        is_required:   (a.is_required === 'TRUE' || a.is_required === true),
        display_style: a.display_style || '',
        options:       a.options || '',
        ref_table:     a.ref_table || '',
        formula:       a.formula || '',
        sort_order:    parseInt(a.sort_order) || 0,
      });
    }

    // Создание плоского списка с class_id/type_id/purpose_id
    var result = tRows.map(function(t) {
      var tid = parseInt(t.id);
      var attrs = (attrMap[tid] || []).sort(function(a, b) { return a.sort_order - b.sort_order; });
      return {
        id:          tid,
        class_id:    t.class_id ? parseInt(t.class_id) : null,
        type_id:     t.type_id ? parseInt(t.type_id) : null,
        purpose_id:  t.purpose_id ? parseInt(t.purpose_id) : null,
        name:        t.name || '',
        description: t.description || '',
        attributes:  attrs,
      };
    });

    _cSet('mdm_templates', result, CACHE_TTL);
    return _ok(result);
  } catch(e) { return _err(e.message); }
}

/**
 * Создать/обновить шаблон вместе с атрибутами (Upsert)
 * @param {Object} p  { name, description, attributes: [] }
 *   Каждый атрибут: { name, type, description, is_required, display_style,
 *                     options, ref_table, formula, sort_order }
 */
function saveTemplate(p) {
  return _withLock(function() {
    try {
      if (!(p.name || '').trim()) return _err('Укажите название шаблона');

      // Валидация атрибутов
      var attrs = Array.isArray(p.attributes) ? p.attributes : [];
      for (var i = 0; i < attrs.length; i++) {
        var a = attrs[i];
        if (!(a.name || '').trim()) return _err('Атрибут #' + (i + 1) + ': не указано название');
        if (MDM_ATTR_TYPES.indexOf(a.type) === -1) return _err('Атрибут "' + a.name + '": неизвестный тип "' + a.type + '"');
        if (a.type === 'reference' && !a.ref_table) return _err('Атрибут "' + a.name + '": укажите таблицу-справочник');
        if (a.type === 'calculated' && !(a.formula || '').trim()) return _err('Атрибут "' + a.name + '": укажите формулу');
        if ((a.type === 'enum_radio' || a.type === 'enum_checkbox') && !(a.options || '').trim()) {
          return _err('Атрибут "' + a.name + '": укажите варианты выбора');
        }
      }

      var templateId;
      if (p.id) {
        // Обновление существующего шаблона
        templateId = parseInt(p.id);
        var upd = { name: p.name.trim(), description: p.description || '' };
        if (p.class_id !== undefined)   upd.class_id   = p.class_id   || '';
        if (p.type_id !== undefined)    upd.type_id    = p.type_id    || '';
        if (p.purpose_id !== undefined) upd.purpose_id = p.purpose_id || '';
        _update(SH.MDM_TEMPLATES, p.id, upd);
        // Удаляем старые атрибуты этого шаблона
        _deleteAttrsByTemplate(templateId);
      } else {
        // Новый шаблон
        templateId = _append(SH.MDM_TEMPLATES, {
          class_id:    p.class_id    || '',
          type_id:     p.type_id     || '',
          purpose_id:  p.purpose_id  || '',
          name:        p.name.trim(),
          description: p.description || ''
        });
      }

      // Создаём атрибуты
      for (var j = 0; j < attrs.length; j++) {
        var at = attrs[j];
        _append(SH.MDM_ATTRS, {
          template_id:   templateId,
          name:          (at.name || '').trim(),
          type:          at.type || 'string',
          description:   at.description || '',
          is_required:   at.is_required ? 'TRUE' : 'FALSE',
          display_style: at.display_style || '',
          options:       at.options || '',
          ref_table:     at.ref_table || '',
          formula:       at.formula || '',
          sort_order:    j + 1,
        });
      }

      _cDel(['mdm_templates']);
      return _ok({ id: templateId });
    } catch(e) { return _err(e.message); }
  });
}

/**
 * Удалить шаблон (только если нет связанных товаров)
 * @param {Object} p  { id }
 */
function deleteTemplate(p) {
  return _withLock(function() {
    try {
      if (!p.id) return _err('Не указан id шаблона');
      var tid = parseInt(p.id);

      // Проверяем: нет ли товаров с этим шаблоном
      var products = _rows(SH.MDM_PRODUCTS);
      for (var i = 0; i < products.length; i++) {
        if (parseInt(products[i].template_id) === tid) {
          return _err('Невозможно удалить: существуют связанные товары (' + products[i].name + ')');
        }
      }

      // Удаляем атрибуты шаблона и сам шаблон
      _deleteAttrsByTemplate(tid);
      _delete(SH.MDM_TEMPLATES, p.id);
      _cDel(['mdm_templates']);
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

/**
 * Удаляет все атрибуты данного шаблона (вспомогательная)
 */
function _deleteAttrsByTemplate(templateId) {
  var sh   = _sh(SH.MDM_ATTRS);
  var data = sh.getDataRange().getValues();
  var col  = data[0].indexOf('template_id');
  if (col < 0) return;
  for (var i = data.length - 1; i >= 1; i--) {
    if (parseInt(data[i][col]) === parseInt(templateId)) {
      sh.deleteRow(i + 1);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
//  НОМЕНКЛАТУРА (Products)
// ══════════════════════════════════════════════════════════════════════

/**
 * Получить номенклатуру. Опциональная фильтрация по templateId.
 * @param {Object} p  { templateId?, page?, size? }
 */
function getMDMProducts(p) {
  try {
    var filterKey = (p && p.templateId) ? 'mdm_products_t' + p.templateId : 'mdm_products_all';
    var cached = _cGet(filterKey);
    if (cached) return _ok(cached);

    var rows = _rows(SH.MDM_PRODUCTS)
      .filter(function(r) { return r.id; })
      .map(function(r) {
        var av = {};
        try { av = JSON.parse(r.attribute_values || '{}'); } catch(e) {}
        return {
          id:               parseInt(r.id),
          template_id:      parseInt(r.template_id),
          sku:              r.sku || '',
          name:             r.name || '',
          attribute_values: av,
          created_at:       r.created_at || '',
        };
      });

    if (p && p.templateId) {
      var tid = parseInt(p.templateId);
      rows = rows.filter(function(r) { return r.template_id === tid; });
    }

    rows.sort(function(a, b) { return b.id - a.id; });

    var page  = parseInt(p && p.page) || 1;
    var size  = parseInt(p && p.size) || 100;
    var total = rows.length;
    var paged = (size >= 999) ? rows : rows.slice((page - 1) * size, page * size);
    var result = { rows: paged, total: total, page: page, size: size };

    _cSet(filterKey, result, CACHE_TX);
    return _ok(result);
  } catch(e) { return _err(e.message); }
}

/**
 * Создать номенклатурную позицию
 * @param {Object} p  { template_id, sku, name, attribute_values: {} }
 */
function addMDMProduct(p) {
  return _withLock(function() {
    try {
      if (!p.template_id) return _err('Не указан шаблон товара');
      if (!(p.name || '').trim()) return _err('Укажите наименование товара');

      // Валидация по схеме шаблона
      var validErr = _validateProductAttrs(parseInt(p.template_id), p.attribute_values || {});
      if (validErr) return _err(validErr);

      var av = (typeof p.attribute_values === 'string')
        ? p.attribute_values
        : JSON.stringify(p.attribute_values || {});

      var newId = _append(SH.MDM_PRODUCTS, {
        template_id:      parseInt(p.template_id),
        sku:              (p.sku || '').trim(),
        name:             (p.name || '').trim(),
        attribute_values: av,
        created_at:       _today(),
      });

      _cDel(['mdm_products_all', 'mdm_products_t' + p.template_id]);
      return _ok({ id: newId });
    } catch(e) { return _err(e.message); }
  });
}

/**
 * Обновить номенклатурную позицию
 * @param {Object} p  { id, template_id?, sku?, name?, attribute_values? }
 */
function updateMDMProduct(p) {
  return _withLock(function() {
    try {
      if (!p.id) return _err('Не указан id товара');

      var obj = {};
      if (p.sku !== undefined)  obj.sku  = (p.sku  || '').trim();
      if (p.name !== undefined) obj.name = (p.name || '').trim();

      if (p.attribute_values !== undefined) {
        // Валидация, если передан template_id
        var tid = p.template_id || null;
        if (!tid) {
          var existing = _findById(SH.MDM_PRODUCTS, p.id);
          if (existing) tid = parseInt(existing.template_id);
        }
        if (tid) {
          var validErr = _validateProductAttrs(parseInt(tid), p.attribute_values || {});
          if (validErr) return _err(validErr);
        }
        obj.attribute_values = (typeof p.attribute_values === 'string')
          ? p.attribute_values
          : JSON.stringify(p.attribute_values || {});
      }

      _update(SH.MDM_PRODUCTS, p.id, obj);
      _cDel(['mdm_products_all']);
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

/**
 * Удалить номенклатурную позицию
 * @param {Object} p  { id }
 */
function deleteMDMProduct(p) {
  return _withLock(function() {
    try {
      if (!p.id) return _err('Не указан id товара');
      _delete(SH.MDM_PRODUCTS, p.id);
      _cDel(['mdm_products_all']);
      return _ok({});
    } catch(e) { return _err(e.message); }
  });
}

// ══════════════════════════════════════════════════════════════════════
//  ВАЛИДАЦИЯ АТРИБУТОВ ПРОТИВ СХЕМЫ ШАБЛОНА
// ══════════════════════════════════════════════════════════════════════

/**
 * Проверяет attribute_values на соответствие правилам шаблона.
 * Возвращает строку ошибки или null если всё ОК.
 */
function _validateProductAttrs(templateId, attrValues) {
  var attrs = _rows(SH.MDM_ATTRS).filter(function(a) {
    return parseInt(a.template_id) === templateId;
  });

  for (var i = 0; i < attrs.length; i++) {
    var a   = attrs[i];
    var aid = String(a.id);
    var val = attrValues[aid];

    // Пропускаем расчётные поля
    if (a.type === 'calculated') continue;

    // Проверка обязательности
    var isReq = (a.is_required === 'TRUE' || a.is_required === true);
    if (isReq) {
      if (val === undefined || val === null || val === '') {
        return 'Обязательное поле "' + a.name + '" не заполнено';
      }
      if (Array.isArray(val) && val.length === 0) {
        return 'Обязательное поле "' + a.name + '" не заполнено';
      }
    }

    // Если значение есть — проверяем тип
    if (val !== undefined && val !== null && val !== '') {
      switch (a.type) {
        case 'integer':
          if (isNaN(parseInt(val))) return 'Поле "' + a.name + '": ожидается целое число';
          break;
        case 'float':
          if (isNaN(parseFloat(val))) return 'Поле "' + a.name + '": ожидается число';
          break;
        case 'boolean':
          if (['true','false','TRUE','FALSE',true,false].indexOf(val) === -1) {
            return 'Поле "' + a.name + '": ожидается Да/Нет';
          }
          break;
        case 'reference':
          if (a.ref_table && MDM_REF_TABLES[a.ref_table]) {
            var shKey = MDM_REF_TABLES[a.ref_table].sheet;
            var refRows = _rows(SH[shKey]).filter(function(r) { return r.name; });
            var names = refRows.map(function(r) { return String(r.name); });
            if (names.length && names.indexOf(String(val)) === -1) {
              return 'Поле "' + a.name + '": значение "' + val + '" отсутствует в справочнике';
            }
          }
          break;
        case 'enum_radio':
          if (a.options) {
            var opts = a.options.split(',').map(function(s) { return s.trim(); });
            if (opts.indexOf(String(val)) === -1) {
              return 'Поле "' + a.name + '": недопустимый вариант "' + val + '"';
            }
          }
          break;
        case 'enum_checkbox':
          if (Array.isArray(val) && a.options) {
            var cbOpts = a.options.split(',').map(function(s) { return s.trim(); });
            for (var k = 0; k < val.length; k++) {
              if (cbOpts.indexOf(val[k]) === -1) {
                return 'Поле "' + a.name + '": недопустимый вариант "' + val[k] + '"';
              }
            }
          }
          break;
      }
    }
  }
  return null; // Ошибок нет
}

// ══════════════════════════════════════════════════════════════════════
//  ФОРМУЛЫ — серверный вычислитель
// ══════════════════════════════════════════════════════════════════════

/**
 * Безопасное вычисление формулы (без eval / new Function).
 * Поддерживает: СЦЕПИТЬ, ПСТР, ЛЕВСИМВ, ПРАВСИМВ, СЖПРОБЕЛЫ, ДЛСТР,
 *               ТЕКСТ, ЕСЛИ, +, -, *, /
 *
 * @param {string}  formula        — формула из атрибута
 * @param {Array}   templateAttrs  — массив атрибутов шаблона
 * @param {Object}  attrValues     — attribute_values текущего товара
 * @returns {string|number}
 */
function _evalFormula(formula, templateAttrs, attrValues) {
  if (!formula) return '';

  // Шаг 1: подставляем {Имя атрибута} → значения
  var resolved = formula;
  for (var i = 0; i < templateAttrs.length; i++) {
    var a   = templateAttrs[i];
    var val = attrValues[String(a.id)];
    var re  = new RegExp('\\{' + _escapeRegex(a.name) + '\\}', 'g');
    var replacement = (val !== undefined && val !== null && val !== '') ? String(val) : '';
    resolved = resolved.replace(re, replacement);
  }

  // Шаг 2: обработка функции СЦЕПИТЬ — основная формула для именования
  var concatMatch = resolved.match(/^СЦЕПИТЬ\((.+)\)$/);
  if (concatMatch) {
    var args = _splitFormulaArgs(concatMatch[1]);
    var parts = args.map(function(arg) {
      return arg.replace(/^["']|["']$/g, ''); // убираем кавычки
    });
    return parts.join('').replace(/\s+/g, ' ').trim();
  }

  // Шаг 3: если нет функций — возвращаем как строку
  return resolved.replace(/\s+/g, ' ').trim();
}

/**
 * Экранирование для RegExp
 */
function _escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Разбивает аргументы формулы с учётом строк в кавычках
 */
function _splitFormulaArgs(str) {
  var args = [];
  var current = '';
  var inQuote = false;
  var quoteChar = '';

  for (var i = 0; i < str.length; i++) {
    var ch = str[i];
    if (!inQuote && (ch === '"' || ch === "'")) {
      inQuote = true;
      quoteChar = ch;
      current += ch;
    } else if (inQuote && ch === quoteChar) {
      inQuote = false;
      current += ch;
    } else if (!inQuote && ch === ',') {
      args.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

// ══════════════════════════════════════════════════════════════════════
//  СВОДНАЯ ВЫБОРКА (для фронтенда: товары + шаблон + справочники)
// ══════════════════════════════════════════════════════════════════════

/**
 * Полный MDM-контекст для страницы номенклатуры:
 *   refTables, templates (с атрибутами), products
 */
function getMDMContext(p) {
  try {
    var cached = _cGet('mdm_context');
    if (cached) return _ok(cached);

    // Справочные таблицы БД
    var refTables = {};
    Object.keys(MDM_REF_TABLES).forEach(function(key) {
      var cfg = MDM_REF_TABLES[key];
      var rows = _rows(SH[cfg.sheet]).filter(function(r) { return r.id && r.name; });
      refTables[key] = {
        label: cfg.label,
        items: rows.map(function(r) { return { id: parseInt(r.id), name: String(r.name) }; })
      };
    });

    // Шаблоны + атрибуты
    var tRows = _rows(SH.MDM_TEMPLATES).filter(function(r) { return r.id; });
    var aRows = _rows(SH.MDM_ATTRS).filter(function(r) { return r.id && r.template_id; });
    var attrMap = {};
    for (var i = 0; i < aRows.length; i++) {
      var a  = aRows[i];
      var tid = parseInt(a.template_id);
      if (!attrMap[tid]) attrMap[tid] = [];
      attrMap[tid].push({
        id:            parseInt(a.id),
        template_id:   tid,
        name:          a.name || '',
        type:          a.type || 'string',
        description:   a.description || '',
        is_required:   (a.is_required === 'TRUE' || a.is_required === true),
        display_style: a.display_style || '',
        options:       a.options || '',
        ref_table:     a.ref_table || '',
        formula:       a.formula || '',
        sort_order:    parseInt(a.sort_order) || 0,
      });
    }
    var templates = tRows.map(function(t) {
      var tid = parseInt(t.id);
      return {
        id:          tid,
        class_id:    t.class_id ? parseInt(t.class_id) : null,
        type_id:     t.type_id ? parseInt(t.type_id) : null,
        purpose_id:  t.purpose_id ? parseInt(t.purpose_id) : null,
        name:        t.name || '',
        description: t.description || '',
        attributes:  (attrMap[tid] || []).sort(function(a, b) { return a.sort_order - b.sort_order; }),
      };
    });

    // Классы / Типы / Назначения — для иерархии
    var classRows = _rows(SH.CLASSES).filter(function(r) { return r.id; }).map(function(r) {
      return { id: parseInt(r.id), name: r.name || '' };
    });
    var typeRows = _rows(SH.PROD_TYPES).filter(function(r) { return r.id; }).map(function(r) {
      return { id: parseInt(r.id), class_id: parseInt(r.class_id), name: r.name || '' };
    });
    var purposeRows = _rows(SH.PURPOSES).filter(function(r) { return r.id; }).map(function(r) {
      return { id: parseInt(r.id), type_id: parseInt(r.type_id), name: r.name || '' };
    });

    // Номенклатура
    var products = _rows(SH.MDM_PRODUCTS)
      .filter(function(r) { return r.id; })
      .map(function(r) {
        var av = {};
        try { av = JSON.parse(r.attribute_values || '{}'); } catch(e) {}
        return {
          id:               parseInt(r.id),
          template_id:      parseInt(r.template_id),
          sku:              r.sku || '',
          name:             r.name || '',
          attribute_values: av,
          created_at:       r.created_at || '',
        };
      });

    var result = {
      refTables:  refTables,
      classes:    classRows,
      types:      typeRows,
      purposes:   purposeRows,
      templates:  templates,
      products:   products,
    };

    _cSet('mdm_context', result, CACHE_TX);
    return _ok(result);
  } catch(e) { return _err(e.message); }
}
