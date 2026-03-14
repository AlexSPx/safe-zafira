import { config } from '@tamagui/config/v3';
import { createTamagui, createTokens } from 'tamagui';

const customTokens = createTokens({
  ...config.tokens,
  color: {
    ...config.tokens.color,
    zafiraBackground: '#57245d',
    zafiraBackgroundDark: '#3A183E',
    zafiraCard: '#2a2a2a',
    zafiraInput: '#FFFFFF',
    textLight: '#FFFFFF',
    textDark: '#000000',
    zafiraInputPlaceholderText: '#9494a2',
    zafiraButton: '#212121',
    zafiraButtonHover: '#1b1b1b',
  },
});

const tamaguiConfig = createTamagui({
  ...config,
  tokens: customTokens,
});

export type AppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
