import crypto from 'crypto';

// Polyfill window.crypto for the test
global.window = {
  crypto: crypto.webcrypto as any
} as any;

const KEY_ALGO = 'ECDH';
const CURVE = 'P-256';

export const exportPublicKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey('spki', key);
  const exportedAsString = String.fromCharCode.apply(null, Array.from(new Uint8Array(exported)));
  return btoa(exportedAsString);
};

export const importPublicKey = async (base64Key: string): Promise<CryptoKey> => {
  const binaryDerString = atob(base64Key);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  return await window.crypto.subtle.importKey(
    'spki',
    binaryDer.buffer,
    { name: KEY_ALGO, namedCurve: CURVE },
    true,
    []
  );
};

export const exportKeyPair = async (keyPair: any) => {
  const publicKey = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return { publicKey, privateKey };
};

export const importKeyPair = async (data: { publicKey: any; privateKey: any }): Promise<any> => {
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

async function test() {
  try {
    // 1. Generate new key
    const originalKeys = await window.crypto.subtle.generateKey(
      { name: KEY_ALGO, namedCurve: CURVE },
      true,
      ['deriveKey', 'deriveBits']
    );
    // Export SPKI (like in signup)
    const originalPubKeyBase64 = await exportPublicKey(originalKeys.publicKey);
    console.log("Original Base64:", originalPubKeyBase64);

    // Export JWK (like in signup local storage)
    const exportedJwks = await exportKeyPair(originalKeys);

    // Import JWK (like in useChat)
    const restoredKeys = await importKeyPair(exportedJwks);

    // Export SPKI again (like in useChat)
    const finalPubKeyBase64 = await exportPublicKey(restoredKeys.publicKey);
    console.log("Final Base64:   ", finalPubKeyBase64);
    console.log("Match?", originalPubKeyBase64 === finalPubKeyBase64);
  } catch (err) {
    console.error("Test Failed:", err);
  }
}

test();
