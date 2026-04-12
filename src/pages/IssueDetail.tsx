import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  ArrowLeft, MapPin, Calendar, User, 
  ThumbsUp, Share2, AlertTriangle, CheckCircle2,
  Clock, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import StatusBadge from '../components/StatusBadge';
import IssueMap from '../components/IssueMap';
import { toast } from '../components/Toast';
import { formatDate, calculatePriorityScore } from '../lib/utils';

export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'issues', id), (doc) => {
      if (doc.exists()) {
        setIssue({ id: doc.id, ...doc.data() });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const handleUpvote = async () => {
    if (!auth.currentUser || !id || !issue) return;
    const isUpvoted = issue.upvotedBy?.includes(auth.currentUser.uid);
    
    if (!isUpvoted) {
      setIsAnimating(true);
      setShowToast(true);
      setTimeout(() => setIsAnimating(false), 500);
      setTimeout(() => setShowToast(false), 3000);
    }

    const newUpvotesCount = (issue.upvotes || 0) + (isUpvoted ? -1 : 1);
    const newPriorityScore = calculatePriorityScore(issue.severity || 'Moderate', newUpvotesCount, issue.duplicateVolume || 0);

    await updateDoc(doc(db, 'issues', id), {
      upvotes: increment(isUpvoted ? -1 : 1),
      upvotedBy: isUpvoted ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid),
      priorityScore: newPriorityScore
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: issue?.title || 'Civic Issue',
      text: `Check out this civic issue: ${issue?.title}`,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard!', 'success');
      }
    } catch (err: any) {
      // User cancelled share — not an error
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard!', 'success');
      }
    }
  };

  if (loading) return <div className="p-20 text-center">Loading...</div>;
  if (!issue) return <div className="p-20 text-center">Issue not found.</div>;

  const isUpvoted = auth.currentUser && issue.upvotedBy?.includes(auth.currentUser.uid);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-outline font-bold hover:text-primary transition-colors mb-8 group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Feed
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Image and Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-outline-variant/20 bg-surface-container"
          >
            <img src={issue.imageUrl} alt={issue.title} className="w-full h-full object-cover" />
          </motion.div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={issue.status} className="px-3 py-1 text-xs rounded-full" />
              <span className="px-3 py-1 bg-secondary-container text-primary text-xs font-black rounded-full uppercase">
                {issue.category}
              </span>
            </div>
            <h1 className="font-headline text-4xl lg:text-5xl font-extrabold text-primary tracking-tight leading-tight">
              {issue.title}
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed">
              {issue.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-6 pt-8 border-t border-outline-variant/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-surface-container rounded-xl text-primary">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-outline">Location</p>
                <p className="font-bold text-primary">{issue.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-surface-container rounded-xl text-primary">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-outline">Reported On</p>
                <p className="font-bold text-primary">{formatDate(issue.reportedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-surface-container rounded-xl text-primary">
                <User size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-outline">Reported By</p>
                <p className="font-bold text-primary">{issue.authorName}</p>
              </div>
            </div>
          </div>

          {/* Mini Location Map */}
          {issue.lat && issue.lng && (
            <div className="pt-4">
              <h3 className="font-headline text-lg font-extrabold text-primary mb-4 flex items-center gap-2">
                <MapPin size={20} />
                Issue Location
              </h3>
              <IssueMap
                issues={[{ id: issue.id, title: issue.title, lat: issue.lat, lng: issue.lng, status: issue.status, category: issue.category }]}
                center={[issue.lat, issue.lng]}
                zoom={16}
                className="h-[250px] w-full rounded-2xl overflow-hidden shadow-inner"
              />
            </div>
          )}
        </div>

        {/* Right Column: Actions and AI Analysis */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-outline-variant/20 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-xl font-extrabold text-primary">Community Impact</h3>
              <div className="flex items-center gap-1 text-primary font-black">
                <ThumbsUp size={20} fill={isUpvoted ? "currentColor" : "none"} />
                {issue.upvotes || 0}
              </div>
            </div>
            
            <div className="relative">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={handleUpvote}
                className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 relative overflow-hidden ${
                  isUpvoted 
                    ? 'bg-primary/10 text-primary border-2 border-primary' 
                    : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-container'
                }`}
              >
                <motion.div
                  animate={isAnimating ? { scale: [1, 1.5, 1], rotate: [0, -15, 15, 0] } : {}}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  <ThumbsUp size={20} fill={isUpvoted ? "currentColor" : "none"} />
                </motion.div>
                {isUpvoted ? 'Upvoted' : 'Upvote Issue'}
              </motion.button>

              <AnimatePresence>
                {showToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 bg-surface-container-low text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 whitespace-nowrap border border-outline-variant/20 z-10"
                  >
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Thanks for upvoting!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <button 
              onClick={handleShare}
              className="w-full py-4 rounded-2xl border-2 border-outline-variant/30 text-primary font-black flex items-center justify-center gap-2 hover:bg-surface-container transition-all"
            >
              <Share2 size={20} />
              Share Report
            </button>

            <div className="pt-6 border-t border-outline-variant/10">
              <div className="flex items-center gap-2 text-error font-black text-xs uppercase tracking-widest mb-4">
                <AlertTriangle size={16} />
                AI Severity Assessment
              </div>
              <div className="flex items-center justify-between bg-error-container/30 p-4 rounded-xl border border-error/10">
                <span className="font-bold text-on-error-container">Estimated Severity</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                  issue.severity === 'Critical' ? 'bg-error text-white' : 'bg-amber-500 text-white'
                }`}>
                  {issue.severity}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low p-8 rounded-[2rem] border border-outline-variant/10">
            <h3 className="font-headline text-lg font-extrabold text-primary mb-4 flex items-center gap-2">
              <MessageSquare size={20} />
              Official Response
            </h3>
            {issue.adminNote ? (
              <p className="text-sm text-on-surface-variant leading-relaxed italic">
                "{issue.adminNote}"
              </p>
            ) : (
              <div className="flex flex-col items-center text-center py-4">
                <Clock size={32} className="text-outline/30 mb-2" />
                <p className="text-xs font-bold text-outline">Awaiting official review from the municipal department.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
