# Change Logs — МобилТрек Pro

> Журнал всех изменений проекта. Заполняется **при каждом изменении**, включая незначительные правки.

| Дата | Описание | Анализ | To Be (Что должно быть) | As Is (Что сейчас) | Что изменено | Файлы |
|------|----------|--------|--------------------------|---------------------|--------------|-------|
| 2026-04-08 | Создание структуры Artifacts и банка знаний | Проект не имел документации и системы отслеживания контекста для ИИ | Организованная папка Artifacts с Documents и memory-bank; инструкция с правилами обновления | Документация отсутствовала, FSD лежал в корне | Создан `Artifacts/Documents/`, `Artifacts/memory-bank/` с 4 файлами; FSD перемещён; инструкция обновлена | - `Artifacts/Documents/FSD MDM Интеграция.md`<br>- `Artifacts/memory-bank/FSD.md`<br>- `Artifacts/memory-bank/productContext.md`<br>- `Artifacts/memory-bank/activeContext.md`<br>- `Artifacts/memory-bank/systemArchitecture.md`<br>- `.github/instructions/gas-project.instructions.md` |
| 2026-04-08 | Создание журнала изменений (Change Logs) | Отсутствовал единый лог изменений для отслеживания истории правок | Файл Change_Logs.md с таблицей; правило в инструкции обновлять лог при каждом изменении | Лог изменений не вёлся | Создан `Artifacts/memory-bank/Change_Logs.md`; обновлена инструкция | - `Artifacts/memory-bank/Change_Logs.md`<br>- `.github/instructions/gas-project.instructions.md` |
| 2026-04-08 | Формат столбца «Файлы» в Change Logs | Файлы записывались в одну строку — трудно читать | Каждый файл с новой строки через `<br>` и префикс `- ` | Файлы перечислены через запятую в одну строку | Обновлён формат записей в Change_Logs.md; добавлено правило формата в инструкцию | - `Artifacts/memory-bank/Change_Logs.md`<br>- `.github/instructions/gas-project.instructions.md` |
