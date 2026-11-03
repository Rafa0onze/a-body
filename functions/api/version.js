export const onRequestGet = ({ env }) => new Response(
  JSON.stringify({ version: env.CF_PAGES_COMMIT_SHA || "local" }),
  { headers: { "content-type": "application/json", "cache-control": "no-store" } });
