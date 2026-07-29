// send-notifications — delivers CashFlow's scheduled alerts as Web Push.
//
// Invoked hourly by pg_cron (see supabase/push-cron.sql). It has to run hourly
// rather than once a day because subscriptions carry their own timezone and
// preferred delivery hour: each run sends only to the devices whose local
// clock has just reached their chosen hour.
//
// Flow per run:
//   1. Load every push subscription.
//   2. Keep the ones whose local hour == notify_hour right now.
//   3. For each, read that household's notification_schedule rows for the
//      device's local date.
//   4. Drop bills already ticked off in completed_occurrences (the schedule was
//      written up to 90 days ago; "is it still unpaid?" is the one thing that
//      can't be precomputed).
//   5. Send, recording each delivery so the next hourly run doesn't repeat it.
//
// Deploy:  supabase functions deploy send-notifications --no-verify-jwt
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
//          (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected already)
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
// Contact address the push service can reach you at if your pushes misbehave.
// Required by the VAPID spec; "mailto:" or an https URL.
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

// The service role client bypasses RLS on purpose — this function reads every
// household's schedule and every device's subscription. It is never exposed to
// the browser: --no-verify-jwt plus the shared-secret check below mean only the
// cron job can call it.
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Sub = {
  endpoint: string;
  household_id: string;
  p256dh: string;
  auth: string;
  timezone: string;
  notify_hour: number;
  failure_count: number;
};

type Item = { id: string; desc: string; cents: number };

type Row = {
  for_date: string;
  kind: string;
  occurrence_id: string;
  title: string;
  body: string;
  items: Item[];
  url: string;
};

// Mirror of `fmt` in src/lib/format.js — amounts are integer cents everywhere.
// Both sides call the same ICU implementation of toLocaleString, so the output
// is identical; a Node-side test compares the two over a range of values.
function money(cents: number): string {
  const abs = Math.abs(cents / 100).toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return cents < 0 ? `-$${abs}` : `$${abs}`;
}

// Mirror of billDigestMessage in src/lib/push.js. It has to exist here too:
// once bills paid since publication are filtered out, the stored count and
// total are wrong and the message has to be rebuilt around what's left.
function billDigest(items: Item[]): { title: string; body: string } | null {
  if (!items.length) return null;
  if (items.length === 1) {
    return { title: `${items[0].desc} is due today`, body: money(items[0].cents) };
  }
  const total = items.reduce((s, i) => s + i.cents, 0);
  return {
    title: `${items.length} bills due today · ${money(total)}`,
    body: items.map((i) => `${i.desc} — ${money(i.cents)}`).join("\n"),
  };
}

// Intl is the only correct way to do this — a fixed UTC offset would be wrong
// for half the year in any DST zone, and would silently drift the delivery hour.
// An invalid/unknown timezone name falls back to UTC rather than throwing and
// taking the whole run down with it.
function localParts(tz: string, at: Date): { date: string; hour: number } {
  let zone = tz || "UTC";
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(at);
  } catch {
    zone = "UTC";
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(at);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  // en-CA gives 24-hour "24" for midnight in some runtimes; normalise to 0.
  const hour = Number(get("hour")) % 24;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour };
}

