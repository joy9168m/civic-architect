import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, limit, doc, updateDoc, increment, arrayUnion, arrayRemove, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { ArrowRight, MapPin, List, Filter, Map as MapIcon, ThumbsUp, ArrowUpDown, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import IssueMap from '../components/IssueMap';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { CATEGORY_IDS } from '../lib/constants';
import { formatDate } from '../lib/utils';

export default function Home() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [myIssues, setMyIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'upvotes'>('recent');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'issues'), 
      orderBy(sortBy === 'recent' ? 'reportedAt' : 'upvotes', 'desc'), 
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'issues');
    });
    return () => unsubscribe();
  }, [sortBy]);

  useEffect(() => {
    if (!user) { setMyIssues([]); return; }
    const q = query(
      collection(db, 'issues'),
      where('reportedBy', '==', user.uid),
      orderBy('reportedAt', 'desc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleUpvote = async (e: React.MouseEvent, issue: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!auth.currentUser) return;
    const isUpvoted = issue.upvotedBy?.includes(auth.currentUser.uid);
    try {
      await updateDoc(doc(db, 'issues', issue.id), {
        upvotes: increment(isUpvoted ? -1 : 1),
        upvotedBy: isUpvoted ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `issues/${issue.id}`);
    }
  };

  const filteredIssues = categoryFilter === 'All'
    ? issues
    : issues.filter(i => i.category === categoryFilter);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen w-full overflow-hidden bg-surface-container flex flex-col">
        <div className="absolute inset-0 z-0">
          <IssueMap issues={issues} className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface/95 via-surface/80 to-surface/20 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-surface/50 via-transparent to-surface pointer-events-none"></div>
        </div>

        <div className="relative z-10 max-w-screen-2xl mx-auto px-6 flex-1 flex items-center w-full pt-28 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl bg-white/80 backdrop-blur-2xl p-10 md:p-12 rounded-[3rem] border border-white/50 shadow-[0_20px_80px_rgba(0,0,0,0.1)]"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-black tracking-[0.2em] uppercase mb-8 border border-primary/20 shadow-inner">
              <MapPin size={16} strokeWidth={2.5} />
              Live Community Dashboard
            </div>
            <h1 className="font-headline text-5xl lg:text-7xl font-black text-primary leading-[1.05] mb-6 tracking-tighter">
              Your City, <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Better Together.</span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed mb-10 font-medium">
              Real-time civic engagement. Report issues, track resolutions, and see the impact of community action on our live interactive map.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/report"
                className="bg-primary text-white px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-primary/30 hover:bg-primary-container hover:scale-105 transition-all duration-500 active:scale-95 group"
              >
                Report an Issue
                <ArrowRight size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/map"
                className="bg-white text-primary border-2 border-primary/10 px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-surface-container hover:border-primary/30 transition-all duration-500 active:scale-95"
              >
                <MapIcon size={20} strokeWidth={2.5} />
                Explore Map
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Activity Stream */}
      <section className="py-24 bg-surface relative z-20">
        <div className="max-w-screen-2xl mx-auto px-6">
          {user && myIssues.length > 0 && (
            <div className="mb-16">
              <h3 className="font-headline text-2xl font-extrabold text-primary flex items-center gap-3 mb-6">
                <User size={28} />
                My Recent Reports
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {myIssues.map(issue => (
                  <Link 
                    key={issue.id} 
                    to={`/issue/${issue.id}`}
                    className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-all"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden mb-3">
                      <img src={issue.imageUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <h4 className="text-xs font-bold text-primary truncate">{issue.title}</h4>
                    <StatusBadge status={issue.status} size="xs" className="mt-2 inline-block" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-10">
            <h3 className="font-headline text-3xl font-extrabold text-primary flex items-center gap-3">
              <List size={32} />
              Recent Activity
            </h3>
            <div className="flex gap-4">
              <button 
                onClick={() => setSortBy(sortBy === 'recent' ? 'upvotes' : 'recent')}
                className="px-4 py-2 bg-surface-container text-primary text-xs font-bold rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors flex items-center gap-2"
              >
                <ArrowUpDown size={14} />
                Sort By: {sortBy === 'recent' ? 'Newest' : 'Most Upvoted'}
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors flex items-center gap-2 ${
                    categoryFilter !== 'All' 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-surface-container text-primary border-outline-variant hover:bg-surface-container-low'
                  }`}
                >
                  <Filter size={14} />
                  {categoryFilter === 'All' ? 'Filter By Type' : categoryFilter}
                  {categoryFilter !== 'All' && (
                    <X size={12} onClick={(e) => { e.stopPropagation(); setCategoryFilter('All'); setShowFilterMenu(false); }} />
                  )}
                </button>
                <AnimatePresence>
                  {showFilterMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-outline-variant/20 overflow-hidden z-30 min-w-[200px]"
                    >
                      <button
                        onClick={() => { setCategoryFilter('All'); setShowFilterMenu(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${categoryFilter === 'All' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                      >
                        All Categories
                      </button>
                      {CATEGORY_IDS.map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setCategoryFilter(cat); setShowFilterMenu(false); }}
                          className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${categoryFilter === cat ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-surface-container animate-pulse rounded-2xl"></div>
              ))}
            </div>
          ) : filteredIssues.length === 0 ? (
            <EmptyState 
              title="No issues found" 
              message={categoryFilter !== 'All' ? `No "${categoryFilter}" issues reported yet.` : 'No civic issues have been reported yet. Be the first!'} 
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIssues.map((issue) => (
                <Link
                  key={issue.id}
                  to={`/issue/${issue.id}`}
                  className="bg-surface-container-low p-5 rounded-2xl border border-transparent hover:border-primary/20 hover:shadow-lg transition-all group"
                >
                  <div className="flex gap-5 items-start">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 shadow-sm">
                      <img
                        src={issue.imageUrl || 'https://placeholder.pics/svg/100x100'}
                        alt={issue.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <StatusBadge status={issue.status} />
                        <span className="text-[10px] text-outline font-bold">
                          {formatDate(issue.reportedAt)}
                        </span>
                      </div>
                      <h4 className="font-bold text-primary text-lg truncate group-hover:text-primary-container transition-colors">
                        {issue.title}
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed line-clamp-2">
                        {issue.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="px-2 py-1 bg-outline-variant/20 text-[10px] font-bold rounded">
                          {issue.category}
                        </span>
                        <button 
                          onClick={(e) => handleUpvote(e, issue)}
                          className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg transition-all ${
                            auth.currentUser && issue.upvotedBy?.includes(auth.currentUser.uid)
                              ? 'bg-primary text-white'
                              : 'bg-surface-container text-primary hover:bg-primary/10'
                          }`}
                        >
                          <ThumbsUp size={12} fill={auth.currentUser && issue.upvotedBy?.includes(auth.currentUser.uid) ? "currentColor" : "none"} />
                          {issue.upvotes || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
