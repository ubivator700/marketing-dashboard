# Деплой Marketing Dashboard на VPS

## Требования

- VPS с Ubuntu 22.04+ (минимум 1 GB RAM, 20 GB SSD)
- Домен, направленный на IP-адрес сервера (A-запись)
- Docker и Docker Compose установлены

## Установка Docker (если не установлен)

```bash
# Обновить пакеты
sudo apt update && sudo apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Перезайти в сессию для применения группы
exit
# Войти заново

# Проверить
docker --version
docker compose version
```

## Пошаговый деплой

### 1. Клонировать репозиторий

```bash
git clone <your-repo-url> /opt/marketing-dashboard
cd /opt/marketing-dashboard
```

### 2. Настроить переменные окружения

```bash
cp .env.example .env
nano .env
```

Заполнить **все** значения:

| Переменная | Описание |
|---|---|
| `DB_PASSWORD` | Надёжный пароль для пользователя БД |
| `MYSQL_ROOT_PASSWORD` | Надёжный root-пароль MySQL |
| `JWT_SECRET` | Случайная строка 64+ символов |

Сгенерировать секреты:
```bash
# JWT Secret
openssl rand -base64 48

# Пароли
openssl rand -base64 24
```

### 3. Настроить домен

Заменить `YOUR_DOMAIN.COM` на ваш домен:

```bash
# nginx.conf (3 вхождения)
sed -i 's/YOUR_DOMAIN.COM/your-domain.com/g' deploy/nginx.conf

# init-letsencrypt.sh
sed -i 's/YOUR_DOMAIN.COM/your-domain.com/g' deploy/init-letsencrypt.sh
sed -i 's/YOUR_EMAIL@EXAMPLE.COM/your@email.com/g' deploy/init-letsencrypt.sh
```

### 4. Получить SSL-сертификат

```bash
chmod +x deploy/init-letsencrypt.sh
sudo ./deploy/init-letsencrypt.sh
```

> **Совет:** для тестирования установите `STAGING=1` в скрипте, чтобы не упереться в лимиты Let's Encrypt.

### 5. Запустить всё

```bash
docker compose up -d --build
```

### 6. Проверить

```bash
# Статус контейнеров
docker compose ps

# Логи приложения
docker compose logs -f app

# Логи Nginx
docker compose logs -f nginx
```

Откройте `https://your-domain.com` в браузере.

**Логин по умолчанию:** admin / admin123

> **Важно:** смените пароль после первого входа!

## Полезные команды

```bash
# Перезапуск
docker compose restart

# Обновление приложения
git pull
docker compose up -d --build

# Просмотр логов
docker compose logs -f

# Остановка
docker compose down

# Остановка + удаление данных (ОСТОРОЖНО!)
docker compose down -v

# Бекап базы данных
docker compose exec db mysqldump -u root -p dashboard > backup_$(date +%Y%m%d).sql

# Восстановление из бекапа
docker compose exec -T db mysql -u root -p dashboard < backup.sql

# Ручное обновление SSL-сертификата
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

## Структура

```
.
├── Dockerfile              # Multi-stage сборка Next.js
├── docker-compose.yml      # Оркестрация: app + db + nginx + certbot
├── .env.example            # Шаблон переменных окружения
├── .dockerignore           # Исключения из Docker-контекста
├── scripts/
│   └── init-db.sql         # Инициализация БД (схема + сидовые данные)
└── deploy/
    ├── nginx.conf          # Конфигурация Nginx (reverse proxy + SSL)
    ├── init-letsencrypt.sh # Скрипт получения SSL-сертификата
    └── README.md           # ← вы здесь
```

## Troubleshooting

**Контейнер app не стартует:**
```bash
docker compose logs app
# Проверить: подключается ли к БД? Есть ли JWT_SECRET?
```

**502 Bad Gateway:**
```bash
# App ещё не готов — подождать 10-15 секунд
docker compose ps
# Если app unhealthy — смотреть логи
```

**Сертификат не получается:**
```bash
# Проверить, что домен указывает на сервер
dig +short your-domain.com
# Должен вернуть IP сервера

# Проверить, что порты 80/443 открыты
sudo ufw allow 80
sudo ufw allow 443
```
