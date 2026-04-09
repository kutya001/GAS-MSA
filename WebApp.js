// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · WebApp.gs
//  Точка входа веб-приложения
// ══════════════════════════════════════════════════════════════════════
function doGet(e) {
  var page = (e && e.parameter && e.parameter.p) || '';
  var webAppUrl = ScriptApp.getService().getUrl();
  if (page === 'catalog') {
    var tpl = HtmlService.createTemplateFromFile('PhoneMarket');
    tpl.webAppUrl = webAppUrl;
    return tpl.evaluate()
      .setTitle('PhoneMarket — Каталог товаров')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover');
  }
  var tpl = HtmlService.createTemplateFromFile('Frontend');
  tpl.webAppUrl = webAppUrl;
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
