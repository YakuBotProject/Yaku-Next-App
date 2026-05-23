# 📡 Guía de Endpoints de Sensores - Yaku API

## 🌐 Base URL
```
http://localhost:3000/api
```

---

## 📊 Endpoints Disponibles

### 1️⃣ Registrar una Lectura Individual

**POST** `/sensores/lecturas`

Registra una sola lectura de sensor.

#### Ejemplo - cURL
```bash
curl -X POST http://localhost:3000/api/sensores/lecturas \
  -H "Content-Type: application/json" \
  -d '{
    "id_sensor": 1,
    "id_cultivo": 1,
    "valor": 65.5,
    "tipo_variable": "humedad_suelo"
  }'
```

#### Ejemplo - JavaScript
```javascript
async function registrarLectura() {
  const response = await fetch('http://localhost:3000/api/sensores/lecturas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_sensor: 1,
      id_cultivo: 1,
      valor: 65.5,
      tipo_variable: 'humedad_suelo'
    })
  })
  const data = await response.json()
  console.log(data)
}
```

#### Ejemplo - Python
```python
import requests
import json

data = {
    "id_sensor": 1,
    "id_cultivo": 1,
    "valor": 65.5,
    "tipo_variable": "humedad_suelo"
}

response = requests.post(
    'http://localhost:3000/api/sensores/lecturas',
    json=data,
    headers={'Content-Type': 'application/json'}
)
print(response.json())
```

#### Respuesta Exitosa (201)
```json
{
  "success": true,
  "message": "Lectura registrada correctamente",
  "data": {
    "id_lectura": 1,
    "id_sensor": 1,
    "id_cultivo": 1,
    "valor": 65.5,
    "tipo_variable": "humedad_suelo",
    "fecha_hora": "2026-05-22T14:30:00.000Z"
  }
}
```

---

### 2️⃣ Registrar Múltiples Lecturas (Batch)

**POST** `/sensores/batch`

Registra varias lecturas en un solo request (más eficiente).

#### Ejemplo - cURL
```bash
curl -X POST http://localhost:3000/api/sensores/batch \
  -H "Content-Type: application/json" \
  -d '{
    "lecturas": [
      {
        "id_sensor": 1,
        "id_cultivo": 1,
        "valor": 65.5,
        "tipo_variable": "humedad_suelo"
      },
      {
        "id_sensor": 2,
        "id_cultivo": 1,
        "valor": 24.5,
        "tipo_variable": "temperatura"
      },
      {
        "id_sensor": 3,
        "id_cultivo": 1,
        "valor": 85.2,
        "tipo_variable": "humedad_ambiente"
      }
    ]
  }'
```

#### Ejemplo - JavaScript
```javascript
async function registrarLecturasBatch() {
  const response = await fetch('http://localhost:3000/api/sensores/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lecturas: [
        { id_sensor: 1, id_cultivo: 1, valor: 65.5, tipo_variable: 'humedad_suelo' },
        { id_sensor: 2, id_cultivo: 1, valor: 24.5, tipo_variable: 'temperatura' },
        { id_sensor: 3, id_cultivo: 1, valor: 85.2, tipo_variable: 'humedad_ambiente' }
      ]
    })
  })
  const data = await response.json()
  console.log(data)
}
```

#### Respuesta Exitosa (201)
```json
{
  "success": true,
  "message": "3 lecturas registradas correctamente",
  "insertadas": 3,
  "intentadas": 3
}
```

---

### 3️⃣ Obtener Lecturas de un Sensor

**GET** `/sensores/lecturas?id_sensor=1&limit=100`

Obtiene las últimas lecturas de un sensor específico.

#### Query Parameters
- `id_sensor` (requerido): ID del sensor
- `id_cultivo` (alternativa): ID del cultivo (para filtrar por cultivo)
- `limit`: Cantidad máxima de lecturas (default: 100, max: 1000)

#### Ejemplo - cURL
```bash
curl "http://localhost:3000/api/sensores/lecturas?id_sensor=1&limit=50"
```

