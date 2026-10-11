import { flattenTree, indented } from "@/components/admin/node-options";
import { NativeSelect } from "@/components/ui/native-select";
import { QuestionList } from "@/components/admin/question-list";
import { listQuestions, requireAdmin } from "@/lib/admin";
import { getNodeTree } from "@/lib/data";
import { LEVEL_LABELS, LEVELS, type Level } from "@/lib/types";

export const metadata = { title: "Ερωτήσεις quiz · Διαχείριση" };

export default async function AdminQuestionsPage({
  searchParams,
}: PageProps<"/admin/questions">) {
  const user = await requireAdmin();
  const params = await searchParams;

  const level: Level = LEVELS.includes(params.level as Level)
    ? (params.level as Level)
    : (user.level ?? LEVELS[0]);
  const options = flattenTree(await getNodeTree(level));
  const nodeId =
    typeof params.node === "string" && options.some((o) => o.id === params.node)
      ? params.node
      : undefined;
  const questions = nodeId ? await listQuestions(nodeId) : [];

  return (
    <div className="flex flex-col gap-4">
      <form
        method="get"
        className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-end"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Τάξη</span>
          <NativeSelect
            name="level"
            defaultValue={level}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Παράγραφος</span>
          <NativeSelect
            name="node"
            defaultValue={nodeId ?? ""}
          >
            <option value="">— Διάλεξε παράγραφο —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {indented(o)}
              </option>
            ))}
          </NativeSelect>
        </label>
        <button
          type="submit"
          className="h-8 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Προβολή
        </button>
      </form>
      <p className="-mt-2 text-xs text-muted-foreground">
        Αν αλλάξεις τάξη, πάτα «Προβολή» για να ενημερωθεί η λίστα παραγράφων.
      </p>

      {nodeId ? (
        <>
          <h2 className="font-semibold">
            {options.find((o) => o.id === nodeId)?.label}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              · {questions.length} ερωτήσεις · <code>{nodeId}</code>
            </span>
          </h2>
          <QuestionList key={nodeId} idChapter={nodeId} questions={questions} />
        </>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Διάλεξε τάξη και παράγραφο για να δεις και να γράψεις ερωτήσεις.
        </div>
      )}
    </div>
  );
}
