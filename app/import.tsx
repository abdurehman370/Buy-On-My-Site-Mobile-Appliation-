import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { importProduct, Product } from '@/services/api';
import { extractUrlFromText, isValidHomeDepotUrl } from '@/services/share';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export default function ImportScreen() {
    const { url } = useLocalSearchParams<{ url: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [status, setStatus] = useState<string>('Analyzing...');

    useEffect(() => {
        processImport();
    }, [url]);

    const processImport = async () => {
        if (!url) {
            router.replace('/error?msg=No URL provided');
            return;
        }

        // 1. Clean URL
        const cleanUrl = extractUrlFromText(url);
        if (!cleanUrl || !isValidHomeDepotUrl(cleanUrl)) {
            // For debugging allow the debug url
            if (url.includes('debug-product')) {
                // proceed mock
            } else {
                router.replace('/error?msg=Invalid Home Depot URL');
                return;
            }
        }

        try {
            setStatus('Fetching product details...');

            // Mock delay for UX or Debug
            if (url.includes('debug-product')) {
                await new Promise(r => setTimeout(r, 1500));
                const mockProduct: Product = {
                    sku: '333196597',
                    title: 'Milwaukee M18 FUEL 18V Lithium-Ion Brushless Cordless 1/2 in. Drill/Driver',
                    brand: 'Milwaukee',
                    price: '199.00',
                    image: 'https://images.thdstatic.com/productImages/1d64ea68-9f7f-45d0-b29e-87981w4887/svn/milwaukee-hammer-drills-2804-20-64_1000.jpg',
                    checkoutUrl: 'https://google.com'
                };
                router.replace({ pathname: '/product', params: { data: JSON.stringify(mockProduct) } });
                return;
            }

            const product = await importProduct(cleanUrl!);

            // Navigate to Product Preview
            router.replace({ pathname: '/product', params: { data: JSON.stringify(product) } });

        } catch (e: any) {
            console.error(e);
            router.replace(`/error?msg=${encodeURIComponent(e.message || 'Failed to import product')}`);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.status, { color: colors.text }]}>{status}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    status: {
        marginTop: 20,
        fontSize: 18,
        fontWeight: '500',
    }
});
