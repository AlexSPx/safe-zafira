import React from 'react';
import { YStack, XStack, SizableText, Text, H1, H4, Button, Card, Separator, Square, Circle } from 'tamagui';
import { ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { useBLEContext } from '../context/BLEContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Dashboard() {
    const { connectedDevice, disconnectFromDevice } = useBLEContext();

    const handlePair = () => {
        router.push('/pairing');
    };

    if (!connectedDevice) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#57245d' }}>
                <YStack f={1} backgroundColor="$background" ai="center" jc="center" p="$4">
                    <Stack.Screen options={{ title: 'Safe Zafira Dashboard', headerBackVisible: false }} />
                    <Square size={120} backgroundColor="$primarySoft" borderRadius="$9" mb="$6">
                        <SizableText fontSize={64}>🚙</SizableText>
                    </Square>
                    <H1 textAlign="center" mb="$2">No Vehicles Found</H1>
                    <SizableText color="$textMuted" textAlign="center" mb="$6">
                        Connect your OBD device or pair your car's Bluetooth to start tracking your safety analytics.
                    </SizableText>
                    <Button size="$5" theme="active" onPress={handlePair} width="100%">
                        Pair New Vehicle 📱
                    </Button>
                </YStack>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#57245d' }}>
            <YStack f={1} backgroundColor="$background" p="$4">
                <Stack.Screen options={{ title: 'Safe Zafira Dashboard', headerBackVisible: false }} />

                <ScrollView showsVerticalScrollIndicator={false}>
                    <XStack jc="space-between" ai="center" mt="$2" mb="$6">
                        <YStack>
                            <H1 size="$8">Welcome Back!</H1>
                            <SizableText color="$textMuted" mt="$1">Here's your vehicle status</SizableText>
                        </YStack>
                        <Circle size={48} backgroundColor="$primarySoft" onPress={disconnectFromDevice}>
                            <SizableText fontSize={24}>⚙️</SizableText>
                        </Circle>
                    </XStack>

                    <Card size="$4" borderColor="$borderColor" borderWidth={1} backgroundColor="$surface"
                        hoverStyle={{ scale: 0.98 }} pressStyle={{ scale: 0.98 }}>
                        <Card.Header>
                            <XStack jc="space-between" ai="center" p="$4">
                                <YStack>
                                    <H4 color="$color">{connectedDevice.name || connectedDevice.localName || 'Zafira Node'}</H4>
                                    <SizableText color="$textMuted">ID: {connectedDevice.id}</SizableText>
                                </YStack>
                                <Square size={44} backgroundColor="$primarySoft" borderRadius="$4">
                                    <SizableText fontSize={24}>🚙</SizableText>
                                </Square>
                            </XStack>
                        </Card.Header>
                        <Card.Footer>
                        </Card.Footer>
                    </Card>

                    <Separator my="$6" />

                    <YStack mb="$4">
                        <H4 mb="$4">Quick Actions</H4>
                        <XStack gap="$4">
                            <Button f={1} theme="active" variant="outlined">
                                ➕ Add Vehicle
                            </Button>
                            <Button f={1} theme="active">
                                📈 Diagnostics
                            </Button>
                        </XStack>
                    </YStack>

                </ScrollView>
            </YStack>
        </SafeAreaView>
    );
}
