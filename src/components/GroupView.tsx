import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { SignInButton, useAuth } from '@clerk/react';
import {
  Check,
  Copy,
  Flame,
  LogIn,
  MailPlus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
} from 'lucide-react';
import { ALL_REGISTERED_EXERCISES } from '../data/schemas';
import { computeStreak, formatGermanDate } from '../engine/dailyPlan';
import {
  fetchGroupOverview,
  inviteGroupMember,
  removeGroupMember,
  revokeGroupInvitation,
  type GroupOverviewResponse,
} from '../lib/cloudSync';
import type { Exercise } from '../types/sql';

interface GroupViewProps {
  clerkEnabled: boolean;
  todayKey: string;
  dailyPlan: Exercise[];
  officialSheetIds: string[];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function GroupView({
  clerkEnabled,
  todayKey,
  dailyPlan,
  officialSheetIds,
}: GroupViewProps) {
  if (!clerkEnabled) {
    return (
      <section className="hero-card" aria-labelledby="main-content">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <Users size={15} aria-hidden="true" />
            Lerngruppe
          </div>
          <h1 id="main-content" tabIndex={-1} className="hero-title">
            Lerngruppe nur mit Cloud-Anmeldung verfügbar
          </h1>
          <p className="hero-desc">
            Clerk ist in dieser Umgebung nicht konfiguriert. Im produktiven Deployment kannst du
            Freunde per E-Mail einladen und eure Streaks sowie Aufgabenstände vergleichen.
          </p>
        </div>
      </section>
    );
  }

  return (
    <GroupViewAuthed
      todayKey={todayKey}
      dailyPlan={dailyPlan}
      officialSheetIds={officialSheetIds}
    />
  );
}

function GroupViewAuthed({
  todayKey,
  dailyPlan,
  officialSheetIds,
}: Omit<GroupViewProps, 'clerkEnabled'>) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [data, setData] = useState<GroupOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const dailyIdSet = useMemo(() => new Set(dailyPlan.map((e) => e.id)), [dailyPlan]);
  const sheetIdSet = useMemo(() => new Set(officialSheetIds), [officialSheetIds]);
  const totalCount = ALL_REGISTERED_EXERCISES.length;

