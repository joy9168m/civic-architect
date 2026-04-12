import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { analyzeIssueImage } from '../lib/gemini';
import { Camera, MapPin, Send, X, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES, SEVERITY_OPTIONS } from '../lib/constants';
import { getHaversineDistance, reverseGeocode, forwardGeocode, calculatePriorityScore } from '../lib/utils';
import { toast } from '../components/Toast';

export default function QuickReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [issueData, setIssueData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [address, setAddress] = useState('');
  const [duplicates, setDuplicates] = useState<any[]>([]);

  useEffect(() => {
    const state = location.state as { prefilledLocation?: { lat: number, lng: number } } | null;
    if (state?.prefilledLocation) {
      setCoords(state.prefilledLocation);
      reverseGeocode(state.prefilledLocation.lat, state.prefilledLocation.lng).then(setAddress);
    } else {
      // Best Practice: Attempt high-accuracy HTML5 GPS first.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
            setCoords(loc);
            reverseGeocode(loc.lat, loc.lng).then(setAddress);
          },
          (error) => {
            console.warn("GPS failed or blocked, falling back to IP detection...", error);
            fetchIPLocation();
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        fetchIPLocation();
      }
    }
  }, [location.state]);

  const fetchIPLocation = () => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.latitude && data.longitude) {
          const loc = { lat: data.latitude, lng: data.longitude };
          setCoords(loc);
          reverseGeocode(loc.lat, loc.lng).then((addr) => {
             setAddress(addr || `${data.city}, ${data.region}`);
          });
        }
      })
      .catch(err => console.error("IP Geolocation failed entirely.", err));
  };

  const checkForDuplicates = async (cat: string, lat: number, lng: number, title: string, description: string) => {
    const range = 0.005;
    const q = query(
      collection(db, 'issues'),
      where('lat', '>=', lat - range),
      where('lat', '<=', lat + range)
    );
    
    try {
      const snapshot = await getDocs(q);
      const candidates = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((issue: any) => Math.abs(issue.lng - lng) <= range && issue.status !== 'Resolved');

      const getSimilarity = (s1: string, s2: string) => {
        const words1 = new Set((s1 || '').toLowerCase().split(/\W+/).filter(w => w.length > 3));
        const words2 = new Set((s2 || '').toLowerCase().split(/\W+/).filter(w => w.length > 3));
        if (words1.size === 0 || words2.size === 0) return 0;
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        return intersection.size / Math.min(words1.size, words2.size);
      };

      const potentialDuplicates = candidates.map((issue: any) => {
        const distance = getHaversineDistance(lat, lng, issue.lat, issue.lng);
        const titleSim = getSimilarity(title, issue.title);
        const descSim = getSimilarity(description, issue.description);
        const distanceScore = Math.max(0, 1 - (distance / 200));
        let categoryScore = 0;
        if (issue.category === cat) categoryScore = 1;
        else if (issue.category === 'Other Issue' || cat === 'Other Issue') categoryScore = 0.5;
        const textScore = (titleSim * 0.7) + (descSim * 0.3);
        const totalScore = (distanceScore * 0.5) + (categoryScore * 0.2) + (textScore * 0.3);
        return { ...issue, duplicateScore: totalScore, distance: Math.round(distance) };
      })
        .filter((issue: any) => issue.duplicateScore > 0.45)
        .sort((a: any, b: any) => b.duplicateScore - a.duplicateScore)
        .slice(0, 3);

      setDuplicates(potentialDuplicates);
    } catch (error) {
      console.error("Duplicate check failed", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setImage(base64);
      setAnalyzing(true);
      try {
        const base64Data = base64.split(',')[1];
        const analysis = await analyzeIssueImage(base64Data, file.type);
        setIssueData(analysis);
        const finalCategory = analysis.category || category;
        if (analysis.category) setCategory(analysis.category);
        
        if (coords) {
          await checkForDuplicates(finalCategory, coords.lat, coords.lng, analysis.title || '', analysis.description || '');
        }
        setStep(3);
      } catch (error: any) {
        console.error("Analysis failed", error);
        toast(error.message || 'Image analysis failed. You can still fill in the details manually.', 'error');
        setStep(3);
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setSubmitting(true);
    
    // Resolve location properly if they completely manually typed a new address
    let finalLat = coords?.lat || 0;
    let finalLng = coords?.lng || 0;
    if (address && address.length > 5) {
       const geocoded = await forwardGeocode(address);
       if (geocoded) {
          finalLat = geocoded.lat;
          finalLng = geocoded.lng;
       }
    }

    try {
      // Automatic Merging logic if a strong duplicate is found
      if (duplicates.length > 0 && duplicates[0].duplicateScore > 0.8) {
        const parentIssue = duplicates[0];
        const newDupVol = (parentIssue.duplicateVolume || 0) + 1;
        const newPriorityScore = calculatePriorityScore(parentIssue.severity, parentIssue.upvotes || 0, newDupVol);
        
        // Update Parent Priority & Counter
        await updateDoc(doc(db, 'issues', parentIssue.id), {
          duplicateVolume: increment(1),
          priorityScore: newPriorityScore
        });

        // Add this report as a merged duplicate
        await addDoc(collection(db, 'issues'), {
          title: issueData?.title || `Reported ${category}`,
          description: issueData?.description || 'No description provided.',
          category,
          severity: issueData?.severity || 'Moderate',
          status: 'Resolved', // Automatically hide duplicate from main maps
          isDuplicate: true,
          parentIssueId: parentIssue.id,
          reportedAt: new Date().toISOString(),
          reportedBy: auth.currentUser.uid,
          authorName: auth.currentUser.displayName,
          imageUrl: image,
          upvotes: 0,
          upvotedBy: [],
          duplicateVolume: 0,
          priorityScore: 0,
          address: address || `${finalLat.toFixed(4)}, ${finalLng.toFixed(4)}`,
          lat: finalLat,
          lng: finalLng,
        });

        toast(`Duplicate detected! Merged with Report #${parentIssue.id.slice(0, 5)} to increase priority.`, 'success');
        navigate(`/issue/${parentIssue.id}`);
        return;
      }

      // Normal Issue Creation
      const initialPriority = calculatePriorityScore(issueData?.severity || 'Moderate', 0, 0);

      await addDoc(collection(db, 'issues'), {
        title: issueData?.title || `Reported ${category}`,
        description: issueData?.description || 'No description provided.',
        category,
        severity: issueData?.severity || 'Moderate',
        status: 'Pending',
        isDuplicate: false,
        parentIssueId: null,
        reportedAt: new Date().toISOString(),
        reportedBy: auth.currentUser.uid,
        authorName: auth.currentUser.displayName,
        imageUrl: image,
        upvotes: 0,
        upvotedBy: [],
        duplicateVolume: 0,
        priorityScore: initialPriority,
        address: address || `${finalLat.toFixed(4)}, ${finalLng.toFixed(4)}`,
        lat: finalLat,
        lng: finalLng,
      });
      toast('Report submitted successfully!', 'success');
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'issues');
      toast('Failed to submit report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight">Quick Report</h1>
        <p className="text-on-surface-variant font-medium text-lg">Tap to start your civic report</p>
      </div>

      <div className="space-y-12">
        {/* Step 1: Category */}
        <section className="space-y-6">
          <h2 className={`text-xs font-black uppercase tracking-[0.2em] px-3 py-1 rounded ${step === 1 ? 'bg-primary/10 text-primary' : 'text-outline/40'}`}>
            01 Select Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.id); setStep(2); }}
                className={`flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
                  category === cat.id 
                    ? 'bg-primary text-white border-primary shadow-xl scale-105' 
                    : 'bg-surface-container-low border-transparent hover:border-primary/20'
                }`}
              >
                <cat.icon size={32} />
                <span className="font-bold text-center leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Photo */}
        <section className={`space-y-6 pt-8 border-t border-surface-container ${step < 2 ? 'opacity-30 pointer-events-none' : ''}`}>
          <h2 className={`text-xs font-black uppercase tracking-[0.2em] ${step === 2 ? 'text-primary' : 'text-outline/40'}`}>
            02 Visual Evidence
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative aspect-video md:aspect-square rounded-2xl bg-primary flex flex-col items-center justify-center text-white cursor-pointer hover:bg-primary-container transition-colors shadow-xl overflow-hidden">
              {analyzing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin" size={48} />
                  <span className="text-lg font-bold">Analyzing with AI...</span>
                </div>
              ) : (
                <>
                  <Camera size={48} className="mb-2" />
                  <span className="text-lg font-bold">Snap Photo</span>
                  <p className="text-xs text-white/60 mt-1">Immediate upload</p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>
            {image && (
              <div className="aspect-square bg-surface-container rounded-2xl overflow-hidden relative">
                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => { setImage(null); setIssueData(null); setStep(2); }}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full backdrop-blur hover:bg-black/70"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Step 3: Confirmation */}
        <AnimatePresence>
          {step === 3 && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6 pt-8 border-t border-surface-container"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">03 Confirm Details</h2>
                {issueData && (
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    AI Analysis Complete
                  </span>
                )}
              </div>
              
              <div className="bg-surface-container-low p-6 rounded-2xl space-y-4">
                {duplicates.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-bold text-amber-900">Potential Duplicate Found</p>
                      <p className="text-xs text-amber-700 mb-2">There are {duplicates.length} similar issues reported nearby. Please check if your issue is already listed.</p>
                      <div className="flex flex-col gap-2">
                        {duplicates.map(dup => (
                          <div key={dup.id} className="bg-white p-3 rounded-lg border border-amber-200 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-amber-900 truncate max-w-[200px]">{dup.title}</p>
                              <p className="text-[10px] text-amber-700 font-medium">
                                {dup.distance}m away • {dup.category}
                              </p>
                            </div>
                            <Link 
                              to={`/issue/${dup.id}`} 
                              target="_blank"
                              className="text-[10px] font-black bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-md text-amber-800 uppercase transition-colors"
                            >
                              View
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs font-black uppercase text-outline tracking-widest">Title</label>
                  <input 
                    value={issueData?.title || ''} 
                    onChange={(e) => setIssueData({...issueData, title: e.target.value})}
                    className="w-full bg-transparent border-b border-outline-variant py-2 font-bold text-primary outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-outline tracking-widest">Description</label>
                  <textarea 
                    value={issueData?.description || ''} 
                    onChange={(e) => setIssueData({...issueData, description: e.target.value})}
                    className="w-full bg-transparent border-b border-outline-variant py-2 text-on-surface outline-none focus:border-primary resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-black uppercase text-outline tracking-widest">Severity</label>
                    <select 
                      value={issueData?.severity || 'Moderate'}
                      onChange={(e) => setIssueData({...issueData, severity: e.target.value})}
                      className="w-full bg-transparent border-b border-outline-variant py-2 font-bold text-primary outline-none"
                    >
                      {SEVERITY_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-black uppercase text-outline tracking-widest">Location</label>
                    <div className="flex items-center gap-2 py-2 border-b border-outline-variant">
                      <MapPin size={16} className="text-primary shrink-0" />
                      <input 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Detecting... (Type exact address)"
                        className="w-full bg-transparent text-sm font-bold text-primary outline-none truncate focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`w-full py-5 rounded-3xl text-white text-xl font-black shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 ${
                  duplicates.length > 0 && duplicates[0].duplicateScore > 0.8
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                    : 'bg-primary hover:bg-primary-container shadow-primary/20'
                }`}
              >
                {submitting ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                {duplicates.length > 0 && duplicates[0].duplicateScore > 0.8 ? 'Merge Report & Boost Priority' : 'Submit Report'}
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
