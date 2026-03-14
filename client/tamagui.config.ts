import { config } from '@tamagui/config/v3';
import { createTamagui } from 'tamagui';

const customThemes = {
  ...config.themes,
  light: {
    ...config.themes.light,
    background: '#1A1817',
    backgroundDark: '#0f0e0d',
    surface: '#2A2725',
    card: '#2A2725',
    primarySoft: '#3A3633',
    color: '#FFFFFF',
    textMuted: '#A09890',
    borderColor: '#403C39',
    input: '#FFFFFF',
    textLight: '#FFFFFF',
    textDark: '#000000',
    inputPlaceholderText: '#A09890',
    button: '#7e3486',
    buttonHover: '#652a6b',
    buttonSecondary: '#6a456e',
  },
  dark: {
    ...config.themes.dark,
    background: '#1A1817',
    backgroundDark: '#0f0e0d',
    surface: '#2A2725',
    card: '#2A2725',
    primarySoft: '#3A3633',
    color: '#FFFFFF',
    textMuted: '#A09890',
    borderColor: '#403C39',
    input: '#FFFFFF',
    textLight: '#FFFFFF',
    textDark: '#000000',
    inputPlaceholderText: '#A09890',
    button: '#7e3486',
    buttonHover: '#652a6b',
    buttonSecondary: '#6a456e',
  },
};

const tamaguiConfig = createTamagui({
  ...config,
  themes: customThemes,
});

export type AppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
