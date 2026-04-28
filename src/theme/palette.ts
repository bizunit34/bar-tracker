export const palette = {
  amber: {
    300: '#FFD28A',
    400: '#F0B45A',
    500: '#D9952B',
    600: '#B87319',
    700: '#9A5C12',
  },
  blue: {
    300: '#9EC4D3',
    500: '#5C8EA6',
    600: '#3E6B83',
    700: '#2F5064',
  },
  copper: {
    400: '#D48A5C',
    500: '#B96E45',
    600: '#9B5635',
    700: '#7D3F24',
  },
  gold: {
    300: '#F4D88A',
    500: '#D9AA35',
    600: '#B58A22',
    700: '#8A6818',
  },
  neutral: {
    black: '#080604',
    cream50: '#FFF9F0',
    cream100: '#F4EFE7',
    espresso700: '#34261E',
    espresso800: '#261C16',
    espresso850: '#1E1611',
    espresso900: '#17100C',
    espresso950: '#100B08',
    sand300: '#C7BDAF',
    sand500: '#9A8D7D',
  },
  red: {
    300: '#F0A39B',
    500: '#C65349',
    600: '#A13D36',
    700: '#782E2A',
  },
  sage: {
    300: '#A7C6AA',
    500: '#6F9474',
    600: '#557A5D',
    700: '#3F5F46',
  },
} as const;

export type Palette = typeof palette;
