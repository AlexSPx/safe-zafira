import { useState } from 'react';
import { YStack, XStack, Text, Input, Button, SizableText } from 'tamagui';
import { Link } from 'expo-router';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
          Create Account
        </SizableText>

        <YStack gap="$3">
          <Input
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            color="$textDark"
            placeholderTextColor="$zafiraInputPlaceholderText"
            size="$4"
            backgroundColor="$zafiraInput"
            borderColor="transparent"
          />
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
          <Input
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
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
          onPress={handleRegister}
          marginTop="$4"
          backgroundColor="$zafiraButton"
          pressStyle={{ backgroundColor: '$zafiraButtonHover' }}
          hoverStyle={{ backgroundColor: '$zafiraButtonHover' }}
        >
          Register
        </Button>

        <XStack justifyContent="center" marginTop="$4" gap="$2">
          <Text color="$textLight">Already have an account?</Text>
          <Link href="/login" asChild>
            <Text color="$textLight" fontWeight="bold">
              Log in
            </Text>
          </Link>
        </XStack>
      </YStack>
    </YStack>
  );
}
