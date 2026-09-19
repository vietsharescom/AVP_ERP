"use client";

// FID-ERP-011 — chọn trạm + nhập mật khẩu chung (KHÔNG phải tài khoản cá
// nhân). Đăng nhập xong → về trang chủ.
import { useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../../components/PageContainer";
import { tokens } from "../../lib/ui/tokens";

type Station = "OFFICE" | "FACTORY" | "ADMIN";

const STATION_LABELS: Record<Station, string> = {
  OFFICE: "Office (Máy 2)",
  FACTORY: "Xưởng (Máy 3)",
  ADMIN: "Admin — Giám đốc/Quản lý (Máy 4)",
};

export default function LoginPage() {
  const router = useRouter();
  const [station, setStation] = useState<Station>("OFFICE");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ station, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Đăng nhập thất bại.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer maxWidth={360} style={{ margin: "80px auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>🔒 Đăng nhập AVP_ERP</h1>
      {error && <p style={{ color: tokens.color.danger }}>{error}</p>}
      <label style={{ display: "block", marginBottom: 12 }}>
        Trạm
        <select value={station} onChange={(e) => setStation(e.target.value as Station)} style={{ display: "block", width: "100%" }}>
          {(Object.keys(STATION_LABELS) as Station[]).map((s) => (
            <option key={s} value={s}>
              {STATION_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "block", marginBottom: 16 }}>
        Mật khẩu trạm
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ display: "block", width: "100%" }}
        />
      </label>
      <button
        onClick={submit}
        disabled={loading || password === ""}
        style={{
          padding: "8px 16px",
          background: loading || password === "" ? "#9ca3af" : tokens.color.accent,
          color: tokens.color.accentText,
          border: "none",
          borderRadius: 6,
          cursor: loading || password === "" ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </PageContainer>
  );
}