  const loadGroup = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchGroupOverview(getToken);
      if (res) setData(res);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Lerngruppe konnte nicht geladen werden.'
      );
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      void loadGroup();
    } else if (isLoaded && !isSignedIn) {
      setData(null);
      setLoadError(null);
    }
  }, [isLoaded, isSignedIn, loadGroup]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    setInviting(true);
    setInviteFeedback(null);
    try {
      const res = await inviteGroupMember(getToken, email);
      if (res) {
        setInviteFeedback({ kind: 'success', text: res.message });
        setInviteEmail('');
        await loadGroup();
      }
    } catch (err) {
      setInviteFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Einladung fehlgeschlagen.',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (emailLower: string) => {
    try {
      await revokeGroupInvitation(getToken, emailLower);
      await loadGroup();
    } catch (err) {
      setInviteFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Einladung konnte nicht entfernt werden.',
      });
    }
  };

  const handleRemoveMember = async (targetUserId: string, name: string) => {
    try {
      await removeGroupMember(getToken, targetUserId);
      setInviteFeedback({ kind: 'success', text: `${name} wurde aus der Lerngruppe entfernt.` });
      await loadGroup();
    } catch (err) {
      setInviteFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Mitglied konnte nicht entfernt werden.',
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  if (!isLoaded) {
    return (
      <section className="panel" aria-labelledby="main-content">
        <h1 id="main-content" tabIndex={-1} className="hero-title">
          Lerngruppe wird geladen…
        </h1>
      </section>
    );
  }

  if (!isSignedIn) {
    return (
      <section className="hero-card" aria-labelledby="main-content">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <Users size={15} aria-hidden="true" />
            Gemeinsam für die Klausur üben
          </div>
          <h1 id="main-content" tabIndex={-1} className="hero-title">
            Lerngruppe &amp; Freunde-Vergleich
          </h1>
          <p className="hero-desc">
            Melde dich mit deinem Google-Konto an, um eingeladenen Kommilitonen beizutreten, eure
            täglichen Streaks zu vergleichen und zu sehen, wie weit ihr bei den Übungsblättern
            seid.
          </p>
        </div>
        <div className="hero-progress" style={{ justifyContent: 'center' }}>
          <SignInButton mode="modal">
            <button type="button" className="btn btn-primary">
              <LogIn size={16} aria-hidden="true" />
              Mit Google anmelden
            </button>
          </SignInButton>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="panel" aria-labelledby="main-content">
        <h1 id="main-content" tabIndex={-1} className="task-title">
          Lerngruppe konnte nicht geladen werden
        </h1>
        <p className="hero-desc" style={{ marginBlockEnd: '1rem' }}>
          {loadError}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => void loadGroup()}>
          <RefreshCw size={15} aria-hidden="true" />
          Erneut versuchen
        </button>
      </section>
    );
  }

  if (!data && loading) {
    return (
      <section className="panel" aria-labelledby="main-content">
        <h1 id="main-content" tabIndex={-1} className="task-title">
          Lade Lerngruppe aus Neon Postgres…
        </h1>
      </section>
    );
  }

  if (data && !data.isMember) {
    return (
      <section className="hero-card" aria-labelledby="main-content">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <Users size={15} aria-hidden="true" />
            Einladung erforderlich
          </div>
          <h1 id="main-content" tabIndex={-1} className="hero-title">
            Noch nicht in der Lerngruppe
          </h1>
          <p className="hero-desc">
            Du bist als <code className="inline-code">{data.myEmail}</code> angemeldet und dein
            eigener Fortschritt wird bereits dauerhaft gespeichert. Bitte den Admin, diese
            E-Mail-Adresse im Tab „Lerngruppe“ einzuladen — danach erscheinen hier alle Mitglieder.
          </p>
        </div>
        <div className="hero-progress" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="btn"
            disabled={loading}
            onClick={() => void loadGroup()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            Status prüfen
          </button>
        </div>
      </section>
    );
  }

  const membersWithStats = (data?.members ?? [])
    .map((m) => {
      const solvedSet = new Set(m.solvedIds);
      const dailySolved = [...dailyIdSet].filter((id) => solvedSet.has(id)).length;
      const sheetSolved = [...sheetIdSet].filter((id) => solvedSet.has(id)).length;
      const totalSolved = m.solvedIds.length;
      const streak = computeStreak(m.activeDays, todayKey);
      const pct = totalCount > 0 ? Math.round((totalSolved / totalCount) * 100) : 0;
      return { ...m, dailySolved, sheetSolved, totalSolved, streak, pct };
    })
    .sort(
      (a, b) =>
        b.streak - a.streak ||
        b.totalSolved - a.totalSolved ||
        a.displayName.localeCompare(b.displayName, 'de')
    );

  return (
    <div>
      <section className="hero-card" aria-labelledby="main-content">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <Users size={15} aria-hidden="true" />
            Lerngruppe · {membersWithStats.length}{' '}
            {membersWithStats.length === 1 ? 'Mitglied' : 'Mitglieder'}
          </div>
          <h1 id="main-content" tabIndex={-1} className="hero-title">
            Fortschritt &amp; Streaks im Vergleich
          </h1>
          <p className="hero-desc">
            Jedes eingeladene Mitglied sieht hier live, wie hoch die tägliche Streak ist und wie
            viele Aufgaben heute, auf den Übungsblättern und insgesamt gelöst wurden.
          </p>
        </div>

        <div className="hero-progress" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="btn"
            disabled={loading}
            onClick={() => void loadGroup()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            {loading ? 'Aktualisiere…' : 'Stand aktualisieren'}
          </button>
        </div>
      </section>

      <div className="group-grid">
        {membersWithStats.map((m, idx) => {
          const isMe = m.userId === data?.myUserId;
          return (
            <article
              key={m.userId}
              className={`group-member-card ${isMe ? 'group-member-card--me' : ''}`}
            >
              <div className="group-member-head">
                <div className="group-member-identity">
                  {m.avatarUrl ? (
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="group-avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="group-avatar group-avatar--fallback" aria-hidden="true">
                      {getInitials(m.displayName)}
                    </span>
                  )}

                  <div>
                    <div className="group-member-name-row">
                      <span className="group-rank">#{idx + 1}</span>
                      <h2 className="group-member-name">{m.displayName}</h2>
                      {isMe && <span className="badge badge--basis">Du</span>}
                      {m.role === 'admin' && (
                        <span className="sheet-kind-badge">
                          <ShieldCheck size={12} aria-hidden="true" /> Admin
                        </span>
                      )}
                    </div>
                    <div className="group-member-email">{m.email}</div>
                  </div>
                </div>

                <div className="group-member-right">
                  <span className="stat-chip stat-chip--streak">
                    <Flame size={14} aria-hidden="true" />
                    {m.streak} {m.streak === 1 ? 'Tag' : 'Tage'}
                  </span>
                  {data?.myRole === 'admin' && !isMe && (
                    <button
                      type="button"
                      className="btn icon-btn btn-ghost"
                      title={`${m.displayName} aus der Gruppe entfernen`}
                      aria-label={`${m.displayName} entfernen`}
                      onClick={() => void handleRemoveMember(m.userId, m.displayName)}
                    >
                      <UserMinus size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <div className="group-stats-row">
                <div className="group-stat-box">
                  <span className="group-stat-label">Heute</span>
                  <span className="group-stat-val">
                    {m.dailySolved} / {dailyPlan.length}
                  </span>
                </div>
                <div className="group-stat-box">
                  <span className="group-stat-label">Übungsblätter</span>
                  <span className="group-stat-val">
                    {m.sheetSolved} / {officialSheetIds.length}
                  </span>
                </div>
                <div className="group-stat-box">
                  <span className="group-stat-label">Gesamt</span>
                  <span className="group-stat-val">
                    {m.totalSolved} / {totalCount} ({m.pct} %)
                  </span>
                </div>
                <div className="group-stat-box">
                  <span className="group-stat-label">Zuletzt aktiv</span>
                  <span className="group-stat-val">
                    {m.lastActiveDate === todayKey
                      ? 'Heute'
                      : m.lastActiveDate
                        ? formatGermanDate(m.lastActiveDate).split(',')[1]?.trim() ??
                          m.lastActiveDate
                        : 'Noch keine'}
                  </span>
                </div>
              </div>

              <div className="progress-bar-track" aria-hidden="true">
                <div
                  className={`progress-bar-fill ${m.pct === 100 ? 'progress-bar-fill--done' : ''}`}
                  style={{ width: `${m.pct}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>

      {data?.myRole === 'admin' && (
        <section className="panel group-admin-panel" aria-labelledby="admin-invite-heading">
          <div className="group-admin-head">
            <div>
              <h2 id="admin-invite-heading" className="section-title">
                Freunde per E-Mail einladen (Admin)
              </h2>
              <p className="schema-card-summary">
                Eingeladene Freunde erhalten eine Einladungs-Mail über Clerk und erscheinen
                sofort nach ihrer Anmeldung mit dieser E-Mail-Adresse hier im Vergleich.
              </p>
            </div>
            <button type="button" className="btn btn-sm" onClick={() => void handleCopyLink()}>
              {copiedLink ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  Link kopiert
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden="true" />
                  App-Link kopieren
                </>
              )}
            </button>
          </div>

          <form className="group-invite-form" onSubmit={(e) => void handleInvite(e)}>
            <label htmlFor="invite-email-input" className="visually-hidden">
              E-Mail-Adresse des Freundes
            </label>
            <input
              id="invite-email-input"
              type="email"
              required
              placeholder="kommilitone@gmail.com"
              className="group-invite-input"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={inviting}>
              <MailPlus size={16} aria-hidden="true" />
              {inviting ? 'Sende Einladung…' : 'Per E-Mail einladen'}
            </button>
          </form>

          <div aria-live="polite" aria-atomic="true">
            {inviteFeedback && (
              <p
                className={`group-feedback ${
                  inviteFeedback.kind === 'error'
                    ? 'group-feedback--error'
                    : 'group-feedback--success'
                }`}
              >
                {inviteFeedback.text}
              </p>
            )}
          </div>

          {data.invitations.length > 0 && (
            <div className="group-invites-list-wrap">
              <h3 className="group-invites-subheading">
                Ausstehende Einladungen ({data.invitations.length})
              </h3>
              <ul className="group-invites-list" role="list">
                {data.invitations.map((inv) => (
                  <li key={inv.emailLower} className="group-invite-item">
                    <span>
                      <strong>{inv.emailDisplay}</strong>{' '}
                      <span className="section-meta">· Eingeladen</span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => void handleRevokeInvite(inv.emailLower)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Zurückziehen
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
