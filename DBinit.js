// ═══════════════════════════════════════════════════════════════════════
//  МобилТрек Pro · DBinit.gs  v3.0
//  ─────────────────────────────────────────────────────────────────────
//  Схема (SCHEMA), инициализация (initDB), seed-данные (_seedData),
//  пересчёт materialized-полей (rebuildMaterialized).
//  Константы SH / TZ / CACHE_TTL и т.д. находятся в Config.js.
//  Инфраструктурные хелперы (_ss, _sh, _rows, ...) — в Helpers.js.
// ═══════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────
//  ГЛАВНАЯ ТОЧКА ВХОДА
// ──────────────────────────────────────────────────────────────────────
function initDB() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  Logger.log('МобилТрек Pro · Инициализация БД v3.0...');

  _createSchema(ss);
  patchWalletsTable();    // Фикс для колонки is_pos и заполнения
  _seedData(ss);
  _formatAll(ss);
  _syncAllSeq();          // Шаг 1: инициализируем счётчики PK
  rebuildMaterialized();  // Шаг 3: пересчитываем materialized-поля

  var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Лист1');
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

  Logger.log('✅ initDB() завершён! Листов: ' + ss.getSheets().length);
  try {
    SpreadsheetApp.getUi().alert(
      '✅ МобилТрек Pro v3.0 инициализирован!\n\n' +
      'Листов создано: ' + ss.getSheets().length + '\n' +
      'Демо-данные залиты.\n' +
      'Materialized-балансы пересчитаны.\n\n' +
      'Перейдите: Развернуть → Управление развёртываниями.'
    );
  } catch(e) { /* UI недоступен при запуске из триггера / clasp run */ }
}

