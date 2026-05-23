// src/app/dashboard/page.tsx

import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import Sidebar from '@/components/layout/Sidebar'

export const metadata = {
  title: 'Dashboard - Yaku',
  description: 'Panel de control de Yaku'
}

async function obtenerRiegosDelDia(id_cultivo: number) {
  try {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    const riegos = await prisma.riego.findMany({
      where: {
        id_cultivo,
        fecha_hora: {
          gte: hoy
        }
      },
      orderBy: { fecha_hora: 'desc' }
    })
    return riegos
  } catch (error) {
    console.error('Error obteniendo riegos:', error)
    return []
  }
}

async function calcularTiempoTranscurrido(ultimo_riego_fecha_hora: Date) {
  try {
    const hoy = new Date()
    const tiempo_transcurrido = hoy.getTime() - ultimo_riego_fecha_hora.getTime();
    return tiempo_transcurrido;
  } catch (error) {
    console.error('Error obteniendo tiempo transcurrido desde el ultimo riego:', error)
    return []
  }
}

async function obtenerLecturasUltimas6Horas(id_sensor: number) {
  try {
    const hace6Horas = new Date(Date.now() - 6 * 60 * 60 * 1000)
    hace6Horas.setUTCHours(hace6Horas.getUTCHours() - 6);
    
    const lecturas = await prisma.lecturas_sensor.findMany({
      where: {
        id_sensor,
        fecha_hora: {
          gte: hace6Horas
        }
      },
      orderBy: { fecha_hora: 'asc' },
      take: 100
    })
    return lecturas
  } catch (error) {
    console.error('Error obteniendo lecturas:', error)
    return []
  }
}

async function obtenerUltimaLectura(id_sensor: number) {
  try {
    const lectura = await prisma.lecturas_sensor.findFirst({
      where: { id_sensor },
      orderBy: { fecha_hora: 'desc' }
    })
    return lectura
  } catch (error) {
    console.error('Error obteniendo lectura:', error)
    return null
  }
}

