// Cart-related TypeScript interfaces

export interface CartItem {
    sku: string;
    title: string;
    brand: string;
    image: string;
    unitPrice: string;
    originalPrice?: string; // e.g. "19.99"
    savings?: string; // e.g. "Save 20%"
    quantity: number;
    subtotal: string;
    selectedOptions?: {
        fulfillment?: string;
        pickupLocation?: string;
        pickupETA?: string;
        pickupStock?: string;
        deliveryZip?: string;
        addons?: string[];
        variants?: string[];
    };
    itemDiscounts?: Discount[];
}

export interface Discount {
    type: 'promo' | 'bulk' | 'item' | 'cart';
    code?: string;
    description: string;
    amount: string;
}

export interface CartTotals {
    subtotal: string;
    tax: string;
    shipping: string;
    discount: string;
    savings?: string;
    delivery?: string;
    pickup?: string;
    total: string;
}

export interface CartData {
    items: CartItem[];
    discounts: Discount[];
    totals: CartTotals;
    cartUrl?: string;
}

export interface ProductData {
    sku: string;
    title: string;
    brand: string;
    price: string;
    image: string;
    images?: string[];
    description?: string;
    url: string;
    quantity: string;
    stockStatus: string;
    selectedOptions?: {
        fulfillment?: string;
        addons?: string[];
        variants?: string[];
    };
    specifications?: Record<string, any>;
}

export type CheckoutData = CartData | ProductData;

export function isCartData(data: any): data is CartData {
    return data && Array.isArray(data.items) && data.totals !== undefined;
}

export function isProductData(data: any): data is ProductData {
    return data && typeof data.sku === 'string' && data.price !== undefined && !Array.isArray(data.items);
}
