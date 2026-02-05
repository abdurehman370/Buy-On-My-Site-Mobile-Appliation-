import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Product } from '@/services/api';
import { ProductCard } from '@/components/ProductCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export default function ProductScreen() {
    const { data } = useLocalSearchParams<{ data: string }>();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    let product: Product | null = null;
    try {
        if (data) {
            product = JSON.parse(data);
        }
    } catch (e) {
        console.error('Failed to parse product data', e);
    }

    if (!product) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.error }}>Failed to load product data.</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ProductCard product={product} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});
