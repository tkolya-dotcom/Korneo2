# Korneo Mobile Plan

Обновлено: 2026-04-07

## Проверка текущего состояния (перед стартом)

### Уже сделано
- Есть подробный high-level план миграции на mobile-native.
- Есть `packages/domain/types.ts`, но файл пуст и требует наполнения.
- Есть web/PWA слой в корне проекта и backend API в `backend/src`.

### Ещё не сделано
- Нет `APPLICATION_DOCUMENTATION.md` (создан в этом шаге).
- Нет `DOMAIN_MAP.md` (создан в этом шаге).
- Нет базового Expo-приложения в `apps/mobile` (создан базовый каркас в этом шаге).
- Нет `apps/web` как выделенного контейнера под web-клиент (добавлен placeholder каталог).

---

## Целевая Monorepo-архитектура

```text
korneo/
├── apps/
│   ├── web/          # web/PWA клиент (этап миграции)
│   └── mobile/       # Expo React Native клиент
├── packages/
│   ├── domain/       # типы, роли, статусы, бизнес-правила
│   └── api/          # supabase client, queries, mutations, auth helpers
├── supabase/         # migrations, edge functions, RLS, push logic
└── .github/          # CI/CD workflows
```

---

## Этапы реализации

### Этап 1 — Audit & Decomposition
- [x] `APPLICATION_DOCUMENTATION.md`
- [x] `DOMAIN_MAP.md`
- [x] Базовые доменные типы в `packages/domain`
- [x] Базовый Expo-каркас `apps/mobile`
- [ ] План миграции web из корня в `apps/web`

### Этап 2 — Backend & Auth
- [x] Supabase Auth в mobile (базовое подключение)
- [x] Login/Register/Recovery
- [x] Session restore + refresh token flow (через `getSession` + `onAuthStateChange`)
- [ ] Role-aware routing

### Этап 3 — Navigation & Core UI
- [ ] Expo Router: AuthStack + MainTabs + nested stacks
- [ ] Dashboard
- [ ] Mobile design system (Korneo dark/cyan-green)

### Этап 4 — Tasks
- [ ] Список + фильтры
- [ ] Детали задачи
- [ ] Смена статуса
- [ ] Комментарии/вложения (если есть в backend flow)

### Этап 5 — AVR + Installations
- [ ] Списки и детали AVR
- [ ] Списки и детали монтажей
- [ ] Базовые действия по монтажам

### Этап 6 — Push Notifications
- [ ] Expo Notifications
- [ ] Регистрация mobile device token
- [ ] Новый backend push pipeline
- [ ] Deep linking

### Этап 7 — Geo & Map
- [ ] Foreground tracking
- [ ] Карта объектов/сотрудников
- [ ] Background tracking (после MVP)

### Этап 8 — Messenger
- [ ] Messages list / detail
- [ ] Медиа
- [ ] Advanced features после MVP

### Этап 9 — CI/CD
- [ ] EAS Build (Android/iOS)
- [ ] EAS Update
- [ ] Sentry
- [ ] Разделённые workflow для web/mobile/supabase

---

## MVP приоритеты

### В MVP
Auth, Session Restore, Dashboard, Tasks, AVR, Installations, Push, Profile/Settings.

### Вторая очередь
Purchase Requests, Warehouse, advanced Messenger, map integrations, analytics, background location.
