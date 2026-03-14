import React, { useState } from 'react';
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
import { ExpandableItem } from '../components/ExpandableItem';
import { RowSeparator } from '../components/RowSeparator';
import { AlertTriangle, SearchX } from 'lucide-react-native';

const diagnosisData = [
  {
    code: 'P0300',
    title: 'Random/Multiple Cylinder Misfire',
    description:
      'This code indicates that multiple cylinders are misfiring randomly. Common causes include faulty spark plugs, ignition coils, fuel injectors, or vacuum leaks. It is recommended to check the ignition system and fuel delivery components.',
  },
  {
    code: 'P0420',
    title: 'Catalyst System Efficiency Below Threshold',
    description:
      'The catalytic converter is not operating at maximum efficiency. This could be caused by a failing catalytic converter, oxygen sensor malfunction, or exhaust leaks. Continued driving may result in increased emissions.',
  },
  {
    code: 'P0171',
    title: 'System Too Lean (Bank 1)',
    description:
      'The engine is running with too much air or not enough fuel on bank 1. Possible causes include a vacuum leak, faulty mass airflow sensor (MAF), clogged fuel filter, or weak fuel pump. Check for intake air leaks first.',
  },
];

export default function DiagnosisScreen() {
  const theme = useTheme();
  const [codes] = useState(diagnosisData);

  const hasNoCodes = codes.length === 0;

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
              <SizableText color="$textLight" fontSize={20} fontWeight="700">
                Error Codes
              </SizableText>
              <SizableText color="$textMuted" fontSize={14}>
                {hasNoCodes
                  ? 'No issues detected'
                  : `${codes.length} issue${codes.length > 1 ? 's' : ''} found`}
              </SizableText>
            </YStack>
          </XStack>

          {hasNoCodes ? (
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
                  <React.Fragment key={item.code}>
                    <ExpandableItem
                      code={item.code}
                      title={item.title}
                      description={item.description}
                    />
                    {index < codes.length - 1 && <RowSeparator />}
                  </React.Fragment>
                ))}
              </YStack>
            </>
          )}
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