// ──────────────────────────────────────────────────────────────────────
//  СХЕМА ЛИСТОВ
//  ВАЖНО: Кошельки и Склады содержат materialized-колонки
// ──────────────────────────────────────────────────────────────────────
var SCHEMA = {
  'Ref_Бренды': {
    headers: ['id','name','info'],
    color: '#E8F5E9', tabColor: '#388E3C', widths: [50,200,300],
    note: 'Справочник брендов',
  },
  'Ref_Модели': {
    headers: ['id','name','brand_id','info'],
    color: '#E8F5E9', tabColor: '#388E3C', widths: [50,250,80,300],
    note: 'Модели (brand_id → Ref_Бренды)',
  },
  'Ref_Поставщики': {
    headers: ['id','name','info'],
    color: '#E8F5E9', tabColor: '#388E3C', widths: [50,250,300],
    note: 'Поставщики',
  },
  'Ref_Менеджеры': {
    headers: ['id','name','info'],
    color: '#E8F5E9', tabColor: '#388E3C', widths: [50,200,300],
    note: 'Менеджеры',
  },
  'Ref_Валюты': {
    headers: ['id','name','info'],
    color: '#E8F5E9', tabColor: '#388E3C', widths: [50,100,250],
    note: 'Валюты',
  },
  'Ref_Классы': {
    headers: ['id','name','info'],
    color: '#E8F5E9', tabColor: '#388E3C', widths: [50,250,300],
    note: 'Классы товаров (уровень 1)',
  },
  'Ref_ТипыПродуктов': {
    headers: ['id','class_id','name','info'],
    color: '#E8F5E9', tabColor: '#388E3C', widths: [50,80,250,300],
    note: 'Типы продуктов (уровень 2, class_id → Ref_Классы)',
  },
  // ── Кошельки: +current_balance, +total_in, +total_out ───────────────
  'Кошельки': {
    headers: ['id','name','currency_id','icon','start_balance','current_balance','total_in','total_out','note','is_pos','created_at','updated_at'],
    color: '#FFF3E0', tabColor: '#F57C00',
    widths: [50,220,80,60,130,130,110,110,220,80,140,140],
    note: 'Кошельки. current_balance обновляется атомарно при каждой операции (Materialized)',
  },
  'КассовыеОперации': {
    headers: ['id','op_date','op_type','wallet_id','cat_id','article_id','amount','counterpart','comment','shift_id','created_at','updated_at'],
    color: '#FFF8E1', tabColor: '#FBC02D',
    widths: [50,110,90,80,80,80,120,200,300,80,140,140],
    note: 'Все денежные операции. op_type: Приход / Расход',
  },

  // ── Склады: +current_items, +current_cost_kgs ────────────────────────
  'Склады': {
    headers: ['id','name','address','responsible','note','current_items','current_cost_kgs','created_at','updated_at'],
    color: '#E3F2FD', tabColor: '#1565C0',
    widths: [50,220,300,200,220,100,130,140,140],
    note: 'Склады. current_items/current_cost_kgs обновляются атомарно (Materialized)',
  },
  'Закупки': {
    headers: ['id','purchase_date','wh_id','supplier_id','cost_usd','rate','cost_kgs','has_imei','imei','qty','condition','class_id','type_id','product_id','status','note','created_at','updated_at'],
    color: '#EDE7F6', tabColor: '#6A1B9A',
    widths: [50,110,80,80,90,70,110,90,160,60,90,80,80,80,80,100,200,140,140],
    note: 'has_imei=TRUE → поштучный учёт. status: В наличии / Продано / Удалено. product_id → MDM_Номенклатура',
  },
  'Продажи': {
    headers: ['id','purchase_id','buyer','wa','sale_date','manager_id','wallet_id','total_kgs','paid_kgs','debt_kgs','note','shift_id','receipt_id','is_returned','created_at','updated_at'],
    color: '#FCE4EC', tabColor: '#C62828',
    widths: [50,90,220,160,110,80,80,120,120,120,200,80,100,80,140,140],
    note: 'debt_kgs обновляется при каждой оплате',
  },
  'Оплаты': {
    headers: ['id','sale_id','wallet_id','amount','pay_date','debt_after','note','created_at','updated_at'],
    color: '#F3E5F5', tabColor: '#7B1FA2',
    widths: [50,80,80,120,110,120,250,140,140],
    note: 'Платежи по продажам (рассрочки)',
  },
  'Смены': {
    headers: ['id','manager_id','opened_at','closed_at','status','start_balances','end_balances','revenue_kgs','note','created_at','updated_at'],
    color: '#E8EAF6', tabColor: '#3F51B5',
    widths: [50,80,140,140,90,300,300,100,200,140,140],
    note: 'Учет кассовых смен. status: Открыта / Закрыта. balances - JSON',
  },
  'ОплатыЗакупок': {
    headers: ['id','purchase_id','wallet_id','amount','pay_date','note','created_at','updated_at'],
    color: '#F3E5F5', tabColor: '#7B1FA2',
    widths: [50,80,80,120,110,250,140,140],
    note: 'Платежи по закупкам (оплаты поставщикам)',
  },
  'Категории': {
    headers: ['id','op_type','name','note'],
    color: '#F1F8E9', tabColor: '#558B2F',
    widths: [50,90,250,300],
    note: 'op_type: Приход / Расход',
  },
  'Статьи': {
    headers: ['id','cat_id','name','note'],
    color: '#F1F8E9', tabColor: '#558B2F',
    widths: [50,80,280,300],
    note: 'Подкатегории расходов/доходов',
  },

  // ── MDM: управление мастер-данными номенклатуры (EAV) ───────────────
  'MDM_Справочники': {
    headers: ['id','name','items'],
    color: '#E0F7FA', tabColor: '#00838F',
    widths: [50,200,600],
    note: 'Справочники MDM. items — JSON-массив строковых значений',
  },
  'MDM_Шаблоны': {
    headers: ['id','class_id','type_id','name','description'],
    color: '#E0F7FA', tabColor: '#00838F',
    widths: [50,80,80,250,400],
    note: 'Шаблоны номенклатуры. class_id → Ref_Классы, type_id → Ref_ТипыПродуктов. Шаблон = назначение (3-й уровень)',
  },
  'MDM_Атрибуты': {
    headers: ['id','template_id','name','type','description','is_required','display_style','options','ref_table','formula','sort_order'],
    color: '#E0F7FA', tabColor: '#00838F',
    widths: [50,80,180,100,250,80,80,250,120,350,60],
    note: 'Атрибуты шаблонов (EAV-метаданные). type: string|integer|float|boolean|date|time|datetime|color_rgb|enum_radio|enum_checkbox|reference|calculated. ref_table — ключ таблицы-справочника из SH',
  },
  'MDM_Номенклатура': {
    headers: ['id','template_id','sku','name','attribute_values','created_at','updated_at'],
    color: '#E0F7FA', tabColor: '#00838F',
    widths: [50,80,150,300,600,140,140],
    note: 'Номенклатурные позиции. attribute_values — JSON-объект {attr_id: значение}',
  },

  // ── Маркетплейс: каталог товаров ────────────────────────────────
  'MP_Товары': {
    headers: ['id','category','brand','name','description','specs','emoji','color','rating','created_at'],
    color: '#FFF9C4', tabColor: '#F9A825',
    widths: [50,100,100,250,400,400,60,80,60,140],
    note: 'Каталог товаров маркетплейса. category: phones/accessories. specs — JSON',
  },
  'MP_Продавцы': {
    headers: ['id','name','address','phone','wa','rating','created_at'],
    color: '#FFF9C4', tabColor: '#F9A825',
    widths: [50,200,300,150,150,60,140],
    note: 'Продавцы маркетплейса',
  },
  'MP_Листинги': {
    headers: ['id','product_id','seller_id','price','condition','in_stock','note','created_at'],
    color: '#FFF9C4', tabColor: '#F9A825',
    widths: [50,80,80,100,100,80,250,140],
    note: 'Предложения продавцов. condition: Новый / Б/У',
  },
  'MP_Отзывы': {
    headers: ['id','product_id','author','rating','text','created_at'],
    color: '#FFF9C4', tabColor: '#F9A825',
    widths: [50,80,200,60,400,140],
    note: 'Отзывы пользователей о товарах',
  },
};

