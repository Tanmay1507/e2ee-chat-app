import { useState, useRef, useCallback } from 'react';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  exportKeyPair,
  importKeyPair,
} from '@/lib/crypto';

export const useCrypto = () => {
  const [isReady, setIsReady] = useState(false);
  const keyPairRef = useRef<CryptoKeyPair | null>(null);
  const sharedKeysRef = useRef<Record<string, CryptoKey>>({});

  const initKeys = useCallback(async (username: string) => {
    const normalizedUsername = username.trim().toLowerCase();
    let keys: CryptoKeyPair;
    const savedKeys = localStorage.getItem(`keys_${normalizedUsername}`);
    
    if (savedKeys) {
      try {
        keys = await importKeyPair(JSON.parse(savedKeys));
      } catch (e) {
        keys = await generateKeyPair();
        const exported = await exportKeyPair(keys);
        localStorage.setItem(`keys_${normalizedUsername}`, JSON.stringify(exported));
      }
    } else {
      keys = await generateKeyPair();
      const exported = await exportKeyPair(keys);
      localStorage.setItem(`keys_${normalizedUsername}`, JSON.stringify(exported));
    }
    
    keyPairRef.current = keys;
    setIsReady(true);
    return keys;
  }, []);

  const getSharedKey = useCallback(async (peerUsername: string, peerPubKeyBase64: string) => {
    const peerKey = peerUsername.toLowerCase();
    let sharedKey = sharedKeysRef.current[peerKey];
    
    if (!sharedKey && keyPairRef.current) {
      const peerPubKey = await importPublicKey(peerPubKeyBase64);
      sharedKey = await deriveSharedKey(keyPairRef.current.privateKey, peerPubKey);
      sharedKeysRef.current[peerKey] = sharedKey;
    }
    
    return sharedKey;
  }, []);

  return {
    isReady,
    keyPairRef,
    sharedKeysRef,
    initKeys,
    getSharedKey
  };
};
