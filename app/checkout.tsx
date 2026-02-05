import Colors from '@/constants/Colors';
import { CartData } from '@/types/cart';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function CheckoutScreen() {
    const { data } = useLocalSearchParams<{ data: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [isProcessing, setIsProcessing] = useState(false);

    let cartData: CartData | null = null;

    try {
        if (data) {
            cartData = JSON.parse(data);
        }
    } catch (e) {
        console.error('Failed to parse checkout data:', e);
    }

    if (!cartData) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ title: 'Checkout' }} />
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: colors.text }]}>
                        No checkout data available
                    </Text>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.buttonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const handlePlaceOrder = async () => {
        setIsProcessing(true);

        try {
            // TODO: Send cart data to your backend API
            // const response = await fetch('YOUR_API_ENDPOINT/checkout', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(cartData)
            // });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            Alert.alert(
                'Order Placed!',
                'Your order has been successfully placed.',
                [{ text: 'OK', onPress: () => router.push('/') }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to place order. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Safe parsing helper
    const parsePrice = (priceStr: string | undefined): number => {
        if (!priceStr) return 0;
        // Remove currency symbols, commas, and whitespace
        const cleanStr = priceStr.toString().replace(/[^0-9.]/g, '');
        return parseFloat(cleanStr) || 0;
    };

    const itemCount = cartData.items.length;

    // Calculate total from items as a fallback
    const calculatedTotal = cartData.items.reduce((sum, item) => {
        return sum + (parsePrice(item.unitPrice) * item.quantity);
    }, 0);

    // Use extracted total if valid, otherwise use calculated total
    let totalAmount = parsePrice(cartData.totals.total);

    // If extracted total is 0 but we have items, use calculated total + tax/shipping
    if (totalAmount === 0 && calculatedTotal > 0) {
        const tax = parsePrice(cartData.totals.tax);
        const shipping = parsePrice(cartData.totals.shipping);
        const discount = parsePrice(cartData.totals.discount);
        totalAmount = calculatedTotal + tax + shipping - discount;

        // Update the display string too if it was 0.00
        if (cartData.totals.total === '0.00') {
            cartData.totals.total = totalAmount.toFixed(2);
        }
        // Also update subtotal if missing
        if (parsePrice(cartData.totals.subtotal) === 0) {
            cartData.totals.subtotal = calculatedTotal.toFixed(2);
        }
    }

    return (
        <View style={[styles.container, { backgroundColor: '#F3F4F6' }]}>
            <Stack.Screen options={{
                title: 'Checkout',
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: '#fff'
            }} />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Checkout Header */}
                <View style={styles.headerCard}>
                    <Text style={styles.headerTitle}>🛒 Review Your Order</Text>
                    <Text style={styles.headerSubtitle}>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'} from Home Depot
                    </Text>
                </View>

                {/* Order Items Summary */}
                <View style={styles.itemsCard}>
                    <Text style={styles.sectionTitle}>Order Items</Text>
                    {cartData.items.map((item, index) => (
                        <View key={index} style={styles.itemContainer}>
                            <View style={styles.itemRow}>
                                <Image
                                    source={{ uri: item.image }}
                                    style={styles.itemImage}
                                    resizeMode="contain"
                                />
                                <View style={styles.itemInfo}>
                                    <View style={styles.brandBadge}>
                                        <Text style={styles.brandText}>{item.brand}</Text>
                                    </View>
                                    <Text style={styles.itemTitle} numberOfLines={2}>
                                        {item.title}
                                    </Text>

                                    {/* Price Details */}
                                    <View style={styles.priceContainer}>
                                        <Text style={styles.itemPrice}>
                                            ${item.unitPrice}
                                        </Text>
                                        {item.originalPrice && item.originalPrice !== item.unitPrice && (
                                            <Text style={styles.originalPrice}>
                                                ${item.originalPrice}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Quantity & Savings */}
                                    <View style={styles.qtyRow}>
                                        <Text style={styles.qtyText}>Qty: {item.quantity}</Text>
                                        {item.savings && (
                                            <View style={styles.savingsBadge}>
                                                <Text style={styles.savingsText}>{item.savings}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <Text style={styles.itemSubtotal}>${item.subtotal}</Text>
                            </View>

                            {/* Item Fulfillment Details */}
                            {item.selectedOptions?.fulfillment && (
                                <View style={styles.itemFulfillment}>
                                    <Text style={styles.fulfillmentType}>
                                        {item.selectedOptions.fulfillment === 'Pickup' ? '🏪 Pickup' : '🚚 Delivery'}
                                    </Text>
                                    {item.selectedOptions.pickupLocation && (
                                        <Text style={styles.fulfillmentDetail}>{item.selectedOptions.pickupLocation}</Text>
                                    )}
                                    {item.selectedOptions.pickupETA && (
                                        <Text style={styles.fulfillmentDetail}>{item.selectedOptions.pickupETA}</Text>
                                    )}
                                </View>
                            )}

                            {/* Item Add-ons */}
                            {item.selectedOptions?.addons && item.selectedOptions.addons.length > 0 && (
                                <View style={styles.itemAddons}>
                                    {item.selectedOptions.addons.map((addon, aIdx) => (
                                        <Text key={aIdx} style={styles.addonText}>🛡️ {addon}</Text>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Discounts */}
                {cartData.discounts && cartData.discounts.length > 0 && (
                    <View style={styles.discountsCard}>
                        <Text style={styles.sectionTitle}>💰 Applied Discounts</Text>
                        {cartData.discounts.map((discount, index) => (
                            <View key={index} style={styles.discountRow}>
                                <Text style={styles.discountLabel}>{discount.description}</Text>
                                <Text style={styles.discountValue}>-${discount.amount}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Order Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.sectionTitle}>Order Summary</Text>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>${cartData.totals.subtotal}</Text>
                    </View>

                    {(parsePrice(cartData.totals.savings || '0') > 0 || parsePrice(cartData.totals.discount || '0') > 0) && (
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Savings</Text>
                            <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                                -${cartData.totals.savings || cartData.totals.discount}
                            </Text>
                        </View>
                    )}

                    {cartData.totals.delivery && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Delivery</Text>
                            <Text style={[styles.summaryValue, cartData.totals.delivery === 'FREE' && { color: '#10B981' }]}>
                                {cartData.totals.delivery === 'FREE' ? 'FREE' : `$${cartData.totals.delivery}`}
                            </Text>
                        </View>
                    )}

                    {cartData.totals.pickup && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Pickup</Text>
                            <Text style={[styles.summaryValue, cartData.totals.pickup === 'FREE' && { color: '#10B981' }]}>
                                {cartData.totals.pickup === 'FREE' ? 'FREE' : `$${cartData.totals.pickup}`}
                            </Text>
                        </View>
                    )}

                    {cartData.totals.tax && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Sales Tax</Text>
                            <Text style={styles.summaryValue}>
                                {cartData.totals.tax === '---' ? '---' : `$${cartData.totals.tax}`}
                            </Text>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>${cartData.totals.total}</Text>
                    </View>
                </View>

                {/* Payment Options */}
                <View style={styles.paymentCard}>
                    <Text style={styles.sectionTitle}>Payment Method</Text>
                    <TouchableOpacity style={styles.paymentOptionActive}>
                        <View style={styles.paymentOptionInfo}>
                            <View style={styles.paypalLogoContainer}>
                                <Text style={styles.paypalText}>Pay</Text>
                                <Text style={[styles.paypalText, { color: '#0070BA' }]}>Pal</Text>
                            </View>
                            <Text style={styles.paymentOptionLabel}>PayPal Quick Checkout</Text>
                        </View>
                        <View style={styles.radioActive} />
                    </TouchableOpacity>
                </View>

                {/* Bottom Spacing */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Fixed Bottom Actions */}
            <View style={styles.bottomActions}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => router.back()}
                    disabled={isProcessing}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.checkoutButton, isProcessing && styles.checkoutButtonDisabled]}
                    onPress={handlePlaceOrder}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.checkoutButtonText}>Place Order</Text>
                            <Text style={styles.checkoutButtonAmount}>${totalAmount.toFixed(2)}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        marginBottom: 20,
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Header
    headerCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 12,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6B7280',
    },

    // Items
    itemsCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    itemContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingVertical: 12,
    },
    itemRow: {
        flexDirection: 'row',
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    brandBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    brandText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    itemBrand: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 12,
        color: '#6B7280',
    },
    itemSubtotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginLeft: 8,
    },
    itemFulfillment: {
        marginTop: 8,
        padding: 8,
        backgroundColor: '#F9FAFB',
        borderRadius: 6,
    },
    fulfillmentType: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
    },
    fulfillmentDetail: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },
    itemAddons: {
        marginTop: 4,
    },
    addonText: {
        fontSize: 11,
        color: '#4B5563',
        fontStyle: 'italic',
    },

    // Discounts
    discountsCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    discountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    discountLabel: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
    },
    discountValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#10B981',
    },

    // Summary
    summaryCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    summaryLabel: {
        fontSize: 16,
        color: '#6B7280',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    totalLabel: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f96302',
    },

    // Payment
    paymentCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    paymentOptionActive: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#f96302',
        backgroundColor: '#FFF7ED',
    },
    paymentOptionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paypalLogoContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    paypalText: {
        fontSize: 14,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#003087',
    },
    paymentOptionLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    radioActive: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 6,
        borderColor: '#f96302',
        backgroundColor: '#FFFFFF',
    },

    // Bottom Actions
    bottomActions: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6B7280',
    },
    checkoutButton: {
        flex: 2,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#f96302',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#f96302',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    checkoutButtonDisabled: {
        opacity: 0.6,
    },
    checkoutButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    checkoutButtonAmount: {
        fontSize: 14,
        color: '#FFFFFF',
        marginTop: 2,
    },

    // New Styles
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 4,
        gap: 6,
    },
    originalPrice: {
        fontSize: 12,
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    qtyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 8,
    },
    qtyText: {
        fontSize: 13,
        color: '#4B5563',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    savingsBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    savingsText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#059669',
    },
});
