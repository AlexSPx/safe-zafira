import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Button } from 'tamagui';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text>Welcome to Safe Zafira</Text>
      <Link href="/login" asChild>
        <Button size="$4" theme="active" marginBottom="$4">
          Go to Login
        </Button>
      </Link>
      <Button onPress={() => router.push('/dashboard')} size="$4" theme="active">
        Go to Dashboard
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
});
