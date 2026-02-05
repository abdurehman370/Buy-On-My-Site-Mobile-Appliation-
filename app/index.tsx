import Colors from '@/constants/Colors';
import { getInitialShareUrl } from '@/services/share';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IndexScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [checkingShare, setCheckingShare] = useState(true);

    useEffect(() => {
        checkShareIntent();
    }, []);

    const checkShareIntent = async () => {
        try {
            const url = await getInitialShareUrl();
            if (url) {
                console.log('Found share URL:', url);
                // Navigate to import screen with the URL
                router.replace({ pathname: '/import', params: { url } });
            } else {
                setCheckingShare(false);
            }
        } catch (e) {
            console.error(e);
            setCheckingShare(false);
        }
    };

    if (checkingShare) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.secondary }]}>Checking for shared items...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <Image
                    source={require('@/assets/images/react-logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />

                <Text style={[styles.title, { color: colors.text }]}>BuyOnMySite</Text>
                <Text style={[styles.subtitle, { color: colors.secondary }]}>
                    Import products from Home Depot to your cart.
                </Text>

                <View style={[styles.instructions, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <Text style={[styles.instructionStep, { color: colors.text }]}>
                        1. Open the Home Depot App
                    </Text>
                    <Text style={[styles.instructionStep, { color: colors.text }]}>
                        2. Find a product you like
                    </Text>
                    <Text style={[styles.instructionStep, { color: colors.text }]}>
                        3. Tap the Share icon
                    </Text>
                    <Text style={[styles.instructionStep, { color: colors.text }]}>
                        4. Select "BuyOnMySite"
                        4. Select "BuyOnMySite"
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => router.push('/browser')}
                    style={[styles.button, { backgroundColor: colors.primary }]}
                >
                    <Text style={styles.buttonText}>Browse Home Depot</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/lowes-browser')}
                    style={[styles.button, { backgroundColor: '#004990', marginTop: 12 }]}
                >
                    <Text style={styles.buttonText}>Browse Lowe's</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/harbor-browser')}
                    style={[styles.button, { backgroundColor: '#d61c1c', marginTop: 12 }]}
                >
                    <Text style={styles.buttonText}>Browse Harbor Freight</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push({ pathname: '/import', params: { url: 'https://www.homedepot.com/p/debug-product/12345' } })}
                    style={styles.debugBtn}
                >
                    <Text style={{ color: colors.tint }}>Debug: Test Import</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 48,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    instructions: {
        width: '100%',
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
    },
    instructionStep: {
        fontSize: 16,
        marginBottom: 12,
        lineHeight: 24,
    },
    debugBtn: {
        marginTop: 20,
        padding: 10,
    },
    button: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24,
        elevation: 2,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
