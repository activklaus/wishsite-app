// Full palette ported from wishsite3 (app/assets/stylesheets/base/_variables.scss)
export const palette = {
  white: { l1: '#FBF9F9', plain: '#FFFFFF' },
  sand: { l1: '#E6E0D8', l2: '#EBE6E0', l3: '#F1EDE9', l4: '#F6F3F1', d1: '#E6E0D8', d2: '#B5B1AB', d3: '#84817D', d4: '#535250' },
  green: { l1: '#6BBE7D', l2: '#8FCD9C', l3: '#B3DCBB', l4: '#D7EADA', d1: '#6BBE7D', d2: '#599766', d3: '#477050', d4: '#344939' },
  yellow: { l1: '#F6C25B', l2: '#F7D083', l3: '#F9DEAA', l4: '#FAEBD2', d1: '#F6C25B', d2: '#C19A4D', d3: '#8C723F', d4: '#574A30' },
  red: { l1: '#F65B5B', l2: '#F78383', l3: '#F9AAAA', l4: '#FAD2D2', d1: '#F65B5B', d2: '#C14D4D', d3: '#8C3F3F', d4: '#573030' },
  pink: { l1: '#EC6CA9', l2: '#F08FBD', l3: '#F3B3D1', l4: '#F7D6E5', d1: '#EC6CA9', d2: '#BA5A87', d3: '#874766', d4: '#553544' },
  violet: { l1: '#8E6BCF', l2: '#A98FDA', l3: '#C4B2E4', l4: '#E0D6EF', d1: '#8E6BCF', d2: '#7359A4', d3: '#584779', d4: '#3D344D' },
  blue: { l1: '#6188D6', l2: '#88A4DF', l3: '#AEC1E8', l4: '#D4DDF0', d1: '#6188D6', d2: '#516FA9', d3: '#42557C', d4: '#323C4F' },
  brown: { l1: '#8C6040', l2: '#A8866E', l3: '#C3AD9D', l4: '#DFD3CB', d1: '#8C6040', d2: '#725139', d3: '#574131', d4: '#3D322A' },
  black: { l1: '#4A4A4A', l2: '#767676', l3: '#A3A2A2', l4: '#CFCDCD', d1: '#4A4A4A', d2: '#404040', d3: '#363636', d4: '#2C2C2C' },
  whiteDark: { d1: '#FBF9F9', d2: '#C5C3C3', d3: '#8F8E8E', d4: '#585858' },
};

export const lightTheme = {
  background: palette.white.l1,
  surface: palette.white.plain,
  text: palette.black.l1,
  textSecondary: palette.black.l2,
  textMuted: palette.black.l3,
  border: palette.sand.l1,
  inputBackground: palette.sand.l4,
  primary: palette.blue.l1,
  primaryHover: palette.blue.l2,
  primaryActive: palette.blue.l3,
  primaryMuted: palette.blue.l4,
  link: palette.blue.l1,
  positive: palette.green.l1,
  positiveHover: palette.green.l2,
  positiveActive: palette.green.l3,
  danger: palette.red.l1,
  dangerBackground: palette.red.l3,
  warning: palette.yellow.l1,
  warningBackground: palette.yellow.l3,
  successBackground: palette.green.l3,

  // Legacy aliases kept for compatibility while screens are migrated
  background2: palette.white.plain,
  text2: palette.black.l2,
  button: palette.blue.l1,
  green1: palette.green.l1,
  red1: palette.red.l1,
  black1: palette.black.l1,
};

export const darkTheme = {
  background: palette.black.d4,
  surface: palette.black.d3,
  text: palette.whiteDark.d1,
  textSecondary: palette.whiteDark.d2,
  textMuted: palette.whiteDark.d3,
  border: palette.black.d2,
  inputBackground: palette.black.d2,
  primary: palette.blue.d1,
  primaryHover: palette.blue.d2,
  primaryActive: palette.blue.d3,
  primaryMuted: palette.blue.d4,
  link: palette.blue.d1,
  positive: palette.green.d1,
  positiveHover: palette.green.d2,
  positiveActive: palette.green.d3,
  danger: palette.red.d1,
  dangerBackground: palette.red.d4,
  warning: palette.yellow.d1,
  warningBackground: palette.yellow.d4,
  successBackground: palette.green.d4,

  // Legacy aliases kept for compatibility while screens are migrated
  background2: palette.black.d3,
  text2: palette.whiteDark.d2,
  button: palette.blue.d1,
  green1: palette.green.d1,
  red1: palette.red.d1,
  black1: palette.black.d1,
};

export default lightTheme;
