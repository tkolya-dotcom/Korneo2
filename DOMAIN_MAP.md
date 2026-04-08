# DOMAIN_MAP

## Роли
- `worker` — исполнение задач/монтажей, заявки, чат.
- `engineer` — расширенные операции по задачам/монтажам.
- `manager` — управление задачами, одобрение заявок, склад.
- `deputy_head` — расширенное администрирование ролей.
- `admin` — полный доступ.

## Ключевые сущности
- `users`
- `projects`
- `tasks`
- `tasks_avr`
- `installations`
- `materials`
- `warehouse`
- `purchase_requests` + `purchase_request_items`
- `chats` + `messages`
- `notification_queue` / `user_push_subs`
- `user_locations`

## Основные статусы (ядро)
### Tasks
`new`, `planned`, `in_progress`, `waiting_materials`, `done`, `postponed`

### Installations
`new`, `planned`, `in_progress`, `waiting_materials`, `done`, `postponed`

### Purchase Requests
`draft`, `approved`, `rejected`, `in_order`, `ready_for_receipt`, `received`, `done`, `postponed`

## Пользовательские сценарии
1. Login → загрузка профиля/роли → role-aware навигация.
2. Worker открывает список задач → детали → меняет статус → оставляет комментарий.
3. Worker/Engineer создаёт заявку на материалы из задачи/монтажа.
4. Manager обрабатывает заявки и подтверждает складские операции.
5. Пользователь получает push и открывает deep-link в целевой экран.
6. Пользователь работает с чатами и сообщениями.

## Карта экранов (mobile target)
- `/auth` (Login/Register/Recovery)
- `/(app)/index` (Dashboard)
- `/(app)/tasks`, `/(app)/tasks/[id]`
- `/(app)/avr`, `/(app)/avr/[id]`
- `/(app)/installations`, `/(app)/installations/[id]`
- `/(app)/messages`, `/(app)/messages/[id]`
- `/(app)/profile`
- `/(app)/map`
