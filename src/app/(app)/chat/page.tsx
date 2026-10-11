import { redirect } from "next/navigation";
import { MessageSquareIcon } from "lucide-react";

import { fetchMyMessages, sendMyMessage } from "@/app/chat-actions";
import { ChatThread } from "@/components/chat/chat-thread";
import { getUser } from "@/lib/auth";
import { getThread, markRead } from "@/lib/chat";
import { getStudentId } from "@/lib/data";

export const metadata = { title: "Συνομιλία με τον καθηγητή" };

export default async function ChatPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.isAdmin) redirect("/admin/messages");

  const idStudent = await getStudentId(user.id);
  if (idStudent == null) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-muted-foreground">
        Ο λογαριασμός σου δεν είναι συνδεδεμένος με μαθητή. Μίλησε με τον καθηγητή σου.
      </div>
    );
  }

  const initial = await getThread(idStudent);
  await markRead(idStudent, "student");

  return (
    <div className="flex h-[calc(100svh-5.5rem)] min-h-80 flex-col gap-2">
      <h1 className="flex items-center gap-2 text-base font-semibold sm:text-lg">
        <MessageSquareIcon className="size-5 text-primary" />
        Συνομιλία με τον καθηγητή
      </h1>
      <ChatThread
        me="student"
        otherName="τον καθηγητή"
        initial={initial}
        load={fetchMyMessages}
        send={sendMyMessage}
      />
    </div>
  );
}
