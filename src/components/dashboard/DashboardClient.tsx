"use client";

import { useState } from 'react';
import { Box, Text, Flex, Grid, Select, Card, Badge, Progress, Switch, Separator, Button } from '@radix-ui/themes';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

type TanqueData = { idTelemetria: string | null; nombre: string; litrosActuales: number; litrosTotales: number; porcentaje: number; sensorModelo: string; estadoNivel: string; bombaEncendida: boolean; timeoutMinutos: number; } | null;
type SensorData = { modelo: string; metrica: string; unidad: string; valor: number; porcentaje: number | null; ema: number | null; fecha: Date; umbral: { min: number; max: number } | null; } | null;
type DispositivoData = { id: number; nombre: string; estado: string | null; };
type ConsumoData = { label: string; valor: number; };
type ResumenDiaData = { riegosHoy: number; litrosHoy: number; ultimoRiego: Date | null; humedadSueloProm: number | null; humedadAmbiental: number | null; };

type HistoricoPunto = { fecha: string; valor: number; };
type HistorialData = {
  humedadSuelo: HistoricoPunto[];
  humedadAmbiente: HistoricoPunto[];
  temperaturaSuelo: HistoricoPunto[];
  temperaturaAmbiente: HistoricoPunto[];
};

type CultivoData = {
  idCultivo: number;
  nombreCultivo: string;
  conceptoPlanta: string;
  etapaCrecimiento: string | null;
  sensores: { humedadSuelo: SensorData; humedadAmbiente: SensorData; temperaturaSuelo: SensorData; temperaturaAmbiente: SensorData; };
  historialSensores: HistorialData;
  dispositivos: DispositivoData[];
  tanque: TanqueData;
  consumoSemanal: ConsumoData[];
  limiteConsumo: number | null;
  resumenDia: ResumenDiaData;
};

