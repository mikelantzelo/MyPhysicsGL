import { getStudentName } from "@/lib/admin";
import { getUser } from "@/lib/auth";
import { getNodeById } from "@/lib/data";
import { getReport } from "@/lib/lessons";
import { contentUrl } from "@/lib/presentations";

/**
 * Οι απαντήσεις ενός μαθητή όπως εμφανίζονται στην εκτύπωση (τελευταία αυτόματη
 * αποθήκευση ή εκτύπωση): το HTML που έστειλε το μάθημα, με `<base>` το site του μαθήματος (εικόνες, CSS).
 * Το περιεχόμενο έρχεται από τον browser του μαθητή, άρα σερβίρεται με CSP
 * `sandbox` (ξένο origin, χωρίς scripts, χωρίς cookies της εφαρμογής).
 * Ο καθηγητής το τυπώνει/αποθηκεύει σε PDF με Ctrl+P.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Μόνο CSS από το head (όχι meta/base/script). */
function safeHead(head: string) {
  const styles = head.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) ?? [];
  const links = (head.match(/<link\b[^>]*>/gi) ?? [])
    .map((l) => /\bhref="(https:\/\/[^"]+)"/i.exec(l)?.[1])
    .filter((href): href is string => !!href)
    .map((href) => `<link rel="stylesheet" href="${href}">`);
  return [...links, ...styles].join("\n");
}

/** Χωρίς tags που αλλάζουν τη σελίδα ή τη βάση των διευθύνσεων. */
const safeBody = (body: string) =>
  body.replace(/<\/?(?:script|meta|base|iframe|object|embed|form)\b[^>]*>/gi, "");

const CSP = [
  "sandbox",
  "default-src 'none'",
  "style-src 'unsafe-inline' https:",
  "img-src https: data: blob:",
  "font-src https: data:",
  "form-action 'none'",
].join("; ");

const BANNER_CSS = `
.mpl-banner{position:sticky;top:0;z-index:9999;display:flex;flex-wrap:wrap;gap:.25rem 1.5rem;align-items:baseline;
  padding:.6rem 1rem;background:#0f172a;color:#f8fafc;font:14px/1.4 system-ui,sans-serif}
.mpl-banner strong{font-size:15px}
.mpl-banner span{color:#cbd5e1}
@media print{.mpl-banner{display:none!important}}`;

export async function GET(request: Request) {
  const user = await getUser();
  if (!user?.isAdmin) return new Response("Not found", { status: 404 });

  const params = new URL(request.url).searchParams;
  const idStudent = Number(params.get("student"));
  const nodeId = params.get("node") ?? "";
  if (!Number.isInteger(idStudent) || !nodeId) {
    return new Response("Not found", { status: 404 });
  }

  const [report, node, name] = await Promise.all([
    getReport(idStudent, nodeId),
    getNodeById(nodeId),
    getStudentName(idStudent),
  ]);
  if (!report || !node) return new Response("Not found", { status: 404 });

  const lessonUrl = contentUrl("presentation", node);
  const sent = new Date(report.reportAt).toLocaleString("el-GR", {
    timeZone: "Europe/Athens",
    dateStyle: "full",
    timeStyle: "short",
  });
  const title = `${name ?? `#${idStudent}`} · ${node.name} ${node.title}`;
  const banner =
    `<div class="mpl-banner"><strong>${esc(name ?? `Μαθητής #${idStudent}`)}</strong>` +
    `<span>${esc(`${node.name} ${node.title}`)}</span><span>Τελευταία αποθήκευση: ${esc(sent)}</span>` +
    `<span>Ctrl+P για εκτύπωση / PDF</span></div>`;

  // Το banner μπαίνει αμέσως μετά το άνοιγμα του <body>.
  const body = safeBody(report.body).replace(/^(\s*<body\b[^>]*>)/i, `$1${banner}`);

  const html = `<!doctype html>
<html lang="el" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${lessonUrl ? `<base href="${esc(lessonUrl)}">` : ""}
<title>${esc(title)}</title>
${safeHead(report.head)}
<style>${BANNER_CSS}</style>
</head>
${body.startsWith("<body") ? body : `<body>${banner}${body}</body>`}
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
