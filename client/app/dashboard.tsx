import React from 'react';
import { YStack, XStack, Text, H1, H4, Button, Card, Separator, Square, Circle } from 'tamagui';
import { ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { useBLEContext } from '../context/BLEContext';

export default function Dashboard() {
    const { connectedDevice, disconnectFromDevice } = useBLEContext();

    const handlePair = () => {
        router.push('/pairing');
    };

    if (!connectedDevice) {
        return (
            <YStack f={1} backgroundColor="$background" ai="center" jc="center" p="$4">
                <Stack.Screen options={{ title: 'Safe Zafira Dashboard', headerBackVisible: false }} />
                <Square size={120} backgroundColor="$primarySoft" borderRadius="$9" mb="$6">
                    <Text fontSize={64}>🚙</Text>
                </Square>
                <H1 textAlign="center" mb="$2">No Vehicles Found</H1>
                <Text color="$textMuted" textAlign="center" mb="$6">
                    Connect your OBD device or pair your car's Bluetooth to start tracking your safety analytics.
                </Text>
                <Button size="$5" theme="active" onPress={handlePair} width="100%">
                    Pair New Vehicle 📱
                </Button>
            </YStack>
        );
    }

    return (
        <YStack f={1} backgroundColor="$background" p="$4">
            <Stack.Screen options={{ title: 'Safe Zafira Dashboard', headerBackVisible: false }} />
            
            <ScrollView showsVerticalScrollIndicator={false}>
                <XStack jc="space-between" ai="center" mt="$2" mb="$6">
                    <YStack>
                        <H1 size="$8">Welcome Back!</H1>
                        <Text color="$textMuted" mt="$1">Here's your vehicle status</Text>
                    </YStack>
                    <Circle size={48} backgroundColor="$primarySoft" onPress={disconnectFromDevice}>
                         <Text fontSize={24}>⚙️</Text>
                    </Circle>
                </XStack>

                <Card size="$4" borderColor="$borderColor" borderWidth={1} backgroundColor="$surface"
                        hoverStyle={{ scale: 0.98 }} pressStyle={{ scale: 0.98 }}>
                    <Card.Header>
                        <XStack jc="space-between" ai="center" p="$4">
                            <YStack>
                                <H4 color="$color">{connectedDevice.name || connectedDevice.localName || 'Zafira Node'}</H4>
                                <Text color="$textMuted">ID: {connectedDevice.id}</Text>
                            </YStack>
                            <Square size={44} backgroundColor="$primarySoft" borderRadius="$4">
                                    <Text fontSize={24}>🚙</Text>
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
    );
}
