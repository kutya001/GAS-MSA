// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · WebApp.gs
//  Точка входа веб-приложения
// ══════════════════════════════════════════════════════════════════════
function doGet(e) {
  var page = (e && e.parameter && e.parameter.p) || '';
  var url  = ScriptApp.getService().getUrl();

  // Квитанция POS (печать чека)
  if (page === 'receipt') {
    var receiptId = (e && e.parameter && e.parameter.id) || '';
    var sales = _rows(SH.SALES).filter(function(r) { return r.receipt_id === receiptId; });
    
    if (sales.length > 0) {
      var prodMap = _buildMap(SH.MDM_PRODUCTS, 'id', 'name');
      var mgrMap  = _buildMap(SH.MANAGERS, 'id', 'name');
      var items   = sales.map(function(s) {
        var pur = _findById(SH.PURCHASES, s.purchase_id) || {};
        return {
          product_name: prodMap[parseInt(pur.product_id)] || 'Товар',
          qty: 1, // В POS 1 строка = 1 запись (упрощение)
          price: parseFloat(s.total_kgs)
        };
      });
      
      var res = HtmlService.createTemplateFromFile('POSReceipt');
      res.receiptId = receiptId;
      res.saleDate  = sales[0].sale_date;
      res.managerName = mgrMap[parseInt(sales[0].manager_id)] || 'Менеджер';
      res.items = items;
      res.totalAmount = items.reduce(function(sum, x){ return sum + x.price; }, 0);
      
      return res.evaluate()
        .setTitle('Чек #' + receiptId)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    return HtmlService.createHtmlOutput('Чек не найден');
  }

  // Маркетплейс — отдельный сайт-каталог
  if (page === 'marketplace') {
    var mp = HtmlService.createTemplateFromFile('MarketplaceFrontend');
    mp.webAppUrl = url;
    return mp.evaluate()
      .setTitle('МобилТрек · Маркетплейс')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover');
  }

  // Основное приложение учёта
  var tpl = HtmlService.createTemplateFromFile('Frontend');
  tpl.webAppUrl = url;
  return tpl.evaluate()
    .setTitle('МобилТрек Pro')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover');
}

// Встраивает содержимое HTML-файла в шаблон (используется в Frontend.html)
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ══════════════════════════════════════════════════════════════════════
//  Настройки приложения (PropertiesService)
// ══════════════════════════════════════════════════════════════════════
var _SETTINGS_KEYS = ['company_name', 'base_currency'];

function getSettings() {
  var props = PropertiesService.getScriptProperties();
  var out = {};
  _SETTINGS_KEYS.forEach(function(k) {
    out[k] = props.getProperty('APP_' + k) || '';
  });
  return _ok(out);
}

function saveSettings(p) {
  return _withLock(function() {
    try {
      var props = PropertiesService.getScriptProperties();
      _SETTINGS_KEYS.forEach(function(k) {
        if (p[k] !== undefined) props.setProperty('APP_' + k, String(p[k]));
      });
      return _ok(true);
    } catch(e) { return _err(e.message); }
  });
}

// ══════════════════════════════════════════════════════════════════════
//  КОМБИНИРОВАННАЯ ЗАГРУЗКА (1 вызов вместо 7 — убираем round-trip)
// ══════════════════════════════════════════════════════════════════════
function getMasterData() {
  try {
    var refs     = getRefData();
    var wallets  = getWallets();
    var whs      = getWarehouses();
    var cats     = getCats();
    var arts     = getArticles();
    var mdm      = getMDMContext();
    var settings = getSettings();

    return _ok({
      refs:       refs.data,
      wallets:    wallets.data,
      warehouses: whs.data,
      cats:       cats.data,
      articles:   arts.data,
      mdm:        mdm.data,
      settings:   settings.data,
    });
  } catch(e) { return _err(e.message); }
}
