import { useState } from 'react';
import { YStack, XStack, Text, Input, Button, SizableText } from 'tamagui';
import { Link } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    console.log('Mock login request triggered with:', { email, password });
  };

  return (
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      padding="$6"
      theme="dark"
      backgroundColor="$zafiraBackground"
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
            placeholderTextColor="$zafiraInputPlaceholderText"
            size="$4"
            backgroundColor="$zafiraInput"
            borderColor="transparent"
          />
          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            color="$textDark"
            placeholderTextColor="$zafiraInputPlaceholderText"
            secureTextEntry
            size="$4"
            backgroundColor="$zafiraInput"
            borderColor="transparent"
          />
        </YStack>

        <Button
          size="$4"
          onPress={handleLogin}
          marginTop="$4"
          backgroundColor="$zafiraButton"
          pressStyle={{ backgroundColor: '$zafiraButtonHover' }}
          hoverStyle={{ backgroundColor: '$zafiraButtonHover' }}
        >
          Login
        </Button>

        <XStack justifyContent="center" marginTop="$4" gap="$2">
          <Text color="$textLight">Don't have an account?</Text>
          <Link href="/register" asChild>
            <Text color="$textLight" fontWeight="bold">
              Register
            </Text>
          </Link>
        </XStack>
      </YStack>
    </YStack>
  );
}
