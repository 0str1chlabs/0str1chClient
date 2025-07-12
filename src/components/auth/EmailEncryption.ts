// Frontend email encryption utility
// This matches the backend EmailEncryption class

export class EmailEncryption {
  private static algorithm = 'AES-CBC';
  private static key = import.meta.env.VITE_EMAIL_ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!';
  private static iv = import.meta.env.VITE_EMAIL_ENCRYPTION_IV || 'your-iv-16-chars!';

  // Helper method to ensure key is exactly 32 bytes (256 bits)
  private static getKeyBytes(): Uint8Array {
    const keyString = this.key;
    const keyBytes = new TextEncoder().encode(keyString);
    
    // If key is longer than 32 bytes, truncate it
    if (keyBytes.length > 32) {
      return keyBytes.slice(0, 32);
    }
    
    // If key is shorter than 32 bytes, pad it with zeros
    if (keyBytes.length < 32) {
      const paddedKey = new Uint8Array(32);
      paddedKey.set(keyBytes);
      return paddedKey;
    }
    
    return keyBytes;
  }

  // Helper method to ensure IV is exactly 16 bytes (128 bits)
  private static getIVBytes(): Uint8Array {
    const ivString = this.iv;
    const ivBytes = new TextEncoder().encode(ivString);
    
    // If IV is longer than 16 bytes, truncate it
    if (ivBytes.length > 16) {
      return ivBytes.slice(0, 16);
    }
    
    // If IV is shorter than 16 bytes, pad it with zeros
    if (ivBytes.length < 16) {
      const paddedIV = new Uint8Array(16);
      paddedIV.set(ivBytes);
      return paddedIV;
    }
    
    return ivBytes;
  }

  static async encrypt(text: string): Promise<string> {
    try {
      // Get properly sized key and IV
      const keyData = this.getKeyBytes();
      const ivData = this.getIVBytes();
      
      // Import key
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: this.algorithm },
        false,
        ['encrypt']
      );
      
      // Encrypt
      const encodedText = new TextEncoder().encode(text);
      const encrypted = await crypto.subtle.encrypt(
        { name: this.algorithm, iv: ivData },
        cryptoKey,
        encodedText
      );
      
      // Convert to hex string
      return Array.from(new Uint8Array(encrypted))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt email');
    }
  }

  static async decrypt(encryptedText: string): Promise<string> {
    try {
      // Get properly sized key and IV
      const keyData = this.getKeyBytes();
      const ivData = this.getIVBytes();
      
      // Import key
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: this.algorithm },
        false,
        ['decrypt']
      );
      
      // Convert hex string to Uint8Array
      const encryptedData = new Uint8Array(
        encryptedText.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
      
      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: this.algorithm, iv: ivData },
        cryptoKey,
        encryptedData
      );
      
      // Convert to string
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt email');
    }
  }
} 