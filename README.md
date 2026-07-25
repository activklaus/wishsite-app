# Wishsite App - Expo Version

This is the Expo version of the Wishsite React Native app, migrated from the original React Native CLI project.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Run on specific platforms:
   ```bash
   npm run android  # Android
   npm run ios      # iOS
   npm run web      # Web
   ```

## Project Structure

- `src/` - Source code
  - `screens/` - App screens
  - `components/` - Reusable components
  - `hooks/` - Custom hooks
  - `i18n/` - Internationalization
  - `services/` - API services
  - `styles/` - Theme and styling
- `assets/` - Images and static assets

## Features

- User authentication (login/register)
- Wishlist management
- Multi-language support (German/English)
- Dark/Light theme support
- Welcome screen with carousel
- Responsive design for tablets and phones

## Migration Notes

This project was migrated from React Native CLI to Expo. Key changes:
- Removed native Android/iOS code
- Updated to use Expo SDK
- Simplified build and deployment process
- Removed React Native specific share functionality (to be reimplemented with Expo)