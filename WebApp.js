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
