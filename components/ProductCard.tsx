import Colors from '@/constants/Colors';
import { Product } from '@/services/api';
import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

interface ProductCardProps {
    product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const handleBuyPress = () => {
        if (product.checkoutUrl) {
            Linking.openURL(product.checkoutUrl);
        }
    };

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image
                source={{ uri: product.image }}
                style={styles.image}
                resizeMode="contain"
            />
            <View style={styles.content}>
                <Text style={[styles.brand, { color: colors.secondary }]}>{product.brand}</Text>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{product.title}</Text>
                <Text style={[styles.price, { color: colors.primary }]}>${product.price}</Text>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={handleBuyPress}
                >
                    <Text style={styles.buttonText}>Add to Cart</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton, { borderColor: colors.primary }]}
                    onPress={handleBuyPress}
                >
                    <Text style={[styles.buttonText, { color: colors.primary }]}>Buy from My Site</Text>
                </TouchableOpacity>
                <Text style={[styles.disclaimer, { color: colors.secondary }]}>
                    You will be redirected to our secure checkout
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        margin: 16,
    },
    image: {
        width: '100%',
        height: 250,
        backgroundColor: '#fff',
    },
    content: {
        padding: 16,
    },
    brand: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        lineHeight: 24,
    },
    price: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 16,
    },
    button: {
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disclaimer: {
        fontSize: 12,
        textAlign: 'center',
        opacity: 0.8,
    }
});
