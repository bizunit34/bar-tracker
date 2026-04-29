export function logSafeError(context: string, error: unknown): void {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = rawMessage
    .replace(
      /("?(?:managementToken|token|notes|publicNotes|privateNotes)"?\s*[:=]\s*)"[^"]+"/gi,
      '$1"[redacted]"',
    )
    .replace(/(managementToken|token)=([^&\s]+)/gi, '$1=[redacted]');

  console.error(`${context}: ${message}`);
}
