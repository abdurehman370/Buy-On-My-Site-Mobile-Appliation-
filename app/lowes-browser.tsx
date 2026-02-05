import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

// INLINE INJECTOR CODE - Same pattern as Harbor Freight
const LOWES_INJECTOR_CODE = `
console.log('Lowes Injector: v2.0 Inline');

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
    const isCartPage = 
        url.includes('cart') || 
        url.includes('mycart') ||
        !!document.querySelector('[data-test="cc-product-details"]');

    if (isCartPage) {
        injectCartButton();
    }
    
    // 2. Product Detection
    if (url.includes('/pd/')) {
        injectProductButtons();
    }
}

function injectCartButton() {
    // Simple ID check like Harbor Freight
    if (document.getElementById('lowes-floating-cart-btn')) return;

    console.log('Lowes Injector: Creating Floating Cart Button');

    const btn = document.createElement('button');
    btn.id = 'lowes-floating-cart-btn';
    btn.innerText = '🛒 Checkout on My Site';
    
    // FORCE FLOATING - Same as Harbor Freight
    btn.style.cssText = \`
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 2147483647;
        background: linear-gradient(135deg, #004990 0%, #003366 100%);
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
        btn.style.background = '#333';
        
        try {
            await new Promise(r => setTimeout(r, 200));
            const data = await extractCart();
            
            console.log('Extracted Lowes Cart:', data);
            
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
            btn.style.background = 'linear-gradient(135deg, #004990 0%, #003366 100%)';
        }
    };

    document.body.appendChild(btn);
}

function injectProductButtons() {
    const anchors = Array.from(document.querySelectorAll('button'));
    anchors.forEach(anchor => {
        const text = (anchor.innerText || '').toLowerCase();
        if (!text.includes('add to cart') || anchor.closest('.buy-on-mysite-btn')) return;
        const next = anchor.nextElementSibling;
        if (next && next.classList.contains('buy-on-mysite-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'buy-on-mysite-btn';
        btn.innerText = 'Buy from My Site';
        btn.style.cssText = \`width: 100%; margin-top: 10px; padding: 12px; background: #004990; color: white; font-size: 16px; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; display: block;\`;
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
    
    // Based on user HTML: [data-test="cc-product-details"]
    const itemEls = document.querySelectorAll('[data-test="cc-product-details"]');
    
    console.log('Found ' + itemEls.length + ' Lowes cart items');

    itemEls.forEach((el, index) => {
        try {
            // SKU - Item #
            let sku = '';
            const itemNumEl = el.querySelector('[data-selector="art-sc-itemNum"]');
            if (itemNumEl) {
                sku = itemNumEl.innerText.replace('Item #', '').replace('Item#', '').trim();
            }

            // Model Number
            let modelNum = '';
            const modelNumEl = el.querySelector('[data-selector="art-sc-modelNum"]');
            if (modelNumEl) {
                modelNum = modelNumEl.innerText.replace('Model #', '').replace('Model#', '').trim();
            }

            // Title - Full product description
            const titleEl = el.querySelector('[data-selector="art-sc-prodDesc"]');
            const title = titleEl ? titleEl.innerText.trim() : 'Unknown Product';
            
            // Brand - Bold text in title
            const brandEl = titleEl ? titleEl.querySelector('b') : null;
            const brand = brandEl ? brandEl.innerText.trim() : '';
            
            // Image - Look in parent row
            let image = '';
            let row = el.closest('[class*="GridRow"]') || el.closest('.row') || el.parentElement;
            if (row) {
                const imgEl = row.querySelector('[data-selector="art-sc-productImg"] img, img');
                if (imgEl) image = imgEl.src;
            }
            
            // Quantity
            let quantity = 1;
            const qtyInput = el.querySelector('[data-selector="art-sc-quantity-input"]');
            if (qtyInput) {
                quantity = parseInt(qtyInput.value || qtyInput.getAttribute('value') || '1');
            }
            
            // Price - Find UNIT price (with /ea), not line total
            let unitPrice = '0.00';
            
            // Strategy: Look for price elements with /ea or /each suffix (unit price)
            // vs elements without suffix (line total)
            let priceContainer = null;
            let unitPriceContainer = null;
            
            const parentRow = el.closest('[class*="GridRow"]') || el.closest('.row') || el.parentElement;
            
            if (parentRow) {
                // Find ALL price-like elements
                const allPriceElements = parentRow.querySelectorAll(
                    '[data-selector="art-sc-itemPrice-now"], [data-test="cc-product-price"], ' +
                    '[class*="item-price"], [class*="price"], div[data-selector="undefined"]'
                );
                
                // Prioritize elements containing /ea or /each (unit price)
                for (const el of allPriceElements) {
                    const text = el.textContent || el.innerText || '';
                    if (text.includes('/ea') || text.includes('/each')) {
                        unitPriceContainer = el;
                        console.log('Found UNIT price element (with /ea)');
                        break;
                    } else if (text.match(/\\$?\\d+\\.\\d{2}/) && !priceContainer) {
                        // Fallback: any price element
                        priceContainer = el;
                    }
                }
            }
            
            // Use unit price if found, otherwise use any price
            priceContainer = unitPriceContainer || priceContainer;
            
            // Fallback: Search in the entire item container
            if (!priceContainer) {
                const itemContainer = el.closest('[class*="containers"]') || el.closest('[id]');
                if (itemContainer) {
                    const allPrices = itemContainer.querySelectorAll(
                        '[data-selector="art-sc-itemPrice-now"], [data-test="cc-product-price"], ' +
                        'div[data-selector="undefined"]'
                    );
                    
                    for (const el of allPrices) {
                        const text = el.textContent || '';
                        if (text.includes('/ea') || text.includes('/each')) {
                            priceContainer = el;
                            break;
                        }
                    }
                }
            }
            
            if (priceContainer) {
                console.log('Found price container:', priceContainer.className);
                
                // Get all text content
                const fullText = priceContainer.textContent || priceContainer.innerText || '';
                console.log('Price text:', fullText);
                
                // Remove /ea, /each, whitespace, and dollar signs
                const cleanText = fullText.replace(/\\/ea|each/gi, '').replace(/\\s+/g, '').replace(/\\$/g, '');
                
                // Try to match price pattern (e.g., "9.98")
                const match = cleanText.match(/(\\d+)(\\.\\d{2})/);
                if (match) {
                    unitPrice = match[1] + match[2];
                    console.log('Extracted price via regex:', unitPrice);
                } else {
                    // Fallback: Find dollar and cents separately
                    const spans = priceContainer.querySelectorAll('span');
                    let dollars = '';
                    let cents = '';
                    
                    spans.forEach(span => {
                        const text = span.innerText.trim();
                        // Skip /ea or /each
                        if (text.includes('/')) return;
                        
                        if (/^\\d+$/.test(text) && !dollars) {
                            dollars = text;
                        }
                    });
                    
                    const centsSup = priceContainer.querySelector('sup.cent');
                    if (centsSup) {
                        cents = centsSup.innerText.trim();
                    }
                    
                    if (dollars && cents) {
                        unitPrice = dollars + cents;
                        console.log('Extracted price via spans:', unitPrice);
                    } else if (dollars) {
                        unitPrice = dollars + '.00';
                        console.log('Extracted price (dollars only):', unitPrice);
                    }
                }
            } else {
                console.log('Price container not found for item:', title);
            }

            items.push({
                sku,
                modelNum,
                title,
                image,
                unitPrice,
                quantity,
                brand,
                subtotal: (parseFloat(unitPrice) * quantity).toFixed(2),
                selectedOptions: {}
            });
        } catch(e) {
            console.error('Error extracting Lowes item ' + index, e);
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
    
    console.log('Extracting cart totals...');
    
    // First, try to find the cart summary/order summary container
    let summaryContainer = document.querySelector('[class*="order-summary"], [class*="cart-summary"], [class*="OrderSummary"], [class*="CartSummary"]');
    
    // Fallback: Look for any container with "summary" in the class
    if (!summaryContainer) {
        const allDivs = document.querySelectorAll('div[class*="ummary"], div[class*="total"]');
        for (const div of allDivs) {
            const text = div.innerText || '';
            if (text.includes('Subtotal') || text.includes('Estimated Total')) {
                summaryContainer = div;
                break;
            }
        }
    }
    
    console.log('Summary container found:', !!summaryContainer);
    
    if (summaryContainer) {
        // Search within the summary container only
        const getText = (selector) => {
            const el = summaryContainer.querySelector(selector);
            if (el) {
                const text = el.innerText || el.textContent || '';
                console.log('Found', selector, ':', text);
                const match = text.replace(/,/g, '').match(/\\$?(\\d+\\.\\d{2})/);
                if (match) return match[1];
            }
            return null;
        };
        
        // Try Lowe's data-selector attributes
        totals.subtotal = getText('[data-selector="art-sc-subtotal"]') || totals.subtotal;
        totals.total = getText('[data-selector="art-sc-estimatedTotal"]') || totals.total;
        totals.tax = getText('[data-selector="art-sc-tax"]') || totals.tax;
        totals.shipping = getText('[data-selector="art-sc-shipping"]') || totals.shipping;
        totals.discount = getText('[data-selector="art-sc-savings"]') || totals.discount;
        
        // Fallback: Search text within summary container
        if (totals.total === '0.00') {
            const summaryText = summaryContainer.innerText || summaryContainer.textContent || '';
            console.log('Searching in summary text...');
            
            // Match "Subtotal" followed by price
            const subtotalMatch = summaryText.match(/Subtotal[:\\s]*\\$?([\\d,]+\\.\\d{2})/i);
            if (subtotalMatch) {
                totals.subtotal = subtotalMatch[1].replace(/,/g, '');
                console.log('Found subtotal:', totals.subtotal);
            }
            
            // Match "Estimated Total" or "Total" (but not "Subtotal")
            const totalMatch = summaryText.match(/(?:Estimated\\s+)?Total(?!.*Subtotal)[:\\s]*\\$?([\\d,]+\\.\\d{2})/i);
            if (totalMatch) {
                totals.total = totalMatch[1].replace(/,/g, '');
                console.log('Found total:', totals.total);
            }
            
            // Match "Tax"
            const taxMatch = summaryText.match(/(?:Sales\\s+)?Tax[:\\s]*\\$?([\\d,]+\\.\\d{2})/i);
            if (taxMatch) {
                totals.tax = taxMatch[1].replace(/,/g, '');
                console.log('Found tax:', totals.tax);
            }
        }
    }
    
    // Always calculate subtotal from items if it's still 0.00
    if (totals.subtotal === '0.00') {
        console.log('Calculating subtotal from items...');
        const items = document.querySelectorAll('[data-test="cc-product-details"]');
        let calculatedSubtotal = 0;
        
        items.forEach(item => {
            // Find price with /ea
            const parentRow = item.closest('[class*="GridRow"]') || item.closest('.row');
            if (parentRow) {
                const allPrices = parentRow.querySelectorAll('[class*="price"], div[data-selector="undefined"]');
                let unitPrice = 0;
                
                for (const priceEl of allPrices) {
                    const text = priceEl.textContent || '';
                    if (text.includes('/ea') || text.includes('/each')) {
                        const match = text.match(/(\\d+)(\\.\\d{2})/);
                        if (match) {
                            unitPrice = parseFloat(match[1] + match[2]);
                            break;
                        }
                    }
                }
                
                const qtyInput = item.querySelector('[data-selector="art-sc-quantity-input"]');
                const qty = qtyInput ? parseInt(qtyInput.value || '1') : 1;
                
                if (unitPrice > 0) {
                    calculatedSubtotal += unitPrice * qty;
                }
            }
        });
        
        if (calculatedSubtotal > 0) {
            totals.subtotal = calculatedSubtotal.toFixed(2);
            console.log('Calculated subtotal from items:', totals.subtotal);
            
            // If total is also 0, set it to subtotal
            if (totals.total === '0.00') {
                totals.total = totals.subtotal;
            }
        }
    }
    
    console.log('Final extracted totals:', totals);
    return totals;
}

async function extractProduct() {
     return {
        sku: location.href.match(/\\/(\\d+)$/)?.[1] || '',
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

export default function LowesBrowser() {
    const router = useRouter();
    const webviewRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('Lowes WebView Message:', data.type);

            switch (data.type) {
                case 'PRODUCT_DATA':
                    console.log('Extracted Lowes Product:', data.payload);
                    router.push({
                        pathname: '/import',
                        params: {
                            data: JSON.stringify(data.payload),
                            source: 'lowes'
                        }
                    });
                    break;

                case 'CART_DATA':
                    console.log('Extracted Lowes Cart:', data.payload);
                    router.push({
                        pathname: '/checkout',
                        params: {
                            data: JSON.stringify(data.payload),
                            source: 'lowes'
                        }
                    });
                    break;

                case 'ERROR':
                    console.error('Lowes WebView Error:', data.message);
                    break;
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                title: "Lowe's Browser",
                headerBackTitle: 'Back'
            }} />

            <WebView
                ref={webviewRef}
                source={{ uri: 'https://www.lowes.com' }}
                style={styles.webview}
                injectedJavaScript={LOWES_INJECTOR_CODE}
                onMessage={handleMessage}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}

                // Use Android Chrome UA
                userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

                // Anti-bot settings
                originWhitelist={['*']}
                sharedCookiesEnabled={true}
                domStorageEnabled={true}
                javaScriptEnabled={true}
                thirdPartyCookiesEnabled={true}
                cacheEnabled={true}
                mixedContentMode="always"
                allowsInlineMediaPlayback={true}
            />

            {loading && (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#004990" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    webview: {
        flex: 1,
    },
    loading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
    }
});
