/**
 * Καθαροί τύποι & σταθερές, χωρίς εξαρτήσεις από server code.
 * Επιτρέπεται να τα κάνει import και client component.
 */

/**
 * Οι τάξεις: Γυμνάσιο (G*), Λύκειο νέο (L*), Λύκειο παλιό πρόγραμμα (L*O).
 * Το `LEVELS` είναι η μοναδική πηγή αλήθειας — πρόσθεσε/αφαίρεσε εδώ.
 */
export const LEVELS = [
  "GA",
  "GB",
  "GC",
  "LA",
  "LB",
  "LC",
  "LBO",
  "LCO",
] as const;

export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  GA: "Α΄ Γυμνασίου",
  GB: "Β΄ Γυμνασίου",
  GC: "Γ΄ Γυμνασίου",
  LA: "Α΄ Λυκείου",
  LB: "Β΄ Λυκείου",
  LC: "Γ΄ Λυκείου",
  LBO: "Β΄ Λυκείου (παλιό)",
  LCO: "Γ΄ Λυκείου (παλιό)",
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  /**
   * Η τάξη που βλέπει ο χρήστης: για μαθητή από το user label (null αν δεν έχει
   * οριστεί)· για admin η τάξη που διάλεξε στο sidebar (cookie).
   */
  level: Level | null;
  labels: string[];
  /** Label `admin` στο Appwrite: πρόσβαση σε όλες τις τάξεις και στο /admin. */
  isAdmin: boolean;
};

/**
 * Ένας κόμβος του δέντρου περιεχομένου: κεφάλαιο, ενότητα ή υποενότητα —
 * όλα ίδιας μορφής. `parentId` null σημαίνει κεφάλαιο (ρίζα).
 */
export type ContentNode = {
  id: string;
  level: Level;
  parentId: string | null;
  name: string;
  title: string;
  order: number;
};

/** Κόμβος με τα παιδιά του, όπως τον χτίζει το `getNodeTree`. `depth` 0 = κεφάλαιο. */
export type NodeTree = ContentNode & {
  depth: number;
  children: NodeTree[];
};
