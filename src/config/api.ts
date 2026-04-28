const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env;

export const barTrackerApiBaseUrl =
  runtimeEnv?.EXPO_PUBLIC_BAR_TRACKER_API_BASE_URL?.replace(/\/$/, '') ?? 'http://10.0.2.2:10000';
