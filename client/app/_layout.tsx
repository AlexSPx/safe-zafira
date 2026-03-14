import '@tamagui/core/reset.css';
import '@tamagui/native/setup-zeego';
import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../tamagui.config';
import { useColorScheme } from 'react-native';
import { BLEProvider } from '../context/BLEContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
    const colorScheme = useColorScheme();

    return (
        <SafeAreaProvider>
            <TamaguiProvider config={tamaguiConfig} defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}>
                <BLEProvider>
                    <Stack screenOptions={{ headerShown: false }} />
                </BLEProvider>
            </TamaguiProvider>
        </SafeAreaProvider>
    );
}
