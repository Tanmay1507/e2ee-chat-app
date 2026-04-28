/**
 * End-to-End Encryption Utility
 * Uses ECDH for key exchange and AES-256-GCM for message encryption.
 */

const KEY_ALGO = 'ECDH';
const CURVE = 'P-256';
const DERIVED_ALGO = 'AES-GCM';
const DERIVED_KEY_SIZE = 256;

// Utility to convert ArrayBuffer to Base64 (Robust version)
export const bufferToBase64 = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Utility to convert Base64 to ArrayBuffer (Robust version)
export const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// 1. Generate ECDH Key Pair
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  return await window.crypto.subtle.generateKey(
    { name: KEY_ALGO, namedCurve: CURVE },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );
};

// 2. Export Public Key for sharing (SPKI format)
export const exportPublicKey = async (publicKey: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  return bufferToBase64(exported);
};

// 3. Import Peer Public Key (Supports RAW, SPKI, and JWK)
export const importPublicKey = async (publicKeyBase64: string): Promise<CryptoKey> => {
  const buffer = base64ToBuffer(publicKeyBase64);
  
  // Try RAW first (used by real-time messages)
  try {
    return await window.crypto.subtle.importKey(
      'raw',
      buffer,
      { name: KEY_ALGO, namedCurve: CURVE },
      true,
      []
    );
  } catch (rawErr) {
    // Try SPKI (used by database records)
    try {
      return await window.crypto.subtle.importKey(
        'spki',
        buffer,
        { name: KEY_ALGO, namedCurve: CURVE },
        true,
        []
      );
    } catch (spkiErr) {
      // Try JWK (used by some local persistence)
      try {
        const jwk = JSON.parse(publicKeyBase64);
        return await window.crypto.subtle.importKey(
          'jwk',
          jwk,
          { name: KEY_ALGO, namedCurve: CURVE },
          true,
          []
        );
      } catch (jwkErr) {
        console.error('All public key import formats failed.', { rawErr, spkiErr, jwkErr });
        throw new Error('Public key format unrecognized');
      }
    }
  }
};

// 4. Derive Shared AES Key using ECDH and HKDF (Industry Standard)
export const deriveSharedKey = async (
  myPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey
): Promise<CryptoKey> => {
  try {
    // Step A: Derive raw shared secret bits from ECDH
    const sharedSecretBits = await window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: peerPublicKey,
      },
      myPrivateKey,
      256
    );

    // Step B: Import the bits as a HKDF base key
    const hkdfKey = await window.crypto.subtle.importKey(
      'raw',
      sharedSecretBits,
      { name: 'HKDF' },
      false, // HKDF key doesn't need to be extractable
      ['deriveKey']
    );

    // Step C: Derive the final AES-GCM key using HKDF
    return await window.crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: new Uint8Array(16), // Fixed salt
        info: new TextEncoder().encode('E2EE_CHAT_V1'),
        hash: 'SHA-256',
      },
      hkdfKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // MUST be extractable for fingerprinting
      ['encrypt', 'decrypt']
    );
  } catch (err) {
    console.error('❌ [CRYPTO] deriveSharedKey failed:', err);
    throw err;
  }
};

// 5. Encrypt Message
export interface EncryptedPayload {
  cipherText: string; // Base64 encoded
  iv: string;         // Base64 encoded
}

export const encryptMessage = async (
  key: CryptoKey,
  text: string
): Promise<EncryptedPayload> => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);

  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: DERIVED_ALGO, iv },
    key,
    encoded
  );

  return {
    cipherText: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv),
  };
};

// 6. Decrypt Message
export const decryptMessage = async (
  key: CryptoKey,
  payload: EncryptedPayload
): Promise<string> => {
  const cipherBuffer = base64ToBuffer(payload.cipherText);
  const iv = base64ToBuffer(payload.iv);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: DERIVED_ALGO, iv },
    key,
    cipherBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
};

// 7. Export Key Pair for persistence
export const exportKeyPair = async (keyPair: CryptoKeyPair) => {
  const publicKey = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return { publicKey, privateKey };
};

// 8. Import Key Pair from persistence
export const importKeyPair = async (data: { publicKey: any; privateKey: any }): Promise<CryptoKeyPair> => {
  const publicKey = await window.crypto.subtle.importKey(
    'jwk',
    data.publicKey,
    { name: KEY_ALGO, namedCurve: CURVE },
    true,
    []
  );
  const privateKey = await window.crypto.subtle.importKey(
    'jwk',
    data.privateKey,
    { name: KEY_ALGO, namedCurve: CURVE },
    true,
    ['deriveKey', 'deriveBits']
  );
  return { publicKey, privateKey };
};

// --- ENCRYPTED KEY ESCROW (PASSWORD-DERIVED) ---

export const generateSalt = (): string => {
  const buffer = window.crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(buffer);
};

export const deriveWrappingKeyFromPassword = async (password: string, saltBase64: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const saltBuffer = base64ToBuffer(saltBase64);

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptPrivateKey = async (privateKey: CryptoKey, wrappingKey: CryptoKey): Promise<EncryptedPayload> => {
  // Export the private key to PKCS8 format
  const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    exported
  );

  return {
    cipherText: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv),
  };
};

export const decryptPrivateKey = async (payload: EncryptedPayload, wrappingKey: CryptoKey): Promise<CryptoKey> => {
  const cipherBuffer = base64ToBuffer(payload.cipherText);
  const iv = base64ToBuffer(payload.iv);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    cipherBuffer
  );

  return await window.crypto.subtle.importKey(
    'pkcs8',
    decryptedBuffer,
    { name: KEY_ALGO, namedCurve: CURVE },
    true,
    ['deriveKey', 'deriveBits']
  );
};

// 9. Key Fingerprinting (SHA-256)
export const getFingerprint = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', exported);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8).toUpperCase();
};
// --- GROUP KEY MANAGEMENT ---

/**
 * Generate a random 256-bit AES-GCM key for a group.
 */
export const generateGroupKey = async (): Promise<CryptoKey> => {
  return await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypt a Group Key for a specific member using a shared secret derived from their public key.
 */
export const encryptGroupKey = async (
  groupKey: CryptoKey,
  recipientPublicKey: CryptoKey,
  myPrivateKey: CryptoKey
): Promise<EncryptedPayload> => {
  const sharedKey = await deriveSharedKey(myPrivateKey, recipientPublicKey);
  
  // Export group key to RAW format to encrypt it
  const exportedGroupKey = await window.crypto.subtle.exportKey('raw', groupKey);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    exportedGroupKey
  );

  return {
    cipherText: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer),
  };
};

/**
 * Decrypt a Group Key sent by the creator.
 */
export const decryptGroupKey = async (
  encryptedPayload: EncryptedPayload,
  creatorPublicKey: CryptoKey,
  myPrivateKey: CryptoKey
): Promise<CryptoKey> => {
  const sharedKey = await deriveSharedKey(myPrivateKey, creatorPublicKey);
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(encryptedPayload.iv) },
    sharedKey,
    base64ToBuffer(encryptedPayload.cipherText)
  );

  return await window.crypto.subtle.importKey(
    'raw',
    decryptedBuffer,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Export a CryptoKey to base64 for storage (as a member of a group)
 */
export const exportGroupKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return bufferToBase64(exported);
};

/**
 * Import a Group Key from base64 (already decrypted)
 */
export const importGroupKey = async (base64: string): Promise<CryptoKey> => {
  return await window.crypto.subtle.importKey(
    'raw',
    base64ToBuffer(base64),
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};
