/**
 * Συντόμευση για το deploy του «chat-notify» (βλ. deploy-function.mjs).
 *   node --env-file=.env.local scripts/deploy-chat-notify.mjs
 */
process.argv[2] = "chat-notify";
await import("./deploy-function.mjs");
