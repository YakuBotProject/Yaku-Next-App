// prisma/seed.ts
// =====================================================================
// Seed — AgroSense / Yaku Dashboard
// Riego inteligente de tomates · Lima, Perú · Mayo 2026
// =====================================================================
// Ejecutar con: npx prisma db seed
// Requiere en package.json:
//   "prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
// =====================================================================

import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import  prisma  from '../src/lib/prisma'
import { hash as argon2Hash, verify } from 'argon2'

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────

const hash = async (pwd: string): Promise<string> => {
  return await argon2Hash(pwd, { 
    type: 2, // ARGON2_ID
    memoryCost: 19 * 1024, // 19 MB
    timeCost: 2,
    parallelism: 1
  })
}

/** Crea una fecha exacta en Mayo 2026 */
const f = (dia: number, hora: number, minuto = 0): Date =>
  new Date(2026, 4, dia, hora, minuto, 0)   // mes 4 = Mayo (0-index)

/** Redondea a 2 decimales */
const r2 = (n: number): number => Math.round(n * 100) / 100

/** Ruido aleatorio simétrico */
const ruido = (mag: number): number => (Math.random() - 0.5) * 2 * mag

// ── Modelos climáticos realistas Lima (otoño: mayo) ──────────────────
// Temperatura ambiental: 18-23°C, pico a las 14h
const modeloTempAmb = (hora: number): number =>
  r2(20.5 + Math.sin(((hora - 6) * Math.PI) / 12) * 2.8 + ruido(0.4))

// Humedad ambiental: 85-93%, inversa a la temperatura
const modeloHumAmb = (hora: number): number =>
  r2(Math.min(97, Math.max(82, 89.5 - Math.sin(((hora - 6) * Math.PI) / 12) * 4.5 + ruido(0.8))))

// Temperatura suelo: 19-22°C, inercia térmica (desfase de 2h)
const modeloTempSuelo = (hora: number): number =>
  r2(20.0 + Math.sin(((hora - 8) * Math.PI) / 12) * 1.4 + ruido(0.3))

// Humedad suelo: cae con temperatura, se resetea con riego
// Retorna [valor, esRiego]
let humSuelo = 72.0
const modeloHumSuelo = (hora: number, resetear = false): number => {
  if (resetear) { humSuelo = 72.0 + ruido(3); return r2(humSuelo) }
  // Caída: ~2.5% por 2h, acelerada si hace calor (mediodía)
  const factor = hora >= 11 && hora <= 16 ? 3.2 : 1.8
  humSuelo = Math.max(36, humSuelo - factor + ruido(0.6))
  return r2(humSuelo)
}

// ─────────────────────────────────────────────────────────────────────
// LIMPIEZA (orden inverso de dependencias)
// ─────────────────────────────────────────────────────────────────────

async function limpiar() {
  console.log('🗑  Limpiando tablas...')
  await prisma.logs_sistema.deleteMany()
  await prisma.alertas.deleteMany()
  await prisma.predicciones.deleteMany()
  await prisma.modelo_ml.deleteMany()
  await prisma.riego.deleteMany()
  await prisma.lecturas_sensor.deleteMany()
  await prisma.sensores.deleteMany()
  await prisma.dispositivos.deleteMany()
  await prisma.cultivos.deleteMany()
  await prisma.plantas.deleteMany()
  await prisma.usuarios.deleteMany()
  await prisma.roles_permisos.deleteMany()
  await prisma.permisos.deleteMany()
  await prisma.roles.deleteMany()
  console.log('✅ Tablas limpias\n')
}

