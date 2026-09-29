'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';

const TCS_BUSINESS_GROUPS = [
  'BFSI (Banking, Financial Services & Insurance)',
  'LSHCERU (Life Sciences, Healthcare, Energy, Resources & Utilities)',
  'Manufacturing',
  'Retail & Consumer Business',
  'Communications, Media & Technology',
  'Hi-Tech',
  'Travel & Logistics',
  'Public Services & Government',
  'iON (Small & Medium Business)',
  'TCS Interactive',
  'Quartz (Blockchain & Crypto)',
  'Ignio (AI/ML Division)',
  'Other',
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessGroup, setBusinessGroup] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin' || user.email === 'admin@sdlc.com') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    // Build full email: if user typed just the local part, append domain
    const fullEmail = email.includes('@') ? email : `${email}@tcs.com`;

    const res = await login(fullEmail, password);
    if (res && res.success === false) {
      setError(res.message || 'Invalid credentials');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border" role="status" style={{ color: 'rgb(26, 127, 55)' }}>
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '75vh', padding: '24px 0' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Header */}
        <div className="text-center" style={{ marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'rgb(26, 127, 55)',
            borderRadius: '14px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
            fontSize: '1.6rem', fontWeight: 900, color: '#fff',
            boxShadow: '0 8px 24px rgba(26,127,55,0.35)',
          }}>
            Σ
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px', color: 'var(--text-primary)' }}>
            Sign in to TCS MaturityIQ
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            Use your TCS credentials to access your dashboard
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert" style={{ fontSize: '0.88rem', borderRadius: '10px' }}>
              <span className="material-icons" style={{ fontSize: '1.2rem', verticalAlign: 'middle' }}>warning</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* TCS Email field */}
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Email Address</label>
              <input
                type="text"
                id="login-email"
                className="form-control"
                placeholder="firstname.lastname or full email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Enter your TCS email or just the local part (e.g. <em>john.doe</em>)
              </div>
            </div>

            {/* Business Group selector */}
            <div className="mb-3">
              <label htmlFor="login-bg" className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Business Group
              </label>
              <select
                id="login-bg"
                className="form-select"
                value={businessGroup}
                onChange={e => setBusinessGroup(e.target.value)}
                style={{ fontSize: '0.9rem' }}
              >
                <option value="">Select Business Group</option>
                {TCS_BUSINESS_GROUPS.map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div className="mb-4">
              <label htmlFor="login-password" className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Password</label>
              <input
                type="password"
                id="login-password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn-premium w-100 justify-content-center"
              style={{ padding: '12px', fontSize: '0.95rem', background: 'rgb(26, 127, 55)', borderColor: 'rgb(26, 127, 55)' }}
              disabled={submitting}
            >
              {submitting ? (
                <><span className="spinner-border spinner-border-sm me-2" role="status" />Signing in…</>
              ) : (
                <><span className="material-icons" style={{ fontSize: '1.1rem' }}>login</span> Sign in</>
              )}
            </button>
          </form>

          <p className="text-center mt-4 mb-0" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: 'rgb(26, 127, 55)', fontWeight: 700 }}>
              Create account
            </Link>
          </p>
        </div>

        <p className="text-center mt-4" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          By signing in you agree to use TCS MaturityIQ for authorised assessment purposes only.
        </p>
      </div>
    </div>
  );
}
