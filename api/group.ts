import { metric } from '@vercel/functions';
import {
  authenticateRequest,
  fetchClerkUserProfile,
  getClerkClient,
} from './_lib/auth.js';
import { ensureSchema, getSql } from './_lib/db.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'lukasreinle0@gmail.com')
  .trim()
  .toLowerCase();

interface MembershipState {
  isMember: boolean;
  myRole: 'admin' | 'member' | null;
  myEmail: string;
}

async function syncMembership(userId: string): Promise<MembershipState> {
  const sql = getSql();
  const profile = await fetchClerkUserProfile(userId);

  const [existingRows, adminRows, inviteRows] = await Promise.all([
    sql`
      SELECT role
      FROM study_group_members
      WHERE user_id = ${userId}
      LIMIT 1
    `,
    sql`
      SELECT user_id
      FROM study_group_members
      WHERE role = 'admin'
      LIMIT 1
    `,
    profile.emailLower
      ? sql`
          SELECT email_lower, status
          FROM study_group_invitations
          WHERE email_lower = ${profile.emailLower}
          LIMIT 1
        `
      : Promise.resolve([]),
  ]);

  const existingRole =
    existingRows.length > 0 ? String(existingRows[0].role) : null;
  const hasAnyAdmin = adminRows.length > 0;
  const isAdminEmail =
    profile.emailLower.length > 0 && profile.emailLower === DEFAULT_ADMIN_EMAIL;
  const isInvited = inviteRows.length > 0;

  let targetRole: 'admin' | 'member' | null = null;
  if (existingRole === 'admin' || isAdminEmail || !hasAnyAdmin) {
    targetRole = 'admin';
  } else if (existingRole === 'member' || isInvited) {
    targetRole = 'member';
  }

  if (!targetRole) {
    return {
      isMember: false,
      myRole: null,
      myEmail: profile.email,
    };
  }

  await sql`
    INSERT INTO study_group_members (
      user_id, email, email_lower, display_name, avatar_url, role, joined_at, updated_at
    )
    VALUES (
      ${userId},
      ${profile.email},
      ${profile.emailLower},
      ${profile.displayName},
      ${profile.avatarUrl},
      ${targetRole},
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      email_lower = EXCLUDED.email_lower,
      display_name = EXCLUDED.display_name,
      avatar_url = EXCLUDED.avatar_url,
      role = CASE
        WHEN study_group_members.role = 'admin' OR EXCLUDED.role = 'admin' THEN 'admin'
        ELSE study_group_members.role
      END,
      updated_at = NOW()
  `;

  if (isInvited && inviteRows[0].status !== 'accepted') {
    await sql`
      UPDATE study_group_invitations
      SET status = 'accepted', accepted_at = NOW()
      WHERE email_lower = ${profile.emailLower}
    `;
  }

  return {
    isMember: true,
    myRole: targetRole,
    myEmail: profile.email,
  };
}

