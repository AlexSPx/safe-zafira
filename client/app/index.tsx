import { Stack, router } from 'expo-router';
import { YStack, XStack, SizableText, Button, useTheme } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, UserPlus, ShieldCheck } from 'lucide-react-native';

export default function Index() {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background?.val }}>
      <YStack flex={1} p="$4" backgroundColor="$background" jc="center">
        <Stack.Screen options={{ title: 'Welcome', headerShown: false }} />

        <XStack jc="center" ai="center" gap="$2" mb="$2">
          <ShieldCheck size={24} color={theme.textLight?.val} />
          <SizableText color="$textLight" fontSize={30} fontWeight="800">
            Safe Zafira
          </SizableText>
        </XStack>

        <YStack width="100%" maxWidth={420} alignSelf="center" gap="$3">
          <Button
            onPress={() => router.push('/login')}
            backgroundColor="$button"
            borderRadius={16}
            pressStyle={{ backgroundColor: '$buttonHover' }}
            icon={<LogIn size={18} color={theme.textLight?.val} />}
          >
            <SizableText color="$textLight" fontSize={15} fontWeight="700">
              Login
            </SizableText>
          </Button>

          <Button
            onPress={() => router.push('/register')}
            backgroundColor="$surface"
            borderColor="$borderColor"
            borderWidth={1}
            borderRadius={16}
            pressStyle={{ opacity: 0.9 }}
            icon={<UserPlus size={18} color={theme.textLight?.val} />}
          >
            <SizableText color="$textLight" fontSize={15} fontWeight="700">
              Register
            </SizableText>
          </Button>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
