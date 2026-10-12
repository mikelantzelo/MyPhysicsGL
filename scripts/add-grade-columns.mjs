/**
 * Στήλες που χρειάζεται η βαθμολογία τμήματος (όπως στο MyClass) και έλειπαν
 * από τους πίνακες που μεταφέρθηκαν: `score.idSection` (το τμήμα της
 * βαθμολογίας) και `studentScore.owes` («Απουσία» — χρωστάει τον βαθμό).
 * Μόνο προσθήκη στηλών· τα υπάρχοντα δεδομένα δεν αλλάζουν. Idempotent.
 * node --env-file=.env.local scripts/add-grade-columns.mjs
 */
import { Client, TablesDB } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const tables = new TablesDB(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

async function has(tableId, key) {
  const t = await tables.getTable({ databaseId, tableId });
  return t.columns.some((c) => c.key === key);
}

if (!(await has("score", "idSection"))) {
  await tables.createIntegerColumn({ databaseId, tableId: "score", key: "idSection", required: false });
  console.log("+ score.idSection");
}
if (!(await has("studentScore", "owes"))) {
  await tables.createBooleanColumn({
    databaseId,
    tableId: "studentScore",
    key: "owes",
    required: false,
    xdefault: false,
  });
  console.log("+ studentScore.owes");
}
console.log("OK");
