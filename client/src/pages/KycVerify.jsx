import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const KycVerify = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states tracking database table definitions
  const [formData, setFormData] = useState({
    phoneNumber: '',
    address: '',
    panNumber: '',
    bankAccountNo: '',
    ifscCode: '',
    bankName: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Dispatches metadata payload directly to our onboarding route group
      const response = await api.post('/kyc/verify', formData);
      
      // Update our global state tracking context with the backend row update
      setUser(response.data.user);
      
      // Push straight into live trading workspace
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification timed out. Check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
        
        <div className="mb-6">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Complete Account Setup</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            As a platform for trading, we require valid Indian legal documentation and account hooks to provision your Demat ledger rows.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-800 text-red-400 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section A: National Identity Records */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">1. Identity Verification (KYC)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Mobile Number</label>
                <input type="text" name="phoneNumber" required placeholder="e.g. +919876543210" className="mt-1 block w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono shadow-inner transition-shadow" value={formData.phoneNumber} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Permanent Account Number (PAN)</label>
                <input type="text" name="panNumber" required placeholder="ABCDE1234F" className="mt-1 block w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm uppercase font-mono shadow-inner transition-shadow" value={formData.panNumber} onChange={handleChange} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Residential Address</label>
                <input type="text" name="address" required placeholder="Flat, Street, Area City, State" className="mt-1 block w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm shadow-inner transition-shadow" value={formData.address} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Section B: Banking Infrastructure Hooks */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">2. Bank Clearing Connection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Bank Name</label>
                <input type="text" name="bankName" required placeholder="e.g. State Bank of India" className="mt-1 block w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm shadow-inner transition-shadow" value={formData.bankName} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Bank Account Number</label>
                <input type="text" name="bankAccountNo" required placeholder="91827364554" className="mt-1 block w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono shadow-inner transition-shadow" value={formData.bankAccountNo} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">IFSC Code</label>
                <input type="text" name="ifscCode" required placeholder="SBIN0001234" className="mt-1 block w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm uppercase font-mono shadow-inner transition-shadow" value={formData.ifscCode} onChange={handleChange} />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-colors shadow-sm"
          >
            {loading ? 'Processing Document Attestations...' : 'Submit Verification Profiles'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default KycVerify;