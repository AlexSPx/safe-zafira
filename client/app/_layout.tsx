import '@tamagui/core/reset.css';
import '@tamagui/native/setup-zeego';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../tamagui.config';
import { useColorScheme } from 'react-native';
import { BLEProvider } from '../context/BLEContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const segments = useSegments();
    const rootNavigationState = useRootNavigationState();
    const { user, jwt } = useAuthStore();

    const isAuthenticated = Boolean(user && jwt);
    const isPublicRoute = useMemo(() => {
        const first = segments[0];

        return first === undefined || first === 'login' || first === 'register';
    }, [segments]);

    useEffect(() => {
        if (!rootNavigationState?.key) return;

        if (!isAuthenticated && !isPublicRoute) {
            router.replace('/');
            return;
        }

        if (isAuthenticated && isPublicRoute) {
            router.replace('/(tabs)/dashboard');
        }
    }, [isAuthenticated, isPublicRoute, rootNavigationState?.key, router, jwt, user]);

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
