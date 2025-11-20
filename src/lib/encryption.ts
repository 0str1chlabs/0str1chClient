import CryptoJS from 'crypto-js';
import { SERVER_PUBLIC_KEY } from './publicKey';

// Generate a random AES key (32 bytes)
export const generateAESKey = (): string => {
    return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
};

// Generate a random IV (16 bytes)
export const generateIV = (): string => {
    return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
};

// Helper: Convert PEM to ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64Lines = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    const b64Prefix = b64Lines.replace(/-/g, '+').replace(/_/g, '/');
    const str = window.atob(b64Prefix);
    const buf = new ArrayBuffer(str.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) {
        view[i] = str.charCodeAt(i);
    }
    return buf;
}

// Helper: ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Encrypt AES key with RSA Public Key (OAEP)
// Note: This is now async because Web Crypto API is async
export const encryptAESKey = async (aesKey: string): Promise<string> => {
    try {
        const keyBuffer = pemToArrayBuffer(SERVER_PUBLIC_KEY);

        const cryptoKey = await window.crypto.subtle.importKey(
            'spki',
            keyBuffer,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256'
            },
            false,
            ['encrypt']
        );

        const encodedKey = new TextEncoder().encode(aesKey);

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: 'RSA-OAEP'
            },
            cryptoKey,
            encodedKey
        );

        return arrayBufferToBase64(encryptedBuffer);
    } catch (error) {
        console.error('Frontend Encryption Error:', error);
        throw error;
    }
};

// Encrypt data with AES
export const encryptData = (data: any, aesKey: string, iv: string): string => {
    const key = CryptoJS.enc.Hex.parse(aesKey);
    const ivParsed = CryptoJS.enc.Hex.parse(iv);
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
        iv: ivParsed,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.ciphertext.toString(CryptoJS.enc.Hex);
};

// Decrypt data with AES
export const decryptData = (encryptedData: string, aesKey: string, iv: string): any => {
    const key = CryptoJS.enc.Hex.parse(aesKey);
    const ivParsed = CryptoJS.enc.Hex.parse(iv);
    const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Hex.parse(encryptedData) } as any,
        key,
        {
            iv: ivParsed,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }
    );
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
};
