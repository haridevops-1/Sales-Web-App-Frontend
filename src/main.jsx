import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import './styles/global.css';

const getBasename = () => {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/app')) {
    return '/app';
  }
  return '';
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={getBasename()}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
