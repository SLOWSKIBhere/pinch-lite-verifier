import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './PinchWorkflowStudio.jsx';

const root = document.getElementById('root');

if (!root) {
  throw new Error('PINCH Workflow Studio could not find the root element.');
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
