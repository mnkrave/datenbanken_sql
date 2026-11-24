import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import 'katex/dist/katex.min.css';
import './styles/app.css';
import { App } from './App';

const publishableKey =
  import.meta.env.NEXT_PUBLIC_DATENBANKEN_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {publishableKey ? (
      <ClerkProvider publishableKey={publishableKey}>
        <App clerkEnabled />
      </ClerkProvider>
    ) : (
      <App clerkEnabled={false} />
    )}
  </StrictMode>
);
