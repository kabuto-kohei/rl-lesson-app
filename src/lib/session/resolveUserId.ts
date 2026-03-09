import { getStoredUserId } from "@/lib/session/userSession";

function normalizeUserId(rawUserId: unknown): string {
  if (typeof rawUserId === "string") {
    return rawUserId;
  }

  if (Array.isArray(rawUserId) && typeof rawUserId[0] === "string") {
    return rawUserId[0];
  }

  return "";
}

export function resolveUserId(rawUserId: unknown): string {
  const userIdFromUrl = normalizeUserId(rawUserId);
  if (userIdFromUrl) {
    return userIdFromUrl;
  }

  const userIdFromSession = getStoredUserId();
  if (userIdFromSession) {
    return userIdFromSession;
  }

  return "";
}
