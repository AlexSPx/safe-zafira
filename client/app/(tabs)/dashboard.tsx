import React, { useState, useEffect } from 'react';
import { YStack, XStack, SizableText, Square, Circle, useTheme } from 'tamagui';
import { ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
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
  AlertTriangle,
} from 'lucide-react-native';
import { QuickStat } from '../../components/QuickStat';
import { useVehicles } from '../../hooks/useVehicles';
import RNImmediatePhoneCall from 'react-native-immediate-phone-call';

const EMERGENCY_NUMBER = '0892469684';

export default function Dashboard() {
  const theme = useTheme();
  const {
    vehicles,
    selectedVehicle,
    vehicleData,
    fetchVehicles,
    selectVehicle,
  } = useVehicles();
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [hasCalledEmergency, setHasCalledEmergency] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    if (vehicles.length > 0) {
      selectVehicle(vehicles[vehicleIndex]);
    }
  }, [vehicleIndex, vehicles, selectVehicle]);

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

  const showDriverWarning = vehicleData?.dangers?.includes('DRIVER_NOT_AWARE');
  const crashDetected = vehicleData?.dangers?.includes('CRASH_DETECTED');

  useEffect(() => {
    if (crashDetected && !hasCalledEmergency) {
      setHasCalledEmergency(true);
      RNImmediatePhoneCall.immediatePhoneCall(EMERGENCY_NUMBER);
    }
    if (!crashDetected && hasCalledEmergency) {
      setHasCalledEmergency(false);
    }
  }, [crashDetected, hasCalledEmergency]);

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
                      vehicleData?.battery
                        ? `${vehicleData.battery.toFixed(1)}V`
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
                      vehicleData?.rpm ? `${vehicleData.rpm.toFixed(0)}` : 'N/A'
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
                {showDriverWarning && (
                  <XStack
                    backgroundColor="#7f1d1d"
                    borderRadius={16}
                    p="$4"
                    ai="center"
                    gap="$3"
                    mb="$3"
                  >
                    <Circle size={40}>
                      <AlertTriangle size={22} color="#fca5a5" />
                    </Circle>
                    <YStack f={1}>
                      <SizableText
                        color="#fca5a5"
                        fontSize={16}
                        fontWeight="700"
                        mb="$1"
                      >
                        Be aware of the road!
                      </SizableText>
                      <SizableText color="#fecaca" fontSize={13}>
                        Please keep your eyes on the road and stay alert while
                        driving.
                      </SizableText>
                    </YStack>
                  </XStack>
                )}
              </YStack>
            </>
          ) : (
            <YStack px="$4" py="$10" ai="center">
              <Circle
                size={80}
                backgroundColor="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                mb="$4"
              >
                <Plus size={32} color={theme.textMuted?.val} />
              </Circle>
              <SizableText
                color="$textLight"
                fontSize={18}
                fontWeight="600"
                mb="$2"
              >
                No Vehicles Found
              </SizableText>
              <SizableText
                color="$textMuted"
                fontSize={14}
                textAlign="center"
                mb="$6"
              >
                Pair a device to start tracking your vehicle's health and
                statistics.
              </SizableText>
              <TouchableOpacity onPress={handlePair}>
                <XStack
                  backgroundColor="$button"
                  px="$6"
                  py="$3"
                  borderRadius={24}
                  ai="center"
                  gap="$2"
                >
                  <Plus size={18} color={theme.textLight?.val} />
                  <SizableText
                    color="$textLight"
                    fontSize={15}
                    fontWeight="700"
                  >
                    Pair New Device
                  </SizableText>
                </XStack>
              </TouchableOpacity>
            </YStack>
          )}
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
