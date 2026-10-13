export const RECOVERY_CONFIRMATION = "Se houver uma conta com este email, você receberá um link para redefinir a senha. Confira também a pasta de spam.";
const messages = {
  missing_link: "Abra o link recebido por email para definir uma nova senha. Se precisar, solicite outro link.",
  expired_link: "Este link expirou. Solicite um novo link de recuperação.",
  invalid_link: "Não foi possível validar este link. Solicite um novo link de recuperação.",
  validation_failed: "Não foi possível verificar o link agora. Confira sua conexão e tente novamente.",
  request_failed: "Não foi possível solicitar o link agora. Confira sua conexão e tente novamente em alguns minutos.",
  update_failed: "Não foi possível alterar a senha. Tente outra senha e confira sua conexão. Se o problema continuar, solicite um novo link.",
  invalid_email: "Informe um email válido.",
  short_password: "Use uma senha com pelo menos 6 caracteres.",
  password_mismatch: "As senhas precisam ser iguais.",
  busy: "Aguarde a tentativa em andamento.",
  cancelled: "Recuperação cancelada.",
};
const failure = code => ({ ok: false, code, message: messages[code] });

// Capture before the existing OAuth handler clears the hash. Never read a stored login.
export function parseRecoveryLink(href, now = Date.now()) {
  const url = new URL(href, "https://recovery.invalid");
  const hash = new URLSearchParams(url.hash.slice(1));
  const isRecovery = hash.get("type") === "recovery" || url.searchParams.get("recovery") === "1";
  if (!isRecovery) return null;
  const code = hash.get("error_code") || url.searchParams.get("error_code");
  const error = hash.get("error") || url.searchParams.get("error");
  if (error || code) return { error: code === "otp_expired" ? "expired_link" : "invalid_link" };
  if (hash.get("type") !== "recovery" || !hash.get("access_token")) return { error: "missing_link" };
  const expiresAt = Number(hash.get("expires_at"));
  const expiresIn = Number(hash.get("expires_in"));
  const expiry = expiresAt > 0 ? expiresAt * 1000 : hash.has("expires_in") && Number.isFinite(expiresIn) ? now + expiresIn * 1000 : null;
  return { accessToken: hash.get("access_token"), expiresAt: expiry, ...(expiry !== null && expiry <= now ? { error: "expired_link" } : {}) };
}

function linkError(error) {
  if (error?.code === "otp_expired" || error?.code === "session_expired") return "expired_link";
  if ([401, 403].includes(error?.status) || ["bad_jwt", "session_not_found"].includes(error?.code)) return "invalid_link";
  return null;
}

export function createPasswordRecovery({ request, recoveryLink = null, redirectTo, now = Date.now }) {
  let pending = false;
  let completed = null;
  let cancelled = false;
  let validationPromise = null;
  const abort = new AbortController();
  // Copy only link credentials, retaining them in memory for this screen's lifetime.
  const link = recoveryLink ? { ...recoveryLink } : null;
  const localLinkError = () => cancelled ? "cancelled" : link?.error || (!link?.accessToken ? "missing_link" : link.expiresAt != null && link.expiresAt <= now() ? "expired_link" : null);
  async function validate() {
    const invalid = localLinkError();
    if (invalid) return failure(invalid);
    try {
      const user = await request("/auth/v1/user", { method: "GET", headers: { Authorization: `Bearer ${link.accessToken}` }, signal: abort.signal });
      if (cancelled) return failure("cancelled");
      return user?.id ? { ok: true, code: "valid" } : failure("invalid_link");
    } catch (error) {
      return failure(cancelled ? "cancelled" : linkError(error) || "validation_failed");
    }
  }
  async function run(operation) {
    if (cancelled) return failure("cancelled");
    if (completed) return completed;
    if (pending) return failure("busy");
    pending = true;
    try { return await operation(); } finally { pending = false; }
  }
  return {
    validateLink() {
      if (!validationPromise) validationPromise = validate().finally(() => { validationPromise = null; });
      return validationPromise;
    },
    requestLink(email) {
      return run(async () => {
        const trimmed = String(email || "").trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return failure("invalid_email");
        try {
          const query = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : "";
          await request(`/auth/v1/recover${query}`, { method: "POST", body: JSON.stringify({ email: trimmed }), signal: abort.signal });
          if (cancelled) return failure("cancelled");
          completed = { ok: true, code: "sent", message: RECOVERY_CONFIRMATION };
          return completed;
        } catch { return failure(cancelled ? "cancelled" : "request_failed"); }
      });
    },
    updatePassword(password, confirmation) {
      return run(async () => {
        if (typeof password !== "string" || password.length < 6) return failure("short_password");
        if (password !== confirmation) return failure("password_mismatch");
        const checked = await validate();
        if (!checked.ok) return checked;
        const invalid = localLinkError();
        if (invalid) return failure(invalid);
        try {
          await request("/auth/v1/user", { method: "PUT", headers: { Authorization: `Bearer ${link.accessToken}` }, body: JSON.stringify({ password }), signal: abort.signal });
          if (cancelled) return failure("cancelled");
          completed = { ok: true, code: "updated", message: "Senha alterada. Volte ao login e entre com sua nova senha." };
          return completed;
        } catch (error) { return failure(cancelled ? "cancelled" : linkError(error) || "update_failed"); }
      });
    },
    cancel() { cancelled = true; abort.abort(); },
  };
}
