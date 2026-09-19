"use client";

// FID-ERP-014 §4a/4f — phần tương tác của NavBar (đăng xuất + thu gọn
// "☰" ở màn hình hẹp). Tách khỏi NavBar.tsx (Server Component) vì cần
// state/click — NavBar.tsx tính SẴN danh sách link đã lọc quyền, component
// này chỉ trình bày, không tự lọc gì thêm.
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Station } from "../lib/auth";
import type { NavGroup } from "../lib/ui/navLinks";
import { tokens } from "../lib/ui/tokens";
import styles from "./NavBarClient.module.css";

const STATION_LABELS: Record<Station, string> = {
  OFFICE: "Office",
  FACTORY: "Xưởng",
  ADMIN: "Admin",
};

export default function NavBarClient({ station, groups }: { station: Station; groups: NavGroup[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav
      className={styles.nav}
      style={{ borderBottom: `1px solid ${tokens.color.border}`, background: tokens.color.bg }}
    >
      <div className={styles.bar}>
        <button className={styles.toggle} onClick={() => setOpen((v) => !v)} aria-label="Menu">
          ☰
        </button>
        <div className={`${styles.groups} ${open ? styles.groupsOpen : ""}`}>
          {groups.map((g) => (
            <div key={g.title} className={styles.group}>
              <span className={styles.groupTitle}>{g.title}</span>
              {g.links.map((l) => (
                <a key={l.path} href={l.path} className={styles.link}>
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className={styles.account}>
          <span style={{ color: tokens.color.textMuted, fontSize: 13 }}>{STATION_LABELS[station]}</span>
          <button onClick={logout} className={styles.logout}>
            Đăng xuất
          </button>
        </div>
      </div>
    </nav>
  );
}