// ─────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed AgroSense — Yaku Dashboard\n')
  console.log('═'.repeat(55))

  await limpiar()

  // ══════════════════════════════════════════════════════
  // 1. ROLES
  // ══════════════════════════════════════════════════════
  console.log('📋 Creando roles...')

  const rolAdmin = await prisma.roles.create({
    data: { nombre: 'Administrador', descripcion: 'Acceso total al sistema' }
  })
  const rolAgricultor = await prisma.roles.create({
    data: { nombre: 'Agricultor', descripcion: 'Gestión de cultivos y monitoreo' }
  })
  const rolVisor = await prisma.roles.create({
    data: { nombre: 'Visor', descripcion: 'Solo lectura de datos y reportes' }
  })

  console.log(`  ✓ ${rolAdmin.nombre} (id: ${rolAdmin.id_rol})`)
  console.log(`  ✓ ${rolAgricultor.nombre} (id: ${rolAgricultor.id_rol})`)
  console.log(`  ✓ ${rolVisor.nombre} (id: ${rolVisor.id_rol})\n`)

  // ══════════════════════════════════════════════════════
  // 2. PERMISOS
  // ══════════════════════════════════════════════════════
  console.log('🔑 Creando permisos...')

  const [
    pDashboard, pControlRiego, pVerLecturas,
    pGestUsuarios, pVerReportes, pGestCultivos,
    pGestDispositivos, pVerAlertas, pVerPredicciones
  ] = await Promise.all([
    prisma.permisos.create({ data: { nombre: 'ver_dashboard',         descripcion: 'Ver el dashboard principal en tiempo real' } }),
    prisma.permisos.create({ data: { nombre: 'controlar_riego',       descripcion: 'Encender/apagar la bomba manualmente' } }),
    prisma.permisos.create({ data: { nombre: 'ver_lecturas',          descripcion: 'Ver histórico de lecturas de sensores' } }),
    prisma.permisos.create({ data: { nombre: 'gestionar_usuarios',    descripcion: 'CRUD de usuarios y roles' } }),
    prisma.permisos.create({ data: { nombre: 'ver_reportes',          descripcion: 'Exportar reportes CSV y ver comparativas' } }),
    prisma.permisos.create({ data: { nombre: 'gestionar_cultivos',    descripcion: 'Crear y editar cultivos' } }),
    prisma.permisos.create({ data: { nombre: 'gestionar_dispositivos',descripcion: 'Registrar y configurar dispositivos IoT' } }),
    prisma.permisos.create({ data: { nombre: 'ver_alertas',           descripcion: 'Ver y gestionar alertas del sistema' } }),
    prisma.permisos.create({ data: { nombre: 'ver_predicciones',      descripcion: 'Ver predicciones del modelo ML' } }),
  ])

  console.log(`  ✓ 9 permisos creados\n`)

  // ══════════════════════════════════════════════════════
  // 3. ROLES ↔ PERMISOS
  // ══════════════════════════════════════════════════════
  console.log('🔗 Asignando permisos a roles...')

  // Administrador: todos los permisos
  const permisosAdmin = [
    pDashboard, pControlRiego, pVerLecturas, pGestUsuarios,
    pVerReportes, pGestCultivos, pGestDispositivos, pVerAlertas, pVerPredicciones
  ]
  for (const p of permisosAdmin) {
    await prisma.roles_permisos.create({
      data: { id_rol: rolAdmin.id_rol, id_permiso: p.id_permiso }
    })
  }

  // Agricultor: operaciones del campo
  const permisosAgricultor = [
    pDashboard, pControlRiego, pVerLecturas,
    pVerReportes, pGestCultivos, pVerAlertas, pVerPredicciones
  ]
  for (const p of permisosAgricultor) {
    await prisma.roles_permisos.create({
      data: { id_rol: rolAgricultor.id_rol, id_permiso: p.id_permiso }
    })
  }

  // Visor: solo lectura
  const permisosVisor = [pDashboard, pVerLecturas, pVerReportes, pVerAlertas, pVerPredicciones]
  for (const p of permisosVisor) {
    await prisma.roles_permisos.create({
      data: { id_rol: rolVisor.id_rol, id_permiso: p.id_permiso }
    })
  }

  console.log(`  ✓ Admin: ${permisosAdmin.length} permisos`)
  console.log(`  ✓ Agricultor: ${permisosAgricultor.length} permisos`)
  console.log(`  ✓ Visor: ${permisosVisor.length} permisos\n`)

  // ══════════════════════════════════════════════════════
  // 4. USUARIOS
  // ══════════════════════════════════════════════════════
  console.log('👤 Creando usuarios...')

  // Pre-compute password hashes
  const hashAdmin = await hash('Admin2026!')
  const hashAgro = await hash('Agro2026!')
  const hashVisor = await hash('Visor2026!')

  const admin = await prisma.usuarios.create({
    data: {
      nombre:         'Luis Rodríguez',
      correo:         'admin@agrosense.pe',
      contrasena:     hashAdmin,
      id_rol:         rolAdmin.id_rol,
      estado:         true,
      fecha_registro: f(1, 9)
    }
  })

  const agric1 = await prisma.usuarios.create({
    data: {
      nombre:         'Carlos Quispe',
      correo:         'carlos.quispe@agrosense.pe',
      contrasena:     hashAgro,
      id_rol:         rolAgricultor.id_rol,
      estado:         true,
      fecha_registro: f(2, 10)
    }
  })

  const agric2 = await prisma.usuarios.create({
    data: {
      nombre:         'María Flores',
      correo:         'maria.flores@agrosense.pe',
      contrasena:     hashAgro,
      id_rol:         rolAgricultor.id_rol,
      estado:         true,
      fecha_registro: f(3, 11)
    }
  })

  const visor = await prisma.usuarios.create({
    data: {
      nombre:         'Javier Torres (Asesor)',
      correo:         'asesor@uni.pe',
      contrasena:     hashVisor,
      id_rol:         rolVisor.id_rol,
      estado:         true,
      fecha_registro: f(4, 9)
    }
  })

  console.log(`  ✓ ${admin.nombre} — admin`)
  console.log(`  ✓ ${agric1.nombre} — agricultor`)
  console.log(`  ✓ ${agric2.nombre} — agricultor`)
  console.log(`  ✓ ${visor.nombre} — visor\n`)

  // ══════════════════════════════════════════════════════
  // 5. PLANTAS
  // ══════════════════════════════════════════════════════
  console.log('🌱 Creando plantas...')

  const tomateCherry = await prisma.plantas.create({
    data: {
      nombre:               'Tomate Cherry',
      tipo:                 'Hortaliza',
      requerimiento_hidrico:'moderado',
      descripcion:          'Variedad pequeña de tomate. Ciclo 70-90 días. Óptimo: hum. suelo 60-80%, temp. 18-29°C, temp. suelo 18-24°C.'
    }
  })

  const tomatePera = await prisma.plantas.create({
    data: {
      nombre:               'Tomate Pera',
      tipo:                 'Hortaliza',
      requerimiento_hidrico:'moderado',
      descripcion:          'Variedad alargada ideal para salsas. Ciclo 75-95 días. Sensible a exceso de agua en etapa de maduración.'
    }
  })

  const lechuga = await prisma.plantas.create({
    data: {
      nombre:               'Lechuga Romana',
      tipo:                 'Hortaliza de hoja',
      requerimiento_hidrico:'alto',
      descripcion:          'Cultivo de ciclo corto (35-50 días). Alta demanda hídrica. Ideal para comparativas de sistema de riego.'
    }
  })

  console.log(`  ✓ ${tomateCherry.nombre}`)
  console.log(`  ✓ ${tomatePera.nombre}`)
  console.log(`  ✓ ${lechuga.nombre}\n`)

  // ══════════════════════════════════════════════════════
  // 6. CULTIVOS
  // ══════════════════════════════════════════════════════
  console.log('🌿 Creando cultivos...')

  // Cultivo principal — Tomate Cherry Fase Reactiva (activo)
  const cultivoActivo = await prisma.cultivos.create({
    data: {
      id_usuario:    agric1.id_usuario,
      id_planta:     tomateCherry.id_planta,
      nombre:        'Maceta #1 — Tomate Cherry · Fase Reactiva',
      etapa:         'floracion',
      area_m2:       new Prisma.Decimal(0.25),
      fecha_siembra: new Date('2026-03-12'),
      estado:        'activo'
    }
  })

  // Cultivo 2 — Tomate Cherry Fase ML (activo)
  const cultivoML = await prisma.cultivos.create({
    data: {
      id_usuario:    agric1.id_usuario,
      id_planta:     tomateCherry.id_planta,
      nombre:        'Maceta #2 — Tomate Cherry · Fase Predictiva ML',
      etapa:         'fructificacion',
      area_m2:       new Prisma.Decimal(0.25),
      fecha_siembra: new Date('2026-03-12'),
      estado:        'activo'
    }
  })

  // Cultivo 3 — Tomate Pera finalizado (control manual)
  const cultivoControl = await prisma.cultivos.create({
    data: {
      id_usuario:    agric2.id_usuario,
      id_planta:     tomatePera.id_planta,
      nombre:        'Maceta #3 — Tomate Pera · Control Manual',
      etapa:         'maduracion',
      area_m2:       new Prisma.Decimal(0.30),
      fecha_siembra: new Date('2026-02-01'),
      estado:        'finalizado'
    }
  })

  console.log(`  ✓ ${cultivoActivo.nombre} (id: ${cultivoActivo.id_cultivo})`)
  console.log(`  ✓ ${cultivoML.nombre} (id: ${cultivoML.id_cultivo})`)
  console.log(`  ✓ ${cultivoControl.nombre} (id: ${cultivoControl.id_cultivo})\n`)

  // ══════════════════════════════════════════════════════
  // 7. DISPOSITIVOS
  // ══════════════════════════════════════════════════════
  console.log('📡 Creando dispositivos...')

  const rpi5 = await prisma.dispositivos.create({
    data: {
      nombre:         'Raspberry Pi 5 — Nodo Central Gateway',
      ubicacion:      'Laboratorio IoT — Mesa central',
      estado:         'activo',
      fecha_registro: f(1, 8)
    }
  })

  const esp32s3 = await prisma.dispositivos.create({
    data: {
      nombre:         'ESP32-S3 — Nodo de Sensores',
      ubicacion:      'Maceta #1 y #2 — Zona de cultivo',
      estado:         'activo',
      fecha_registro: f(1, 8, 15)
    }
  })

  const esp32act = await prisma.dispositivos.create({
    data: {
      nombre:         'ESP32 — Nodo de Actuación',
      ubicacion:      'Depósito de agua — Zona de riego',
      estado:         'activo',
      fecha_registro: f(1, 8, 30)
    }
  })

  console.log(`  ✓ ${rpi5.nombre}`)
  console.log(`  ✓ ${esp32s3.nombre}`)
  console.log(`  ✓ ${esp32act.nombre}\n`)

  // ══════════════════════════════════════════════════════
  // 8. SENSORES
  // ══════════════════════════════════════════════════════
  console.log('🌡  Creando sensores...')

  const sensorHumSuelo = await prisma.sensores.create({
    data: { id_dispositivo: esp32s3.id_dispositivo, tipo_sensor: 'Resistivo AO',     unidad: '%',   estado: 'activo' }
  })
  const sensorHumAmb = await prisma.sensores.create({
    data: { id_dispositivo: esp32s3.id_dispositivo, tipo_sensor: 'DHT22-humedad',    unidad: '%',   estado: 'activo' }
  })
  const sensorTempAmb = await prisma.sensores.create({
    data: { id_dispositivo: esp32s3.id_dispositivo, tipo_sensor: 'DHT22-temperatura',unidad: '°C',  estado: 'activo' }
  })
  const sensorTempSuelo = await prisma.sensores.create({
    data: { id_dispositivo: esp32s3.id_dispositivo, tipo_sensor: 'DS18B20',          unidad: '°C',  estado: 'activo' }
  })
  const sensorFlujo = await prisma.sensores.create({
    data: { id_dispositivo: esp32act.id_dispositivo,tipo_sensor: 'YF-S201',          unidad: 'L',   estado: 'activo' }
  })
  const sensorNivel = await prisma.sensores.create({
    data: { id_dispositivo: esp32act.id_dispositivo,tipo_sensor: 'HC-SR04',          unidad: 'cm',  estado: 'activo' }
  })

  console.log(`  ✓ ${sensorHumSuelo.tipo_sensor}      (GPIO1 ADC)`)
  console.log(`  ✓ ${sensorHumAmb.tipo_sensor}         (GPIO4)`)
  console.log(`  ✓ ${sensorTempAmb.tipo_sensor}  (GPIO4)`)
  console.log(`  ✓ ${sensorTempSuelo.tipo_sensor}            (GPIO5)`)
  console.log(`  ✓ ${sensorFlujo.tipo_sensor}           (GPIO6)`)
  console.log(`  ✓ ${sensorNivel.tipo_sensor}           (GPIO18)\n`)

  // ══════════════════════════════════════════════════════
  // 9. LECTURAS DE SENSORES
  // Mayo 15–21 · cada 2 horas · 4 variables
  // ══════════════════════════════════════════════════════
  console.log('📊 Generando lecturas de sensores (Mayo 15–21, cada 2h)...')

  type Lectura = {
    id_sensor:     number
    id_cultivo:    number
    valor:         Prisma.Decimal
    tipo_variable: string
    fecha_hora:    Date
  }

  const lecturas: Lectura[] = []
  humSuelo = 72.0    // reset global antes de la simulación

  // Mapeo: cultivoActivo usa sensores del ESP32-S3
  // Generamos lecturas para cultivoActivo y cultivoML
  const cultivosLecturas = [
    { cultivo: cultivoActivo, offset: 0 },
    { cultivo: cultivoML,     offset: 0.5 }, // pequeño offset en valores
  ]

  for (const { cultivo, offset } of cultivosLecturas) {
    humSuelo = cultivo.id_cultivo === cultivoActivo.id_cultivo ? 72.0 : 68.0

    for (let dia = 15; dia <= 21; dia++) {
      for (let hora = 0; hora < 24; hora += 2) {

        // Determinar si este punto es post-riego
        // Riego cuando humSuelo < 43%
        const esPostRiego = humSuelo < 43

        const hS  = modeloHumSuelo(hora, esPostRiego)
        const hA  = modeloHumAmb(hora)
        const tA  = modeloTempAmb(hora)
        const tS  = modeloTempSuelo(hora)
        const nivel = r2(14.2 + ruido(2.1))  // nivel depósito ~14L sobre 20L

        const ts = f(dia, hora)

        // hum_suelo
        lecturas.push({
          id_sensor:     sensorHumSuelo.id_sensor,
          id_cultivo:    cultivo.id_cultivo,
          valor:         new Prisma.Decimal(r2(hS + offset)),
          tipo_variable: 'humedad_suelo',
          fecha_hora:    ts,
        })

        // hum_ambiental
        lecturas.push({
          id_sensor:     sensorHumAmb.id_sensor,
          id_cultivo:    cultivo.id_cultivo,
          valor:         new Prisma.Decimal(r2(hA + offset * 0.3)),
          tipo_variable: 'humedad_ambiental',
          fecha_hora:    ts,
        })

        // temp_ambiental
        lecturas.push({
          id_sensor:     sensorTempAmb.id_sensor,
          id_cultivo:    cultivo.id_cultivo,
          valor:         new Prisma.Decimal(r2(tA + offset * 0.2)),
          tipo_variable: 'temperatura_ambiental',
          fecha_hora:    ts,
        })

        // temp_suelo
        lecturas.push({
          id_sensor:     sensorTempSuelo.id_sensor,
          id_cultivo:    cultivo.id_cultivo,
          valor:         new Prisma.Decimal(r2(tS + offset * 0.1)),
          tipo_variable: 'temperatura_suelo',
          fecha_hora:    ts,
        })

        // nivel depósito
        lecturas.push({
          id_sensor:     sensorNivel.id_sensor,
          id_cultivo:    cultivo.id_cultivo,
          valor:         new Prisma.Decimal(nivel),
          tipo_variable: 'nivel_agua',
          fecha_hora:    ts,
        })
      }
    }
  }

  // Inserción en lotes de 100
  const BATCH = 100
  for (let i = 0; i < lecturas.length; i += BATCH) {
    await prisma.lecturas_sensor.createMany({ data: lecturas.slice(i, i + BATCH) })
  }
  console.log(`  ✓ ${lecturas.length} lecturas insertadas\n`)

  // ══════════════════════════════════════════════════════
  // 10. EVENTOS DE RIEGO
  // ══════════════════════════════════════════════════════
  console.log('💧 Creando eventos de riego...')

  const riegosData = [
    // Fase 1 control manual (cultivoControl)
    { id_cultivo: cultivoControl.id_cultivo, id_dispositivo: esp32act.id_dispositivo, tipo: 'manual',    duracion: 45, estado: true,  fecha_hora: f(15, 8,  0)  },
    { id_cultivo: cultivoControl.id_cultivo, id_dispositivo: esp32act.id_dispositivo, tipo: 'manual',    duracion: 52, estado: true,  fecha_hora: f(16, 7, 30)  },
    { id_cultivo: cultivoControl.id_cultivo, id_dispositivo: esp32act.id_dispositivo, tipo: 'manual',    duracion: 40, estado: true,  fecha_hora: f(17, 8, 15)  },
    { id_cultivo: cultivoControl.id_cultivo, id_dispositivo: esp32act.id_dispositivo, tipo: 'manual',    duracion: 58, estado: true,  fecha_hora: f(18, 9,  0)  },
    // Fase 2 reactiva (cultivoActivo) — bomba automática por umbral
    { id_cultivo: cultivoActivo.id_cultivo,  id_dispositivo: esp32act.id_dispositivo, tipo: 'automatico',duracion: 30, estado: true,  fecha_hora: f(15, 14, 22) },
    { id_cultivo: cultivoActivo.id_cultivo,  id_dispositivo: esp32act.id_dispositivo, tipo: 'automatico',duracion: 28, estado: true,  fecha_hora: f(16, 10, 45) },
    { id_cultivo: cultivoActivo.id_cultivo,  id_dispositivo: esp32act.id_dispositivo, tipo: 'automatico',duracion: 33, estado: true,  fecha_hora: f(17, 14,  5) },
    { id_cultivo: cultivoActivo.id_cultivo,  id_dispositivo: esp32act.id_dispositivo, tipo: 'automatico',duracion: 27, estado: true,  fecha_hora: f(18, 11, 30) },
    { id_cultivo: cultivoActivo.id_cultivo,  id_dispositivo: esp32act.id_dispositivo, tipo: 'automatico',duracion: 31, estado: true,  fecha_hora: f(19, 13, 50) },
    { id_cultivo: cultivoActivo.id_cultivo,  id_dispositivo: esp32act.id_dispositivo, tipo: 'manual',    duracion: 60, estado: true,  fecha_hora: f(20, 16,  0) },
    // Fase 3 predictiva ML (cultivoML) — bomba por recomendación ML
    { id_cultivo: cultivoML.id_cultivo,      id_dispositivo: esp32act.id_dispositivo, tipo: 'predictivo',duracion: 22, estado: true,  fecha_hora: f(15, 13,  0) },
    { id_cultivo: cultivoML.id_cultivo,      id_dispositivo: esp32act.id_dispositivo, tipo: 'predictivo',duracion: 20, estado: true,  fecha_hora: f(16, 10, 10) },
    { id_cultivo: cultivoML.id_cultivo,      id_dispositivo: esp32act.id_dispositivo, tipo: 'predictivo',duracion: 25, estado: true,  fecha_hora: f(17, 12, 40) },
    { id_cultivo: cultivoML.id_cultivo,      id_dispositivo: esp32act.id_dispositivo, tipo: 'predictivo',duracion: 18, estado: true,  fecha_hora: f(18, 11,  5) },
    { id_cultivo: cultivoML.id_cultivo,      id_dispositivo: esp32act.id_dispositivo, tipo: 'predictivo',duracion: 23, estado: true,  fecha_hora: f(19, 13, 20) },
    { id_cultivo: cultivoML.id_cultivo,      id_dispositivo: esp32act.id_dispositivo, tipo: 'predictivo',duracion: 21, estado: true,  fecha_hora: f(20, 10, 55) },
  ]

  await prisma.riego.createMany({ data: riegosData })
  console.log(`  ✓ ${riegosData.length} eventos de riego creados\n`)

  // ══════════════════════════════════════════════════════
  // 11. MODELO ML
  // ══════════════════════════════════════════════════════
  console.log('🧠 Creando modelo ML...')

  const modelo = await prisma.modelo_ml.create({
    data: {
      nombre:              'AgroSense-RF-v3',
      version:             'v3.0.1',
      algoritmo:           'Random Forest Regressor',
      fecha_entrenamiento: f(14, 22, 0),
      parametros:          JSON.stringify({
        n_estimators:     200,
        max_depth:        10,
        max_features:     'sqrt',
        min_samples_leaf: 5,
        random_state:     42
      }),
      metricas: JSON.stringify({
        MAE:        3.81,
        RMSE:       5.12,
        R2:         0.924,
        accuracy:   '87.5%',
        train_size: 1240,
        test_size:  310
      })
    }
  })

  console.log(`  ✓ ${modelo.nombre} — MAE: 3.81% — R²: 0.924\n`)

  // ══════════════════════════════════════════════════════
  // 12. PREDICCIONES
  // ══════════════════════════════════════════════════════
  console.log('🔮 Creando predicciones ML...')

  const prediccionesData = [
    // Mayo 15-21, cada 2h aprox — predicciones para cultivoML
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(88.20), fecha_hora: f(15, 8,  0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(82.50), fecha_hora: f(15, 10, 0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'regar',     probabilidad: new Prisma.Decimal(91.30), fecha_hora: f(15, 12, 0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(85.70), fecha_hora: f(15, 14, 0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(79.10), fecha_hora: f(15, 16, 0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(83.40), fecha_hora: f(15, 18, 0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(77.80), fecha_hora: f(16, 8,  0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'regar',     probabilidad: new Prisma.Decimal(89.60), fecha_hora: f(16, 10, 0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(81.20), fecha_hora: f(16, 12, 0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(86.50), fecha_hora: f(17, 8,  0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'regar',     probabilidad: new Prisma.Decimal(92.10), fecha_hora: f(17, 12, 0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(84.30), fecha_hora: f(18, 8,  0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'regar',     probabilidad: new Prisma.Decimal(90.80), fecha_hora: f(18, 11, 0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(78.90), fecha_hora: f(19, 8,  0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'regar',     probabilidad: new Prisma.Decimal(87.40), fecha_hora: f(19, 13, 0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(80.60), fecha_hora: f(20, 8,  0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'regar',     probabilidad: new Prisma.Decimal(93.20), fecha_hora: f(20, 10, 0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(85.10), fecha_hora: f(21, 8,  0) },
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'no_regar',  probabilidad: new Prisma.Decimal(88.70), fecha_hora: f(21, 10, 0) },
    // Predicción más reciente
    { id_modelo: modelo.id_modelo, id_cultivo: cultivoML.id_cultivo, recomendacion: 'regar',     probabilidad: new Prisma.Decimal(91.50), fecha_hora: f(21, 14, 0) },
  ]

  await prisma.predicciones.createMany({ data: prediccionesData })
  console.log(`  ✓ ${prediccionesData.length} predicciones creadas\n`)

  // ══════════════════════════════════════════════════════
  // 13. ALERTAS
  // ══════════════════════════════════════════════════════
  console.log('🚨 Creando alertas...')

  const alertasData = [
    // Alertas resueltas históricas
    { id_cultivo: cultivoActivo.id_cultivo, tipo: 'humedad_suelo_baja', mensaje: 'Humedad del suelo descendió a 38.2% — por debajo del umbral mínimo (40%)', nivel: 'critica',      estado: 'resuelta',  fecha_hora: f(15, 14, 18) },
    { id_cultivo: cultivoActivo.id_cultivo, tipo: 'humedad_suelo_baja', mensaje: 'Humedad del suelo descendió a 41.1% — umbral de advertencia alcanzado',    nivel: 'advertencia',  estado: 'resuelta',  fecha_hora: f(16, 10, 40) },
    { id_cultivo: cultivoML.id_cultivo,     tipo: 'prediccion_riego',   mensaje: 'Modelo ML recomienda riego preventivo en 35 min (confianza 91.3%)',         nivel: 'informativa',  estado: 'resuelta',  fecha_hora: f(15, 12, 25) },
    { id_cultivo: cultivoActivo.id_cultivo, tipo: 'temperatura_alta',   mensaje: 'Temperatura ambiental superó 28°C durante 15 min — riesgo de floración',    nivel: 'advertencia',  estado: 'resuelta',  fecha_hora: f(17, 13, 10) },
    { id_cultivo: cultivoML.id_cultivo,     tipo: 'prediccion_riego',   mensaje: 'Modelo ML recomienda riego preventivo en 42 min (confianza 89.6%)',         nivel: 'informativa',  estado: 'resuelta',  fecha_hora: f(16, 9,  50) },
    { id_cultivo: cultivoControl.id_cultivo,tipo: 'humedad_suelo_baja', mensaje: 'Humedad del suelo cayó a 35.8% — cultivo con estrés hídrico detectado',     nivel: 'critica',      estado: 'resuelta',  fecha_hora: f(17, 15, 30) },
    { id_cultivo: cultivoActivo.id_cultivo, tipo: 'bomba_sin_flujo',    mensaje: 'Bomba activa pero flujo detectado en 0 L/min por 35 seg — posible obstrucción', nivel: 'critica',   estado: 'resuelta',  fecha_hora: f(18, 11, 35) },
    { id_cultivo: cultivoML.id_cultivo,     tipo: 'prediccion_riego',   mensaje: 'Modelo ML recomienda riego preventivo en 28 min (confianza 92.1%)',         nivel: 'informativa',  estado: 'resuelta',  fecha_hora: f(17, 12, 12) },
    // Alertas activas (hoy)
    { id_cultivo: cultivoActivo.id_cultivo, tipo: 'deposito_bajo',      mensaje: 'Nivel del depósito al 71% — se recomienda reponer agua antes de 4 días',    nivel: 'advertencia',  estado: 'activa',    fecha_hora: f(21, 9,  0)  },
    { id_cultivo: cultivoML.id_cultivo,     tipo: 'prediccion_riego',   mensaje: 'Modelo ML recomienda riego preventivo en 42 min (confianza 91.5%)',         nivel: 'informativa',  estado: 'activa',    fecha_hora: f(21, 14, 0)  },
  ]

  await prisma.alertas.createMany({ data: alertasData })
  console.log(`  ✓ ${alertasData.length} alertas creadas\n`)

  // ══════════════════════════════════════════════════════
  // 14. LOGS DEL SISTEMA
  // ══════════════════════════════════════════════════════
  console.log('📝 Creando logs del sistema...')

  const logsData = [
    { id_usuario: admin.id_usuario,   accion: 'LOGIN',                 descripcion: 'Sesión iniciada desde IP 192.168.1.10',                                    fecha_hora: f(14, 9,  0)  },
    { id_usuario: admin.id_usuario,   accion: 'CREAR_DISPOSITIVO',     descripcion: `Registró dispositivo: ${rpi5.nombre}`,                                      fecha_hora: f(14, 9, 10)  },
    { id_usuario: admin.id_usuario,   accion: 'CREAR_DISPOSITIVO',     descripcion: `Registró dispositivo: ${esp32s3.nombre}`,                                   fecha_hora: f(14, 9, 15)  },
    { id_usuario: admin.id_usuario,   accion: 'CREAR_DISPOSITIVO',     descripcion: `Registró dispositivo: ${esp32act.nombre}`,                                  fecha_hora: f(14, 9, 20)  },
    { id_usuario: admin.id_usuario,   accion: 'CREAR_USUARIO',         descripcion: `Creó usuario: ${agric1.correo} con rol Agricultor`,                         fecha_hora: f(14, 9, 30)  },
    { id_usuario: admin.id_usuario,   accion: 'CREAR_USUARIO',         descripcion: `Creó usuario: ${agric2.correo} con rol Agricultor`,                         fecha_hora: f(14, 9, 35)  },
    { id_usuario: agric1.id_usuario,  accion: 'LOGIN',                 descripcion: 'Sesión iniciada desde navegador Chrome / Windows',                          fecha_hora: f(15, 7, 58)  },
    { id_usuario: agric1.id_usuario,  accion: 'CREAR_CULTIVO',         descripcion: `Registró cultivo: ${cultivoActivo.nombre}`,                                 fecha_hora: f(15, 8,  5)  },
    { id_usuario: agric1.id_usuario,  accion: 'CREAR_CULTIVO',         descripcion: `Registró cultivo: ${cultivoML.nombre}`,                                     fecha_hora: f(15, 8, 10)  },
    { id_usuario: agric1.id_usuario,  accion: 'CAMBIO_UMBRAL',         descripcion: 'Umbral humedad mínima modificado: 45% → 40% (Maceta #1)',                   fecha_hora: f(16, 12, 18) },
    { id_usuario: agric1.id_usuario,  accion: 'RIEGO_MANUAL',          descripcion: 'Activó bomba manualmente por 60s — Maceta #1 (lectura: 39.5%)',             fecha_hora: f(20, 16,  0) },
    { id_usuario: agric2.id_usuario,  accion: 'LOGIN',                 descripcion: 'Sesión iniciada desde navegador Firefox / Android',                         fecha_hora: f(17, 8, 15)  },
    { id_usuario: agric2.id_usuario,  accion: 'VER_REPORTE',           descripcion: 'Exportó CSV de lecturas: May 15-17, Maceta #3',                             fecha_hora: f(18, 10, 45) },
    { id_usuario: visor.id_usuario,   accion: 'LOGIN',                 descripcion: 'Sesión iniciada (rol Visor — acceso solo lectura)',                          fecha_hora: f(19, 11,  0) },
    { id_usuario: admin.id_usuario,   accion: 'ENTRENAR_MODELO',       descripcion: `Modelo ${modelo.nombre} reentrenado — MAE: 3.81%, R²: 0.924`,              fecha_hora: f(14, 22,  0) },
    { id_usuario: agric1.id_usuario,  accion: 'RESOLVER_ALERTA',       descripcion: 'Alerta "humedad_suelo_baja" marcada como resuelta — Maceta #1',             fecha_hora: f(15, 14, 25) },
    { id_usuario: agric1.id_usuario,  accion: 'VER_PREDICCIONES',      descripcion: 'Consultó predicciones ML para Maceta #2 — últimas 24h',                    fecha_hora: f(21, 9, 30)  },
    { id_usuario: visor.id_usuario,   accion: 'VER_COMPARATIVA',       descripcion: 'Accedió a comparativa de fases (manual vs reactivo vs ML)',                 fecha_hora: f(21, 11, 15) },
  ]

  await prisma.logs_sistema.createMany({ data: logsData })
  console.log(`  ✓ ${logsData.length} logs creados\n`)

  // ══════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ══════════════════════════════════════════════════════
  console.log('═'.repeat(55))
  console.log('✅ Seed completado exitosamente\n')
  console.log('📊 Resumen de datos insertados:')
  console.log(`   Roles:              ${(await prisma.roles.count())}`)
  console.log(`   Permisos:           ${(await prisma.permisos.count())}`)
  console.log(`   Usuarios:           ${(await prisma.usuarios.count())}`)
  console.log(`   Plantas:            ${(await prisma.plantas.count())}`)
  console.log(`   Cultivos:           ${(await prisma.cultivos.count())}`)
  console.log(`   Dispositivos:       ${(await prisma.dispositivos.count())}`)
  console.log(`   Sensores:           ${(await prisma.sensores.count())}`)
  console.log(`   Lecturas:           ${(await prisma.lecturas_sensor.count())}`)
  console.log(`   Eventos de riego:   ${(await prisma.riego.count())}`)
  console.log(`   Modelo ML:          ${(await prisma.modelo_ml.count())}`)
  console.log(`   Predicciones:       ${(await prisma.predicciones.count())}`)
  console.log(`   Alertas:            ${(await prisma.alertas.count())}`)
  console.log(`   Logs:               ${(await prisma.logs_sistema.count())}`)
  console.log('\n🔐 Credenciales de acceso:')
  console.log('   admin@agrosense.pe         → Admin2026!')
  console.log('   carlos.quispe@agrosense.pe → Agro2026!')
  console.log('   maria.flores@agrosense.pe  → Agro2026!')
  console.log('   asesor@uni.pe              → Visor2026!')
  console.log('═'.repeat(55))
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })