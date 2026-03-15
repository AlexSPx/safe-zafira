import React, { useEffect, useState } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  ScrollView,
  Circle,
  useTheme,
} from 'tamagui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import { QuickStat } from '../components/QuickStat';
import { DataRow } from '../components/DataRow';
import { RowSeparator } from '../components/RowSeparator';
import {
  Heart,
  BatteryCharging,
  Car,
  CheckCircle2,
  Gauge,
  CircleGauge,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { vehicleService } from '../services/vehicleService';
import type { Vehicle, VehicleDataClient } from '../services/vehicleService';

export default function FamilyMemberStatsScreen() {
  const theme = useTheme();
  const { memberId, memberName } = useLocalSearchParams<{
    memberId: string;
    memberName: string;
  }>();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);
  const [vehicleData, setVehicleData] = useState<VehicleDataClient | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedVehicle = vehicles[selectedVehicleIndex] ?? null;

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!memberId) return;
      setIsLoading(true);
      setError(null);
      try {
        const memberVehicles = await vehicleService.getVehiclesForFamilyMember(
          Number(memberId),
        );
        setVehicles(memberVehicles);
        setSelectedVehicleIndex(0);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch vehicles',
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchVehicles();
  }, [memberId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedVehicle?.vehicleNo) {
        setVehicleData(null);
        return;
      }
      try {
        const data = await vehicleService.getVehicleData(
          selectedVehicle.vehicleNo,
        );
        setVehicleData(data);
      } catch (err) {
        console.error('Failed to fetch vehicle data:', err);
        setVehicleData(null);
      }
    };
    fetchData();
  }, [selectedVehicle?.vehicleNo]);

  const nextVehicle = () => {
    if (selectedVehicleIndex < vehicles.length - 1) {
      setSelectedVehicleIndex(selectedVehicleIndex + 1);
    }
  };

  const prevVehicle = () => {
    if (selectedVehicleIndex > 0) {
      setSelectedVehicleIndex(selectedVehicleIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
        <Stack.Screen
          options={{
            title: memberName ?? 'Member Stats',
            headerStyle: { backgroundColor: theme.background?.val },
            headerTintColor: theme.textLight?.val,
            headerShadowVisible: false,
          }}
        />
        <YStack flex={1} ai="center" jc="center">
          <SizableText color="$textMuted">Loading...</SizableText>
        </YStack>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
        <Stack.Screen
          options={{
            title: memberName ?? 'Member Stats',
            headerStyle: { backgroundColor: theme.background?.val },
            headerTintColor: theme.textLight?.val,
            headerShadowVisible: false,
          }}
        />
        <YStack flex={1} ai="center" jc="center" px="$4">
          <SizableText color="$red10" textAlign="center">
            {error}
          </SizableText>
        </YStack>
      </SafeAreaView>
    );
  }

  if (vehicles.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
        <Stack.Screen
          options={{
            title: memberName ?? 'Member Stats',
            headerStyle: { backgroundColor: theme.background?.val },
            headerTintColor: theme.textLight?.val,
            headerShadowVisible: false,
          }}
        />
        <YStack flex={1} ai="center" jc="center" px="$4">
          <Circle
            size={80}
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$borderColor"
            mb="$4"
          >
            <Car size={40} color={theme.textMuted?.val} />
          </Circle>
          <SizableText
            color="$textLight"
            fontSize={18}
            fontWeight="600"
            mb="$2"
          >
            No Vehicles
          </SizableText>
          <SizableText
            color="$textMuted"
            fontSize={14}
            textAlign="center"
            maxWidth={260}
          >
            {memberName ?? 'This member'} doesn't have any vehicles registered.
          </SizableText>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <Stack.Screen
        options={{
          title: memberName ?? 'Member Stats',
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
          <XStack alignItems="center" gap="$3" mb="$4">
            <TouchableOpacity onPress={() => router.back()}>
              <XStack w={40} h={40} jc="center" ai="center">
                <ChevronLeft size={24} color={theme.textLight?.val} />
              </XStack>
            </TouchableOpacity>

            <Circle
              size={48}
              backgroundColor="$primarySoft"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <User size={24} color={theme.textLight?.val} />
            </Circle>
            <YStack>
              <SizableText color="$textLight" fontSize={20} fontWeight="700">
                {memberName}
              </SizableText>
              <SizableText color="$textMuted" fontSize={14}>
                {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
              </SizableText>
            </YStack>
          </XStack>

          {vehicles.length > 1 && (
            <XStack
              jc="space-between"
              ai="center"
              mb="$4"
              backgroundColor="$surface"
              borderRadius={16}
              p="$3"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <TouchableOpacity
                onPress={prevVehicle}
                disabled={selectedVehicleIndex === 0}
              >
                <Circle
                  size={36}
                  backgroundColor={
                    selectedVehicleIndex === 0 ? '$background' : '$primarySoft'
                  }
                >
                  <ChevronLeft
                    size={20}
                    color={
                      selectedVehicleIndex === 0
                        ? theme.textMuted?.val
                        : theme.textLight?.val
                    }
                  />
                </Circle>
              </TouchableOpacity>

              <YStack ai="center">
                <SizableText color="$textLight" fontSize={16} fontWeight="600">
                  {selectedVehicle?.make} {selectedVehicle?.model}
                </SizableText>
                <SizableText color="$textMuted" fontSize={12}>
                  {selectedVehicleIndex + 1} of {vehicles.length}
                </SizableText>
              </YStack>

              <TouchableOpacity
                onPress={nextVehicle}
                disabled={selectedVehicleIndex === vehicles.length - 1}
              >
                <Circle
                  size={36}
                  backgroundColor={
                    selectedVehicleIndex === vehicles.length - 1
                      ? '$background'
                      : '$primarySoft'
                  }
                >
                  <ChevronRight
                    size={20}
                    color={
                      selectedVehicleIndex === vehicles.length - 1
                        ? theme.textMuted?.val
                        : theme.textLight?.val
                    }
                  />
                </Circle>
              </TouchableOpacity>
            </XStack>
          )}

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
                  {selectedVehicle?.make} {selectedVehicle?.model}
                </SizableText>
                <CheckCircle2 size={18} color="#4ade80" />
              </XStack>
              <SizableText color="$textMuted" fontSize={14}>
                {selectedVehicle?.vehicleNo}
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
              value={vehicleData?.rpm ? `${vehicleData.rpm.toFixed(0)}` : 'N/A'}
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
            <DataRow label="Make" value={selectedVehicle?.make ?? 'N/A'} />
            <RowSeparator />
            <DataRow label="Model" value={selectedVehicle?.model ?? 'N/A'} />
            <RowSeparator />
            <DataRow label="VIN" value={selectedVehicle?.vin ?? 'N/A'} />
            <RowSeparator />
            <DataRow
              label="Device ID"
              value={selectedVehicle?.vehicleNo ?? 'N/A'}
            />
            <RowSeparator />
            <DataRow
              label="Mileage"
              value={vehicleData?.mileage?.toString() ?? 'N/A'}
            />
            <RowSeparator />
            <DataRow
              label="Steering"
              value={vehicleData?.steering?.toString() ?? 'N/A'}
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
              label="Brake Pedal"
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
                  : `${vehicleData?.diagnostics?.length} ${
                      vehicleData?.diagnostics?.length === 1 ? 'code' : 'codes'
                    }`
              }
              highlight={vehicleData?.diagnostics?.length === 0}
            />
          </YStack>
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