export default function DashboardClient({ cultivos }: { cultivos: CultivoData[] }) {
  const [selectedId, setSelectedId] = useState<string>(cultivos.length > 0 ? cultivos[0].idCultivo.toString() : "");

  if (cultivos.length === 0) return <Text color="gray">No tienes cultivos registrados actualmente.</Text>;
  const cultivoActivo = cultivos.find((c) => c.idCultivo.toString() === selectedId) || cultivos[0];

  const getTimeAgo = (date: Date | null) => {
    if (!date) return 'Sin datos';
    const diffMins = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
    if (diffMins < 1) return 'hace un momento';
    if (diffMins < 60) return `hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours}h ${diffMins % 60 > 0 ? `${diffMins % 60}min` : ''}`;
    return `hace ${Math.floor(diffHours / 24)} día(s)`;
  };

  // --- SUB-COMPONENTE: TARJETA DE SENSOR ---
  const SensorCard = ({ sensor, colorBase }: { sensor: SensorData; colorBase: "sky" | "orange" }) => {
    if (!sensor) return <Card size="2" style={{ background: '#111827', borderColor: '#1e293b', borderRadius: '16px' }}><Text size="3" color="gray">Sensor sin datos</Text></Card>;
    const fuera = sensor.umbral && (sensor.valor < sensor.umbral.min || sensor.valor > sensor.umbral.max);
    return (
      <Card size="2" style={{ background: '#111827', borderColor: '#1e293b', borderRadius: '16px' }}>
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>{sensor.modelo}</Text>
            <Badge color={fuera ? "red" : "green"} variant="soft">{fuera ? "Fuera de rango" : "Óptimo"}</Badge>
          </Flex>
          
          <Box>
            <Text size="2" color="gray" mb="1" as="div" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>{sensor.metrica}</Text>
            <Flex align="baseline" gap="1">
              <Text size="8" weight="bold" color={fuera ? "red" : colorBase}>{sensor.valor.toFixed(1)}</Text>
              <Text size="4" color={fuera ? "red" : colorBase} weight="medium">{sensor.unidad}</Text>
            </Flex>
          </Box>

          <Box mt="2">
            <Text size="1" color="gray" mb="2" as="div" style={{ fontFamily: 'monospace' }}>
              Objetivo: {sensor.umbral ? `${sensor.umbral.min} - ${sensor.umbral.max}${sensor.unidad}` : 'No definido'}
            </Text>
            {sensor.porcentaje !== null && <Progress value={sensor.porcentaje} size="2" color={fuera ? 'red' : 'blue'} />}
          </Box>
        </Flex>
      </Card>
    );
  };

  // --- SUB-COMPONENTE: GRÁFICO HISTÓRICO ---
  const HistoricoSensoresCard = ({ historial, sensores }: { historial: HistorialData, sensores: any }) => {
    const [timeRange, setTimeRange] = useState<'6h' | '24h' | '7d'>('6h');
    const [activeMetric, setActiveMetric] = useState<'humedadSuelo' | 'humedadAmbiente' | 'temperaturaSuelo' | 'temperaturaAmbiente'>('humedadSuelo');

    const metricConfig = {
      humedadSuelo: { title: 'Humedad del suelo', color: '#22c55e', key: 'humedadSuelo', isPercentage: true, umbralRef: 'min' },
      humedadAmbiente: { title: 'Humedad ambiente', color: '#3b82f6', key: 'humedadAmbiente', isPercentage: true, umbralRef: 'max' },
      temperaturaSuelo: { title: 'Temperatura suelo', color: '#f97316', key: 'temperaturaSuelo', isPercentage: false, umbralRef: 'max' },
      temperaturaAmbiente: { title: 'Temperatura ambiente', color: '#ef4444', key: 'temperaturaAmbiente', isPercentage: false, umbralRef: 'max' }
    };
    
    const config = metricConfig[activeMetric];
    const rawData = historial[activeMetric as keyof HistorialData];
    const sensorInfo = sensores[activeMetric as keyof typeof sensores];

    const filterDataByTime = (data: HistoricoPunto[], range: string) => {
      if (data.length === 0) return [];
      const now = new Date().getTime();
      const limits = { '6h': 6 * 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000 };
      const cutoff = now - limits[range as keyof typeof limits];
      
      return data.filter(d => new Date(d.fecha).getTime() >= cutoff).map(d => {
        const dateObj = new Date(d.fecha);
        const xLabel = range === '7d' 
          ? dateObj.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })
          : dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        return { ...d, xLabel, valorReal: d.valor };
      });
    };

    const chartData = filterDataByTime(rawData, timeRange);
    const umbralVisual = sensorInfo?.umbral ? sensorInfo.umbral[config.umbralRef] : null;

    return (
      <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', height: '100%' }}>
        <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
          <Flex gap="3" align="center">
            <Select.Root value={activeMetric} onValueChange={(val: any) => setActiveMetric(val)}>
              <Select.Trigger style={{ background: 'transparent', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', border: 'none', padding: 0 }} />
              <Select.Content>
                <Select.Item value="humedadSuelo">Humedad del suelo</Select.Item>
                <Select.Item value="humedadAmbiente">Humedad ambiente</Select.Item>
                <Select.Item value="temperaturaSuelo">Temperatura suelo</Select.Item>
                <Select.Item value="temperaturaAmbiente">Temperatura ambiente</Select.Item>
              </Select.Content>
            </Select.Root>
            <Text size="3" color="gray">— últimas {timeRange}</Text>
          </Flex>

          <Flex gap="2">
            {['6h', '24h', '7d'].map((range) => (
              <Button key={range} variant={timeRange === range ? "soft" : "outline"} color={timeRange === range ? "green" : "gray"} onClick={() => setTimeRange(range as any)} style={{ cursor: 'pointer' }}>
                {range}
              </Button>
            ))}
          </Flex>
        </Flex>

        {chartData.length === 0 ? (
          <Flex align="center" justify="center" style={{ height: '250px' }}>
            <Text color="gray">No hay datos históricos en este rango de tiempo.</Text>
          </Flex>
        ) : (
          <Box style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="xLabel" stroke="#4b5563" fontSize={12} tickMargin={10} minTickGap={20} />
                <YAxis stroke="#4b5563" fontSize={12} domain={config.isPercentage ? [0, 100] : ['auto', 'auto']} tickFormatter={(val) => `${val}${config.isPercentage ? '%' : '°'}`} />
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} labelStyle={{ color: '#9ca3af', marginBottom: '4px' }} formatter={(value: any) => [`${value}${sensorInfo?.unidad || ''}`, config.title]} />
                {umbralVisual !== null && (
                  <ReferenceLine y={umbralVisual} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: `${config.umbralRef === 'min' ? 'mín' : 'máx'} ${umbralVisual}${config.isPercentage ? '%' : '°'}`, fill: '#ef4444', fontSize: 12 }} />
                )}
                <Line type="monotone" dataKey="valorReal" stroke={config.color} strokeWidth={3} dot={false} activeDot={{ r: 6, fill: config.color, stroke: '#111827', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Card>
    );
  };

  // --- SUB-COMPONENTE: ESTADO DEL SISTEMA ---
  const EstadoSistemaCard = ({ dispositivos }: { dispositivos: DispositivoData[] }) => {
    return (
      <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px' }}>
        <Text size="3" weight="bold" color="indigo" mb="4" as="div">
          Estado del sistema
        </Text>
        {dispositivos.length === 0 ? (
          <Text color="gray">No hay dispositivos asignados.</Text>
        ) : (
          <Flex direction="column" gap="3">
            {dispositivos.map((disp, index) => {
              const isOnline = disp.estado === 'activo';
              return (
                <Flex key={disp.id} justify="between" align="center" style={{ borderBottom: index !== dispositivos.length - 1 ? '1px solid #1f2937' : 'none', paddingBottom: index !== dispositivos.length - 1 ? '12px' : '0' }}>
                  <Flex align="center" gap="3">
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#ef4444', boxShadow: isOnline ? '0 0 8px #22c55e' : '0 0 8px #ef4444' }} />
                    <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>{disp.nombre}</Text>
                  </Flex>
                  <Text size="2" style={{ color: isOnline ? '#22c55e' : '#ef4444', fontFamily: 'monospace' }}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                </Flex>
              );
            })}
          </Flex>
        )}
      </Card>
    );
  };

  // --- SUB-COMPONENTE: TARJETA DEL TANQUE ---
  const TanqueCard = ({ tanque }: { tanque: TanqueData }) => {
    const [bombaActiva, setBombaActiva] = useState(tanque?.bombaEncendida || false);
    if (!tanque) return null;
    const handleToggleBomba = async (checked: boolean) => {
      setBombaActiva(checked);
      if (!tanque.idTelemetria) { setBombaActiva(!checked); return; }
      try {
        const res = await fetch('/api/iot/bomba', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idTelemetria: tanque.idTelemetria, estado: checked }) });
        if (!res.ok) throw new Error();
      } catch (e) { setBombaActiva(!checked); alert("Error en conexión."); }
    };
    return (
      <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', height: '100%' }}>
        <Flex direction="column" justify="between" style={{ height: '100%' }}>
          <Box>
            <Text size="3" weight="bold" color="indigo" as="div">{tanque.nombre}</Text>
            <Flex align="baseline" gap="2" mt="2">
              <Text size="9" weight="bold" color="sky" style={{ letterSpacing: '-1px' }}>{tanque.litrosActuales}</Text>
              <Text size="4" color="gray" weight="medium">/ {tanque.litrosTotales} L</Text>
            </Flex>
            <Box mt="2">
              <Progress value={tanque.porcentaje} size="3" color={tanque.porcentaje < 20 ? 'red' : 'blue'} style={{ background: '#1f2937' }} />
              <Text size="2" color="gray" mt="3" as="div" style={{ fontFamily: 'monospace' }}>{tanque.porcentaje}% · {tanque.sensorModelo.replace('Sensor Ultrasónico ', '')} · Nivel {tanque.estadoNivel}</Text>
            </Box>
          </Box>
        </Flex>
      </Card>
    );
  };

  // --- SUB-COMPONENTE: GRÁFICO DE CONSUMO ---
  const ConsumoChartCard = ({ data, limite }: { data: ConsumoData[], limite: number | null }) => {
    const maxDataValor = Math.max(...data.map(d => d.valor), 1); 
    const maxValor = limite ? Math.max(maxDataValor, limite) * 1.1 : maxDataValor * 1.1; 
    return (
      <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', height: '100%' }}>
        <Text size="3" weight="bold" color="indigo" mb="5" as="div">Consumo de agua — últimos 7 días</Text>
        <Flex justify="between" align="end" style={{ height: '150px', position: 'relative', marginTop: '15px' }}>
          <Box style={{ position: 'absolute', width: '100%', height: '1px', background: '#1f2937', bottom: '25%' }} />
          <Box style={{ position: 'absolute', width: '100%', height: '1px', background: '#1f2937', bottom: '50%' }} />
          <Box style={{ position: 'absolute', width: '100%', height: '1px', background: '#1f2937', bottom: '75%' }} />
          {limite !== null && (
            <Box style={{ position: 'absolute', width: '100%', height: '1px', borderTop: '2px dashed #ef4444', bottom: `${(limite / maxValor) * 100}%`, zIndex: 0 }}>
              <Text size="1" style={{ color: '#ef4444', position: 'absolute', top: '-20px', right: '0' }}>Límite: {limite}L</Text>
            </Box>
          )}
          {data.map((dia, idx) => {
            const hp = (dia.valor / maxValor) * 100; 
            const sobrepaso = limite !== null && dia.valor > limite;
            return (
              <Flex key={idx} direction="column" justify="end" align="center" gap="2" style={{ zIndex: 1, width: '12%', height: '100%' }}>
                <Text size="2" weight="bold" style={{ color: sobrepaso ? '#ef4444' : '#38bdf8' }}>{dia.valor > 0 ? `${dia.valor}L` : ''}</Text>
                <Box style={{ width: '100%', height: `${hp}%`, minHeight: '4px', background: sobrepaso ? 'linear-gradient(180deg, #f87171 0%, #991b1b 100%)' : 'linear-gradient(180deg, #0ea5e9 0%, #1e3a8a 100%)', borderRadius: '6px', transition: 'height 0.3s ease' }} />
                <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>{dia.label}</Text>
              </Flex>
            );
          })}
        </Flex>
      </Card>
    );
  };

  // --- SUB-COMPONENTE: RESUMEN DEL DÍA ---
  const ResumenDiaCard = ({ resumen }: { resumen: ResumenDiaData }) => {
    const Row = ({ label, value, color = '#38bdf8', isLast = false }: { label: string, value: string, color?: string, isLast?: boolean }) => (
      <Flex justify="between" align="center" py="3" style={{ borderBottom: isLast ? 'none' : '1px solid #1f2937' }}>
        <Text size="2" style={{ color: '#9ca3af', fontFamily: 'monospace' }}>{label}</Text>
        <Text size="2" weight="bold" style={{ color, fontFamily: 'monospace' }}>{value}</Text>
      </Flex>
    );
    return (
      <Card size="3" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px', height: '100%' }}>
        <Text size="3" weight="bold" color="indigo" mb="3" as="div">Resumen del día</Text>
        <Box>
          <Row label="Riegos hoy" value={`${resumen.riegosHoy} evento${resumen.riegosHoy !== 1 ? 's' : ''}`} />
          <Row label="Litros consumidos" value={`${resumen.litrosHoy} L`} />
          <Row label="Último riego" value={getTimeAgo(resumen.ultimoRiego)} />
          <Row label="Hum. suelo prom." value={resumen.humedadSueloProm !== null ? `${resumen.humedadSueloProm.toFixed(1)}%` : '--'} color="#4ade80" />
          <Row label="Hum. ambiental" value={resumen.humedadAmbiental !== null ? `${resumen.humedadAmbiental.toFixed(1)}%` : '--'} color="#4ade80" isLast />
        </Box>
      </Card>
    );
  };

  // --- RENDER PRINCIPAL ---
  return (
    <Box>
      {/* HEADER: Título y Selector alineado a la estética del Dashboard */}
      <Flex justify="between" align="center" mb="6" wrap="wrap" gap="3">
        <Box>
          <Text size="6" weight="bold" color="indigo" as="div" mb="1">Dashboard</Text>
          <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
            {cultivoActivo.nombreCultivo} · {cultivoActivo.conceptoPlanta} {cultivoActivo.etapaCrecimiento ? `· Fase ${cultivoActivo.etapaCrecimiento.toLowerCase()}` : ''}
          </Text>
        </Box>
        <Select.Root value={selectedId} onValueChange={setSelectedId}>
          <Select.Trigger style={{ minWidth: '250px', background: '#111827', borderColor: '#1f2937' }} />
          <Select.Content>
            {cultivos.map((c) => <Select.Item key={c.idCultivo} value={c.idCultivo.toString()}>{c.nombreCultivo}</Select.Item>)}
          </Select.Content>
        </Select.Root>
      </Flex>

      <Flex direction="column" gap="5">
        
        {/* ROW 1: Cuadrícula de Sensores Principales */}
        <Grid columns={{ initial: '1', sm: '2', lg: '4' }} gap="4">
          <SensorCard sensor={cultivoActivo.sensores.humedadSuelo} colorBase="sky" />
          <SensorCard sensor={cultivoActivo.sensores.humedadAmbiente} colorBase="sky" />
          <SensorCard sensor={cultivoActivo.sensores.temperaturaAmbiente} colorBase="orange" />
          <SensorCard sensor={cultivoActivo.sensores.temperaturaSuelo} colorBase="sky" />
        </Grid>

        {/* ROW 2: Gráfico Histórico (2/3) + Estado y Tanque (1/3) */}
        <Flex direction={{ initial: 'column', lg: 'row' }} gap="4">
          <Box style={{ flex: 2, minWidth: 0 }}>
            <HistoricoSensoresCard historial={cultivoActivo.historialSensores} sensores={cultivoActivo.sensores} />
          </Box>
          <Flex direction="column" gap="4" style={{ flex: 1, minWidth: 0 }}>
            <EstadoSistemaCard dispositivos={cultivoActivo.dispositivos} />
            {cultivoActivo.tanque && <TanqueCard tanque={cultivoActivo.tanque} />}
          </Flex>
        </Flex>

        {/* ROW 3: Gráfico Consumo Semanal (2/3) + Resumen Diario (1/3) */}
        <Flex direction={{ initial: 'column', lg: 'row' }} gap="4">
          <Box style={{ flex: 2, minWidth: 0 }}>
            {cultivoActivo.consumoSemanal && (
              <ConsumoChartCard data={cultivoActivo.consumoSemanal} limite={cultivoActivo.limiteConsumo} />
            )}
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <ResumenDiaCard resumen={cultivoActivo.resumenDia} />
          </Box>
        </Flex>

      </Flex>
    </Box>
  );
}