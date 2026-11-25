/* oxlint-disable twenty/no-hardcoded-colors */

const grayScale = {
  gray100: '#000000',
  gray90: '#141414',
  gray85: '#171717',
  gray80: '#1b1b1b',
  gray75: '#1d1d1d',
  gray70: '#222222',
  gray65: '#292929',
  gray60: '#333333',
  gray55: '#4c4c4c',
  gray50: '#666666',
  gray45: '#818181',
  gray40: '#999999',
  gray35: '#b3b3b3',
  gray30: '#cccccc',
  gray25: '#d6d6d6',
  gray20: '#ebebeb',
  gray15: '#f1f1f1',
  gray10: '#fcfcfc',
  gray0: '#ffffff',
};

const colors = {
  // Growth OS CRM: SPV teal strong (accessible on white) instead of upstream blue.
  blue40: '#3A7872',
};

// Growth OS CRM brand tokens (/workspace/projects/growth-os/brand/tokens.css).
const spv = {
  navy: '#111E32',
  text: '#3E4C60',
  muted: '#65758B',
  border: '#DAE0E7',
  warm: '#F5F7F9',
};

export const canvasTheme = {
  font: {
    colors: {
      highlighted: spv.navy,
      primary: spv.text,
      tertiary: spv.muted,
      inverted: grayScale.gray0,
      blue: colors.blue40,
    },
    // Growth OS CRM: email-safe brand stack (--font-email-ui in tokens.css).
    family: "Inter, 'Segoe UI', Helvetica, Arial, sans-serif",
    weight: {
      regular: 400,
      bold: 600,
    },
    size: {
      sm: '12px',
      md: '13px',
      lg: '16px',
      xl: '24px',
    },
    lineHeight: '20px',
  },
  border: {
    radius: { sm: '4px', md: '8px' },
    color: { highlighted: spv.border },
  },
  background: {
    colors: { highlight: spv.warm },
    button: spv.navy,
    transparent: {
      medium: 'rgba(0, 0, 0, 0.08)',
      light: 'rgba(0, 0, 0, 0.04)',
    },
  },
};
