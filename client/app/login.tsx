import { useState } from 'react';
import { YStack, XStack, Input, SizableText, useTheme } from 'tamagui';
import { Link, Stack, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, Mail, Lock } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const theme = useTheme();

  const handleLogin = () => {
    console.log('Mock login request triggered with:', { email, password });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <YStack flex={1} p="$4" backgroundColor="$background">
        <Stack.Screen options={{ title: 'Login', headerShown: false }} />

        <XStack jc="center" ai="center" pb="$2">
          <SizableText color="$textLight" fontSize={22} fontWeight="700">
            Login
          </SizableText>
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
            WELCOME BACK
          </SizableText>
          <SizableText color="$textLight" fontSize={14} lineHeight={22}>
            Sign in to access your vehicle and manage connected telemetry nodes.
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
              <Mail size={14} color={theme.textMuted?.val} />
              <SizableText color="$textMuted" fontSize={12} fontWeight="600">
                EMAIL
              </SizableText>
            </XStack>
            <Input
              unstyled
              placeholder="you@example.com"
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

          <TouchableOpacity onPress={handleLogin}>
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
              <LogIn size={18} color={theme.textLight?.val} />
              <SizableText color="$textLight" fontSize={15} fontWeight="700">
                Login
              </SizableText>
            </XStack>
          </TouchableOpacity>

          <XStack justifyContent="center" marginTop="$3" gap="$2">
            <SizableText color="$textMuted">Don't have an account?</SizableText>
            <Link href="/register" asChild>
              <TouchableOpacity>
                <SizableText color="$textLight" fontWeight="700">
                  Register
                </SizableText>
              </TouchableOpacity>
            </Link>
          </XStack>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
