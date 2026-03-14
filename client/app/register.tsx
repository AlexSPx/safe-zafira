import { useState } from 'react';
import { YStack, XStack, Input, SizableText, Square, useTheme } from 'tamagui';
import { Link, Stack, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  UserPlus,
  User,
  Mail,
  Lock,
  ShieldCheck,
} from 'lucide-react-native';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const theme = useTheme();

  const handleRegister = () => {
    console.log('Mock register request:', {
      username,
      email,
      password,
      confirmPassword,
    });
    if (password !== confirmPassword) {
      console.warn('Passwords do not match!');
      return;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <YStack flex={1} p="$4" backgroundColor="$background">
        <Stack.Screen options={{ title: 'Register', headerShown: false }} />

        <XStack jc="space-between" ai="center" pb="$2">
          <TouchableOpacity onPress={() => router.back()}>
            <XStack w={40} h={40} jc="center" ai="center">
              <ChevronLeft size={24} color={theme.textLight?.val} />
            </XStack>
          </TouchableOpacity>

          <SizableText color="$textLight" fontSize={22} fontWeight="700">
            Register
          </SizableText>

          <Square size={40} backgroundColor="transparent" />
        </XStack>

        <YStack
          mt="$3"
          mb="$5"
          backgroundColor="$surface"
          borderColor="$borderColor"
          borderWidth={1}
          borderRadius={20}
          p="$4"
          gap="$2"
        >
          <SizableText
            color="$textMuted"
            fontSize={13}
            fontWeight="600"
            letterSpacing={1}
          >
            CREATE ACCOUNT
          </SizableText>
          <SizableText color="$textLight" fontSize={14} lineHeight={22}>
            Set up your account to pair devices and access your vehicle
            dashboard.
          </SizableText>
        </YStack>

        <YStack width="100%" maxWidth={420} alignSelf="center" gap="$3">
          <YStack
            backgroundColor="$surface"
            borderColor="$borderColor"
            borderWidth={1}
            borderRadius={16}
            px="$3"
            py="$2"
            gap="$2"
          >
            <XStack ai="center" gap="$2">
              <User size={14} color={theme.textMuted?.val} />
              <SizableText color="$textMuted" fontSize={12} fontWeight="600">
                USERNAME
              </SizableText>
            </XStack>
            <Input
              unstyled
              placeholder="Enter username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              color="$textLight"
            />
          </YStack>

          <YStack
            backgroundColor="$surface"
            borderColor="$borderColor"
            borderWidth={1}
            borderRadius={16}
            px="$3"
            py="$2"
            gap="$2"
          >
            <XStack ai="center" gap="$2">
              <Mail size={14} color={theme.textMuted?.val} />
              <SizableText color="$textMuted" fontSize={12} fontWeight="600">
                EMAIL
              </SizableText>
            </XStack>
            <Input
              unstyled
              placeholder="Enter email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              color="$textLight"
            />
          </YStack>

          <YStack
            backgroundColor="$surface"
            borderColor="$borderColor"
            borderWidth={1}
            borderRadius={16}
            px="$3"
            py="$2"
            gap="$2"
          >
            <XStack ai="center" gap="$2">
              <Lock size={14} color={theme.textMuted?.val} />
              <SizableText color="$textMuted" fontSize={12} fontWeight="600">
                PASSWORD
              </SizableText>
            </XStack>
            <Input
              unstyled
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              color="$textLight"
            />
          </YStack>

          <YStack
            backgroundColor="$surface"
            borderColor="$borderColor"
            borderWidth={1}
            borderRadius={16}
            px="$3"
            py="$2"
            gap="$2"
          >
            <XStack ai="center" gap="$2">
              <ShieldCheck size={14} color={theme.textMuted?.val} />
              <SizableText color="$textMuted" fontSize={12} fontWeight="600">
                CONFIRM PASSWORD
              </SizableText>
            </XStack>
            <Input
              unstyled
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              color="$textLight"
            />
          </YStack>

          <TouchableOpacity onPress={handleRegister}>
            <XStack
              mt="$2"
              backgroundColor="$button"
              borderRadius={16}
              py="$3"
              px="$4"
              ai="center"
              jc="center"
              gap="$2"
              pressStyle={{ backgroundColor: '$buttonHover' }}
            >
              <UserPlus size={18} color={theme.textLight?.val} />
              <SizableText color="$textLight" fontSize={15} fontWeight="700">
                Create Account
              </SizableText>
            </XStack>
          </TouchableOpacity>

          <XStack justifyContent="center" marginTop="$3" gap="$2">
            <SizableText color="$textMuted">
              Already have an account?
            </SizableText>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <SizableText color="$textLight" fontWeight="700">
                  Log in
                </SizableText>
              </TouchableOpacity>
            </Link>
          </XStack>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
