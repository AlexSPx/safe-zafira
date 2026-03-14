import React, { useState } from 'react';
import { YStack, XStack, SizableText, Square, useTheme } from 'tamagui';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useBLEContext } from '../context/BLEContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Settings, Wrench, Plus } from 'lucide-react-native';

const pairedVehicles = [
    { id: '1', make: 'TOYOTA', model: 'Yaris' },
    { id: '2', make: 'FORD', model: 'Mustang' }
];

export default function Dashboard() {
    const { disconnectFromDevice } = useBLEContext();
    const [vehicleIndex, setVehicleIndex] = useState(0);
    const theme = useTheme();

    const vehicle = pairedVehicles[vehicleIndex];

    const handlePair = () => {
        router.push('/pairing');
    };

    const nextVehicle = () => {
        setVehicleIndex((prev) => (prev + 1) % pairedVehicles.length);
    };

    const prevVehicle = () => {
        setVehicleIndex((prev) => (prev - 1 + pairedVehicles.length) % pairedVehicles.length);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
            <YStack f={1} backgroundColor="$background">
                <Stack.Screen options={{ title: 'Dashboard', headerShown: false }} />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* Top Bar */}
                    <XStack jc="space-between" ai="center" px="$4" pt="$4" pb="$2">
                        <SizableText color="$textLight" fontSize={24} fontWeight="700" lineHeight={32}>
                            Garage
                        </SizableText>
                        <TouchableOpacity onPress={handlePair}>
                            <XStack backgroundColor="$primarySoft" px="$4" py="$2" borderRadius={20} ai="center" gap="$2">
                                <Plus size={16} color={theme.textLight?.val} />
                                <SizableText color="$textLight" fontSize={14} fontWeight="700">
                                    Pair Device
                                </SizableText>
                            </XStack>
                        </TouchableOpacity>
                    </XStack>

                    <XStack jc="space-between" ai="center" px="$4" py="$4">
                        <TouchableOpacity onPress={prevVehicle}>
                            <XStack w={40} h={40} jc="center" ai="center">
                                <ChevronLeft size={24} color={theme.textLight?.val} />
                            </XStack>
                        </TouchableOpacity>

                        <XStack f={1} jc="center" ai="center" borderWidth={1} borderColor="$borderColor" backgroundColor="$surface" borderRadius={24} mx="$4" h={44}>
                            <SizableText color="$textLight" fontSize={14} fontWeight="600" letterSpacing={3} mr="$2">
                                {vehicle.make}
                            </SizableText>
                            <SizableText color="$textMuted" fontSize={14}>
                                {vehicle.model}
                            </SizableText>
                        </XStack>

                        <TouchableOpacity onPress={nextVehicle}>
                            <XStack w={40} h={40} jc="center" ai="center">
                                <ChevronRight size={24} color={theme.textLight?.val} />
                            </XStack>
                        </TouchableOpacity>
                    </XStack>

                    <YStack px="$4" mt="$2">
                        <SizableText color="$textMuted" fontSize={12} letterSpacing={1.5} mb="$3" fontWeight="600">
                            CURRENT STATUS
                        </SizableText>

                        <XStack gap="$3">
                            <YStack f={1} backgroundColor="$surface" borderColor="$borderColor" borderWidth={1} borderRadius={20} p="$4">
                                <TouchableOpacity onPress={disconnectFromDevice}>
                                    <Square size={36} backgroundColor="$primarySoft" borderRadius={12} mb="$3" jc="center" ai="center">
                                        <Settings size={20} color={theme.textLight?.val} />
                                    </Square>
                                </TouchableOpacity>
                                <SizableText color="$textMuted" fontSize={13} mb="$1">Service</SizableText>
                                <SizableText color="$textLight" fontSize={16} fontWeight="600">In Progress</SizableText>
                            </YStack>

                            <YStack f={1} backgroundColor="$surface" borderColor="$borderColor" borderWidth={1} borderRadius={20} p="$4">
                                <Square size={36} backgroundColor="$primarySoft" borderRadius={12} mb="$3" jc="center" ai="center">
                                    <Wrench size={20} color={theme.textLight?.val} />
                                </Square>
                                <SizableText color="$textMuted" fontSize={13} mb="$1">Last updated</SizableText>
                                <SizableText color="$textLight" fontSize={16} fontWeight="600">Today, 4:30 PM</SizableText>
                            </YStack>
                        </XStack>
                    </YStack>

                </ScrollView>
            </YStack>
        </SafeAreaView>
    );
}
