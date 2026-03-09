import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Copy, Check, Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { serializePlaces, deserializePlaces } from '../../utils/serialization';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { places, loadPlaces } = useStore();
  const [importCode, setImportCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  const drawer = (
    <>
      {/* Backdrop — no blur, just semi-transparent */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.25)',
        }}
      />

      {/* Side Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: '380px',
          zIndex: 9999,
          background: 'var(--glass-bg)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-16px 0 48px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--glass-border)',
          background: 'var(--map-fill-unselected)',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Settings</h2>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {countryCount} {countryCount === 1 ? 'place' : 'places'} saved
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--map-fill-unselected)',
              border: '1px solid var(--glass-border)',
              borderRadius: '50%', width: '34px', height: '34px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Export Section */}
          <div style={{
            background: 'var(--map-fill-unselected)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px', padding: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <Download size={16} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Export Your Map</span>
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Copy this code to back up your data or share with others.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                readOnly
                value={myShareCode}
                className="glass-input"
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyCode}
                className="glass-button"
                style={{
                  padding: '0.75rem',
                  background: copied ? 'rgba(34,197,94,0.15)' : undefined,
                  borderColor: copied ? 'var(--accent-visited)' : undefined,
                  color: copied ? 'var(--accent-visited)' : undefined,
                  minWidth: '44px', justifyContent: 'center',
                }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            {copied && (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--accent-visited)' }}>
                ✓ Copied to clipboard!
              </p>
            )}
          </div>

          {/* Import Section */}
          <div style={{
            background: 'var(--map-fill-unselected)',
            border: `1px solid ${importStatus === 'error' ? 'rgba(239,68,68,0.5)' : importStatus === 'success' ? 'rgba(34,197,94,0.5)' : 'var(--glass-border)'}`,
            borderRadius: '12px', padding: '1.25rem',
            transition: 'border-color 0.3s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <Upload size={16} color="var(--accent-wishlist)" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Import a Save Code</span>
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Paste a code from a backup or a friend's map.{' '}
              <strong style={{ color: 'var(--color-they-only)' }}>Overwrites your current data.</strong>
            </p>
            <textarea
              placeholder="Paste your save code here..."
              value={importCode}
              onChange={e => setImportCode(e.target.value)}
              className="glass-input"
              rows={3}
              style={{ fontFamily: 'monospace', fontSize: '0.75rem', resize: 'none', marginBottom: '0.75rem' }}
            />
            <button
              onClick={handleImport}
              className="glass-button"
              style={{
                width: '100%', justifyContent: 'center',
                background: 'rgba(187, 154, 247, 0.15)',
                borderColor: 'rgba(187, 154, 247, 0.4)',
                color: 'var(--accent-wishlist)',
                fontWeight: 600, padding: '0.75rem', gap: '0.5rem',
              }}
            >
              <Upload size={16} />
              Load Map Data
            </button>

            {importStatus === 'success' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', color: 'var(--accent-visited)', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} /> Map data imported successfully!
              </div>
            )}
            {importStatus === 'error' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', color: '#ef4444', fontSize: '0.85rem' }}>
                <AlertCircle size={16} /> Invalid code. Please check and try again.
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );

  // Render into document.body so it's outside the nav stacking context
  return ReactDOM.createPortal(drawer, document.body);
};
