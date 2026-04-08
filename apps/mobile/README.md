# Korneo Mobile (Expo)

Этот каталог предназначен для нативного клиента (Android/iOS) на Expo React Native.

## Быстрый старт
1. Инициализировать Expo app (если ещё не сделано):
   ```bash
   npx create-expo-app@latest .
   ```
2. Установить EAS CLI:
   ```bash
   npm i -g eas-cli
   ```
3. Привязать проект к Expo:
   ```bash
   eas login
   eas project:init
   ```
4. Проверить профили сборки:
   ```bash
   eas build:list
   ```

## Обязательные файлы
- `app.json` или `app.config.ts`
- `package.json`
- `eas.json`

## CI/CD
Сборки запускаются из GitHub Actions workflows в `.github/workflows`.
