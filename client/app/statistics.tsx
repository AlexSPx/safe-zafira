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
  Gauge,
  CircleGauge,
  Disc,
} from 'lucide-react-native';
import { useVehicles } from '../hooks/useVehicles';

export default function StatisticsScreen() {
  const theme = useTheme();
  const { selectedVehicle, vehicleData, isLoading } = useVehicles();

  if (!selectedVehicle || !vehicleData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
        <YStack flex={1} ai="center" jc="center">
          <SizableText color="$textMuted">No vehicle selected</SizableText>
        </YStack>
      </SafeAreaView>
    );
  }

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
                  {selectedVehicle.make} {selectedVehicle.model}
                </SizableText>
                <CheckCircle2 size={18} color="#4ade80" />
              </XStack>
              <SizableText color="$textMuted" fontSize={14}>
                {selectedVehicle.vehicleNo}
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
              value={
                vehicleData?.diagnostics?.length === 0 ? 'Healthy' : 'Check'
              }
            />
            <QuickStat
              icon={<BatteryCharging size={18} color={theme.textLight?.val} />}
              label="Battery"
              value={
                vehicleData?.battery
                  ? `${vehicleData.battery.toFixed(1)}V`
                  : 'N/A'
              }
            />
          </XStack>
          <XStack gap="$3" mb="$6">
            <QuickStat
              icon={<CircleGauge size={18} color={theme.textLight?.val} />}
              label="RPM"
              value={
                vehicleData?.rpm ? `${vehicleData.rpm.toFixed(0)}%` : 'N/A'
              }
            />
            <QuickStat
              icon={<Gauge size={18} color={theme.textLight?.val} />}
              label="Speed"
              value={vehicleData?.speed ? `${vehicleData.speed} km/h` : 'N/A'}
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
            <DataRow label="Make" value={selectedVehicle.make} />
            <RowSeparator />
            <DataRow label="Model" value={selectedVehicle.model} />
            <RowSeparator />
            <DataRow label="VIN" value={selectedVehicle.vin} />
            <RowSeparator />
            <DataRow label="Device ID" value={selectedVehicle.vehicleNo} />
            <DataRow
              label="Millage"
              value={vehicleData.mileage?.toString() ?? 'N/A'}
            />
            <DataRow
              label="Steering"
              value={vehicleData.steering?.toString() ?? 'N/A'}
            />
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
            <DataRow
              label="ABS"
              value={vehicleData?.abs ? 'Active' : 'OK'}
              highlight={!vehicleData?.abs}
            />
            <RowSeparator />
            <DataRow
              label="Brake pedal"
              value={vehicleData?.brakePedal ? 'Pressed' : 'Not Pressed'}
              highlight={!vehicleData?.brakePedal}
            />
            <RowSeparator />
            <DataRow
              label="Airbags"
              value={vehicleData?.airbags ? 'Deployed!' : 'OK'}
              highlight={!vehicleData?.airbags}
              error={vehicleData?.airbags ?? false}
            />
            <RowSeparator />
            <DataRow
              label="Error Codes"
              value={
                vehicleData?.diagnostics?.length === 0
                  ? 'None'
                  : `${vehicleData?.diagnostics?.length} ${vehicleData?.diagnostics?.length === 1 ? 'code' : 'codes'}`
              }
              highlight={vehicleData?.diagnostics?.length === 0}
            />
          </YStack>
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
