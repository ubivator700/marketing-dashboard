# Деплой Marketing Dashboard на VPS

## Требования

- VPS с Ubuntu 22.04+ (минимум 1 GB RAM, 20 GB SSD)
- Домен, направленный на IP-адрес сервера (A-запись)
- Docker и Docker Compose установлены
- Nginx установлен на хосте

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

## Установка Nginx (если не установлен)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
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

### 3. Запустить Docker (app + MySQL)

```bash
docker compose up -d --build
```

Проверить что контейнеры работают:
```bash
docker compose ps
docker compose logs -f app
```

### 4. Настроить Nginx

```bash
# Скопировать конфиг
sudo cp deploy/nginx.conf /etc/nginx/sites-available/lkmarketing.online

# Включить сайт
sudo ln -s /etc/nginx/sites-available/lkmarketing.online /etc/nginx/sites-enabled/

# Проверить конфигурацию
sudo nginx -t

# Перезагрузить
sudo systemctl reload nginx
```

### 5. Получить SSL-сертификат

```bash
sudo certbot --nginx -d lkmarketing.online
```

Certbot автоматически обновит конфиг Nginx и настроит автопродление.

### 6. Проверить

Откройте `https://lkmarketing.online` в браузере.

**Логин по умолчанию:** admin / admin123

> **Важно:** смените пароль после первого входа!

## Полезные команды

```bash
# Перезапуск приложения
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

# Статус Nginx
sudo systemctl status nginx

# Проверить SSL-сертификат
sudo certbot certificates

# Ручное обновление SSL
sudo certbot renew
```

## Структура

```
.
├── Dockerfile              # Multi-stage сборка Next.js
├── docker-compose.yml      # Оркестрация: app + db
├── .env.example            # Шаблон переменных окружения
├── .dockerignore           # Исключения из Docker-контекста
├── scripts/
│   └── init-db.sql         # Инициализация БД (схема + сидовые данные)
└── deploy/
    ├── nginx.conf          # Конфигурация для хостового Nginx
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
# Если app не работает — смотреть логи
docker compose logs app
```

**Сертификат не получается:**
```bash
# Проверить, что домен указывает на сервер
dig +short lkmarketing.online
# Должен вернуть IP сервера

# Проверить, что порты 80/443 открыты
sudo ufw allow 80
sudo ufw allow 443
```
