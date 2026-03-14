import { config } from '@tamagui/config/v3';
import { createTamagui, createTokens } from 'tamagui';

const customThemes = {
  ...config.themes,
  light: {
    ...config.themes.light,
    background: '#57245d',
    backgroundDark: '#3A183E',
    card: '#2a2a2a',
    input: '#FFFFFF',
    textLight: '#FFFFFF',
    textDark: '#000000',
    inputPlaceholderText: '#9494a2',
    button: '#212121',
    buttonHover: '#1b1b1b',
  },
  dark: {
    ...config.themes.dark,
    background: '#57245d',
    backgroundDark: '#3A183E',
    card: '#2a2a2a',
    input: '#FFFFFF',
    textLight: '#FFFFFF',
    textDark: '#000000',
    inputPlaceholderText: '#9494a2',
    button: '#212121',
    buttonHover: '#1b1b1b',
  }
};

const tamaguiConfig = createTamagui({
  ...config,
  themes: customThemes,
});

export type AppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig { }
}

export default tamaguiConfig;
