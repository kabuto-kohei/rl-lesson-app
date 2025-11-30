// src/app/user/layout.tsx
import "../globals.css"; // これも本当は root layout だけでいいけど、そのままでも動く？
import AuthGuard from "./AuthGuard";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
