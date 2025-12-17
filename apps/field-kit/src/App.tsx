import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { Camera, FileText, Plus, Wifi, WifiOff, Lock, Unlock, Shield, AlertTriangle } from 'lucide-react';
import { storage } from './lib/storage';
import { syncEngine } from './lib/sync-engine';
import { securityManager } from './lib/security';
import { FieldCaseSnapshot, FieldNote, FieldMediaCapture, FieldEntity, SensitivityLevel, LicenseType } from './types';
import { v4 as uuidv4 } from 'uuid';

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = () => {
    if (securityManager.unlock(pin)) {
      setPin('');
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 space-y-6">
      <div className="bg-gray-900 p-6 rounded-full">
        <Lock size={48} className="text-red-500" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Session Locked</h1>
      <p className="text-gray-400 text-center">Enter PIN to resume field operations</p>

      <div className="w-full max-w-xs space-y-4">
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          className={`w-full bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-700'} p-4 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 ring-blue-500`}
        />
        <button
          onClick={handleUnlock}
          className="w-full bg-blue-600 active:bg-blue-700 text-white p-4 rounded-lg font-bold text-lg"
        >
          UNLOCK
        </button>
      </div>
    </div>
  );
}

function Dashboard() {
  const [cases, setCases] = useState<FieldCaseSnapshot[]>([]);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    const allCases = await storage.getAllCases();
    setCases(allCases);
  };

  const createMockCase = async () => {
    const newCase: FieldCaseSnapshot = {
      id: uuidv4(),
      title: `Mission ${new Date().toLocaleDateString()}`,
      description: 'Field operation snapshot',
      status: 'active',
      entities: [
        { id: 'e1', type: 'Person', label: 'Suspect A' },
        { id: 'e2', type: 'Location', label: 'Warehouse 13' },
        { id: 'e3', type: 'Event', label: 'Protest' }
      ],
      lastSynced: new Date().toISOString(),
      notes: [],
      media: []
    };
    await storage.saveCase(newCase);
    loadCases();
  };

  return (
    <div className="p-4 space-y-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Missions</h1>
        <button
          onClick={createMockCase}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg"
          aria-label="New Mission"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="grid gap-4">
        {cases.map(c => (
          <Link key={c.id} to={`/case/${c.id}`} className="block">
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg active:bg-gray-800 transition-colors">
              <h2 className="text-xl font-semibold text-blue-400">{c.title}</h2>
              <p className="text-gray-400 text-sm mt-1">{c.description}</p>
              <div className="flex justify-between mt-3 text-xs text-gray-500 uppercase tracking-wide">
                <span>{c.status}</span>
                <span>Synced: {new Date(c.lastSynced).toLocaleTimeString()}</span>
              </div>
            </div>
          </Link>
        ))}
        {cases.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No active missions. Tap + to start.
          </div>
        )}
      </div>
    </div>
  );
}

function CaseView() {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<FieldCaseSnapshot | null>(null);
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (caseId: string) => {
    const c = await storage.getCase(caseId);
    if (c) {
      setCaseData(c);
      const ns = await storage.getNotesForCase(caseId);
      setNotes(ns);
    }
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && id) {
      const file = e.target.files[0];

      const mediaCapture: FieldMediaCapture = {
        id: uuidv4(),
        caseId: id,
        type: file.type.startsWith('video') ? 'video' : 'photo',
        blob: file,
        mimeType: file.type,
        timestamp: new Date().toISOString(),
        metadata: {
            filename: file.name,
            size: file.size
        },
        tags: [],
        sensitivity: 'GREEN', // Default
        license: 'USGOV', // Default
        syncStatus: 'pending'
      };

      await storage.saveMedia(mediaCapture);
      await syncEngine.enqueue({
        id: uuidv4(),
        type: 'media',
        action: 'create',
        payload: { ...mediaCapture, blob: null }, // Don't put blob in queue payload if it's large, handle separately or ref it
        timestamp: Date.now(),
        retries: 0
      });

      // Force reload of case data/media list if we were displaying it
      // For now just feedback
      alert(`Captured ${file.name}. Saved and Queued.`);
    }
  };

  if (!caseData) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 flex flex-col h-screen bg-black text-white">
      <header className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate('/')} className="text-gray-400 text-sm">← Back</button>
        <h1 className="text-xl font-bold truncate flex-1">{caseData.title}</h1>
      </header>

      <div className="flex-1 overflow-y-auto space-y-3 pb-24">
        {notes.map(n => (
          <div key={n.id} className={`p-3 rounded border-l-4 ${n.sensitivity === 'RED' ? 'border-red-600 bg-red-900/20' : n.sensitivity === 'AMBER' ? 'border-yellow-600 bg-yellow-900/20' : 'border-green-600 bg-gray-900'}`}>
            <p className="text-white text-lg">{n.content}</p>
            {n.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                    {n.tags.map(t => (
                        <span key={t} className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded">{t}</span>
                    ))}
                </div>
            )}
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                {n.sensitivity === 'RED' && <Shield size={12} className="text-red-500" />}
                {new Date(n.timestamp).toLocaleTimeString()}
              </span>
              <span>{n.syncStatus}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 p-4 grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate(`/case/${id}/note`)}
          className="bg-gray-800 active:bg-gray-700 text-white p-4 rounded-lg flex flex-col items-center gap-2"
        >
          <FileText size={32} className="text-yellow-500" />
          <span className="font-bold">ADD NOTE</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-gray-800 active:bg-gray-700 text-white p-4 rounded-lg flex flex-col items-center gap-2"
        >
          <Camera size={32} className="text-red-500" />
          <span className="font-bold">CAPTURE</span>
        </button>
        <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*"
            capture="environment"
            onChange={handleCapture}
        />
      </div>
    </div>
  );
}

function NoteEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>('GREEN');
  const [license, setLicense] = useState<LicenseType>('USGOV');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableEntities, setAvailableEntities] = useState<FieldEntity[]>([]);

  useEffect(() => {
    if (id) {
        storage.getCase(id).then(c => {
            if (c) setAvailableEntities(c.entities);
        });
    }
  }, [id]);

  const toggleTag = (entityLabel: string) => {
      setSelectedTags(prev =>
        prev.includes(entityLabel) ? prev.filter(t => t !== entityLabel) : [...prev, entityLabel]
      );
  };

  const saveNote = async () => {
    if (!id || !content.trim()) return;

    const note: FieldNote = {
      id: uuidv4(),
      caseId: id,
      content,
      timestamp: new Date().toISOString(),
      attachments: [],
      tags: selectedTags,
      sensitivity,
      license,
      syncStatus: 'pending'
    };

    await storage.saveNote(note);
    await syncEngine.enqueue({
      id: uuidv4(),
      type: 'note',
      action: 'create',
      payload: note,
      timestamp: Date.now(),
      retries: 0
    });

    navigate(-1);
  };

  return (
    <div className="p-4 h-screen flex flex-col bg-black text-white overflow-y-auto">
       <header className="mb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-gray-400">Cancel</button>
        <h1 className="text-xl font-bold">New Note</h1>
        <button onClick={saveNote} className="text-blue-500 font-bold text-lg">SAVE</button>
      </header>

      <textarea
        className="flex-1 bg-gray-900 text-white p-4 rounded text-lg resize-none focus:outline-none focus:ring-2 ring-blue-500 min-h-[200px]"
        placeholder="Type observation..."
        value={content}
        onChange={e => setContent(e.target.value)}
        autoFocus
      />

      <div className="mt-4 space-y-4">
        {/* Sensitivity & License */}
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase font-bold">Sensitivity</label>
                <div className="flex bg-gray-900 rounded p-1">
                    {(['GREEN', 'AMBER', 'RED'] as SensitivityLevel[]).map(level => (
                        <button
                            key={level}
                            onClick={() => setSensitivity(level)}
                            className={`flex-1 text-xs py-2 rounded font-bold ${sensitivity === level ? (level === 'RED' ? 'bg-red-600' : level === 'AMBER' ? 'bg-yellow-600' : 'bg-green-600') : 'text-gray-500'}`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase font-bold">License</label>
                <select
                    value={license}
                    onChange={e => setLicense(e.target.value as LicenseType)}
                    className="w-full bg-gray-900 text-white p-2 rounded text-sm focus:outline-none focus:ring-1 ring-blue-500"
                >
                    <option value="USGOV">USGOV</option>
                    <option value="OSINT">OSINT</option>
                    <option value="COMMERCIAL">COMMERCIAL</option>
                </select>
            </div>
        </div>

        {/* Tagging */}
        <div className="space-y-2 pb-4">
            <label className="text-xs text-gray-500 uppercase font-bold">Tag Entities</label>
            <div className="flex flex-wrap gap-2">
                {availableEntities.map(entity => (
                    <button
                        key={entity.id}
                        onClick={() => toggleTag(entity.label)}
                        className={`text-sm px-3 py-1 rounded-full border ${selectedTags.includes(entity.label) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-gray-700 text-gray-400'}`}
                    >
                        {entity.label}
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    securityManager.setLockListener(locked => setIsLocked(locked));

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-black text-white font-sans max-w-md mx-auto relative border-x border-gray-800">
        {isLocked && <LockScreen onUnlock={() => setIsLocked(false)} />}
        <div className={`absolute top-0 right-0 p-2 z-50 ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
          {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
        </div>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/case/:id" element={<CaseView />} />
          <Route path="/case/:id/note" element={<NoteEditor />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