// ──────────────────────────────────────────────────────────────────────
//  СОЗДАНИЕ СХЕМЫ
// ──────────────────────────────────────────────────────────────────────
function _createSchema(ss) {
  Object.keys(SCHEMA).forEach(function(name) {
    var cfg = SCHEMA[name];
    var sh  = ss.getSheetByName(name) || ss.insertSheet(name);
    
    if (sh.getLastRow() === 0) {
      sh.appendRow(cfg.headers);
    } else {
      // Синхронизация заголовков (Schema Migration)
      var currentHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var missing = cfg.headers.filter(function(h) { return currentHeaders.indexOf(h) === -1; });
      
      if (missing.length > 0) {
        Logger.log('Обновление схемы для ' + name + ': добавление ' + missing.join(', '));
        missing.forEach(function(h) {
          var newColIdx = sh.getLastColumn() + 1;
          sh.getRange(1, newColIdx).setValue(h);
        });
      }
    }

    sh.setFrozenRows(1);
    if (cfg.tabColor) sh.setTabColor(cfg.tabColor);
    if (cfg.note)     sh.getRange(1,1).setNote(cfg.note);
  });
}

// ──────────────────────────────────────────────────────────────────────
//  ШАГ 1: синхронизация PropertiesService-счётчиков со всех листов
// ──────────────────────────────────────────────────────────────────────
function _syncAllSeq() {
  var props = PropertiesService.getScriptProperties();
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function(name) {
    var sh  = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    var key  = 'SEQ_' + name.replace(/[^A-Za-zА-Яа-я0-9]/g, '_').toUpperCase();
    var data = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    var maxId = 0;
    data.forEach(function(row){ var v = parseInt(row[0]); if(v > maxId) maxId = v; });
    props.setProperty(key, String(maxId));
    Logger.log('SEQ ' + name + ' → ' + maxId);
  });
}

// ──────────────────────────────────────────────────────────────────────
//  ШАГ 3: пересчёт Materialized-полей из истории
//  Вызывать при: initDB(), ручном исправлении данных в Sheets
// ──────────────────────────────────────────────────────────────────────
function rebuildMaterialized() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Кошельки: current_balance, total_in, total_out ───────────────────
  var wSh     = ss.getSheetByName('Кошельки');
  var opsSh   = ss.getSheetByName('КассовыеОперации');
  if (wSh && opsSh) {
    var wData  = wSh.getDataRange().getValues();
    var wHeads = wData[0];
    var wIdCol  = wHeads.indexOf('id');
    var wSBCol  = wHeads.indexOf('start_balance');
    var wCBCol  = wHeads.indexOf('current_balance');
    var wTICol  = wHeads.indexOf('total_in');
    var wTOCol  = wHeads.indexOf('total_out');

    var opsData = opsSh.getDataRange().getValues();
    var oHeads  = opsData[0];
    var oWCol   = oHeads.indexOf('wallet_id');
    var oTCol   = oHeads.indexOf('op_type');
    var oACol   = oHeads.indexOf('amount');

    // Агрегируем по wallet_id
    var walletAgg = {};
    for (var i = 1; i < opsData.length; i++) {
      var wid = parseInt(opsData[i][oWCol]);
      var amt = parseFloat(opsData[i][oACol]) || 0;
      var typ = opsData[i][oTCol];
      if (!walletAgg[wid]) walletAgg[wid] = { in: 0, out: 0 };
      if (typ === 'Приход') walletAgg[wid].in  += amt;
      else                  walletAgg[wid].out += amt;
    }

    // Обновляем materialized-колонки
    for (var r = 1; r < wData.length; r++) {
      var wid = parseInt(wData[r][wIdCol]);
      var sb  = parseFloat(wData[r][wSBCol]) || 0;
      var agg = walletAgg[wid] || { in: 0, out: 0 };
      if (wCBCol >= 0) wSh.getRange(r+1, wCBCol+1).setValue(Math.round(sb + agg.in - agg.out));
      if (wTICol >= 0) wSh.getRange(r+1, wTICol+1).setValue(Math.round(agg.in));
      if (wTOCol >= 0) wSh.getRange(r+1, wTOCol+1).setValue(Math.round(agg.out));
    }
    Logger.log('✅ Materialized: Кошельки пересчитаны');
  }

  // ── Склады: current_items, current_cost_kgs ──────────────────────────
  var whSh  = ss.getSheetByName('Склады');
  var purSh = ss.getSheetByName('Закупки');
  if (whSh && purSh) {
    var whData  = whSh.getDataRange().getValues();
    var whHeads = whData[0];
    var whIdCol  = whHeads.indexOf('id');
    var whCICol  = whHeads.indexOf('current_items');
    var whCCCol  = whHeads.indexOf('current_cost_kgs');

    var purData  = purSh.getDataRange().getValues();
    var purHeads = purData[0];
    var pWhCol   = purHeads.indexOf('wh_id');
    var pStCol   = purHeads.indexOf('status');
    var pHICol   = purHeads.indexOf('has_imei');
    var pQCol    = purHeads.indexOf('qty');
    var pCKCol   = purHeads.indexOf('cost_kgs');

    var whAgg = {};
    for (var i = 1; i < purData.length; i++) {
      if (purData[i][pStCol] !== 'В наличии') continue;
      var wid  = parseInt(purData[i][pWhCol]);
      var hasI = (purData[i][pHICol] === 'TRUE' || purData[i][pHICol] === true);
      var qty  = hasI ? 1 : (parseInt(purData[i][pQCol]) || 1);
      var cost = (parseFloat(purData[i][pCKCol]) || 0) * qty;
      if (!whAgg[wid]) whAgg[wid] = { items: 0, cost: 0 };
      whAgg[wid].items += qty;
      whAgg[wid].cost  += cost;
    }

    for (var r = 1; r < whData.length; r++) {
      var wid = parseInt(whData[r][whIdCol]);
      var agg = whAgg[wid] || { items: 0, cost: 0 };
      if (whCICol >= 0) whSh.getRange(r+1, whCICol+1).setValue(agg.items);
      if (whCCCol >= 0) whSh.getRange(r+1, whCCCol+1).setValue(Math.round(agg.cost));
    }
    Logger.log('✅ Materialized: Склады пересчитаны');
  }

  // Сбрасываем кэши — данные изменились
  try {
    CacheService.getScriptCache().removeAll(
      ['wallets_meta','wallets_0','dashboard_meta','dashboard_0','purchases_all_meta','purchases_all_0']
    );
  } catch(e) {}

  Logger.log('✅ rebuildMaterialized() завершён');
}

