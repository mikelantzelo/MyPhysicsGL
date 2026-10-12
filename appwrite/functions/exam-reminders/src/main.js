/**
 * Appwrite Function «exam-reminders» — Web Push υπενθύμιση για τεστ/διαγωνίσματα.
 *
 * Trigger: schedule κάθε 15′. Βρίσκει στον πίνακα exam_reminder όσα έχουν
 * remindAt ≤ τώρα και sent = false, στέλνει push στον καθηγητή (role = teacher)
 * και, αν notifyStudents, στους μαθητές του τμήματος, και τα σημειώνει sent.
 * Συνδρομές που απαντούν 404/410 (ληγμένες) σβήνονται.
 *
 * Μεταβλητές: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, DATABASE_ID.
 * Κλειδί: το δυναμικό key του function (header x-appwrite-key).
 */
import { Client, Query, TablesDB } from "node-appwrite";
import webpush from "web-push";

const SUBSCRIPTIONS = "push_subscriptions";

const dateLabel = (d) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("el-GR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export default async function examReminders({ req, res, log, error }) {
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

  const due = await tables.listRows({
    databaseId,
    tableId: "exam_reminder",
    queries: [
      Query.equal("sent", false),
      Query.lessThanEqual("remindAt", new Date().toISOString()),
      Query.limit(100),
    ],
  });
  if (due.total === 0) return res.json({ ok: true, due: 0 });

  async function push(subs, payload) {
    let sent = 0;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 60 * 60 * 12, urgency: "normal" },
          );
          sent++;
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) {
            await tables.deleteRow({ databaseId, tableId: SUBSCRIPTIONS, rowId: sub.$id });
          } else {
            error(`Push απέτυχε (${e.statusCode ?? "?"}): ${e.body ?? e.message}`);
          }
        }
      }),
    );
    return sent;
  }

  const teacherSubs = (
    await tables.listRows({
      databaseId,
      tableId: SUBSCRIPTIONS,
      queries: [Query.equal("role", "teacher"), Query.limit(50)],
    })
  ).rows;

  for (const exam of due.rows) {
    const section = (
      await tables.listRows({
        databaseId,
        tableId: "section",
        queries: [Query.equal("id", exam.idSection), Query.limit(1)],
      })
    ).rows[0];
    const sectionLabel = section ? `${section.name}${section.number ?? ""}` : `Τμήμα ${exam.idSection}`;
    const when = dateLabel(exam.examDate);
    const body = `${when}${exam.details ? ` · ${exam.details}` : ""}`;

    let sent = await push(
      teacherSubs,
      JSON.stringify({
        title: `Αύριο: ${exam.examType} — ${sectionLabel}`,
        body,
        url: `/admin/grades/exams?section=${exam.idSection}`,
      }),
    );

    if (exam.notifyStudents) {
      const links = (
        await tables.listRows({
          databaseId,
          tableId: "sectionCrossRefStudents",
          queries: [Query.equal("idSection", exam.idSection), Query.limit(500)],
        })
      ).rows;
      const ids = links.map((l) => l.idStudent);
      for (let i = 0; i < ids.length; i += 100) {
        const subs = (
          await tables.listRows({
            databaseId,
            tableId: SUBSCRIPTIONS,
            queries: [
              Query.equal("role", "student"),
              Query.equal("idStudent", ids.slice(i, i + 100)),
              Query.limit(500),
            ],
          })
        ).rows;
        sent += await push(
          subs,
          JSON.stringify({ title: `Αύριο έχεις ${exam.examType}`, body, url: "/exams" }),
        );
      }
    }

    await tables.updateRow({ databaseId, tableId: "exam_reminder", rowId: exam.$id, data: { sent: true } });
    log(`${exam.examType} ${sectionLabel} (${exam.examDate}): στάλθηκαν ${sent}.`);
  }

  return res.json({ ok: true, due: due.total });
}
