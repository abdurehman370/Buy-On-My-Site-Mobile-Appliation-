import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const INJECTED_JAVASCRIPT = `
const CONFIG = {
    BUTTON_CLASS: 'buy-on-mysite-btn',
    BUTTON_TEXT: 'Buy from My Site',
    CART_BUTTON_CLASS: 'checkout-on-mysite-btn',
    CART_BUTTON_TEXT: '🛒 Checkout on My Site'
};

/* ---------------- INIT ---------------- */

function init() {
    const isProductPage = location.pathname.includes('/p/');
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
        if (location.pathname.includes('/p/')) {
            injectProductButtons();
        } else if (location.pathname.includes('/cart') || location.pathname.includes('/mycart')) {
            injectCartButton();
        }
    }, 500);
}

/* ---------------- UI ---------------- */

function injectProductButtons() {
    // 1. Find all potential anchors
    const specificSelectors = [
        '[data-testid="add-to-cart-button"]',
        '[data-testid="fulfillment-add-to-cart-button"]',
        '.sticky-header__add-to-cart',
        '.buying-actions__add-to-cart'
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
        btn.style.cssText = \`
            width: 100%;
            margin-top: 10px;
            padding: 12px;
            background: #f96302;
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

    // Removed Floating Button Fallback as requested
}

function injectCartButton() {
    // Check if button already exists
    if (document.querySelector('.checkout-on-mysite-btn')) {
        return;
    }

    // Find checkout button or container to place our button next to
    const checkoutSelectors = [
        '[data-testid="checkout-button"]', 
        'button[data-automation-id="checkout-button"]', 
        '.checkout-button', 
        '.cart-summary', 
        '.order-summary'
    ];
    
    // Also try to find the container of the checkout button for better placement
    const checkoutContainerSelectors = [
         '.cart-actions',
         '[class*="cart-actions"]',
         '.checkout-actions'
    ];

    let anchor = null;
    let fallbackAnchor = null;

    // Try to find the checkout button itself
    for (const selector of checkoutSelectors) {
         const el = document.querySelector(selector);
         if (el) {
             fallbackAnchor = el;
             // Try to find its parent container if it's a button
             if (el.tagName === 'BUTTON' && el.parentElement) {
                 anchor = el.parentElement; 
                 break;
             }
         }
    }

    if (!anchor) anchor = fallbackAnchor;

    // Fallback: Find any button with "checkout" text if specific selectors fail
    if (!anchor) {
        const buttons = [...document.querySelectorAll('button')];
        const checkoutBtn = buttons.find(b => /checkout/i.test(b.innerText));
        if (checkoutBtn && checkoutBtn.parentElement) {
            anchor = checkoutBtn.parentElement;
        } else {
             anchor = checkoutBtn;
        }
    }

    // Create Button
    const btn = document.createElement('button');
    btn.className = CONFIG.CART_BUTTON_CLASS;
    btn.innerText = CONFIG.CART_BUTTON_TEXT;
    
    // Default Style: Prominent checkout button (relative positioning)
    let buttonStyle = \`
        width: 100%;
        margin-top: 12px;
        padding: 16px;
        background: linear-gradient(135deg, #f96302 0%, #ff7b2e 100%);
        color: #fff;
        font-size: 18px;
        font-weight: bold;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        z-index: 999;
        box-shadow: 0 4px 12px rgba(249, 99, 2, 0.4);
        display: block;
        transition: all 0.3s ease;
    \`;

    // If NO anchor found (or if we want to ensure visibility), use FIXED positioning at bottom
    // This addresses the issue where the button is not visible
    if (!anchor) {
        console.log('No anchor found, using fixed positioning');
        buttonStyle = \`
            position: fixed;
            bottom: 80px; 
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 400px;
            padding: 16px;
            background: linear-gradient(135deg, #f96302 0%, #ff7b2e 100%);
            color: #fff;
            font-size: 18px;
            font-weight: bold;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            z-index: 99999;
            box-shadow: 0 10px 25px rgba(249, 99, 2, 0.5);
            text-align: center;
            animation: slideUp 0.5s ease-out;
        \`;
        
        // Add animation keyframes if not exists
        if (!document.getElementById('mysite-animations')) {
            const style = document.createElement('style');
            style.id = 'mysite-animations';
            style.innerHTML = \`
                @keyframes slideUp {
                    from { bottom: -100px; opacity: 0; }
                    to { bottom: 80px; opacity: 1; }
                }
            \`;
            document.head.appendChild(style);
        }
        
        // Append directly to body for fixed positioning
        document.body.appendChild(btn);
    } else {
        // Append relative to anchor
        if (anchor.parentNode) {
            anchor.after(btn);
        }
    }

    btn.style.cssText = buttonStyle;

    // Add hover effect
    btn.onmouseenter = () => {
        if (!anchor) { // fixed
            btn.style.transform = 'translateX(-50%) translateY(-2px) scale(1.02)';
        } else {
            btn.style.transform = 'translateY(-2px)';
        }
        btn.style.boxShadow = '0 6px 16px rgba(249, 99, 2, 0.6)';
    };
    
    btn.onmouseleave = () => {
        if (!anchor) { // fixed
            btn.style.transform = 'translateX(-50%)';
        } else {
            btn.style.transform = 'translateY(0)';
        }
        btn.style.boxShadow = '0 4px 12px rgba(249, 99, 2, 0.4)';
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
        selectedOptions: extractOptions(),
        specifications: extractSpecs()
    };
}

async function extractCart() {
    console.log('Extracting cart data...');
    
    const items = [];
    const discounts = [];
    
    // Find all cart items - Use specific item container class to avoid duplicates
    // Based on user HTML: <div class="cart-item-..." data-automation-id="cart-item">
    const cartItems = Array.from(document.querySelectorAll('[data-automation-id="cart-item"]'));
        
    console.log('Found', cartItems.length, 'cart items');
    
    // Extract each item
    for (const itemEl of cartItems) {
        try {
            const item = extractCartItem(itemEl);
            if (item) {
                // Check if item with same SKU is already added to avoid duplicates if specific selector fails
                const existing = items.find(i => i.sku === item.sku && i.sku !== '');
                if (!existing) {
                    items.push(item);
                }
            }
        } catch (e) {
            console.error('Error extracting cart item:', e);
        }
    }
    
    // Extract discounts and deals
    const discountSelectors = [
        '[class*="promo"]',
        '[class*="discount"]',
        '[class*="savings"]',
        '[data-testid*="discount"]',
        '[data-testid*="promo"]'
    ];
    
    for (const selector of discountSelectors) {
        const discountEls = document.querySelectorAll(selector);
        discountEls.forEach(el => {
            const text = el.innerText || el.textContent;
            const amountMatch = text.match(/[-−]?\$(\d+\.?\d*)/);
            
            if (amountMatch && text.toLowerCase().includes('save')) {
                discounts.push({
                    type: text.toLowerCase().includes('promo') ? 'promo' : 'cart',
                    description: text.trim(),
                    amount: amountMatch[1]
                });
            }
        });
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
    const skuAttr = itemEl.querySelector('[data-line-item-id]');
    if (skuAttr && skuAttr.dataset.itemId) {
        sku = skuAttr.dataset.itemId;
    } else {
        const skuEl = itemEl.querySelector('[data-automation-id="productDescription"]'); 
        if (skuEl) sku = skuEl.innerText.trim();
    }

    // Extract title
    const titleEl = itemEl.querySelector('[data-automation-id="productDescription"]');
    const title = titleEl ? titleEl.innerText.trim() : 'Unknown Product';
    
    // Extract brand
    const brandEl = itemEl.querySelector('[data-automation-id="productBrand"]');
    const brand = brandEl ? brandEl.innerText.trim() : '';
    
    // Extract image
    const imgEl = itemEl.querySelector('img[data-automation-id="productImage"]');
    const image = imgEl ? imgEl.src : '';
    
    // Extract quantity
    let quantity = 1;
    const qtyCheckbox = itemEl.querySelector('input[type="checkbox"][data-quantity]');
    if (qtyCheckbox) {
        // user HTML shows data-quantity="2"
        quantity = parseInt(qtyCheckbox.dataset.quantity || '1');
    } else {
        const qtyInput = itemEl.querySelector('input[id*="quantity-stepper"]');
        if (qtyInput) {
            quantity = parseInt(qtyInput.value || '1');
        }
    }
    
    // Extract Pricing
    let unitPrice = '0.00';
    let subtotal = '0.00';
    let originalPrice = '0.00';
    let savings = '0.00';

    // 1. Try to get explicit unit price (e.g. "($69.97/item)")
    const perItemEl = itemEl.querySelector('[data-automation-id="pricingScenariosPerItemText"]');
    if (perItemEl) {
        // Text is like "($69.97/item)"
        unitPrice = perItemEl.innerText.replace(/[^0-9.]/g, '');
    }

    // 2. Get line total (e.g. "$139.94")
    const totalEl = itemEl.querySelector('[data-automation-id="pricingScenariosTotalPriceAddedText"]');
    if (totalEl) {
        subtotal = totalEl.innerText.replace(/[^0-9.]/g, '');
    }

    // 3. Fallback: if unit price missing, calculate from subtotal/qty (or vice versa)
    if (unitPrice === '0.00' && subtotal !== '0.00' && quantity > 0) {
        unitPrice = (parseFloat(subtotal) / quantity).toFixed(2);
    } else if (subtotal === '0.00' && unitPrice !== '0.00') {
        subtotal = (parseFloat(unitPrice) * quantity).toFixed(2);
    }
    
    // If we still have 0, try the data attribute on checkbox which is often the line total
    if (subtotal === '0.00' && qtyCheckbox && qtyCheckbox.dataset.itemPrice) {
        subtotal = qtyCheckbox.dataset.itemPrice; // "139.94"
        if (quantity > 0) {
            unitPrice = (parseFloat(subtotal) / quantity).toFixed(2);
        }
    }

    // Check for original price (strikethrough)
    const originalPriceEl = itemEl.querySelector('.sui-line-through');
    if (originalPriceEl) {
        originalPrice = originalPriceEl.innerText.replace(/[^0-9.]/g, '');
    }

    // Check for percentage off
    const savingsEl = itemEl.querySelector('[data-automation-id="pricingScenariosPercentOffText"]');
    if (savingsEl) {
        savings = savingsEl.innerText.trim();
    }
    
    // Extract Options (Fulfillment)
    const options = {};
    const fulfillmentContainer = itemEl.querySelector('[data-automation-id="fulfillment-container"]');
    if (fulfillmentContainer) {
         // Check for active/selected fulfillment tile
         const pickupTile = fulfillmentContainer.querySelector('button[value="pickupTile"][aria-pressed="true"]');
         const deliveryTile = fulfillmentContainer.querySelector('button[value="deliveryTile"][aria-pressed="true"]');
         
         if (pickupTile) options.fulfillment = 'Pickup';
         if (deliveryTile) {
             options.fulfillment = 'Delivery';
             // Try to get ETA
             const etaEl = deliveryTile.querySelector('[data-automation-id="sthETA"]');
             if (etaEl) options.delivery = etaEl.innerText.trim();
         }
    }

    // Extract Addons (Protection Plan)
    const addons = [];
    const protectionPlan = itemEl.querySelector('[data-automation-id="addon_protectionPlan"] input[type="checkbox"]:checked');
    if (protectionPlan) {
        addons.push('Protection Plan');
    }
    
    if (addons.length > 0) options.addons = addons;
    
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
        selectedOptions: options
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
    
    // Find totals section
    const totalsSection = document.querySelector('[data-automation-id="orderSummary"]');
    
    if (!totalsSection) {
        console.log('Could not find orderSummary section, trying fallback totals logic');
        return extractCartTotalsFallback();
    }

    // Helper to extract price value
    const getPrice = (selector, context = totalsSection) => {
        const el = context.querySelector(selector);
        if (el) {
             const text = el.innerText || el.textContent;
             // Handle "FREE"
             if (/free/i.test(text)) return '0.00';
             // Handle "---"
             if (text.includes('---')) return '0.00';
             
             // Extract number
             const priceMatch = text.replace(/,/g, '').match(/(\d+\.?\d*)/);
             if (priceMatch) return priceMatch[1];
        }
        return '0.00';
    };

    // Using exact selectors from user HTML
    totals.subtotal = getPrice('[data-automation-id="totalsSubTotal"]');
    // For pickup, HTML shows "FREE" or price
    totals.pickup = getPrice('[data-automation-id="pickupTotal"]');
    // Tax might be "---"
    totals.tax = getPrice('[data-automation-id="salesTaxTotal"]');
    // Total line
    totals.total = getPrice('[data-automation-id="totalsTotal"]');
    // Shipping/Delivery
    totals.shipping = getPrice('[data-automation-id="deliveryTotal"]');
    
    // Savings/Discount
    totals.discount = getPrice('[data-automation-id="totalsSavings"]');

    return totals;
}

function extractCartTotalsFallback() {
     // Re-implementing the robust fallback from before as a backup
     const totals = { subtotal: '0.00', tax: '0.00', shipping: '0.00', discount: '0.00', total: '0.00' };
     const extractTotal = (keywords) => {
        const elements = document.querySelectorAll('div, tr, li, p, span');
        let foundValue = '0.00';
        for (const el of elements) {
            if (el.offsetParent === null) continue;
            const text = el.innerText || el.textContent;
            if (!text) continue;
            const lowerText = text.toLowerCase();
            if (keywords.some(kw => lowerText.includes(kw))) {
                 const priceRegex = /\\$\\s*([\\d,]+\\.?\\d*)/;
                 const match = text.match(priceRegex);
                 if (match) {
                     foundValue = match[1].replace(/,/g, '');
                     if (text.length < 100) return foundValue;
                 }
            }
        }
        return foundValue;
    };
    totals.subtotal = extractTotal(['subtotal']);
    totals.tax = extractTotal(['tax', 'estimated tax']);
    totals.shipping = extractTotal(['shipping', 'delivery']);
    totals.discount = extractTotal(['discount', 'savings']);
    totals.total = extractTotal(['total', 'order total']);
    return totals;
}

/* ---------------- HELPERS ---------------- */

function canonicalURL() {
    return document.querySelector('link[rel="canonical"]')?.href || location.href;
}

function extractSKU() {
    const match = canonicalURL().match(/\\/(\\d+)$/);
    if (match) return match[1];
    return document.querySelector('meta[itemprop="sku"]')?.content || '';
}

function extractTitle() {
    return document.querySelector('h1')?.innerText.trim() || document.title;
}

function extractBrand() {
    return document.querySelector('[itemprop="brand"]')?.innerText.trim() || '';
}

/* ---------------- PRICE ---------------- */

function extractPrice(sku) {
    // Priority: Displayed Price (most likely to reflect selected options)
    const priceSelectors = [
        'div[data-testid="product-price"] span',
        '.price-format__large-price',
        '[data-testid="price-format__main-price"]',
        'span.price-format__main-price',
        '[data-automation-id="product-price"]'
    ];

    for (const selector of priceSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
            const text = el.innerText || el.textContent;
            if (text) {
                const match = text.match(/\\$?\\s*(\\d+[\\d,]*\\.?\\d*)/);
                if (match) {
                    return match[1].replace(/,/g, '');
                }
            }
        }
    }
    
    // JSON-LD backup
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    for (const script of scripts) {
         try {
            const json = JSON.parse(script.textContent);
            if (json['@type'] === 'Product' && json.offers) {
                const price = json.offers.price || json.offers.lowPrice;
                if (price) return price.toString();
            }
        } catch (e) {}
    }

    return '0.00';
}

/* ---------------- QUANTITY ---------------- */

function extractQuantity() {
    console.log('Extracting quantity...');

    // Method 1: Look for input with aria-valuenow (Home Depot's stepper)
    const ariaValueInput = document.querySelector('input[aria-valuenow]');
    if (ariaValueInput) {
        const value = ariaValueInput.getAttribute('aria-valuenow') || ariaValueInput.value;
        if (value && parseInt(value) > 0) {
            console.log('Found quantity via aria-valuenow:', value);
            return value;
        }
    }

    // Method 2: Look for text input with pattern="[0-9]*" (quantity stepper)
    const patternInput = document.querySelector('input[type="text"][pattern="[0-9]*"]');
    if (patternInput) {
        const value = patternInput.value || patternInput.getAttribute('value');
        if (value && parseInt(value) > 0) {
            console.log('Found quantity via pattern input:', value);
            return value;
        }
    }

    // Method 3: Look for stepper input with specific classes
    const stepperSelectors = [
        'input.sui-input-base-input',
        'input[class*="stepper"]',
        'input[class*="Stepper"]',
        '[data-testid="stepper-input"] input',
        'input[id*="stepper"]'
    ];

    for (const selector of stepperSelectors) {
        const input = document.querySelector(selector);
        if (input) {
            const value = input.value || input.getAttribute('value') || input.getAttribute('aria-valuenow');
            if (value && parseInt(value) > 0) {
                console.log('Found quantity in stepper:', selector, '=', value);
                return value;
            }
        }
    }

    // Method 4: Look in fulfillment area for any input
    const fulfillment = document.querySelector('[data-testid="fulfillment-content"]');
    if (fulfillment) {
        const inputs = fulfillment.querySelectorAll('input[type="text"], input[type="number"]');
        for (const input of inputs) {
            const value = input.value || input.getAttribute('value') || input.getAttribute('aria-valuenow');
            const numValue = parseInt(value);
            if (value && numValue > 0 && numValue < 1000) {
                console.log('Found quantity in fulfillment:', value);
                return value;
            }
        }
    }

    // Method 5: Search all visible inputs with value between 1-999
    const allInputs = document.querySelectorAll('input');
    console.log('Found', allInputs.length, 'total inputs on page');

    for (const input of allInputs) {
        // Check if input is visible
        const rect = input.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 &&
            window.getComputedStyle(input).display !== 'none' &&
            window.getComputedStyle(input).visibility !== 'hidden';

        if (isVisible) {
            const value = input.value || input.getAttribute('value') || input.getAttribute('aria-valuenow');
            const numValue = parseInt(value);

            // Check if it's likely a quantity (number between 1-999)
            if (value && numValue > 0 && numValue < 1000) {
                const hasQtyAttributes =
                    input.hasAttribute('aria-valuemin') ||
                    input.hasAttribute('aria-valuemax') ||
                    input.getAttribute('pattern') === '[0-9]*' ||
                    input.className.includes('stepper') ||
                    input.className.includes('quantity');

                if (hasQtyAttributes) {
                    console.log('Found visible quantity input:', input.id || input.className, '=', value);
                    return value;
                }
            }
        }
    }

    // Method 6: Check for any input with quantity-related attributes
    const qtyByAttr = document.querySelector(
        'input[name*="quantity"], input[name*="qty"], ' +
        'input[aria-label*="quantity"], input[aria-label*="Quantity"]'
    );
    if (qtyByAttr) {
        const value = qtyByAttr.value || qtyByAttr.getAttribute('value');
        if (value) {
            console.log('Found quantity by attribute:', value);
            return value;
        }
    }

    console.log('No quantity found, defaulting to 1');
    return '1';
}

/* ---------------- MEDIA ---------------- */

function extractMainImage() {
    return (
        document.querySelector('meta[property="og:image"]')?.content ||
        document.querySelector('img.mediagallery__main-image')?.src ||
        ''
    );
}

function extractImages() {
    const imgs = new Set();
    document.querySelectorAll('img').forEach(img => {
        if (img.src && img.src.includes('thdstatic.com')) {
            imgs.add(img.src);
        }
    });
    return [...imgs];
}

/* ---------------- OPTIONS (ADDONS/VARIANTS) ---------------- */

function extractOptions() {
    const options = {
        addons: [],
        variants: []
    };
    
    // 1. Fulfillment (Pickup/Delivery)
    const selectedFulfillment = document.querySelector('[data-testid="fulfillment-option"][aria-checked="true"]');
    if (selectedFulfillment) {
        options.fulfillment = selectedFulfillment.innerText.trim();
    }
    
    // 2. Addons / Protection Plans (Checked Inputs)
    // Look for checked radios or checkboxes that aren't the fulfillment options
    const checkedInputs = document.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked');
    
    checkedInputs.forEach(input => {
        // Try to find a Label text for this input
        let labelText = '';
        if (input.id) {
            const label = document.querySelector(\`label[for="\${input.id}"]\`);
            if (label) labelText = label.innerText;
        }
        if (!labelText && input.parentElement) {
            // Backup: Parent text
            labelText = input.parentElement.innerText;
        }

        if (labelText) {
            const cleanText = labelText.trim().replace(/\\n/g, ' ');
            
            // Filter: Ignore Delivery/Pickup (already captured)
            const isFulfillment = /ship|delivery|pick up|store/i.test(cleanText);
            
            // Keep if it looks like a Plan/Warranty/Addon
            // HEURISTIC: "Plan", "Warranty", "Year", "$"
            if (!isFulfillment && (cleanText.includes('Plan') || cleanText.includes('Warranty') || cleanText.includes('$') || cleanText.includes('Year'))) {
                 options.addons.push(cleanText);
            } else if (!isFulfillment && input.name !== 'fulfillment') {
                // Other variants (Color/Size often use buttons, but sometimes radios)
                options.variants.push(cleanText);
            }
        }
    });

    // 3. Button Variants (Color/Size swatches often are buttons/divs with 'selected' class)
    const swatches = document.querySelectorAll('button[class*="selected"], div[class*="selected"], [aria-checked="true"][role="radio"]');
    swatches.forEach(sw => {
        if (sw.tagName === 'INPUT') return; // Handled above
        const text = sw.innerText || sw.getAttribute('aria-label');
        if (text && !/ship|delivery|pick up/i.test(text)) {
             options.variants.push(text.trim());
        }
    });

    // Dedupe
    options.addons = [...new Set(options.addons)];
    options.variants = [...new Set(options.variants)];

    return options;
}

function extractDescription() {
    return (
        document.querySelector('meta[name="description"]')?.content ||
        document.querySelector('[itemprop="description"]')?.innerText ||
        ''
    );
}

function extractStock() {
    // Method 1: Check for specific Home Depot stock indicators
    const stockSelectors = [
        '[data-testid="product-availability"]',
        '[data-testid="fulfillment-availability"]',
        '.product-availability',
        '.availability-message',
        '[class*="availability"]'
    ];
    
    for (const selector of stockSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            const text = element.innerText.toLowerCase();
            if (text.includes('out of stock') || text.includes('unavailable')) {
                return 'Out of Stock';
            }
            if (text.includes('in stock') || text.includes('available')) {
                return 'In Stock';
            }
        }
    }
    
    // Method 2: Check if Add to Cart button is disabled
    const addToCartBtn = document.querySelector('[data-testid="add-to-cart-button"], [data-testid="fulfillment-add-to-cart-button"]');
    if (addToCartBtn) {
        if (addToCartBtn.hasAttribute('disabled') || addToCartBtn.getAttribute('aria-disabled') === 'true') {
            return 'Out of Stock';
        }
        // If button is enabled and visible, likely in stock
        const rect = addToCartBtn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            return 'In Stock';
        }
    }
    
    // Method 3: Check for stock status in structured data
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    for (const script of scripts) {
        try {
            const json = JSON.parse(script.textContent);
            if (json['@type'] === 'Product' && json.offers) {
                const availability = json.offers.availability;
                if (availability) {
                    if (availability.includes('InStock')) return 'In Stock';
                    if (availability.includes('OutOfStock')) return 'Out of Stock';
                }
            }
        } catch (e) {}
    }
    
    // Method 4: Fallback - search page text
    const bodyText = document.body.innerText.toLowerCase();
    if (bodyText.includes('out of stock') || bodyText.includes('currently unavailable')) {
        return 'Out of Stock';
    }
    if (bodyText.includes('in stock') || bodyText.includes('available for')) {
        return 'In Stock';
    }
    
    // If we can't determine, assume available (since Add to Cart button exists)
    return 'Check Availability';
}

function extractSpecs() {
    const specs = {};
    return specs;
}

/* ---------------- START ---------------- */

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
true;
`;

export default function BrowserScreen() {
    const router = useRouter();
    const webViewRef = useRef(null);
    const [loading, setLoading] = useState(true);

    const handleMessage = (event: any) => {
        try {
            const { type, payload, message } = JSON.parse(event.nativeEvent.data);

            if (type === 'PRODUCT_DATA') {
                // Single product goes to cart page
                router.push({
                    pathname: '/cart',
                    params: { data: JSON.stringify(payload) }
                });
            } else if (type === 'CART_DATA') {
                // Full cart goes to checkout page
                router.push({
                    pathname: '/checkout',
                    params: { data: JSON.stringify(payload) }
                });
            } else if (type === 'ERROR') {
                console.error('WebView Extraction Error:', message);
            }
        } catch (e) {
            console.error('Failed to parse WebView message', e);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Browse Home Depot' }} />
            <WebView
                ref={webViewRef}
                source={{ uri: 'https://www.homedepot.com' }}
                style={styles.webview}
                injectedJavaScript={INJECTED_JAVASCRIPT}
                onMessage={handleMessage}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                javaScriptEnabled={true}
                domStorageEnabled={true}
            />
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#f96302" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
