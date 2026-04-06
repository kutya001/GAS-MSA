#!/usr/bin/env python3
# Temporary script to write TableEngine.html
import os

content = """<script>
'use strict';
// ════════════════════════════════════════════════════════════════
//  DATA TABLE ENGINE  — class DT
//  Управляет таблицей: поиск, сортировка, пагинация / flat-вид,
//  порядок и видимость колонок (drag-reorder), экспорт XLSX,
//  умная фильтрация (rule-builder).
//  Все экземпляры регистрируются в глобальном DT_INST[id].
// ════════════════════════════════════════════════════════════════

// ── Операторы фильтрации ───────────────────────────────────────
var SF_OPS = {
  eq:        { label: '= равно',           fn: function(v, f) { return String(v).toLowerCase() === String(f).toLowerCase(); } },
  neq:       { label: '\\u2260 не равно',        fn: function(v, f) { return String(v).toLowerCase() !== String(f).toLowerCase(); } },
  contains:  { label: '\\u220b содержит',        fn: function(v, f) { return String(v).toLowerCase().indexOf(String(f).toLowerCase()) !== -1; } },
  ncontains: { label: '\\u220c не содержит',     fn: function(v, f) { return String(v).toLowerCase().indexOf(String(f).toLowerCase()) === -1; } },
  starts:    { label: 'A\\u2026 начинается с',   fn: function(v, f) { return String(v).toLowerCase().indexOf(String(f).toLowerCase()) === 0; } },
  ends:      { label: '\\u2026Z заканчивается',  fn: function(v, f) { var s = String(v).toLowerCase(), e = String(f).toLowerCase(); return s.length >= e.length && s.slice(-e.length) === e; } },
  gt:        { label: '> больше',          fn: function(v, f) { return +v > +f; } },
  gte:       { label: '\\u2265 больше/равно', fn: function(v, f) { return +v >= +f; } },
  lt:        { label: '< меньше',          fn: function(v, f) { return +v < +f; } },
  lte:       { label: '\\u2264 меньше/равно', fn: function(v, f) { return +v <= +f; } },
  empty:     { label: '\\u2205 пусто',           fn: function(v)    { return v == null || String(v).trim() === ''; }, noVal: true },
  nempty:    { label: '\\u2731 не пусто',        fn: function(v)    { return v != null && String(v).trim() !== ''; }, noVal: true },
  inlist:    { label: '\\u2208 в списке',        fn: function(v, f) { var items = String(f).split(',').map(function(x){ return x.trim().toLowerCase(); }); return items.indexOf(String(v).toLowerCase()) !== -1; } },
};
var SF_OPS_TEXT = ['contains', 'ncontains', 'eq', 'neq', 'starts', 'ends', 'inlist', 'empty', 'nempty'];
var SF_OPS_NUM  = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'empty', 'nempty'];
var SF_OPS_DATE = ['eq', 'neq', 'gt', 'lt', 'empty', 'nempty'];

class DT {
  constructor(cfg) {
    this.cfg = cfg;
    this.cols = (cfg.cols || []).map(function(c, i) {
      return {
        key:      c.key,
        label:    c.label,
        w:        c.w        || '',
        sortable: c.sortable !== false,
        vis:      c.vis      !== false,
        render:   c.render   || null,
        align:    c.align    || '',
        mono:     !!c.mono,
        _i: i,
        ord: i,
      };
    });
    this.data     = [];
    this.filtered = [];
    this.q        = '';
    this.sortKey  = '';
    this.sortDir  = 1;
    this.pg       = 1;
    this.PS       = 100;
    this.flat     = false;
    this._ready   = false;
    this._drag    = null;
    this._fpValues = {};
    this._sf      = [];
    DT_INST[cfg.id] = this;
  }

  get vc() {
    return [].concat(this.cols).filter(function(c) { return c.vis; }).sort(function(a, b) { return a.ord - b.ord; });
  }

  setData(rows) {
    this.data = rows || [];
    this._filter();
    this.pg = 1;
    if (this._ready) {
      this._rBody(); this._rPgn(); this._rInfo(); this._rFilterBtn();
    } else {
      this._render(); this._ready = true;
    }
  }

  _filter() {
    var q = this.q.toLowerCase().trim();
    var arr = q
      ? this.data.filter(function(r) {
          return Object.values(r).some(function(v) {
            return String(v == null ? '' : v).toLowerCase().indexOf(q) !== -1;
          });
        })
      : this.data.slice();
    var sf = this._sf;
    if (sf.length) {
      arr = arr.filter(function(r) {
        var result = null;
        for (var i = 0; i < sf.length; i++) {
          var rule = sf[i];
          if (!rule.field || !rule.op) continue;
          var opDef = SF_OPS[rule.op];
          if (!opDef) continue;
          var rv = r[rule.field];
          var match = opDef.noVal ? opDef.fn(rv) : opDef.fn(rv, rule.value || '');
          if (result === null) { result = match; }
          else if (rule.logic === 'or') { result = result || match; }
          else { result = result && match; }
        }
        return result === null ? true : result;
      });
    }
    this.filtered = arr;
    if (this.sortKey) this._sort();
  }

  _sort() {
    var k = this.sortKey, d = this.sortDir;
    this.filtered.sort(function(a, b) {
      var av = a[k] == null ? '' : a[k];
      var bv = b[k] == null ? '' : b[k];
      if (!isNaN(+av) && !isNaN(+bv)) return (+av - +bv) * d;
      return String(av).localeCompare(String(bv), 'ru') * d;
    });
  }

  _render() {
    var c = document.getElementById(this.cfg.containerId);
    if (!c) return;
    var tpl = document.createElement('template');
    tpl.innerHTML = this._html();
    c.textContent = '';
    c.appendChild(tpl.content);
    this._bind();
  }

  _html() {
    var id = this.cfg.id;
    return '<div class="dt-wrap">'
      + '<div class="dt-tb">' + this._toolbarHtml() + '</div>'
      + '<div class="dt-scr"><table class="dt-tbl" id="' + id + '-tbl">'
      + '<thead>' + this._headHtml() + '</thead>'
      + '<tbody id="' + id + '-body">' + this._bodyHtml() + '</tbody>'
      + '</table></div>'
      + '<div class="dt-foot" id="' + id + '-pgn">' + this._pgnHtml() + '</div>'
      + '</div>';
  }

  _toolbarHtml() {
    var id = this.cfg.id;
    var Q = "\\x27";
    var addBtn = this.cfg.onAdd
      ? '<button class="btn btn-p btn-sm" onclick="DT_INST[' + Q + id + Q + '].cfg.onAdd()">'
          + esc(this.cfg.addLabel || '+ \\u0414\\u043e\\u0431\\u0430\\u0432\\u0438\\u0442\\u044c') + '</button>'
      : '';
    var colItems = this.cols.map(function(c) {
      return '<label class="dt-ci">'
        + '<input type="checkbox" ' + (c.vis ? 'checked' : '') + ' onchange="DT_INST[' + Q + id + Q + '].toggleCol(' + c._i + ')">'
        + '<span>' + esc(c.label || '\\u2014') + '</span></label>';
    }).join('');
    var sfCnt = this._sf.filter(function(r) { return r.field && r.op; }).length;
    var filterBtn = '<button class="btn btn-g btn-sm dt-fpb' + (sfCnt ? ' dt-fpb-on' : '') + '" id="' + id + '-fpb"'
      + ' onclick="sfOpen(' + Q + id + Q + ')">'
      + '\\u26a1 \\u0424\\u0438\\u043b\\u044c\\u0442\\u0440\\u044b' + (sfCnt ? '<span class="fp-cnt">' + sfCnt + '</span>' : '')
      + '</button>';
    return '<div class="dt-tb-l">'
      + addBtn
      + '<div class="dt-srchw"><span class="dt-srchi">\\u2315</span>'
      + '<input class="dt-srch" id="' + id + '-srch" placeholder="\\u041f\\u043e\\u0438\\u0441\\u043a \\u043f\\u043e \\u0442\\u0430\\u0431\\u043b\\u0438\\u0446\\u0435\\u2026" value="' + esc(this.q) + '" oninput="DT_INST[' + Q + id + Q + '].onSearch(this.value)"></div>'
      + '<span class="dt-inf" id="' + id + '-inf">' + this._infoTxt() + '</span>'
      + '</div>'
      + '<div class="dt-tb-r">'
      + filterBtn
      + '<button class="btn btn-g btn-sm dt-flat' + (this.flat ? ' on' : '') + '" id="' + id + '-flat" onclick="DT_INST[' + Q + id + Q + '].toggleFlat()">'
      + (this.flat ? '&#9776; \\u0421\\u0442\\u0440\\u0430\\u043d\\u0438\\u0446\\u044b' : '&#9776; \\u0412\\u0441\\u0435 \\u0441\\u0442\\u0440\\u043e\\u043a\\u0438') + '</button>'
      + '<div class="dt-cvw" id="' + id + '-cvw">'
      + '<button class="btn btn-g btn-sm" onclick="DT_INST[' + Q + id + Q + ']._toggleCV(event)">&#9881; \\u0421\\u0442\\u043e\\u043b\\u0431\\u0446\\u044b</button>'
      + '<div class="dt-cv" id="' + id + '-cv" hidden>' + colItems + '</div>'
      + '</div>'
      + '<button class="btn btn-g btn-sm" onclick="DT_INST[' + Q + id + Q + '].exportXLSX()" title="\\u0421\\u043a\\u0430\\u0447\\u0430\\u0442\\u044c XLSX">&darr; XLSX</button>'
      + '</div>';
  }
"""

# This approach is getting too complex with unicode escapes. Let me try a cleaner method.
print("Will use a different approach")
