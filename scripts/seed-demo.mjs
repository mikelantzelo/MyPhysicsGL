/**
 * Δοκιμαστικά δεδομένα για να φαίνονται όλες οι οθόνες: ερωτήσεις quiz,
 * αποτελέσματα quiz, πρόοδος/εργασίες μαθημάτων, ενεργή παράγραφος,
 * βαθμολογίες (Α2, Γ4, Ιδιαίτερα Γ΄), πλάνο θέσεων, προγραμματισμός τεστ και
 * μια συνομιλία με τον δοκιμαστικό μαθητή Θάνο.
 *
 *   node --env-file=.env.local scripts/seed-demo.mjs          γεμίζει
 *   node --env-file=.env.local scripts/seed-demo.mjs --clean  σβήνει ΟΛΑ τα δοκιμαστικά
 *
 * Ό,τι δημιουργεί γράφεται στο scripts/demo/manifest.json (εκτός git), για το --clean.
 * Μηνύματα μόνο στον Θάνο και υπενθυμίσεις τεστ μόνο στον καθηγητή — τίποτα
 * δεν φτάνει σε πραγματικούς μαθητές.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { createRequire } from "node:module";

import { QUESTIONS } from "./demo/questions.mjs";

const require = createRequire(path.resolve("package.json"));
const { Client, ID, Query, TablesDB } = require("node-appwrite");

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const tables = new TablesDB(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;
const MANIFEST = path.resolve("scripts/demo/manifest.json");

// ---------- βοηθητικά ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const int = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad = (n) => String(n).padStart(2, "0");
const dmy = (d, sep = "-") => `${pad(d.getUTCDate())}${sep}${pad(d.getUTCMonth() + 1)}${sep}${d.getUTCFullYear()}`;
const day = (iso) => new Date(`${iso}T12:00:00Z`);
const addDays = (d, n) => new Date(d.getTime() + n * 86_400_000);
const between = (from, to) => new Date(rnd(day(from).getTime(), day(to).getTime()));

async function all(tableId, queries = []) {
  const out = [];
  let cursor = null;
  for (;;) {
    const res = await tables.listRows({
      databaseId,
      tableId,
      queries: [...queries, Query.limit(1000), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    });
    out.push(...res.rows);
    if (res.rows.length < 1000) return out;
    cursor = res.rows.at(-1).$id;
  }
}
async function maxId(tableId, column = "id") {
  const res = await tables.listRows({ databaseId, tableId, queries: [Query.orderDesc(column), Query.limit(1)] });
  return res.rows[0]?.[column] ?? 0;
}

const manifest = existsSync(MANIFEST)
  ? JSON.parse(readFileSync(MANIFEST, "utf8"))
  : { created: {}, restore: {} };
const save = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
const track = (tableId, rowId) => {
  (manifest.created[tableId] ??= []).push(rowId);
};
async function create(tableId, data, rowId = ID.unique()) {
  const row = await tables.createRow({ databaseId, tableId, rowId: String(rowId), data });
  track(tableId, row.$id);
  return row;
}

// ---------- --clean ----------
if (process.argv.includes("--clean")) {
  // Και οι βαθμολογίες «(δοκιμή)» που μπήκαν πριν από αυτό το script.
  const demoScores = (await all("score")).filter((r) => String(r.Details ?? "").includes("(δοκιμή)"));
  for (const s of demoScores) {
    for (const ss of await all("studentScore", [Query.equal("idScore", s.id)])) {
      await tables.deleteRow({ databaseId, tableId: "studentScore", rowId: ss.$id }).catch(() => {});
    }
    await tables.deleteRow({ databaseId, tableId: "score", rowId: s.$id }).catch(() => {});
  }
  let n = demoScores.length;
  for (const [tableId, ids] of Object.entries(manifest.created)) {
    for (const rowId of ids) {
      await tables.deleteRow({ databaseId, tableId, rowId }).then(() => n++).catch(() => {});
    }
  }
  for (const [key, data] of Object.entries(manifest.restore)) {
    const [tableId, rowId] = key.split("/");
    await tables.upsertRow({ databaseId, tableId, rowId, data }).catch(() => {});
  }
  writeFileSync(MANIFEST, JSON.stringify({ created: {}, restore: {} }, null, 2));
  console.log(`Σβήστηκαν ${n} δοκιμαστικές εγγραφές.`);
  process.exit(0);
}

if (Object.values(manifest.created).some((ids) => ids.length)) {
  console.error("Υπάρχουν ήδη δοκιμαστικά δεδομένα — τρέξε πρώτα με --clean.");
  process.exit(1);
}

// ---------- τμήματα και μαθητές ----------
const SECTIONS = {
  6: { label: "Α1", leaves: "GA" },
  7: { label: "Α2", leaves: "GA" },
  17: { label: "Γ4", leaves: "GC" },
  18: { label: "Ιδιαίτερα Γ΄", leaves: "GC" },
};
const nodes = await all("nodes");
const parents = new Set(nodes.map((n) => n.parentId).filter(Boolean));
const leavesOf = (level) =>
  nodes
    .filter((n) => n.level === level && !parents.has(n.$id))
    .map((n) => n.$id)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const studentsBySection = {};
for (const id of Object.keys(SECTIONS)) {
  studentsBySection[id] = (await all("sectionCrossRefStudents", [Query.equal("idSection", Number(id))])).map(
    (l) => l.idStudent,
  );
}
const allIds = Object.values(studentsBySection).flat();
const studentRows = await all("student", [Query.equal("id", allIds)]);
const nameOf = new Map(studentRows.map((s) => [s.id, `${s.lastName ?? ""} ${s.firstName ?? ""}`.trim()]));

// «Επίπεδο» μαθητή (0–20): από τους βαθμούς του αν υπάρχουν, αλλιώς τυχαίο.
const existingGrades = await all("studentScore", [Query.equal("idStudent", allIds)]);
const level = {};
for (const s of allIds) {
  const v = existingGrades.filter((g) => g.idStudent === s && g.score != null && !g.owes).map((g) => g.score);
  level[s] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : rnd(9, 18.5);
}
const skill = (s) => clamp((level[s] - 6) / 14, 0.1, 0.97); // 0–1

// ---------- 1. ερωτήσεις quiz ----------
let qid = await maxId("question", "idQuestion");
let questions = 0;
for (const [idChapter, list] of Object.entries(QUESTIONS)) {
  for (const q of list) {
    const answers = q.answers ?? [];
    const [answerA = "", answerB = "", answerC = "", answerD = "", answerE = ""] = answers.map(
      (a, i) => `${i + 1}. ${a}`,
    );
    await create("question", {
      idQuestion: ++qid,
      idChapter,
      questionNumber: q.type,
      questionText: q.text,
      imgNumber: "",
      questionImage: "",
      answerA,
      answerB,
      answerC,
      answerD,
      answerE,
      correctAnswer: q.correct,
    });
    questions++;
  }
}
save();
console.log(`✓ ${questions} ερωτήσεις quiz σε ${Object.keys(QUESTIONS).length} παραγράφους`);

// ---------- 2. αποτελέσματα quiz ----------
const quizLeaves = { GA: Object.keys(QUESTIONS).filter((k) => k.startsWith("a-")), GC: Object.keys(QUESTIONS).filter((k) => k.startsWith("c-")) };
let rid = await maxId("result");
let results = 0;
for (const [sec, info] of Object.entries(SECTIONS)) {
  for (const s of studentsBySection[sec]) {
    if (chance(0.08)) continue; // μερικοί δεν έκαναν κανένα quiz
    const chosen = quizLeaves[info.leaves].filter(() => chance(0.45 + skill(s) * 0.5));
    for (const idChapter of chosen) {
      const attempts = chance(0.35) ? int(2, 3) : 1;
      let when = between("2026-09-14", "2026-10-08");
      for (let a = 1; a <= attempts; a++) {
        const p = clamp(skill(s) + (a - 1) * 0.12 + rnd(-0.1, 0.1), 0.05, 1);
        const correct = Array.from({ length: 6 }).filter(() => chance(p)).length;
        const secs = int(110, 540);
        await create("result", {
          id: ++rid,
          idStudent: s,
          idChapter,
          score: correct.toFixed(2),
          attempt: a,
          timePass: `00:${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`,
          sumQuestions: 6,
          dateOfQuiz: dmy(when, "/"),
        });
        results++;
        when = addDays(when, int(0, 3));
      }
    }
  }
}
save();
console.log(`✓ ${results} αποτελέσματα quiz`);

// ---------- 3. πρόοδος μαθημάτων & εργασίες ----------
// Αναφορά «όπως την εκτύπωσε ο μαθητής» για μερικά μαθήματα.
const REPORTS = {
  "a-2-1": [
    ["Παρατηρώ · Τι μπορεί να μετρηθεί;", "Ποια φυσικά μεγέθη θα χρειαζόσουν για το αποτέλεσμα της σύγκρουσης δύο σωμάτων;", ["Τη μάζα και την ταχύτητα των σωμάτων.", "Το βάρος και πόσο γρήγορα πάνε.", "Την ταχύτητα."]],
    ["Παρατηρώ · Τι μπορεί να μετρηθεί;", "Μπορείς να μετρήσεις το γέλιο ως συναίσθημα;", ["Όχι, γιατί δεν υπάρχει όργανο και μονάδα μέτρησης για το συναίσθημα.", "Όχι, δεν μετριέται.", "Ναι, με το πόσο δυνατά γελάμε."]],
    ["Δραστηριότητα 3 · Αλλάζω τη μονάδα", "Η μάζα του αθλητή 95 kg σε g", ["95000 g", "95 000 g", "9500 g"]],
    ["Δραστηριότητα 3 · Αλλάζω τη μονάδα", "Διάρκεια μαθήματος 40 min σε s", ["2400 s", "2400 δευτερόλεπτα", "240 s"]],
  ],
  "a-2-2-a": [
    ["Δραστηριότητα 1 · Μετρώ το θρανίο", "Μήκος θρανίου (cm) — 4 μετρήσεις και μέση τιμή", ["120,2 · 120,4 · 120,3 · 120,5 → 120,35 cm", "120 · 121 · 120 · 120 → 120,25 cm", "120,4 cm"]],
    ["Δραστηριότητα 1 · Μετρώ το θρανίο", "Γιατί οι μετρήσεις δεν βγαίνουν ακριβώς ίδιες;", ["Λόγω τυχαίων σφαλμάτων, π.χ. πώς κοιτάμε την κλίμακα.", "Γιατί ο χάρακας δεν είναι ακριβής.", "Δεν ξέρω."]],
    ["Ασκήσεις", "Τι είναι το σφάλμα παράλλαξης;", ["Το σφάλμα όταν διαβάζουμε την κλίμακα πλάγια και όχι κάθετα.", "Όταν κοιτάμε στραβά.", ""]],
  ],
  "c-1-1-a": [
    ["Εισαγωγή & Φαινόμενα", "Γιατί τα μπαλόνια που τρίψαμε στα μαλλιά απωθούνται;", ["Γιατί αποκτούν ομώνυμα φορτία και τα ομώνυμα απωθούνται.", "Γιατί είναι φορτισμένα.", "Λόγω του αέρα."]],
    ["Δραστηριότητα 1 · Δυνάμεις", "Τι παρατηρείς όταν πλησιάζεις δύο φορτισμένες ράβδους από διαφορετικό υλικό;", ["Έλκονται, άρα έχουν ετερώνυμα φορτία.", "Πλησιάζουν μεταξύ τους.", "Τίποτα."]],
    ["Θεωρία & Φορτία", "Ποια είναι η μονάδα του ηλεκτρικού φορτίου;", ["Το Coulomb (C).", "Coulomb", "Volt"]],
  ],
  "c-1-2-a": [
    ["Δραστηριότητα 1: Ηλέκτριση με Τριβή", "Τι μεταφέρεται από το ένα σώμα στο άλλο κατά την τριβή;", ["Ηλεκτρόνια, από το ένα σώμα στο άλλο.", "Ηλεκτρόνια.", "Πρωτόνια."]],
    ["Δραστηριότητα 2: Ηλέκτριση με Επαγωγή", "Γιατί οι λωρίδες κλείνουν όταν απομακρύνεται ο χάρακας;", ["Τα φορτία επιστρέφουν στις αρχικές θέσεις, το σώμα δεν φορτίστηκε.", "Γιατί φεύγει η δύναμη.", ""]],
  ],
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function reportFor(leaf, title, studentSkill) {
  const groups = new Map();
  for (const [step, q, variants] of REPORTS[leaf]) {
    const v = studentSkill > 0.7 ? variants[0] : studentSkill > 0.4 ? pick(variants.slice(0, 2)) : pick(variants);
    if (!groups.has(step)) groups.set(step, []);
    groups.get(step).push(`<p><strong>${esc(q)}</strong>: ${v ? esc(v) : "<em>—</em>"}</p>`);
  }
  const body =
    `<body><div class="pl-app"><section class="pl-stage mpl-answers"><h2>Αναφορά εργασίας</h2><h3>Απαντήσεις και καταγραφές μαθητή</h3>` +
    [...groups].map(([step, ps]) => `<div class="mpl-answers__step"><h4>${esc(step)}</h4>${ps.join("")}</div>`).join("") +
    `</section></div></body>`;
  const head =
    `<link rel="stylesheet" href="https://micmichal.sites.sch.gr/new_books/StoryLine/shared/physics-lab.css">` +
    `<style>.mpl-answers__step{border:1px solid #bbb;border-radius:12px;padding:.75rem 1rem;margin:0 0 .75rem}.mpl-answers p{margin:.35rem 0}</style>`;
  return gzipSync(JSON.stringify({ head, body, title })).toString("base64");
}

const titleOf = new Map(nodes.map((n) => [n.$id, `${n.name} ${n.title}`]));
const existingProgress = new Set((await all("lesson_progress")).map((r) => r.$id));
const LESSON_RANGE = { GA: 8, GC: 10 }; // πόσες πρώτες παράγραφοι έχουν «διδαχτεί»
let progress = 0;
let reports = 0;
for (const [sec, info] of Object.entries(SECTIONS)) {
  const lessons = leavesOf(info.leaves).slice(0, LESSON_RANGE[info.leaves]);
  for (const s of studentsBySection[sec]) {
    for (const [i, leaf] of lessons.entries()) {
      const rowId = `${s}_${leaf}`;
      if (existingProgress.has(rowId)) continue;
      const recent = i >= lessons.length - 2; // τα πιο πρόσφατα τα έχουν ανοίξει λιγότεροι
      if (!chance((recent ? 0.45 : 0.7) + skill(s) * 0.3)) continue;
      const total = 6 + ((leaf.length * 7 + i * 3) % 6); // σταθερό ανά μάθημα (6–11)
      const done = chance(skill(s)) ? total : int(0, total - 1);
      const first = between("2026-09-14", "2026-10-09");
      const last = addDays(first, int(0, 3));
      const data = {
        idStudent: s,
        idChapter: leaf,
        done,
        maxDone: done,
        total,
        firstSeen: first.toISOString(),
        lastSeen: last.toISOString(),
        completedAt: done === total ? last.toISOString() : null,
      };
      if (REPORTS[leaf] && done >= total / 2) {
        data.report = reportFor(leaf, titleOf.get(leaf) ?? leaf, skill(s));
        data.reportAt = last.toISOString();
        data.reports = done === total && chance(0.6) ? 1 : 0;
        reports++;
      }
      await create("lesson_progress", data, rowId);
      progress++;
    }
  }
}
save();
console.log(`✓ ${progress} εγγραφές προόδου μαθημάτων (${reports} με απαντήσεις)`);

// ---------- 4. ενεργή παράγραφος ----------
const ACTIVE = { 6: "a-2-3-b", 7: "a-2-2-a", 17: "c-1-4-a", 18: "c-1-2-a" };
for (const [sec, nodeId] of Object.entries(ACTIVE)) {
  const rowId = String(sec);
  const prev = await tables.getRow({ databaseId, tableId: "active", rowId }).catch(() => null);
  if (prev) {
    manifest.restore[`active/${rowId}`] = { idActive: prev.idActive, idSection: prev.idSection, active: prev.active, dateOfUpdate: prev.dateOfUpdate };
    await tables.updateRow({ databaseId, tableId: "active", rowId, data: { active: nodeId } });
  } else {
    await create("active", { idActive: Number(sec), idSection: Number(sec), active: nodeId, dateOfUpdate: "2026-10-12" }, rowId);
  }
}
save();
console.log("✓ ενεργή παράγραφος σε Α1, Α2, Γ4, Ιδιαίτερα Γ΄");

// ---------- 5. βαθμολογίες (Α1 έχει ήδη) ----------
const COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#3b82f6"];
let scoreId = await maxId("score");
let ssId = await maxId("studentScore");
let gradeCount = 0;
const PLANS = [
  ["16-09-2026", 2, "Κεφ. 1"],
  ["23-09-2026", 4, "Κεφ. 1"],
  ["30-09-2026", 2, "Κεφ. 2.1"],
  ["02-10-2026", 7, "Εργασία 1"],
  ["07-10-2026", 3, "Κεφ. 1–2"],
  ["09-10-2026", 2, "Κεφ. 2.2"],
];
for (const sec of [7, 17, 18]) {
  for (const [date, type, details] of PLANS) {
    scoreId++;
    await create(
      "score",
      { id: scoreId, aa: 0, idSection: sec, idLesson: 1, idGradeType: type, idScore: 2, Details: `${details} (δοκιμή)`, scoreDate: date },
      scoreId,
    );
    for (const s of studentsBySection[sec]) {
      const owes = chance(0.06);
      const score = owes ? null : clamp(Math.round((level[s] + rnd(-3, 3)) * 2) / 2, 0, 20);
      const color = !owes && chance(0.12) ? (score >= 17 ? "#22c55e" : score < 10 ? "#ef4444" : pick(COLORS)) : null;
      const icon = !owes && chance(0.12) ? String(score >= 18 ? pick([5, 11, 1]) : score < 10 ? pick([6, 7, 4]) : pick([9, 10, 2])) : null;
      ssId++;
      await create(
        "studentScore",
        { id: ssId, idScore: scoreId, idSection: sec, idStudent: s, score, owes, decimals: 0, notes: null, color, icon },
        ssId,
      );
      gradeCount++;
    }
  }
}
save();
console.log(`✓ 18 βαθμολογίες (Α2, Γ4, Ιδιαίτερα Γ΄) με ${gradeCount} βαθμούς`);

// ---------- 6. πλάνο θέσεων ----------
const LAYOUTS = { 6: [5, 3], 7: [3, 2], 17: [4, 2] };
for (const [sec, [rows, cols]] of Object.entries(LAYOUTS)) {
  const ids = [...studentsBySection[sec]].sort((a, b) => (nameOf.get(a) ?? "").localeCompare(nameOf.get(b) ?? "", "el"));
  const existing = await tables.getRow({ databaseId, tableId: "seat_layout", rowId: String(sec) }).catch(() => null);
  if (!existing) await create("seat_layout", { idSection: Number(sec), rows, cols }, sec);
  let i = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (let slot = 0; slot < 2; slot++) {
        if (i >= ids.length) break;
        // λίγες κενές θέσεις, για να μοιάζει αληθινό
        if (ids.length < rows * cols * 2 - 2 && chance(0.08)) continue;
        await create("seat", { idSection: Number(sec), idStudent: ids[i], row, col, slot }, `${sec}_${ids[i]}`).catch(() => {});
        i++;
      }
    }
  }
}
save();
console.log("✓ πλάνο θέσεων Α1, Α2, Γ4");

// ---------- 7. προγραμματισμός τεστ (υπενθύμιση μόνο στον καθηγητή) ----------
const EXAMS = [
  [6, "Τεστ", "2026-10-16", "2.3α–2.3β Μάζα και πυκνότητα"],
  [6, "Διαγώνισμα", "2026-11-06", "Κεφάλαιο 2"],
  [7, "Τεστ", "2026-10-20", "2.2 Μέτρηση μήκους και όγκου"],
  [17, "Τεστ", "2026-10-15", "1.3 Ηλεκτρικό πεδίο"],
  [17, "Διαγώνισμα", "2026-11-04", "1.1–1.4"],
  [18, "Τεστ", "2026-10-14", "1.2α Τρόποι ηλέκτρισης"],
];
for (const [sec, examType, examDate, details] of EXAMS) {
  const remind = addDays(day(examDate), -1);
  remind.setUTCHours(15, 0, 0, 0); // 18:00 ώρα Ελλάδας (θερινή)
  await create("exam_reminder", {
    idSection: sec,
    examType,
    examDate,
    details: `${details} (δοκιμή)`,
    remindAt: remind.toISOString(),
    notifyStudents: sec === 18, // μόνο ο δοκιμαστικός μαθητής
    sent: false,
  });
}
save();
console.log(`✓ ${EXAMS.length} προγραμματισμένα τεστ/διαγωνίσματα`);

// ---------- 8. συνομιλία με τον Θάνο ----------
const THANOS = 360;
const meta = await tables.getRow({ databaseId, tableId: "students_chat_meta", rowId: String(THANOS) }).catch(() => null);
if (meta) {
  manifest.restore[`students_chat_meta/${THANOS}`] = {
    idStudent: THANOS,
    teacher_msg_num: meta.teacher_msg_num,
    student_msg_num: meta.student_msg_num,
    lastMessageTime: meta.lastMessageTime,
    lastMessage: meta.lastMessage,
  };
}
const CHAT = [
  ["teacher", "Καλησπέρα Θάνο! Μην ξεχάσεις ότι την Τετάρτη γράφουμε τεστ στην 1.2α.", -26],
  ["student", "Καλησπέρα κύριε! Εντάξει. Μπορώ να ρωτήσω κάτι για την επαγωγή;", -25],
  ["teacher", "Φυσικά, γράψε μου.", -25],
  ["student", "Γιατί τα φύλλα του ηλεκτροσκοπίου κλείνουν όταν απομακρύνουμε τη ράβδο;", -2],
];
let lastTime = null;
for (const [sender, text, hours] of CHAT) {
  lastTime = new Date(Date.now() + hours * 3_600_000).toISOString();
  await create("messages", { idStudent: THANOS, sender, text, sentTime: lastTime });
}
await tables.upsertRow({
  databaseId,
  tableId: "students_chat_meta",
  rowId: String(THANOS),
  data: { idStudent: THANOS, teacher_msg_num: 0, student_msg_num: 1, lastMessageTime: lastTime, lastMessage: CHAT.at(-1)[1] },
});
save();
console.log("✓ συνομιλία με τον Θάνο (1 αδιάβαστο για τον καθηγητή)");

console.log(`\nΈτοιμο. Για να τα σβήσεις όλα: node --env-file=.env.local scripts/seed-demo.mjs --clean`);
