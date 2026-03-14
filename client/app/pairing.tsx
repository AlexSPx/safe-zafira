import React, { useEffect } from 'react';
import { YStack, XStack, SizableText, Square, Spinner, useTheme } from 'tamagui';
import { FlatList, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useBLEContext } from '../context/BLEContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bluetooth, ChevronLeft, CircleAlert, Radio, Search, Link2 } from 'lucide-react-native';

export default function PairingScreen() {
    const { requestPermissions, scanForDevices, allDevices, connectToDevice, connectedDevice, isScanning, isConnecting } = useBLEContext();
    const theme = useTheme();

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
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
            <YStack f={1} backgroundColor="$background" p="$4">
                <Stack.Screen options={{ title: 'Pair Telemetry Node', headerShown: false }} />

                <XStack jc="space-between" ai="center" pb="$2">
                    <TouchableOpacity onPress={() => router.back()}>
                        <XStack w={40} h={40} jc="center" ai="center">
                            <ChevronLeft size={24} color={theme.textLight?.val} />
                        </XStack>
                    </TouchableOpacity>

                    <SizableText color="$textLight" fontSize={22} fontWeight="700">
                        Pair Device
                    </SizableText>

                    <Square size={40} backgroundColor="transparent" />
                </XStack>

                <YStack mt="$3" mb="$4" backgroundColor="$surface" borderColor="$borderColor" borderWidth={1} borderRadius={20} p="$4" gap="$3">
                    <XStack ai="center" gap="$2">
                        <CircleAlert size={16} color={theme.textMuted?.val} />
                        <SizableText color="$textMuted" fontSize={13} fontWeight="600" letterSpacing={1}>
                            BEFORE YOU START
                        </SizableText>
                    </XStack>
                    <SizableText color="$textLight" fontSize={14} lineHeight={22}>
                        Make sure your telemetry node is plugged in and the ignition is powered on.
                    </SizableText>
                </YStack>

                <TouchableOpacity disabled={isScanning || isConnecting} onPress={handleStartScan}>
                    <XStack
                        mb="$4"
                        backgroundColor={isScanning ? '$buttonHover' : '$button'}
                        borderRadius={16}
                        py="$3"
                        px="$4"
                        ai="center"
                        jc="center"
                        gap="$2"
                        opacity={isConnecting ? 0.7 : 1}
                    >
                        {isScanning ? <Spinner color={theme.textDark?.val} /> : <Search size={18} color={theme.textDark?.val} />}
                        <SizableText color="$textDark" fontSize={15} fontWeight="700">
                            {isScanning ? 'Scanning for devices...' : 'Scan for nearby devices'}
                        </SizableText>
                    </XStack>
                </TouchableOpacity>

                <XStack ai="center" jc="space-between" mb="$3">
                    <SizableText color="$textMuted" fontSize={12} fontWeight="600" letterSpacing={1.2}>
                        AVAILABLE NODES
                    </SizableText>
                    <XStack ai="center" gap="$1.5">
                        <Radio size={14} color={isScanning ? theme.button?.val : theme.textMuted?.val} />
                        <SizableText color={isScanning ? '$button' : '$textMuted'} fontSize={12} fontWeight="600">
                            {isScanning ? 'Scanning' : 'Idle'}
                        </SizableText>
                    </XStack>
                </XStack>

                <FlatList
                    data={allDevices}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 28 }}
                    ListEmptyComponent={() => (
                        <YStack ai="center" jc="center" p="$4" mt="$8" gap="$3">
                            <Square size={64} borderRadius={16} backgroundColor="$surface" borderWidth={1} borderColor="$borderColor" jc="center" ai="center">
                                <Bluetooth size={28} color={theme.textMuted?.val} />
                            </Square>
                            <SizableText color="$textLight" fontSize={16} fontWeight="600" textAlign="center">
                                No devices yet
                            </SizableText>
                            <SizableText color="$textMuted" textAlign="center" maxWidth={280}>
                                {isScanning ? 'Searching nearby nodes...' : 'Tap Scan for nearby devices to begin.'}
                            </SizableText>
                        </YStack>
                    )}
                    renderItem={({ item }) => {
                        return (
                            <TouchableOpacity disabled={isConnecting} onPress={() => connectToDevice(item)}>
                                <XStack
                                    mb="$3"
                                    p="$4"
                                    backgroundColor="$surface"
                                    borderColor="$borderColor"
                                    borderWidth={1}
                                    borderRadius={20}
                                    ai="center"
                                    jc="space-between"
                                    opacity={isConnecting ? 0.7 : 1}
                                >
                                    <XStack ai="center" gap="$3" f={1}>
                                        <Square size={40} borderRadius={12} backgroundColor="$primarySoft" jc="center" ai="center">
                                            <Bluetooth size={18} color={theme.textLight?.val} />
                                        </Square>

                                        <YStack f={1}>
                                            <SizableText color="$textLight" fontSize={16} fontWeight="600" numberOfLines={1}>
                                                {item.name || item.localName || 'Unknown Device'}
                                            </SizableText>
                                            <SizableText color="$textMuted" fontSize={12} numberOfLines={1}>
                                                {item.id}
                                            </SizableText>
                                        </YStack>
                                    </XStack>

                                    <XStack ai="center" gap="$2" ml="$2">
                                        {isConnecting ? (
                                            <Spinner color={theme.button?.val} />
                                        ) : (
                                            <>
                                                <SizableText color="$textMuted" fontSize={12} fontWeight="600">
                                                    Connect
                                                </SizableText>
                                                <Link2 size={16} color={theme.textMuted?.val} />
                                            </>
                                        )}
                                    </XStack>
                                </XStack>
                            </TouchableOpacity>
                        );
                    }}
                />
            </YStack>
        </SafeAreaView>
    );
}
