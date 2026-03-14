import React from 'react';
import {
  YStack,
  XStack,
  SizableText,
  H2,
  H4,
  ScrollView,
  Circle,
} from 'tamagui';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QuickStat } from '../components/QuickStat';
import { DataRow } from '../components/DataRow';
import { RowSeparator } from '../components/Separator';

export default function StatisticsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#57245d' }}>
      <Stack.Screen
        options={{
          title: 'Diagnostics & Stats',
          headerStyle: { backgroundColor: '#57245d' },
          headerTintColor: 'white',
          headerShadowVisible: false,
        }}
      />

      <YStack flex={1} backgroundColor="$zafiraBackground" theme="dark">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          <XStack alignItems="center" gap="$4" marginBottom="$6" marginTop="$2">
            <Circle
              size={80}
              backgroundColor="$zafiraCard"
              elevate
              borderWidth={2}
              borderColor="$zafiraButton"
            >
              <SizableText fontSize={40}>🚘</SizableText>
            </Circle>
            <YStack>
              <H2 color="white" m={0}>
                Opel Zafira
              </H2>
              <SizableText color="$zafiraInputPlaceholderText" size="$4">
                Connected • ZAFIRA-MOCK-ID
              </SizableText>
            </YStack>
          </XStack>

          <XStack gap="$3" marginBottom="$3">
            <QuickStat icon="❤️" label="Health" value="100%" />
            <QuickStat icon="🔋" label="Battery" value="12.4V" />
          </XStack>
          <XStack gap="$3" marginBottom="$6">
            <QuickStat icon="⛽" label="Fuel" value="32 MPG" />
            <QuickStat icon="🌡️" label="Temp" value="Normal" />
          </XStack>

          <H4 color="white" marginBottom="$3">
            Vehicle Details
          </H4>
          <YStack
            backgroundColor="$zafiraCard"
            padding="$4"
            borderRadius="$4"
            marginBottom="$6"
          >
            <DataRow label="Make" value="Opel" />
            <RowSeparator />
            <DataRow label="Model" value="Zafira" />
            <RowSeparator />
            <DataRow label="Year" value="2010" />
            <RowSeparator />
            <DataRow label="VIN" value="1NXBR1234567890" />
          </YStack>

          <H4 color="white" marginBottom="$3">
            Live Diagnostics
          </H4>
          <YStack backgroundColor="$zafiraCard" padding="$4" borderRadius="$4">
            <DataRow label="Mileage" value="145,230 mi" />
            <RowSeparator />
            <DataRow label="Engine RPM" value="Idle (800)" />
            <RowSeparator />
            <DataRow label="Coolant Temp" value="190°F" />
            <RowSeparator />
            <DataRow label="System Status" value="No Codes" highlight={true} />
          </YStack>
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
