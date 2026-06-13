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
      {/* Backdrop */}
      <div
        className="settings-backdrop"
        onClick={onClose}
      />

      {/* Centered Modal */}
      <div className="settings-modal">
        {/* Header */}
        <div className="settings-modal__header">
          <div>
            <h2 className="settings-modal__title">Settings</h2>
            <p className="settings-modal__subtitle">
              {countryCount} {countryCount === 1 ? 'place' : 'places'} saved
            </p>
          </div>
          <button onClick={onClose} className="settings-modal__close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="settings-modal__body">

          {/* Theme Toggle Section */}
          <div className="settings-section">
            <div className="settings-section__header">
              {theme === 'dark' ? <Moon size={16} className="settings-section__icon--primary" /> : <Sun size={16} className="settings-section__icon--primary" />}
              <span className="settings-section__title">Appearance</span>
            </div>
            <div className="settings-theme-toggle">
              <span className="settings-theme-toggle__label">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
              <button
                onClick={toggleTheme}
                className={`settings-theme-toggle__btn ${theme === 'light' ? 'settings-theme-toggle__btn--light' : ''}`}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                <div className="settings-theme-toggle__track">
                  <div className="settings-theme-toggle__thumb">
                    {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Export Section */}
          <div className="settings-section">
            <div className="settings-section__header">
              <Download size={16} className="settings-section__icon--primary" />
              <span className="settings-section__title">Export Your Map</span>
            </div>
            <p className="settings-section__desc">
              Copy this code to back up your data or share with others.
            </p>
            <div className="settings-export-row">
              <input
                readOnly
                value={myShareCode}
                className="glass-input settings-export-input"
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyCode}
                className={`glass-button settings-copy-btn ${copied ? 'settings-copy-btn--copied' : ''}`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            {copied && (
              <p className="settings-status settings-status--success">
                ✓ Copied to clipboard!
              </p>
            )}
          </div>

          {/* Import Section */}
          <div className={`settings-section ${importStatus === 'error' ? 'settings-section--error' : importStatus === 'success' ? 'settings-section--success' : ''}`}>
            <div className="settings-section__header">
              <Upload size={16} className="settings-section__icon--wishlist" />
              <span className="settings-section__title">Import a Save Code</span>
            </div>
            <p className="settings-section__desc">
              Paste a code from a backup or a friend's map.{' '}
              <strong className="settings-section__warning">Overwrites your current data.</strong>
            </p>
            <textarea
              placeholder="Paste your save code here..."
              value={importCode}
              onChange={e => setImportCode(e.target.value)}
              className="glass-input settings-import-textarea"
              rows={3}
            />
            <button
              onClick={handleImport}
              className="glass-button settings-import-btn"
            >
              <Upload size={16} />
              Load Map Data
            </button>

            {importStatus === 'success' && (
              <div className="settings-feedback settings-feedback--success">
                <CheckCircle2 size={16} /> Map data imported successfully!
              </div>
            )}
            {importStatus === 'error' && (
              <div className="settings-feedback settings-feedback--error">
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
