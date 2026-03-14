import React, { useEffect } from 'react';
import { YStack, XStack, SizableText, Text, H1, H4, Button, Card, Separator, Circle, Spinner } from 'tamagui';
import { FlatList } from 'react-native';
import { Stack, router } from 'expo-router';
import { useBLEContext } from '../context/BLEContext';

export default function PairingScreen() {
    const { requestPermissions, scanForDevices, allDevices, connectToDevice, connectedDevice, isScanning, isConnecting } = useBLEContext();

    useEffect(() => {
        if (connectedDevice) {
            router.back();
        }
    }, [connectedDevice]);

    const handleStartScan = async () => {
        const isGranted = await requestPermissions();
        if (isGranted) {
            scanForDevices();
        }
    };

    return (
        <YStack f={1} backgroundColor="$background" p="$4">
            <Stack.Screen options={{ title: 'Pair Telemetry Node', headerBackVisible: false }} />

            <H1 size="$7" mb="$2">Discover Devices</H1>
            <SizableText   color="$textMuted" mb="$6">Make sure your Node is plugged in and the car's ignition is powered on.</SizableText>

            <Button
                size="$5"
                theme={isScanning ? "alt1" : "active"}
                onPress={handleStartScan}
                mb="$4"
                disabled={isScanning}
                icon={isScanning ? () => <Spinner color="$color" /> : undefined}
            >
                {isScanning ? "Scanning..." : "Scan for nearby devices"}
            </Button>

            <Separator my="$4" />

            <FlatList
                data={allDevices}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <YStack ai="center" jc="center" p="$4" mt="$4" gap="$3">
                        {isScanning ? (
                            <SizableText   color="$textMuted" textAlign="center">Searching for nodes nearby...</SizableText>
                        ) : (
                            <>
                                <Circle size={64} backgroundColor="$surface" elevation={2}>
                                    <SizableText   fontSize={32}>📡</SizableText>
                                </Circle>
                                <SizableText   color="$textMuted" textAlign="center">No nodes found yet. Press scan to begin.</SizableText>
                            </>
                        )}
                    </YStack>
                )}
                renderItem={({ item }) => {
                    return (
                        <Card size="$4" borderColor="$primary" borderWidth={2} mb="$3"
                            backgroundColor="$primarySoft"
                            hoverStyle={{ scale: 0.98 }} pressStyle={{ scale: 0.98 }}
                            onPress={() => !isConnecting && connectToDevice(item)}
                        >
                            <Card.Header>
                                <XStack jc="space-between" ai="center" p="$4">
                                    <YStack f={1}>
                                        <XStack ai="center" gap="$2">
                                            <SizableText   fontSize={16}>🚙</SizableText>
                                            <H4 color="$color">{item.name || item.localName || 'Unknown Device'}</H4>
                                        </XStack>
                                        <SizableText   color="$textMuted">{item.id}</SizableText>
                                    </YStack>

                                    <Circle size={44} backgroundColor="$primary" elevation={1}>
                                        {isConnecting ? (
                                            <Spinner color="white" />
                                        ) : (
                                            <SizableText   fontSize={20}>🔗</SizableText>
                                        )}
                                    </Circle>
                                </XStack>
                            </Card.Header>
                        </Card>
                    );
                }}
            />
        </YStack>
    );
}