// ──────────────────────────────────────────────────────────────────────
//  ДЕМО-ДАННЫЕ
// ──────────────────────────────────────────────────────────────────────
function _seedData(ss) {
  _seedSheet(ss, 'Ref_Валюты', [
    ['id','name','info'],
    [1,'KGS','Кыргызский сом'],[2,'USD','Доллар США'],[3,'RUB','Российский рубль'],
  ]);
  _seedSheet(ss, 'Ref_Бренды', [
    ['id','name','info'],
    [1,'Apple','Premium'],[2,'Samsung','Android-флагман'],[3,'Xiaomi','Бюджет / Средний'],
    [4,'Honor','Средний сегмент'],[5,'Tecno','Бюджетный'],[6,'Infinix','Бюджетный'],
  ]);
  _seedSheet(ss, 'Ref_Модели', [
    ['id','name','brand_id','info'],
    [1,'iPhone 15 Pro Max',1,''],[2,'iPhone 15 Pro',1,''],[3,'iPhone 15',1,''],
    [4,'iPhone 14',1,''],[5,'iPhone 13',1,''],
    [6,'Galaxy S24 Ultra',2,''],[7,'Galaxy S24',2,''],[8,'Galaxy A55',2,''],
    [9,'Galaxy A35',2,''],[10,'Redmi Note 14 Pro',3,''],[11,'Redmi Note 14',3,''],
    [12,'POCO X6 Pro',3,''],[13,'POCO M6 Pro',3,''],[14,'Honor 200 Pro',4,''],
    [15,'Honor 200',4,''],[16,'Tecno Spark 30',5,''],[17,'Infinix Hot 50',6,''],
  ]);
  _seedSheet(ss, 'Ref_Поставщики', [
    ['id','name','info'],
    [1,'Ислам Сатуу','+996 700 111 222'],[2,'Эрлис Трейд','+996 555 333 444'],
    [3,'ТехИмпорт KG','Оптовик, Дубай'],[4,'SmartPhone.kg','Онлайн-поставщик'],
  ]);
  _seedSheet(ss, 'Ref_Менеджеры', [
    ['id','name','info'],
    [1,'Айдай Бекова','Розница'],[2,'Нурлан Осмонов','Онлайн-продажи'],
    [3,'Бакыт Токтогул','Оптовые клиенты'],
  ]);

  // ── Классы → Типы (2-уровневая классификация, шаблон = 3-й уровень)
  _seedSheet(ss, 'Ref_Классы', [
    ['id','name','info'],
    [1,'Устройства','Телефоны, планшеты и т.д.'],
    [2,'Аксессуары','Дополнительные товары'],
    [3,'Комплектующие/Запчасти','Запасные части'],
    [4,'Услуги','Сервис и обслуживание'],
  ]);
  _seedSheet(ss, 'Ref_ТипыПродуктов', [
    ['id','class_id','name','info'],
    [1,1,'Смартфоны',''],
    [2,1,'Планшеты',''],
    [3,2,'Аудио','Акустика и наушники'],
    [4,2,'Защита','Чехлы и стекла'],
    [5,2,'Питание и кабели',''],
    [6,2,'Автомобильные аксессуары',''],
    [7,2,'Периферия',''],
  ]);
  // ── Кошельки (с пустыми materialized-полями — заполнит rebuildMaterialized)
  _seedSheet(ss, 'Кошельки', [
    ['id','name','currency_id','icon','start_balance','current_balance','total_in','total_out','note','created_at'],
    [1,'Основная касса (KGS)',1,'💰',500000,500000,0,0,'Главная касса','2025-01-01'],
    [2,'Валютная касса (USD)',2,'💵',2000,2000,0,0,'Долларовая касса','2025-01-01'],
    [3,'Карта Mbank',1,'💳',100000,100000,0,0,'Корпоративная карта','2025-01-01'],
    [4,'Карта Optima',1,'🏦',50000,50000,0,0,'Резервная карта','2025-01-01'],
  ]);

  // ── Склады (с пустыми materialized-полями)
  _seedSheet(ss, 'Склады', [
    ['id','name','address','responsible','note','current_items','current_cost_kgs','created_at'],
    [1,'Основной склад','Бишкек, Ошский рынок, бутик 14','Айдай Бекова','',0,0,'2025-01-01'],
    [2,'Онлайн-склад','Бишкек, офис','Нурлан Осмонов','Только для онлайн',0,0,'2025-01-01'],
    [3,'Резервный склад','Бишкек, ул. Фрунзе 12','Бакыт Токтогул','Оптовые партии',0,0,'2025-03-01'],
  ]);

  _seedSheet(ss, 'Категории', [
    ['id','op_type','name','note'],
    [1,'Приход','Выручка от продаж',''],[2,'Приход','Прочие доходы',''],
    [3,'Расход','Закуп товара',''],[4,'Расход','Аренда',''],
    [5,'Расход','Зарплата',''],[6,'Расход','Транспорт и логистика',''],
    [7,'Расход','Реклама и маркетинг',''],[8,'Расход','Хозяйственные расходы',''],
    [9,'Расход','Прочие расходы',''],
  ]);
  _seedSheet(ss, 'Статьи', [
    ['id','cat_id','name','note'],
    [1,1,'Продажа телефонов',''],[2,1,'Продажа аксессуаров',''],
    [3,2,'Возврат товара поставщику',''],[4,3,'Закуп Apple',''],
    [5,3,'Закуп Samsung',''],[6,3,'Закуп Xiaomi / Poco',''],
    [7,3,'Закуп прочих брендов',''],[8,4,'Аренда торговой точки',''],
    [9,4,'Аренда склада',''],[10,5,'Зарплата менеджера',''],
    [11,5,'Бонусы и премии',''],[12,6,'Доставка товара',''],
    [13,6,'Такси и транспорт',''],[14,7,'Реклама Instagram',''],
    [15,7,'Реклама OLX/Salam.kg',''],[16,8,'Хозтовары',''],
    [17,9,'Прочее',''],
  ]);

  var d     = new Date();
  var m3ago = _ds(new Date(d.getFullYear(), d.getMonth()-3, 1));
  var m2ago = _ds(new Date(d.getFullYear(), d.getMonth()-2, 10));
  var m1ago = _ds(new Date(d.getFullYear(), d.getMonth()-1, 5));
  var m0    = _ds(new Date(d.getFullYear(), d.getMonth(),   3));

  _seedSheet(ss, 'Закупки', [
    ['id','purchase_date','wh_id','supplier_id','cost_usd','rate','cost_kgs','has_imei','imei','qty','condition','class_id','type_id','product_id','status','note','created_at'],
    [1,m3ago,1,1,430,88,37840,'TRUE','352365010000001',1,'Новый',1,1,1,'Продано','',m3ago],
    [2,m2ago,1,1,370,88,32560,'TRUE','352365010000002',1,'Новый',1,1,2,'Продано','',m2ago],
    [3,m2ago,1,1,290,88,25520,'TRUE','352365010000003',1,'Новый',1,1,3,'В наличии','',m2ago],
    [4,m3ago,1,3,250,88,22000,'TRUE','352365010000004',1,'Новый',1,1,4,'В наличии','',m3ago],
    [5,m1ago,2,1,195,89,17355,'TRUE','352365010000005',1,'Новый',1,1,5,'В наличии','',m1ago],
    [6,m2ago,1,2,550,88,48400,'TRUE','860000060000001',1,'Новый',1,1,6,'Продано','',m2ago],
    [7,m1ago,1,2,320,88,28160,'TRUE','860000070000001',1,'Новый',1,1,7,'В наличии','',m1ago],
    [8,m0,2,4,180,89,16020,'TRUE','860000080000001',1,'Новый',1,1,8,'В наличии','',m0],
    [9,m1ago,3,4,130,88,11440,'FALSE','',5,'Новый',1,1,9,'В наличии','Партия 5 шт',m1ago],
    [10,m1ago,1,2,140,88,12320,'TRUE','860001000000001',1,'Новый',1,1,10,'Продано','',m1ago],
    [11,m0,1,2,88,89,7832,'TRUE','860001100000001',1,'Новый',1,1,11,'В наличии','',m0],
    [12,m0,2,3,165,89,14685,'TRUE','860001200000001',1,'Новый',1,1,12,'В наличии','',m0],
    [13,m0,1,3,170,88,14960,'FALSE','',3,'Новый',1,1,13,'В наличии','Партия 3 шт',m0],
    [14,m0,3,4,65,89,5785,'TRUE','350001400000001',1,'Новый',1,1,14,'В наличии','',m0],
  ]);
  _seedSheet(ss, 'Продажи', [
    ['id','purchase_id','buyer','wa','sale_date','manager_id','wallet_id','total_kgs','paid_kgs','debt_kgs','note','created_at'],
    [1,1,'Асель Токтогулова','+996700001001',m3ago,1,1,145500,145500,0,'',m3ago],
    [2,2,'Бакыт Осмонов','+996555002002',m2ago,2,1,128000,80000,48000,'Рассрочка',m2ago],
    [3,6,'Данияр Иманов','',m2ago,3,3,195000,195000,0,'',m2ago],
    [4,10,'Айгуль Мамытова','+996700004004',m1ago,1,1,52000,52000,0,'',m1ago],
  ]);
  _seedSheet(ss, 'Оплаты', [
    ['id','sale_id','wallet_id','amount','pay_date','debt_after','note','created_at'],
    [1,1,1,145500,m3ago,0,'Полная оплата',m3ago],
    [2,2,1,80000,m2ago,48000,'Первый взнос',m2ago],
    [3,3,3,195000,m2ago,0,'Полная оплата',m2ago],
    [4,4,1,52000,m1ago,0,'Полная оплата',m1ago],
  ]);
  _seedSheet(ss, 'КассовыеОперации', [
    ['id','op_date','op_type','wallet_id','cat_id','article_id','amount','counterpart','comment','created_at'],
    [1,m3ago,'Приход',1,1,1,145500,'Асель Токтогулова','Продажа #1 iPhone 15 Pro Max',m3ago],
    [2,m2ago,'Приход',1,1,1,80000,'Бакыт Осмонов','Продажа #2 iPhone 15 Pro',m2ago],
    [3,m2ago,'Приход',3,1,1,195000,'Данияр Иманов','Продажа #3 Galaxy S24 Ultra',m2ago],
    [4,m1ago,'Приход',1,1,1,52000,'Айгуль Мамытова','Продажа #4 Redmi Note 14 Pro',m1ago],
    [5,m3ago,'Расход',2,3,4,37840,'Ислам Сатуу','Оплата за закупку #1 Apple',m3ago],
    [6,m2ago,'Расход',2,3,4,32560,'Ислам Сатуу','Оплата за закупку #2 Apple',m2ago],
    [7,m2ago,'Расход',1,3,5,48400,'Эрлис Трейд','Оплата за закупку #6 Samsung',m2ago],
    [8,m1ago,'Расход',2,3,6,12320,'Эрлис Трейд','Оплата за закупку #10 Xiaomi',m1ago],
    [9,m2ago,'Расход',1,4,8,35000,'','Аренда точки, '+m2ago.slice(0,7),m2ago],
    [10,m1ago,'Расход',1,4,8,35000,'','Аренда точки, '+m1ago.slice(0,7),m1ago],
    [11,m0,'Расход',1,4,8,35000,'','Аренда точки, '+m0.slice(0,7),m0],
    [12,m2ago,'Расход',1,5,10,18000,'Айдай Бекова','Зарплата '+m2ago.slice(0,7),m2ago],
    [13,m2ago,'Расход',1,5,10,15000,'Нурлан Осмонов','Зарплата '+m2ago.slice(0,7),m2ago],
    [14,m1ago,'Расход',1,5,10,18000,'Айдай Бекова','Зарплата '+m1ago.slice(0,7),m1ago],
    [15,m1ago,'Расход',1,5,10,15000,'Нурлан Осмонов','Зарплата '+m1ago.slice(0,7),m1ago],
    [16,m1ago,'Расход',1,7,14,8000,'Instagram','Таргет реклама',m1ago],
    [17,m0,'Расход',1,7,15,5000,'OLX','Продвижение объявлений',m0],
    [18,m0,'Расход',1,8,16,3500,'','Хозтовары для точки',m0],
  ]);

  // ── MDM: справочники, шаблоны, атрибуты, номенклатура ────────────────
  _seedMDM(ss);

  Logger.log('✅ Демо-данные залиты');
}

