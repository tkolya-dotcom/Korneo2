# Mobile Release Plan (Execution Baseline)

## Что реализовано в этом шаге

1. Создана monorepo-основа для `apps/mobile` и `packages/*`.
2. Добавлен MVP каркас Expo Router:
   - auth экран,
   - табы `Dashboard`, `Tasks`, `Profile`,
   - session restore через Supabase.
3. Добавлены общие доменные типы в `packages/domain`.
4. Добавлен reusable API пакет `packages/api`.
5. Добавлен CI workflow для EAS-based mobile release.

## Что нужно для релиза v1.0.0

### Product
- Подключить реальные данные на Dashboard и Tasks.
- Добавить AVR/Installations stack.
- Реализовать Recovery и Register.
- Добавить экран деталей задачи + смену статуса.

### Platform
- Настроить EAS Project ID.
- Добавить секреты в GitHub:
  - `EXPO_TOKEN`
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Настроить `eas credentials` для Android/iOS.

### QA
- Smoke тесты auth flow.
- Smoke тесты открытия списка задач.
- Проверка sign out и restore session.

### Release
1. Merge в `main`.
2. GitHub Action `mobile-eas-release`.
3. Проверка артефактов APK/AAB и релизных notes.
