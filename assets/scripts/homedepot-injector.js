const CONFIG = {
    BUTTON_CLASS: 'buy-on-mysite-btn',
    BUTTON_TEXT: 'Buy from My Site'
};

/* ---------------- INIT ---------------- */

function init() {
    // Only run on product pages
    if (!location.pathname.includes('/p/')) return;
    observe();
    injectButtons();
}

function observe() {
    const observer = new MutationObserver(() => injectButtons());
    observer.observe(document.body, { childList: true, subtree: true });
}

/* ---------------- UI ---------------- */

function injectButtons() {
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
        btn.style.cssText = `
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
        `;

        btn.onclick = handleClick;

        // Insert
        if (anchor.parentNode) {
            anchor.after(btn);
        }
    });

    // Removed Floating Button Fallback as requested
}

/* ---------------- CLICK ---------------- */

async function handleClick(e) {
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

/* ---------------- HELPERS ---------------- */

function canonicalURL() {
    return document.querySelector('link[rel="canonical"]')?.href || location.href;
}

function extractSKU() {
    const match = canonicalURL().match(/\/(\d+)$/);
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
                const match = text.match(/\$?\s*(\d+[\d,]*\.?\d*)/);
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
        } catch (e) { }
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
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) labelText = label.innerText;
        }
        if (!labelText && input.parentElement) {
            // Backup: Parent text
            labelText = input.parentElement.innerText;
        }

        if (labelText) {
            const cleanText = labelText.trim().replace(/\n/g, ' ');

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
    const text = document.body.innerText.toLowerCase();
    if (text.includes('out of stock')) return 'Out of Stock';
    if (text.includes('in stock')) return 'In Stock';
    return 'Unknown';
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
