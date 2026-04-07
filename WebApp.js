// ══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · WebApp.gs
//  Точка входа веб-приложения
// ══════════════════════════════════════════════════════════════════════
function doGet() {
  return HtmlService
    .createTemplateFromFile('Frontend')
    .evaluate()
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
