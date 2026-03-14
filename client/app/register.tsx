import { useState } from 'react';
import {
  YStack,
  XStack,
  Input,
  SizableText,
  Button,
  ScrollView,
  useTheme,
} from 'tamagui';
import { Stack, router } from 'expo-router';
import { TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  UserPlus,
  User,
  Mail,
  Lock,
  ShieldCheck,
  UserRoundPen,
} from 'lucide-react-native';
import { ApiError, apiService } from '../services/authService';
import { saveJwtToSecureStore } from '../services/jwtSecureStore';
import { setAuthStore } from '../stores/authStore';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const theme = useTheme();

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (
      !username.trim() ||
      !firstName.trim() ||
      !familyName.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await apiService.register({
        username: username.trim(),
        firstName: firstName.trim(),
        familyName: familyName.trim(),
        email: email.trim(),
        password,
      });

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
        setErrorMessage('Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <Stack.Screen options={{ title: 'Register', headerShown: false }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <YStack flex={1} p="$4" backgroundColor="$background">
            <XStack jc="center" ai="center" pb="$2">
              <SizableText
                textAlign="center"
                color="$textLight"
                fontSize={22}
                fontWeight="700"
              >
                Register
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
                  <SizableText
                    color="$textMuted"
                    fontSize={12}
                    fontWeight="600"
                  >
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
                  <UserRoundPen size={14} color={theme.textMuted?.val} />
                  <SizableText
                    color="$textMuted"
                    fontSize={12}
                    fontWeight="600"
                  >
                    FIRST NAME
                  </SizableText>
                </XStack>
                <Input
                  unstyled
                  placeholder="Enter first name"
                  value={firstName}
                  onChangeText={setFirstName}
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
                  <UserRoundPen size={14} color={theme.textMuted?.val} />
                  <SizableText
                    color="$textMuted"
                    fontSize={12}
                    fontWeight="600"
                  >
                    LAST NAME
                  </SizableText>
                </XStack>
                <Input
                  unstyled
                  placeholder="Enter last name"
                  value={familyName}
                  onChangeText={setFamilyName}
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
                  <SizableText
                    color="$textMuted"
                    fontSize={12}
                    fontWeight="600"
                  >
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
                  <SizableText
                    color="$textMuted"
                    fontSize={12}
                    fontWeight="600"
                  >
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
                  <SizableText
                    color="$textMuted"
                    fontSize={12}
                    fontWeight="600"
                  >
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
                  void handleRegister();
                }}
                disabled={isSubmitting}
                icon={<UserPlus size={18} color={theme.textLight?.val} />}
              >
                <SizableText color="$textLight" fontSize={15} fontWeight="700">
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </SizableText>
              </Button>

              <XStack justifyContent="center" marginTop="$3" gap="$2">
                <SizableText color="$textMuted">
                  Already have an account?
                </SizableText>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <SizableText color="$textLight" fontWeight="700">
                    Log in
                  </SizableText>
                </TouchableOpacity>
              </XStack>
            </YStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
