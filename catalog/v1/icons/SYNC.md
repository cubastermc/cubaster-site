# Icon Assets — Fallback Host

Эта папка содержит статические иконки рекомендованных серверов для fallback-хоста (`cubaster.com`).

## Требования к файлам

- Формат: PNG
- Размер: 64×64 пикселей
- Именование: `<server-id>.png` (где `server-id` совпадает с полем `id` в каталоге)
- Путь: `catalog/v1/icons/<server-id>.png`

## Правило: icon assets immutable

**Замена файла с тем же именем запрещена.**

Иконки кешируются в памяти клиента без TTL на время жизни процесса.
Замена файла на сервере с тем же именем не инвалидирует уже загруженную иконку — пользователь увидит старую до перезапуска приложения.

При обновлении иконки всегда использовать новое имя:
```
mc-zone.png  →  mc-zone-v2.png
```

## Синхронизация с VPS

При публикации нового слота:

1. Добавить файл в эту папку: `catalog/v1/icons/<server-id>.png`
2. Загрузить на VPS: `/opt/cubaster-api/icons/<server-id>.png`
3. Обновить `icon_path` в DB: `UPDATE servers SET icon_path = '/catalog/v1/icons/<server-id>.png' WHERE id = '...';`
4. Обновить `catalog/v1/recommended-servers.json` в этом репо
5. Push

При обновлении иконки существующего слота:

1. Добавить новый файл с новым именем: `<server-id>-v2.png`
2. Загрузить на VPS: `/opt/cubaster-api/icons/<server-id>-v2.png`
3. Обновить `icon_path` в DB на новый путь
4. Обновить fallback JSON на новый путь
5. Push
6. Старый файл удалить после того как клиенты обновят кеш каталога (15 мин TTL)

Primary (VPS) и fallback (GitHub Pages) должны содержать одинаковые файлы.
Расхождение приведёт к тому, что иконки не загрузятся при failover на fallback.
