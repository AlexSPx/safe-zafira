import React, { useEffect } from 'react';
import {
  YStack,
  XStack,
  SizableText,
  ScrollView,
  Circle,
  useTheme,
} from 'tamagui';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpandableItem } from '../../components/ExpandableItem';
import { RowSeparator } from '../../components/RowSeparator';
import { AlertTriangle, SearchX } from 'lucide-react-native';
import { useVehicles } from '../../hooks/useVehicles';

const DIAGNOSTIC_CODE_DESCRIPTION =
  'This diagnostic code was reported by the vehicle. Refer to your vehicle manual or a qualified technician for code-specific details.';

export default function DiagnosisScreen() {
  const theme = useTheme();
  const { selectedVehicle, vehicleData, fetchVehicleData, isLoading } =
    useVehicles();

  const codes = vehicleData?.diagnostics ?? [];
  const hasNoCodes = codes.length === 0;

  useEffect(() => {
    if (selectedVehicle?.vehicleNo) {
      fetchVehicleData(selectedVehicle.vehicleNo);
    }
  }, [selectedVehicle?.vehicleNo, fetchVehicleData]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <Stack.Screen
        options={{
          title: 'Diagnosis',
          headerStyle: { backgroundColor: theme.background?.val },
          headerTintColor: theme.textLight?.val,
          headerShadowVisible: false,
        }}
      />

      <YStack flex={1} backgroundColor="$background" px="$4">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 40,
            paddingTop: 16,
            flexGrow: 1,
          }}
        >
          {!selectedVehicle ? (
            <YStack
              flex={1}
              justifyContent="center"
              alignItems="center"
              py="$10"
            >
              <Circle
                size={100}
                backgroundColor="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                mb="$4"
              >
                <SearchX size={48} color={theme.textMuted?.val} />
              </Circle>
              <SizableText
                color="$textLight"
                fontSize={18}
                fontWeight="600"
                mb="$2"
              >
                No Vehicle Selected
              </SizableText>
              <SizableText
                color="$textMuted"
                fontSize={14}
                textAlign="center"
                maxWidth={260}
              >
                Pair and select a vehicle to view its diagnostics data.
              </SizableText>
            </YStack>
          ) : (
            <>
              <XStack alignItems="center" gap="$3" mb="$6">
                <Circle
                  size={48}
                  backgroundColor="$surface"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <AlertTriangle size={24} color={theme.textLight?.val} />
                </Circle>
                <YStack>
                  <SizableText
                    color="$textLight"
                    fontSize={20}
                    fontWeight="700"
                  >
                    Error Codes
                  </SizableText>
                  <SizableText color="$textMuted" fontSize={14}>
                    {isLoading
                      ? 'Loading...'
                      : hasNoCodes
                        ? 'No issues detected'
                        : `${codes.length} issue${codes.length > 1 ? 's' : ''} found`}
                  </SizableText>
                </YStack>
              </XStack>

              {isLoading ? (
                <SizableText
                  color="$textMuted"
                  fontSize={14}
                  py="$4"
                  textAlign="center"
                >
                  Loading diagnostics...
                </SizableText>
              ) : hasNoCodes ? (
                <YStack
                  flex={1}
                  justifyContent="center"
                  alignItems="center"
                  py="$10"
                >
                  <Circle
                    size={100}
                    backgroundColor="$surface"
                    borderWidth={1}
                    borderColor="$borderColor"
                    mb="$4"
                  >
                    <SearchX size={48} color={theme.textMuted?.val} />
                  </Circle>
                  <SizableText
                    color="$textLight"
                    fontSize={18}
                    fontWeight="600"
                    mb="$2"
                  >
                    All Clear!
                  </SizableText>
                  <SizableText
                    color="$textMuted"
                    fontSize={14}
                    textAlign="center"
                    maxWidth={260}
                  >
                    No diagnostic trouble codes found. Your vehicle is running
                    smoothly.
                  </SizableText>
                </YStack>
              ) : (
                <>
                  <SizableText
                    color="$textMuted"
                    fontSize={12}
                    letterSpacing={1.5}
                    mb="$3"
                    fontWeight="600"
                  >
                    ACTIVE CODES
                  </SizableText>
                  <YStack
                    backgroundColor="$surface"
                    borderColor="$borderColor"
                    borderWidth={1}
                    paddingHorizontal="$4"
                    borderRadius={20}
                  >
                    {codes.map((item, index) => (
                      <React.Fragment key={`${item}-${index}`}>
                        <ExpandableItem code={item} />
                        {index < codes.length - 1 && <RowSeparator />}
                      </React.Fragment>
                    ))}
                  </YStack>
                </>
              )}
            </>
          )}
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
