import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
    return (
        <View style={styles.container}>
            <Text>Welcome to Safe Zafira</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: '100%', height: '100%' },
});