// ──────────────────────────────────────────────────────────────────────
//  MDM: ДЕМО-ДАННЫЕ мастер-данных номенклатуры
// ──────────────────────────────────────────────────────────────────────
function _seedMDM(ss) {
  // ── Справочники ──────────────────────────────────────────────────────
  _seedSheet(ss, 'MDM_Справочники', [
    ['id','name','items'],
    [1,'Бренды',       JSON.stringify(['Apple','Samsung','Xiaomi','Honor','Tecno','Infinix'])],
    [2,'Цвета',        JSON.stringify(['Чёрный','Белый','Серый','Голубой','Красный','Зелёный','Синий','Фиолетовый','Лавандовый','Серебристый','Золотой'])],
    [3,'Состояние',    JSON.stringify(['Новый','Б/У','Восстановленный'])],
    [4,'Объём памяти', JSON.stringify(['64GB','128GB','256GB','512GB','1TB'])],
    [5,'RAM',          JSON.stringify(['4GB','6GB','8GB','12GB','16GB'])],
  ]);

  // ── Шаблоны (class_id → type_id, шаблон = назначение) ───────────────
  _seedSheet(ss, 'MDM_Шаблоны', [
    ['id','class_id','type_id','name','description'],
    [1, 1, 1, 'Смартфоны', 'Шаблон для мобильных телефонов'],
    [2, 1, 2, 'Планшеты', 'Шаблон для планшетов'],
    [3, 2, 3, 'TWS наушники', 'Беспроводные наушники'],
    [4, 2, 4, 'Чехлы', 'Защитные чехлы для устройств'],
    [5, 2, 4, 'Защитные стекла', 'Стёкла для экранов'],
    [6, 2, 5, 'Сетевые ЗУ', 'Зарядные устройства'],
  ]);

  // ── Атрибуты (шаблон «Смартфоны») ───────────────────────────────────
  //    type: string|integer|float|boolean|date|time|datetime|
  //          color_rgb|enum_radio|enum_checkbox|reference|calculated
  _seedSheet(ss, 'MDM_Атрибуты', [
    ['id','template_id','name','type','description','is_required','display_style','options','ref_table','formula','sort_order'],
    // Смартфоны (id=1)
    [1,1,'Бренд',          'reference',      'Производитель устройства',        'TRUE', 'dropdown','','brands','',1],
    [2,1,'Модель',         'string',         'Название модели',                 'TRUE', '','','','',2],
    [3,1,'Объём памяти',   'enum_radio',     'Встроенная память (ROM)',          'TRUE', 'list','64GB,128GB,256GB,512GB,1TB','','',3],
    [4,1,'RAM',            'enum_radio',     'Оперативная память',              'FALSE','list','4GB,6GB,8GB,12GB,16GB','','',4],
    [5,1,'Цвет',           'enum_radio',     'Основной цвет корпуса',           'FALSE','list','Чёрный,Белый,Серый,Голубой,Красный,Зелёный,Синий,Фиолетовый,Лавандовый,Серебристый,Золотой','','',5],
    [6,1,'IMEI',           'string',         'Международный идентификатор',     'FALSE','','','','',6],
    [7,1,'Полное название', 'calculated',    'Автогенерация наименования',      'FALSE','','','','СЦЕПИТЬ({Бренд}," ",{Модель}," ",{Объём памяти})',7],
    // Чехлы (id=4)
    [8,4,'Бренд',          'reference',      'Производитель',                   'TRUE', 'dropdown','','brands','',1],
    [9,4,'Совместимость',  'string',         'Модель устройства',               'TRUE', '','','','',2],
    [10,4,'Материал',      'enum_radio',     '',                                'FALSE','list','Силикон,Пластик,Кожа,Ткань','','',3],
  ]);

  // ── Номенклатура (примеры карточек из текущих закупок) ────────────────
  var today = _ds(new Date());
  _seedSheet(ss, 'MDM_Номенклатура', [
    ['id','template_id','sku','name','attribute_values','created_at'],
    [1, 1,'IP15PM-256',    'iPhone 15 Pro Max 256GB',     JSON.stringify({'1':'Apple','2':'iPhone 15 Pro Max','3':'256GB','5':'Чёрный'}),           today],
    [2, 1,'IP15P-128',     'iPhone 15 Pro 128GB',         JSON.stringify({'1':'Apple','2':'iPhone 15 Pro','3':'128GB','5':'Белый'}),                today],
    [3, 1,'IP15-128',      'iPhone 15 128GB',             JSON.stringify({'1':'Apple','2':'iPhone 15','3':'128GB','5':'Голубой'}),                  today],
    [4, 1,'IP14-128',      'iPhone 14 128GB',             JSON.stringify({'1':'Apple','2':'iPhone 14','3':'128GB','5':'Фиолетовый'}),              today],
    [5, 1,'IP13-128',      'iPhone 13 128GB',             JSON.stringify({'1':'Apple','2':'iPhone 13','3':'128GB','5':'Красный'}),                 today],
    [6, 1,'GS24U-256',     'Galaxy S24 Ultra 12/256GB',   JSON.stringify({'1':'Samsung','2':'Galaxy S24 Ultra','3':'256GB','4':'12GB','5':'Серый'}),today],
    [7, 1,'GS24-256',      'Galaxy S24 8/256GB',          JSON.stringify({'1':'Samsung','2':'Galaxy S24','3':'256GB','4':'8GB','5':'Белый'}),       today],
    [8, 1,'GA55-128',      'Galaxy A55 8/128GB',          JSON.stringify({'1':'Samsung','2':'Galaxy A55','3':'128GB','4':'8GB','5':'Лавандовый'}),  today],
    [9, 1,'GA35-128',      'Galaxy A35 6/128GB',          JSON.stringify({'1':'Samsung','2':'Galaxy A35','3':'128GB','4':'6GB','5':'Чёрный'}),      today],
    [10,1,'RN14P-256',     'Redmi Note 14 Pro 8/256GB',   JSON.stringify({'1':'Xiaomi','2':'Redmi Note 14 Pro','3':'256GB','4':'8GB','5':'Синий'}), today],
    [11,1,'RN14-128',      'Redmi Note 14 6/128GB',       JSON.stringify({'1':'Xiaomi','2':'Redmi Note 14','3':'128GB','4':'6GB','5':'Зелёный'}),  today],
    [12,1,'POCOX6P-256',   'POCO X6 Pro 8/256GB',         JSON.stringify({'1':'Xiaomi','2':'POCO X6 Pro','3':'256GB','4':'8GB','5':'Чёрный'}),     today],
    [13,1,'HON200P-256',   'Honor 200 Pro 12/256GB',      JSON.stringify({'1':'Honor','2':'Honor 200 Pro','3':'256GB','4':'12GB','5':'Серебристый'}),today],
    [14,1,'TSPARK30-128',  'Tecno Spark 30 4/128GB',      JSON.stringify({'1':'Tecno','2':'Tecno Spark 30','3':'128GB','4':'4GB','5':'Синий'}),     today],
  ]);
  Logger.log('✅ MDM демо-данные залиты');
}

