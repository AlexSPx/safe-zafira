import React from 'react';
import {
  YStack,
  XStack,
  SizableText,
  ScrollView,
  Circle,
  useTheme,
} from 'tamagui';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QuickStat } from '../components/QuickStat';
import { DataRow } from '../components/DataRow';
import { RowSeparator } from '../components/RowSeparator';
import {
  Heart,
  BatteryCharging,
  Fuel,
  Thermometer,
  Car,
  CheckCircle2,
} from 'lucide-react-native';

export default function StatisticsScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <Stack.Screen
        options={{
          title: 'Diagnostics',
          headerStyle: { backgroundColor: theme.background?.val },
          headerTintColor: theme.textLight?.val,
          headerShadowVisible: false,
        }}
      />

      <YStack flex={1} backgroundColor="$background" px="$4">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
        >
          <XStack alignItems="center" gap="$4" mb="$6">
            <Circle
              size={64}
              backgroundColor="$surface"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <Car size={32} color={theme.textLight?.val} />
            </Circle>
            <YStack>
              <XStack ai="center" gap="$2">
                <SizableText color="$textLight" fontSize={24} fontWeight="700">
                  Toyota Corolla
                </SizableText>
                <CheckCircle2 size={18} color="#4ade80" />
              </XStack>
              <SizableText color="$textMuted" fontSize={14}>
                Connected • ZAFIRA-NODE
              </SizableText>
            </YStack>
          </XStack>

          <SizableText
            color="$textMuted"
            fontSize={12}
            letterSpacing={1.5}
            mb="$3"
            fontWeight="600"
          >
            OVERVIEW
          </SizableText>
          <XStack gap="$3" mb="$3">
            <QuickStat
              icon={<Heart size={18} color={theme.textLight?.val} />}
              label="Health"
              value="100%"
            />
            <QuickStat
              icon={<BatteryCharging size={18} color={theme.textLight?.val} />}
              label="Battery"
              value="12.4V"
            />
          </XStack>
          <XStack gap="$3" mb="$6">
            <QuickStat
              icon={<Fuel size={18} color={theme.textLight?.val} />}
              label="Fuel Level"
              value="84%"
            />
            <QuickStat
              icon={<Thermometer size={18} color={theme.textLight?.val} />}
              label="Coolant"
              value="190°F"
            />
          </XStack>

          <SizableText
            color="$textMuted"
            fontSize={12}
            letterSpacing={1.5}
            mb="$3"
            fontWeight="600"
          >
            VEHICLE DETAILS
          </SizableText>
          <YStack
            backgroundColor="$surface"
            borderColor="$borderColor"
            borderWidth={1}
            paddingHorizontal="$4"
            borderRadius={20}
            mb="$6"
          >
            <DataRow label="Make" value="Toyota" />
            <RowSeparator />
            <DataRow label="Model" value="Corolla LE" />
            <RowSeparator />
            <DataRow label="Year" value="2020" />
            <RowSeparator />
            <DataRow label="VIN" value="1NXBR1234567890" />
          </YStack>

          <SizableText
            color="$textMuted"
            fontSize={12}
            letterSpacing={1.5}
            mb="$3"
            fontWeight="600"
          >
            LIVE DIAGNOSTICS
          </SizableText>
          <YStack
            backgroundColor="$surface"
            borderColor="$borderColor"
            borderWidth={1}
            paddingHorizontal="$4"
            borderRadius={20}
          >
            <DataRow label="Mileage" value="45,230 mi" />
            <RowSeparator />
            <DataRow label="Engine RPM" value="Idle (800)" />
            <RowSeparator />
            <DataRow label="System Status" value="No Codes" highlight={true} />
          </YStack>
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