async function obtenerPromedioHoy(
  id_sensor: number,
  id_cultivo: number
) {
  try {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
   

    const lecturas = await prisma.lecturas_sensor.findMany({
      where: {
        id_sensor,
        id_cultivo,
        fecha_hora: { gte: hoy }
      },
      select: { valor: true }
    })
    if (lecturas.length === 0) return null

    const suma = lecturas.reduce(
      (acc, l) => acc + parseFloat(l.valor?.toString() ?? '0'),
      0
    )
    return parseFloat((suma / lecturas.length).toFixed(1))
  } catch (error) {
    console.error('Error calculando promedio:', error)
    return null
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  const ID_CULTIVO = 1
  const cultivo = await prisma.cultivos.findUnique({
    where: { id_cultivo: ID_CULTIVO },
    include: { plantas: true, usuarios: true }
  })

  if (!cultivo) {
    return (
      <div style={{ padding: '20px', color: 'white' }}>
        <h1>Cultivo no encontrado</h1>
      </div>
    )
  }

  const lecturaHumedadSuelo = await obtenerUltimaLectura(1)
  const lecturaHumedadAmbiental = await obtenerUltimaLectura(2)
  const lecturaTempAmbiental = await obtenerUltimaLectura(3)
  const lecturaTempSuelo = await obtenerUltimaLectura(4)

  const lecturasGrafico = await obtenerLecturasUltimas6Horas(1)
  const dispositivos = await prisma.dispositivos.findMany({
    take: 10,
    orderBy: { id_dispositivo: 'asc' }
  })
  const riegosDelDia = await obtenerRiegosDelDia(ID_CULTIVO)

  const litrosConsumidos = (riegosDelDia.length * 0.25).toFixed(2)
  const ultimoRiego = riegosDelDia.length > 0 ? riegosDelDia[0] : null

  // 1. Agregamos el await aquí
  const milisegundosTranscurridos = ultimoRiego 
    ? await calcularTiempoTranscurrido(ultimoRiego.fecha_hora)
    : null

  // 2. Convertimos el número (milisegundos) o el array vacío en un string legible
  let tiempoDesdeUltimoRiego = 'Sin riegos'
  if (typeof milisegundosTranscurridos === 'number') {
    const minutos = Math.floor(milisegundosTranscurridos / (1000 * 60))
    
    if (minutos < 1) {
      tiempoDesdeUltimoRiego = 'Hace unos instantes'
    } else if (minutos < 60) {
      tiempoDesdeUltimoRiego = `Hace ${minutos} min`
    } else {
      const horas = Math.floor(minutos / 60)
      tiempoDesdeUltimoRiego = `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`
    }
  }

  const promHumSuelo      = await obtenerPromedioHoy(1, ID_CULTIVO)
  const promHumAmbiental  = await obtenerPromedioHoy(2, ID_CULTIVO)

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#020817',
        color: 'white',
        display: 'flex',
        padding: '12px',
        paddingLeft: '100px',
      }}
    >
      {/* SIDEBAR */}
      <Sidebar />

      {/* CONTENT */}
      <div
        style={{
          flex: 1,
          marginLeft: '16px',
          border: '1px solid #1e293b',
          borderRadius: '24px',
          overflow: 'hidden',
          background: '#07111d'
        }}
      >
        {/* TOPBAR */}
        <div
          style={{
            height: '82px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px'
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '1.8rem',
                fontWeight: 700,
                marginBottom: '4px'
              }}
            >
              Dashboard
            </h1>

            <p
              style={{
                color: '#64748b',
                fontSize: '0.95rem'
              }}
            >
              {cultivo.nombre} — {cultivo.plantas?.nombre} · {cultivo.etapa}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#22c55e',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              ● En vivo
            </div>

            <div
              style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                color: '#38bdf8',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              ⟳ 3s
            </div>

            <button
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                color: 'white',
                padding: '10px 18px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div
          style={{
            padding: '20px'
          }}
        >
          {/* STATS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '18px'
            }}
          >
            <StatCard
              title="HUMEDAD DEL SUELO"
              value={lecturaHumedadSuelo ? `${Math.round(parseFloat(lecturaHumedadSuelo.valor?.toString() || '0'))}%` : 'N/A'}
              subtitle="objetivo: 60 - 80%"
              color="#22c55e"
            />

            <StatCard
              title="HUMEDAD AMBIENTAL"
              value={lecturaHumedadAmbiental ? `${Math.round(parseFloat(lecturaHumedadAmbiental.valor?.toString() || '0'))}%` : 'N/A'}
              subtitle="rango Lima: 75 - 95%"
              color="#22d3ee"
            />

            <StatCard
              title="TEMPERATURA AMBIENTAL"
              value={lecturaTempAmbiental ? `${parseFloat(lecturaTempAmbiental.valor?.toString() || '0').toFixed(1)}°C` : 'N/A'}
              subtitle="rango ideal: 18 - 29°C"
              color="#f59e0b"
            />

            <StatCard
              title="TEMPERATURA DEL SUELO"
              value={lecturaTempSuelo ? `${parseFloat(lecturaTempSuelo.valor?.toString() || '0').toFixed(1)}°C` : 'N/A'}
              subtitle="óptimo raíces: 18 - 24°C"
              color="#38bdf8"
            />
          </div>

          {/* MAIN GRID */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '18px'
            }}
          >
            {/* CHART */}
            <Card style={{ minHeight: '380px' }}>
              <h3 style={sectionTitle}>
                Humedad del suelo — últimas 6 horas
              </h3>

              {lecturasGrafico.length > 0 ? (
                <div
                  style= {{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '6px',
                    height: '300px',
                    marginTop: '20px',
                    padding: '10px 0'
                  }}
                >
                  {lecturasGrafico.map((dato, idx) => (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        background: '#22c55e',
                        height: `${(parseFloat(dato.valor?.toString() || '0') / 100) * 100}%`,
                        borderRadius: '4px',
                        opacity: 0.8,
                        transition: 'all 0.3s',
                        minHeight: '4px'
                      }}
                      title={`${new Date(dato.fecha_hora).toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}: ${dato.valor}%`}
                    />
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', marginTop: '20px' }}>
                  No hay datos disponibles
                </p>
              )}
            </Card>

            {/* RIGHT PANEL */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '18px'
              }}
            >
              <Card>
                <h3 style={sectionTitle}>Sistema</h3>

                {dispositivos.length > 0 ? (
                  dispositivos.map(dispositivo => (
                    <SystemRow
                      key={dispositivo.id_dispositivo}
                      name={dispositivo.nombre || `Dispositivo ${dispositivo.id_dispositivo}`}
                      status={dispositivo.estado || 'desconocido'}
                      warning={dispositivo.estado === 'error' || dispositivo.estado === 'inactivo'}
                    />
                  ))
                ) : (
                  <p style={{ color: '#64748b', marginTop: '10px' }}>Sin dispositivos</p>
                )}
              </Card>

              <Card>
                <h3 style={sectionTitle}>Estado</h3>

                <div style={{ marginTop: '14px' }}>
                  <div
                    style={{
                      background: 'rgba(34,197,94,0.12)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#22c55e',
                      fontSize: '0.85rem',
                      marginBottom: '8px'
                    }}
                  >
                    ✓ Sistema operativo
                  </div>

                  <div
                    style={{
                      background: 'rgba(59,130,246,0.12)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#3b82f6',
                      fontSize: '0.85rem'
                    }}
                  >
                    ℹ {riegosDelDia.length} riegos hoy
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* BOTTOM */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '18px',
              marginTop: '18px'
            }}
          >
            <Card>
              <h3 style={sectionTitle}>Eventos de Riego (Hoy)</h3>

              {riegosDelDia.length > 0 ? (
                riegosDelDia.slice(0, 5).map((riego, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: idx < riegosDelDia.slice(0, 5).length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      fontSize: '0.9rem'
                    }}
                  >
                    <span style={{ color: '#94a3b8' }}>
                      Riego #{riego.id_riego}
                    </span>
                    <span style={{ color: 'white' }}>
                      {new Date(riego.fecha_hora).toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ color: '#64748b', marginTop: '10px' }}>
                  No hay riegos registrados hoy
                </p>
              )}
            </Card>

            <Card>
              <h3 style={sectionTitle}>Resumen del día</h3>

              <SummaryRow
                label="Riegos hoy"
                value={`${riegosDelDia.length} ${riegosDelDia.length === 1 ? 'evento' : 'eventos'}`}
              />
              <SummaryRow
                label="Litros consumidos"
                value={`${litrosConsumidos} L`}
              />
              <SummaryRow
                label="Último riego"
                value={tiempoDesdeUltimoRiego}
              />
              <SummaryRow
                label="Hum. suelo prom."
                value={promHumSuelo !== null ? `${promHumSuelo}%` : 'Sin datos'}
              />
              <SummaryRow
                label="Hum. ambiental"
                value={promHumAmbiental !== null ? `${promHumAmbiental}%` : 'Sin datos'}
              />

              <div
                style={{
                  marginTop: '20px',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}
              >
                <span
                  style={{
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: '#22c55e',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  Reactivo
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

/* COMPONENTS */

function Card({
  children,
  style = {}
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        background: '#081420',
        border: '1px solid #1e293b',
        borderRadius: '18px',
        padding: '18px',
        ...style
      }}
    >
      {children}
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  color
}: {
  title: string
  value: string
  subtitle: string
  color: string
}) {
  return (
    <div
      style={{
        background: '#081420',
        border: `1px solid ${color}40`,
        borderRadius: '18px',
        padding: '18px'
      }}
    >
      <p
        style={{
          color: '#64748b',
          fontSize: '0.75rem',
          marginBottom: '10px'
        }}
      >
        {title}
      </p>

      <h2
        style={{
          color: color,
          fontSize: '2rem',
          fontWeight: 700,
          marginBottom: '8px'
        }}
      >
        {value}
      </h2>

      <p
        style={{
          color: '#94a3b8',
          fontSize: '0.85rem'
        }}
      >
        {subtitle}
      </p>

      <div
        style={{
          marginTop: '16px',
          height: '4px',
          background: '#1e293b',
          borderRadius: '999px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: '70%',
            height: '100%',
            background: color
          }}
        />
      </div>
    </div>
  )
}

function SystemRow({
  name,
  status,
  warning = false
}: {
  name: string
  status: string
  warning?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '18px',
        paddingBottom: '14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}
    >
      <span
        style={{
          color: '#94a3b8'
        }}
      >
        ● {name}
      </span>

      <span
        style={{
          color: warning ? '#f59e0b' : '#22c55e',
          fontWeight: 600
        }}
      >
        {status}
      </span>
    </div>
  )
}

function SummaryRow({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '14px 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}
    >
      <span style={{ color: '#64748b' }}>{label}</span>

      <span
        style={{
          color: 'white',
          fontWeight: 600
        }}
      >
        {value}
      </span>
    </div>
  )
}

const sectionTitle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  marginBottom: '8px'
}