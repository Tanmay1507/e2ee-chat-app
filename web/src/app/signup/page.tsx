'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { generateKeyPair, exportPublicKey, exportKeyPair, generateSalt, deriveWrappingKeyFromPassword, encryptPrivateKey } from '@/lib/crypto';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Normalize username for consistency
      const normalizedUsername = username.trim().toLowerCase();

      // 1. Generate E2EE Keys
      const keys = await generateKeyPair();
      const pubKeyBase64 = await exportPublicKey(keys.publicKey);
      
      // Save keys locally for this user
      const exportedKeys = await exportKeyPair(keys);
      localStorage.setItem(`keys_${normalizedUsername}`, JSON.stringify(exportedKeys));

      // 1.5. Wrap Private Key for Escrow
      const keySalt = generateSalt();
      const wrappingKey = await deriveWrappingKeyFromPassword(password, keySalt);
      const encryptedPrivateKeyPayload = await encryptPrivateKey(keys.privateKey, wrappingKey);
      // We stringify the payload to send as a single TEXT field to the DB
      const encryptedPrivateKey = JSON.stringify(encryptedPrivateKeyPayload);

      // 2. Register on server
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: normalizedUsername, 
          password, 
          publicKey: pubKeyBase64,
          encryptedPrivateKey,
          keySalt,
          department, 
          role, 
          employeeId: employeeId.trim() 
        }),
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
        // Always normalize the username from the API
        localStorage.setItem('chat_username', data.username.trim().toLowerCase());
        if (data.token) {
          localStorage.setItem('chat_token', data.token);
        }
        router.push('/');
      } else {
        setError(data.message || 'Signup failed');
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
        <h1 className="text-2xl font-bold text-center mb-2 uppercase tracking-widest text-blue-950">Network Clearance</h1>
        <p className="text-slate-500 text-center mb-8 text-sm">Secure registration for authorized personnel.</p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-sm mb-6 text-sm text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Legal Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-slate-900"
              placeholder="e.g. John Doe"
              required
            />
          </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Agency / Bureau</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all appearance-none text-slate-900 text-sm"
                required
              >
                <option value="" className="bg-white text-slate-900">Select...</option>
                <option value="Defense" className="bg-white text-slate-900">Dept. of Defense</option>
                <option value="Intelligence" className="bg-white text-slate-900">Intelligence Bureau</option>
                <option value="Treasury" className="bg-white text-slate-900">Treasury</option>
                <option value="State" className="bg-white text-slate-900">Dept. of State</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Clearance Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all appearance-none text-slate-900 text-sm"
                required
              >
                <option value="" className="bg-white text-slate-900">Select...</option>
                <option value="Director" className="bg-white text-slate-900">Director</option>
                <option value="Field Agent" className="bg-white text-slate-900">Field Agent</option>
                <option value="Analyst" className="bg-white text-slate-900">Analyst</option>
                <option value="Security" className="bg-white text-slate-900">Security Officer</option>
                <option value="Contractor" className="bg-white text-slate-900">Contractor</option>
              </select>
            </div>
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
            {isLoading ? 'Generating Crypto Keys...' : 'Request Access'}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-500 text-xs uppercase tracking-wider">
          Already cleared?{' '}
          <Link href="/login" className="text-blue-700 hover:text-blue-900 transition-colors hover:underline font-bold">
            Secure Login
          </Link>
        </p>
      </div>
    </div>
  );
}
