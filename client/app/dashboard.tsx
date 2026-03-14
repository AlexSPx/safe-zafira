import React from 'react';
import {
  YStack,
  XStack,
  SizableText,
  H1,
  H4,
  Button,
  Card,
  Separator,
  Square,
  Circle,
} from 'tamagui';
import { ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { useBLEContext } from '../context/BLEContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Dashboard() {
  // const { connectedDevice, disconnectFromDevice } = useBLEContext();

  const handlePair = () => {
    router.push('/pairing');
  };

  const connectedDevice = {
    id: 'ZAFIRA-MOCK-ID-1234',
    name: 'Opel Zafira',
    localName: 'Test Vehicle',
  };

  const disconnectFromDevice = () => {
    console.log('Mock device disconnected!');
  };

  if (!connectedDevice) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#57245d' }}>
        <YStack
          f={1}
          backgroundColor="$zafiraBackground"
          ai="center"
          jc="center"
          p="$4"
          theme="dark"
        >
          <Stack.Screen
            options={{
              title: 'Safe Zafira Dashboard',
              headerBackVisible: false,
            }}
          />
          <Square
            size={120}
            backgroundColor="$primarySoft"
            borderRadius="$9"
            mb="$6"
          >
            <SizableText fontSize={64}>🚙</SizableText>
          </Square>
          <H1 textAlign="center" mb="$2">
            No Vehicles Found
          </H1>
          <SizableText color="$textMuted" textAlign="center" mb="$6">
            Connect your OBD device or pair your car's Bluetooth to start
            tracking your safety analytics.
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
      <YStack f={1} backgroundColor="$zafiraBackground" p="$4" theme="dark">
        <Stack.Screen
          options={{ title: 'Safe Zafira Dashboard', headerBackVisible: false }}
        />

        <ScrollView showsVerticalScrollIndicator={false}>
          <XStack jc="space-between" ai="center" mt="$2" mb="$6">
            <YStack>
              <H1 size="$8">Welcome Back!</H1>
              <SizableText color="$zafiraInputPlaceholderText" mt="$1">
                Here's your vehicle status
              </SizableText>
            </YStack>
            <Circle
              size={48}
              backgroundColor="$zafiraCard"
              onPress={disconnectFromDevice}
            >
              <SizableText fontSize={24}>⚙️</SizableText>
            </Circle>
          </XStack>

          <Card
            size="$4"
            borderColor="$borderColor"
            borderWidth={1}
            backgroundColor="$zafiraCard"
            hoverStyle={{ scale: 0.98 }}
            pressStyle={{ scale: 0.98 }}
            onPress={() => router.push('/statistics')}
          >
            <Card.Header>
              <XStack jc="space-between" ai="center" p="$4">
                <YStack>
                  <H4 color="white">
                    {connectedDevice.name ||
                      connectedDevice.localName ||
                      'Zafira Node'}
                  </H4>
                  <SizableText color="$zafiraInputPlaceholderText">
                    ID: {connectedDevice.id}
                  </SizableText>
                </YStack>
                <Square
                  size={44}
                  backgroundColor="$zafiraButton"
                  borderRadius="$4"
                >
                  <SizableText fontSize={24}>🚙</SizableText>
                </Square>
              </XStack>
            </Card.Header>
          </Card>

          <Separator my="$6" backgroundColor="$zafiraButton" />

          <YStack mb="$4">
            <H4 mb="$4" color="$textLight">
              Quick Actions
            </H4>
            <XStack gap="$4">
              <Button
                f={1}
                backgroundColor="$zafiraButton"
                pressStyle={{ backgroundColor: '$zafiraButtonHover' }}
              >
                ➕ Add Vehicle
              </Button>
              <Button
                f={1}
                backgroundColor="$zafiraButton"
                onPress={() => router.push('/statistics')}
                pressStyle={{ backgroundColor: '$zafiraButtonHover' }}
              >
                📈 Diagnostics
              </Button>
            </XStack>
          </YStack>
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