#### Ejemplo - JavaScript
```javascript
async function obtenerLecturasDelSensor(id_sensor, limit = 100) {
  const params = new URLSearchParams({ id_sensor, limit })
  const response = await fetch(`http://localhost:3000/api/sensores/lecturas?${params}`)
  const data = await response.json()
  console.log(data)
}

obtenerLecturasDelSensor(1)
```

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id_lectura": 100,
      "id_sensor": 1,
      "id_cultivo": 1,
      "valor": 65.5,
      "tipo_variable": "humedad_suelo",
      "fecha_hora": "2026-05-22T14:30:00.000Z",
      "sensores": { "id_sensor": 1, "tipo_sensor": "DHT22", ... },
      "cultivos": { "id_cultivo": 1, "nombre": "Tomate Cherry", ... }
    },
    ...
  ]
}
```

---

### 4️⃣ Obtener Estadísticas de un Sensor

**GET** `/sensores/[id_sensor]/estadisticas?periodo_horas=24&tipo_variable=humedad_suelo`

Obtiene estadísticas calculadas (promedio, mín, máx, desviación estándar).

#### Query Parameters
- `periodo_horas`: Período de análisis en horas (default: 24)
- `tipo_variable`: Filtrar por tipo de variable (opcional)

#### Ejemplo - cURL
```bash
curl "http://localhost:3000/api/sensores/1/estadisticas?periodo_horas=24"
```

#### Ejemplo - JavaScript
```javascript
async function obtenerEstadisticas(id_sensor, periodo_horas = 24) {
  const response = await fetch(
    `http://localhost:3000/api/sensores/${id_sensor}/estadisticas?periodo_horas=${periodo_horas}`
  )
  const data = await response.json()
  console.log(data)
}

obtenerEstadisticas(1)
```

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "sensor": {
    "id_sensor": 1,
    "tipo_sensor": "DHT22",
    "unidad": "%",
    "estado": "activo"
  },
  "periodo_horas": 24,
  "tipo_variable": "todos",
  "count": 48,
  "estadisticas": {
    "promedio": 65.32,
    "minimo": 58.5,
    "maximo": 72.8,
    "desviacion_estandar": 4.25
  },
  "primera_lectura": "2026-05-21T14:30:00.000Z",
  "ultima_lectura": "2026-05-22T14:30:00.000Z"
}
```

---

### 5️⃣ Obtener Lecturas de un Cultivo

**GET** `/cultivos/[id_cultivo]/lecturas?limit=100&tipo_variable=humedad_suelo&horas=24`

Obtiene todas las lecturas de sensores asociados a un cultivo.

#### Query Parameters
- `limit`: Cantidad de lecturas (default: 100, max: 1000)
- `tipo_variable`: Filtrar por tipo (opcional)
- `horas`: Datos de las últimas X horas (opcional)

#### Ejemplo - cURL
```bash
curl "http://localhost:3000/api/cultivos/1/lecturas?limit=100&horas=24"
```

#### Ejemplo - JavaScript
```javascript
async function obtenerLecturasCultivo(id_cultivo, horas = 24) {
  const params = new URLSearchParams({ horas, limit: 100 })
  const response = await fetch(
    `http://localhost:3000/api/cultivos/${id_cultivo}/lecturas?${params}`
  )
  const data = await response.json()
  console.log(data)
}

obtenerLecturasCultivo(1)
```

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "cultivo": {
    "id_cultivo": 1,
    "nombre": "Tomate Cherry - Fase Reactiva",
    "planta": "Tomate Cherry",
    "etapa": "fructificación",
    "estado": "activo"
  },
  "resumen": {
    "total_lecturas": 150,
    "tipos_variables": ["humedad_suelo", "temperatura", "humedad_ambiente"],
    "filtros_aplicados": {
      "tipo_variable": "ninguno",
      "horas": "24",
      "limit": 100
    }
  },
  "lecturas_agrupadas": {
    "humedad_suelo": [...],
    "temperatura": [...],
    "humedad_ambiente": [...]
  },
  "ultima_lectura": "2026-05-22T14:30:00.000Z"
}
```

---

### 6️⃣ Obtener Información de un Dispositivo

**GET** `/dispositivos/[id_dispositivo]`

Obtiene información del dispositivo y sus sensores asociados con últimas lecturas.

