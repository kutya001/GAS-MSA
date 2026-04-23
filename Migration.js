/**
 * СЕРВИСНЫЙ СКРИПТ МИГРАЦИИ
 * Запустить один раз из редактора GAS для обновления структуры таблицы Кошельки.
 */
function patchWalletsTable() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Кошельки');
  if (!sh) {
    Logger.log('Лист "Кошельки" не найден');
    return;
  }
  
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const createdAtIdx = headers.indexOf('created_at');
  
  if (headers.indexOf('is_pos') === -1) {
    // Вставляем колонку перед 'created_at'
    // Индекс в Google Sheets 1-based, поэтому +1
    const targetCol = createdAtIdx + 1; 
    sh.insertColumnBefore(targetCol);
    sh.getRange(1, targetCol).setValue('is_pos');
    
    // Проставляем TRUE для всех существующих кошельков
    const lastRow = sh.getLastRow();
    if (lastRow > 1) {
      const values = Array(lastRow - 1).fill(['TRUE']);
      sh.getRange(2, targetCol, lastRow - 1, 1).setValues(values);
    }
    Logger.log('Колонка is_pos успешно добавлена в позицию ' + targetCol);
    
    // Очищаем кэш, чтобы фронтенд увидел изменения
    _cDel(['wallets']); 
  } else {
    Logger.log('Колонка is_pos уже существует');
  }
}
