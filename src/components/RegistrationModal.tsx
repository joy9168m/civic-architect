import { motion } from 'motion/react';
import { User, ShieldCheck, Code } from 'lucide-react';

interface RegistrationModalProps {
  onSelect: (role: 'citizen' | 'admin' | 'dev') => void;
  userEmail: string | null;
}

export default function RegistrationModal({ onSelect, userEmail }: RegistrationModalProps) {
  const isDevEmail = userEmail === 'sourish3108dps@gmail.com';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-outline-variant/20"
      >
        <div className="p-10 text-center">
          <h2 className="font-headline text-3xl font-black text-primary mb-2">Complete Your Profile</h2>
          <p className="text-on-surface-variant mb-8">Choose your primary role in the Civic Architect ecosystem.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <button 
              onClick={() => onSelect('citizen')}
              className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-surface-container hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="p-4 bg-surface-container rounded-full text-secondary group-hover:bg-primary group-hover:text-white transition-colors">
                <User size={32} />
              </div>
              <div>
                <p className="font-black text-primary uppercase tracking-widest text-xs mb-1">Citizen</p>
                <p className="text-[10px] text-outline leading-tight">Report issues and track community progress.</p>
              </div>
            </button>

            <button 
              onClick={() => onSelect('admin')}
              className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-surface-container hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="p-4 bg-surface-container rounded-full text-secondary group-hover:bg-primary group-hover:text-white transition-colors">
                <ShieldCheck size={32} />
              </div>
              <div>
                <p className="font-black text-primary uppercase tracking-widest text-xs mb-1">Admin</p>
                <p className="text-[10px] text-outline leading-tight">Manage reports and oversee municipal resolutions.</p>
              </div>
            </button>

            <button 
              onClick={() => onSelect('dev')}
              className={`flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all group ${isDevEmail ? 'border-primary bg-primary/5' : 'border-surface-container hover:border-primary hover:bg-primary/5'}`}
            >
              <div className={`p-4 rounded-full transition-colors ${isDevEmail ? 'bg-primary text-white' : 'bg-surface-container text-secondary group-hover:bg-primary group-hover:text-white'}`}>
                <Code size={32} />
              </div>
              <div>
                <p className="font-black text-primary uppercase tracking-widest text-xs mb-1">Developer</p>
                <p className="text-[10px] text-outline leading-tight">Access automated tools and system diagnostics.</p>
              </div>
              {isDevEmail && (
                <span className="mt-2 px-2 py-0.5 bg-primary text-white text-[8px] font-black rounded uppercase tracking-tighter">Verified Dev</span>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
