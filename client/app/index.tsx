import React from 'react';
import { Link, router } from 'expo-router';
import { Button, YStack, SizableText } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LogIn, LayoutDashboard } from 'lucide-react-native';

export default function Index() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#57245d' }}>
      <LinearGradient
        colors={['#57245d', '#2d0c33']}
        style={{ flex: 1 }}
      >
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$5" padding="$4">
          <SizableText color="$textLight" size="$9" fontWeight="bold" textAlign="center" marginBottom="$6">
            Safe Zafira
          </SizableText>
          
          <Link href="/login" asChild>
            <Button 
              size="$5" 
              backgroundColor="$button" 
              pressStyle={{ backgroundColor: '$buttonHover' }} 
              icon={<LogIn size={20} color="white" />}
              width={250}
            >
              <SizableText color="$textLight" fontWeight="bold">Login</SizableText>
            </Button>
          </Link>
          
          <Button 
            onPress={() => router.push('/(tabs)/dashboard')} 
            size="$5" 
            backgroundColor="$button" 
            pressStyle={{ backgroundColor: '$buttonHover' }}
            icon={<LayoutDashboard size={20} color="white" />}
            width={250}
          >
            <SizableText color="$textLight" fontWeight="bold">Dashboard</SizableText>
          </Button>
        </YStack>
      </LinearGradient>
    </SafeAreaView>
  );
}
