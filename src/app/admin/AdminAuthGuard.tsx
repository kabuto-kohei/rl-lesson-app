'use client';
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminFooterNav from "@/app/component/AdminFooterNav/AdminFooterNav";

const HIDE_FOOTER_PAGES = ["/admin/select"];

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isHideFooter = HIDE_FOOTER_PAGES.includes(pathname);
    const adminTeacherId = localStorage.getItem("adminTeacherId"); // ✅ 修正！

    // 未ログインなら /admin/select に戻す
    if (!adminTeacherId && !isHideFooter) {
      router.replace("/admin/select");
      return;
    }

    // ログイン済みなら表示OK
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        読み込み中...
      </div>
    );
  }

  const hideFooter = HIDE_FOOTER_PAGES.includes(pathname);

  return (
    <>
      {children}
      {!hideFooter && <AdminFooterNav />}
    </>
  );
}
