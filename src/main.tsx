import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Handle ChunkLoadErrors and dynamic import failures gracefully by reloading the page
window.addEventListener('error', (e) => {
  const message = e.message || '';
  if (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('ChunkLoadError') ||
    message.includes('loading chunk')
  ) {
    window.location.reload();
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason?.message || '';
  if (
    reason.includes('Failed to fetch dynamically imported module') ||
    reason.includes('ChunkLoadError') ||
    reason.includes('loading chunk')
  ) {
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
