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

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    businessGroup: '',
    account: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signup, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email.endsWith('@tcs.com')) {
      setError('Please use your official TCS email address (@tcs.com)');
      return;
    }
    if (!/^[A-Z0-9]{5,12}$/i.test(formData.employeeId)) {
      setError('Employee ID must be 5–12 alphanumeric characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    const res = await signup(formData.email, formData.password, {
      name: formData.name,
      employeeId: formData.employeeId,
      businessGroup: formData.businessGroup,
      account: formData.account,
    });
    if (res && res.success === false) {
      setError(res.message || 'Error creating account');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border" role="status" style={{ color: 'rgb(26, 127, 55)' }}><span className="visually-hidden">Loading…</span></div>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh', padding: '32px 0' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>

        {/* Header */}
        <div className="text-center" style={{ marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'rgb(26, 127, 55)',
            borderRadius: '14px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
            fontSize: '1.6rem', fontWeight: 900, color: '#fff',
            boxShadow: '0 8px 24px rgba(26,127,55,0.35)',
          }}>
            T
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '6px', color: 'var(--text-primary)' }}>
            Join TCS MaturityIQ
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            Register with your TCS credentials to begin your AI maturity assessment
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '32px' }}>
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert" style={{ fontSize: '0.88rem', borderRadius: '10px' }}>
              <span className="material-icons" style={{ fontSize: '1.2rem' }}>warning</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Row 1: Full Name */}
            <div className="mb-3">
              <label htmlFor="signup-name" className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Full Name <span style={{ color: 'rgb(26, 127, 55)' }}>*</span>
              </label>
              <input
                type="text" id="signup-name" name="name"
                className="form-control"
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={handleChange}
                required autoComplete="name"
              />
            </div>

            {/* Row 2: TCS Email */}
            <div className="mb-3">
              <label htmlFor="signup-email" className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                TCS Email Address <span style={{ color: 'rgb(26, 127, 55)' }}>*</span>
              </label>
              <input
                type="email" id="signup-email" name="email"
                className="form-control"
                placeholder="firstname.lastname@tcs.com"
                value={formData.email}
                onChange={handleChange}
                required autoComplete="email"
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Must be a valid @tcs.com email</div>
            </div>

            {/* Row 3: Employee ID + Business Group side by side */}
            <div className="row g-3 mb-3">
              <div className="col-md-5">
                <label htmlFor="signup-empid" className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Employee ID <span style={{ color: 'rgb(26, 127, 55)' }}>*</span>
                </label>
                <input
                  type="text" id="signup-empid" name="employeeId"
                  className="form-control"
                  placeholder="e.g. 1234567"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required maxLength={12}
                />
              </div>
              <div className="col-md-7">
                <label htmlFor="signup-bg" className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Business Group <span style={{ color: 'rgb(26, 127, 55)' }}>*</span>
                </label>
                <select
                  id="signup-bg" name="businessGroup"
                  className="form-select"
                  value={formData.businessGroup}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Business Group</option>
                  {TCS_BUSINESS_GROUPS.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Account */}
            <div className="mb-3">
              <label htmlFor="signup-account" className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Account / Client Name <span style={{ color: 'rgb(26, 127, 55)' }}>*</span>
              </label>
              <input
                type="text" id="signup-account" name="account"
                className="form-control"
                placeholder="e.g. JP Morgan, Walgreens, ABN AMRO"
                value={formData.account}
                onChange={handleChange}
                required
              />
            </div>

            {/* Row 5 & 6: Password fields */}
            <div className="mb-3">
              <label htmlFor="signup-password" className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Password <span style={{ color: 'rgb(26, 127, 55)' }}>*</span>
              </label>
              <input
                type="password" id="signup-password" name="password"
                className="form-control"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleChange}
                required autoComplete="new-password"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="signup-confirm" className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Confirm Password <span style={{ color: 'rgb(26, 127, 55)' }}>*</span>
              </label>
              <input
                type="password" id="signup-confirm" name="confirmPassword"
                className="form-control"
                placeholder="Repeat your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn-premium w-100 justify-content-center"
              style={{ padding: '12px', fontSize: '0.95rem', background: 'rgb(26, 127, 55)', borderColor: 'rgb(26, 127, 55)' }}
              disabled={submitting}
            >
              {submitting
                ? <><span className="spinner-border spinner-border-sm me-2" role="status" />Creating account…</>
                : <><span className="material-icons" style={{ fontSize: '1.1rem' }}>how_to_reg</span> Create Account</>}
            </button>
          </form>

          <p className="text-center mt-4 mb-0" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'rgb(26, 127, 55)', fontWeight: 700 }}>Sign in</Link>
          </p>
        </div>

        <p className="text-center mt-4" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          By creating an account you agree to use TCS MaturityIQ for authorised assessment purposes only.
        </p>
      </div>
    </div>
  );
}
