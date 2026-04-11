import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusCircle, LogIn, LogOut, 
  Menu, X, MapPin, Code, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  user: any;
  userData: any;
  login: () => void;
  logout: () => void;
}

export default function Navbar({ user, userData, login, logout }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Public Map', path: '/map', icon: MapPin },
    { name: 'Report Issue', path: '/report', icon: PlusCircle, requiresAuth: true },
    { name: 'Admin', path: '/admin', icon: ShieldCheck, requiresAdmin: true },
    { name: 'Dev Portal', path: '/dev', icon: Code, requiresDev: true },
  ];

  const filteredLinks = navLinks.filter(link => {
    if (link.requiresAuth && !user) return false;
    if (link.requiresAdmin && userData?.role !== 'admin' && userData?.role !== 'dev') return false;
    if (link.requiresDev && userData?.role !== 'dev') return false;
    return true;
  });

  return (
    <nav className={`fixed w-full top-0 z-50 transition-all duration-500 ${
      scrolled 
        ? 'bg-white/90 backdrop-blur-md border-b border-outline-variant/20 shadow-sm py-3' 
        : 'bg-gradient-to-b from-white/80 via-white/40 to-transparent py-6'
    }`}>
      <div className="max-w-screen-2xl mx-auto px-10 flex items-center justify-between">
        <div className="flex items-center gap-16">
          <Link to="/" className="flex items-center gap-4 group">
            <div className="relative">
              <div className="w-14 h-14 bg-primary rounded-[1.25rem] flex items-center justify-center text-white shadow-2xl shadow-primary/40 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 ease-out">
                <MapPin size={32} strokeWidth={2.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary rounded-lg border-2 border-white shadow-lg"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-3xl font-black text-primary tracking-tighter leading-none">CIVIC</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-[2px] w-4 bg-secondary rounded-full"></div>
                <span className="font-headline text-[11px] font-black text-secondary tracking-[0.4em] uppercase leading-none">Architect</span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden xl:flex items-center gap-2">
            {filteredLinks.map((link) => (
              <Link 
                key={link.name} 
                to={link.path}
                className="px-5 py-2.5 rounded-2xl font-black text-[12px] uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-all duration-300 flex items-center gap-2.5 relative group/link drop-shadow-sm"
              >
                {link.icon && <link.icon size={16} strokeWidth={2.5} className="group-hover/link:scale-110 group-hover/link:rotate-3 transition-all duration-300" />}
                {link.name}
                <div className="absolute bottom-1 left-5 right-5 h-[3px] bg-primary rounded-full scale-x-0 group-hover/link:scale-x-100 transition-transform duration-500 origin-center"></div>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-8">
          {user ? (
            <div className="flex items-center gap-6">
              <div className="hidden lg:flex flex-col items-end border-r border-outline-variant/20 pr-6">
                <p className="text-sm font-black text-primary leading-none tracking-tight">{userData?.displayName || user.displayName}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                    userData?.role === 'dev' ? 'bg-amber-500/10 text-amber-600' : 
                    userData?.role === 'admin' ? 'bg-primary/10 text-primary' : 
                    'bg-secondary/10 text-secondary'
                  }`}>
                    {userData?.role || 'Citizen'}
                  </span>
                </div>
              </div>
              
              <div className="relative group">
                <button className="relative w-12 h-12 rounded-[1.15rem] overflow-hidden border-2 border-white shadow-xl group-hover:shadow-2xl group-hover:scale-105 transition-all duration-500 ease-out p-0.5 bg-surface-container">
                  <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                    alt="Avatar"
                    className="w-full h-full object-cover rounded-[0.9rem]"
                    referrerPolicy="no-referrer"
                  />
                </button>
                <div className="absolute right-0 mt-4 w-64 bg-white rounded-[2.5rem] shadow-[0_20px_80px_rgba(0,0,0,0.15)] border border-outline-variant/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-500 translate-y-4 group-hover:translate-y-0 overflow-hidden z-50">
                  <div className="px-8 py-7 bg-surface-container-low border-b border-outline-variant/5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-inner">
                        <img src={user.photoURL || ''} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-black text-primary truncate leading-tight">{user.displayName}</p>
                        <p className="text-[11px] text-outline font-bold truncate opacity-60">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <span className="text-[9px] font-black bg-primary text-white px-2 py-1 rounded-lg uppercase tracking-widest">Verified</span>
                       {userData?.role === 'dev' && <span className="text-[9px] font-black bg-amber-500 text-white px-2 py-1 rounded-lg uppercase tracking-widest">Developer</span>}
                    </div>
                  </div>
                  <div className="p-3">
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-4 px-6 py-4 text-[11px] text-error hover:bg-error/5 rounded-2xl transition-all duration-300 font-black uppercase tracking-[0.2em]"
                    >
                      <div className="w-8 h-8 bg-error/10 rounded-xl flex items-center justify-center">
                        <LogOut size={16} strokeWidth={3} />
                      </div>
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={login}
              className="group relative px-10 py-4 bg-primary text-white rounded-[1.5rem] font-black text-[12px] uppercase tracking-[0.25em] shadow-2xl shadow-primary/30 hover:bg-primary-container hover:scale-105 transition-all duration-500 active:scale-95 flex items-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <LogIn size={20} strokeWidth={2.5} />
              Sign In
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="xl:hidden w-12 h-12 bg-surface-container rounded-2xl text-primary hover:bg-primary/10 transition-all duration-300 flex items-center justify-center shadow-sm" 
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} strokeWidth={3} /> : <Menu size={24} strokeWidth={3} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden bg-surface border-t border-outline-variant/20 overflow-hidden"
          >
            <div className="p-6 flex flex-col gap-6">
              {filteredLinks.map((link) => (
                <Link 
                  key={link.name} 
                  to={link.path} 
                  onClick={() => setIsOpen(false)}
                  className="font-black text-sm uppercase tracking-widest text-on-surface-variant flex items-center gap-3"
                >
                  {link.icon && <link.icon size={20} />}
                  {link.name}
                </Link>
              ))}
              {user ? (
                <button 
                  onClick={() => { logout(); setIsOpen(false); }}
                  className="font-black text-sm uppercase tracking-widest text-error flex items-center gap-3"
                >
                  <LogOut size={20} />
                  Logout
                </button>
              ) : (
                <button 
                  onClick={() => { login(); setIsOpen(false); }}
                  className="bg-primary text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3"
                >
                  <LogIn size={20} />
                  Sign In
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
