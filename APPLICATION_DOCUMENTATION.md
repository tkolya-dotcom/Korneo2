# APPLICATION_DOCUMENTATION

## 1. Обзор продукта
Korneo — корпоративная система для управления задачами, АВР, монтажами, заявками, складом, мессенджером, уведомлениями и картой объектов/сотрудников.

Текущий production-контур исторически построен как web/PWA слой (корневой `index.html` + `js/*` + service workers + Firebase messaging), с параллельными наработками в `frontend/` и backend API в `backend/src`.

## 2. Основные функциональные домены
- Auth и профили пользователей (Supabase Auth + роли).
- Tasks (создание, статусы, назначение, дедлайны, архив).
- AVR (оборудование, замены, причины, статусы).
- Installations (площадки, оборудование, план-факт статусы).
- Purchase Requests / Warehouse (материалы, остатки, заявки).
- Messenger (чаты, сообщения, realtime).
- Notifications (FCM/Web Push, realtime уведомления).
- Geo/Map (карта объектов и сотрудников, адреса).

## 3. Технический ландшафт (факт)
- **Web/PWA:** корневой `index.html`, `manifest.json`, `service-worker.js`, `firebase-messaging-sw.js`, `js/*`.
- **Frontend (React/Vite):** `frontend/src/*` (частично дублирует домены web/PWA).
- **Backend:** `backend/src/*` на Express + Supabase.
- **Android shell:** `android/*` (Capacitor/WebView + native integrations).
- **Supabase:** `supabase/functions/*`, SQL в `docs/*`.

## 4. Ограничения текущего состояния
- Параллельные реализации UI (монолитный PWA и React-приложение).
- Не все домены равномерно покрыты тестами/контрактами.
- Mobile-first UX для нативного клиента отсутствует.

## 5. Цель mobile-направления
Создать отдельное приложение `apps/mobile` (Expo + React Native), переиспользующее существующий backend/Supabase-контур и доменную модель из `packages/domain`.
