// src/components/control/ControlClient.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text, Flex, Card, Button, Grid, Select, Badge, Switch, Dialog, TextField, Checkbox, ScrollArea } from '@radix-ui/themes';
import { setModoOperacion, toggleBombaManual, toggleHorario, eliminarHorario, agregarHorario } from '@/actions/control';

export default function ControlClient({ userId, cultivos, data, idCultivo }: any) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [nuevaHora, setNuevaHora] = useState('08:00');
    const [nuevaDuracion, setNuevaDuracion] = useState(15);
    const [diasSel, setDiasSel] = useState([true, true, true, true, true, false, false]);

    const { bomba, seguridad, modo, logs, horarios } = data;

    const handleModo = async (m: 'manual' | 'predictivo' | 'programado') => {
        if (!bomba.id) return;
        await setModoOperacion(userId, idCultivo, bomba.id, m);
    };

    const handleToggleBomba = async () => {
        if (!bomba.id) return;
        await toggleBombaManual(userId, bomba.id, !bomba.encendida);
    };

    const handleGuardarHorario = async () => {
        if (!bomba.id) return;
        await agregarHorario(userId, bomba.id, nuevaHora, nuevaDuracion, diasSel);
    };

    const OptionRow = ({ label, desc, active, onClick, disabled = false }: any) => (
        <Card
            onClick={disabled ? undefined : onClick}
            style={{ background: active ? 'rgba(34, 197, 94, 0.05)' : '#1f2937', borderColor: active ? '#22c55e' : '#374151', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
            mb="3"
        >
            <Flex justify="between" align="center">
                <Flex gap="3" align="center">
                    <Box style={{ width: '12px', height: '12px', borderRadius: '50%', background: active ? '#22c55e' : '#4b5563' }} />
                    <Text color="indigo" weight="bold">{label}</Text>
                </Flex>
                <Text size="2" color={active ? "green" : "gray"} weight={active ? "bold" : "regular"}>{desc}</Text>
            </Flex>
        </Card>
    );

    return (
        <Box style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity 0.2s' }}>

            {/* HEADER */}
            <Flex justify="between" align="end" mb="6" wrap="wrap" gap="4">
                <Box>
                    <Flex align="center" gap="4" mb="3">
                        <Text size="6" weight="bold" color="indigo" as="div">Control y configuración</Text>
                        <Select.Root value={idCultivo.toString()} onValueChange={(v) => startTransition(() => router.push(`?cultivo=${v}`))}>
                            <Select.Trigger style={{ background: '#111827', color: 'white', borderColor: '#1f2937' }} />
                            <Select.Content>
                                {cultivos.map((c: any) => <Select.Item key={c.id} value={c.id.toString()}>{c.nombre_planta}</Select.Item>)}
                            </Select.Content>
                        </Select.Root>
                    </Flex>
                    <Text size="3" style={{ color: '#9ca3af', fontFamily: 'monospace' }}>
                        Modo: {modo.actual} · GPIO{bomba.pin} → Relé → Bomba
                    </Text>
                </Box>
                <Badge color={bomba.online ? "green" : "red"} size="3" variant="soft" style={{ borderRadius: '8px', padding: '6px 12px' }}>
                    <Box style={{ width: '8px', height: '8px', borderRadius: '50%', background: bomba.online ? '#22c55e' : '#ef4444', marginRight: '8px' }} />
                    Sistema operativo
                </Badge>
            </Flex>

            <Grid columns={{ initial: '1', lg: '2' }} gap="5" mb="5">

                {/* TARJETA 1: CONTROL MANUAL Y MODO */}
                <Flex direction="column" gap="5">
                    <Card size="4" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px' }}>
                        <Text size="3" weight="bold" color="indigo" mb="5" as="div">Control manual de bomba</Text>

                        <Flex direction="column" align="center" justify="center" mb="6">
                            <Box style={{
                                width: '120px', height: '120px', borderRadius: '50%',
                                border: bomba.encendida ? '2px solid #3b82f6' : '2px solid #374151',
                                background: bomba.encendida ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                boxShadow: bomba.encendida ? '0 0 30px rgba(59, 130, 246, 0.2)' : 'none'
                            }}>
                                <Text size="8" style={{ filter: bomba.encendida ? 'drop-shadow(0 0 8px #60a5fa)' : 'none' }}>💧</Text>
                                <Text size="1" weight="bold" style={{ color: bomba.encendida ? '#60a5fa' : '#6b7280', marginTop: '8px', letterSpacing: '1px' }}>
                                    {bomba.encendida ? 'ENCENDIDA' : 'APAGADA'}
                                </Text>
                            </Box>
                        </Flex>

                        <Flex justify="center" mb="4">
                            <Button
                                color={bomba.encendida ? "red" : "green"}
                                variant="soft"
                                disabled={!bomba.id} // <--- Eliminamos la restricción de rol aquí
                                onClick={handleToggleBomba}
                                style={{ cursor: 'pointer', width: '220px' }}
                            >
                                {bomba.encendida ? '⏹ Apagar Bomba' : '▶ Encender Bomba'}
                            </Button>
                        </Flex>
                        <Text size="2" color="gray" align="center" style={{ fontFamily: 'monospace' }} as="div">
                            Timeout automático {bomba.timeoutMin}min · {seguridad.esInvestigador ? 'Rol autorizado' : 'Solo rol Investigador'}
                        </Text>
                    </Card>

                    <Box>
                        <Text size="3" weight="bold" color="indigo" mb="3" as="div">Modo de operación</Text>
                        <OptionRow label="Manual" desc={modo.manualActivo ? "ACTIVO" : "Cambiar"} active={modo.manualActivo} onClick={() => handleModo('manual')} />
                        <OptionRow label="Predictivo (ML)" desc={modo.tieneModelo ? (modo.predictivoActivo ? "ACTIVO" : "Cambiar") : "Requiere modelo"} active={modo.predictivoActivo} disabled={!modo.tieneModelo} onClick={() => handleModo('predictivo')} />
                        <OptionRow label="Programado" desc={modo.programadoActivo ? "ACTIVO" : "Por horario fijo"} active={modo.programadoActivo} onClick={() => handleModo('programado')} />
                    </Box>
                </Flex>

                {/* TARJETA 2: LOG DE EVENTOS (Resumen y Modal) */}
                <Card size="4" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                    <Text size="3" weight="bold" color="indigo" mb="5" as="div">Log de auditoría del sistema</Text>

                    {/* VISTA RESUMIDA (3 Columnas, 5 Filas máximo) */}
                    <Box style={{ flexGrow: 1 }}>
                        <Grid columns="1.5fr 1.5fr 2fr" gap="3" mb="3">
                            <Text size="1" weight="bold" style={{ color: '#6b7280' }}>FECHA (UTC)</Text>
                            <Text size="1" weight="bold" style={{ color: '#6b7280' }}>MÓDULO</Text>
                            <Text size="1" weight="bold" style={{ color: '#6b7280' }}>ACCIÓN</Text>
                        </Grid>

                        {logs.slice(0, 5).map((l: any) => (
                            <Grid key={`resumen_${l.id}`} columns="1.5fr 1.5fr 2fr" gap="3" py="3" style={{ borderBottom: '1px solid #1f2937' }}>
                                <Text size="2" color="indigo" style={{ fontFamily: 'monospace' }}>{l.fecha}</Text>
                                <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>{l.modulo}</Text>
                                <Text size="2" weight="bold" style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{l.accion}</Text>
                            </Grid>
                        ))}
                    </Box>

                    {/* BOTÓN Y MODAL (Tabla Completa) */}
                    <Dialog.Root>
                        <Dialog.Trigger>
                            <Button variant="outline" color="gray" style={{ width: '100%', marginTop: '20px', borderColor: '#374151', color: '#d1d5db', cursor: 'pointer' }}>
                                Ver más detalles
                            </Button>
                        </Dialog.Trigger>

                        <Dialog.Content style={{ maxWidth: 850, background: '#111827', border: '1px solid #1f2937' }}>
                            <Dialog.Title style={{ color: 'white' }}>Log completo de auditoría</Dialog.Title>
                            <Dialog.Description size="2" mb="4" style={{ color: '#9ca3af' }}>
                                Historial detallado de eventos del sistema y acciones manuales registradas.
                            </Dialog.Description>

                            <Box style={{ background: '#0f172a', borderRadius: '8px', padding: '12px' }}>
                                <Grid columns="1.5fr 1fr 2fr 3fr 1fr" gap="3" mb="3" px="2">
                                    <Text size="1" weight="bold" style={{ color: '#6b7280' }}>FECHA (UTC)</Text>
                                    <Text size="1" weight="bold" style={{ color: '#6b7280' }}>MÓDULO</Text>
                                    <Text size="1" weight="bold" style={{ color: '#6b7280' }}>ACCIÓN</Text>
                                    <Text size="1" weight="bold" style={{ color: '#6b7280' }}>DESCRIPCIÓN</Text>
                                    <Text size="1" weight="bold" style={{ color: '#6b7280' }}>IP</Text>
                                </Grid>

                                <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: '400px', paddingRight: '10px' }}>
                                    {logs.map((l: any) => (
                                        <Grid key={`full_${l.id}`} columns="1.5fr 1fr 2fr 3fr 1fr" gap="3" py="3" px="2" style={{ borderBottom: '1px solid #1f2937' }}>
                                            <Text size="2" color="indigo" style={{ fontFamily: 'monospace' }}>{l.fecha}</Text>
                                            <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>{l.modulo}</Text>
                                            <Text size="2" weight="bold" style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{l.accion}</Text>
                                            <Text size="2" color="gray" style={{ fontFamily: 'monospace', lineHeight: '1.2' }}>{l.descripcion}</Text>
                                            <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>{l.ip_acceso}</Text>
                                        </Grid>
                                    ))}
                                </ScrollArea>
                            </Box>

                            <Flex mt="5" justify="end">
                                <Dialog.Close>
                                    <Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cerrar tabla</Button>
                                </Dialog.Close>
                            </Flex>
                        </Dialog.Content>
                    </Dialog.Root>

                </Card>
            </Grid>

            {/* SECCIÓN: PROGRAMACIÓN DE HORARIOS (Se mantiene intacta) */}
            <Card size="4" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px' }}>
                <Flex justify="between" align="center" mb="5">
                    <Text size="4" weight="bold" color="indigo">Gestión de horarios de riego</Text>
                    <Dialog.Root>
                        <Dialog.Trigger>
                            <Button color="green" disabled={!bomba.id} style={{ cursor: 'pointer' }}>+ Agregar horario</Button>
                        </Dialog.Trigger>
                        <Dialog.Content style={{ maxWidth: 450, background: '#1f2937' }}>
                            <Dialog.Title style={{ color: 'white' }}>Nuevo Horario</Dialog.Title>
                            <Flex direction="column" gap="3" mt="4">
                                <label><Text color="gray" size="2">Hora de inicio</Text></label>
                                <TextField.Root type="time" value={nuevaHora} onChange={(e) => setNuevaHora(e.target.value)} style={{ background: '#111827', color: 'white' }} />

                                <Text color="gray" size="2">Duración (minutos)</Text>
                                <TextField.Root type="number" value={nuevaDuracion} onChange={(e) => setNuevaDuracion(parseInt(e.target.value))} style={{ background: '#111827', color: 'white' }} />

                                <Text color="gray" size="2">Días activos</Text>
                                <Flex gap="3" wrap="wrap">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia, idx) => (
                                        <Flex key={idx} align="center" gap="1">
                                            <Checkbox checked={diasSel[idx]} onCheckedChange={(v) => { const n = [...diasSel]; n[idx] = v as boolean; setDiasSel(n); }} />
                                            <Text color="indigo" size="2">{dia}</Text>
                                        </Flex>
                                    ))}
                                </Flex>
                            </Flex>
                            <Flex gap="3" mt="6" justify="end">
                                <Dialog.Close><Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cancelar</Button></Dialog.Close>
                                <Dialog.Close><Button color="green" onClick={handleGuardarHorario} style={{ cursor: 'pointer' }}>Guardar</Button></Dialog.Close>
                            </Flex>
                        </Dialog.Content>
                    </Dialog.Root>
                </Flex>

                {horarios.length === 0 ? (
                    <Text color="gray">No tienes horarios programados para este cultivo.</Text>
                ) : (
                    <Grid columns="1fr 2fr 1fr 1fr" gap="3">
                        <Text size="1" weight="bold" style={{ color: '#6b7280' }}>HORA</Text>
                        <Text size="1" weight="bold" style={{ color: '#6b7280' }}>DÍAS</Text>
                        <Text size="1" weight="bold" style={{ color: '#6b7280' }}>DURACIÓN</Text>
                        <Text size="1" weight="bold" style={{ color: '#6b7280' }}>ACCIONES</Text>

                        {horarios.map((h: any) => {
                            const strDias = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].filter((_, i) => h.dias[i]).join(' - ');
                            return (
                                <React.Fragment key={h.id}>
                                    <Text size="3" color="indigo" weight="bold">{h.hora}</Text>
                                    <Text size="2" color="gray">{strDias}</Text>
                                    <Text size="2" color="gray">{h.duracionMin} min</Text>
                                    <Flex gap="3" align="center">
                                        <Switch size="1" checked={h.activo} onCheckedChange={(v) => toggleHorario(h.id, v)} style={{ cursor: 'pointer' }} />
                                        <Button size="1" color="red" variant="soft" onClick={() => eliminarHorario(h.id)} style={{ cursor: 'pointer' }}>Borrar</Button>
                                    </Flex>
                                </React.Fragment>
                            );
                        })}
                    </Grid>
                )}
            </Card>
        </Box>
    );
}