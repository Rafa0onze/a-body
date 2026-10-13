import React, { useEffect, useRef, useState } from "react";
import { createPasswordRecovery } from "./password-recovery.js";
import "./password-recovery.css";

// Mount with a new key when changing between request and update modes.
export default function PasswordRecovery({ request, recoveryLink = null, redirectTo, initialEmail = "", onCancel, onRequestNewLink }) {
  const [controller] = useState(() => createPasswordRecovery({ request, recoveryLink, redirectTo }));
  const updateMode = recoveryLink !== null;
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(updateMode);
  const [busy, setBusy] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    if (updateMode) controller.validateLink().then(result => {
      if (!active) return;
      setChecking(false);
      setValidLink(result.ok);
      setStatus(result.ok ? null : result);
    });
    return () => { active = false; mounted.current = false; queueMicrotask(()=>{if(!mounted.current)controller.cancel();}); };
  }, [controller, updateMode]);
  const done = status?.ok;
  async function submit(event) {
    event.preventDefault();
    if (busy || checking || done) return;
    setBusy(true);
    setStatus(null);
    const result = updateMode ? await controller.updatePassword(password, confirmation) : await controller.requestLink(email);
    if (!mounted.current) return;
    setBusy(false);
    setStatus(result);
    if (["missing_link", "expired_link", "invalid_link"].includes(result.code)) setValidLink(false);
    if (result.code === "updated") { setPassword(""); setConfirmation(""); }
  }
  async function retryValidation() {
    setChecking(true);
    setStatus(null);
    const result = await controller.validateLink();
    if (!mounted.current) return;
    setChecking(false);
    setValidLink(result.ok);
    setStatus(result.ok ? null : result);
  }
  function leave(callback) { controller.cancel(); callback?.(); }
  return <section className="ab-auth-panel ab-recovery" aria-labelledby="recovery-title">
    <span className="ab-kicker">A-BODY · ACESSO</span>
    <h1 id="recovery-title">{updateMode ? "Definir nova senha" : "Recuperar senha"}</h1>
    <p className="ab-copy">{updateMode ? "Escolha uma nova senha para sua conta." : "Informe o email usado na sua conta para receber o link de recuperação."}</p>
    <form onSubmit={submit} aria-busy={busy || checking}>
      {!updateMode && <>
        <label className="ab-label" htmlFor="recovery-email">EMAIL</label>
        <input id="recovery-email" className="ab-input" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={busy || done} aria-describedby="recovery-status" />
      </>}
      {updateMode && validLink && !done && <>
        <label className="ab-label" htmlFor="recovery-password">NOVA SENHA</label>
        <input id="recovery-password" className="ab-input" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} aria-describedby="recovery-password-help recovery-status" />
        <p id="recovery-password-help" className="ab-recovery-help">Use pelo menos 6 caracteres.</p>
        <label className="ab-label" htmlFor="recovery-confirmation">CONFIRMAR NOVA SENHA</label>
        <input id="recovery-confirmation" className="ab-input" type="password" autoComplete="new-password" minLength={6} required value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} aria-describedby="recovery-status" />
      </>}
      <p id="recovery-status" className="ab-recovery-status" role="status" aria-live="polite" aria-atomic="true" data-error={status?.ok === false}>{checking ? "Verificando seu link…" : status?.message || ""}</p>
      {!done && (!updateMode || validLink) && <button className="ab-primary" type="submit" disabled={busy || checking}>{busy ? (updateMode ? "Alterando senha…" : "Solicitando link…") : (updateMode ? "Salvar nova senha" : "Enviar link de recuperação")}</button>}
    </form>
    {updateMode && !validLink && !checking && status?.code === "validation_failed" && <button className="ab-primary" type="button" onClick={retryValidation}>Verificar link novamente</button>}
    {updateMode && !validLink && !checking && onRequestNewLink && <button className="ab-link" type="button" onClick={() => leave(onRequestNewLink)}>Solicitar novo link</button>}
    <button className="ab-link" type="button" onClick={() => leave(onCancel)}>{done ? "Voltar ao login" : "Cancelar e voltar ao login"}</button>
  </section>;
}
