/**
 * Δημιουργεί/ενημερώνει και ανεβάζει το Appwrite Function «chat-notify».
 *
 *   node --env-file=.env.local scripts/deploy-chat-notify.mjs
 *
 * Χρειάζεται API key με scopes functions.read, functions.write.
 * Παίρνει τα κλειδιά VAPID από το .env.local (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
 * VAPID_SUBJECT) και τα αποθηκεύει ως μεταβλητές του function (το ιδιωτικό ως secret).
 */
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("package.json"));
const { Client, Functions, ID } = require("node-appwrite");
const { InputFile } = require("node-appwrite/file");

const FUNCTION_ID = "chat-notify";
const SOURCE = path.resolve("appwrite/functions/chat-notify");
const ARCHIVE = path.resolve("appwrite/functions/chat-notify.tar.gz");

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Λείπει ${k} από το .env.local`);
  return v;
};

const client = new Client()
  .setEndpoint(env("NEXT_PUBLIC_APPWRITE_ENDPOINT"))
  .setProject(env("NEXT_PUBLIC_APPWRITE_PROJECT_ID"))
  .setKey(env("APPWRITE_API_KEY"));
const functions = new Functions(client);
const databaseId = env("APPWRITE_DATABASE_ID");

// Νεότερο διαθέσιμο runtime Node (η λίστα θέλει επιπλέον scope· αλλιώς node-22).
let runtime = "node-22";
try {
  const ids = (await functions.listRuntimes()).runtimes
    .map((r) => r.$id)
    .filter((id) => /^node-\d+(\.\d+)?$/.test(id))
    .sort((a, b) => parseFloat(b.slice(5)) - parseFloat(a.slice(5)));
  if (ids[0]) runtime = ids[0];
} catch {
  // Χωρίς δικαίωμα λίστας runtimes — μένει το node-22.
}

const config = {
  functionId: FUNCTION_ID,
  name: "Ειδοποιήσεις συνομιλίας",
  runtime,
  execute: [], // κανείς δεν το εκτελεί απ' έξω — μόνο το event
  events: [`databases.${databaseId}.tables.messages.rows.*.create`],
  timeout: 15,
  enabled: true,
  logging: true,
  entrypoint: "src/main.js",
  commands: "npm install --omit=dev",
  scopes: ["rows.read", "rows.write"],
};

let exists = true;
try {
  await functions.get({ functionId: FUNCTION_ID });
} catch (e) {
  if (e.code !== 404) throw e;
  exists = false;
}
if (exists) {
  const { functionId, ...rest } = config;
  await functions.update({ functionId, ...rest });
  console.log(`Ενημερώθηκε το function ${FUNCTION_ID} (${runtime}).`);
} else {
  await functions.create(config);
  console.log(`Δημιουργήθηκε το function ${FUNCTION_ID} (${runtime}).`);
}

// Μεταβλητές (create ή update).
const vars = [
  ["DATABASE_ID", databaseId, false],
  ["VAPID_PUBLIC_KEY", env("VAPID_PUBLIC_KEY"), false],
  ["VAPID_PRIVATE_KEY", env("VAPID_PRIVATE_KEY"), true],
  ["VAPID_SUBJECT", env("VAPID_SUBJECT"), false],
];
const existing = (await functions.listVariables({ functionId: FUNCTION_ID })).variables;
for (const [key, value, secret] of vars) {
  const found = existing.find((v) => v.key === key);
  if (found) {
    await functions.updateVariable({ functionId: FUNCTION_ID, variableId: found.$id, key, value, secret });
  } else {
    await functions.createVariable({ functionId: FUNCTION_ID, variableId: ID.unique(), key, value, secret });
  }
}
console.log(`Μεταβλητές: ${vars.map(([k]) => k).join(", ")}`);

// Πακέτο κώδικα (χωρίς node_modules — τα εγκαθιστά το Appwrite στο build).
if (existsSync(ARCHIVE)) rmSync(ARCHIVE);
// Σχετικές διαδρομές: το GNU tar των Windows διαβάζει το «C:» ως απομακρυσμένο host.
execFileSync(
  "tar",
  ["-czf", path.basename(ARCHIVE), "--exclude=node_modules", "-C", path.basename(SOURCE), "."],
  { stdio: "inherit", cwd: path.dirname(SOURCE) },
);
const deployment = await functions.createDeployment({
  functionId: FUNCTION_ID,
  code: InputFile.fromPath(ARCHIVE, "chat-notify.tar.gz"),
  activate: true,
  entrypoint: config.entrypoint,
  commands: config.commands,
});
rmSync(ARCHIVE);
console.log(`Deployment ${deployment.$id}: ${deployment.status} — περιμένω το build…`);

for (let i = 0; i < 90; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  const d = await functions.getDeployment({ functionId: FUNCTION_ID, deploymentId: deployment.$id });
  if (d.status === "ready") {
    console.log("✓ Έτοιμο και ενεργό.");
    process.exit(0);
  }
  if (d.status === "failed") {
    console.error("✗ Το build απέτυχε:\n" + (d.buildLogs ?? ""));
    process.exit(1);
  }
}
console.error("Το build αργεί — δες το Appwrite Console → Functions → chat-notify.");
process.exit(1);
