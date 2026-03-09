const GUEST_SESSION_KEY = "guestKey";

export function getStoredGuestKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(GUEST_SESSION_KEY);
}
