const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
    light: {
        text: '#000',
        background: '#fff',
        tint: tintColorLight,
        tabIconDefault: '#ccc',
        tabIconSelected: tintColorLight,
        border: '#eee',
        card: '#fff',

        // App Specific
        primary: '#F96302', // Home Depot Orange-ish
        secondary: '#333333',
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
    },
    dark: {
        text: '#fff',
        background: '#000',
        tint: tintColorDark,
        tabIconDefault: '#ccc',
        tabIconSelected: tintColorDark,
        border: '#333',
        card: '#1c1c1e',

        // App Specific
        primary: '#F96302',
        secondary: '#ccc',
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
    },
};
