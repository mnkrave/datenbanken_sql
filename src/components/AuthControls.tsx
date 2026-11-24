import { Show, SignInButton, UserButton } from '@clerk/react';
import { Cloud, CloudAlert, CloudUpload, LogIn } from 'lucide-react';
import type { CloudSyncStatus } from '../lib/cloudSync';

interface AuthControlsProps {
  clerkEnabled: boolean;
  syncStatus: CloudSyncStatus;
}

export function AuthControls({ clerkEnabled, syncStatus }: AuthControlsProps) {
  if (!clerkEnabled) {
    return null;
  }

  return (
    <div className="auth-controls">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button type="button" className="btn btn-sm btn-primary auth-signin-btn">
            <LogIn size={14} aria-hidden="true" />
            Anmelden
          </button>
        </SignInButton>
      </Show>

      <Show when="signed-in">
        <span
          className={`stat-chip sync-chip sync-chip--${syncStatus}`}
          title={
            syncStatus === 'synced'
              ? 'Fortschritt in Neon Postgres gespeichert'
              : syncStatus === 'syncing'
                ? 'Fortschritt wird mit der Cloud synchronisiert'
                : 'Cloud-Synchronisation vorübergehend nicht erreichbar (lokal gesichert)'
          }
        >
          {syncStatus === 'syncing' ? (
            <>
              <CloudUpload size={14} aria-hidden="true" />
              Synchronisiere…
            </>
          ) : syncStatus === 'error' ? (
            <>
              <CloudAlert size={14} aria-hidden="true" />
              Sync-Fehler
            </>
          ) : (
            <>
              <Cloud size={14} aria-hidden="true" />
              Cloud aktiv
            </>
          )}
        </span>
        <UserButton />
      </Show>
    </div>
  );
}
