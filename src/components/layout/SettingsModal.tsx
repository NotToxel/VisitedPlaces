import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Copy, Check, Upload, Download, AlertCircle, CheckCircle2, Sun, Moon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { serializePlaces, deserializePlaces } from '../../utils/serialization';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { places, loadPlaces, theme, toggleTheme } = useStore();
  const [importCode, setImportCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Clear All Data states
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [clearConfirmInput, setClearConfirmInput] = useState('');

  const myShareCode = serializePlaces(places);
  const countryCount = Object.keys(places).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(myShareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!importCode.trim()) {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
      return;
    }
    const deserialized = deserializePlaces(importCode.trim());
    if (deserialized) {
      loadPlaces(deserialized);
      setImportStatus('success');
      setImportCode('');
      setTimeout(() => setImportStatus('idle'), 3000);
    } else {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 3000);
    }
  };

  const handleClearAllData = () => {
    if (clearConfirmInput !== 'CLEAR') return;
    
    // Preserve current theme choice
    const currentTheme = theme;
    
    // Selectively remove app keys
    localStorage.removeItem('visited-places-storage');
    localStorage.removeItem('visited-places-v2');
    localStorage.removeItem('visited-places-compare-groups');
    localStorage.removeItem('visited-places-active-group-id');
    
    // Restore empty state with preserved theme
    localStorage.setItem('visited-places-storage', JSON.stringify({
      state: { theme: currentTheme, places: {} },
      version: 0
    }));
    
    // Trigger fresh reload to clear memory caches
    window.location.reload();
  };

  const drawer = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Centered Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md glass-panel rounded-2xl shadow-2xl p-6 z-50 flex flex-col gap-4 max-h-[85vh] overflow-y-auto select-none">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-base-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-base-content">Settings</h2>
            <p className="text-xs text-base-content/60 mt-0.5">
              {countryCount} {countryCount === 1 ? 'place' : 'places'} saved
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle text-base-content/60 hover:text-base-content">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4">

          {/* Theme Toggle Section */}
          <div className="card card-compact bg-base-200/40 border border-base-300/40 p-4 rounded-xl flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-sm text-base-content">
              {theme === 'dark' ? <Moon size={15} className="text-primary" /> : <Sun size={15} className="text-primary" />}
              <span>Appearance</span>
            </div>
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="text-base-content/80">
                Current: <strong>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</strong>
              </span>
              <button
                onClick={toggleTheme}
                className="btn btn-outline btn-primary btn-xs"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? 'Use Light' : 'Use Dark'}
              </button>
            </div>
          </div>

          {/* Export Section */}
          <div className="card card-compact bg-base-200/40 border border-base-300/40 p-4 rounded-xl flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-sm text-base-content">
              <Download size={15} className="text-primary" />
              <span>Export Your Map</span>
            </div>
            <p className="text-xs text-base-content/60 leading-relaxed">
              Copy this code to back up your data or share with others.
            </p>
            <div className="join w-full mt-1">
              <input
                readOnly
                value={myShareCode}
                className="input input-bordered input-xs join-item flex-1 font-mono text-[10px]"
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyCode}
                className={`btn btn-primary btn-xs join-item ${copied ? 'btn-success' : ''}`}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            {copied && (
              <p className="text-[10px] text-success font-medium mt-0.5">
                ✓ Copied to clipboard!
              </p>
            )}
          </div>

          {/* Import Section */}
          <div className={`card card-compact border p-4 rounded-xl flex flex-col gap-2 ${
            importStatus === 'error' ? 'bg-error/5 border-error/20' : 
            importStatus === 'success' ? 'bg-success/5 border-success/20' : 
            'bg-base-200/40 border-base-300/40'
          }`}>
            <div className="flex items-center gap-1.5 font-semibold text-sm text-base-content">
              <Upload size={15} className="text-secondary" />
              <span>Import a Save Code</span>
            </div>
            <p className="text-xs text-base-content/60 leading-relaxed">
              Paste a code from a backup. <strong className="text-error font-medium">Overwrites your current data.</strong>
            </p>
            <textarea
              placeholder="Paste your save code here..."
              value={importCode}
              onChange={e => setImportCode(e.target.value)}
              className="textarea textarea-bordered textarea-xs font-mono text-[10px] w-full mt-1"
              rows={2}
            />
            <button
              onClick={handleImport}
              className="btn btn-secondary btn-xs gap-1 w-full mt-1"
            >
              <Upload size={12} />
              Load Map Data
            </button>

            {importStatus === 'success' && (
              <div className="flex items-center gap-1 text-[10px] text-success font-medium mt-1">
                <CheckCircle2 size={12} /> Map data imported successfully!
              </div>
            )}
            {importStatus === 'error' && (
              <div className="flex items-center gap-1 text-[10px] text-error font-medium mt-1">
                <AlertCircle size={12} /> Invalid code. Please check and try again.
              </div>
            )}
          </div>

          {/* Clear All Data Section (Danger Zone) */}
          <div className="card card-compact bg-error/5 border border-error/20 p-4 rounded-xl flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-sm text-error">
              <AlertCircle size={15} />
              <span>Danger Zone</span>
            </div>
            <p className="text-xs text-base-content/60 leading-relaxed">
              Permanently delete all your personal maps, sub-region data, wishlist records, and custom groups.
            </p>

            {!isConfirmingClear ? (
              <button 
                onClick={() => setIsConfirmingClear(true)}
                className="btn btn-error btn-outline btn-xs w-full mt-1"
              >
                Clear All Data
              </button>
            ) : (
              <div className="flex flex-col gap-2 border-t border-error/10 pt-2 mt-1">
                <div className="alert alert-error text-[10px] py-1.5 px-2.5 rounded-lg flex gap-1.5 items-start">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>Warning: This is permanent and cannot be undone.</span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-base-content/80">
                    Type <span className="font-bold text-error">CLEAR</span> to confirm:
                  </label>
                  <div className="join w-full">
                    <input 
                      type="text" 
                      placeholder="CLEAR"
                      value={clearConfirmInput}
                      onChange={(e) => setClearConfirmInput(e.target.value)}
                      className="input input-bordered input-xs join-item flex-1 text-center font-bold text-[10px]"
                    />
                    <button 
                      onClick={handleClearAllData}
                      disabled={clearConfirmInput !== 'CLEAR'}
                      className="btn btn-error btn-xs join-item text-[10px]"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setIsConfirmingClear(false);
                    setClearConfirmInput('');
                  }}
                  className="btn btn-ghost btn-xs w-full text-[10px] text-base-content/60 mt-1"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(drawer, document.body);
};
