// Font configuration
export const fonts = {
  // Lauftexte
  regular: 'Montserrat-Regular',
  // Hervorhebungen
  bold: 'Montserrat-Bold',
  // Überschriften und Buttons
  alternatesBold: 'MontserratAlternates-Bold',
};

// letter-spacing: -0.04em in the web design system, scaled per font size
const headingLetterSpacing = (fontSize) => -0.04 * fontSize;

// Font types with letter spacing
export const fontStyles = {
  // Überschriften: Montserrat Alternates Bold, Spationierung: -4%
  heading: {
    fontFamily: fonts.alternatesBold,
  },
  // Lauftexte: Montserrat Regular, Spationierung: 0
  body: {
    fontFamily: fonts.regular,
    letterSpacing: 0,
  },
  // Hervorhebungen: Montserrat Bold
  strong: {
    fontFamily: fonts.bold,
    letterSpacing: 0,
  },
  // Buttons: Montserrat Alternates Bold, Spationierung: -4%
  button: {
    fontFamily: fonts.alternatesBold,
  },
};

// Helper functions
export const headingStyle = (fontSize) => ({
  ...fontStyles.heading,
  fontSize,
  letterSpacing: headingLetterSpacing(fontSize),
});

export const bodyStyle = (fontSize) => ({
  ...fontStyles.body,
  fontSize,
});

export const strongStyle = (fontSize) => ({
  ...fontStyles.strong,
  fontSize,
});

export const buttonStyle = (fontSize) => ({
  ...fontStyles.button,
  fontSize,
  letterSpacing: headingLetterSpacing(fontSize),
  textAlign: 'center',
});
