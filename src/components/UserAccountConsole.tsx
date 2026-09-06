import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  KeyRound,
  ShieldAlert,
  MapPin,
  Calendar,
  Save,
  X,
  LogOut,
  User,
  Edit3,
  UserPlus,
  LogIn,
  Smartphone,
  PhoneCall,
  Check,
  CheckCircle,
  Phone,
} from 'lucide-react';
import { INDIA_STATES_DATA, ALL_DISTRICTS, NER_STATES } from '../data/indiaLocations';
import {
  UserProfileData,
  restoreSession,
  performLogout,
  setSessionToken,
  setCachedProfile,
  onAuthStateChange,
  getSessionToken,
  getCachedProfile,
} from '../services/authService';
import { normalizeCanonicalPhone } from '../utils/phoneNormalizer';
import { safeFetchJson } from '../utils/safeFetch';

interface UserAccountConsoleProps {
  onNavigateToRisk?: (district?: string) => void;
}

interface ServiceStatus {
  emailApi: 'SUCCESS' | 'FAILED' | 'CHECKING';
  smsApi: 'SUCCESS' | 'FAILED' | 'CHECKING';
  emailError?: string;
  smsError?: string;
  smsBalance?: string;
}

export const UserAccountConsole: React.FC<UserAccountConsoleProps> = ({ onNavigateToRisk }) => {
  // Auth Mode: 'signin' (existing user) or 'signup' (new user)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  // Registration Form States
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('Assam');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Kamrup Metropolitan');

  // Sign In Form States (Name + Mobile Number, No OTP)
  const [loginName, setLoginName] = useState<string>('');
  const [loginPhone, setLoginPhone] = useState<string>('');

  // Dual Verification States (Sign Up)
  const [emailOtp, setEmailOtp] = useState<string>('');
  const [smsOtp, setSmsOtp] = useState<string>('');
  const [smsSessionId, setSmsSessionId] = useState<string>('');
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(false);

  // Verification Step Management: 'ENTER_DETAILS' | 'VERIFY_DUAL' | 'VERIFIED'
  const [verifiedProfile, setVerifiedProfile] = useState<UserProfileData | null>(() => getCachedProfile());
  const [step, setStep] = useState<'ENTER_DETAILS' | 'VERIFY_DUAL' | 'VERIFIED'>(() => {
    const cached = getCachedProfile();
    return cached && cached.email ? 'VERIFIED' : 'ENTER_DETAILS';
  });

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(() => getCachedProfile()?.name || '');
  const [editPhone, setEditPhone] = useState<string>(() => getCachedProfile()?.phoneNumber || '');
  const [editState, setEditState] = useState<string>(() => getCachedProfile()?.state || 'Assam');
  const [editDistrict, setEditDistrict] = useState<string>(() => getCachedProfile()?.district || 'Kamrup Metropolitan');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Cooldown & Loading States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState<boolean>(false);
  const [isVerifyingSms, setIsVerifyingSms] = useState<boolean>(false);
  const [isFinalizingSignup, setIsFinalizingSignup] = useState<boolean>(false);
  const [emailCooldown, setEmailCooldown] = useState<number>(0);
  const [smsCooldown, setSmsCooldown] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Add/Verify Mobile for existing account
  const [showAddPhone, setShowAddPhone] = useState<boolean>(false);
  const [addPhoneInput, setAddPhoneInput] = useState<string>('');
  const [addPhoneOtp, setAddPhoneOtp] = useState<string>('');
  const [addPhoneSessionId, setAddPhoneSessionId] = useState<string>('');
  const [isSendingAddPhoneOtp, setIsSendingAddPhoneOtp] = useState<boolean>(false);
  const [isVerifyingAddPhoneOtp, setIsVerifyingAddPhoneOtp] = useState<boolean>(false);
  const [addPhoneStep, setAddPhoneStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [addPhoneCooldown, setAddPhoneCooldown] = useState<number>(0);

  // API Status States
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    emailApi: 'CHECKING',
    smsApi: 'CHECKING',
  });
  const [isTestingDelivery, setIsTestingDelivery] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; id?: string } | null>(null);

  // Cooldown timers
  useEffect(() => {
    if (emailCooldown <= 0 && smsCooldown <= 0 && addPhoneCooldown <= 0) return;
    const timer = setInterval(() => {
      setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setSmsCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setAddPhoneCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCooldown, smsCooldown, addPhoneCooldown]);

  // Check API statuses and sync profile from MongoDB on mount
  useEffect(() => {
    checkServicesStatus();
    syncUserProfileFromMongo();

    const unsubscribe = onAuthStateChange(() => {
      const active = getCachedProfile();
      if (active && active.email) {
        setVerifiedProfile(active);
        setEditName(active.name);
        setEditPhone(active.phoneNumber || '');
        setEditState(active.state);
        setEditDistrict(active.district);
        setStep('VERIFIED');
      } else {
        setVerifiedProfile(null);
        setStep('ENTER_DETAILS');
      }
    });

    return () => unsubscribe();
  }, []);

  const syncUserProfileFromMongo = async () => {
    try {
      const activeUser = await restoreSession();
      if (activeUser && activeUser.email) {
        setVerifiedProfile(activeUser);
        setEditName(activeUser.name || '');
        setEditPhone(activeUser.phoneNumber || '');
        setEditState(activeUser.state || 'Assam');
        setEditDistrict(activeUser.district || 'Kamrup Metropolitan');
        setStep('VERIFIED');
      }
    } catch {
      // Ignore background sync errors
    }
  };

  const checkServicesStatus = async () => {
    try {
      const [emailFetch, smsFetch] = await Promise.all([
        safeFetchJson<any>('/api/email/status'),
        safeFetchJson<any>('/api/sms/status'),
      ]);

      const emailData = emailFetch.ok && emailFetch.data ? emailFetch.data : { success: false };
      const smsData = smsFetch.ok && smsFetch.data ? smsFetch.data : { success: false };

      setServiceStatus({
        emailApi: emailData.success ? 'SUCCESS' : 'FAILED',
        emailError: emailData.error,
        smsApi: smsData.success ? 'SUCCESS' : 'FAILED',
        smsError: smsData.error,
        smsBalance: smsData.balance,
      });
    } catch {
      setServiceStatus({
        emailApi: 'FAILED',
        smsApi: 'FAILED',
      });
    }
  };

  // Get districts for currently selected state
  const availableDistricts =
    INDIA_STATES_DATA.find((s) => s.name.toLowerCase() === selectedState.toLowerCase())
      ?.districts || ALL_DISTRICTS.filter((loc) => loc.state.toLowerCase() === selectedState.toLowerCase());

  const availableEditDistricts =
    INDIA_STATES_DATA.find((s) => s.name.toLowerCase() === editState.toLowerCase())
      ?.districts || ALL_DISTRICTS.filter((loc) => loc.state.toLowerCase() === editState.toLowerCase());

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setSelectedState(newState);
    const districtsForState =
      INDIA_STATES_DATA.find((s) => s.name.toLowerCase() === newState.toLowerCase())
        ?.districts || ALL_DISTRICTS.filter((loc) => loc.state.toLowerCase() === newState.toLowerCase());
    if (districtsForState.length > 0) {
      setSelectedDistrict(districtsForState[0].name);
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

  // -------------------------------------------------------------
  // SIGN UP: Step 1 - Initiate Dual Verification (Email + SMS)
  // -------------------------------------------------------------
  const handleInitiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    const cleanName = name.trim();

    if (!cleanName) {
      setStatusMessage({ type: 'error', text: 'Please enter your Full Name.' });
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid Gmail / Email address.' });
      return;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 10-digit Indian mobile number.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setIsEmailVerified(false);
    setIsPhoneVerified(false);
    setEmailOtp('');
    setSmsOtp('');

    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/auth/signup/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phoneNumber: cleanPhone,
          state: selectedState,
          district: selectedDistrict,
        }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || data?.error || error || 'Failed to dispatch verification codes.');
      }

      if (data.smsSessionId) {
        setSmsSessionId(data.smsSessionId);
      }
      setEmailCooldown(data.cooldownSeconds || 60);
      setSmsCooldown(data.cooldownSeconds || 60);
      setStep('VERIFY_DUAL');
      setStatusMessage({
        type: 'success',
        text: `Verification codes dispatched! Please verify both Email OTP (Brevo) and SMS OTP (2Factor).`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Unable to start dual verification. Please check credentials.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // SIGN UP: Step 2a - Verify Email OTP (Brevo)
  // -------------------------------------------------------------
  const handleVerifyEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanOtp = emailOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setStatusMessage({ type: 'error', text: 'Please enter the 6-digit numeric Email OTP.' });
      return;
    }

    setIsVerifyingEmail(true);
    setStatusMessage(null);

    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: cleanOtp,
        }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || error || 'Invalid email verification code.');
      }

      setIsEmailVerified(true);
      setStatusMessage({
        type: 'success',
        text: 'Email address verified successfully!',
      });

      // If mobile is already verified, trigger completion
      if (isPhoneVerified) {
        completeSignupFlow(true, true);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Email OTP verification failed.',
      });
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // -------------------------------------------------------------
  // SIGN UP: Step 2b - Verify SMS OTP (2Factor)
  // -------------------------------------------------------------
  const handleVerifySmsOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanOtp = smsOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setStatusMessage({ type: 'error', text: 'Please enter the 6-digit numeric SMS OTP.' });
      return;
    }

    if (!smsSessionId) {
      setStatusMessage({ type: 'error', text: 'SMS session expired. Please resend the SMS OTP.' });
      return;
    }

    setIsVerifyingSms(true);
    setStatusMessage(null);

    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/auth/verify-sms-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: smsSessionId,
          otp: cleanOtp,
          phoneNumber: phoneNumber.trim(),
        }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || error || 'Invalid SMS verification code.');
      }

      setIsPhoneVerified(true);
      setStatusMessage({
        type: 'success',
        text: 'Mobile number verified successfully via 2Factor SMS!',
      });

      // If email is already verified, trigger completion
      if (isEmailVerified) {
        completeSignupFlow(true, true);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'SMS OTP verification failed.',
      });
    } finally {
      setIsVerifyingSms(false);
    }
  };

  // Resend Email OTP
  const handleResendEmailOtp = async () => {
    if (emailCooldown > 0) return;
    setStatusMessage(null);
    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          state: selectedState,
          district: selectedDistrict,
        }),
      });
      if (!ok || !data?.success) {
        throw new Error(data?.message || error || 'Failed to resend email code.');
      }
      setEmailCooldown(60);
      setStatusMessage({ type: 'success', text: `New email OTP sent to ${email.trim()}.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to resend email code.' });
    }
  };

  // Resend SMS OTP
  const handleResendSmsOtp = async () => {
    if (smsCooldown > 0) return;
    setStatusMessage(null);
    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/auth/send-sms-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
        }),
      });
      if (!ok || !data?.success) {
        throw new Error(data?.message || error || 'Failed to resend SMS code.');
      }
      if (data.sessionId) setSmsSessionId(data.sessionId);
      setSmsCooldown(60);
      setStatusMessage({ type: 'success', text: `New SMS OTP sent to ${phoneNumber.trim()} via 2Factor.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to resend SMS code.' });
    }
  };

  // -------------------------------------------------------------
  // SIGN UP: Step 3 - Finalize Dual-Verified Account
  // -------------------------------------------------------------
  const completeSignupFlow = async (emailConfirmed = isEmailVerified, phoneConfirmed = isPhoneVerified) => {
    if (!emailConfirmed || !phoneConfirmed) {
      setStatusMessage({ type: 'error', text: 'Both Email and Mobile must be verified before finalizing registration.' });
      return;
    }

    setIsFinalizingSignup(true);
    setStatusMessage(null);

    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/auth/signup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phoneNumber: phoneNumber.trim(),
          state: selectedState,
          district: selectedDistrict,
          emailSessionVerified: true,
          smsSessionVerified: true,
        }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || error || 'Failed to complete registration.');
      }

      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
      }

      const newProfile: UserProfileData = {
        id: data.user?.id,
        name: data.user?.name || name.trim(),
        email: data.user?.email || email.trim().toLowerCase(),
        phoneNumber: data.user?.phoneNumber || phoneNumber.trim(),
        state: data.user?.state || selectedState,
        district: data.user?.district || selectedDistrict,
        isVerified: true,
        emailVerified: true,
        phoneVerified: true,
        verifiedAt: data.user?.verifiedAt || new Date().toISOString(),
        createdAt: data.user?.createdAt || new Date().toISOString(),
      };

      setVerifiedProfile(newProfile);
      setEditName(newProfile.name);
      setEditPhone(newProfile.phoneNumber || '');
      setEditState(newProfile.state);
      setEditDistrict(newProfile.district);
      setCachedProfile(newProfile);
      setStep('VERIFIED');
      setStatusMessage({
        type: 'success',
        text: `Account created successfully! Dual verification complete for ${newProfile.name} in ${newProfile.district}, ${newProfile.state}.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to activate verified account.',
      });
    } finally {
      setIsFinalizingSignup(false);
    }
  };

  // -------------------------------------------------------------
  // LOGIN (SIGN IN): Direct Login with Name + Mobile Number (NO OTP)
  // -------------------------------------------------------------
  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = loginName.trim();
    const phoneNorm = normalizeCanonicalPhone(loginPhone);

    if (!cleanName) {
      setStatusMessage({ type: 'error', text: 'Please enter your registered Name.' });
      return;
    }
    if (!phoneNorm.isValid) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 10-digit Indian mobile number.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          phoneNumber: phoneNorm.canonical,
        }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || data?.error || error || 'Login failed. Please check your credentials.');
      }

      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
      }

      const loggedProfile: UserProfileData = {
        id: data.user?.id,
        name: data.user?.name ?? cleanName,
        email: data.user?.email,
        phone: data.user?.phone || data.user?.phoneNumber || phoneNorm.canonical,
        phoneNumber: data.user?.phoneNumber || data.user?.phone || phoneNorm.canonical,
        state: data.user?.state || 'Assam',
        district: data.user?.district || 'Kamrup Metropolitan',
        isVerified: data.user?.isVerified ?? true,
        emailVerified: data.user?.emailVerified ?? true,
        emailVerifiedAt: data.user?.emailVerifiedAt,
        phoneVerified: Boolean(data.user?.phoneVerified),
        phoneVerifiedAt: data.user?.phoneVerifiedAt,
        verifiedAt: data.user?.verifiedAt,
        createdAt: data.user?.createdAt,
        updatedAt: data.user?.updatedAt,
      };

      setVerifiedProfile(loggedProfile);
      setEditName(loggedProfile.name);
      setEditPhone(loggedProfile.phoneNumber || '');
      setEditState(loggedProfile.state);
      setEditDistrict(loggedProfile.district);
      setCachedProfile(loggedProfile);
      setStep('VERIFIED');
      setStatusMessage({
        type: 'success',
        text: `Welcome back, ${loggedProfile.name}! Logged in successfully with registered mobile number.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Login failed. Please confirm your registered name and mobile number.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // PROFILE: Save updates to MongoDB
  // -------------------------------------------------------------
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedProfile?.email) return;

    setIsSavingProfile(true);
    setStatusMessage(null);

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
          email: verifiedProfile.email,
          name: editName.trim(),
          phoneNumber: editPhone.trim(),
          state: editState.trim(),
          district: editDistrict.trim(),
        }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || error || 'Failed to update profile in database.');
      }

      const updatedProfile: UserProfileData = {
        ...verifiedProfile,
        name: data.user?.name ?? editName.trim(),
        phoneNumber: data.user?.phoneNumber ?? editPhone.trim(),
        state: data.user?.state ?? editState.trim(),
        district: data.user?.district ?? editDistrict.trim(),
        phoneVerified: data.user?.phoneVerified ?? false,
      };

      setVerifiedProfile(updatedProfile);
      setCachedProfile(updatedProfile);
      setIsEditingProfile(false);
      setStatusMessage({
        type: 'success',
        text: 'Profile details updated and saved to MongoDB successfully.' +
          (!updatedProfile.phoneVerified ? ' Note: Changed mobile number requires SMS verification.' : ''),
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save changes to profile.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // -------------------------------------------------------------
  // EXISTING USER: Send SMS OTP for mobile verification
  // -------------------------------------------------------------
  const handleSendExistingUserMobileOtp = async () => {
    const cleanPhone = addPhoneInput.replace(/\D/g, '').replace(/^0+/, '');
    const validPhone = cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone;

    if (!validPhone || validPhone.length !== 10) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 10-digit Indian mobile number.' });
      return;
    }

    setIsSendingAddPhoneOtp(true);
    setStatusMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const { ok, data, error } = await safeFetchJson<any>('/api/user/phone/send-otp', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: verifiedProfile?.email,
          phoneNumber: validPhone,
        }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || error || 'Failed to dispatch SMS OTP.');
      }

      setAddPhoneSessionId(data.sessionId || '');
      setAddPhoneCooldown(data.cooldownSeconds || 60);
      setAddPhoneStep('OTP');
      setStatusMessage({
        type: 'success',
        text: `SMS OTP dispatched to +91 ${validPhone} via 2Factor!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to send SMS OTP.',
      });
    } finally {
      setIsSendingAddPhoneOtp(false);
    }
  };

  // -------------------------------------------------------------
  // EXISTING USER: Verify SMS OTP for mobile verification
  // -------------------------------------------------------------
  const handleVerifyExistingUserMobileOtp = async () => {
    const cleanOtp = addPhoneOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setStatusMessage({ type: 'error', text: 'Please enter the 6-digit numeric SMS OTP.' });
      return;
    }

    const cleanPhone = addPhoneInput.replace(/\D/g, '').replace(/^0+/, '');
    const validPhone = cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone;

    setIsVerifyingAddPhoneOtp(true);
    setStatusMessage(null);

    try {
      const token = getSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const { ok, data, error } = await safeFetchJson<any>('/api/user/phone/verify-otp', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: verifiedProfile?.email,
          phoneNumber: validPhone,
          otp: cleanOtp,
          sessionId: addPhoneSessionId,
        }),
      });

      if (!ok || !data?.success) {
        throw new Error(data?.message || error || 'SMS OTP verification failed.');
      }

      const updated: UserProfileData = {
        ...verifiedProfile!,
        phone: validPhone,
        phoneNumber: validPhone,
        phoneVerified: true,
        phoneVerifiedAt: data.user?.phoneVerifiedAt || new Date().toISOString(),
      };

      setVerifiedProfile(updated);
      setCachedProfile(updated);
      setShowAddPhone(false);
      setAddPhoneStep('INPUT');
      setAddPhoneOtp('');
      setStatusMessage({
        type: 'success',
        text: 'Mobile verified successfully via 2Factor! Your account is now dual-verified and eligible for SMS alerts.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to verify SMS OTP.',
      });
    } finally {
      setIsVerifyingAddPhoneOtp(false);
    }
  };

  // -------------------------------------------------------------
  // SIGN OUT
  // -------------------------------------------------------------
  const handleSignOut = async () => {
    await performLogout();
    setVerifiedProfile(null);
    setStep('ENTER_DETAILS');
    setEmailOtp('');
    setSmsOtp('');
    setIsEmailVerified(false);
    setIsPhoneVerified(false);
    setStatusMessage({
      type: 'info',
      text: 'Signed out securely.',
    });
  };

  // Diagnostic Test Email
  const handleRunTestEmail = async () => {
    setIsTestingDelivery(true);
    setTestResult(null);
    const targetEmail = email.trim() || verifiedProfile?.email || 'gaurxmratunjay@gmail.com';

    try {
      const res = await fetch('/api/email/test-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: targetEmail,
          recipientName: name.trim() || verifiedProfile?.name || 'NER-SAFE Verifier',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Test email delivery failed.');
      }

      setTestResult({
        success: true,
        message: `Test email dispatched to ${targetEmail} via Brevo!`,
        id: data.messageId,
      });
      checkServicesStatus();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Test email delivery failed.',
      });
    } finally {
      setIsTestingDelivery(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  NER-SAFE Account & Authentication
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Dual-Verified &bull; MongoDB
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sign in with your Name & Mobile, or Sign Up with Brevo Email OTP and 2Factor SMS OTP.
              </p>
            </div>
          </div>

          {/* Service Integration Status Pills */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Brevo Pill */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px]">
              <div
                className={`w-2 h-2 rounded-full ${
                  serviceStatus.emailApi === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className="font-semibold text-slate-700">Brevo:</span>
              <span className={serviceStatus.emailApi === 'SUCCESS' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                {serviceStatus.emailApi === 'SUCCESS' ? 'READY' : 'OFFLINE'}
              </span>
            </div>

            {/* 2Factor Pill */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-[11px]">
              <div
                className={`w-2 h-2 rounded-full ${
                  serviceStatus.smsApi === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className="font-semibold text-slate-700">2Factor SMS:</span>
              <span className={serviceStatus.smsApi === 'SUCCESS' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                {serviceStatus.smsApi === 'SUCCESS' ? 'READY' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics / Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Brevo Email */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Email Verification</div>
            <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <span>Brevo Active</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-[10px] text-slate-500">6-digit OTP &bull; Transactional Email</div>
          </div>
        </div>

        {/* Metric 2: 2Factor SMS */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Mobile Verification</div>
            <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <span>2Factor SMS Active</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-[10px] text-slate-500">Real SMS OTP &bull; Cellular Delivery</div>
          </div>
        </div>

        {/* Metric 3: Fast Test */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Service Diagnostics</div>
            <button
              onClick={checkServicesStatus}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              title="Refresh status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={handleRunTestEmail}
            disabled={isTestingDelivery}
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isTestingDelivery ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Test Email Dispatch</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Result Alert */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-bold">{testResult.message}</p>
            {testResult.id && (
              <p className="text-[11px] font-mono text-emerald-700">Message ID: {testResult.id}</p>
            )}
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <p className="font-semibold">{statusMessage.text}</p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. VERIFIED USER PROFILE VIEW                            */}
      {/* ======================================================== */}
      {step === 'VERIFIED' && verifiedProfile ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
                <User className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    {verifiedProfile.name || 'Verified Resident'}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Dual Verified (Email & Mobile)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300 font-mono mt-0.5">
                  <span>{verifiedProfile.email}</span>
                  {verifiedProfile.phoneNumber && (
                    <>
                      <span>&bull;</span>
                      <span>+91 {verifiedProfile.phoneNumber}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditingProfile ? (
                <button
                  onClick={() => {
                    setEditName(verifiedProfile.name || '');
                    setEditPhone(verifiedProfile.phoneNumber || '');
                    setEditState(verifiedProfile.state || 'Assam');
                    setEditDistrict(verifiedProfile.district || 'Kamrup Metropolitan');
                    setIsEditingProfile(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Sign out from this session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {isEditingProfile ? (
              /* Edit Form */
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Update Profile Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modifications will be saved to your MongoDB user record.
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
                    placeholder="Enter your full name"
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
                    placeholder="e.g. 9876543210"
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
                    disabled={isSavingProfile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
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
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* Profile Details View */
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Name */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Full Name
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-1 block">
                      {verifiedProfile.name || 'Verified Resident'}
                    </span>
                  </div>

                  {/* Email */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Email Address
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">
                      {verifiedProfile.email}
                    </span>
                  </div>

                  {/* Mobile */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Mobile Number
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">
                      {verifiedProfile.phoneNumber ? `+91 ${verifiedProfile.phoneNumber}` : 'Not registered'}
                    </span>
                  </div>

                  {/* Dual Verification Status */}
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
                    <span className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      Verification Status
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 text-sm font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Dual-Verified (Brevo & 2Factor)</span>
                    </div>
                  </div>

                  {/* State */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      State (NER)
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-1 block">
                      {verifiedProfile.state || 'Assam'}
                    </span>
                  </div>

                  {/* District */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      District
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-1 block">
                      {verifiedProfile.district || 'Kamrup Metropolitan'}
                    </span>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100">
                  {onNavigateToRisk && (
                    <button
                      type="button"
                      onClick={() => onNavigateToRisk(verifiedProfile.district)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Monitor {verifiedProfile.district} Risk</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setEditName(verifiedProfile.name || '');
                      setEditPhone(verifiedProfile.phoneNumber || '');
                      setEditState(verifiedProfile.state || 'Assam');
                      setEditDistrict(verifiedProfile.district || 'Kamrup Metropolitan');
                      setIsEditingProfile(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Update Name & Location</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 2. SIGN IN & SIGN UP WITH DUAL VERIFICATION FLOW        */
        /* ======================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Top Switcher */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {step === 'ENTER_DETAILS' ? (
              <div className="flex items-center p-1 bg-slate-200/80 rounded-xl border border-slate-300/60 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setStatusMessage(null);
                  }}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up (New Resident)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setStatusMessage(null);
                  }}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    authMode === 'signin'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In (Existing Resident)</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                  Dual-Verification in Progress
                </span>
              </div>
            )}

            {/* Step Indicators */}
            {authMode === 'signup' && (
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === 'ENTER_DETAILS' ? 'bg-slate-900 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    1
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">Resident Info</span>
                </div>
                <div className="w-6 h-0.5 bg-slate-300" />
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === 'VERIFY_DUAL' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    2
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">Dual OTP (Email + SMS)</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-6">
            {/* ---------------------------------------------------- */}
            {/* STEP 1: FORM INPUTS                                  */}
            {/* ---------------------------------------------------- */}
            {step === 'ENTER_DETAILS' && (
              <div>
                {/* 1. SIGN UP FORM */}
                {authMode === 'signup' && (
                  <form onSubmit={handleInitiateSignup} className="space-y-4 max-w-lg">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Create your NER-SAFE Resident Account
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Register with your email and mobile number. Both will be verified with 6-digit OTP codes.
                      </p>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Mratunjay Gaur"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Gmail / Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. gaurxmratunjay@gmail.com"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Verified via Brevo Transactional Email OTP.
                      </p>
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400 font-mono">
                          +91
                        </div>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="9876543210"
                          className="w-full pl-12 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Verified via real 2Factor SMS OTP.
                      </p>
                    </div>

                    {/* State & District */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          State (NER)
                        </label>
                        <select
                          value={selectedState}
                          onChange={handleStateChange}
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
                          value={selectedDistrict}
                          onChange={(e) => setSelectedDistrict(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                        >
                          {availableDistricts.map((d) => (
                            <option key={d.name} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        type="submit"
                        disabled={isSubmitting || !email || !phoneNumber || !name.trim()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending Verification OTPs...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Verification Codes</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signin');
                          setStatusMessage(null);
                        }}
                        className="text-xs text-slate-600 hover:text-slate-900 font-semibold underline text-center sm:text-left py-1 cursor-pointer"
                      >
                        Already registered? Sign In with Name & Mobile
                      </button>
                    </div>
                  </form>
                )}

                {/* 2. SIGN IN FORM (Name + Mobile, NO OTP) */}
                {authMode === 'signin' && (
                  <form onSubmit={handleDirectLogin} className="space-y-4 max-w-lg">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Sign In to your Registered Account
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Log in directly using your registered Name and Mobile Number. No OTP required.
                      </p>
                    </div>

                    {/* Login Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Registered Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          value={loginName}
                          onChange={(e) => setLoginName(e.target.value)}
                          placeholder="e.g. Mratunjay Gaur"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Login Phone */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Registered Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400 font-mono">
                          +91
                        </div>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="9876543210"
                          className="w-full pl-12 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Instant sign-in matches against your verified MongoDB user record.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        type="submit"
                        disabled={isSubmitting || !loginName.trim() || loginPhone.length < 10}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Signing In...</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Sign In</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setStatusMessage(null);
                        }}
                        className="text-xs text-slate-600 hover:text-slate-900 font-semibold underline text-center sm:text-left py-1 cursor-pointer"
                      >
                        New resident? Create an account (Sign Up)
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* STEP 2: DUAL OTP VERIFICATION (EMAIL + MOBILE SMS)   */}
            {/* ---------------------------------------------------- */}
            {step === 'VERIFY_DUAL' && (
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Dual-Factor Verification Required
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verify BOTH your Email address and Mobile number to activate your resident account.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('ENTER_DETAILS')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
                  >
                    Edit Details
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CARD 1: EMAIL VERIFICATION */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      isEmailVerified
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Mail className="w-4 h-4 text-sky-600" />
                        <span>1. Email Verification</span>
                      </div>
                      {isEmailVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          VERIFIED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          PENDING
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 mb-3 truncate font-mono">
                      Sent to: <strong>{email}</strong>
                    </p>

                    {!isEmailVerified ? (
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          maxLength={6}
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="Email 6-digit OTP"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerifyEmailOtp()}
                            disabled={isVerifyingEmail || emailOtp.length !== 6}
                            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isVerifyingEmail ? 'Verifying...' : 'Verify Email'}
                          </button>
                          <button
                            type="button"
                            onClick={handleResendEmailOtp}
                            disabled={emailCooldown > 0}
                            className="px-2.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {emailCooldown > 0 ? `${emailCooldown}s` : 'Resend'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-100/60 rounded-lg border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Email address confirmed!</span>
                      </div>
                    )}
                  </div>

                  {/* CARD 2: SMS VERIFICATION */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      isPhoneVerified
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        <span>2. Mobile SMS Verification</span>
                      </div>
                      {isPhoneVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          VERIFIED
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          PENDING
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 mb-3 font-mono">
                      Sent to: <strong>+91 {phoneNumber}</strong>
                    </p>

                    {!isPhoneVerified ? (
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          maxLength={6}
                          value={smsOtp}
                          onChange={(e) => setSmsOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="SMS 6-digit OTP"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerifySmsOtp()}
                            disabled={isVerifyingSms || smsOtp.length !== 6}
                            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isVerifyingSms ? 'Verifying...' : 'Verify SMS Code'}
                          </button>
                          <button
                            type="button"
                            onClick={handleResendSmsOtp}
                            disabled={smsCooldown > 0}
                            className="px-2.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {smsCooldown > 0 ? `${smsCooldown}s` : 'Resend'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-100/60 rounded-lg border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Mobile number confirmed via 2Factor!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Final Completion Action */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {isEmailVerified && isPhoneVerified ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        Both verifications completed! Ready to finalize.
                      </span>
                    ) : (
                      <span>Complete both steps above to activate your account.</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => completeSignupFlow()}
                    disabled={isFinalizingSignup || !isEmailVerified || !isPhoneVerified}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isFinalizingSignup ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Activating Account...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Complete Registration</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
