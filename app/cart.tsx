import Colors from '@/constants/Colors';
import { Product } from '@/services/api';
import { CartData, CartItem, isCartData, isProductData } from '@/types/cart';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

export default function CartScreen() {
    const { data } = useLocalSearchParams<{ data: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    let parsedData: any = null;
    let isCart = false;
    let cartData: CartData | null = null;
    let singleProduct: Product | null = null;
    let quantity = '1';
    let selectedOptions: any = {};
    let stockStatus = 'Unknown';

    try {
        if (data) {
            parsedData = JSON.parse(data);

            // Determine if it's cart data or single product data
            if (isCartData(parsedData)) {
                isCart = true;
                cartData = parsedData;
            } else if (isProductData(parsedData)) {
                isCart = false;
                singleProduct = {
                    sku: parsedData.sku || '',
                    title: parsedData.title || '',
                    brand: parsedData.brand || '',
                    price: parsedData.price || '0.00',
                    image: parsedData.image || '',
                    checkoutUrl: parsedData.url || ''
                };
                quantity = parsedData.quantity || '1';
                selectedOptions = parsedData.selectedOptions || {};
                stockStatus = parsedData.stockStatus || 'Unknown';
            }
        }
    } catch (e) {
        console.error('Failed to parse cart data:', e);
    }

    if (!cartData && !singleProduct) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ title: 'Cart' }} />
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: colors.text }]}>
                        No cart data available
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

    const handleCheckout = () => {
        const checkoutUrl = isCart ? cartData?.cartUrl : singleProduct?.checkoutUrl;
        if (checkoutUrl) {
            console.log('Proceeding to checkout:', checkoutUrl);
            // You can use Linking.openURL(checkoutUrl) here if needed
        }
    };

    const handleContinueShopping = () => {
        router.back();
    };

    // Determine stock color
    const getStockColor = () => {
        if (stockStatus === 'In Stock') return '#10B981';
        if (stockStatus === 'Out of Stock') return '#EF4444';
        return '#F59E0B';
    };

    // Render single product item card
    const renderProductCard = (item: CartItem | Product, index?: number) => {
        const isCartItem = 'unitPrice' in item;
        const itemPrice = isCartItem ? item.unitPrice : (item as Product).price;
        const itemQty = isCartItem ? item.quantity : parseInt(quantity);
        const itemSubtotal = isCartItem ? item.subtotal : (parseFloat(itemPrice) * itemQty).toFixed(2);
        const options = isCartItem ? item.selectedOptions : selectedOptions;

        return (
            <View key={index || 0} style={styles.productCard}>
                {/* Product Image */}
                {item.image && (
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: item.image }}
                            style={styles.productImage}
                            resizeMode="contain"
                        />
                    </View>
                )}

                {/* Product Info */}
                <View style={styles.infoContainer}>
                    {/* Brand Badge */}
                    {item.brand && (
                        <View style={styles.brandBadge}>
                            <Text style={styles.brandText}>{item.brand}</Text>
                        </View>
                    )}

                    {/* Title */}
                    <Text style={styles.title}>{item.title}</Text>

                    {/* SKU */}
                    {item.sku && (
                        <Text style={styles.sku}>SKU: {item.sku}</Text>
                    )}

                    {/* Fulfillment Details */}
                    {options?.fulfillment && (
                        <View style={styles.fulfillmentInfo}>
                            <Text style={styles.fulfillmentType}>
                                {options.fulfillment === 'Pickup' ? '🏪 Pickup' : '🚚 Delivery'}
                            </Text>
                            {options.pickupLocation && (
                                <Text style={styles.fulfillmentDetail}>{options.pickupLocation}</Text>
                            )}
                            {options.pickupETA && (
                                <Text style={styles.fulfillmentDetail}>{options.pickupETA}</Text>
                            )}
                            {options.deliveryZip && (
                                <Text style={styles.fulfillmentDetail}>To: {options.deliveryZip}</Text>
                            )}
                        </View>
                    )}

                    {/* Stock Status Badge - Only for single product */}
                    {!isCart && (
                        <View style={[styles.stockBadge, { backgroundColor: getStockColor() + '15', borderColor: getStockColor() }]}>
                            <View style={[styles.stockDot, { backgroundColor: getStockColor() }]} />
                            <Text style={[styles.stockText, { color: getStockColor() }]}>
                                {stockStatus}
                            </Text>
                        </View>
                    )}

                    {/* Item Price Summary */}
                    <View style={styles.itemPriceSummary}>
                        <View style={styles.itemPriceRow}>
                            <Text style={styles.itemPriceLabel}>${parseFloat(itemPrice).toFixed(2)} × {itemQty}</Text>
                            <Text style={styles.itemPriceValue}>${itemSubtotal}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // Calculate totals for single product
    const singleProductTotals = singleProduct ? {
        subtotal: (parseFloat(singleProduct.price) * parseInt(quantity)).toFixed(2),
        total: (parseFloat(singleProduct.price) * parseInt(quantity)).toFixed(2)
    } : null;

    const displayTotals = isCart && cartData ? cartData.totals : singleProductTotals;
    const displayDiscounts = isCart && cartData ? cartData.discounts : [];
    const itemCount = isCart && cartData ? cartData.items.length : 1;

    return (
        <View style={[styles.container, { backgroundColor: '#F3F4F6' }]}>
            <Stack.Screen options={{
                title: `Shopping Cart${itemCount > 1 ? ` (${itemCount})` : ''}`,
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: '#fff'
            }} />
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Render Cart Items */}
                {isCart && cartData ? (
                    cartData.items.map((item, index) => renderProductCard(item, index))
                ) : singleProduct ? (
                    renderProductCard(singleProduct)
                ) : null}

                {/* Discounts Card */}
                {displayDiscounts.length > 0 && (
                    <View style={styles.discountsCard}>
                        <Text style={styles.sectionTitle}>💰 Discounts & Deals</Text>
                        {displayDiscounts.map((discount, index) => (
                            <View key={index} style={styles.discountRow}>
                                <Text style={styles.discountLabel}>{discount.description}</Text>
                                <Text style={styles.discountValue}>-${discount.amount}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Price Card - Order Summary */}
                {displayTotals && (
                    <View style={styles.priceCard}>
                        <View style={styles.priceGradient}>
                            <View style={styles.priceHeader}>
                                <Text style={styles.priceHeaderText}>Order Summary</Text>
                            </View>

                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Subtotal</Text>
                                <Text style={styles.priceValue}>${displayTotals.subtotal}</Text>
                            </View>

                            {isCart && cartData && (parseFloat(cartData.totals.savings || '0') > 0 || parseFloat(cartData.totals.discount || '0') > 0) && (
                                <View style={styles.priceRow}>
                                    <Text style={[styles.priceLabel, { color: '#10B981' }]}>Savings</Text>
                                    <Text style={[styles.priceValue, { color: '#10B981' }]}>-${cartData.totals.savings || cartData.totals.discount}</Text>
                                </View>
                            )}

                            {isCart && cartData && cartData.totals.delivery && (
                                <View style={styles.priceRow}>
                                    <Text style={styles.priceLabel}>Delivery</Text>
                                    <Text style={[styles.priceValue, cartData.totals.delivery === 'FREE' && { color: '#10B981' }]}>
                                        {cartData.totals.delivery === 'FREE' ? 'FREE' : `$${cartData.totals.delivery}`}
                                    </Text>
                                </View>
                            )}

                            {isCart && cartData && cartData.totals.pickup && (
                                <View style={styles.priceRow}>
                                    <Text style={styles.priceLabel}>Pickup</Text>
                                    <Text style={[styles.priceValue, cartData.totals.pickup === 'FREE' && { color: '#10B981' }]}>
                                        {cartData.totals.pickup === 'FREE' ? 'FREE' : `$${cartData.totals.pickup}`}
                                    </Text>
                                </View>
                            )}

                            {isCart && cartData && cartData.totals.tax && (
                                <View style={styles.priceRow}>
                                    <Text style={styles.priceLabel}>Sales Tax</Text>
                                    <Text style={styles.priceValue}>{cartData.totals.tax === '---' ? '---' : `$${cartData.totals.tax}`}</Text>
                                </View>
                            )}

                            <View style={styles.divider} />

                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total</Text>
                                <Text style={styles.totalValue}>${displayTotals.total}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Selected Options - Only for single product */}
                {!isCart && selectedOptions && Object.keys(selectedOptions).length > 0 && (
                    <View style={styles.optionsCard}>
                        <Text style={styles.sectionTitle}>Selected Options</Text>

                        {selectedOptions.fulfillment && (
                            <View style={styles.optionItem}>
                                <Text style={styles.optionLabel}>📦 Fulfillment</Text>
                                <Text style={styles.optionValue}>{selectedOptions.fulfillment}</Text>
                            </View>
                        )}

                        {selectedOptions.addons && selectedOptions.addons.length > 0 && (
                            <View style={styles.optionItem}>
                                <Text style={styles.optionLabel}>🛡️ Add-ons</Text>
                                <View style={styles.addonsList}>
                                    {selectedOptions.addons.map((addon: string, index: number) => (
                                        <View key={index} style={styles.addonChip}>
                                            <Text style={styles.addonText}>{addon}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {selectedOptions.variants && selectedOptions.variants.length > 0 && (
                            <View style={styles.optionItem}>
                                <Text style={styles.optionLabel}>🎨 Variants</Text>
                                <Text style={styles.optionValue}>{selectedOptions.variants.join(', ')}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Bottom Spacing */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Action Buttons - Fixed at Bottom */}
            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleContinueShopping}
                >
                    <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleCheckout}
                >
                    <Text style={styles.primaryButtonText}>Proceed to Checkout</Text>
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

    // Product Card
    productCard: {
        backgroundColor: '#FFFFFF',
        margin: 16,
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    imageContainer: {
        backgroundColor: '#F9FAFB',
        padding: 20,
        alignItems: 'center',
    },
    productImage: {
        width: '100%',
        height: 280,
    },
    infoContainer: {
        padding: 20,
    },
    brandBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    brandText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
        lineHeight: 30,
    },
    sku: {
        fontSize: 13,
        color: '#9CA3AF',
        marginBottom: 16,
        fontWeight: '500',
    },
    stockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        alignSelf: 'flex-start',
    },
    stockDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    stockText: {
        fontSize: 14,
        fontWeight: '700',
    },

    // Price Card
    priceCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    priceGradient: {
        padding: 20,
    },
    priceHeader: {
        marginBottom: 16,
    },
    priceHeaderText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    priceLabel: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '500',
    },
    priceValue: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
    },
    quantityBadge: {
        backgroundColor: '#F96302',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
    },
    quantityText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
    },
    totalLabel: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    totalValue: {
        fontSize: 28,
        fontWeight: '800',
        color: '#F96302',
    },
    fulfillmentInfo: {
        marginTop: 8,
        marginBottom: 12,
        padding: 10,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#F96302',
    },
    fulfillmentType: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 2,
    },
    fulfillmentDetail: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },

    // Options Card
    optionsCard: {
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
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    optionItem: {
        marginBottom: 16,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
    },
    optionValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    addonsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    addonChip: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    addonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },

    // Specs Card
    specsCard: {
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
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    specLabel: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
        fontWeight: '500',
    },
    specValue: {
        fontSize: 14,
        color: '#111827',
        flex: 1,
        textAlign: 'right',
        fontWeight: '600',
    },

    // Action Buttons
    actionButtons: {
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
    secondaryButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#F96302',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F96302',
    },
    primaryButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#F96302',
        shadowColor: '#F96302',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    button: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Item Price Summary
    itemPriceSummary: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    itemPriceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemPriceLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    itemPriceValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },

    // Discounts Card
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
        alignItems: 'center',
        paddingVertical: 8,
    },
    discountLabel: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
        fontWeight: '500',
    },
    discountValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#10B981',
    },
});

