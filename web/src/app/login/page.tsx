

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Loader2, MessageSquare, Lock } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md p-6 sm:p-10 bg-white shadow-2xl shadow-zinc-200/50 rounded-3xl border border-zinc-100">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-violet-600 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-lg shadow-violet-200 animate-in fade-in zoom-in duration-500">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">SecureChat</h1>
          <p className="text-zinc-500 mt-2 sm:mt-3 text-center text-sm sm:text-base font-medium leading-relaxed px-2 sm:px-4">
            Encrypted communications for authorized personnel only.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl mb-8 text-sm font-bold flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Employee Credentials</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-50 outline-none transition-all text-zinc-900 font-bold placeholder:text-zinc-400 placeholder:font-medium"
              placeholder="Username or ID"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Access Key</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-50 outline-none transition-all text-zinc-900 font-bold placeholder:text-zinc-400 placeholder:font-medium"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4.5 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-violet-200 disabled:opacity-70 disabled:shadow-none mt-8 group"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />}
            {isLoading ? 'Verifying...' : 'Authorize Access'}
          </button>
        </form>

        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-zinc-100 text-center">
          <p className="text-zinc-500 text-sm font-medium">
            New personnel?{' '}
            <Link href="/signup" className="text-violet-600 hover:text-violet-700 font-black decoration-violet-600/30 underline-offset-4 hover:underline transition-all">
              Register Credentials
            </Link>
          </p>
        </div>

        <div className="mt-6 sm:mt-8 flex items-center justify-center gap-2.5 text-zinc-400 text-[10px] uppercase tracking-[0.25em] font-black">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> E2EE PROTECTED
        </div>
      </div>
    </div>
  );
}
