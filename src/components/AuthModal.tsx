import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User as UserIcon, X, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  loginWithGoogle: (role?: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string, role?: string) => Promise<void>;
}

export default function AuthModal({
  isOpen,
  onClose,
  loginWithGoogle,
  loginWithEmail,
  signupWithEmail
}: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'worker'>('citizen');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        if (!name.trim()) throw new Error("Name is required");
        await signupWithEmail(email, password, name, selectedRole);
      }
      onClose(); // close on success
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-outline-variant/20 relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-outline hover:text-error transition-colors"
        >
          <X size={24} />
        </button>

        <div className="p-6 sm:p-10">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="font-headline text-2xl sm:text-3xl font-black text-primary mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-on-surface-variant text-sm">
              {isLogin ? 'Sign in to report and track civic issues.' : 'Join your community structure to start reporting.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('citizen')}
                    className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                      selectedRole === 'citizen' ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : 'bg-surface-container-low text-outline hover:bg-surface-container border border-outline-variant/30'
                    }`}
                  >
                    Citizen
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('worker')}
                    className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                      selectedRole === 'worker' ? 'bg-primary/80 border-primary text-white shadow-lg shadow-primary/30 scale-105' : 'bg-surface-container-low text-outline hover:bg-surface-container border border-outline-variant/30'
                    }`}
                  >
                    Worker
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
                    <UserIcon size={20} />
                  </div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
                    required={!isLogin}
                  />
                </div>
              </>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
                <Mail size={20} />
              </div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-on-surface"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-error text-xs font-bold px-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-2 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] hover:bg-primary-container transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-outline-variant/30"></div>
            <span className="text-xs font-bold text-outline-variant uppercase tracking-widest">Or</span>
            <div className="flex-1 h-px bg-outline-variant/30"></div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              loginWithGoogle(selectedRole);
            }}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-surface-container text-primary rounded-2xl font-black text-xs uppercase tracking-widest hover:border-primary/20 hover:bg-primary/5 transition-all"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-xs text-outline font-bold mt-8">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="ml-2 text-primary hover:underline hover:text-primary-container"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
