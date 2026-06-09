// src/components/layout/Sidebar.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Bell,
  Settings,
  Brain,
  LogOut
} from 'lucide-react';

export default function Sidebar({ initials = "JR" }: { initials?: string }) {
  const pathname = usePathname();
  const [openProfile, setOpenProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setOpenProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-container {
          position: fixed;
          background: #07111d;
          border: 1px solid #1e293b;
          z-index: 100;
          display: flex;
          align-items: center;
          backdrop-filter: blur(12px);
        }

        /* --- MOBILE (Barra de Navegación Inferior) --- */
        @media (max-width: 767px) {
          .sidebar-container {
            bottom: 0;
            left: 0;
            width: 100%;
            height: 70px;
            flex-direction: row;
            justify-content: space-around;
            padding: 0 10px;
            border-radius: 24px 24px 0 0;
            border-bottom: none;
          }
          .sidebar-logo { display: none !important; }
          .sidebar-menu {
            flex-direction: row !important;
            gap: 8px !important;
          }
          .profile-wrapper { margin-top: 0 !important; }
          .dropdown-menu {
            bottom: 80px;
            right: 10px;
            left: auto !important;
          }
          /* Indicador activo arriba en móvil */
          .nav-item.active::before {
            content: '';
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            width: 24px;
            height: 4px;
            background-color: #22c55e;
            border-radius: 0 0 4px 4px;
          }
        }

        /* --- DESKTOP (Barra Lateral Izquierda) --- */
        @media (min-width: 768px) {
          .sidebar-container {
            top: 12px;
            left: 16px;
            width: 82px;
            height: calc(100vh - 24px);
            flex-direction: column;
            padding: 18px 0;
            border-radius: 24px;
          }
          .sidebar-menu {
            flex-direction: column !important;
            gap: 14px !important;
          }
          .profile-wrapper { margin-top: auto !important; }
          .dropdown-menu {
            bottom: 58px;
            left: 60px;
          }
          /* Indicador activo a la izquierda en PC */
          .nav-item.active::before {
            content: '';
            position: absolute;
            left: -16px;
            top: 50%;
            transform: translateY(-50%);
            height: 24px;
            width: 4px;
            background-color: #22c55e;
            border-radius: 0 4px 4px 0;
          }
        }

        /* --- ESTILOS DE LOS BOTONES --- */
        .nav-item {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all .2s ease;
          position: relative;
          text-decoration: none;
        }

        .nav-item:not(.active) {
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
        }

        .nav-item:not(.active):hover {
          background: rgba(255,255,255,0.05);
          color: #cbd5e1;
        }

        .nav-item.active {
          border: 1px solid rgba(34,197,94,0.3);
          background: rgba(34,197,94,0.12);
          color: #22c55e;
        }
      `}} />

      <aside className="sidebar-container">
        {/* LOGO (Se oculta en móvil) */}
        <div className="sidebar-logo" style={{
          width: '48px', height: '48px', background: 'white', borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px', fontSize: '1.3rem'
        }}>
          🌱
        </div>

        {/* MENÚ DE NAVEGACIÓN */}
        <div className="sidebar-menu" style={{ display: 'flex' }}>
          <SidebarButton href="/dashboard" active={pathname === '/dashboard'} icon={<LayoutDashboard size={22} />} />
          <SidebarButton href="/dashboard/historico" active={pathname?.includes('/historico')} icon={<BarChart3 size={22} />} />
          <SidebarButton href="/dashboard/alertas" active={pathname?.includes('/alertas')} icon={<Bell size={22} />} />
          <SidebarButton href="/dashboard/control" active={pathname?.includes('/control')} icon={<Settings size={22} />} />
          <SidebarButton href="/dashboard/ml" active={pathname?.includes('/ml')} icon={<Brain size={22} />} />
        </div>

        {/* PERFIL Y CERRAR SESIÓN */}
        <div ref={profileRef} className="profile-wrapper" style={{ position: 'relative' }}>
          <button
            onClick={() => setOpenProfile(!openProfile)}
            style={{
              width: '46px', height: '46px', borderRadius: '50%', background: '#1e293b',
              border: '1px solid #334155', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#94a3b8', cursor: 'pointer',
              fontWeight: 'bold', fontSize: '14px'
            }}
          >
            {initials}
          </button>

          {/* DROPDOWN FLOTANTE */}
          {openProfile && (
            <div className="dropdown-menu" style={{
              position: 'absolute', width: '210px', background: '#081420',
              border: '1px solid #1e293b', borderRadius: '16px', padding: '10px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.45)'
            }}>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                style={{
                  width: '100%', background: 'transparent', border: 'none', color: '#ef4444',
                  padding: '12px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center',
                  gap: '10px', cursor: 'pointer', fontSize: '0.95rem', transition: 'all .2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function SidebarButton({ icon, active = false, href }: { icon: React.ReactNode, active?: boolean, href: string }) {
  return (
    <Link href={href} className={`nav-item ${active ? 'active' : ''}`}>
      {icon}
    </Link>
  );
}