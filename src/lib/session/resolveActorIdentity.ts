import { getStoredGuestKey } from "@/lib/session/guestSession";
import { getStoredUserId } from "@/lib/session/userSession";

export type ActorIdentitySource = "legacyUser" | "guest" | "none";

export type ActorIdentity = {
  actorKey: string;
  source: ActorIdentitySource;
};

function normalizeSessionValue(value: string | null): string {
  return (value ?? "").trim();
}

export function resolveActorIdentity(): ActorIdentity {
  const userId = normalizeSessionValue(getStoredUserId());
  if (userId) {
    return {
      actorKey: `u:${userId}`,
      source: "legacyUser",
    };
  }

  const guestKey = normalizeSessionValue(getStoredGuestKey());
  if (guestKey) {
    return {
      actorKey: `g:${guestKey}`,
      source: "guest",
    };
  }

  return {
    actorKey: "",
    source: "none",
  };
}

export function resolveActorKeyForWrite(userId: string): string {
  const resolved = resolveActorIdentity().actorKey;
  if (resolved) {
    return resolved;
  }

  const normalizedUserId = normalizeSessionValue(userId);
  if (normalizedUserId) {
    return `u:${normalizedUserId}`;
  }

  return "";
}