export async function GET(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      metric('sql_trainer.group.requests', 1, { method: 'GET', outcome: 'unauthorized' });
      return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    await ensureSchema();
    const membership = await syncMembership(auth.userId);

    if (!membership.isMember) {
      metric('sql_trainer.group.requests', 1, { method: 'GET', outcome: 'not_member' });
      return Response.json(
        {
          myUserId: auth.userId,
          myEmail: membership.myEmail,
          myRole: null,
          isMember: false,
          members: [],
          invitations: [],
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const sql = getSql();
    const memberRows = await sql`
      SELECT user_id, email, display_name, avatar_url, role, joined_at
      FROM study_group_members
      ORDER BY joined_at ASC
    `;

    const memberIds = memberRows.map((r) => String(r.user_id));

    const [progressRows, activityRows, inviteRows] = await Promise.all([
      memberIds.length > 0
        ? sql`
            SELECT user_id, exercise_id, solved_date
            FROM user_exercise_progress
            WHERE user_id = ANY(${memberIds})
              AND solved_date IS NOT NULL
          `
        : Promise.resolve([]),
      memberIds.length > 0
        ? sql`
            SELECT user_id, date_key
            FROM user_daily_activity
            WHERE user_id = ANY(${memberIds})
            ORDER BY date_key ASC
          `
        : Promise.resolve([]),
      membership.myRole === 'admin'
        ? sql`
            SELECT email_lower, email_display, status, created_at
            FROM study_group_invitations
            WHERE status = 'pending'
            ORDER BY created_at DESC
          `
        : Promise.resolve([]),
    ]);

    const solvedByUser = new Map<string, string[]>();
    const lastSolvedByUser = new Map<string, string>();
    for (const row of progressRows) {
      const uid = String(row.user_id);
      const exId = String(row.exercise_id);
      const sd = typeof row.solved_date === 'string' ? row.solved_date : '';
      const list = solvedByUser.get(uid) ?? [];
      list.push(exId);
      solvedByUser.set(uid, list);
      if (sd && (!lastSolvedByUser.has(uid) || sd > lastSolvedByUser.get(uid)!)) {
        lastSolvedByUser.set(uid, sd);
      }
    }

    const daysByUser = new Map<string, string[]>();
    for (const row of activityRows) {
      const uid = String(row.user_id);
      const dk = String(row.date_key);
      const list = daysByUser.get(uid) ?? [];
      list.push(dk);
      daysByUser.set(uid, list);
    }

    const members = memberRows.map((m) => {
      const uid = String(m.user_id);
      return {
        userId: uid,
        email: String(m.email),
        displayName: String(m.display_name),
        avatarUrl: typeof m.avatar_url === 'string' ? m.avatar_url : null,
        role: m.role === 'admin' ? 'admin' : 'member',
        solvedIds: solvedByUser.get(uid) ?? [],
        activeDays: daysByUser.get(uid) ?? [],
        lastActiveDate: lastSolvedByUser.get(uid) ?? null,
      };
    });

    const invitations = inviteRows.map((inv) => ({
      emailLower: String(inv.email_lower),
      emailDisplay: String(inv.email_display),
      status: String(inv.status),
      createdAt: String(inv.created_at),
    }));

    metric('sql_trainer.group.requests', 1, { method: 'GET', outcome: 'success' });
    return Response.json(
      {
        myUserId: auth.userId,
        myEmail: membership.myEmail,
        myRole: membership.myRole,
        isMember: true,
        members,
        invitations,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[api/group GET] error:', err);
    metric('sql_trainer.group.requests', 1, { method: 'GET', outcome: 'error' });
    return Response.json(
      { error: 'Lerngruppe konnte nicht geladen werden.' },
      { status: 500 }
    );
  } finally {
    metric('sql_trainer.group.duration_ms', performance.now() - startedAt, {
      method: 'GET',
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      metric('sql_trainer.group.requests', 1, { method: 'POST', outcome: 'unauthorized' });
      return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    await ensureSchema();
    const membership = await syncMembership(auth.userId);
    if (membership.myRole !== 'admin') {
      metric('sql_trainer.group.requests', 1, { method: 'POST', outcome: 'forbidden' });
      return Response.json(
        { error: 'Nur der Admin darf Personen einladen.' },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || body.action !== 'invite' || typeof body.email !== 'string') {
      return Response.json({ error: 'Bitte eine gültige E-Mail-Adresse angeben.' }, { status: 400 });
    }

    const emailDisplay = body.email.trim();
    const emailLower = emailDisplay.toLowerCase();
    if (!EMAIL_RE.test(emailLower) || emailLower.length > 200) {
      return Response.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 });
    }

    const sql = getSql();
    const existingMember = await sql`
      SELECT user_id
      FROM study_group_members
      WHERE email_lower = ${emailLower}
      LIMIT 1
    `;
    if (existingMember.length > 0) {
      return Response.json(
        { error: `${emailDisplay} ist bereits Mitglied der Lerngruppe.` },
        { status: 409 }
      );
    }

    let clerkInvitationId: string | null = null;
    let emailSent = false;
    let infoMessage = `${emailDisplay} wurde für die Lerngruppe freigeschaltet.`;

    try {
      const origin = new URL(request.url).origin;
      const clerk = getClerkClient();
      const inv = await clerk.invitations.createInvitation({
        emailAddress: emailDisplay,
        redirectUrl: origin,
        ignoreExisting: true,
      });
      clerkInvitationId = inv.id;
      emailSent = true;
      infoMessage = `Einladungs-E-Mail über Clerk an ${emailDisplay} gesendet!`;
    } catch (clerkErr) {
      const msg = clerkErr instanceof Error ? clerkErr.message : String(clerkErr);
      console.warn('[api/group invite] Clerk invitation note:', msg);
      infoMessage = `${emailDisplay} ist freigeschaltet (Clerk-Mail konnte nicht automatisch zugestellt werden — teile einfach den App-Link, Anmeldung funktioniert sofort mit dieser Google-Adresse).`;
    }

    await sql`
      INSERT INTO study_group_invitations (
        email_lower, email_display, invited_by_user_id, clerk_invitation_id, status, created_at
      )
      VALUES (
        ${emailLower}, ${emailDisplay}, ${auth.userId}, ${clerkInvitationId}, 'pending', NOW()
      )
      ON CONFLICT (email_lower) DO UPDATE SET
        email_display = EXCLUDED.email_display,
        invited_by_user_id = EXCLUDED.invited_by_user_id,
        clerk_invitation_id = COALESCE(EXCLUDED.clerk_invitation_id, study_group_invitations.clerk_invitation_id),
        status = 'pending',
        created_at = NOW()
    `;

    metric('sql_trainer.group.requests', 1, {
      method: 'POST',
      action: 'invite',
      outcome: 'success',
    });
    return Response.json({ ok: true, emailSent, message: infoMessage });
  } catch (err) {
    console.error('[api/group POST] error:', err);
    metric('sql_trainer.group.requests', 1, { method: 'POST', outcome: 'error' });
    return Response.json(
      { error: 'Einladung konnte nicht erstellt werden.' },
      { status: 500 }
    );
  } finally {
    metric('sql_trainer.group.duration_ms', performance.now() - startedAt, {
      method: 'POST',
    });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      metric('sql_trainer.group.requests', 1, { method: 'DELETE', outcome: 'unauthorized' });
      return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    await ensureSchema();
    const membership = await syncMembership(auth.userId);
    if (membership.myRole !== 'admin') {
      metric('sql_trainer.group.requests', 1, { method: 'DELETE', outcome: 'forbidden' });
      return Response.json({ error: 'Nur der Admin darf das ausführen.' }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.action !== 'string') {
      return Response.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    const sql = getSql();

    if (body.action === 'revoke_invite' && typeof body.emailLower === 'string') {
      const emailLower = body.emailLower.trim().toLowerCase();
      const rows = await sql`
        DELETE FROM study_group_invitations
        WHERE email_lower = ${emailLower}
        RETURNING clerk_invitation_id
      `;
      const invId =
        rows.length > 0 && typeof rows[0].clerk_invitation_id === 'string'
          ? rows[0].clerk_invitation_id
          : null;
      if (invId) {
        try {
          await getClerkClient().invitations.revokeInvitation(invId);
        } catch {
          // Ignore if already revoked/accepted in Clerk
        }
      }
      metric('sql_trainer.group.requests', 1, {
        method: 'DELETE',
        action: 'revoke_invite',
        outcome: 'success',
      });
      return Response.json({ ok: true });
    }

    if (body.action === 'remove_member' && typeof body.targetUserId === 'string') {
      if (body.targetUserId === auth.userId) {
        return Response.json(
          { error: 'Du kannst dich als Admin nicht selbst entfernen.' },
          { status: 400 }
        );
      }
      await sql`
        DELETE FROM study_group_members
        WHERE user_id = ${body.targetUserId}
      `;
      metric('sql_trainer.group.requests', 1, {
        method: 'DELETE',
        action: 'remove_member',
        outcome: 'success',
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unbekannte Aktion.' }, { status: 400 });
  } catch (err) {
    console.error('[api/group DELETE] error:', err);
    metric('sql_trainer.group.requests', 1, { method: 'DELETE', outcome: 'error' });
    return Response.json({ error: 'Aktion fehlgeschlagen.' }, { status: 500 });
  } finally {
    metric('sql_trainer.group.duration_ms', performance.now() - startedAt, {
      method: 'DELETE',
    });
  }
}
