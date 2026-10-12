/**
 * Δημιουργεί τον πίνακα `lesson_progress` (πρόοδος + αναφορά εκτύπωσης των
 * μαθημάτων, μία γραμμή ανά μαθητή × παράγραφο). Κενά permissions: μόνο ο server.
 * Τρέχει μία φορά: node --env-file=.env.local scripts/create-lesson-progress-table.mjs
 */
import { Client, TablesDB } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const tables = new TablesDB(client);

const table = await tables.createTable({
  databaseId: process.env.APPWRITE_DATABASE_ID,
  tableId: "lesson_progress",
  name: "lesson_progress",
  permissions: [],
  rowSecurity: false,
  columns: [
    { key: "idStudent", type: "integer", required: true },
    { key: "idChapter", type: "varchar", size: 36, required: true },
    // Βήματα της διαδρομής: τώρα, το μέγιστο που έφτασε ποτέ, σύνολο.
    { key: "done", type: "integer", required: false, default: 0 },
    { key: "maxDone", type: "integer", required: false, default: 0 },
    { key: "total", type: "integer", required: false, default: 0 },
    { key: "firstSeen", type: "datetime", required: false },
    { key: "lastSeen", type: "datetime", required: false },
    { key: "completedAt", type: "datetime", required: false },
    // Η τελευταία εκτύπωση: gzip + base64 του { head, body, title }.
    { key: "report", type: "longtext", required: false },
    { key: "reportAt", type: "datetime", required: false },
    { key: "reports", type: "integer", required: false, default: 0 },
  ],
  indexes: [
    { key: "by_student", type: "key", attributes: ["idStudent", "idChapter"] },
    { key: "by_chapter", type: "key", attributes: ["idChapter"] },
  ],
});

console.log(`OK: ${table.$id}`);
