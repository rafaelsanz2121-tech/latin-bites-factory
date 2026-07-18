/**
 * Traduce errores de Supabase Auth a mensajes en español, amigables
 * para el operario de planta. Nunca mostramos el mensaje técnico crudo.
 */
export function translateAuthError(message?: string | null): string {
  const msg = (message || "").toLowerCase()

  if (msg.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos."
  }
  if (msg.includes("email not confirmed")) {
    return "Tu email aún no está confirmado. Revisa tu bandeja de entrada."
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Ya existe una cuenta con ese email. Inicia sesión."
  }
  if (msg.includes("password should be at least")) {
    return "La contraseña debe tener al menos 8 caracteres."
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Demasiados intentos. Espera un momento y vuelve a intentar."
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo."
  }
  if (msg.includes("invalid email")) {
    return "El email no tiene un formato válido."
  }
  if (msg.includes("expired") || msg.includes("invalid token")) {
    return "El enlace expiró o no es válido. Solicita uno nuevo."
  }

  return "Algo salió mal. Intenta de nuevo."
}
