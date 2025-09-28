import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Post height updates to parent when embedded in an iframe (cross-origin safe)
if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
  const sendHeight = () => {
    try {
      const doc = document.documentElement;
      const height = Math.max(
        doc.scrollHeight,
        document.body ? document.body.scrollHeight : 0
      );
      window.parent.postMessage({ type: 'resize', height }, '*');
    } catch (_) {}
  };

  try {
    const ro = new ResizeObserver(() => requestAnimationFrame(sendHeight));
    ro.observe(document.documentElement);
  } catch (_) {
    window.addEventListener('resize', () => requestAnimationFrame(sendHeight));
  }

  try {
    const mo = new MutationObserver(() => requestAnimationFrame(sendHeight));
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  } catch (_) {}

  window.addEventListener('load', sendHeight);
  document.addEventListener('DOMContentLoaded', sendHeight);
  // Initial
  sendHeight();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
