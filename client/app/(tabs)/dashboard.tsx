import React, { useState, useEffect } from 'react';
import { YStack, XStack, SizableText, Square, useTheme } from 'tamagui';
import { ScrollView, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Gauge,
  CircleGauge,
  BatteryCharging,
  Heart,
} from 'lucide-react-native';
import { QuickStat } from '../../components/QuickStat';
import { useVehicles } from '../../hooks/useVehicles';

export default function Dashboard() {
  const theme = useTheme();
  const {
    vehicles,
    selectedVehicle,
    vehicleData,
    isLoading,
    error,
    fetchVehicles,
    fetchVehicleData,
    selectVehicle,
  } = useVehicles();
  const [vehicleIndex, setVehicleIndex] = useState(0);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    if (vehicles.length > 0) {
      selectVehicle(vehicles[vehicleIndex]);
    }
  }, [vehicleIndex, vehicles, selectVehicle]);

  useEffect(() => {
    if (selectedVehicle?.vehicleNo) {
      console.log('HERE');
      fetchVehicleData(selectedVehicle.vehicleNo).then(() => {
        console.log('Vehicle Data:', JSON.stringify(vehicleData, null, 2));
      });
    }
  }, [selectedVehicle, fetchVehicleData]);

  const handlePair = () => {
    router.push('/pairing');
  };

  const nextVehicle = () => {
    if (vehicles.length > 0) {
      setVehicleIndex((prev) => (prev + 1) % vehicles.length);
    }
  };

  const prevVehicle = () => {
    if (vehicles.length > 0) {
      setVehicleIndex((prev) => (prev - 1 + vehicles.length) % vehicles.length);
    }
  };

  const triggerEmergencyCall = () => {
    Linking.openURL('tel:0892469684');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <YStack f={1} backgroundColor="$background">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <XStack jc="space-between" ai="center" px="$4" pt="$4" pb="$2">
            <SizableText
              color="$textLight"
              fontSize={24}
              fontWeight="700"
              lineHeight={32}
            >
              Garage
            </SizableText>
            <TouchableOpacity onPress={handlePair}>
              <XStack
                backgroundColor="$buttonSecondary"
                px="$4"
                py="$2"
                borderRadius={20}
                ai="center"
                gap="$2"
              >
                <Plus size={16} color={theme.textLight?.val} />
                <SizableText color="$textLight" fontSize={14} fontWeight="700">
                  Pair Device
                </SizableText>
              </XStack>
            </TouchableOpacity>
          </XStack>

          {vehicles.length > 0 && selectedVehicle ? (
            <>
              <XStack jc="space-between" ai="center" px="$4" py="$4">
                <TouchableOpacity onPress={prevVehicle}>
                  <XStack w={40} h={40} jc="center" ai="center">
                    <ChevronLeft size={24} color={theme.textLight?.val} />
                  </XStack>
                </TouchableOpacity>

                <XStack
                  f={1}
                  jc="center"
                  ai="center"
                  borderWidth={1}
                  borderColor="$borderColor"
                  backgroundColor="$surface"
                  borderRadius={24}
                  mx="$4"
                  h={44}
                  onPress={() => router.push('/statistics')}
                >
                  <SizableText
                    color="$textLight"
                    fontSize={14}
                    fontWeight="600"
                    letterSpacing={3}
                    mr="$2"
                  >
                    {selectedVehicle.make.toUpperCase()}
                  </SizableText>
                  <SizableText color="$textMuted" fontSize={14}>
                    {selectedVehicle.model}
                  </SizableText>
                </XStack>

                <TouchableOpacity onPress={nextVehicle}>
                  <XStack w={40} h={40} jc="center" ai="center">
                    <ChevronRight size={24} color={theme.textLight?.val} />
                  </XStack>
                </TouchableOpacity>
              </XStack>

              <YStack px="$4" mt="$2">
                <SizableText
                  color="$textMuted"
                  fontSize={12}
                  letterSpacing={1.5}
                  mb="$3"
                  fontWeight="600"
                >
                  CURRENT STATUS
                </SizableText>

                <XStack gap="$3" mb="$3">
                  <QuickStat
                    icon={<Heart size={18} color={theme.textLight?.val} />}
                    label="Health"
                    value={
                      vehicleData?.diagnostics?.length === 0
                        ? 'Healthy'
                        : 'Check'
                    }
                  />
                  <QuickStat
                    icon={
                      <BatteryCharging size={18} color={theme.textLight?.val} />
                    }
                    label="Battery"
                    value={
                      vehicleData?.batteryCar
                        ? `${vehicleData.batteryCar.toFixed(1)}V`
                        : 'N/A'
                    }
                  />
                </XStack>
                <XStack gap="$3" mb="$6">
                  <QuickStat
                    icon={
                      <CircleGauge size={18} color={theme.textLight?.val} />
                    }
                    label="RPM"
                    value={
                      vehicleData?.rpm
                        ? `${vehicleData.rpm.toFixed(0)}%`
                        : 'N/A'
                    }
                  />
                  <QuickStat
                    icon={<Gauge size={18} color={theme.textLight?.val} />}
                    label="Speed"
                    value={
                      vehicleData?.speed ? `${vehicleData.speed} km/h` : 'N/A'
                    }
                  />
                </XStack>
              </YStack>
            </>
          ) : (
            <YStack px="$4" py="$10" ai="center">
              <SizableText color="$textMuted" fontSize={16}>
                {isLoading ? 'Loading vehicles...' : 'No vehicles found'}
              </SizableText>
            </YStack>
          )}
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
