// Shared design tokens ported from wishsite3 (app/assets/stylesheets/global.scss)

export const RADIUS = {
  pill: 999,
  card: 15,
  small: 5,
};

// Web: border-radius: 0 30px 30px 30px (global.scss .input-field)
export const INPUT_RADIUS = {
  borderTopLeftRadius: 0,
  borderTopRightRadius: 30,
  borderBottomLeftRadius: 30,
  borderBottomRightRadius: 30,
};

// Web: .card { box-shadow: 0 2px 8px rgba(0,0,0,0.06); } / dark: rgba(0,0,0,0.3)
export const cardShadow = (theme, isDarkMode) => ({
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: isDarkMode ? 0.3 : 0.06,
  shadowRadius: 8,
  elevation: 3,
});

// Web: .card { border-radius: 15px; background: var(--plain_white); padding: 12px 14px; box-shadow: ...; }
// (global.scss) — the white card that form fields sit on, giving them contrast against the page background.
export const cardStyle = (theme, isDarkMode) => ({
  backgroundColor: theme.surface,
  borderRadius: RADIUS.card,
  padding: 16,
  ...cardShadow(theme, isDarkMode),
});

// Wishlist header banner/avatar sizing, ported from wishsite3
// (app/assets/stylesheets/controllers/wishlist.scss #wl-banner-wrapper)
export const BANNER_HEIGHT = 200;
export const AVATAR_SIZE = 200;
export const AVATAR_BOTTOM_OFFSET = 25;
