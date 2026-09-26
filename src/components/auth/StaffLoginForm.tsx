import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAppStore } from '../../store/useAppStore';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  CheckCircle2,
  KeyRound,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Mail,
  RefreshCw,
  Check,
} from 'lucide-react';

interface StaffLoginFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

// Default username and SHA-256 hash of official staff credentials
const DEFAULT_STAFF_USERNAME = 'STARKTECH';
const DEFAULT_STAFF_PASSWORD_HASH = '92477265629e58ce89522ced3cbc330ec3130aab5ec79f5d7ae9fd5e57d962b7';

// Utility function to compute SHA-256 hash in browser
async function computeSHA256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const StaffLoginForm: React.FC<StaffLoginFormProps> = ({
  onSuccess,
  onCancel,
  isModal = false,
}) => {
  const { language } = useLanguage();
  const { setRole, setStaffUsername, addToast, setActiveTab } = useAppStore();

  // View state: 'login' or 'forgot_password'
  const [authView, setAuthView] = useState<'login' | 'forgot_password'>('login');

  // Login form state
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Forgot password form state
  const [recoveryUsername, setRecoveryUsername] = useState<string>('STARKTECH');
  const [recoveryEmail, setRecoveryEmail] = useState<string>('nitinseervi9@gmail.com');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [otpSentSuccess, setOtpSentSuccess] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Resend cooldown timer effect
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const targetUsername =
    (import.meta as any).env?.VITE_STAFF_USERNAME ||
    (import.meta as any).env?.STAFF_USERNAME ||
    DEFAULT_STAFF_USERNAME;

  const targetPasswordHash =
    (import.meta as any).env?.VITE_STAFF_PASSWORD_HASH ||
    (import.meta as any).env?.STAFF_PASSWORD_HASH ||
    DEFAULT_STAFF_PASSWORD_HASH;

  // Handle standard login submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMessage(
        language === 'hi'
          ? 'कृपया उपयोगकर्ता नाम और पासवर्ड दर्ज करें।'
          : 'Please enter both username and password.'
      );
      return;
    }

    setIsAuthenticating(true);

    try {
      const inputHash = await computeSHA256(trimmedPass);
      const isUserMatch = trimmedUser.toUpperCase() === targetUsername.toUpperCase();

      // Check if user set a custom password via Forgot Password reset
      const customSavedHash =
        typeof window !== 'undefined'
          ? localStorage.getItem('citypulse_custom_staff_password_hash')
          : null;

      const isPassMatch =
        inputHash.toLowerCase() === targetPasswordHash.toLowerCase() ||
        (customSavedHash && inputHash.toLowerCase() === customSavedHash.toLowerCase());

      setTimeout(() => {
        if (isUserMatch && isPassMatch) {
          setIsSuccess(true);
          setStaffUsername(targetUsername);
          setRole('staff');

          addToast({
            title: language === 'hi' ? 'कमांड सेंटर प्रमाणीकरण सफल' : 'Command Center Access Granted',
            message:
              language === 'hi'
                ? `अधिकारी ${targetUsername} के रूप में नगर निगम नियंत्रण कक्ष सक्रिय।`
                : `Logged in as Officer ${targetUsername} (Jaipur Municipal Command).`,
            type: 'success',
          });

          setTimeout(() => {
            setIsAuthenticating(false);
            if (onSuccess) {
              onSuccess();
            } else {
              setActiveTab('staff');
            }
          }, 600);
        } else {
          setIsAuthenticating(false);
          setErrorMessage(
            language === 'hi'
              ? 'अमान्य क्रेडेंशियल्स! यदि पासवर्ड याद नहीं है तो नीचे "पासवर्ड भूल गए?" पर क्लिक करें।'
              : 'Invalid credentials. If you forgot your password, click "Forgot Password?" below.'
          );
        }
      }, 450);
    } catch {
      setIsAuthenticating(false);
      setErrorMessage(
        language === 'hi'
          ? 'प्रमाणीकरण त्रुटि। पुनः प्रयास करें।'
          : 'Authentication processing error. Please try again.'
      );
    }
  };

  const handleAutofill = () => {
    setUsername(targetUsername);
    setErrorMessage(null);
  };

  // Generate and send verification OTP for password recovery via real backend email dispatch
  const handleSendOtp = async () => {
    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      setErrorMessage(
        language === 'hi'
          ? 'कृपया वैध विभागीय ईमेल दर्ज करें।'
          : 'Please enter a valid departmental email.'
      );
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage(null);
    setEnteredOtp(''); // Clear input so user types it from their email

    try {
      const resp = await fetch('/api/send-officer-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryEmail.trim(),
          username: recoveryUsername.trim(),
        }),
      });

      const data = await resp.json();
      setIsSendingOtp(false);

      if (data.success) {
        setOtpSentSuccess(true);
        setResendCooldown(60);

        addToast({
          title: language === 'hi' ? 'ओटीपी ईमेल पर भेजा गया' : 'OTP Dispatched to Email',
          message:
            language === 'hi'
              ? `6-अंकीय सत्यापन कोड ${recoveryEmail} पर भेज दिया गया है। कृपया अपना ईमेल (इनबॉक्स व स्पैम) चेक करें।`
              : `6-digit verification code sent to ${recoveryEmail}. Please check your inbox and spam folder.`,
          type: 'info',
        });
      } else {
        setErrorMessage(data.error || 'Failed to dispatch OTP. Please try again.');
      }
    } catch {
      setIsSendingOtp(false);
      setErrorMessage(
        language === 'hi'
          ? 'ईमेल सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।'
          : 'Could not connect to email dispatch service. Please try again.'
      );
    }
  };

  // Handle password reset submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = enteredOtp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage(
        language === 'hi'
          ? 'कृपया अपने ईमेल पर प्राप्त 6-अंकीय सत्यापन कोड (OTP) दर्ज करें।'
          : 'Please enter the 6-digit OTP received in your email.'
      );
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage(
        language === 'hi'
          ? 'नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'
          : 'New password must be at least 6 characters long.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(
        language === 'hi'
          ? 'पासवर्ड मेल नहीं खा रहे हैं। कृपया पुनः जांचें।'
          : 'Passwords do not match. Please verify.'
      );
      return;
    }

    setIsAuthenticating(true);

    try {
      // Verify OTP with server endpoint
      const verifyResp = await fetch('/api/verify-officer-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryEmail.trim(),
          otp: cleanOtp,
        }),
      });

      const verifyData = await verifyResp.json();

      if (!verifyData.success || !verifyData.verified) {
        setIsAuthenticating(false);
        setErrorMessage(
          verifyData.error ||
            (language === 'hi'
              ? 'अमान्य या समाप्त ओटीपी! कृपया ईमेल में प्राप्त सही 6-अंकीय कोड दर्ज करें।'
              : 'Invalid or expired OTP. Please enter the correct 6-digit code received in your email.')
        );
        return;
      }

      // Hash new password and save to localStorage
      const newHash = await computeSHA256(newPassword.trim());
      if (typeof window !== 'undefined') {
        localStorage.setItem('citypulse_custom_staff_password_hash', newHash);
        localStorage.setItem('citypulse_staff_last_reset', Date.now().toString());
      }

      setIsAuthenticating(false);
      setIsSuccess(true);
      setStaffUsername(recoveryUsername.toUpperCase());
      setRole('staff');

      addToast({
        title: language === 'hi' ? 'पासवर्ड सफलतापूर्वक रीसेट' : 'Password Successfully Reset',
        message:
          language === 'hi'
            ? `नया पासवर्ड सक्रिय है। अधिकारी ${recoveryUsername} के रूप में लॉगिन सफल।`
            : `Password updated! Authenticated as Officer ${recoveryUsername}.`,
        type: 'success',
      });

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          setActiveTab('staff');
        }
      }, 700);
    } catch {
      setIsAuthenticating(false);
      setErrorMessage(
        language === 'hi'
          ? 'सत्यापन सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।'
          : 'Failed to verify OTP with server. Please try again.'
      );
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header Banner / Emblem */}
      <div className="text-center mb-6">
        <div className="inline-flex relative mb-3">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[var(--jaipur-terracotta)] via-[var(--jaipur-terracotta-deep)] to-amber-800 text-white flex items-center justify-center shadow-lg shadow-[var(--jaipur-terracotta)]/25 ring-4 ring-[var(--jaipur-terracotta)]/20">
            {authView === 'login' ? (
              <ShieldCheck className="h-8 w-8 text-[var(--jaipur-sandstone)]" />
            ) : (
              <KeyRound className="h-8 w-8 text-amber-300 animate-pulse" />
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 ring-2 ring-white dark:ring-gray-900">
            <KeyRound className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--jaipur-terracotta)]/10 border border-[var(--jaipur-terracotta)]/30 text-[var(--jaipur-terracotta)] text-xs font-bold uppercase tracking-wider mb-2">
          <Building2 className="h-3.5 w-3.5" />
          <span>
            {language === 'hi'
              ? 'जयपुर नगर निगम • कमान व नियंत्रण'
              : 'Jaipur Municipal Corporation (JMC)'}
          </span>
        </div>

        <h2 className="font-display text-2xl font-bold text-[var(--jaipur-text)]">
          {authView === 'login'
            ? language === 'hi'
              ? 'नगर निगम अधिकारी लॉगिन'
              : 'City Staff Operations Login'
            : language === 'hi'
            ? 'पासवर्ड पुनर्प्राप्ति (Forgot Password)'
            : 'Staff Password Recovery'}
        </h2>
        <p className="text-xs text-[var(--jaipur-text-secondary)] mt-1 max-w-sm mx-auto">
          {authView === 'login'
            ? language === 'hi'
              ? 'नागरिक दृश्य से नगर निगम स्टाफ डैशबोर्ड, सेंसर नियंत्रण व शिकायत प्रबंधन में प्रवेश करें।'
              : 'Authenticate to access full Municipal Command & Control, sensor telemetry overrides, and grievance queues.'
            : language === 'hi'
            ? 'विभागीय ईमेल व सत्यापन कोड के माध्यम से नया सुरक्षा पासवर्ड सेट करें।'
            : 'Recover access and configure a new password with official municipal email verification.'}
        </p>
      </div>

      {/* Main Form Container Card */}
      <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-6 sm:p-7 shadow-xl shadow-black/5 relative overflow-hidden backdrop-blur-sm">
        {/* Subtle Decorative Arch Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-[var(--jaipur-terracotta)] to-rose-600" />

        {/* VIEW 1: REGULAR LOGIN FORM */}
        {authView === 'login' && (
          <div>
            {/* Credentials Info Helper */}
            <div className="mb-5 p-3 rounded-xl bg-[var(--jaipur-surface-warm)] border border-[var(--jaipur-border)] flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-[var(--jaipur-text)] flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {language === 'hi' ? 'स्टाफ क्रेडेंशियल्स' : 'Authorized Staff Access'}:
                </span>
                <div className="font-mono text-[11px] text-[var(--jaipur-text-secondary)]">
                  User: <span className="font-bold text-[var(--jaipur-terracotta)]">{targetUsername}</span> | <span className="font-semibold">SHA-256 Verified</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAutofill}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--jaipur-terracotta)]/15 text-[var(--jaipur-terracotta)] hover:bg-[var(--jaipur-terracotta)] hover:text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0"
                title="Auto-fill official username"
              >
                {language === 'hi' ? 'यूज़रनेम भरें' : 'Fill User'}
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-[var(--jaipur-text)] uppercase tracking-wider mb-1.5">
                  {language === 'hi' ? 'स्टाफ उपयोगकर्ता नाम' : 'Staff Username / ID'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--jaipur-text-muted)]">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={targetUsername}
                    autoComplete="username"
                    disabled={isAuthenticating || isSuccess}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-card)] text-[var(--jaipur-text)] text-sm font-mono placeholder:text-[var(--jaipur-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--jaipur-terracotta)] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password Input with Forgot Password link */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[var(--jaipur-text)] uppercase tracking-wider">
                    {language === 'hi' ? 'सुरक्षा पासवर्ड' : 'Staff Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setAuthView('forgot_password');
                    }}
                    className="text-[11px] text-[var(--jaipur-terracotta)] hover:underline font-bold transition-colors cursor-pointer"
                  >
                    {language === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--jaipur-text-muted)]">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    disabled={isAuthenticating || isSuccess}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-card)] text-[var(--jaipur-text)] text-sm font-mono placeholder:text-[var(--jaipur-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--jaipur-terracotta)] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--jaipur-text-muted)] hover:text-[var(--jaipur-text)] cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isAuthenticating || isSuccess}
                className={`w-full mt-2 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isSuccess
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-[var(--jaipur-terracotta)] hover:bg-[var(--jaipur-terracotta-deep)] active:scale-[0.99]'
                } disabled:opacity-70`}
              >
                {isAuthenticating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{language === 'hi' ? 'प्रमाणीकरण हो रहा है...' : 'Verifying Security Token...'}</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-white" />
                    <span>{language === 'hi' ? 'प्रवेश स्वीकृत!' : 'Access Granted!'}</span>
                  </>
                ) : (
                  <>
                    <span>{language === 'hi' ? 'स्टाफ डैशबोर्ड अनलॉक करें' : 'Sign In as Staff'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* VIEW 2: FORGOT PASSWORD & RECOVERY FLOW */}
        {authView === 'forgot_password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                {language === 'hi' ? 'अधिकारी पासवर्ड रीसेट प्रोटोकॉल' : 'Official Officer Password Reset'}
              </span>
              <p className="text-[11px] text-[var(--jaipur-text-secondary)] leading-relaxed">
                {language === 'hi'
                  ? 'सुरक्षा सत्यापन के लिए आधिकारिक ईमेल पर 6-अंकीय ओटीपी प्राप्त करें और नया पासवर्ड निर्धारित करें।'
                  : 'Receive a 6-digit recovery OTP on your departmental email to establish a new password.'}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Officer ID */}
            <div>
              <label className="block text-xs font-bold text-[var(--jaipur-text)] uppercase tracking-wider mb-1">
                {language === 'hi' ? 'स्टाफ यूज़रनेम / अधिकारी आईडी' : 'Staff Username / ID'}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-[var(--jaipur-text-muted)]" />
                <input
                  type="text"
                  value={recoveryUsername}
                  onChange={(e) => setRecoveryUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-card)] text-[var(--jaipur-text)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--jaipur-terracotta)]"
                  required
                />
              </div>
            </div>

            {/* Departmental Email & OTP trigger */}
            <div>
              <label className="block text-xs font-bold text-[var(--jaipur-text)] uppercase tracking-wider mb-1">
                {language === 'hi' ? 'अधिकारी ईमेल पता (Authorized Officer Email)' : 'Authorized Officer Email'}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[var(--jaipur-text-muted)]" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="nitinseervi9@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-card)] text-[var(--jaipur-text)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--jaipur-terracotta)]"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || resendCooldown > 0}
                  className="px-3.5 py-2 rounded-xl bg-[var(--jaipur-terracotta)]/15 hover:bg-[var(--jaipur-terracotta)]/25 text-[var(--jaipur-terracotta)] border border-[var(--jaipur-terracotta)]/30 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSendingOtp ? 'animate-spin' : ''}`} />
                  <span>
                    {isSendingOtp
                      ? (language === 'hi' ? 'भेजा जा रहा है...' : 'Sending...')
                      : resendCooldown > 0
                      ? `${resendCooldown}s`
                      : otpSentSuccess
                      ? (language === 'hi' ? 'पुनः भेजें' : 'Resend OTP')
                      : (language === 'hi' ? 'OTP भेजें' : 'Get OTP')}
                  </span>
                </button>
              </div>
            </div>

            {/* 6-Digit OTP Entry from Email */}
            {otpSentSuccess && (
              <div className="space-y-2.5 animate-in fade-in duration-200">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block">
                      {language === 'hi' ? 'सत्यापन कोड ईमेल पर भेज दिया गया है' : 'Verification Code Sent to Email'}
                    </span>
                    <p className="text-[11px] text-[var(--jaipur-text-secondary)] leading-relaxed">
                      {language === 'hi'
                        ? `कोड आपकी ईमेल ${recoveryEmail} पर भेजा गया है।`
                        : `The verification OTP has been dispatched to ${recoveryEmail}.`}
                    </p>
                    <div className="mt-1 pt-1.5 border-t border-emerald-500/20 text-[10px] text-amber-700 dark:text-amber-300 space-y-0.5">
                      <div className="font-bold">⚠️ {language === 'hi' ? 'महत्वपूर्ण (Gmail सुझाव):' : 'Important (Gmail Tips):'}</div>
                      <div>
                        {language === 'hi'
                          ? '• कृपया Gmail का Spam (स्पैम) या Updates फ़ोल्डर भी अवश्य देखें।'
                          : '• Please check your Gmail Spam or Updates/Promotions folder as well.'}
                      </div>
                      <div>
                        {language === 'hi'
                          ? '• विषय खोजें: "CityPulse JMC" या "FormSubmit"'
                          : '• Search email by: "CityPulse JMC" or "FormSubmit"'}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[var(--jaipur-text)] uppercase tracking-wider">
                      {language === 'hi' ? 'ईमेल से 6-अंकीय OTP दर्ज करें' : 'Enter 6-Digit OTP from Email'}
                    </label>
                    <span className="text-[10px] text-[var(--jaipur-text-muted)]">
                      {language === 'hi' ? 'इमरजेंसी बैकअप: 749201' : 'Backup Key: 749201'}
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    autoComplete="one-time-code"
                    className="w-full px-3.5 py-3 rounded-xl border-2 border-[var(--jaipur-terracotta)]/50 bg-[var(--jaipur-card)] text-[var(--jaipur-text)] text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[var(--jaipur-terracotta)] focus:border-[var(--jaipur-terracotta)] shadow-xs"
                    required
                  />
                </div>
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-[var(--jaipur-text)] uppercase tracking-wider mb-1">
                {language === 'hi' ? 'नया पासवर्ड निर्धारित करें' : 'New Staff Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[var(--jaipur-text-muted)]" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-card)] text-[var(--jaipur-text)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--jaipur-terracotta)]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--jaipur-text-muted)] cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-[var(--jaipur-text)] uppercase tracking-wider mb-1">
                {language === 'hi' ? 'नया पासवर्ड पुनः दर्ज करें (Confirm)' : 'Confirm New Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[var(--jaipur-text-muted)]" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--jaipur-border)] bg-[var(--jaipur-card)] text-[var(--jaipur-text)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--jaipur-terracotta)]"
                  required
                />
              </div>
            </div>

            {/* Reset Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isAuthenticating || isSuccess}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isAuthenticating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{language === 'hi' ? 'सुरक्षा टोकन अपडेट हो रहा है...' : 'Updating Security Credentials...'}</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-white" />
                    <span>{language === 'hi' ? 'पासवर्ड अपडेट सफल!' : 'Password Updated!'}</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{language === 'hi' ? 'पासवर्ड रीसेट करें व लॉगिन करें' : 'Reset Password & Access Console'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthView('login');
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-[var(--jaipur-border)] hover:bg-[var(--jaipur-surface-warm)] text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-text)] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{language === 'hi' ? 'लॉगिन स्क्रीन पर वापस जाएं' : 'Back to Staff Login'}</span>
              </button>
            </div>
          </form>
        )}

        {isModal && onCancel && (
          <div className="mt-4 pt-3 border-t border-[var(--jaipur-border)] text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-[var(--jaipur-text-secondary)] hover:text-[var(--jaipur-text)] font-semibold transition-colors cursor-pointer"
            >
              {language === 'hi' ? 'नागरिक दृश्य में वापस रहें' : 'Stay in Resident View'}
            </button>
          </div>
        )}
      </div>

      {/* Official Security Disclaimer */}
      <p className="text-[11px] text-center text-[var(--jaipur-text-muted)] mt-4">
        🔒 {language === 'hi'
          ? 'सुरक्षित कमान सत्र • केवल अधिकृत जयपुर नगर निगम कर्मियों के लिए'
          : 'Encrypted Session • Official Jaipur Smart City & Municipal Command Console'}
      </p>
    </div>
  );
};
