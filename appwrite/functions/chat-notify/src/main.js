/**
 * Appwrite Function «chat-notify» — Web Push για νέο μήνυμα συνομιλίας.
 *
 * Trigger: event databases.<db>.tables.messages.rows.*.create
 *   - sender = "teacher" → push σε όλες τις συσκευές του μαθητή (idStudent)
 *   - sender = "student" → push σε όλες τις συσκευές του καθηγητή (role = teacher)
 * Οι συνδρομές βρίσκονται στον πίνακα push_subscriptions (τις γράφει η εφαρμογή).
 * Συνδρομές που απαντούν 404/410 (ληγμένες) σβήνονται αυτόματα.
 *
 * Μεταβλητές: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, DATABASE_ID.
 * Το API key δεν χρειάζεται μεταβλητή: χρησιμοποιείται το δυναμικό key του
 * function (header x-appwrite-key), με τα scopes που ορίζει το deploy script.
 */
import { Client, Query, TablesDB } from "node-appwrite";
import webpush from "web-push";

const SUBSCRIPTIONS = "push_subscriptions";
const STUDENTS = "student";

export default async function chatNotify({ req, res, log, error }) {
  const event = req.headers["x-appwrite-event"] ?? "";
  if (!event.includes(".tables.messages.") || !event.endsWith(".create")) {
    log(`Αγνοήθηκε: ${event || "(χωρίς event)"}`);
    return res.json({ ok: true, skipped: true });
  }

  const msg = req.bodyJson ?? JSON.parse(req.body || "{}");
  const idStudent = Number(msg.idStudent);
  if (!Number.isInteger(idStudent) || !["teacher", "student"].includes(msg.sender)) {
    error(`Μη έγκυρο μήνυμα: ${JSON.stringify(msg).slice(0, 200)}`);
    return res.json({ ok: false }, 400);
  }

  const databaseId = process.env.DATABASE_ID;
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);
  const tables = new TablesDB(client);

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  // Παραλήπτες και περιεχόμενο ειδοποίησης.
  const toStudent = msg.sender === "teacher";
  const subs = await tables.listRows({
    databaseId,
    tableId: SUBSCRIPTIONS,
    queries: toStudent
      ? [Query.equal("role", "student"), Query.equal("idStudent", idStudent), Query.limit(50)]
      : [Query.equal("role", "teacher"), Query.limit(50)],
  });
  if (subs.total === 0) {
    log(`Καμία συσκευή με ειδοποιήσεις για ${toStudent ? `μαθητή ${idStudent}` : "καθηγητή"}.`);
    return res.json({ ok: true, sent: 0 });
  }

  let title = "Νέο μήνυμα από τον καθηγητή";
  let url = "/chat";
  if (!toStudent) {
    url = `/admin/messages?student=${idStudent}`;
    const st = await tables.listRows({
      databaseId,
      tableId: STUDENTS,
      queries: [Query.equal("id", idStudent), Query.limit(1)],
    });
    const s = st.rows[0];
    title = s ? `Μήνυμα: ${`${s.lastName ?? ""} ${s.firstName ?? ""}`.trim()}` : "Νέο μήνυμα μαθητή";
  }
  const text = String(msg.text ?? "").replace(/\s+/g, " ");
  const payload = JSON.stringify({
    title,
    body: text.length > 140 ? `${text.slice(0, 139)}…` : text,
    url,
    idStudent,
    sender: msg.sender,
  });

  // Αποστολή σε όλες τις συσκευές· ληγμένες συνδρομές σβήνονται.
  let sent = 0;
  let removed = 0;
  await Promise.all(
    subs.rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: "high" },
        );
        sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await tables.deleteRow({ databaseId, tableId: SUBSCRIPTIONS, rowId: sub.$id });
          removed++;
        } else {
          error(`Push απέτυχε (${e.statusCode ?? "?"}): ${e.body ?? e.message}`);
        }
      }
    }),
  );

  log(`Μήνυμα ${msg.sender} → ${toStudent ? `μαθητή ${idStudent}` : "καθηγητή"}: στάλθηκαν ${sent}, σβήστηκαν ${removed} ληγμένες.`);
  return res.json({ ok: true, sent, removed });
}
