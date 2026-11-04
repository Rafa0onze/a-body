import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Extrai só a função pura do App.jsx (o módulo inteiro depende do navegador).
const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const linha = src.match(/export const urlDoCatalogo = .*;/)[0].replace("export const", "const").replace("base = SUPA_URL", "base");
const urlDoCatalogo = new Function(`${linha}; return urlDoCatalogo;`)();

test("imagens do catálogo saem do Storage antigo e vão para o armazenamento do app", () => {
  assert.equal(urlDoCatalogo("https://zvmriqxigpwuggyhpoun.supabase.co/storage/v1/object/public/exercicios/a.webp", "/sb"), "/sb/storage/v1/object/public/exercicios/a.webp");
  assert.equal(urlDoCatalogo("/sb/storage/v1/object/public/exercicios/a.webp", "/sb"), "/sb/storage/v1/object/public/exercicios/a.webp");
});
