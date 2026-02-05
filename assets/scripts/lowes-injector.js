const INJECTED_CODE = `
const CONFIG = {
    BUTTON_CLASS: 'buy-on-mysite-btn',
    BUTTON_TEXT: 'Buy from My Site',
    CART_BUTTON_CLASS: 'checkout-on-mysite-btn',
    CART_BUTTON_TEXT: '🛒 Checkout on My Site'
};

/* ---------------- INIT ---------------- */

function init() {
    const isProductPage = location.pathname.includes('/pd/');
    const isCartPage = location.pathname.includes('/cart') || location.pathname.includes('/mycart');
    
    if (!isProductPage && !isCartPage) return;
    
    observe();
    
    if (isProductPage) {
        injectProductButtons();
    } else if (isCartPage) {
        injectCartButton();
    }
}

function observe() {
    // Check periodically for changes
    setInterval(() => {
        if (location.pathname.includes('/pd/')) {
            injectProductButtons();
        } else if (location.pathname.includes('/cart') || location.pathname.includes('/mycart')) {
            injectCartButton();
        }
    }, 1000);
}

/* ---------------- UI ---------------- */

function injectProductButtons() {
    // 1. Find all potential anchors
    const specificSelectors = [
        '[data-testid="add-to-cart-button"]',
        '[data-selector="add-to-cart"]',
        '.add-to-cart',
        'button.add-to-cart'
    ];
    
    let anchors = [];
    specificSelectors.forEach(sel => {
        anchors.push(...document.querySelectorAll(sel));
    });

    // 2. Heuristic: Find other buttons with "Add to Cart" text
    if (anchors.length === 0) {
        const buttons = [...document.querySelectorAll('button')];
        const heuristicAnchors = buttons.filter(b => 
            /add to cart|add to delivery|checkout/i.test(b.innerText) && 
            b.offsetParent !== null && // Visible
            !b.classList.contains(CONFIG.BUTTON_CLASS) // Not our own button
        );
        anchors.push(...heuristicAnchors);
    }

    // Deduplicate anchors
    anchors = [...new Set(anchors)];

    anchors.forEach(anchor => {
        // Check if we already injected a button after this anchor
        const nextSibling = anchor.nextElementSibling;
        if (nextSibling && nextSibling.classList.contains(CONFIG.BUTTON_CLASS)) {
            return;
        }

        // Create Button
        const btn = document.createElement('button');
        btn.className = CONFIG.BUTTON_CLASS;
        btn.innerText = CONFIG.BUTTON_TEXT;
        
        // Style: Block level, below the anchor
        // Inner backticks escaped
        btn.style.cssText = \`
            width: 100%;
            margin-top: 10px;
            padding: 12px;
            background: #004990; /* Lowe's Blue */
            color: #fff;
            font-size: 16px;
            font-weight: bold;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            z-index: 999;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            display: block;
        \`;

        btn.onclick = handleProductClick;
        
        // Insert
        if(anchor.parentNode) {
             anchor.after(btn);
        }
    });
}

function injectCartButton() {
    // Check if button already exists
    if (document.querySelector('.checkout-on-mysite-btn')) {
        return;
    }

    // Find checkout button or container to place our button next to
    const checkoutSelectors = [
        '[data-selector="art-sc-emailCartBtn"]', // From user snippet
        '.cart-summary',
        '.order-summary'
    ];
    
    let anchor = null;

    // Try to find a good anchor
    for (const selector of checkoutSelectors) {
         const el = document.querySelector(selector);
         if (el) {
             // Try to find its parent container if it's a button
             if (el.tagName === 'A' || el.tagName === 'BUTTON') { 
                 anchor = el.parentElement; 
                 break;
             } else {
                 anchor = el;
                 break;
             }
         }
    }

    // Fallback: Fixed position at bottom
    // Inner backticks escaped
    let buttonStyle = \`
        position: fixed;
        bottom: 80px; 
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 400px;
        padding: 16px;
        background: linear-gradient(135deg, #004990 0%, #003366 100%);
        color: #fff;
        font-size: 18px;
        font-weight: bold;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        z-index: 99999;
        box-shadow: 0 10px 25px rgba(0, 73, 144, 0.5);
        text-align: center;
        animation: slideUp 0.5s ease-out;
    \`;

    // Create Button
    const btn = document.createElement('button');
    btn.className = CONFIG.CART_BUTTON_CLASS;
    btn.innerText = CONFIG.CART_BUTTON_TEXT;
    btn.style.cssText = buttonStyle;

    // Add animation
    if (!document.getElementById('mysite-animations')) {
        const style = document.createElement('style');
        style.id = 'mysite-animations';
        // Inner backticks escaped
        style.innerHTML = \`
            @keyframes slideUp {
                from { bottom: -100px; opacity: 0; }
                to { bottom: 80px; opacity: 1; }
            }
        \`;
        document.head.appendChild(style);
    }
    
    // Append directly to body for fixed positioning primarily
    document.body.appendChild(btn);

    // Add hover effect
    btn.onmouseenter = () => {
        btn.style.transform = 'translateX(-50%) translateY(-2px) scale(1.02)';
        btn.style.boxShadow = '0 6px 16px rgba(0, 73, 144, 0.6)';
    };
    
    btn.onmouseleave = () => {
        btn.style.transform = 'translateX(-50%)';
        btn.style.boxShadow = '0 4px 12px rgba(0, 73, 144, 0.4)';
    };

    btn.onclick = handleCartClick;
}


/* ---------------- CLICK ---------------- */

async function handleProductClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.target;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Processing…';

    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const data = await extractProduct();
        
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PRODUCT_DATA',
                payload: data
            }));
        } else {
            console.warn('ReactNativeWebView is not available');
        }
    } catch (err) {
        console.error('Extraction error:', err);
        if (window.ReactNativeWebView) {
             window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ERROR',
                message: err.message
            }));
        }
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

async function handleCartClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.target;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Extracting Cart…';

    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const data = await extractCart();
        
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'CART_DATA',
                payload: data
            }));
        } else {
            console.warn('ReactNativeWebView is not available');
        }
    } catch (err) {
        console.error('Cart extraction error:', err);
        if (window.ReactNativeWebView) {
             window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ERROR',
                message: err.message
            }));
        }
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

/* ---------------- CORE EXTRACTION ---------------- */


async function extractProduct() {
    // Placeholder - need selectors from PDP
    const sku = extractSKU();

    return {
        sku,
        title: extractTitle(),
        brand: extractBrand(),
        price: extractPrice(sku),
        image: extractMainImage(),
        images: extractImages(),
        description: extractDescription(),
        url: canonicalURL(),
        quantity: extractQuantity(),
        stockStatus: extractStock(),
    };
}

async function extractCart() {
    console.log('Extracting cart data...');
    
    const items = [];
    const discounts = [];
    
    // Find all cart items - Based on user HTML
    const cartItems = Array.from(document.querySelectorAll('[data-test="cc-product-details"]'));
        
    console.log('Found', cartItems.length, 'cart items');
    
    // Extract each item
    for (const itemEl of cartItems) {
        try {
            const item = extractCartItem(itemEl);
            if (item) {
                // Check if item with same SKU is already added
                const existing = items.find(i => i.sku === item.sku && i.sku !== '');
                if (!existing) {
                    items.push(item);
                }
            }
        } catch (e) {
            console.error('Error extracting cart item:', e);
        }
    }
    
    // Extract totals
    const totals = extractCartTotals();
    
    return {
        items,
        discounts,
        totals,
        cartUrl: location.href
    };
}

function extractCartItem(itemEl) {
    // Extract SKU
    let sku = '';
    const itemNumEl = itemEl.querySelector('[data-selector="art-sc-itemNum"]');
    if (itemNumEl) {
        sku = itemNumEl.innerText.replace('Item #', '').trim();
    } else {
        const modelNumEl = itemEl.querySelector('[data-selector="art-sc-modelNum"]');
        if (modelNumEl) sku = modelNumEl.innerText.replace('Model #', '').trim();
    }

    // Extract title
    const titleEl = itemEl.querySelector('[data-selector="art-sc-prodDesc"]');
    const title = titleEl ? titleEl.innerText.trim() : 'Unknown Product';
    
    const brandEl = titleEl ? titleEl.querySelector('b') : null;
    const brand = brandEl ? brandEl.innerText.trim() : '';
    
    let image = '';
    let row = itemEl.closest('[class*="GridRow"]'); 
    if (!row) row = itemEl.closest('.row');
    
    if (row) {
        const imgEl = row.querySelector('[data-selector="art-sc-productImg"] img');
        if (imgEl) image = imgEl.src;
    }
    
    // Extract quantity
    let quantity = 1;
    const qtyInput = itemEl.querySelector('[data-selector="art-sc-quantity-input"]');
    if (qtyInput) {
        quantity = parseInt(qtyInput.value || qtyInput.getAttribute('value') || '1');
    }
    
    // Extract Pricing
    let unitPrice = '0.00';
    let subtotal = '0.00';
    let originalPrice = '0.00';
    let savings = '0.00';

    const priceEl = itemEl.querySelector('[data-selector="art-sc-itemPrice-now"]');
    if (priceEl) {
        const text = priceEl.innerText.trim();
        // Doubled backslashes for regex string inside template literal
        const match = text.match(/\$?(\d+[\d,]*\.?\d*)/); 
        if (match) {
            unitPrice = match[1].replace(/,/g, '');
        }
    }
    
    const wasPriceEl = itemEl.querySelector('[data-selector="art-sc-wasPriced-txt"]');
    if (wasPriceEl) {
        const text = wasPriceEl.innerText.trim();
        const match = text.match(/\$?(\d+[\d,]*\.?\d*)/);
        if (match) {
            originalPrice = match[1].replace(/,/g, '');
        }
    }
    
    const savingsEl = itemEl.querySelector('[data-selector="art-sc-priceSavings"]');
    if (savingsEl) {
        const text = savingsEl.innerText.trim();
        const match = text.match(/\$?(\d+[\d,]*\.?\d*)/);
        if (match) {
            savings = match[1].replace(/,/g, '');
        }
    }

    if (unitPrice !== '0.00') {
        subtotal = (parseFloat(unitPrice) * quantity).toFixed(2);
    }

    return {
        sku,
        title,
        brand,
        image,
        unitPrice,
        originalPrice,
        savings,
        quantity,
        subtotal,
        selectedOptions: {} 
    };
}

function extractCartTotals() {
    const totals = {
        subtotal: '0.00',
        tax: '0.00',
        shipping: '0.00',
        pickup: '0.00',
        discount: '0.00',
        savings: '0.00',
        total: '0.00'
    };
    
    const getPrice = (selector) => {
        const el = document.querySelector(selector);
        if (el) {
             const text = el.innerText || el.textContent;
             const match = text.replace(/,/g, '').match(/\$?(\d+\.?\d*)/);
             if (match) return match[1];
        }
        return '0.00';
    };

    totals.subtotal = getPrice('[data-selector="art-sc-subtotal"], .subtotal, [class*="subTotal"]');
    totals.total = getPrice('[data-selector="art-sc-estimatedTotal"], .estimated-total, [class*="estimatedTotal"]');
    totals.tax = getPrice('[data-selector="art-sc-tax"], .tax, [class*="tax"]');
    totals.shipping = getPrice('[data-selector="art-sc-shipping"], .shipping, [class*="shipping"]');
    
    return totals;
}

/* ---------------- HELPERS ---------------- */

function canonicalURL() {
    return document.querySelector('link[rel="canonical"]')?.href || location.href;
}

function extractSKU() {
    const match = location.href.match(/\/(\d+)$/);
    if (match) return match[1];
    return document.querySelector('meta[itemprop="sku"]')?.content || '';
}

function extractTitle() {
    return document.querySelector('h1')?.innerText.trim() || document.title;
}

function extractBrand() {
    return document.querySelector('[itemprop="brand"]')?.innerText.trim() || '';
}

function extractPrice(sku) {
    const priceEl = document.querySelector('.main-price, .price');
    if (priceEl) {
        const match = priceEl.innerText.match(/\$?(\d+[\d,]*\.?\d*)/);
        if (match) return match[1].replace(/,/g, '');
    }
    return '0.00';
}

function extractQuantity() {
    return '1';
}

function extractMainImage() {
    return (
        document.querySelector('meta[property="og:image"]')?.content ||
        document.querySelector('img.main-image')?.src ||
        ''
    );
}

function extractImages() {
    return [];
}

function extractDescription() {
    return (
        document.querySelector('meta[name="description"]')?.content ||
        ''
    );
}

function extractStock() {
    return 'In Stock';
}


if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
`;

module.exports = INJECTED_CODE;
