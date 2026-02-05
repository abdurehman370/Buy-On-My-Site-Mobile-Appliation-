import * as Linking from 'expo-linking';

/**
 * Extracts the first URL found in a text string.
 * Helpful because "Share" often includes "Check this out! [URL]"
 */
export const extractUrlFromText = (text: string): string | null => {
    if (!text) return null;

    // Simple regex to find http/https URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);

    if (match && match.length > 0) {
        return match[0];
    }

    return null;
};

/**
 * Validates if the URL is from Home Depot.
 */
export const isValidHomeDepotUrl = (url: string): boolean => {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return parsed.hostname.includes('homedepot.com') || parsed.hostname.includes('thd.co');
    } catch (e) {
        return false;
    }
};

/**
 * Tries to get the initial shared URL.
 * Note: Android "Share to App" via sending intent is tricky in Managed workflow 
 * without consistent native module support or a config plugin. 
 * We rely on `Linking.getInitialURL()` possibly containing the data 
 * IF the app was opened via a Deep Link or if the intent was converted.
 * 
 * However, for ACTION_SEND mimetype text/plain, standard React Native Linking.getInitialURL() 
 * might returns null. 
 * 
 * In a real production app, you might need 'expo-share-intent' library.
 * For this implementation, we will assume standard Linking works or provide hooks 
 * for where to swap in the native module call.
 */
export const getInitialShareUrl = async (): Promise<string | null> => {
    try {
        const initialUrl = await Linking.getInitialURL();
        console.log('Initial Launch URL:', initialUrl);

        // If the URL itself is the data (rare for ACTION_SEND, common for Deep Link)
        if (initialUrl && isValidHomeDepotUrl(initialUrl)) {
            return initialUrl;
        }

        // If the initialURL contains the data in query param (some intent receivers do this)
        // e.g. myapp://share?text=...
        if (initialUrl) {
            const parsed = Linking.parse(initialUrl);
            if (parsed.queryParams?.text) {
                const text = parsed.queryParams.text as string;
                return extractUrlFromText(text);
            }
            if (parsed.queryParams?.url) {
                return parsed.queryParams.url as string;
            }
        }

        return null;
    } catch (e) {
        console.error('Error getting initial URL:', e);
        return null;
    }
};