// ──────────────────────────────────────────────────────────────────────
//  ФОРМАТИРОВАНИЕ
// ──────────────────────────────────────────────────────────────────────
function _formatAll(ss) {
  Object.keys(SCHEMA).forEach(function(name) {
    var sh  = ss.getSheetByName(name);
    if (!sh) return;
    var cfg = SCHEMA[name];
    var lastRow = Math.max(sh.getLastRow(), 2);
    var lastCol = cfg.headers.length;

    // Заголовок
    sh.getRange(1, 1, 1, lastCol)
      .setBackground('#37474F').setFontColor('#FFFFFF')
      .setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');

    // Тело — зебра
    if (lastRow > 1) {
      for (var r = 2; r <= lastRow; r++) {
        sh.getRange(r, 1, 1, lastCol)
          .setBackground(r % 2 === 0 ? cfg.color : '#FFFFFF').setFontSize(10);
      }
      // Числа вправо
      ['cost_usd','rate','cost_kgs','total_kgs','paid_kgs','debt_kgs','amount','qty',
       'debt_after','start_balance','current_balance','total_in','total_out',
       'current_items','current_cost_kgs'].forEach(function(col) {
        var ci = cfg.headers.indexOf(col);
        if (ci >= 0) sh.getRange(2, ci+1, lastRow-1, 1).setNumberFormat('#,##0').setHorizontalAlignment('right');
      });
      // id моноширинный
      sh.getRange(2, 1, lastRow-1, 1).setFontFamily('Courier New').setFontSize(9).setHorizontalAlignment('center');
    }
    // Ширины
    (cfg.widths || []).forEach(function(w, i){ sh.setColumnWidth(i+1, w); });
    // Бордеры
    if (lastRow > 1) {
      sh.getRange(1, 1, lastRow, lastCol)
        .setBorder(true,true,true,true,true,true,'#B0BEC5',SpreadsheetApp.BorderStyle.SOLID);
    }
  });
  Logger.log('✅ Форматирование завершено');
}

