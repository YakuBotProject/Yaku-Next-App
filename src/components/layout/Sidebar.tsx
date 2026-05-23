'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'

import {
  LayoutDashboard,
  BarChart3,
  Bell,
  Settings,
  Brain,
  User,
  LogOut
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()

  const [openProfile, setOpenProfile] = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setOpenProfile(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const iconStyle: React.CSSProperties = {
    width: '22px',
    height: '22px'
  }

  return (
    <aside
      style={{
        width: '82px',
        height: 'calc(100vh - 24px)',
        position: 'fixed',
        top: '12px',
        left: '16px',
        background: '#07111d',
        border: '1px solid #1e293b',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '18px 0',
        zIndex: 100,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* LOGO */}
      <div
        style={{
          width: '48px',
          height: '48px',
          background: 'white',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          fontSize: '1.3rem'
        }}
      >
        🌱
      </div>

      {/* MENU */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <SidebarButton
          href="/dashboard"
          active={pathname === '/dashboard'}
          icon={<LayoutDashboard style={iconStyle} />}
        />

        <SidebarButton
          href="/analytics"
          active={pathname === '/analytics'}
          icon={<BarChart3 style={iconStyle} />}
        />

        <SidebarButton
          href="/alerts"
          active={pathname === '/alerts'}
          icon={<Bell style={iconStyle} />}
        />

        <SidebarButton
          href="/settings"
          active={pathname === '/settings'}
          icon={<Settings style={iconStyle} />}
        />

        <SidebarButton
          href="/ai"
          active={pathname === '/ai'}
          icon={<Brain style={iconStyle} />}
        />
      </div>

      {/* PROFILE */}
      <div
        ref={profileRef}
        style={{
          marginTop: 'auto',
          position: 'relative'
        }}
      >
        <button
          onClick={() => setOpenProfile(!openProfile)}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: '#1e293b',
            border: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          <User size={20} />
        </button>

        {/* DROPDOWN */}
        {openProfile && (
          <div
            style={{
              position: 'absolute',
              bottom: '58px',
              left: '60px',
              width: '210px',
              background: '#081420',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '10px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.45)'
            }}
          >
            <button
              onClick={() =>
                signOut({
                  callbackUrl: '/auth/login'
                })
              }
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                padding: '12px 14px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'all .2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  'rgba(239,68,68,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

function SidebarButton({
  icon,
  active = false,
  href
}: {
  icon: React.ReactNode
  active?: boolean
  href: string
}) {
  return (
    <Link href={href}>
      <button
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '16px',
          border: active
            ? '1px solid rgba(34,197,94,0.3)'
            : '1px solid transparent',
          background: active
            ? 'rgba(34,197,94,0.12)'
            : 'transparent',
          color: active ? '#22c55e' : '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all .2s ease'
        }}
      >
        {icon}
      </button>
    </Link>
  )
}