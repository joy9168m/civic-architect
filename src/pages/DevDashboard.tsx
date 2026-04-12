import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  Terminal, Zap, Trash2, Database, 
  RefreshCw, CheckCircle2, Loader2, Upload
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import { toast } from '../components/Toast';
import { CATEGORY_IDS, SEVERITY_OPTIONS } from '../lib/constants';

const MOCK_TITLES = [
  'Massive Pothole on Main St', 'Overflowing Public Bin', 'Broken Street Lamp', 
  'Graffiti on Community Center', 'Burst Pipe / Water Leak', 'Dangerous Cracked Sidewalk',
  'Illegal Dumping Site', 'Fallen Tree Branch', 'Traffic Light Malfunction', 'Abandoned Vehicle'
];

const MOCK_NAMES = [
  'Sarah Jenkins', 'Marcus Rivera', 'Emily Chen', 'David Patel', 
  'Jessica Wright', 'Michael Chang', 'Sophie Martin', 'James Kim',
  'Anna Thompson', 'Robert Wilson'
];

const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1516198642999-5ea0cbdd6cc9?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1627067345864-4e2bbffafe26?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1562602796-039c9480d19f?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522067746430-b3013d500cb4?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1606132717147-380d0dcefae2?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1533654497670-652a22fd6fe7?auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1605807963391-766b1ba85c39?auto=format&fit=crop&q=80',
];

