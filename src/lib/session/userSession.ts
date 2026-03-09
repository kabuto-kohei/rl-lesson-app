const USER_SESSION_KEY = "userId";

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(USER_SESSION_KEY);
}

export function setStoredUserId(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USER_SESSION_KEY, userId);
}

export function clearStoredUserId(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(USER_SESSION_KEY);
}
