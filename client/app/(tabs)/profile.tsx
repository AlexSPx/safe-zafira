import React from 'react';
import {
  YStack,
  SizableText,
  ScrollView,
  Circle,
  Button,
  useTheme,
} from 'tamagui';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, LogOut } from 'lucide-react-native';
import { DataRow } from '../../components/DataRow';
import { RowSeparator } from '../../components/RowSeparator';

const userData = {
  username: 'johndoe',
  email: 'john.doe@example.com',
  fullName: 'John Doe',
  memberSince: 'March 2024',
};

export default function ProfileScreen() {
  const theme = useTheme();

  const handleLogout = () => {
    router.replace('/login');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <Stack.Screen
        options={{
          title: 'Profile',
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
          <YStack alignItems="center" mb="$6">
            <Circle
              size={100}
              backgroundColor="$surface"
              borderWidth={2}
              borderColor="$borderColor"
              mb="$4"
            >
              <User size={48} color={theme.textLight?.val} />
            </Circle>
            <SizableText
              color="$textLight"
              fontSize={24}
              fontWeight="700"
              mb="$1"
            >
              {userData.fullName}
            </SizableText>
            <SizableText color="$textMuted" fontSize={14}>
              @{userData.username}
            </SizableText>
          </YStack>

          <SizableText
            color="$textMuted"
            fontSize={12}
            letterSpacing={1.5}
            mb="$3"
            fontWeight="600"
          >
            ACCOUNT DETAILS
          </SizableText>
          <YStack
            backgroundColor="$surface"
            borderColor="$borderColor"
            borderWidth={1}
            paddingHorizontal="$4"
            borderRadius={20}
            mb="$6"
          >
            <DataRow label="Username" value={userData.username} />
            <RowSeparator />
            <DataRow label="Email" value={userData.email} />
            <RowSeparator />
            <DataRow label="Member Since" value={userData.memberSince} />
          </YStack>

          <Button
            size="$4"
            backgroundColor="$button"
            pressStyle={{ backgroundColor: '$buttonHover' }}
            onPress={handleLogout}
            icon={<LogOut size={18} color={theme.textLight?.val} />}
          >
            <SizableText color="$textLight" fontWeight="600">
              Log Out
            </SizableText>
          </Button>
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
