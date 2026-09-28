import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { AlertCircle, Check, Copy, Download, Moon, Sun, Upload, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { deserializePlaces, serializePlaces } from '../../utils/serialization';

interface SettingsModalProps { onClose: () => void }

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { places, loadPlaces, theme, toggleTheme } = useStore();
  const [importCode, setImportCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [clearConfirmInput, setClearConfirmInput] = useState('');
  const myShareCode = serializePlaces(places);
  const countryCount = Object.keys(places).length;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyCode = async () => {
    try { await navigator.clipboard.writeText(myShareCode); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(false); }
  };

  const handleImport = () => {
    const deserialized = deserializePlaces(importCode.trim());
    if (!deserialized) { setImportStatus('error'); return; }
    loadPlaces(deserialized);
    setImportCode('');
    setImportStatus('success');
  };

  const handleClearAllData = () => {
    if (clearConfirmInput !== 'CLEAR') return;
    localStorage.removeItem('visited-places-storage');
    localStorage.removeItem('visited-places-v2');
    localStorage.removeItem('visited-places-compare-groups');
    localStorage.removeItem('visited-places-active-group-id');
    localStorage.setItem('visited-places-storage', JSON.stringify({ state: { theme, places: {} }, version: 0 }));
    window.location.reload();
  };

  return ReactDOM.createPortal(<>
    <div className="survey-settings-backdrop" onClick={onClose} aria-hidden="true" />
    <div className="survey-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header className="settings-header"><div><h2 id="settings-title">Settings</h2><p>Make this atlas yours.</p></div><button className="settings-close" onClick={onClose} aria-label="Close settings"><X size={20} /></button></header>
      <div className="settings-scroll">
        <section className="settings-section"><div className="settings-section-title"><h3>Appearance</h3><p>Choose the light that suits your map.</p></div><div className="settings-theme-options" role="group" aria-label="Color theme"><button className={theme === 'light' ? 'selected' : ''} onClick={() => { if (theme !== 'light') toggleTheme(); }} aria-pressed={theme === 'light'}><Sun size={20} /><span>Light</span>{theme === 'light' && <Check size={16} />}</button><button className={theme === 'dark' ? 'selected' : ''} onClick={() => { if (theme !== 'dark') toggleTheme(); }} aria-pressed={theme === 'dark'}><Moon size={20} /><span>Dark</span>{theme === 'dark' && <Check size={16} />}</button></div></section>
        <section className="settings-section"><div className="settings-section-title"><h3>Your data</h3><p>{countryCount} {countryCount === 1 ? 'country' : 'countries'} in your map · saved in this browser</p></div><div className="settings-action"><div className="settings-action-heading"><Download size={19} /><h4>Export your map</h4></div><p>Keep a backup or share your places with someone else.</p><div className="settings-code-row"><input aria-label="Your share code" readOnly value={myShareCode} onClick={event => event.currentTarget.select()} /><button onClick={handleCopyCode}><Copy size={16} />{copied ? 'Copied' : 'Copy code'}</button></div></div><div className="settings-action"><div className="settings-action-heading"><Upload size={19} /><h4>Import a map</h4></div><p>Paste a saved code to replace the places currently on this device.</p><label className="settings-field-label" htmlFor="settings-import">Save code</label><textarea id="settings-import" rows={3} value={importCode} onChange={event => { setImportCode(event.target.value); setImportStatus('idle'); }} placeholder="Paste your code here" /><button className="settings-import-button" onClick={handleImport}>Import places <Upload size={16} /></button>{importStatus === 'error' && <p className="settings-feedback settings-feedback--error" role="alert">This code could not be read. Check that you copied the whole code and try again.</p>}{importStatus === 'success' && <p className="settings-feedback" role="status">Your places were imported.</p>}</div></section>
        <section className="settings-section settings-danger"><div className="settings-section-title"><h3>Clear your data</h3><p>Remove your places and saved comparison groups from this browser.</p></div>{!isConfirmingClear ? <button className="settings-clear-button" onClick={() => setIsConfirmingClear(true)}>Clear all data</button> : <div className="settings-confirm"><p><AlertCircle size={17} /> This cannot be undone. Export your map first if you need a backup.</p><label className="settings-field-label" htmlFor="settings-clear-confirm">Type CLEAR to confirm</label><div><input id="settings-clear-confirm" value={clearConfirmInput} onChange={event => setClearConfirmInput(event.target.value)} /><button disabled={clearConfirmInput !== 'CLEAR'} onClick={handleClearAllData}>Delete data</button></div><button className="settings-cancel" onClick={() => { setIsConfirmingClear(false); setClearConfirmInput(''); }}>Cancel</button></div>}</section>
      </div><footer className="settings-footer">VisitedPlaces · v{__APP_VERSION__}</footer>
    </div>
  </>, document.body);
};
