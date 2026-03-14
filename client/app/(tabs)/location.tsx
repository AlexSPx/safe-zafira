import React from 'react';
import { YStack, SizableText, useTheme } from 'tamagui';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StatisticsScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <Stack.Screen
        options={{
          title: 'Location',
          headerStyle: { backgroundColor: theme.background?.val },
          headerTintColor: theme.textLight?.val,
          headerShadowVisible: false,
        }}
      />

      <YStack flex={1} backgroundColor="$background" px="$4">
        <SizableText color="$textMuted" fontSize={14}>
          LOCATION TESTING
        </SizableText>
      </YStack>
    </SafeAreaView>
  );
}
