/**
 * Πίνακες για τις «Θέσεις» και τα «Τεστ & Διαγωνίσματα» (από το MyClass).
 * Κενά permissions: μόνο ο server. Παραλείπει όσους υπάρχουν ήδη.
 * node --env-file=.env.local scripts/create-seats-exams-tables.mjs
 */
import { Client, TablesDB } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const tables = new TablesDB(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

const existing = new Set((await tables.listTables({ databaseId })).tables.map((t) => t.$id));

async function create(tableId, columns, indexes = []) {
  if (existing.has(tableId)) return console.log(`= ${tableId}`);
  await tables.createTable({
    databaseId,
    tableId,
    name: tableId,
    permissions: [],
    rowSecurity: false,
    columns,
    indexes,
  });
  console.log(`+ ${tableId}`);
}

// Διάταξη θρανίων ανά τμήμα (rowId = idSection). Κάθε θρανίο έχει 2 θέσεις.
await create("seat_layout", [
  { key: "idSection", type: "integer", required: true },
  { key: "rows", type: "integer", required: true },
  { key: "cols", type: "integer", required: true },
]);

// Θέση μαθητή (rowId = `${idSection}_${idStudent}`): θρανίο (row, col) και θέση 0 = αριστερά, 1 = δεξιά.
await create(
  "seat",
  [
    { key: "idSection", type: "integer", required: true },
    { key: "idStudent", type: "integer", required: true },
    { key: "row", type: "integer", required: true },
    { key: "col", type: "integer", required: true },
    { key: "slot", type: "integer", required: true },
  ],
  [{ key: "by_section", type: "key", attributes: ["idSection"] }],
);

// Προγραμματισμένα τεστ/διαγωνίσματα με υπενθύμιση (push) την παραμονή.
await create(
  "exam_reminder",
  [
    { key: "idSection", type: "integer", required: true },
    { key: "examType", type: "varchar", size: 50, required: true },
    { key: "examDate", type: "varchar", size: 10, required: true },
    { key: "details", type: "varchar", size: 200, required: false },
    { key: "remindAt", type: "datetime", required: false },
    { key: "notifyStudents", type: "boolean", required: false, default: false },
    { key: "sent", type: "boolean", required: false, default: false },
  ],
  [
    { key: "by_section", type: "key", attributes: ["idSection", "examDate"] },
    { key: "by_due", type: "key", attributes: ["sent", "remindAt"] },
  ],
);

console.log("OK");
