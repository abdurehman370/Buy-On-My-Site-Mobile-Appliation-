# BuyOnMySite Mobile App
A premium React Native mobile application built with Expo that transforms the Home Depot shopping experience. It allows users to seamlessly import products and carts from Home Depot into your own e-commerce ecosystem.

## 🚀 Key Features

- **Embedded Shopping Browser**: A high-performance in-app browser that allows users to navigate Home Depot directly within the app.
- **Intelligent Data Extraction**: Advanced JavaScript injection logic that real-time parses:
  - **Product Details**: SKU, title, brand, price, images, specifications, and variants.
  - **Cart Information**: Complete cart items, quantities, sub-item details, and applied discounts.
- **Share Intent Integration**: Users can share product URLs from the native Home Depot app or mobile browsers directly to BuyOnMySite.
- **Smart Cart Management**: A dedicated cart screen that aggregates both directly imported products and extracted cart data.
- **Premium UI/UX**: Modern, responsive design with smooth transitions and a native feel.

## 🛠 Tech Stack

- **Framework**: React Native with Expo (Managed Workflow)
- **Navigation**: Expo Router (File-based routing)
- **WebView**: `react-native-webview` for the embedded browser and script injection.
- **Theming**: Dynamic light/dark mode support via `constants/Colors.ts`.
- **Platform**: Android-first optimization (Share Intents, Hardware Back Handling).

## 📂 Project Structure

```bash
buy-on-mysite-mobile/
├── app/
│   ├── _layout.tsx      # Root navigation provider, theme provider, and global styles.
│   ├── index.tsx        # Entry point: Handles Share Intent check and provides primary navigation.
│   ├── browser.tsx      # Embedded WebView with advanced JS injection for data scraping.
│   ├── import.tsx       # Loading state: Fetches product metadata via Backend API.
│   ├── product.tsx      # UI: Rich display for a single imported product.
│   ├── cart.tsx         # UI: Centralized shopping cart for extracted items and discounts.
│   ├── checkout.tsx     # UI: Final order review and "Place Order" workflow.
│   └── error.tsx        # UI: Graceful error handling and recovery.
├── components/          # Reusable UI components (ProductCard, etc.)
├── services/
│   ├── api.ts           # Integration with the product metadata extraction backend.
│   └── share.ts         # Native Share Intent bridge and extraction.
├── types/               # TypeScript definitions for Cart, Product, and API data.
├── app.json             # Expo configuration, including Android Intent Filters.
└── package.json         # Project dependencies and workspace scripts.
```

## ⚙️ How It Works (Extraction Engine)

The core magic happens in `app/browser.tsx`. The app injects a comprehensive suite of JavaScript functions into the Home Depot mobile site to:
1.  **Monitor Page Transitions**: Detects when a user is on a product page or the cart page.
2.  **UI Injection**: Dynamically inserts "Buy from My Site" and "Checkout on My Site" buttons directly into the Home Depot interface.
3.  **Real-time Parsing**:
    - **SKU & Metadata**: Extracts data from canonical tags, JSON-LD, and meta tags.
    - **Quantity & Options**: Uses advanced heuristics to find selected quantities and variant options (color, size, protection plans).
    - **Cart Totals**: Scrapes subtotals, taxes, shipping, and promotional discounts.

## 📥 Getting Started

### Prerequisites
- Node.js (LTS)
- Java Development Kit (JDK 17)
- Android Studio & SDK (for emulator)

### Installation
1.  **Clone & Install**:
    ```bash
    npm install
    ```
2.  **Start Development**:
    ```bash
    npx expo start
    ```
    *Press `a` for Android Emulator.*

### Testing the Flow
1.  **Direct Browsing**: Open the app, tap **Browse Home Depot**, navigate to any product, and tap the orange **Buy from My Site** button.
2.  **Share Extension**: Open the real Home Depot app, tap **Share** on any product, and select **BuyOnMySite**.

## 🔌 API Integration

The app communicates with a backend to normalize product URLs into structured data:

- **Endpoint**: `POST /products/import-from-url`
- **Request**: `{ "url": "..." }`
- **Expected Response**:
  ```json
  {
    "sku": "12345",
    "title": "Product Title",
    "brand": "Brand Name",
    "price": "199.99",
    "image": "https://...",
    "checkoutUrl": "https://yourwebsite.com/checkout/..."
  }
  ```
## ⚠️ Known Limitations
- **Expo Go**: Share Intent functionality requires a Native Prebuild or APK for full reliability.
- **iOS**: Current implementation is Android-focused; iOS support requires additional Config Plugin setup for Share Extensions.