// ──────────────────────────────────────────────────────────────────────
//  ВСПОМОГАТЕЛЬНЫЕ
// ──────────────────────────────────────────────────────────────────────
function _seedSheet(ss, name, data) {
  var sh = ss.getSheetByName(name);
  if (!sh) { Logger.log('WARN: лист "' + name + '" не найден'); return; }
  if (sh.getLastRow() > 1) { Logger.log('Пропуск (данные есть): ' + name); return; }
  sh.clearContents();
  data.forEach(function(row){ sh.appendRow(row); });
  Logger.log('Залито ' + (data.length-1) + ' строк → ' + name);
}

function _ds(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
}

// ──────────────────────────────────────────────────────────────────────
//  УТИЛИТЫ ДЛЯ РАЗРАБОТКИ
// ──────────────────────────────────────────────────────────────────────
function resetDB() {
  var ui   = SpreadsheetApp.getUi();
  var resp = ui.alert('⚠️ ПОЛНЫЙ СБРОС', 'Удалить все данные и пересоздать?', ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) { ui.alert('Отменено.'); return; }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (sh && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
  initDB();
}

function initSchemaOnly() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  _createSchema(ss);
  _formatAll(ss);
  _syncAllSeq();
  Logger.log('✅ Схема создана без демо-данных');
}

function printUrl() { Logger.log(ScriptApp.getService().getUrl()); }