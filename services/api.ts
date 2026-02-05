import { Platform } from 'react-native';

const BACKEND_URL = 'https://api.yourwebsite.com/products/import-from-url';

export interface Product {
    sku: string;
    title: string;
    brand: string;
    price: string;
    image: string;
    checkoutUrl: string;
}

export interface ApiError {
    message: string;
    code?: string;
}

export const importProduct = async (url: string): Promise<Product> => {
    try {
        console.log('Importing product from:', url);
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        return data as Product;
    } catch (error: any) {
        console.error('API Error:', error);
        throw error;
    }
};
