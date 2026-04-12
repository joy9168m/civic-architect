import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import IssueMap from '../components/IssueMap';
import StatusBadge from '../components/StatusBadge';
import { Map as MapIcon, Search, Info, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORY_IDS } from '../lib/constants';

export default function PublicMap() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mapMode, setMapMode] = useState<'cluster' | 'heat'>('cluster');
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('reportedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'issues');
    });
    return () => unsubscribe();
  }, []);

  const filteredIssues = issues.filter(issue => {
    const matchesFilter = filter === 'All' || issue.category === filter;
    const matchesSearch = issue.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (issue.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const categories = ['All', ...CATEGORY_IDS];

  const handleMapClick = (lat: number, lng: number) => {
    navigate('/report', { state: { prefilledLocation: { lat, lng } } });
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row overflow-hidden bg-surface relative">
      {/* Sidebar Controls */}
      <div 
        className={`absolute lg:relative w-full lg:w-96 h-full bg-white border-r border-outline-variant/20 flex flex-col shadow-2xl lg:shadow-xl z-30 transition-all duration-500 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:ml-[-24rem]'
        }`}
      >
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl font-black text-primary flex items-center gap-2 mb-2">
              <MapIcon size={28} />
              Public Map
            </h1>
            <p className="text-xs text-outline font-bold uppercase tracking-widest">Live Infrastructure Feed</p>
          </div>
          <button 
            className="lg:hidden p-2 text-outline hover:bg-surface-container rounded-xl"
            onClick={() => setIsSidebarOpen(false)}
          >
            <ChevronLeft size={24} />
          </button>
        </div>

        {/* Desktop Sidebar Handle - Attached directly to sidebar edge */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden lg:flex absolute top-1/2 -right-8 -translate-y-1/2 w-8 h-16 bg-white border-y border-r border-outline-variant/20 border-l-0 rounded-r-xl shadow-xl items-center justify-center cursor-pointer hover:bg-surface-container-lowest text-outline hover:text-primary transition-all z-[100]"
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? <ChevronLeft size={20} strokeWidth={3} /> : <ChevronRight size={20} strokeWidth={3} />}
        </button>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-hide">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input 
              type="text" 
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-2xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-outline tracking-widest mb-3 block">Filter By Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${
                    filter === cat 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'bg-surface-container text-primary hover:bg-primary/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-primary uppercase tracking-widest">Recent Reports</h3>
              <span className="text-[10px] font-black text-outline bg-surface-container px-2 py-0.5 rounded-full">
                {filteredIssues.length} found
              </span>
            </div>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredIssues.slice(0, 10).map((issue) => (
                  <motion.div
                    layout
                    key={issue.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-all group"
                  >
                    <Link to={`/issue/${issue.id}`} className="flex gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container flex-shrink-0">
                        <img src={issue.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-primary truncate group-hover:text-primary-container transition-colors">
                          {issue.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={issue.status} size="xs" />
                          <span className="text-[8px] text-outline font-bold uppercase">{issue.category}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/10">
          <div className="flex items-center gap-3 text-primary/60">
            <Info size={16} />
            <p className="text-[10px] font-bold leading-tight">Click markers on the map to see details and upvote issues.</p>
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 relative z-10">
        {/* Mobile Floating Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden absolute top-4 left-4 z-[9999] bg-white p-3 rounded-2xl shadow-xl border border-outline-variant/20 text-primary hover:bg-surface-container-low transition-all hover:scale-105 active:scale-95"
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? <ChevronLeft size={20} strokeWidth={3} /> : <Menu size={20} strokeWidth={3} />}
        </button>

        {/* Floating Map Mode Toggle (Non-Distracting) */}
        <div className="absolute top-4 right-4 z-[9999] bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-lg border border-outline-variant/20 flex items-center overflow-hidden">
          <button
            onClick={() => setMapMode('cluster')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              mapMode === 'cluster' 
                ? 'bg-primary text-white shadow-md' 
                : 'text-outline hover:text-primary hover:bg-surface-container-low'
            }`}
          >
            Pins
          </button>
          <button
            onClick={() => setMapMode('heat')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              mapMode === 'heat' 
                ? 'bg-error text-white shadow-md' 
                : 'text-outline hover:text-error hover:bg-surface-container-low'
            }`}
          >
            Heatmap
          </button>
        </div>

        <IssueMap 
          mode={mapMode}
          issues={filteredIssues} 
          className="w-full h-full" 
          onMapClick={handleMapClick}
        />
      </div>
    </div>
  );
}
