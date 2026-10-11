import { NotificationsToggle } from "@/components/chat/push-ui";
import { Inbox, NewMessagePicker, TeacherThread } from "@/components/chat/teacher-chat";
import { getThread, listInbox, listMessageableStudents, markRead } from "@/lib/chat";

export const metadata = { title: "Μηνύματα · Διαχείριση" };

export default async function AdminMessagesPage({
  searchParams,
}: PageProps<"/admin/messages">) {
  const params = await searchParams;
  const selected = Number(params.student) || null;

  const [inbox, students] = await Promise.all([listInbox(), listMessageableStudents()]);
  const name =
    inbox.find((c) => c.idStudent === selected)?.name ??
    students.find((s) => s.idStudent === selected)?.name ??
    null;

  const initial = selected && name ? await getThread(selected) : [];
  if (selected && name) {
    await markRead(selected, "teacher");
    // Το σήμα αδιάβαστων της λίστας να φαίνεται ήδη μηδενισμένο.
    const item = inbox.find((c) => c.idStudent === selected);
    if (item) item.unread = 0;
  }

  return (
    <div className="grid h-[calc(100svh-10rem)] min-h-96 gap-3 md:grid-cols-[18rem_1fr]">
      <aside
        className={`flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card ${
          selected ? "hidden md:flex" : ""
        }`}
      >
        <div className="flex flex-col gap-2 border-b p-2">
          <NewMessagePicker students={students} />
          <NotificationsToggle />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Inbox items={inbox} active={selected} />
        </div>
      </aside>

      <section className={`flex min-h-0 flex-col gap-2 ${selected ? "" : "hidden md:flex"}`}>
        {selected && name ? (
          <>
            <div className="flex items-center gap-2">
              <a href="/admin/messages" className="text-sm text-primary md:hidden">
                ← Εισερχόμενα
              </a>
              <h2 className="truncate font-semibold">{name}</h2>
            </div>
            <TeacherThread key={selected} idStudent={selected} name={name} initial={initial} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            {selected
              ? "Ο μαθητής δεν βρέθηκε ή δεν έχει ακόμα κωδικό."
              : "Διάλεξε μια συνομιλία ή στείλε νέο μήνυμα σε μαθητή."}
          </div>
        )}
      </section>
    </div>
  );
}
