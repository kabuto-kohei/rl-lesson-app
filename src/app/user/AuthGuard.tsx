'use client';

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import FooterNav from "@/app/component/FooterNav/FooterNav";

const AUTH_PAGES = ["/user/login", "/user/register"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isAuthPage = AUTH_PAGES.includes(pathname);
    if (isAuthPage) {
      setReady(true);
      return;
    }

    const savedUserId = localStorage.getItem("userId");
    if (!savedUserId) {
      router.replace("/user/login");
      return;
    }

    if (pathname.startsWith("/user/")) {
      const segs = pathname.split("/");
      const urlUserId = segs[2];
      if (urlUserId && urlUserId !== savedUserId) {
        router.replace(`/user/${savedUserId}/home`);
        return;
      }
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        読み込み中...
      </div>
    );
  }

  const hideFooter = AUTH_PAGES.includes(pathname);

  return (
    <>
      {children}
      {!hideFooter && <FooterNav />}
    </>
  );
}
