import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  ShieldCheck,
  MapPin,
  Calendar,
  Edit3,
  Save,
  X,
  RefreshCw,
  LogOut,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Check,
  AlertTriangle,
  Phone,
  Send,
} from 'lucide-react';
import { INDIA_STATES_DATA, ALL_DISTRICTS, NER_STATES } from '../data/indiaLocations';
import {
  UserProfileData,
  restoreSession,
  performLogout,
  setCachedProfile,
  onAuthStateChange,
  getSessionToken,
} from '../services/authService';
import { safeFetchJson } from '../utils/safeFetch';

export interface UserProfileViewProps {
  onNavigateToAccount: () => void;
  onNavigateToRisk?: (district: string) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  onNavigateToAccount,
  onNavigateToRisk,
}) => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editState, setEditState] = useState<string>('Assam');
  const [editDistrict, setEditDistrict] = useState<string>('Kamrup Metropolitan');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Phone verification state for existing users
  const [showPhoneVerify, setShowPhoneVerify] = useState<boolean>(false);
  const [verifyPhoneInput, setVerifyPhoneInput] = useState<string>('');
  const [verifyPhoneOtp, setVerifyPhoneOtp] = useState<string>('');
  const [verifyPhoneSessionId, setVerifyPhoneSessionId] = useState<string>('');
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState<boolean>(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState<boolean>(false);
  const [phoneOtpStep, setPhoneOtpStep] = useState<'ENTER_PHONE' | 'ENTER_OTP'>('ENTER_PHONE');
  const [phoneCooldown, setPhoneCooldown] = useState<number>(0);

  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const timer = setInterval(() => {
      setPhoneCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [phoneCooldown]);

  useEffect(() => {
    loadProfile();
    const unsubscribe = onAuthStateChange(() => {
      loadProfile();
    });
    return () => unsubscribe();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const activeUser = await restoreSession();
      if (activeUser && activeUser.email) {
        setProfile(activeUser);
        setEditName(activeUser.name || '');
        setEditPhone(activeUser.phoneNumber || activeUser.phone || '');
        setEditState(activeUser.state || 'Assam');
        setEditDistrict(activeUser.district || 'Kamrup Metropolitan');
        setVerifyPhoneInput(activeUser.phoneNumber || activeUser.phone || '');
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMobileOtp = async () => {
    const cleanPhone = verifyPhoneInput.replace(/\D/g, '').replace(/^0+/, '');
    const validPhone = cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone;

    if (!validPhone || validPhone.length !== 10) {
      setMessage({ type: 'error', text: 'Please enter a valid 10-digit Indian mobile number.' });
      return;
    }

    setIsSendingPhoneOtp(true);
    setMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const { ok, data, error } = await safeFetchJson<any>('/api/user/phone/send-otp', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: profile?.email,
          phoneNumber: validPhone,
        }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || error || 'Failed to dispatch 2Factor SMS OTP.');
      }

      setVerifyPhoneSessionId(data.sessionId || '');
      setPhoneCooldown(data.cooldownSeconds || 60);
      setPhoneOtpStep('ENTER_OTP');
      setMessage({
        type: 'success',
        text: `SMS OTP dispatched to +91 ${validPhone} via 2Factor SMS gateway!`,
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to send SMS OTP. Please check your mobile number.',
      });
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    const cleanOtp = verifyPhoneOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter the 6-digit numeric OTP received via SMS.' });
      return;
    }

    const cleanPhone = verifyPhoneInput.replace(/\D/g, '').replace(/^0+/, '');
    const validPhone = cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone;

    setIsVerifyingPhoneOtp(true);
    setMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const { ok, data, error } = await safeFetchJson<any>('/api/user/phone/verify-otp', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: profile?.email,
          phoneNumber: validPhone,
          otp: cleanOtp,
          sessionId: verifyPhoneSessionId,
        }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || error || 'SMS OTP verification failed.');
      }

      const updatedProfile: UserProfileData = {
        ...profile!,
        phone: validPhone,
        phoneNumber: validPhone,
        phoneVerified: true,
        phoneVerifiedAt: data.user?.phoneVerifiedAt || new Date().toISOString(),
      };

      setProfile(updatedProfile);
      setCachedProfile(updatedProfile);
      setShowPhoneVerify(false);
      setPhoneOtpStep('ENTER_PHONE');
      setVerifyPhoneOtp('');
      setMessage({
        type: 'success',
        text: 'Mobile number verified successfully via 2Factor! Your account is now dual-verified and eligible for early-warning SMS alerts.',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'SMS OTP verification failed.',
      });
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  const handleEditStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setEditState(newState);
    const districtsForState =
      INDIA_STATES_DATA.find((s) => s.name.toLowerCase() === newState.toLowerCase())
        ?.districts || ALL_DISTRICTS.filter((loc) => loc.state.toLowerCase() === newState.toLowerCase());
    if (districtsForState.length > 0) {
      setEditDistrict(districtsForState[0].name);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.email) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const { ok, data, error } = await safeFetchJson<any>('/api/user/profile', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          email: profile.email,
          name: editName.trim(),
          phoneNumber: editPhone.trim(),
          state: editState.trim(),
          district: editDistrict.trim(),
        }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || error || 'Failed to update user profile in MongoDB.');
      }

      const updated: UserProfileData = {
        ...profile,
        name: data.user?.name ?? editName.trim(),
        phone: data.user?.phone ?? data.user?.phoneNumber ?? editPhone.trim(),
        phoneNumber: data.user?.phoneNumber ?? data.user?.phone ?? editPhone.trim(),
        state: data.user?.state ?? editState.trim(),
        district: data.user?.district ?? editDistrict.trim(),
        phoneVerified: data.user?.phoneVerified !== undefined ? Boolean(data.user.phoneVerified) : profile.phoneVerified,
        phoneVerifiedAt: data.user?.phoneVerifiedAt !== undefined ? data.user.phoneVerifiedAt : profile.phoneVerifiedAt,
        updatedAt: data.user?.updatedAt || new Date().toISOString(),
      };

      setProfile(updated);
      setCachedProfile(updated);
      setIsEditing(false);
      setMessage({
        type: 'success',
        text: 'Profile updated in MongoDB successfully.',
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to save changes.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await performLogout();
    setProfile(null);
    setIsEditing(false);
  };

  const availableEditDistricts =
    INDIA_STATES_DATA.find((s) => s.name.toLowerCase() === editState.toLowerCase())
      ?.districts || ALL_DISTRICTS.filter((loc) => loc.state.toLowerCase() === editState.toLowerCase());

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
        <RefreshCw className="w-6 h-6 text-sky-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Loading User Profile from MongoDB...
        </p>
      </div>
    );
  }

  // Not signed in state
  if (!profile || !profile.email) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-500">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Sign in to view your profile.
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Please sign in with your Name and Mobile number, or Sign Up with Brevo Email OTP and 2Factor SMS OTP.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onNavigateToAccount}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Go to Sign In / Sign Up</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Alert / Notification Messages */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-3 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Banner */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
              <User className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-white">
                  {profile.name || 'Verified Resident'}
                </h1>
                {profile.phoneVerified && (profile.phoneNumber || profile.phone) ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Dual-Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Email Verified &bull; SMS Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 font-mono mt-0.5 flex-wrap">
                <span>{profile.email}</span>
                {profile.phoneNumber && (
                  <>
                    <span>&bull;</span>
                    <span>+91 {profile.phoneNumber}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => {
                  setEditName(profile.name || '');
                  setEditPhone(profile.phoneNumber || '');
                  setEditState(profile.state || 'Assam');
                  setEditDistrict(profile.district || 'Kamrup Metropolitan');
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Sign out of this profile"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {isEditing ? (
            /* Edit Form */
            <form onSubmit={handleSave} className="space-y-4 max-w-lg">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Update Profile Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Updates will be saved directly to your MongoDB resident record.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    State (NER)
                  </label>
                  <select
                    value={editState}
                    onChange={handleEditStateChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                  >
                    {NER_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    District
                  </label>
                  <select
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                  >
                    {availableEditDistricts.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to MongoDB...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Information Grid */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Name */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Full Name
                  </span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">
                    {profile.name || 'Resident'}
                  </span>
                </div>

                {/* 2. Gmail / Email */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Email Address
                  </span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block font-mono truncate">
                    {profile.email}
                  </span>
                </div>

                {/* 3. Mobile Number */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Mobile Number
                    </span>
                    {profile.phoneVerified ? (
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded-full">
                        Verified ✓
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                        Unverified
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">
                    {profile.phoneNumber || profile.phone ? `+91 ${profile.phoneNumber || profile.phone}` : 'Not registered'}
                  </span>
                </div>

                {/* 4. Verification Status */}
                <div
                  className={`p-4 rounded-xl border ${
                    profile.phoneVerified
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <span
                    className={`block text-[11px] font-bold uppercase tracking-wider ${
                      profile.phoneVerified ? 'text-emerald-800' : 'text-amber-800'
                    }`}
                  >
                    Verification Status
                  </span>
                  <div
                    className={`flex items-center gap-1.5 mt-1 text-sm font-bold ${
                      profile.phoneVerified ? 'text-emerald-900' : 'text-amber-900'
                    }`}
                  >
                    {profile.phoneVerified ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Dual Verified (Email & 2Factor SMS)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Email Verified &bull; SMS Inactive</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 5. State */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    State (NER)
                  </span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">
                    {profile.state || 'Assam'}
                  </span>
                </div>

                {/* 6. District */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    District
                  </span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">
                    {profile.district || 'Kamrup Metropolitan'}
                  </span>
                </div>

                {/* 7. Account Created Date */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2 lg:col-span-3">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Account Created Date
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-slate-900">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {profile.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : profile.verifiedAt
                        ? new Date(profile.verifiedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>

              {/* UNVERIFIED MOBILE WARNING BANNER (For users migrated from older schema) */}
              {!profile.phoneVerified && !showPhoneVerify && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">
                        2Factor SMS Verification Required
                      </h4>
                      <p className="text-xs text-amber-800/90 mt-0.5">
                        Your account was verified via Email only. To enable early warning SMS disaster broadcasts from Brahmaputra Flood Warning System, verify your Indian mobile number via 2Factor OTP.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyPhoneInput(profile.phoneNumber || profile.phone || '');
                      setPhoneOtpStep('ENTER_PHONE');
                      setShowPhoneVerify(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Verify Mobile for SMS</span>
                  </button>
                </div>
              )}

              {/* MOBILE 2FACTOR VERIFICATION MODAL / PANEL */}
              {showPhoneVerify && (
                <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-sky-200/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          2Factor SMS OTP Verification
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Verify your mobile number to receive live emergency warning SMS alerts.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPhoneVerify(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {phoneOtpStep === 'ENTER_PHONE' ? (
                    <div className="space-y-3 max-w-md">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          10-Digit Mobile Number (India +91)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            +91
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            value={verifyPhoneInput}
                            onChange={(e) => setVerifyPhoneInput(e.target.value.replace(/\D/g, ''))}
                            placeholder="9876543210"
                            className="w-full pl-12 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono tracking-wider focus:outline-none focus:border-sky-600 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSendMobileOtp}
                          disabled={isSendingPhoneOtp || verifyPhoneInput.length < 10}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSendingPhoneOtp ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Dispatching 2Factor OTP...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send 2Factor SMS OTP</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPhoneVerify(false)}
                          className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 max-w-md">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Enter 6-Digit SMS OTP
                          </label>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Sent to +91 {verifyPhoneInput}
                          </span>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          value={verifyPhoneOtp}
                          onChange={(e) => setVerifyPhoneOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono tracking-widest text-slate-900 focus:outline-none focus:border-sky-600 transition-colors text-center"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={handleVerifyMobileOtp}
                          disabled={isVerifyingPhoneOtp || verifyPhoneOtp.length < 6}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isVerifyingPhoneOtp ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Verifying 2Factor OTP...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify & Save Mobile</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleSendMobileOtp}
                          disabled={isSendingPhoneOtp || phoneCooldown > 0}
                          className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {phoneCooldown > 0 ? `Resend in ${phoneCooldown}s` : 'Resend SMS OTP'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setPhoneOtpStep('ENTER_PHONE')}
                          className="px-3 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                        >
                          Change Number
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Bar */}
              <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100">
                {onNavigateToRisk && (
                  <button
                    type="button"
                    onClick={() => onNavigateToRisk(profile.district)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>View {profile.district} Risk Monitor</span>
                  </button>
                )}

                {!profile.phoneVerified && (
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyPhoneInput(profile.phoneNumber || profile.phone || '');
                      setPhoneOtpStep('ENTER_PHONE');
                      setShowPhoneVerify(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Verify Mobile for SMS</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditName(profile.name || '');
                    setEditPhone(profile.phoneNumber || profile.phone || '');
                    setEditState(profile.state || 'Assam');
                    setEditDistrict(profile.district || 'Kamrup Metropolitan');
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Profile Details</span>
                </button>

                <button
                  type="button"
                  onClick={loadProfile}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
