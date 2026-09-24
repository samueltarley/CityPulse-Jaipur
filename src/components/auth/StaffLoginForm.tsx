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

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const targetUsername =
    (import.meta as any).env?.VITE_STAFF_USERNAME ||
    (import.meta as any).env?.STAFF_USERNAME ||
    DEFAULT_STAFF_USERNAME;

  const targetPasswordHash =
    (import.meta as any).env?.VITE_STAFF_PASSWORD_HASH ||
    (import.meta as any).env?.STAFF_PASSWORD_HASH ||
    DEFAULT_STAFF_PASSWORD_HASH;

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
      const isPassMatch = inputHash.toLowerCase() === targetPasswordHash.toLowerCase();

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
              ? 'अमान्य क्रेडेंशियल्स! सही उपयोगकर्ता नाम और पासवर्ड का उपयोग करें।'
              : 'Invalid credentials. Please enter authorized staff username and password.'
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

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header Banner / Emblem */}
      <div className="text-center mb-6">
        <div className="inline-flex relative mb-3">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[var(--jaipur-terracotta)] via-[var(--jaipur-terracotta-deep)] to-amber-800 text-white flex items-center justify-center shadow-lg shadow-[var(--jaipur-terracotta)]/25 ring-4 ring-[var(--jaipur-terracotta)]/20">
            <ShieldCheck className="h-8 w-8 text-[var(--jaipur-sandstone)]" />
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
          {language === 'hi' ? 'नगर निगम अधिकारी लॉगिन' : 'City Staff Operations Login'}
        </h2>
        <p className="text-xs text-[var(--jaipur-text-secondary)] mt-1 max-w-sm mx-auto">
          {language === 'hi'
            ? 'नागरिक दृश्य से नगर निगम स्टाफ डैशबोर्ड, सेंसर नियंत्रण व शिकायत प्रबंधन में प्रवेश करें।'
            : 'Authenticate to access full Municipal Command & Control, sensor telemetry overrides, and grievance queues.'}
        </p>
      </div>

      {/* Login Card */}
      <div className="rounded-2xl border border-[var(--jaipur-border)] bg-[var(--jaipur-surface)] p-6 sm:p-7 shadow-xl shadow-black/5 relative overflow-hidden backdrop-blur-sm">
        {/* Subtle Decorative Arch Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-[var(--jaipur-terracotta)] to-rose-600" />

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

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-[var(--jaipur-text)] uppercase tracking-wider mb-1.5">
              {language === 'hi' ? 'सुरक्षा पासवर्ड' : 'Staff Password'}
            </label>
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
