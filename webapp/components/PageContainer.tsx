// FID-ERP-014 — khung trang DÙNG CHUNG cho mọi trang (thay `<main
// style={{maxWidth:...}}>` tự viết riêng ở mỗi trang, xem tokens.ts).
// `maxWidth` override cho ca đặc biệt (vd /login hẹp hơn, căn giữa dọc)
// — mặc định dùng `tokens.maxWidth` cho các trang nghiệp vụ thường.
import styles from "./PageContainer.module.css";

type PageContainerProps = {
  children: React.ReactNode;
  maxWidth?: number;
  style?: React.CSSProperties;
};

export default function PageContainer({ children, maxWidth, style }: PageContainerProps) {
  return (
    <main className={styles.container} style={{ ...(maxWidth ? { maxWidth } : {}), ...style }}>
      {children}
    </main>
  );
}
