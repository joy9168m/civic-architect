import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, CheckCircle, Camera, X, Loader2, ImagePlus, MapPin
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { toast } from '../components/Toast';
import { getStatusClasses, getSeverityClasses, formatDate, formatTime } from '../lib/utils';

export default function WorkerDashboard() {
  const { user, userData, loading: authLoading } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);
  const [resolutionImage, setResolutionImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'issues'), 
      where('assignedWorkerId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Sort in JS instead of DB to avoid needing a Composite Index
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a: any, b: any) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
      setIssues(fetched);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'issues');
    });
    
    return () => unsubscribe();
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Please upload an image file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setResolutionImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submitResolution = async () => {
    if (!resolvingIssueId || !resolutionImage) return;
    setIsSubmitting(true);
    
    try {
      await updateDoc(doc(db, 'issues', resolvingIssueId), {
        status: 'Resolved',
        resolutionImageUrl: resolutionImage
      });
      toast('Issue marked as resolved', 'success');
      setResolvingIssueId(null);
      setResolutionImage(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `issues/${resolvingIssueId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (userData?.role !== 'worker' && userData?.role !== 'admin' && userData?.role !== 'dev') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-4 sm:p-8 max-w-screen-xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-primary tracking-tight flex items-center gap-3">
          <div className="p-3 bg-secondary/10 text-secondary rounded-2xl">
            <Wrench size={32} />
          </div>
          My Assignments
        </h1>
        <p className="text-on-surface-variant font-medium mt-2">Manage and fulfill your assigned civic works</p>
      </div>

      {issues.length === 0 ? (
        <EmptyState 
          title="No Assignments Yet" 
          message="You currently have no civic issues assigned to you. When dispatch assigns work to your crew, they will appear here." 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {issues.map(issue => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={issue.id}
              className={`bg-white rounded-3xl overflow-hidden border shadow-sm transition-all ${
                issue.status === 'Resolved' ? 'border-emerald-500/20 shadow-emerald-500/5' : 'border-outline-variant/20 hover:shadow-lg'
              }`}
            >
              <div className="h-48 bg-surface-container relative">
                {issue.imageUrl ? (
                  <img src={issue.imageUrl} className="w-full h-full object-cover" alt="Issue" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-outline/30">
                     <Wrench size={48} />
                   </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className={`px-4 py-1.5 text-xs font-black rounded-full uppercase shadow-lg ${getStatusClasses(issue.status)}`}>
                    {issue.status}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex gap-2 mb-3">
                  <span className="px-3 py-1 bg-surface-container-high text-on-surface text-[10px] font-black rounded-full uppercase tracking-widest">
                    {issue.category}
                  </span>
                  <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${getSeverityClasses(issue.severity || 'Moderate')}`}>
                    {issue.severity || 'Moderate'} Priority
                  </span>
                </div>
                
                <h3 className="font-headline text-xl font-black text-primary leading-tight mb-2">
                  {issue.title}
                </h3>
                <p className="text-sm text-outline mb-4 line-clamp-2">{issue.description}</p>
                <p className="text-xs font-bold text-on-surface-variant flex items-center gap-2 mb-6">
                  <MapPin size={14} className="text-primary" /> 
                  <span className="truncate">{issue.address || "Location unavailable"}</span>
                </p>

                {issue.status !== 'Resolved' ? (
                  <button
                    onClick={() => setResolvingIssueId(issue.id)}
                    className="w-full py-3.5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-container transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Complete Work
                  </button>
                ) : (
                  <div className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col gap-3">
                    <p className="text-emerald-700 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle size={16} /> Work Completed
                    </p>
                    {issue.resolutionImageUrl && (
                      <div className="h-24 rounded-xl overflow-hidden shadow-inner relative group">
                        <img src={issue.resolutionImageUrl} className="w-full h-full object-cover" alt="Resolution Proof" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-white text-[10px] font-black uppercase tracking-widest">Proof of Work</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Resolution Photo Modal */}
      <AnimatePresence>
        {resolvingIssueId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-surface/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] p-6 sm:p-10 max-w-md w-full shadow-2xl border border-outline-variant/20 relative"
            >
              <button 
                onClick={() => { setResolvingIssueId(null); setResolutionImage(null); }}
                className="absolute top-6 right-6 text-outline hover:text-error transition-colors"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera size={32} />
                </div>
                <h2 className="font-headline text-2xl font-black text-primary mb-2">Proof of Work</h2>
                <p className="text-on-surface-variant text-sm px-4">
                  Upload a photo of the completed repairs to mark this issue as resolved.
                </p>
              </div>

              {!resolutionImage ? (
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-3 border-dashed border-primary/30 bg-primary/5 rounded-[2rem] p-10 flex flex-col items-center justify-center text-primary group hover:border-primary hover:bg-primary/10 transition-all">
                    <ImagePlus size={48} className="mb-4 group-hover:scale-110 transition-transform" />
                    <span className="font-black text-sm uppercase tracking-widest text-center">Tap to Open Camera</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative h-64 rounded-2xl overflow-hidden shadow-inner">
                    <img src={resolutionImage} alt="Captured" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setResolutionImage(null)}
                      className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-error hover:text-white transition-all shadow-lg"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <button
                    onClick={submitResolution}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    Submit Resolution
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
