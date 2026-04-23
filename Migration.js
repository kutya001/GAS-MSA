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
  let colIdx = headers.indexOf('is_pos') + 1;

  if (colIdx === 0) {
    const createdAtIdx = headers.indexOf('created_at');
    colIdx = createdAtIdx + 1;
    sh.insertColumnBefore(colIdx);
    sh.getRange(1, colIdx).setValue('is_pos');
    Logger.log('Колонка is_pos добавлена');
  }

  // Заполняем пустые ячейки TRUE
  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    const range = sh.getRange(2, colIdx, lastRow - 1, 1);
    const values = range.getValues();
    let updated = false;
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === '' || values[i][0] == null) {
        values[i][0] = 'TRUE';
        updated = true;
      }
    }
    if (updated) {
      range.setValues(values);
      Logger.log('Пустые значения is_pos заполнены TRUE');
    }
  }

  _cDel(['wallets']);
}
