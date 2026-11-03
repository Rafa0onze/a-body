// Leitor mínimo de .zip (sem dependências): lê o diretório central e descompacta com DecompressionStream.
export async function lerZip(buffer) {
  const v = new DataView(buffer), u8 = new Uint8Array(buffer);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Arquivo .zip inválido.");
  const total = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder(), itens = [];
  for (let n = 0; n < total; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("Diretório do zip corrompido.");
    const metodo = v.getUint16(p + 10, true), tam = v.getUint32(p + 20, true);
    const nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true);
    const off = v.getUint32(p + 42, true);
    const nome = dec.decode(u8.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + el + cl;
    if (nome.endsWith("/")) continue;
    itens.push({ nome, metodo, tam, off });
  }
  const ler = async (it) => {
    const nl = v.getUint16(it.off + 26, true), el = v.getUint16(it.off + 28, true);
    const ini = it.off + 30 + nl + el, dados = u8.subarray(ini, ini + it.tam);
    if (it.metodo === 0) return dados.slice().buffer;
    if (it.metodo !== 8) throw new Error("Compressão não suportada: " + it.metodo);
    const s = new Blob([dados]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return await new Response(s).arrayBuffer();
  };
  return { itens, ler };
}
