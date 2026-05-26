import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Key, ScrollText, BarChart3,
  ShieldAlert, LogOut, Activity, FlaskConical
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import styles from "./DashboardLayout.module.css";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Overview" },
  { to: "/keys", icon: Key, label: "API Keys" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/logs", icon: ScrollText, label: "Request Logs" },
  { to: "/test", icon: FlaskConical, label: "Test Panel" },
  { to: "/admin", icon: ShieldAlert, label: "Admin" },
];

export function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Activity size={20} className={styles.logoIcon} />
          <span>RateLock</span>
        </div>
        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ""}`
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userRole}>{user?.role}</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}