#### Ejemplo - cURL
```bash
curl "http://localhost:3000/api/dispositivos/1"
```

#### Ejemplo - JavaScript
```javascript
async function obtenerDispositivo(id_dispositivo) {
  const response = await fetch(`http://localhost:3000/api/dispositivos/${id_dispositivo}`)
  const data = await response.json()
  console.log(data)
}

obtenerDispositivo(1)
```

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "id_dispositivo": 1,
    "nombre": "ESP32-Invernadero-1",
    "ubicacion": "Invernadero A",
    "estado": "activo",
    "fecha_registro": "2026-05-01T10:00:00.000Z",
    "sensores": [
      {
        "id_sensor": 1,
        "tipo_sensor": "DHT22",
        "unidad": "%",
        "estado": "activo",
        "lecturas_sensor": [
          {
            "id_lectura": 1,
            "valor": 65.5,
            "tipo_variable": "humedad_suelo",
            "fecha_hora": "2026-05-22T14:30:00.000Z"
          }
        ]
      }
    ],
    "riego": [...]
  }
}
```

---

### 7️⃣ Actualizar Estado de Dispositivo

**PUT** `/dispositivos/[id_dispositivo]`

Actualiza el estado de un dispositivo (activo, inactivo, error).

#### Ejemplo - cURL
```bash
curl -X PUT http://localhost:3000/api/dispositivos/1 \
  -H "Content-Type: application/json" \
  -d '{"estado": "inactivo"}'
```

#### Ejemplo - JavaScript
```javascript
async function actualizarEstadoDispositivo(id_dispositivo, estado) {
  const response = await fetch(
    `http://localhost:3000/api/dispositivos/${id_dispositivo}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    }
  )
  const data = await response.json()
  console.log(data)
}

actualizarEstadoDispositivo(1, 'activo')
```

---

### 8️⃣ Obtener Todos los Sensores

**GET** `/sensores?id_dispositivo=1&estado=activo`

Obtiene lista de sensores con filtros opcionales.

#### Query Parameters
- `id_dispositivo`: Filtrar por dispositivo (opcional)
- `estado`: Filtrar por estado (opcional)

#### Ejemplo - cURL
```bash
curl "http://localhost:3000/api/sensores?estado=activo"
```

---

## 🧪 Tipos de Variables Recomendados

Estos son los tipos de variables que puedes usar en el campo `tipo_variable`:

```
- humedad_suelo
- temperatura
- temperatura_suelo
- humedad_ambiente
- presion_aire
- radiacion_solar
- velocidad_viento
- ph_suelo
- conductividad_electrica
- co2
- nivel_agua
```

---

## ⚠️ Códigos de Error

| Código | Descripción |
|--------|-------------|
| **400** | Solicitud inválida (faltan campos requeridos) |
| **404** | Recurso no encontrado (sensor, cultivo o dispositivo) |
| **500** | Error interno del servidor |

---

## 📝 Ejemplo Completo - Arduino/ESP32

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "TU_SSID";
const char* password = "TU_PASSWORD";
const char* serverUrl = "http://192.168.1.100:3000/api/sensores/lecturas";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.println("Conectando...");
  }
  Serial.println("Conectado!");
}

void loop() {
  if (WiFi.connected()) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Crear JSON con las lecturas
    String payload = "{\"id_sensor\":1,\"id_cultivo\":1,\"valor\":65.5,\"tipo_variable\":\"humedad_suelo\"}";
    
    int httpResponseCode = http.POST(payload);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println(response);
    }
    
    http.end();
  }
  
  delay(60000); // Enviar cada minuto
}
```

---

## 🚀 Notas Importantes

- **Sin autenticación**: Estos endpoints están abiertos para facilitar pruebas. En producción, agrega autenticación.
- **Validación de datos**: Verifica que los `id_sensor` y `id_cultivo` existan en la BD.
- **Rate limiting**: Considera agregar límites de velocidad en producción.
- **Timezone**: Todas las fechas están en UTC (2026-05-22T14:30:00.000Z).

---

## ✨ Próximos Pasos

- Agregar autenticación por API Key o JWT
- Implementar rate limiting
- Agregar compresión de datos
- Crear WebSocket para actualizaciones en tiempo real