export default function DevDashboard() {
  const { userData } = useAuth();
  const [running, setRunning] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });
  
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeText, setPurgeText] = useState('');
  
  const [bulkJson, setBulkJson] = useState('');
  const [bulkError, setBulkError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'issues'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const total = snapshot.size;
      const pending = snapshot.docs.filter(d => d.data().status === 'Pending').length;
      const resolved = snapshot.docs.filter(d => d.data().status === 'Resolved').length;
      setStats({ total, pending, resolved });
    });
    return () => unsubscribe();
  }, []);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));

  const generateMockIssues = async () => {
    setRunning('generate');
    addLog('Starting mock issue generation...');
    try {
      const batch = writeBatch(db);
      
      // Select a random epicenter to demonstrate the "Geo Clustering" effect
      const epicenterLat = 37.7749 + (Math.random() - 0.5) * 0.05;
      const epicenterLng = -122.4194 + (Math.random() - 0.5) * 0.05;

      for (let i = 0; i < 10; i++) {
        // The first 5 issues will artificially form a dense "hotspot" epicenter
        // The remaining 5 are scattered outliers to demonstrate low-severity/low-interaction points
        const isEpicenter = i < 5;
        
        const lat = isEpicenter 
            ? epicenterLat + (Math.random() - 0.5) * 0.002 // Tightly clustered
            : 37.7749 + (Math.random() - 0.5) * 0.15;      // Broadly scattered
            
        const lng = isEpicenter 
            ? epicenterLng + (Math.random() - 0.5) * 0.002 
            : -122.4194 + (Math.random() - 0.5) * 0.15;
            
        const cat = CATEGORY_IDS[Math.floor(Math.random() * CATEGORY_IDS.length)];
        const title = MOCK_TITLES[Math.floor(Math.random() * MOCK_TITLES.length)];
        const author = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
        const img = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];
        
        // Emulate dynamic human interactions: The Core epicenter issue gets massive attention
        const isCoreIssue = isEpicenter && i === 0;
        const sev = isCoreIssue ? 'Critical' : SEVERITY_OPTIONS[Math.floor(Math.random() * SEVERITY_OPTIONS.length)];
        const upvotes = isCoreIssue ? Math.floor(Math.random() * 200) + 150 : Math.floor(Math.random() * 15);
        const duplicateVolume = isCoreIssue ? Math.floor(Math.random() * 10) + 5 : 0;
        
        const newDocRef = doc(collection(db, 'issues'));
        batch.set(newDocRef, {
          title: `${title} #${Math.floor(Math.random() * 1000)}`,
          description: isCoreIssue ? 'CRITICAL EPICENTER: Massive civic failure requiring immediate attention. Multiple duplicates detected in this exact vicinity.' : 'This is a standard demonstrative issue logged for the hackathon showcase.',
          category: cat,
          severity: sev,
          status: Math.random() > 0.8 ? 'In Progress' : 'Pending',
          reportedAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString(),
          reportedBy: `mock-user-${Math.floor(Math.random() * 10000)}`,
          authorName: author,
          imageUrl: img,
          upvotes: upvotes,
          upvotedBy: [],
          duplicateVolume: duplicateVolume,
          address: isCoreIssue ? 'EPICENTER ZONE' : 'Downtown Metro Area',
          lat: lat,
          lng: lng,
        });
      }
      await batch.commit();
      addLog('Generated 10 cinematic issues with epicenters.');
      toast('Generated 10 issues (Hotspot Demo)', 'success');
    } catch (error) {
      addLog(`Error: ${error}`);
    } finally {
      setRunning(null);
    }
  };

  const executePurge = async () => {
    if (purgeText !== 'CONFIRM PURGE') return;
    setShowPurgeModal(false);
    setPurgeText('');
    setRunning('clear');
    addLog('Initiating database purge...');
    
    try {
      const q = query(collection(db, 'issues'));
      const snapshot = await getDocs(q);
      const batches: ReturnType<typeof writeBatch>[] = [];
      let currentBatch = writeBatch(db);
      let opCount = 0;
      
      snapshot.docs.forEach((document) => {
        currentBatch.delete(document.ref);
        opCount++;
        if (opCount === 490) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          opCount = 0;
        }
      });
      if (opCount > 0) batches.push(currentBatch);
      
      for (const batch of batches) await batch.commit();
      addLog(`Successfully purged ${snapshot.size} issues.`);
      toast(`Purged ${snapshot.size} issues`, 'success');
    } catch (error) {
      addLog(`Purge Error: ${error}`);
    } finally {
      setRunning(null);
    }
  };

  const handleBulkInsert = async () => {
    setBulkError('');
    if (!bulkJson.trim()) return;
    
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array of issue objects.');
      if (parsed.length > 490) throw new Error('Maximum 490 items allowed per batch insert.');

      setRunning('bulk');
      addLog(`Starting bulk insert of ${parsed.length} items...`);
      
      const batch = writeBatch(db);
      parsed.forEach((item: any, idx: number) => {
        if (!item.title || !item.category || !item.lat || !item.lng) {
          throw new Error(`Item at index ${idx} is missing required fields (title, category, lat, lng).`);
        }
        const newDocRef = doc(collection(db, 'issues'));
        batch.set(newDocRef, {
          ...item,
          status: item.status || 'Pending',
          reportedAt: item.reportedAt || new Date().toISOString(),
          reportedBy: item.reportedBy || auth.currentUser?.uid || 'dev-bulk',
          authorName: item.authorName || auth.currentUser?.displayName || 'Admin',
          upvotes: item.upvotes || 0,
          upvotedBy: item.upvotedBy || [],
        });
      });
      
      await batch.commit();
      addLog('Bulk insert successful.');
      toast(`Inserted ${parsed.length} issues`, 'success');
      setBulkJson('');
    } catch (error: any) {
      setBulkError(error.message);
      addLog(`Bulk Insert Error: ${error.message}`);
    } finally {
      setRunning(null);
    }
  };

  if (auth.currentUser?.email !== 'joydeepmondal9168j@gmail.com') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-8 max-w-screen-xl mx-auto">
      <div className="mb-10">
        <h1 className="font-headline text-4xl font-extrabold text-primary flex items-center gap-4">
          <Terminal size={40} className="text-primary" />
          Developer Portal
        </h1>
        <p className="text-on-surface-variant font-medium mt-2">Automated system tools and diagnostics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tools Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-outline-variant/20 shadow-xl">
            <h3 className="font-headline text-xl font-extrabold text-primary mb-6 flex items-center gap-2">
              <Zap size={24} className="text-amber-500" />
              Automated Tools
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={generateMockIssues}
                disabled={!!running}
                className="flex items-center justify-between p-6 bg-surface-container-low rounded-2xl border-2 border-transparent hover:border-primary transition-all group disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="font-black text-primary uppercase tracking-widest text-xs mb-1">Mock Generator</p>
                  <p className="text-[10px] text-outline">Create 10 cinematic issues</p>
                </div>
                {running === 'generate' ? <Loader2 className="animate-spin text-primary" /> : <Database className="text-secondary group-hover:text-primary" />}
              </button>

              <button
                onClick={() => setShowPurgeModal(true)}
                disabled={!!running}
                className="flex items-center justify-between p-6 bg-error-container/10 rounded-2xl border-2 border-transparent hover:border-error transition-all group disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="font-black text-error uppercase tracking-widest text-xs mb-1">Purge Database</p>
                  <p className="text-[10px] text-outline">Delete all issue reports</p>
                </div>
                {running === 'clear' ? <Loader2 className="animate-spin text-error" /> : <Trash2 className="text-outline group-hover:text-error" />}
              </button>
            </div>
          </div>

          {/* Bulk Insert Section */}
          <div className="bg-white p-8 rounded-[2rem] border border-outline-variant/20 shadow-xl">
            <h3 className="font-headline text-xl font-extrabold text-primary mb-6 flex items-center gap-2">
              <Upload size={24} className="text-secondary" />
              Bulk Insert Issues
            </h3>
            <div className="space-y-4">
              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                placeholder={'[\n  {\n    "title": "Example",\n    "category": "Road Damage",\n    "lat": 37.7749,\n    "lng": -122.4194\n  }\n]'}
                className="w-full h-40 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 font-mono text-xs text-on-surface outline-none focus:border-primary resize-none"
              />
              {bulkError && <p className="text-xs text-error font-bold">{bulkError}</p>}
              <button
                onClick={handleBulkInsert}
                disabled={!!running || !bulkJson.trim()}
                className="w-full py-3 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {running === 'bulk' ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                Execute Bulk Insert
              </button>
            </div>
          </div>

          <div className="bg-primary text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-headline text-xl font-extrabold mb-4">System Diagnostics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                  <p className="text-[10px] font-black uppercase opacity-60">Total Issues</p>
                  <p className="text-2xl font-black">{stats.total}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                  <p className="text-[10px] font-black uppercase opacity-60">Pending</p>
                  <p className="text-2xl font-black">{stats.pending}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                  <p className="text-[10px] font-black uppercase opacity-60">Resolved</p>
                  <p className="text-2xl font-black">{stats.resolved}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-widest mt-6">
                <CheckCircle2 size={16} />
                All Systems Operational
              </div>
            </div>
            <RefreshCw size={120} className="absolute -right-10 -bottom-10 text-white/5 rotate-12" />
          </div>
        </div>

        {/* Console Section */}
        <div className="bg-on-surface p-6 rounded-[2rem] shadow-2xl border border-white/10 font-mono text-xs text-emerald-400 h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
            <span className="uppercase font-black text-white/40 tracking-widest">System Console</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-error/50"></div>
              <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
            {logs.length === 0 ? (
              <p className="text-white/20 italic">No activity logs...</p>
            ) : (
              logs.map((log, i) => (
                <motion.p 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {log}
                </motion.p>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Purge Confirmation */}
      <ConfirmDialog
        open={showPurgeModal}
        title="CRITICAL WARNING"
        message="You are about to permanently delete ALL issue reports from the database. This action cannot be undone."
        confirmLabel="Purge All"
        confirmColor="error"
        icon={<Trash2 size={32} />}
        confirmText="CONFIRM PURGE"
        confirmTextValue={purgeText}
        onConfirmTextChange={setPurgeText}
        onConfirm={executePurge}
        onCancel={() => { setShowPurgeModal(false); setPurgeText(''); }}
        loading={running === 'clear'}
      />
    </div>
  );
}
