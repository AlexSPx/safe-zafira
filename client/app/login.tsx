import { useState } from 'react';
import { YStack, XStack, Input, SizableText, Button, useTheme } from 'tamagui';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, Mail, Lock } from 'lucide-react-native';
import { ApiError, apiService } from '../services/authService';
import { saveJwtToSecureStore } from '../services/jwtSecureStore';
import { setAuthStore } from '../stores/authStore';
import { TouchableOpacity } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      console.log("Login process started.");
      
      const response = await apiService.login({
        email: email.trim(),
        password,
      });
      
      console.log("Service returned success for login, response:", response);

      const {
        token,
        userId,
        email: responseEmail,
        username: responseUsername,
        firstName: responseFirstName,
        familyName: responseFamilyName,
      } = response;
      setAuthStore(
        {
          userId,
          email: responseEmail,
          username: responseUsername,
          firstName: responseFirstName,
          familyName: responseFamilyName,
        },
        token,
      );
      await saveJwtToSecureStore(token);

      router.replace('/(tabs)/dashboard');
    } catch (error) {
      
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
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

          {errorMessage ? (
            <SizableText color="$red10" fontSize={13}>
              {errorMessage}
            </SizableText>
          ) : null}

          <Button
            mt="$2"
            backgroundColor="$button"
            borderRadius={16}
            opacity={isSubmitting ? 0.7 : 1}
            pressStyle={{ backgroundColor: '$buttonHover' }}
            onPress={() => {
              void handleLogin();
            }}
            disabled={isSubmitting}
            icon={<LogIn size={18} color={theme.textLight?.val} />}
          >
            <SizableText color="$textLight" fontSize={15} fontWeight="700">
              {isSubmitting ? 'Logging in...' : 'Login'}
            </SizableText>
          </Button>

          <XStack justifyContent="center" marginTop="$3" gap="$2">
            <SizableText color="$textMuted">Don't have an account?</SizableText>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <SizableText color="$textLight" fontWeight="700">
                Register
              </SizableText>
            </TouchableOpacity>
          </XStack>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
