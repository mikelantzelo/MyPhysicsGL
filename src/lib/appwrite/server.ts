import "server-only";

import { cookies } from "next/headers";
import { Account, Client, TablesDB, Users } from "node-appwrite";

import { appwriteConfig, SESSION_COOKIE } from "./config";

/**
 * Admin client — με το API key. Πλήρη δικαιώματα στο project.
 * Χρήση: login (δημιουργία session) και όλα τα reads/writes στη βάση,
 * αφού τα tables έχουν κενά permissions και κανείς client δεν τα αγγίζει απευθείας.
 */
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)
    .setKey(appwriteConfig.apiKey);

  return {
    get account() {
      return new Account(client);
    },
    get tables() {
      return new TablesDB(client);
    },
    /** Λογαριασμοί χρηστών (μόνο για τη διαχείριση μαθητών του admin). */
    get users() {
      return new Users(client);
    },
  };
}

/**
 * Session client — με το session secret του τρέχοντος χρήστη (από το cookie).
 * Χρήση: ό,τι αφορά τον ίδιο τον χρήστη (account.get, logout).
 */
export async function createSessionClient() {
  const session = (await cookies()).get(SESSION_COOKIE);

  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId);

  if (session?.value) {
    client.setSession(session.value);
  }

  return {
    hasSession: Boolean(session?.value),
    get account() {
      return new Account(client);
    },
  };
}
