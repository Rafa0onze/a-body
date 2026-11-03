import { lerZip } from "./zip.js";
const $ = (id) => document.getElementById(id);
const log = (t) => { $("log").textContent += t + "\n"; $("log").scrollTop = 1e9; };
const TIPOS = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", pdf: "application/pdf" };
const BUCKETS = new Set(["fotos-corporais", "perfis", "documentos-saude", "exercicios"]);

async function usuario() {
  const r = await fetch("/sb/auth/v1/user");
  if (!r.ok) throw new Error("Sem acesso. Entre pelo Cloudflare Access e configure OWNER_ID/OWNER_EMAIL.");
  return r.json();
}

$("btnDados").onclick = async () => {
  try {
    const f = $("arqDados").files[0]; if (!f) return log("Escolha o arquivo abody-import.json.");
    const r = await fetch("/sb/admin/import", { method: "POST", headers: { "content-type": "application/json" }, body: await f.text() });
    const d = await r.json().catch(() => ({}));
    log(r.ok ? `Dados importados: ${d.user_data} registros e ${d.exercicios} exercícios.` : `Falha (${r.status}): ${d.message || ""}`);
  } catch (e) { log("Erro: " + e.message); }
};

$("btnFotos").onclick = async () => {
  try {
    const f = $("arqZip").files[0]; if (!f) return log("Escolha o arquivo .zip do Storage.");
    const eu = await usuario();
    const { itens, ler } = await lerZip(await f.arrayBuffer());
    const fila = itens.map((it) => { const p = it.nome.split("/"); return { it, bucket: p[1], path: p.slice(2).join("/") }; })
      .filter((x) => BUCKETS.has(x.bucket) && x.path && (x.bucket === "exercicios" || x.path.startsWith(eu.id + "/")));
    log(`${fila.length} arquivos para enviar (de ${itens.length} no zip; os de outras contas são ignorados).`);
    let ok = 0, falhas = 0, i = 0;
    const worker = async () => {
      while (i < fila.length) {
        const x = fila[i++];
        for (let t = 0; t < 3; t++) {
          try {
            const ext = x.path.split(".").pop().toLowerCase();
            const r = await fetch(`/sb/storage/v1/object/${x.bucket}/${x.path.split("/").map(encodeURIComponent).join("/")}`, {
              method: "POST", headers: { "content-type": TIPOS[ext] || "application/octet-stream", "x-upsert": "true" }, body: await ler(x.it) });
            if (r.ok) { ok++; break; }
            if (t === 2) { falhas++; log(`Falhou (${r.status}): ${x.bucket}/${x.path}`); }
          } catch (e) { if (t === 2) { falhas++; log(`Erro: ${x.path} ${e.message}`); } }
        }
        $("prog").textContent = `${ok + falhas}/${fila.length}`;
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    log(`Concluído: ${ok} enviados, ${falhas} falhas.`);
  } catch (e) { log("Erro: " + e.message); }
};
