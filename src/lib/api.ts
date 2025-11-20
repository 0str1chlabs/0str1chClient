import axios from 'axios';
import { generateAESKey, generateIV, encryptAESKey, encryptData, decryptData } from './encryption';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8090';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    withCredentials: true,
});

// Request Interceptor: Encrypt Payload
api.interceptors.request.use(async (config) => {
    // Add Auth Token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Skip encryption for GET requests or if no data
    if (config.method === 'get' || !config.data) {
        return config;
    }

    try {
        // 1. Generate Session Key and IV
        const aesKey = generateAESKey();
        const iv = generateIV();

        // 2. Encrypt AES Key with Server Public Key
        const encryptedAESKey = await encryptAESKey(aesKey);
        if (!encryptedAESKey) {
            throw new Error('Failed to encrypt AES key');
        }

        // 3. Encrypt Data
        const encryptedDataPayload = encryptData(config.data, aesKey, iv);

        // 4. Attach Headers and Replace Body
        config.headers['X-Encrypted-Key'] = encryptedAESKey;
        config.headers['X-IV'] = iv;
        config.data = { data: encryptedDataPayload };

        // 5. Store key/iv in config for response decryption
        // @ts-ignore
        config.metadata = { aesKey, iv };

    } catch (error) {
        console.error('Encryption failed:', error);
        // Fallback or throw? For now, let's throw to ensure security
        return Promise.reject(error);
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Decrypt Payload
api.interceptors.response.use((response) => {
    // Check if response is encrypted
    // @ts-ignore
    const { aesKey, iv } = response.config.metadata || {};

    if (response.data && response.data.encrypted && response.data.data && aesKey && iv) {
        try {
            // Decrypt response data
            const decryptedData = decryptData(response.data.data, aesKey, iv);
            response.data = decryptedData;
        } catch (error) {
            console.error('Decryption of response failed:', error);
            return Promise.reject(error);
        }
    }

    return response;
}, (error) => {
    return Promise.reject(error);
});

export default api;