async function run(): Promise<Record<string, number>> {
  const now = new Date();
  const stats = { subscriptions: 0, due: 0, sent: 0, skipped: 0, failed: 0, pruned: 0 };

  const { data: subs, error: subErr } = await db
    .from("push_subscriptions")
    .select("endpoint, household_id, p256dh, auth, timezone, notify_hour, failure_count");
  if (subErr) throw subErr;
  stats.subscriptions = subs?.length ?? 0;

  // Group the devices that are due right now by household, so each household's
  // schedule and completed-occurrence set is fetched once rather than per device.
  const dueByHousehold = new Map<string, { sub: Sub; localDate: string }[]>();
  for (const sub of (subs ?? []) as Sub[]) {
    const { date, hour } = localParts(sub.timezone, now);
    if (hour !== sub.notify_hour) continue;
    const list = dueByHousehold.get(sub.household_id) ?? [];
    list.push({ sub, localDate: date });
    dueByHousehold.set(sub.household_id, list);
  }

  for (const [householdId, devices] of dueByHousehold) {
    const dates = [...new Set(devices.map((d) => d.localDate))];
    const { data: rows, error: rowErr } = await db
      .from("notification_schedule")
      .select("for_date, kind, occurrence_id, title, body, items, url")
      .eq("household_id", householdId)
      .in("for_date", dates);
    if (rowErr) throw rowErr;
    if (!rows?.length) continue;

    // A bill marked paid after the schedule was published shouldn't nag —
    // this is the set used to filter each day's items below.
    const { data: done, error: doneErr } = await db
      .from("completed_occurrences")
      .select("occurrence_id")
      .eq("household_id", householdId);
    if (doneErr) throw doneErr;
    const completed = new Set((done ?? []).map((d) => d.occurrence_id as string));

    for (const { sub, localDate } of devices) {
      for (const row of rows as Row[]) {
        if (row.for_date !== localDate) continue;
        stats.due++;

        // Bills paid since the schedule was published drop out here. If that
        // empties the day entirely there's nothing to say; otherwise the
        // message is rebuilt so the count and total match what's actually
        // still outstanding.
        let title = row.title;
        let body = row.body;
        const items = Array.isArray(row.items) ? row.items : [];
        if (items.length) {
          const outstanding = items.filter((i) => !completed.has(i.id));
          if (!outstanding.length) {
            stats.skipped++;
            continue;
          }
          if (outstanding.length !== items.length) {
            const rebuilt = billDigest(outstanding);
            if (rebuilt) {
              title = rebuilt.title;
              body = rebuilt.body;
            }
          }
        } else if (row.occurrence_id && completed.has(row.occurrence_id)) {
          stats.skipped++;
          continue;
        }

        // Already delivered to this device for this date+kind? The hourly
        // cadence guarantees we'd otherwise re-send on a DST fall-back, when a
        // local hour repeats.
        const { error: ledgerErr } = await db
          .from("notification_sends")
          .insert({
            endpoint: sub.endpoint,
            for_date: row.for_date,
            kind: row.kind,
            occurrence_id: row.occurrence_id ?? "",
          });
        if (ledgerErr) {
          // 23505 = unique violation = already sent. Anything else is real.
          if ((ledgerErr as { code?: string }).code === "23505") {
            stats.skipped++;
            continue;
          }
          throw ledgerErr;
        }

        const payload = JSON.stringify({
          title,
          body,
          // One tag per (kind, date): a re-send for the same day replaces the
          // earlier notification rather than adding a second one.
          tag: `cf-${row.kind}-${row.for_date}`,
          url: row.url || "./",
        });

        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 12 * 60 * 60 },
          );
          stats.sent++;
          if (sub.failure_count > 0) {
            await db.from("push_subscriptions")
              .update({ failure_count: 0 })
              .eq("endpoint", sub.endpoint);
          }
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          // 404/410 mean the push service has permanently dropped this
          // endpoint (app uninstalled, notifications revoked, browser data
          // cleared). Deleting is correct — retrying it forever is not.
          if (status === 404 || status === 410) {
            await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            stats.pruned++;
          } else {
            await db.from("push_subscriptions")
              .update({ failure_count: sub.failure_count + 1 })
              .eq("endpoint", sub.endpoint);
            stats.failed++;
          }
          // Roll the ledger entry back so a transient failure can be retried
          // on the next hourly run instead of being recorded as delivered.
          await db.from("notification_sends").delete()
            .eq("endpoint", sub.endpoint)
            .eq("for_date", row.for_date)
            .eq("kind", row.kind)
            .eq("occurrence_id", row.occurrence_id ?? "");
        }
      }
    }
  }

  // Old rows serve no purpose and would grow forever.
  const cutoff = new Date(now.getTime() - 30 * 864e5).toISOString().slice(0, 10);
  await db.from("notification_sends").delete().lt("for_date", cutoff);

  return stats;
}

Deno.serve(async (req) => {
  // Deployed with --no-verify-jwt so pg_cron can call it without a user
  // session; this shared secret is what actually keeps it private. pg_net
  // sends it as a header from the cron job (see push-cron.sql).
  //
  // Fails closed: a missing CRON_SECRET refuses every request rather than
  // accepting anonymous ones. Forgetting to set it should break the cron job
  // visibly (403 in net._http_response), not quietly leave the endpoint open
  // to anyone who learns the URL.
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    console.error("CRON_SECRET is not set — refusing all requests.");
    return new Response("forbidden: CRON_SECRET not configured", { status: 403 });
  }
  if (req.headers.get("x-cron-secret") !== expected) {
    return new Response("forbidden", { status: 403 });
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(
      JSON.stringify({ error: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  try {
    const stats = await run();
    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-notifications failed:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
