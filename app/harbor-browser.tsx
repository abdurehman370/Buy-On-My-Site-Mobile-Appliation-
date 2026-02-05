import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

// INLINE INJECTOR CODE
const HARBOR_INJECTOR_CODE = `
console.log('Harbor Injector: v3.0');

const CONFIG = {
    BUTTON_CLASS: 'buy-on-mysite-btn',
    CART_BUTTON_CLASS: 'checkout-on-mysite-btn',
    CART_BUTTON_TEXT: '🛒 Checkout on My Site'
};

function init() {
    setInterval(checkAndInject, 1000);
}

function checkAndInject() {
    const url = location.href.toLowerCase();
    
    // 1. Cart Detection
    // Check URL OR presence of specific cart elements
    const isCartPage = 
        url.includes('cart') || 
        url.includes('checkout') || 
        !!document.querySelector('.cart-items__wrap--q-WVMU') || 
        !!document.querySelector('[class*="cart-items__wrap"]');

    if (isCartPage) {
        injectCartButton();
    }
    
    // 2. Product Detection
    if (url.includes('.html') || document.querySelector('.product-detail-root')) {
        injectProductButtons();
    }
}

function injectCartButton() {
    if (document.getElementById('hf-floating-cart-btn')) return;

    console.log('Harbor Injector: Creating Floating Cart Button');

    const btn = document.createElement('button');
    btn.id = 'hf-floating-cart-btn';
    btn.innerText = '🛒 Checkout on My Site';
    
    // FORCE FLOATING
    btn.style.cssText = \`
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 2147483647;
        background-color: #d61c1c;
        color: white;
        border: 3px solid white;
        border-radius: 50px;
        padding: 15px 25px;
        font-size: 18px;
        font-weight: bold;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        min-width: 200px;
        animation: pulse 2s infinite;
    \`;
    
    const style = document.createElement('style');
    style.innerHTML = \`@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }\`;
    document.head.appendChild(style);

    btn.onclick = async (e) => {
        e.preventDefault(); e.stopPropagation();
        btn.innerText = 'Extracting...';
        btn.style.backgroundColor = '#333';
        
        try {
            await new Promise(r => setTimeout(r, 200));
            const data = await extractCart();
            
            console.log('Extracted Data payload:', data);
            
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CART_DATA', payload: data }));
            } else {
                alert('Extracted: ' + data.items.length + ' items');
            }
        } catch (err) {
            console.error(err);
             if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: err.message }));
            }
        } finally {
            btn.innerText = '🛒 Checkout on My Site';
            btn.style.backgroundColor = '#d61c1c';
        }
    };

    document.body.appendChild(btn);
}

function injectProductButtons() {
    const anchors = Array.from(document.querySelectorAll('.productActionButton, .add-to-cart, button'));
    anchors.forEach(anchor => {
        const text = (anchor.innerText || '').toLowerCase();
        if ((!text.includes('add to cart') && !text.includes('add to order')) || anchor.closest('.buy-on-mysite-btn')) return;
        const next = anchor.nextElementSibling;
        if (next && next.classList.contains('buy-on-mysite-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'buy-on-mysite-btn';
        btn.innerText = 'Buy from My Site';
        btn.style.cssText = \`width: 100%; margin-top: 10px; padding: 12px; background: #d61c1c; color: white; font-size: 16px; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; display: block;\`;
        btn.onclick = async (e) => {
            e.preventDefault(); e.stopPropagation();
            btn.innerText = 'Processing...';
            try {
                const data = await extractProduct();
                if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PRODUCT_DATA', payload: data }));
            } catch(err) { console.error(err); } 
            finally { btn.innerText = 'Buy from My Site'; }
        };
        if(anchor.parentNode) anchor.after(btn);
    });
}

// --- EXTRACTION ---

async function extractCart() {
    const items = [];
    
    // Select all <li> items inside the wrapper
    // User HTML: <div class="cart-items__wrap--q-WVMU"><ul><li class="cart-items__item--jG-6K2">
    // We use flexible selectors
    const itemEls = document.querySelectorAll('li[class*="cart-items__item"], .cart-items__item--jG-6K2');
    
    console.log('Found ' + itemEls.length + ' cart items elements');

    itemEls.forEach((el, index) => {
        try {
            // Title: h3 > a
            const titleLink = el.querySelector('h3 a');
            // Brand: strong class="cart-items__brand..."
            const brandEl = el.querySelector('[class*="cart-items__brand"]');
            
            const title = titleLink ? titleLink.innerText.trim() : 'Unknown Item ' + (index + 1);
            const brand = brandEl ? brandEl.innerText.trim() : '';

            // Price: <span ... class="styled-price__styledPrice--Lhb-uR">
            let unitPrice = '0.00';
            const priceEl = el.querySelector('[class*="styled-price__styledPrice"]');
            if (priceEl) {
                // Text is like "$17.99"
                const m = priceEl.innerText.match(/\\$?(\\d+[\\d,]*\\.?\\d*)/);
                if(m) unitPrice = m[1].replace(/,/g, '');
            }

            // Quantity: <select ...><option value="1">1</option>...
            let quantity = 1;
            const select = el.querySelector('select');
            if (select) {
                quantity = parseInt(select.value || '1');
            } else {
                // Fallback (just in case HTML changed)
                const inp = el.querySelector('input[type="number"]');
                if(inp) quantity = parseInt(inp.value || '1');
            }

            // Image: <img src="...">
            let image = '';
            const img = el.querySelector('img');
            if(img) image = img.src;

            // SKU: href="/...-70057.html"
            let sku = 'SKU-UNKNOWN-' + index;
            const link = el.querySelector('a[href*=".html"]');
            if (link) {
                const href = link.getAttribute('href');
                const m = href.match(/-(\\d+)\\.html/);
                if(m) sku = m[1];
            } else {
                // Fallback: try to find it in image src
                if (image) {
                     // .../70057_W3.jpg
                     const m = image.match(/\\/(\\d+)_/);
                     if(m) sku = m[1];
                }
            }

            items.push({
                sku, title, image, unitPrice, quantity, brand,
                subtotal: (parseFloat(unitPrice) * quantity).toFixed(2),
                selectedOptions: {}
            });
        } catch(e) {
            console.error('Error extracting item ' + index, e);
        }
    });

    return {
        items,
        totals: extractCartTotals(),
        cartUrl: location.href
    };
}

function extractCartTotals() {
    const totals = { subtotal:'0.00', tax:'0.00', shipping:'0.00', total:'0.00', discount: '0.00' };
    
    // Look for both the line items and the grand total lines
    const rows = document.querySelectorAll('li[class*="checkout-totals__line"], li[class*="checkout-totals__grandTotal"]');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        const priceEl = row.querySelector('[class*="styled-price__styledPrice"]');
        if (!priceEl) return;
        
        const m = priceEl.innerText.match(/\\$?(\\d+[\\d,]*\\.?\\d*)/);
        if(!m) return;
        const val = m[1].replace(/,/g, '');

        if(text.includes('subtotal')) totals.subtotal = val;
        else if(text.includes('tax')) totals.tax = val;
        else if(text.includes('shipping')) totals.shipping = val;
        else if(text.includes('total') && !text.includes('sub')) totals.total = val;
        else if(text.includes('save') || text.includes('discount')) totals.discount = val;
    });
    
    // Fallback if totals are 0 (sometimes distinct DOM structure)
    if (totals.total === '0.00') {
         const grandTotal = document.querySelector('[class*="checkout-totals__grandTotal"] [class*="styled-price__styledPrice"]');
         if(grandTotal) {
             const m = grandTotal.innerText.match(/\\$?(\\d+[\\d,]*\\.?\\d*)/);
             if(m) totals.total = m[1].replace(/,/g, '');
         }
    }

    return totals;
}

async function extractProduct() {
     return {
        sku: location.href.match(/-(\\d+)\\.html/)?.[1] || '',
        title: document.title,
        price: '0.00',
        image: '',
        url: location.href
     };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
`;

export default function HarborBrowser() {
    const router = useRouter();
    const webviewRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('Harbor WebView Message:', data.type);

            if (data.type === 'CART_DATA') {
                console.log('Sending to checkout:', data.payload);
                router.push({
                    pathname: '/checkout',
                    params: {
                        data: JSON.stringify(data.payload),
                        source: 'harbor_freight'
                    }
                });
            } else if (data.type === 'PRODUCT_DATA') {
                router.push({
                    pathname: '/import',
                    params: { data: JSON.stringify(data.payload), source: 'harbor_freight' }
                });
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: "Harbor Freight", headerBackTitle: 'Back' }} />

            <WebView
                ref={webviewRef}
                source={{ uri: 'https://www.harborfreight.com/' }}
                style={styles.webview}
                injectedJavaScript={HARBOR_INJECTOR_CODE}
                onMessage={handleMessage}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                // Use Standard Android UA
                userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                originWhitelist={['*']}
                sharedCookiesEnabled={true}
                domStorageEnabled={true}
                javaScriptEnabled={true}
                // Important for complex sites
                mixedContentMode="always"
                allowsInlineMediaPlayback={true}
            />

            {loading && (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#d61c1c" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    webview: { flex: 1 },
    loading: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
    }
});
