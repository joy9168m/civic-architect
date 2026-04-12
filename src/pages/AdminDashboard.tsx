import { useState, useEffect } from 'react';
import { collection, query, orderBy, where, onSnapshot, updateDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { 
  BarChart3, Clock, CheckCircle2, AlertCircle, 
  Search, Trash2,
  Map as MapIcon, List as ListIcon,
  ShieldCheck, Code, X, MessageSquare, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import IssueMap from '../components/IssueMap';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { toast } from '../components/Toast';
import { CATEGORIES, CATEGORY_IDS, SEVERITY_OPTIONS } from '../lib/constants';
import { getStatusClasses, getSeverityClasses, formatDate, formatTime } from '../lib/utils';

export default function AdminDashboard() {
  const { userData, loading: authLoading } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [createModalLocation, setCreateModalLocation] = useState<{lat: number, lng: number} | null>(null);
  const [newIssue, setNewIssue] = useState({ title: '', description: '', category: 'Road Damage', severity: 'Moderate' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<string | null>(null);
  // Full screen image view
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('reportedAt', 'desc'));
    const unsubscribeIssues = onSnapshot(q, (snapshot) => {
      setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'issues');
    });

    const wq = query(collection(db, 'users'), where('role', '==', 'worker'));
    const unsubscribeWorkers = onSnapshot(wq, (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeIssues();
      unsubscribeWorkers();
    };
  }, []);

  const handleMarkerClick = (issue: any) => {
    setSelectedIssueId(issue.id);
    setView('list');
    setTimeout(() => {
      document.getElementById(`issue-${issue.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCreateModalLocation({ lat, lng });
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createModalLocation || !auth.currentUser) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'issues'), {
        ...newIssue,
        lat: createModalLocation.lat,
        lng: createModalLocation.lng,
        status: 'Pending',
        reportedAt: new Date().toISOString(),
        reportedBy: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Admin',
        upvotes: 0,
        upvotedBy: [],
        address: `${createModalLocation.lat.toFixed(4)}, ${createModalLocation.lng.toFixed(4)}`,
        imageUrl: '',
      });
      setCreateModalLocation(null);
      setNewIssue({ title: '', description: '', category: 'Road Damage', severity: 'Moderate' });
      toast('Issue created successfully', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'issues');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'issues', id), { status });
      toast(`Status updated to "${status}"`, 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `issues/${id}`);
    }
  };

  const assignWorker = async (id: string, workerId: string) => {
    try {
      await updateDoc(doc(db, 'issues', id), { assignedWorkerId: workerId });
      toast(workerId ? 'Worker assigned' : 'Worker unassigned', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `issues/${id}`);
    }
  };

  const confirmDeleteIssue = async () => {
    if (!issueToDelete) return;
    const id = issueToDelete;
    setIssueToDelete(null);
    setIssues(prev => prev.filter(issue => issue.id !== id));
    try {
      await deleteDoc(doc(db, 'issues', id));
      toast('Issue deleted', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `issues/${id}`);
    }
  };



  const stats = {
    total: issues.length,
    pending: issues.filter(i => i.status === 'Pending').length,
    inProgress: issues.filter(i => i.status === 'In Progress').length,
    resolved: issues.filter(i => i.status === 'Resolved').length,
  };

  const filteredIssues = issues.filter(i => {
    const matchesSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         i.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userData?.role !== 'admin' && userData?.role !== 'dev') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-8 max-w-screen-2xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight flex items-center gap-3">
            {userData.role === 'dev' ? <Code size={36} /> : <ShieldCheck size={36} />}
            Issue Management
          </h1>
          <p className="text-on-surface-variant font-medium">Oversee and resolve community infrastructure reports</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div className="flex gap-3">
          <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
            <button 
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-primary text-white shadow-md' : 'text-outline hover:bg-surface-container'}`}
            >
              <ListIcon size={20} />
            </button>
            <button 
              onClick={() => setView('map')}
              className={`p-2 rounded-lg transition-all ${view === 'map' ? 'bg-primary text-white shadow-md' : 'text-outline hover:bg-surface-container'}`}
            >
              <MapIcon size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm w-64"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Reports', value: stats.total, icon: BarChart3, color: 'bg-primary text-white' },
          { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'bg-amber-100 text-amber-700' },
          { label: 'In Progress', value: stats.inProgress, icon: AlertCircle, color: 'bg-blue-100 text-blue-700' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-outline-variant/20 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-outline mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-primary">{stat.value}</h3>
            </div>
            <div className={`p-3 rounded-2xl ${stat.color}`}>
              <stat.icon size={24} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {['All', 'Pending', 'Investigating', 'In Progress', 'Resolved'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              statusFilter === status
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-surface-container-low text-outline hover:bg-surface-container border border-outline-variant/20'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Content View */}
      {view === 'list' ? (
        filteredIssues.length === 0 ? (
          <EmptyState title="No reports found" message="No issues match your current filters." />
        ) : (
          <div className="bg-white rounded-[2rem] border border-outline-variant/20 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/20">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-outline">Issue Details</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-outline">Category</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-outline">Severity</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-outline">Status</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-outline">Assigned Crew</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-outline">Reported</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-outline text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredIssues.map((issue) => (
                    <tr 
                      key={issue.id} 
                      id={`issue-${issue.id}`}
                      className={`hover:bg-surface-container-lowest transition-all group ${selectedIssueId === issue.id ? 'bg-primary/5 ring-2 ring-inset ring-primary' : ''}`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div 
                            className={`w-12 h-12 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 relative ${issue.imageUrl ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all group/image' : ''}`}
                            onClick={() => issue.imageUrl && setSelectedImage(issue.imageUrl)}
                          >
                            {issue.imageUrl ? (
                              <>
                                <img src={issue.imageUrl} alt="" className="w-full h-full object-cover group-hover/image:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity">
                                  <Search size={16} className="text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full bg-surface-container-high flex flex-col items-center justify-center text-outline/30">
                                <Search size={12} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-primary leading-tight">{issue.title}</p>
                            <p className="text-xs text-outline truncate max-w-[200px]">{issue.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 bg-secondary-container text-primary text-[10px] font-black rounded-full uppercase">
                          {issue.category}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase ${getSeverityClasses(issue.severity)}`}>
                          {issue.severity || 'Low'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <select
                          value={issue.status}
                          onChange={(e) => updateStatus(issue.id, e.target.value)}
                          className={`text-[10px] font-black rounded-full uppercase px-3 py-1 outline-none cursor-pointer ${getStatusClasses(issue.status)}`}
                        >
                          <option>Pending</option>
                          <option>Investigating</option>
                          <option>In Progress</option>
                          <option>Resolved</option>
                        </select>
                      </td>

                      <td className="px-6 py-5">
                        <select
                          value={issue.assignedWorkerId || ''}
                          onChange={(e) => assignWorker(issue.id, e.target.value)}
                          className={`text-[10px] font-black rounded-full uppercase px-3 py-1 outline-none cursor-pointer border ${
                            issue.assignedWorkerId ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-surface-container-low text-outline border-outline-variant/30'
                          }`}
                        >
                          <option value="">Unassigned</option>
                          {workers.map(w => (
                            <option key={w.uid} value={w.uid}>{w.displayName}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-primary">{formatDate(issue.reportedAt)}</p>
                        <p className="text-[10px] text-outline">{formatTime(issue.reportedAt)}</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={() => setIssueToDelete(issue.id)}
                          className="p-2 text-outline hover:text-error hover:bg-error/5 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white p-4 rounded-[2rem] border border-outline-variant/20 shadow-xl overflow-hidden h-[600px] relative">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-outline-variant/20 pointer-events-none">
            <p className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <MapIcon size={16} />
              Click anywhere on the map to create a report
            </p>
          </div>
          <IssueMap 
            issues={filteredIssues} 
            className="w-full h-full rounded-2xl" 
            onMarkerClick={handleMarkerClick}
            onMapClick={handleMapClick}
          />
        </div>
      )}

      {/* Create Issue Modal */}
      <AnimatePresence>
        {createModalLocation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-surface/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-outline-variant/20 relative"
            >
              <button 
                onClick={() => setCreateModalLocation(null)}
                className="absolute top-6 right-6 p-2 bg-surface-container rounded-full text-outline hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-2xl font-headline font-black text-primary mb-2">Create Report</h2>
              <p className="text-xs text-outline font-bold mb-6">Location: {createModalLocation.lat.toFixed(4)}, {createModalLocation.lng.toFixed(4)}</p>
              
              <form onSubmit={handleCreateIssue} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1">Title</label>
                  <input 
                    required
                    type="text" 
                    value={newIssue.title}
                    onChange={e => setNewIssue({...newIssue, title: e.target.value})}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium"
                    placeholder="Brief issue title"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1">Description</label>
                  <textarea 
                    required
                    value={newIssue.description}
                    onChange={e => setNewIssue({...newIssue, description: e.target.value})}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium h-24 resize-none"
                    placeholder="Detailed description..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1">Category</label>
                    <select 
                      value={newIssue.category}
                      onChange={e => setNewIssue({...newIssue, category: e.target.value})}
                      className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium"
                    >
                      {CATEGORY_IDS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1">Severity</label>
                    <select 
                      value={newIssue.severity}
                      onChange={e => setNewIssue({...newIssue, severity: e.target.value})}
                      className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium"
                    >
                      {SEVERITY_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 mt-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-container transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Report'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-10"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative max-w-5xl w-full max-h-full flex flex-col items-center justify-center rounded-3xl"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 sm:-right-8 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-[210] backdrop-blur-sm shadow-xl"
                title="Close View"
              >
                <X size={24} />
              </button>
              <img src={selectedImage} alt="Issue Full Preview" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!issueToDelete}
        title="Delete Report?"
        message="Are you sure you want to permanently delete this issue report? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor="error"
        icon={<Trash2 size={32} />}
        onConfirm={confirmDeleteIssue}
        onCancel={() => setIssueToDelete(null)}
      />
    </div>
  );
}
