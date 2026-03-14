import { useState } from 'react';
import { YStack, XStack, Text, Input, Button, SizableText } from 'tamagui';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    console.log('Mock login request triggered with:', { email, password });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '$background' }}>
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        padding="$6"
        theme="dark"
        backgroundColor="$background"
      >
        <YStack width="100%" maxWidth={400} gap="$4">
          <SizableText
            size="$8"
            fontWeight="bold"
            textAlign="center"
            marginBottom="$4"
            color="$textLight"
          >
            Welcome Back
          </SizableText>

          <YStack gap="$3">
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              color="$textDark"
              placeholderTextColor="$inputPlaceholderText"
              size="$4"
              backgroundColor="$input"
              borderColor="transparent"
            />
            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              color="$textDark"
              placeholderTextColor="$inputPlaceholderText"
              secureTextEntry
              size="$4"
              backgroundColor="$input"
              borderColor="transparent"
            />
          </YStack>

          <Button
            size="$4"
            onPress={handleLogin}
            marginTop="$4"
            backgroundColor="$button"
            pressStyle={{ backgroundColor: '$buttonHover' }}
            hoverStyle={{ backgroundColor: '$buttonHover' }}
          >
            <SizableText whiteSpace="normal" numberOfLines={0}>
              Login
            </SizableText>
          </Button>

          <XStack justifyContent="center" marginTop="$4" gap="$2">
            <SizableText
              whiteSpace="normal"
              numberOfLines={0}
              color="$textLight"
            >
              Don't have an account?
            </SizableText>
            <Link href="/register" asChild>
              <SizableText
                whiteSpace="normal"
                numberOfLines={0}
                color="$textLight"
                fontWeight="bold"
              >
                Register
              </SizableText>
            </Link>
          </XStack>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
