const INJECTED_CODE = `
console.log('Harbor Injector: Loaded');

const CONFIG = {
    BUTTON_CLASS: 'buy-on-mysite-btn',
    BUTTON_TEXT: 'Buy from My Site',
    CART_BUTTON_CLASS: 'checkout-on-mysite-btn',
    CART_BUTTON_TEXT: '🛒 Checkout on My Site'
};

function init() {
    console.log('Harbor Injector: Init');
    
    // Check immediately
    checkAndInject();
    
    // Use MutationObserver for robust SPA support (like HD injector)
    const observer = new MutationObserver(() => checkAndInject());
    observer.observe(document.body, { childList: true, subtree: true });
}

function checkAndInject() {
    const url = location.href.toLowerCase();
    
    // Robust Cart Detection
    // 1. URL Check
    const isCartPage = url.includes('cart') || url.includes('checkout');
    // 2. DOM Check (specific to HF HTML provided)
    const hasCartElements = !!document.querySelector('.cart-items__wrap--q-WVMU') || !!document.querySelector('.checkout-totals__wrap--ZmQsGI');

    if (isCartPage || hasCartElements) {
        injectCartButton();
    }
    
    // Product Page Check
    if (url.includes('.html') || document.querySelector('.product-detail-root')) {
        injectProductButtons();
    }
}

function injectCartButton() {
    // Prevent duplicates
    if (document.querySelector('.' + CONFIG.CART_BUTTON_CLASS)) return;

    console.log('Harbor Injector: Injecting Cart Button');

    // 1. Try to find the "Start Secure Checkout" button to inject AFTER
    // HF Class from user: button__button--R90V-T buttonPrimary startCheckoutButton
    const anchors = [
        document.querySelector('.startCheckoutButton'),
        document.querySelector('[data-testid="totalsWrap"] button'), // The button inside totals wrap
        document.querySelector('.checkout-totals__wrap--ZmQsGI'),    // The container itself
        document.querySelector('button.buttonPrimary')
    ];
    
    let anchor = anchors.find(a => a !== null && a.offsetParent !== null); // Find first visible anchor

    const btn = document.createElement('button');
    btn.className = CONFIG.CART_BUTTON_CLASS;
    btn.innerText = CONFIG.CART_BUTTON_TEXT;
    
    btn.onclick = async (e) => {
        e.preventDefault(); e.stopPropagation();
        btn.innerText = 'Extracting...';
        btn.disabled = true;
        try {
            await new Promise(r => setTimeout(r, 200));
            const data = await extractCart();
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CART_DATA', payload: data }));
            }
        } catch(err) {
             console.error(err);
             if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: err.message }));
             }
        } finally {
            btn.innerText = CONFIG.CART_BUTTON_TEXT;
            btn.disabled = false;
        }
    };

    if (anchor) {
        // STRATEGY A: Relative Injection (Like Home Depot Product Page)
        console.log('Harbor Injector: Found Anchor, injecting relative');
        
        btn.style.cssText = \`
            display: block;
            width: 100%;
            margin-top: 15px;
            padding: 16px;
            background: linear-gradient(135deg, #d61c1c 0%, #b00000 100%);
            color: #fff;
            font-size: 18px;
            font-weight: bold;
            border: 2px solid #fff;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            text-align: center;
            z-index: 1000;
        \`;
        
        // Use insertBefore or after depending on what the anchor is
        if (anchor.tagName === 'BUTTON') {
             // Inject after the button
             if(anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
        } else {
             // Append to container
             anchor.appendChild(btn);
        }
        
    } else {
        // STRATEGY B: Fixed Fallback (If no anchor found)
        console.log('Harbor Injector: No Anchor, injecting fixed');
        
        btn.style.cssText = \`
            position: fixed;
            bottom: 20px; 
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 400px;
            padding: 18px;
            background: #d61c1c;
            color: white;
            font-size: 18px;
            font-weight: bold;
            border: 2px solid white;
            border-radius: 50px;
            cursor: pointer;
            z-index: 2147483647; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        \`;
        document.body.appendChild(btn);
    }
}

function injectProductButtons() {
    const anchors = Array.from(document.querySelectorAll('.productActionButton, .add-to-cart, button'));
    
    anchors.forEach(anchor => {
        const text = (anchor.innerText || '').toLowerCase();
        if ((!text.includes('add to cart') && !text.includes('add to order')) || anchor.closest('.' + CONFIG.BUTTON_CLASS)) return;
        
        const next = anchor.nextElementSibling;
        if (next && next.classList.contains(CONFIG.BUTTON_CLASS)) return;

        const btn = document.createElement('button');
        btn.className = CONFIG.BUTTON_CLASS;
        btn.innerText = CONFIG.BUTTON_TEXT;
        btn.style.cssText = \`
            width: 100%; margin-top: 10px; padding: 12px;
            background: #d61c1c; color: white; font-size: 16px; font-weight: bold;
            border: none; border-radius: 4px; cursor: pointer; display: block;
        \`;
        btn.onclick = async (e) => {
            e.preventDefault(); e.stopPropagation();
            btn.innerText = 'Processing...';
            try {
                const data = await extractProduct();
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PRODUCT_DATA', payload: data }));
                }
            } catch(err) {
                 console.error(err);
            } finally {
                btn.innerText = CONFIG.BUTTON_TEXT;
            }
        };
        
        if(anchor.parentNode) anchor.after(btn);
    });
}

// --- Extraction Logic ---

async function extractCart() {
    const items = [];
    
    // <li class="cart-items__item--jG-6K2">
    const itemEls = document.querySelectorAll('li[class*="cart-items__item"]');
    
    itemEls.forEach(el => {
        const titleLink = el.querySelector('h3 a');
        const title = titleLink ? titleLink.innerText.trim() : 'Unknown Item';
        
        const brandEl = el.querySelector('[class*="cart-items__brand"]');
        const brand = brandEl ? brandEl.innerText.trim() : '';

        let unitPrice = '0.00';
        const priceEl = el.querySelector('[class*="styled-price__styledPrice"]');
        if (priceEl) {
            const m = priceEl.innerText.match(/\\$?(\\d+[\\d,]*\\.?\\d*)/);
            if (m) unitPrice = m[1].replace(/,/g, '');
        }

        let quantity = 1;
        const select = el.querySelector('select');
        if (select) quantity = parseInt(select.value);

        let image = '';
        const img = el.querySelector('img');
        if (img) image = img.src;

        let sku = '';
        const link = el.querySelector('a[href*=".html"]');
        if (link) {
            const m = link.getAttribute('href').match(/-(\\d+)\\.html/);
            if(m) sku = m[1];
        }

        items.push({
            sku,
            title,
            brand,
            image,
            unitPrice,
            quantity,
            subtotal: (parseFloat(unitPrice) * quantity).toFixed(2)
        });
    });

    const totals = extractCartTotals();

    return {
        items,
        totals,
        cartUrl: location.href
    };
}

function extractCartTotals() {
    const totals = { subtotal:'0.00', tax:'0.00', shipping:'0.00', total:'0.00' };
    
    const rows = document.querySelectorAll('li[class*="checkout-totals__line"], li[class*="checkout-totals__grandTotal"]');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        const priceEl = row.querySelector('[class*="styled-price__styledPrice"]');
        if (!priceEl) return;

        const m = priceEl.innerText.match(/\\$?(\\d+[\\d,]*\\.?\\d*)/);
        if (!m) return;
        const val = m[1].replace(/,/g, '');

        if (text.includes('subtotal')) totals.subtotal = val;
        else if (text.includes('tax')) totals.tax = val;
        else if (text.includes('shipping')) totals.shipping = val;
        else if (text.includes('total') && !text.includes('sub')) totals.total = val;
    });

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

// Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
`;

module.exports = INJECTED_CODE;
