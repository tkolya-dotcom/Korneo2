# Mobile Release Runbook (Android + iOS via GitHub)

## Цель
Довести проект до регулярных релизов нативного приложения (Android/iOS) с установкой на телефон через GitHub-triggered EAS pipelines.

## 1) Release strategy

### Каналы
- **preview** — внутренние сборки для QA и быстрой проверки.
- **production** — релизные сборки для стора/TestFlight.

### Ветки
- `develop` → preview builds.
- `main` + tag `v*` → production builds.

### Артефакты
- Android preview: APK (прямая установка на Android-телефон).
- Android production: AAB (Google Play upload).
- iOS preview/production: IPA/TestFlight через EAS.

## 2) Минимальные входные условия
1. В `apps/mobile` присутствует Expo app (`app.json/app.config.ts`, `package.json`, `eas.json`).
2. Проект привязан к Expo account (`eas project:init`).
3. В GitHub Secrets настроены:
   - `EXPO_TOKEN`
   - `EXPO_APPLE_ID` (если нужна авто-подача в App Store Connect)
   - `EXPO_ASC_APP_ID` (App Store Connect app id)
   - `EXPO_APPLE_TEAM_ID`
   - `EXPO_ANDROID_SERVICE_ACCOUNT_JSON` (JSON service account для Play Console)
4. Bundle IDs/package names зафиксированы:
   - iOS: `com.korneo.app`
   - Android: `com.korneo.app`

## 3) CI/CD flow

### Preview flow
1. Push в `develop`.
2. GitHub Actions запускает `.github/workflows/mobile-eas-preview.yml`.
3. Workflow запускает `eas build --platform all --profile preview --non-interactive`.
4. Команда получает install links из Expo dashboard.

### Production flow
1. Создать тег `vX.Y.Z` из `main`.
2. GitHub Actions запускает `.github/workflows/mobile-eas-production.yml`.
3. Workflow собирает релизные build’ы (`production` profile).
4. Опционально выполняется submit в stores (`mobile-eas-submit.yml`) после smoke-check.

## 4) Release checklist
- [ ] Версия и build number обновлены (`app.config.ts`/`eas.json`).
- [ ] Changelog готов.
- [ ] Проверен login/logout, tasks, AVR, installations, push.
- [ ] Проверены permissions (notifications/location/camera при необходимости).
- [ ] Android smoke test на физическом устройстве через preview APK.
- [ ] iOS smoke test через TestFlight.
- [ ] Rollback plan (предыдущая стабильная версия и EAS Update rollback).

## 5) Установка на телефон

### Android
1. Открыть build URL из Expo (preview APK).
2. Скачать APK на устройство.
3. Разрешить install from unknown sources (для внутреннего теста).
4. Установить и выполнить smoke test.

### iOS
1. Добавить тестеров в App Store Connect/TestFlight.
2. Дождаться обработки билда Apple.
3. Установить через TestFlight.

## 6) Роли и ответственность
- **Engineering**: релиз-кандидат, CI green, фиксы блокеров.
- **QA**: smoke + regression на critical flows.
- **Product/Owner**: go/no-go решение.

## 7) Definition of Done для “готово к релизу”
- Автоматические preview build’ы на каждом push в `develop`.
- Релизные build’ы по тегу `v*` из `main`.
- Повторяемая установка на Android и iOS устройства без локальной сборки вручную.
- Документированный runbook и секреты в GitHub.
