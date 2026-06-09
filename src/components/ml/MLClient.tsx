// src/components/ml/MLClient.tsx
"use client";

import { Box, Text, Flex, Card, Button, Badge } from '@radix-ui/themes';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Legend } from 'recharts';

export default function MLClient({ data }: any) {
  const { modelo, historial, umbral } = data;

  const handleFastAPIRequest = () => {
    // Aquí irá tu fetch('http://tu-fastapi-url/predict', { ... })
    alert("📡 El microservicio de FastAPI aún no está conectado. Endpoint pendiente.");
  };

  return (
    <Box>
      {/* HEADER: Metadatos extraídos de la Base de Datos */}
      <Flex justify="between" align="start" mb="6" wrap="wrap" gap="4">
        <Box>
          <Text size="6" weight="bold" color="indigo" as="div">Machine Learning</Text>
          <Text size="3" style={{ color: '#9ca3af', fontFamily: 'monospace' }}>
            {modelo.algoritmo} · {modelo.nombre} v{modelo.version} · 4 features + hora del día · MAE {modelo.mae}%
          </Text>
          
          <Flex gap="2" mt="4" wrap="wrap">
            <Text size="2" color="gray" mr="2" style={{ alignSelf: 'center' }}>Features del modelo:</Text>
            <Badge color="green" variant="outline">Hum. suelo</Badge>
            <Badge color="blue" variant="outline">Hum. ambiental</Badge>
            <Badge color="orange" variant="outline">Temp. ambiental</Badge>
            <Badge color="sky" variant="outline">Temp. suelo</Badge>
            <Badge color="gray" variant="outline">Hora del día</Badge>
          </Flex>
        </Box>

        <Flex gap="3" align="center">
          {modelo.activo ? (
            <Badge color="purple" size="2" style={{ padding: '6px 12px', borderRadius: '8px' }}>
              🧠 Modelo activo
            </Badge>
          ) : (
            <Badge color="gray" size="2">Modelo inactivo</Badge>
          )}
          <Button variant="outline" color="gray" style={{ cursor: 'pointer' }}>
            Reentrenar modelo
          </Button>
        </Flex>
      </Flex>

      {/* GRÁFICO PRINCIPAL */}
      <Card size="4" style={{ background: '#111827', borderColor: '#1f2937', borderRadius: '16px' }}>
        <Flex justify="between" mb="5">
          <Text size="4" weight="bold" color="indigo">Predicción y telemetría de parámetros</Text>
          <Text size="2" color="gray">Próximas 2 horas (FastAPI)</Text>
        </Flex>

        <Box style={{ width: '100%', height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historial} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              
              <XAxis dataKey="hora" stroke="#4b5563" fontSize={12} tickMargin={10} />
              
              {/* Eje Y para Humedad (%) */}
              <YAxis yAxisId="humedad" stroke="#4b5563" fontSize={12} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
              
              {/* Eje Y para Temperatura (°C) */}
              <YAxis yAxisId="temperatura" orientation="right" stroke="#4b5563" fontSize={12} tickFormatter={(val) => `${val}°`} domain={[0, 50]} />
              
              <Tooltip 
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} 
                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />

              {/* Línea de Umbral Crítico Mínimo de Humedad */}
              <ReferenceLine y={umbral} yAxisId="humedad" stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: `${umbral}% mín`, fill: '#ef4444', fontSize: 12 }} />

              {/* Líneas de datos reales */}
              <Line yAxisId="humedad" type="monotone" dataKey="humSuelo" name="Hum. Suelo Real" stroke="#22c55e" strokeWidth={3} dot={false} />
              <Line yAxisId="humedad" type="monotone" dataKey="humAmb" name="Hum. Ambiental" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line yAxisId="temperatura" type="monotone" dataKey="tempAmb" name="Temp. Ambiental" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line yAxisId="temperatura" type="monotone" dataKey="tempSuelo" name="Temp. Suelo" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {/* INTEGRACIÓN FASTAPI (PLACEHOLDER) */}
        <Flex justify="between" align="center" mt="5" p="4" style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '12px' }}>
          <Flex gap="4" align="center">
            <Text size="8" style={{ filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))' }}>🧠</Text>
            <Box>
              <Text color="purple" weight="bold" as="div" mb="1">Predicción del modelo (FastAPI)</Text>
              <Text color="gray" size="2">Generar proyecciones futuras y evaluar estrés hídrico. (No conectado)</Text>
            </Box>
          </Flex>
          <Button color="purple" variant="soft" onClick={handleFastAPIRequest} style={{ cursor: 'pointer' }}>
            Solicitar predicción
          </Button>
        </Flex>
      </Card>
    </Box>
  );
}