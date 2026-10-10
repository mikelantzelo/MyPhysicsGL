/**
 * Κεντρικό σημείο για όλες τις μεταβλητές περιβάλλοντος του Appwrite.
 * Αν λείπει κάτι, σκάει εδώ με καθαρό μήνυμα αντί για κρυπτικό σφάλμα αργότερα.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Λείπει η μεταβλητή περιβάλλοντος ${name}. Δες το .env.example.`,
    );
  }
  return value;
}

export const appwriteConfig = {
  endpoint: required("NEXT_PUBLIC_APPWRITE_ENDPOINT"),
  projectId: required("NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
  /** Server-only. Δεν πρέπει ποτέ να φτάσει στον browser. */
  apiKey: required("APPWRITE_API_KEY"),
  databaseId: required("APPWRITE_DATABASE_ID"),
  tables: {
    nodes: process.env.APPWRITE_TABLE_NODES ?? "nodes",
    student: "student",
    sectionStudents: "sectionCrossRefStudents",
    active: "active",
  },
} as const;

/** Όνομα του cookie όπου κρατάμε το session secret του Appwrite. */
export const SESSION_COOKIE = "mpl_session";
