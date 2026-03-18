// main.jsx — React application entry point
// Renders the root <App /> component into the #root div defined in index.html.
// Full routing and context providers are wired up in Task 8.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
