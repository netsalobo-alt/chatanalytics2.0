import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept benign Firestore gRPC idle stream disconnection messages
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const raw = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
    if (
      raw.includes('Disconnecting idle stream') ||
      raw.includes('Timed out waiting for new targets') ||
      (raw.includes('@firebase/firestore') && raw.includes('CANCELLED'))
    ) {
      // Normal Firestore gRPC WebChannel idle connection timeout, ignore
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(<App />);
