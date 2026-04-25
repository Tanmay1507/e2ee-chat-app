'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Loader2 } from 'lucide-react';

import { deriveWrappingKeyFromPassword, decryptPrivateKey, exportKeyPair, importPublicKey } from '@/lib/crypto';

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, password }),
      });

      const contentType = res.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned an unexpected error page. Check if API is running.');
      }

      if (res.ok) {
        const normalizedUsername = data.username.trim().toLowerCase();
        localStorage.setItem('chat_username', normalizedUsername);
        if (data.token) {
          localStorage.setItem('chat_token', data.token);
        }

        // --- KEY ESCROW RESTORATION ---
        if (data.encryptedPrivateKey && data.keySalt && data.publicKey) {
          try {
            const wrappingKey = await deriveWrappingKeyFromPassword(password, data.keySalt);
            const payload = JSON.parse(data.encryptedPrivateKey);
            const privateKey = await decryptPrivateKey(payload, wrappingKey);
            const publicKey = await importPublicKey(data.publicKey);
            
            const exportedKeys = await exportKeyPair({ publicKey, privateKey });
            localStorage.setItem(`keys_${normalizedUsername}`, JSON.stringify(exportedKeys));
          } catch (cryptoErr) {
            console.error('Failed to restore keys from escrow:', cryptoErr);
            // Don't block login, but chat will fail until they generate a new key
          }
        }

        router.push('/');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-4 font-sans tracking-wide">
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 shadow-xl rounded-sm">
        <div className="flex justify-center mb-6">
          <div className="p-4 border-2 border-amber-500 rounded-sm bg-amber-50">
            <ShieldCheck className="w-12 h-12 text-amber-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2 uppercase tracking-widest text-blue-950">Authorized Personnel Only</h1>
        <p className="text-slate-500 text-center mb-8 text-sm">Access the Secure Government Network.</p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-sm mb-6 text-sm text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Government ID / Badge Number</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-slate-900"
              placeholder="e.g. GOV-10293"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Security Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-slate-900"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold tracking-widest uppercase rounded-sm transition-colors flex items-center justify-center gap-2 border border-blue-500 shadow-md"
          >
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            {isLoading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-500 text-xs uppercase tracking-wider">
          Require Network Clearance?{' '}
          <Link href="/signup" className="text-blue-700 hover:text-blue-900 transition-colors hover:underline font-bold">
            Request Access
          </Link>
        </p>
      </div>
    </div>
  );
}
