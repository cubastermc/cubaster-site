# Cubaster Site

Сайт игры и fallback-каталог серверов. Деплоится на GitHub Pages (`cubaster.com`).

## Структура

```
cubaster-site/
├── index.html                           — главная
├── 404.html                             — кастомная 404
├── LICENSE                              — MIT
├── CNAME                                — cubaster.com
├── css/style.css                        — стили
├── fonts/InterVariable.woff2            — шрифт Inter (self-hosted)
├── img/
│   ├── icon.png                         — иконка приложения
│   ├── favicon.png                      — favicon
│   └── Screenshot_*.png                 — скриншоты
└── catalog/v1/
    ├── recommended-servers.json         — fallback каталог
    └── icons/                           — fallback иконки слотов (64×64 PNG)
        └── <server-id>.png              — иконка слота
```

## Деплой на GitHub Pages

1. Создать репо, залить содержимое
2. Settings → Pages → Source: `main` / `/ (root)`
3. Custom domain: `cubaster.com`
4. DNS: 4 A-записи на GitHub Pages IPs

## Обновление fallback-каталога

При изменении серверов на VPS — обновить `catalog/v1/recommended-servers.json` и push.

## Обновление иконок слотов

При публикации нового слота или обновлении иконки:

1. Добавить `catalog/v1/icons/<server-id>.png` (64×64 PNG)
2. Обновить `iconPath` в `catalog/v1/recommended-servers.json`
3. Push