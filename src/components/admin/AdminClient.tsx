// src/components/admin/AdminClient.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Box, Text, Flex, Card, Button, Grid, Table, Badge, Tabs, Select, Dialog, TextField, ScrollArea } from '@radix-ui/themes';
import { 
  cambiarEstadoUsuario, 
  cambiarRolUsuario, 
  asignarDispositivoACultivo, 
  liberarDispositivoAStock,
  registrarRegion,
  registrarProvincia,
  registrarDistrito,
  registrarPlanta,
  registrarDispositivo,
  registrarComponente,
  registrarUsuario,
  asignarComponenteADispositivo,
  obtenerSiguienteClientId,
  liberarComponenteAStock,
  cambiarEstadoDispositivoStock,
  cambiarEstadoComponenteStock
} from '@/actions/admin';
import { registrarAlmacen, eliminarAlmacen } from '@/actions/almacenes';
import { Shield, User, Power, RefreshCw, HardDrive, Cpu, Layers, Tag, MapPin, Plus, Warehouse, X } from 'lucide-react';

export default function AdminClient({ 
  initialUsers, 
  initialDevices, 
  initialCrops,
  tiposDispositivo = [],
  tiposComponente = [],
  catalogPlantas = [],
  regiones = [],
  provincias = [],
  distritos = [],
  initialAlmacenes = [],
  initialComponents = [],
  fuentesAgua = [],
  metricas = [],
  activeTab = "usuarios"
}: any) {
  const [users, setUsers] = useState(initialUsers);
  const [currentPageUsers, setCurrentPageUsers] = useState(1);
  const pageSizeUsers = 8;
  const [devices, setDevices] = useState(initialDevices);
  const [crops, setCrops] = useState(initialCrops);
  const [almacenesList, setAlmacenesList] = useState(initialAlmacenes);
  const [components, setComponents] = useState(initialComponents);
  const [isPending, startTransition] = useTransition();

  const getAlmacenLocationString = (idDistrito: number) => {
    if (!idDistrito) return "Sin ubicación";
    const dist = distritos.find((d: any) => d.id === idDistrito);
    if (!dist) return `Distrito #${idDistrito}`;
    const prov = provincias.find((p: any) => p.id === dist.id_provincia);
    if (!prov) return dist.nombre;
    const reg = regiones.find((r: any) => r.id === prov.id_region);
    if (!reg) return `${dist.nombre}, ${prov.nombre}`;
    return `${dist.nombre}, ${prov.nombre} (${reg.nombre})`;
  };

  // Dialog state for component assignment
  const [selectedDeviceForComponent, setSelectedDeviceForComponent] = useState<any>(null);
  const [assignCompId, setAssignCompId] = useState<string>("");
  const [assignPinGpio, setAssignPinGpio] = useState<string>("");
  const [assignMetricIds, setAssignMetricIds] = useState<string[]>([]);
  const [assignFuenteAguaId, setAssignFuenteAguaId] = useState<string>("");

  // Dialog state for device assignment
  const [isOpenAssignDevice, setIsOpenAssignDevice] = useState(false);
  const [assignDeviceId, setAssignDeviceId] = useState<string>("");
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assignCropId, setAssignCropId] = useState<string>("");
  const [assignDeviceCompId, setAssignDeviceCompId] = useState<string>("");
  const [assignDevicePinGpio, setAssignDevicePinGpio] = useState<string>("");
  const [assignDeviceMetricIds, setAssignDeviceMetricIds] = useState<string[]>([]);
  const [assignDeviceFuenteAguaId, setAssignDeviceFuenteAguaId] = useState<string>("");

  // States for new device creation modal
  const [isOpenRegisterDevice, setIsOpenRegisterDevice] = useState(false);
  const [newDeviceTipoId, setNewDeviceTipoId] = useState<string>("1");
  const [newDeviceNombre, setNewDeviceNombre] = useState("");
  const [newDeviceMac, setNewDeviceMac] = useState("");
  const [newDeviceMqtt, setNewDeviceMqtt] = useState("");
  const [newDevicePub, setNewDevicePub] = useState("");
  const [newDeviceSub, setNewDeviceSub] = useState("");
  const [newDeviceAlmacenId, setNewDeviceAlmacenId] = useState<string>("");
  const [newDeviceFirmware, setNewDeviceFirmware] = useState("v1.0.0");
  
  useEffect(() => {
    if (isOpenRegisterDevice) {
      // Default to "1" if type not set
      if (!newDeviceTipoId) {
        if (tiposDispositivo && tiposDispositivo.length > 0) {
          setNewDeviceTipoId(tiposDispositivo[0].id.toString());
        } else {
          setNewDeviceTipoId("1");
        }
      }

      // Fetch next Client ID MQTT from database lookup
      const fetchNextClientId = async () => {
        try {
          const res = await obtenerSiguienteClientId();
          if (res && res.siguiente_client_id) {
            setNewDeviceMqtt(res.siguiente_client_id);
          }
        } catch (error) {
          console.error("Error fetching next MQTT Client ID from database:", error);
          // Fallback client-side calculation
          let maxNum = 0;
          devices.forEach((d: any) => {
            if (d.client_id_mqtt && d.client_id_mqtt.startsWith("ESP32_Yaku_")) {
              const parts = d.client_id_mqtt.split("_");
              const numStr = parts[parts.length - 1];
              const num = parseInt(numStr, 10);
              if (!isNaN(num) && num > maxNum) {
                maxNum = num;
              }
            }
          });
          const nextNum = maxNum + 1;
          setNewDeviceMqtt(`ESP32_Yaku_${nextNum.toString().padStart(3, '0')}`);
        }
      };

      fetchNextClientId();
    }
  }, [isOpenRegisterDevice, devices, tiposDispositivo]);

  // Separate useEffect to reactively set default topics based on device type ID
  useEffect(() => {
    if (isOpenRegisterDevice) {
      if (newDeviceTipoId === "1") {
        setNewDevicePub("yaku/riego/datos");
        setNewDeviceSub("yaku/valvula/comando");
      } else if (newDeviceTipoId === "2") {
        setNewDevicePub("yaku/tanque/datos");
        setNewDeviceSub("yaku/riego/comando");
      } else {
        setNewDevicePub("");
        setNewDeviceSub("");
      }
    }
  }, [isOpenRegisterDevice, newDeviceTipoId]);

  // States for new component creation modal
  const [isOpenRegisterComponent, setIsOpenRegisterComponent] = useState(false);
  const [newCompTipoId, setNewCompTipoId] = useState<string>("");
  const [newCompSerial, setNewCompSerial] = useState("");
  const [newCompAlmacenId, setNewCompAlmacenId] = useState<string>("");
  const [newCompEstado, setNewCompEstado] = useState("disponible");

  // States for new warehouse creation modal
  const [isOpenRegisterAlmacen, setIsOpenRegisterAlmacen] = useState(false);
  const [newAlmacenNombre, setNewAlmacenNombre] = useState("");
  const [newAlmacenRegionId, setNewAlmacenRegionId] = useState("");
  const [newAlmacenProvinciaId, setNewAlmacenProvinciaId] = useState("");
  const [newAlmacenDistritoId, setNewAlmacenDistritoId] = useState("");
  const [newAlmacenDireccion, setNewAlmacenDireccion] = useState("");

  const filteredProvinciasForAlmacen = provincias.filter((p: any) => p.id_region.toString() === newAlmacenRegionId);
  const filteredDistritosForAlmacen = distritos.filter((d: any) => d.id_provincia.toString() === newAlmacenProvinciaId);

  // States for Plant creation
  const [newPlantNombre, setNewPlantNombre] = useState("");
  const [newPlantTipo, setNewPlantTipo] = useState("");
  const [newPlantDesc, setNewPlantDesc] = useState("");
  const [minHumSuelo, setMinHumSuelo] = useState<string>("");
  const [maxHumSuelo, setMaxHumSuelo] = useState<string>("");
  const [minHumAmb, setMinHumAmb] = useState<string>("");
  const [maxHumAmb, setMaxHumAmb] = useState<string>("");
  const [minTempAmb, setMinTempAmb] = useState<string>("");
  const [maxTempAmb, setMaxTempAmb] = useState<string>("");
  const [minTempSuelo, setMinTempSuelo] = useState<string>("");
  const [maxTempSuelo, setMaxTempSuelo] = useState<string>("");

  // States for location creation
  const [newRegionNombre, setNewRegionNombre] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [newProvinciaNombre, setNewProvinciaNombre] = useState("");
  const [selectedProvinciaId, setSelectedProvinciaId] = useState<string>("");
  const [newDistritoNombre, setNewDistritoNombre] = useState("");
  // States for User registration
  const [isOpenRegisterUser, setIsOpenRegisterUser] = useState(false);
  const [newUserNombre, setNewUserNombre] = useState("");
  const [newUserApellido, setNewUserApellido] = useState("");
  const [newUserCorreo, setNewUserCorreo] = useState("");
  const [newUserTelefono, setNewUserTelefono] = useState("");
  const [newUserContrasena, setNewUserContrasena] = useState("");
  const [newUserRolId, setNewUserRolId] = useState<string>("2"); // default to 2 (agricultor)

  const [isOpenRegisterPlant, setIsOpenRegisterPlant] = useState(false);
  const [isOpenRegisterGeo, setIsOpenRegisterGeo] = useState(false);
  const [newGeoLevel, setNewGeoLevel] = useState<string>("departamento");

  const handleToggleEstadoUser = async (userId: number, currentEstado: boolean) => {
    startTransition(async () => {
      try {
        const res = await cambiarEstadoUsuario(userId, !currentEstado);
        if (res.status === "ok") {
          setUsers((prev: any) =>
            prev.map((u: any) => (u.id === userId ? { ...u, estado: !currentEstado } : u))
          );
        }
      } catch (err: any) {
        alert(`❌ Error: ${err.message}`);
      }
    });
  };

  const handleToggleRolUser = async (userId: number, currentRolId: number) => {
    const nextRolId = currentRolId === 1 ? 2 : 1; // 1 = Admin, 2 = Agricultor
    startTransition(async () => {
      try {
        const res = await cambiarRolUsuario(userId, nextRolId);
        if (res.status === "ok") {
          setUsers((prev: any) =>
            prev.map((u: any) => (u.id === userId ? { ...u, id_rol: nextRolId, rol: { ...u.rol, nombre: nextRolId === 1 ? 'administrador' : 'agricultor' } } : u))
          );
        }
      } catch (err: any) {
        alert(`❌ Error: ${err.message}`);
      }
    });
  };

  const handleConfirmAssign = async () => {
    if (!assignDeviceId || !assignUserId || !assignCropId) {
      alert("Por favor seleccione un dispositivo, usuario y cultivo.");
      return;
    }

    const device = devices.find((d: any) => d.id.toString() === assignDeviceId);
    if (!device) return;

    // Si se seleccionó un componente, validar GPIO y fuente de agua si es actuador
    if (assignDeviceCompId && assignDeviceCompId !== "none") {
      if (!assignDevicePinGpio) {
        alert("Por favor especifique el Pin GPIO para el componente seleccionado.");
        return;
      }
      if (assignDeviceMetricIds.length === 0) {
        alert("Por favor seleccione al menos una métrica para el componente inicial.");
        return;
      }
      const selectedComp = components.find((c: any) => c.id.toString() === assignDeviceCompId);
      if (selectedComp?.modelo?.categoria === 'actuador' && !assignDeviceFuenteAguaId) {
        alert("Por favor seleccione una fuente de agua para el componente actuador.");
        return;
      }
    }

    startTransition(async () => {
      try {
        // 1. Asignar dispositivo
        const resDevice = await asignarDispositivoACultivo(
          device.id,
          parseInt(assignUserId, 10),
          parseInt(assignCropId, 10)
        );
        
        if (resDevice.status === "ok") {
          // 2. Si hay componente, asignarlo también
          if (assignDeviceCompId && assignDeviceCompId !== "none") {
            const payload = {
              id_dispositivo: device.id,
              id_componente: parseInt(assignDeviceCompId, 10),
              pin_gpio: parseInt(assignDevicePinGpio, 10),
              id_tipo_metrica: assignDeviceMetricIds.map(id => parseInt(id, 10)),
              id_fuente_agua: assignDeviceFuenteAguaId ? parseInt(assignDeviceFuenteAguaId, 10) : undefined
            };
            await asignarComponenteADispositivo(payload);
          }

          setIsOpenAssignDevice(false);
          setAssignDeviceId("");
          setAssignUserId("");
          setAssignCropId("");
          setAssignDeviceCompId("");
          setAssignDevicePinGpio("");
          setAssignDeviceMetricIds([]);
          setAssignDeviceFuenteAguaId("");
          alert(`✅ Dispositivo y configuraciones asignados con éxito.`);
          window.location.reload();
        }
      } catch (err: any) {
        alert(`❌ Error al asignar dispositivo o componentes: ${err.message}`);
      }
    });
  };

  const handleConfirmAssignComponent = async () => {
    if (!selectedDeviceForComponent || !assignCompId || !assignPinGpio || assignMetricIds.length === 0) {
      alert("Por favor seleccione un componente, especifique el PIN GPIO y al menos una métrica a medir.");
      return;
    }

    const isActuatorDevice = selectedDeviceForComponent?.id_tipo === 2;
    if (isActuatorDevice && !assignFuenteAguaId) {
      alert("Por favor seleccione una fuente de agua para el dispositivo actuador.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          id_dispositivo: selectedDeviceForComponent.id,
          id_componente: parseInt(assignCompId, 10),
          pin_gpio: parseInt(assignPinGpio, 10),
          id_tipo_metrica: assignMetricIds.map(id => parseInt(id, 10)),
          id_fuente_agua: assignFuenteAguaId ? parseInt(assignFuenteAguaId, 10) : undefined
        };
        const res = await asignarComponenteADispositivo(payload);
        if (res.status === "ok") {
          alert(`✅ Componente asignado con éxito.`);
          setSelectedDeviceForComponent(null);
          setAssignCompId("");
          setAssignPinGpio("");
          setAssignMetricIds([]);
          setAssignFuenteAguaId("");
          window.location.reload();
        }
      } catch (err: any) {
        alert(`❌ Error al asignar componente: ${err.message}`);
      }
    });
  };

  const handleLiberarComponente = async (componenteId: number, nombreComponente: string) => {
    if (!confirm(`¿Está seguro de que desea desvincular el componente '${nombreComponente}'? Esto desactivará todas sus métricas asociadas y lo devolverá al stock.`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await liberarComponenteAStock(componenteId);
        if (res.status === "ok") {
          alert(`✅ Componente '${nombreComponente}' desvinculado con éxito.`);
          window.location.reload();
        }
      } catch (err: any) {
        alert(`❌ Error al desvincular componente: ${err.message}`);
      }
    });
  };

  const handleLiberarDispositivo = async (device: any) => {
    if (!confirm(`¿Está seguro de que desea liberar el dispositivo '${device.nombre}' y devolverlo al almacén/stock?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await liberarDispositivoAStock(device.id);
        if (res.status === "ok") {
          setDevices((prev: any) =>
            prev.map((d: any) =>
              d.id === device.id ? { ...d, estado: "disponible" } : d
            )
          );
          alert(`✅ Dispositivo '${device.nombre}' liberado y devuelto a stock.`);
          window.location.reload();
        }
      } catch (err: any) {
        alert(`❌ Error al liberar dispositivo: ${err.message}`);
      }
    });
  };

  const handleCambiarEstadoDispositivo = async (dispositivoId: number, nombreDispositivo: string, nuevoEstado: string) => {
    let confirmMsg = "";
    if (nuevoEstado === "Retirado") {
      confirmMsg = `¿Está seguro de que desea retirar lógicamente el dispositivo '${nombreDispositivo}' del almacén?`;
    } else if (nuevoEstado === "reparacion") {
      confirmMsg = `¿Está seguro de que desea enviar a reparación el dispositivo '${nombreDispositivo}'?`;
    } else {
      confirmMsg = `¿Está seguro de que desea cambiar el estado del dispositivo '${nombreDispositivo}' a disponible?`;
    }

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        const res = await cambiarEstadoDispositivoStock(dispositivoId, nuevoEstado);
        if (res.status === "ok") {
          alert(`✅ Estado del dispositivo actualizado con éxito.`);
          window.location.reload();
        }
      } catch (err: any) {
        alert(`❌ Error al cambiar estado del dispositivo: ${err.message}`);
      }
    });
  };

  const handleCambiarEstadoComponente = async (componenteId: number, nombreComponente: string, nuevoEstado: string) => {
    let confirmMsg = "";
    if (nuevoEstado === "Retirado") {
      confirmMsg = `¿Está seguro de que desea retirar lógicamente el componente '${nombreComponente}' del almacén?`;
    } else if (nuevoEstado === "reparacion") {
      confirmMsg = `¿Está seguro de que desea enviar a reparación el componente '${nombreComponente}'?`;
    } else {
      confirmMsg = `¿Está seguro de que desea cambiar el estado del componente '${nombreComponente}' a disponible?`;
    }

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        const res = await cambiarEstadoComponenteStock(componenteId, nuevoEstado);
        if (res.status === "ok") {
          alert(`✅ Estado del componente actualizado con éxito.`);
          window.location.reload();
        }
      } catch (err: any) {
        alert(`❌ Error al cambiar estado del componente: ${err.message}`);
      }
    });
  };

  const handleTriggerBackup = async () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/backup');
        if (!res.ok) throw new Error("Error en la descarga");
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yaku_backup_${new Date().toISOString().split('T')[0]}.sql`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        alert("✅ Copia de seguridad generada y descargada con éxito.");
      } catch (err: any) {
        alert(`❌ Error al generar backup: ${err.message}`);
      }
    });
  };

  const handleRegisterDeviceSubmit = async () => {
    if (!newDeviceTipoId || !newDeviceNombre) {
      alert("Por favor ingrese el tipo y nombre del dispositivo.");
      return;
    }
    if (!newDeviceAlmacenId) {
      alert("Por favor seleccione un almacén de destino inicial.");
      return;
    }
    if (!newDeviceMqtt || !newDevicePub || !newDeviceSub) {
      alert("Error: Client ID MQTT, Topic Publicación y Topic Suscripción son obligatorios y deben estar autogenerados.");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          id_tipo: parseInt(newDeviceTipoId, 10),
          nombre: newDeviceNombre,
          mac_address: newDeviceMac || undefined,
          client_id_mqtt: newDeviceMqtt || undefined,
          topic_pub: newDevicePub || undefined,
          topic_sub: newDeviceSub || undefined,
          id_almacen: parseInt(newDeviceAlmacenId, 10),
          firmware_version: newDeviceFirmware || undefined,
          estado: "disponible"
        };
        const res = await registrarDispositivo(payload);
        if (res.id || res.id_dispositivo) {
          alert(`✅ Dispositivo '${newDeviceNombre}' registrado correctamente.`);
          setIsOpenRegisterDevice(false);
          setNewDeviceNombre("");
          setNewDeviceMac("");
          setNewDeviceMqtt("");
          setNewDevicePub("");
          setNewDeviceSub("");
          setNewDeviceAlmacenId("");
          setNewDeviceTipoId("");
          window.location.reload();
        }
      } catch (err: any) {
        alert(`❌ Error al registrar dispositivo: ${err.message}`);
      }
    });
  };

  const handleRegisterComponentSubmit = async () => {
    if (!newCompTipoId) {
      alert("Por favor seleccione un modelo/tipo de componente.");
      return;
    }
    if (!newCompAlmacenId) {
      alert("Por favor seleccione un almacén de destino para el componente.");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          id_tipo_componente: parseInt(newCompTipoId, 10),
          numero_serie: newCompSerial || undefined,
          id_almacen: parseInt(newCompAlmacenId, 10),
          estado: newCompEstado
        };
        const res = await registrarComponente(payload);
        if (res.id) {
          alert(`✅ Componente registrado correctamente.`);
          setIsOpenRegisterComponent(false);
          setNewCompTipoId("");
          setNewCompSerial("");
          setNewCompAlmacenId("");
          window.location.reload();
        }
      } catch (err: any) {
        alert(`❌ Error al registrar componente: ${err.message}`);
      }
    });
  };

  const handleRegisterAlmacenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlmacenNombre) {
      alert("Por favor ingrese el nombre del almacén.");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          nombre: newAlmacenNombre,
          id_distrito: newAlmacenDistritoId ? parseInt(newAlmacenDistritoId, 10) : undefined,
          direccion: newAlmacenDireccion || undefined
        };
        const res = await registrarAlmacen(payload);
        if (res.id) {
          alert(`✅ Almacén '${newAlmacenNombre}' registrado correctamente.`);
          setIsOpenRegisterAlmacen(false);
          setNewAlmacenNombre("");
          setNewAlmacenRegionId("");
          setNewAlmacenProvinciaId("");
          setNewAlmacenDistritoId("");
          setNewAlmacenDireccion("");
          window.location.reload();
        }
      } catch (err: any) {
        alert(`❌ Error al registrar almacén: ${err.message}`);
      }
    });
  };

  const handleDeleteAlmacen = async (idAlmacen: number, nombre: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar el almacén '${nombre}'?`)) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await eliminarAlmacen(idAlmacen);
        if (res.status === "ok") {
          alert(`✅ Almacén '${nombre}' eliminado con éxito.`);
          window.location.reload();
        }
      } catch (err: any) {
        alert(`❌ Error al eliminar almacén: ${err.message}`);
      }
    });
  };

  const handleRegisterUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserNombre || !newUserCorreo || !newUserContrasena) {
      alert("Por favor, complete todos los campos obligatorios.");
      return;
    }
    startTransition(async () => {
      try {
        const payload = {
          nombre: newUserNombre,
          apellido: newUserApellido || undefined,
          correo: newUserCorreo,
          contrasena: newUserContrasena,
          telefono: newUserTelefono || undefined,
          id_rol: parseInt(newUserRolId, 10)
        };
        const res = await registrarUsuario(payload);
        if (res.success || res.userId) {
          alert(`✅ Usuario '${newUserNombre}' registrado correctamente.`);
          setIsOpenRegisterUser(false);
          setNewUserNombre("");
          setNewUserApellido("");
          setNewUserCorreo("");
          setNewUserTelefono("");
          setNewUserContrasena("");
          setNewUserRolId("2");
          window.location.reload();
        }
      } catch (err: any) {
        alert(`❌ Error al registrar usuario: ${err.message}`);
      }
    });
  };

  const handleRegisterPlantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlantNombre) {
      alert("Ingrese el nombre de la planta.");
      return;
    }
    startTransition(async () => {
      try {
        await registrarPlanta(newPlantNombre, newPlantTipo, newPlantDesc);
        alert(`✅ Planta '${newPlantNombre}' agregada con éxito.`);
        setNewPlantNombre("");
        setNewPlantTipo("");
        setNewPlantDesc("");
        window.location.reload();
      } catch (err: any) {
        alert(`❌ Error: ${err.message}`);
      }
    });
  };

  const handleRegisterRegionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionNombre) return;
    startTransition(async () => {
      try {
        await registrarRegion(newRegionNombre);
        alert(`✅ Departamento '${newRegionNombre}' registrado.`);
        setNewRegionNombre("");
        window.location.reload();
      } catch (err: any) {
        alert(`❌ Error: ${err.message}`);
      }
    });
  };

  const handleRegisterProvinciaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegionId || !newProvinciaNombre) {
      alert("Seleccione departamento e ingrese nombre de provincia.");
      return;
    }
    startTransition(async () => {
      try {
        await registrarProvincia(parseInt(selectedRegionId, 10), newProvinciaNombre);
        alert(`✅ Provincia '${newProvinciaNombre}' registrada.`);
        setNewProvinciaNombre("");
        window.location.reload();
      } catch (err: any) {
        alert(`❌ Error: ${err.message}`);
      }
    });
  };

  const handleRegisterDistritoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvinciaId || !newDistritoNombre) {
      alert("Seleccione provincia e ingrese nombre de distrito.");
      return;
    }
    startTransition(async () => {
      try {
        await registrarDistrito(parseInt(selectedProvinciaId, 10), newDistritoNombre);
        alert(`✅ Distrito '${newDistritoNombre}' registrado.`);
        setNewDistritoNombre("");
        window.location.reload();
      } catch (err: any) {
        alert(`❌ Error: ${err.message}`);
      }
    });
  };

  // Filter crops based on selected user for assignment
  const filteredCrops = crops.filter((c: any) => c.id_usuario.toString() === assignUserId);

  return (
    <Box style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      <Flex direction="column" gap="4" mb="6">
        <Box>
          <Text size="6" weight="bold" color="indigo" as="div">Panel de Control del Administrador</Text>
          <Text size="2" color="gray" style={{ fontFamily: 'monospace' }}>
            Consola administrativa para gestionar hardware, roles y auditorías de seguridad.
          </Text>
        </Box>
      </Flex>

      <Tabs.Root value={activeTab}>

        <Box pt="1">
          {/* TAB 1: GESTIÓN DE USUARIOS */}
          <Tabs.Content value="usuarios">
            <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
              <Flex justify="between" align="center" mb="4">
                <Text size="4" weight="bold" color="indigo" as="div">Usuarios del Sistema</Text>
                <Button color="indigo" onClick={() => setIsOpenRegisterUser(true)} style={{ cursor: 'pointer' }}>
                  <Plus size={16} style={{ marginRight: '4px' }} /> Registrar Usuario
                </Button>
              </Flex>
              
              <ScrollArea scrollbars="horizontal" style={{ width: '100%' }}>
                <Table.Root variant="surface" style={{ background: 'transparent', minWidth: '700px' }}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Nombre</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Contacto</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Rol</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Recursos</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Actividad</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Estado</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Acciones</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>

                  <Table.Body>
                    {users.slice((currentPageUsers - 1) * pageSizeUsers, currentPageUsers * pageSizeUsers).map((u: any) => {
                      const isAdmin = u.rol.nombre === 'administrador';
                      const userCropsCount = crops.filter((c: any) => Number(c.id_usuario) === Number(u.id)).length;
                      const userDevicesCount = devices.filter((d: any) => d.id_usuario !== null && Number(d.id_usuario) === Number(u.id)).length;
                      
                      const fechaReg = u.fecha_registro ? new Date(u.fecha_registro).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                      const ultimoAcc = u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca';

                      return (
                        <Table.Row key={u.id}>
                          <Table.RowHeaderCell>
                            <Flex gap="2" align="center">
                              {isAdmin ? <Shield size={16} color="#c084fc" /> : <User size={16} color="#60a5fa" />}
                              <Text size="2" weight="bold" style={{ color: 'white' }}>{u.nombre} {u.apellido || ''}</Text>
                            </Flex>
                          </Table.RowHeaderCell>
                          <Table.Cell>
                            <Flex direction="column" gap="1">
                              <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>{u.correo}</Text>
                              {u.telefono ? (
                                <Text size="1" style={{ color: '#94a3b8' }}>📞 {u.telefono}</Text>
                              ) : (
                                <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>Sin teléfono</Text>
                              )}
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge color={isAdmin ? "purple" : "blue"} variant="soft">
                              {u.rol.nombre.toUpperCase()}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            {isAdmin ? (
                              <Badge color="gray" variant="surface">
                                N/A
                              </Badge>
                            ) : (
                              <Flex gap="1" wrap="wrap">
                                <Badge color="green" variant="soft">
                                  🌱 {userCropsCount} Cultivo{userCropsCount !== 1 ? 's' : ''}
                                </Badge>
                                {userDevicesCount > 0 ? (
                                  <Badge color="orange" variant="soft">
                                    📟 {userDevicesCount} Disp.
                                  </Badge>
                                ) : (
                                  <Badge color="gray" variant="soft">
                                    📟 0 Disp.
                                  </Badge>
                                )}
                              </Flex>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <Flex direction="column" gap="1">
                              <Text size="1" color="gray">Reg: <span style={{ color: 'white' }}>{fechaReg}</span></Text>
                              <Text size="1" color="gray">Acceso: <span style={{ color: 'white' }}>{ultimoAcc}</span></Text>
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge color={u.estado ? "green" : "red"} variant="soft">
                              {u.estado ? "Activo" : "Dado de baja"}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Flex gap="2">
                              <Button 
                                size="1" 
                                color={u.estado ? "red" : "green"} 
                                variant="soft" 
                                onClick={() => handleToggleEstadoUser(u.id, u.estado)}
                                style={{ cursor: 'pointer' }}
                              >
                                <Power size={12} style={{ marginRight: '4px' }} />
                                {u.estado ? "Dar de baja" : "Reactivar"}
                              </Button>
                              <Button 
                                size="1" 
                                color="gray" 
                                variant="outline" 
                                onClick={() => handleToggleRolUser(u.id, u.id_rol)}
                                style={{ cursor: 'pointer' }}
                              >
                                <RefreshCw size={12} style={{ marginRight: '4px' }} />
                                Cambiar Rol
                              </Button>
                            </Flex>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </ScrollArea>

              {/* Controles de Paginación */}
              {users.length > pageSizeUsers && (
                <Flex justify="between" align="center" mt="4" px="2">
                  <Text size="2" color="gray">
                    Mostrando {Math.min((currentPageUsers - 1) * pageSizeUsers + 1, users.length)} a {Math.min(currentPageUsers * pageSizeUsers, users.length)} de {users.length} usuarios
                  </Text>
                  <Flex gap="1">
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPageUsers(1)} 
                      disabled={currentPageUsers === 1}
                      style={{ cursor: 'pointer' }}
                    >
                      «
                    </Button>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPageUsers(prev => Math.max(prev - 1, 1))} 
                      disabled={currentPageUsers === 1}
                      style={{ cursor: 'pointer' }}
                    >
                      ‹
                    </Button>
                    <Flex align="center" px="2" style={{ background: '#1e293b', borderRadius: '4px', height: '24px' }}>
                      <Text size="1" weight="bold" style={{ color: 'white' }}>
                        {currentPageUsers} / {Math.ceil(users.length / pageSizeUsers)}
                      </Text>
                    </Flex>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPageUsers(prev => Math.min(prev + 1, Math.ceil(users.length / pageSizeUsers)))} 
                      disabled={currentPageUsers === Math.ceil(users.length / pageSizeUsers)}
                      style={{ cursor: 'pointer' }}
                    >
                      ›
                    </Button>
                    <Button 
                      size="1" 
                      variant="soft" 
                      color="gray" 
                      onClick={() => setCurrentPageUsers(Math.ceil(users.length / pageSizeUsers))} 
                      disabled={currentPageUsers === Math.ceil(users.length / pageSizeUsers)}
                      style={{ cursor: 'pointer' }}
                    >
                      »
                    </Button>
                  </Flex>
                </Flex>
              )}
            </Card>
          </Tabs.Content>

          {/* TAB 2: STOCK & HARDWARE IOT */}
          <Tabs.Content value="dispositivos">
            <Flex gap="3" mb="4">
              <Button color="indigo" onClick={() => setIsOpenRegisterDevice(true)} style={{ cursor: 'pointer' }}>
                <Plus size={16} style={{ marginRight: '4px' }} /> Registrar Dispositivo
              </Button>
              <Button color="teal" onClick={() => setIsOpenRegisterComponent(true)} style={{ cursor: 'pointer' }}>
                <Plus size={16} style={{ marginRight: '4px' }} /> Registrar Componente
              </Button>
              <Button color="green" onClick={() => setIsOpenAssignDevice(true)} style={{ cursor: 'pointer' }}>
                <Plus size={16} style={{ marginRight: '4px' }} /> Asignar Dispositivo
              </Button>
            </Flex>

            <Grid columns={{ initial: '1', lg: '2' }} gap="5" mb="5">
              {/* STOCK DISPOSITIVOS */}
              <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
                <Flex align="center" gap="2" mb="4">
                  <Cpu size={20} color="#34d399" />
                  <Text size="4" weight="bold" color="indigo">Dispositivos en Stock</Text>
                </Flex>

                <Grid columns={{ initial: '1', md: '2' }} gap="3">
                  {devices.filter((d: any) => d.en_almacen === true && (d.estado === "disponible" || d.estado === "reparacion")).length === 0 ? (
                    <Text size="2" color="gray" style={{ padding: '12px' }}>No hay dispositivos libres en stock.</Text>
                  ) : (
                    devices.filter((d: any) => d.en_almacen === true && (d.estado === "disponible" || d.estado === "reparacion")).map((d: any) => (
                      <Card key={d.id} style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)' }}>
                        <Box>
                          <Text size="2" weight="bold" style={{ color: 'white' }} as="div">{d.nombre}</Text>
                          <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>MAC: {d.mac_address || 'Sin MAC'}</Text>
                          <Flex gap="1" mt="1" align="center" wrap="wrap">
                            <Badge color="green" size="1" variant="outline">{d.tipo.nombre}</Badge>
                            {d.almacen && (
                              <Badge color="blue" size="1" variant="soft">📍 {d.almacen.nombre}</Badge>
                            )}
                            <Badge color={d.estado === 'reparacion' ? 'amber' : 'green'} size="1" variant="soft">
                              {d.estado === 'reparacion' ? 'reparación' : d.estado}
                            </Badge>
                          </Flex>

                          <Flex justify="end" align="center" gap="2" mt="3" pt="2" style={{ borderTop: '1px solid var(--border-mockup)' }}>
                            {d.estado === "disponible" ? (
                              <>
                                <Button size="1" color="amber" variant="soft" onClick={() => handleCambiarEstadoDispositivo(d.id, d.nombre, "reparacion")} style={{ cursor: 'pointer' }}>
                                  Reparación
                                </Button>
                                <Button size="1" color="red" variant="soft" onClick={() => handleCambiarEstadoDispositivo(d.id, d.nombre, "Retirado")} style={{ cursor: 'pointer' }}>
                                  Retirar
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="1" color="green" variant="soft" onClick={() => handleCambiarEstadoDispositivo(d.id, d.nombre, "disponible")} style={{ cursor: 'pointer' }}>
                                  Disponible
                                </Button>
                                <Button size="1" color="red" variant="soft" onClick={() => handleCambiarEstadoDispositivo(d.id, d.nombre, "Retirado")} style={{ cursor: 'pointer' }}>
                                  Retirar
                                </Button>
                              </>
                            )}
                          </Flex>
                        </Box>
                      </Card>
                    ))
                  )}
                </Grid>
              </Card>

              {/* STOCK COMPONENTES */}
              <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
                <Flex align="center" gap="2" mb="4">
                  <Layers size={20} color="#a78bfa" />
                  <Text size="4" weight="bold" color="indigo">Componentes en Stock</Text>
                </Flex>

                <Grid columns={{ initial: '1', md: '2' }} gap="3">
                  {components.filter((c: any) => c.en_almacen === true).length === 0 ? (
                    <Text size="2" color="gray" style={{ padding: '12px' }}>No hay componentes libres en stock.</Text>
                  ) : (
                    components.filter((c: any) => c.en_almacen === true).map((c: any) => (
                      <Card key={c.id} style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)' }}>
                        <Box>
                          <Text size="2" weight="bold" style={{ color: 'white' }} as="div">
                            {c.modelo?.nombre_modelo || 'Componente'}
                          </Text>
                          <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>S/N: {c.numero_serie || 'Sin S/N'}</Text>
                          <Flex gap="1" mt="1" align="center" wrap="wrap">
                            <Badge color={c.modelo?.categoria === 'actuador' ? 'amber' : c.modelo?.categoria === 'sensor' ? 'green' : 'blue'} size="1" variant="outline">
                              {c.modelo?.categoria || 'desconocido'}
                            </Badge>
                            {c.almacen && (
                              <Badge color="blue" size="1" variant="soft">📍 {c.almacen.nombre}</Badge>
                            )}
                            <Badge color={c.estado === 'reparacion' ? 'amber' : c.estado === 'disponible' || c.estado === 'activo' ? 'green' : c.estado === 'asignado' ? 'indigo' : 'red'} size="1" variant="soft">
                              {c.estado === 'reparacion' ? 'reparación' : c.estado}
                            </Badge>
                          </Flex>

                          <Flex justify="end" align="center" gap="2" mt="3" pt="2" style={{ borderTop: '1px solid var(--border-mockup)' }}>
                            {c.estado === "disponible" ? (
                              <>
                                <Button size="1" color="amber" variant="soft" onClick={() => handleCambiarEstadoComponente(c.id, c.modelo?.nombre_modelo || 'Componente', "reparacion")} style={{ cursor: 'pointer' }}>
                                  Reparación
                                </Button>
                                <Button size="1" color="red" variant="soft" onClick={() => handleCambiarEstadoComponente(c.id, c.modelo?.nombre_modelo || 'Componente', "Retirado")} style={{ cursor: 'pointer' }}>
                                  Retirar
                                </Button>
                              </>
                            ) : c.estado === "reparacion" ? (
                              <>
                                <Button size="1" color="green" variant="soft" onClick={() => handleCambiarEstadoComponente(c.id, c.modelo?.nombre_modelo || 'Componente', "disponible")} style={{ cursor: 'pointer' }}>
                                  Disponible
                                </Button>
                                <Button size="1" color="red" variant="soft" onClick={() => handleCambiarEstadoComponente(c.id, c.modelo?.nombre_modelo || 'Componente', "Retirado")} style={{ cursor: 'pointer' }}>
                                  Retirar
                                </Button>
                              </>
                            ) : (
                              <Button size="1" color="gray" variant="soft" disabled>
                                No disponible
                              </Button>
                            )}
                          </Flex>
                        </Box>
                      </Card>
                    ))
                  )}
                </Grid>
              </Card>
            </Grid>

            {/* DISPOSITIVOS ASIGNADOS */}
            <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
              <Flex align="center" gap="2" mb="4">
                <Layers size={20} color="#60a5fa" />
                <Text size="4" weight="bold" color="indigo">Nodos en Campo</Text>
              </Flex>

              {devices.filter((d: any) => d.estado === "asignado").length === 0 ? (
                <Text size="2" color="gray" style={{ padding: '12px' }}>No hay dispositivos asignados en campo.</Text>
              ) : (
                <Grid columns={{ initial: '1', md: '2', lg: '3', xl: '4' }} gap="4">
                  {devices.filter((d: any) => d.estado === "asignado").map((d: any) => {
                    const assign = d.asignaciones_iot?.[0];
                    const activeComponents = d.asignaciones_iot?.filter((asig: any) => asig.id_componente !== null && asig.id_componente !== undefined) || [];
                    
                    return (
                      <Card key={d.id} style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)' }}>
                        <Flex direction="column" gap="2">
                          <Flex justify="between" align="start">
                            <Box>
                              <Text size="2" weight="bold" style={{ color: 'white' }} as="div">{d.nombre}</Text>
                              <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>MAC: {d.mac_address || 'Sin MAC'}</Text>
                              {assign && (
                                <Text size="1" color="indigo" style={{ display: 'block', marginTop: '4px' }}>
                                  Asignado a: <span style={{ fontWeight: 'bold' }}>{assign.usuario?.nombre}</span> · Cultivo: <span style={{ fontWeight: 'bold' }}>{assign.cultivo?.nombre_planta}</span>
                                </Text>
                              )}
                              <Badge color="blue" size="1" mt="1" variant="outline">{d.tipo.nombre}</Badge>
                            </Box>
                            <Button size="1" color="red" variant="soft" onClick={() => handleLiberarDispositivo(d)} style={{ cursor: 'pointer' }}>
                              Liberar
                            </Button>
                          </Flex>

                          {/* Componentes vinculados */}
                          <Box mt="2" pt="2" style={{ borderTop: '1px solid var(--border-mockup)' }}>
                            <Text size="1" weight="bold" style={{ color: 'var(--indigo-a11)', display: 'block', marginBottom: '6px' }}>
                              ⚙️ Componentes Vinculados:
                            </Text>
                            {activeComponents.length === 0 ? (
                              <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>Ningún componente vinculado.</Text>
                            ) : (
                              <Flex direction="column" gap="1">
                                {activeComponents.map((asig: any) => {
                                  const fAgua = fuentesAgua.find((f: any) => f.id === asig.id_fuente_agua);
                                  return (
                                    <Flex key={asig.id} justify="between" align="center" style={{ background: '#0c1014', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-mockup)' }}>
                                      <Box>
                                        <Text size="1" weight="bold" style={{ color: 'white' }}>
                                          {asig.componente?.modelo?.nombre_modelo || 'Componente'}
                                        </Text>
                                        {asig.tipo_metrica && (
                                          <Badge color="purple" size="1" style={{ marginLeft: '4px' }}>
                                            {asig.tipo_metrica.nombre}
                                          </Badge>
                                        )}
                                        <Text size="1" color="gray" style={{ marginLeft: '4px', fontFamily: 'monospace' }}>
                                          {asig.componente?.numero_serie ? `[${asig.componente.numero_serie}]` : ''}
                                        </Text>
                                        {fAgua && (
                                          <Text size="1" style={{ color: '#38bdf8', display: 'block', marginTop: '2px' }}>
                                            🌊 Fuente: {fAgua.nombre}
                                          </Text>
                                        )}
                                      </Box>
                                      <Flex gap="2" align="center">
                                        <Badge color="orange" size="1">Pin {asig.pin_gpio}</Badge>
                                        <Button 
                                          size="1" 
                                          color="red" 
                                          variant="ghost" 
                                          onClick={() => handleLiberarComponente(asig.id_componente, asig.componente?.modelo?.nombre_modelo)}
                                          style={{ cursor: 'pointer', padding: '2px 4px' }}
                                          title="Desvincular componente físico"
                                        >
                                          <X size={12} />
                                        </Button>
                                      </Flex>
                                    </Flex>
                                  );
                                })}
                              </Flex>
                            )}
                          </Box>

                          <Button size="1" color="indigo" mt="1" onClick={() => setSelectedDeviceForComponent(d)} style={{ cursor: 'pointer' }}>
                            ＋ Vincular Componente
                          </Button>
                        </Flex>
                      </Card>
                    );
                  })}
                </Grid>
              )}
            </Card>
          </Tabs.Content>

          {/* TAB 3: CATÁLOGO & GEOGRAFÍA */}
          <Tabs.Content value="catalogo">
            <Flex gap="3" mb="4">
              <Button color="indigo" onClick={() => setIsOpenRegisterPlant(true)} style={{ cursor: 'pointer' }}>
                🌿 Registrar Planta
              </Button>
              <Button color="teal" onClick={() => setIsOpenRegisterGeo(true)} style={{ cursor: 'pointer' }}>
                📍 Registrar Ubicación
              </Button>
            </Flex>

            <Grid columns={{ initial: '1', lg: '2' }} gap="5">
              
              {/* COLUMNA 1: CATÁLOGO BOTÁNICO */}
              <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
                <Flex align="center" gap="2" mb="4">
                  <Tag size={20} color="#818cf8" />
                  <Text size="4" weight="bold" color="indigo">Catálogo Botánico (Plantas)</Text>
                </Flex>

                <Text size="2" color="gray" mb="3" as="div" style={{ fontWeight: 'bold' }}>Especies Registradas ({catalogPlantas.length})</Text>
                <ScrollArea style={{ height: 350 }}>
                  <Grid columns={{ initial: '1', md: '2' }} gap="2">
                    {catalogPlantas.map((p: any) => (
                      <Card key={p.id} style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)' }}>
                        <Flex justify="between" align="center">
                          <Box style={{ padding: '4px' }}>
                            <Text size="2" weight="bold" style={{ color: 'white' }}>{p.nombre}</Text>
                            {p.tipo && <Badge color="indigo" size="1" ml="2">{p.tipo}</Badge>}
                            <Text size="1" color="gray" style={{ display: 'block', marginTop: '2px' }}>{p.descripcion || 'Sin descripción'}</Text>
                          </Box>
                        </Flex>
                      </Card>
                    ))}
                  </Grid>
                </ScrollArea>
              </Card>

              {/* COLUMNA 2: GEOGRAFÍA */}
              <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
                <Flex align="center" gap="2" mb="4">
                  <MapPin size={20} color="#f87171" />
                  <Text size="4" weight="bold" color="indigo">Divisiones Geográficas</Text>
                </Flex>

                <Tabs.Root defaultValue="reg">
                  <Tabs.List size="2" style={{ marginBottom: '16px' }}>
                    <Tabs.Trigger value="reg" style={{ cursor: 'pointer' }}>Departamentos ({regiones.length})</Tabs.Trigger>
                    <Tabs.Trigger value="prov" style={{ cursor: 'pointer' }}>Provincias ({provincias.length})</Tabs.Trigger>
                    <Tabs.Trigger value="dist" style={{ cursor: 'pointer' }}>Distritos ({distritos.length})</Tabs.Trigger>
                  </Tabs.List>

                  <Tabs.Content value="reg">
                    <ScrollArea style={{ height: 280 }}>
                      <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="2">
                        {regiones.map((r: any) => (
                          <Card key={r.id} style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)', padding: '8px 12px' }}>
                            <Text size="2" weight="bold" style={{ color: 'white' }}>{r.nombre}</Text>
                          </Card>
                        ))}
                      </Grid>
                    </ScrollArea>
                  </Tabs.Content>

                  <Tabs.Content value="prov">
                    <ScrollArea style={{ height: 280 }}>
                      <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="2">
                        {provincias.map((p: any) => {
                          const regName = regiones.find((r: any) => r.id === p.id_region)?.nombre || 'DB';
                          return (
                            <Card key={p.id} style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)', padding: '8px 12px' }}>
                              <Flex justify="between" align="center">
                                <Text size="2" weight="bold" style={{ color: 'white' }}>{p.nombre}</Text>
                                <Badge color="indigo" size="1">{regName}</Badge>
                              </Flex>
                            </Card>
                          );
                        })}
                      </Grid>
                    </ScrollArea>
                  </Tabs.Content>

                  <Tabs.Content value="dist">
                    <ScrollArea style={{ height: 280 }}>
                      <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="2">
                        {distritos.map((d: any) => {
                          const provName = provincias.find((p: any) => p.id === d.id_provincia)?.nombre || 'DB';
                          return (
                            <Card key={d.id} style={{ background: 'var(--surface2-mockup)', borderColor: 'var(--border-mockup)', padding: '8px 12px' }}>
                              <Flex justify="between" align="center">
                                <Text size="2" weight="bold" style={{ color: 'white' }}>{d.nombre}</Text>
                                <Badge color="teal" size="1">{provName}</Badge>
                              </Flex>
                            </Card>
                          );
                        })}
                      </Grid>
                    </ScrollArea>
                  </Tabs.Content>
                </Tabs.Root>
              </Card>
            </Grid>
          </Tabs.Content>

          {/* TAB 4: RESPALDO */}
          <Tabs.Content value="respaldo">
            <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
              <Flex direction="column" gap="4" align="center" justify="center" p="5">
                <HardDrive size={64} color="#818cf8" style={{ filter: 'drop-shadow(0 0 10px rgba(129, 140, 248, 0.3))' }} />
                <Box style={{ textAlign: 'center' }}>
                  <Text size="4" weight="bold" style={{ color: 'white' }} as="div" mb="2">Copia de Seguridad de la Base de Datos</Text>
                  <Text size="2" color="gray">
                    Descargue un archivo comprimido de respaldo completo de la base de datos Supabase/PostgreSQL.
                  </Text>
                </Box>
                <Button size="3" color="indigo" onClick={handleTriggerBackup} style={{ cursor: 'pointer', padding: '12px 24px' }}>
                  💾 Generar y Descargar Backup (.SQL)
                </Button>
              </Flex>
            </Card>
          </Tabs.Content>

          {/* TAB 5: ALMACENES */}
          <Tabs.Content value="almacenes">
            <Grid columns={{ initial: '1', lg: '3' }} gap="5">
              {/* COLUMNA 1: FORMULARIO REGISTRO ALMACÉN */}
              <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
                <Flex align="center" gap="2" mb="4">
                  <Plus size={20} color="#818cf8" />
                  <Text size="4" weight="bold" color="indigo" as="div">Registrar Nuevo Almacén</Text>
                </Flex>
                <form onSubmit={handleRegisterAlmacenSubmit}>
                  <Flex direction="column" gap="3">
                    <label><Text color="gray" size="2">Nombre del Almacén *</Text></label>
                    <TextField.Root 
                      placeholder="Ej: Almacén Cusco Norte" 
                      value={newAlmacenNombre}
                      onChange={(e) => setNewAlmacenNombre(e.target.value)}
                      required
                      style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
                    />

                    <label><Text color="gray" size="2">Región / Departamento *</Text></label>
                    <Select.Root value={newAlmacenRegionId} onValueChange={(val) => { setNewAlmacenRegionId(val); setNewAlmacenProvinciaId(""); setNewAlmacenDistritoId(""); }}>
                      <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder="Seleccione Región..." />
                      <Select.Content style={{ background: '#0f172a', color: 'white' }}>
                        {regiones.map((reg: any) => (
                          <Select.Item key={reg.id} value={reg.id.toString()}>{reg.nombre}</Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>

                    <label><Text color="gray" size="2">Provincia *</Text></label>
                    <Select.Root value={newAlmacenProvinciaId} onValueChange={(val) => { setNewAlmacenProvinciaId(val); setNewAlmacenDistritoId(""); }} disabled={!newAlmacenRegionId}>
                      <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder="Seleccione Provincia..." />
                      <Select.Content style={{ background: '#0f172a', color: 'white' }}>
                        {filteredProvinciasForAlmacen.map((prov: any) => (
                          <Select.Item key={prov.id} value={prov.id.toString()}>{prov.nombre}</Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>

                    <label><Text color="gray" size="2">Distrito *</Text></label>
                    <Select.Root value={newAlmacenDistritoId} onValueChange={setNewAlmacenDistritoId} disabled={!newAlmacenProvinciaId}>
                      <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder="Seleccione Distrito..." />
                      <Select.Content style={{ background: '#0f172a', color: 'white' }}>
                        {filteredDistritosForAlmacen.map((dist: any) => (
                          <Select.Item key={dist.id} value={dist.id.toString()}>{dist.nombre}</Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>

                    <label><Text color="gray" size="2">Dirección Física</Text></label>
                    <TextField.Root 
                      placeholder="Ej: Av. Sol 456" 
                      value={newAlmacenDireccion}
                      onChange={(e) => setNewAlmacenDireccion(e.target.value)}
                      style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
                    />

                    <Button type="submit" color="indigo" mt="3" style={{ cursor: 'pointer' }} disabled={!newAlmacenNombre || !newAlmacenDistritoId}>
                      Crear Almacén
                    </Button>
                  </Flex>
                </form>
              </Card>

              {/* COLUMNA 2: TABLA DE ALMACENES */}
              <Box style={{ gridColumn: 'span 2' }}>
                <Card size="3" style={{ background: 'var(--surface-mockup)', borderColor: 'var(--border-mockup)', borderRadius: '16px' }}>
                  <Flex align="center" gap="2" mb="4">
                    <Warehouse size={20} color="#34d399" />
                    <Text size="4" weight="bold" color="indigo" as="div">Almacenes y Stock Físico</Text>
                  </Flex>

                  <ScrollArea scrollbars="horizontal" style={{ width: '100%' }}>
                    <Table.Root variant="surface" style={{ background: 'transparent', minWidth: '500px' }}>
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeaderCell>Nombre del Almacén</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Ubicación (Distrito)</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Dirección</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Dispositivos en Stock</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Acciones</Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>

                      <Table.Body>
                        {almacenesList.map((alm: any) => {
                          const deviceCount = devices.filter(
                            (d: any) => d.id_almacen === alm.id && d.estado === "disponible"
                          ).length;

                          return (
                            <Table.Row key={alm.id}>
                              <Table.RowHeaderCell>
                                <Text size="2" weight="bold" style={{ color: 'white' }}>
                                  {alm.nombre}
                                </Text>
                              </Table.RowHeaderCell>
                              <Table.Cell>
                                <Text size="2" style={{ color: '#e2e8f0' }}>{getAlmacenLocationString(alm.id_distrito)}</Text>
                              </Table.Cell>
                              <Table.Cell>
                                <Text size="2" style={{ color: '#94a3b8' }}>{alm.direccion || '—'}</Text>
                              </Table.Cell>
                              <Table.Cell>
                                <Badge color={deviceCount > 0 ? "green" : "gray"} variant="soft">
                                  📟 {deviceCount} unidades
                                </Badge>
                              </Table.Cell>
                              <Table.Cell>
                                <Button 
                                  size="1" 
                                  color="red" 
                                  variant="soft" 
                                  onClick={() => handleDeleteAlmacen(alm.id, alm.nombre)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  Eliminar
                                </Button>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table.Root>
                  </ScrollArea>
                </Card>
              </Box>
            </Grid>
          </Tabs.Content>
        </Box>
      </Tabs.Root>

      {/* DIALOGO DE REGISTRO DE DISPOSITIVO */}
      <Dialog.Root open={isOpenRegisterDevice} onOpenChange={setIsOpenRegisterDevice}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 480, background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)' }}>
          <Dialog.Title style={{ color: 'white' }}>Registrar Nuevo Dispositivo IoT</Dialog.Title>
          <Text size="2" color="gray" mb="4">
            Añadir una unidad ESP32 al inventario de stock disponible.
          </Text>

          <Flex direction="column" gap="3" mt="3">
            <label><Text color="gray" size="2">Tipo de Dispositivo *</Text></label>
            <Select.Root value={newDeviceTipoId} onValueChange={newDeviceTipoId => setNewDeviceTipoId(newDeviceTipoId)}>
              <Select.Trigger style={{ width: '100%', background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }} placeholder="Elegir tipo..." />
              <Select.Content>
                {tiposDispositivo.map((t: any) => (
                  <Select.Item key={t.id} value={t.id.toString()}>{t.nombre}</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label><Text color="gray" size="2">Nombre del Dispositivo *</Text></label>
            <TextField.Root 
              placeholder="Ej: ESP32 Colector Clima D" 
              value={newDeviceNombre}
              onChange={(e) => setNewDeviceNombre(e.target.value)}
              style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
            />

            <label><Text color="gray" size="2">Dirección MAC</Text></label>
            <TextField.Root 
              placeholder="Ej: AA:BB:CC:DD:EE:04" 
              value={newDeviceMac}
              onChange={(e) => setNewDeviceMac(e.target.value)}
              style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
            />

            <label><Text color="gray" size="2">Client ID MQTT (Generado automáticamente)</Text></label>
            <TextField.Root 
              placeholder="Seleccione tipo de dispositivo..." 
              value={newDeviceMqtt}
              disabled
              style={{ background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)', color: '#94a3b8' }}
            />

            <Grid columns="2" gap="3">
              <Box>
                <label><Text color="gray" size="2">Topic Publicación (Lectura)</Text></label>
                <TextField.Root 
                  value={newDevicePub}
                  disabled
                  style={{ background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)', color: '#94a3b8' }}
                />
              </Box>
              <Box>
                <label><Text color="gray" size="2">Topic Suscripción (Escritura)</Text></label>
                <TextField.Root 
                  value={newDeviceSub}
                  disabled
                  style={{ background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)', color: '#94a3b8' }}
                />
              </Box>
            </Grid>

            <Grid columns="2" gap="3">
              <Box>
                <label><Text color="gray" size="2">Almacén de Destino *</Text></label>
                <Select.Root value={newDeviceAlmacenId} onValueChange={setNewDeviceAlmacenId}>
                  <Select.Trigger style={{ width: '100%', background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }} placeholder="Elegir almacén..." />
                  <Select.Content>
                    {almacenesList.map((alm: any) => (
                      <Select.Item key={alm.id} value={alm.id.toString()}>{alm.nombre}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>
              <Box>
                <label><Text color="gray" size="2">Versión Firmware</Text></label>
                <TextField.Root 
                  placeholder="v1.0.0" 
                  value={newDeviceFirmware}
                  onChange={(e) => setNewDeviceFirmware(e.target.value)}
                  style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
                />
              </Box>
            </Grid>
          </Flex>

          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close><Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cancelar</Button></Dialog.Close>
            <Button color="green" onClick={handleRegisterDeviceSubmit} style={{ cursor: 'pointer' }} disabled={!newDeviceTipoId || !newDeviceNombre}>
              Registrar Dispositivo
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* DIALOGO DE REGISTRO DE COMPONENTE */}
      <Dialog.Root open={isOpenRegisterComponent} onOpenChange={setIsOpenRegisterComponent}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 450, background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)' }}>
          <Dialog.Title style={{ color: 'white' }}>Registrar Componente de Stock</Dialog.Title>
          <Text size="2" color="gray" mb="4">
            Añadir un sensor, actuador o batería individual al stock disponible.
          </Text>

          <Flex direction="column" gap="3" mt="3">
            <label><Text color="gray" size="2">Modelo / Tipo de Componente *</Text></label>
            <Select.Root value={newCompTipoId} onValueChange={newCompTipoId => setNewCompTipoId(newCompTipoId)}>
              <Select.Trigger style={{ width: '100%', background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }} placeholder="Elegir modelo..." />
              <Select.Content>
                {tiposComponente.map((tc: any) => (
                  <Select.Item key={tc.id} value={tc.id.toString()}>{tc.nombre_modelo} ({tc.categoria})</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label><Text color="gray" size="2">Número de Serie</Text></label>
            <TextField.Root 
              placeholder="Ej: SN_HUM_002" 
              value={newCompSerial}
              onChange={(e) => setNewCompSerial(e.target.value)}
              style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
            />

            <label><Text color="gray" size="2">Almacén de Destino *</Text></label>
            <Select.Root value={newCompAlmacenId} onValueChange={setNewCompAlmacenId}>
              <Select.Trigger style={{ width: '100%', background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }} placeholder="Elegir almacén..." />
              <Select.Content>
                {almacenesList.map((alm: any) => (
                  <Select.Item key={alm.id} value={alm.id.toString()}>{alm.nombre}</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close><Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cancelar</Button></Dialog.Close>
            <Button color="green" onClick={handleRegisterComponentSubmit} style={{ cursor: 'pointer' }} disabled={!newCompTipoId || !newCompAlmacenId}>
              Registrar Componente
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* DIALOGO DE ASIGNACIÓN DE COMPONENTE */}
      <Dialog.Root open={selectedDeviceForComponent !== null} onOpenChange={(open) => !open && setSelectedDeviceForComponent(null)}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 450, background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)' }}>
          <Dialog.Title style={{ color: 'white' }}>Vincular Componente a Dispositivo</Dialog.Title>
          <Text size="2" color="gray" mb="4">
            Seleccione un componente del stock y defina el pin GPIO de conexión física para el dispositivo <span style={{ fontWeight: 'bold', color: 'white' }}>{selectedDeviceForComponent?.nombre}</span>.
          </Text>

          <Flex direction="column" gap="3" mt="3">
            <label><Text color="gray" size="2">1. Seleccionar Componente en Stock *</Text></label>
            <Select.Root value={assignCompId} onValueChange={setAssignCompId}>
              <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder="Elegir componente..." />
              <Select.Content>
                {components.filter((c: any) => c.en_almacen === true && (c.estado === 'disponible' || c.estado === 'activo')).map((c: any) => (
                  <Select.Item key={c.id} value={c.id.toString()}>
                    {c.modelo?.nombre_modelo} (S/N: {c.numero_serie || 'Sin S/N'})
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label><Text color="gray" size="2">2. Pin GPIO / Canal Físico *</Text></label>
            <TextField.Root 
              placeholder="Ej: 17, 23, 26..." 
              value={assignPinGpio}
              onChange={(e) => setAssignPinGpio(e.target.value)}
              style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
            />

            <label><Text color="gray" size="2">Métricas a Medir (Seleccione una o más) *</Text></label>
            <Flex direction="column" gap="2" style={{ background: 'var(--surface2-mockup)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-mockup)' }}>
              {metricas.map((m: any) => {
                const isChecked = assignMetricIds.includes(m.id.toString());
                return (
                  <Flex key={m.id} gap="2" align="center" style={{ cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      id={`metric-${m.id}`}
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssignMetricIds(prev => [...prev, m.id.toString()]);
                        } else {
                          setAssignMetricIds(prev => prev.filter(id => id !== m.id.toString()));
                        }
                      }}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--indigo-9)' }}
                    />
                    <label htmlFor={`metric-${m.id}`} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Text size="2" style={{ color: 'white' }}>{m.nombre}</Text>
                      <Text size="1" color="gray">({m.unidad})</Text>
                    </label>
                  </Flex>
                );
              })}
            </Flex>

            {/* Mostrar selector de fuentes de agua solo si el componente es un actuador (bomba/valvula) y el dispositivo es un actuador */}
            {(() => {
              const isActuatorDevice = selectedDeviceForComponent?.id_tipo === 2;
              
              if (!isActuatorDevice) return null;

              // Filtrar fuentes de agua que pertenecen al agricultor asignado
              const farmerId = selectedDeviceForComponent?.id_usuario;
              const farmerFuentes = fuentesAgua.filter((f: any) => f.id_usuario === farmerId);

              return (
                <>
                  <label><Text color="gray" size="2">3. Fuente de Agua Asociada (Requerido para Actuadores) *</Text></label>
                  <Select.Root value={assignFuenteAguaId} onValueChange={setAssignFuenteAguaId}>
                    <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder="Elegir fuente de agua..." />
                    <Select.Content>
                      {farmerFuentes.map((f: any) => (
                        <Select.Item key={f.id} value={f.id.toString()}>
                          {f.nombre} ({f.tipo})
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </>
              );
            })()}
          </Flex>

          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" style={{ cursor: 'pointer' }} onClick={() => {
                setSelectedDeviceForComponent(null);
                setAssignCompId("");
                setAssignPinGpio("");
                setAssignMetricIds([]);
                setAssignFuenteAguaId("");
              }}>
                Cancelar
              </Button>
            </Dialog.Close>
            <Button 
              color="green" 
              onClick={handleConfirmAssignComponent} 
              style={{ cursor: 'pointer' }} 
              disabled={
                !assignCompId || 
                !assignPinGpio || 
                assignMetricIds.length === 0 ||
                (() => {
                  const isActuatorDevice = selectedDeviceForComponent?.id_tipo === 2;
                  return isActuatorDevice && !assignFuenteAguaId;
                })()
              }
            >
              Confirmar Asignación
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* DIALOGO DE ASIGNACIÓN */}
      <Dialog.Root open={isOpenAssignDevice} onOpenChange={setIsOpenAssignDevice}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 450, background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)' }}>
          <Dialog.Title style={{ color: 'white' }}>Asignar Dispositivo Físico</Dialog.Title>
          <Text size="2" color="gray" mb="4">
            Vincule un dispositivo disponible en stock a una parcela o cultivo de un agricultor.
          </Text>

          <Flex direction="column" gap="3" mt="3">
            <label><Text color="gray" size="2">1. Seleccionar Dispositivo en Stock *</Text></label>
            <Select.Root value={assignDeviceId} onValueChange={setAssignDeviceId}>
              <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder="Elegir dispositivo..." />
              <Select.Content>
                {devices.filter((d: any) => d.en_almacen === true && d.estado === "disponible").map((d: any) => (
                  <Select.Item key={d.id} value={d.id.toString()}>
                    {d.nombre} ({d.mac_address || 'Sin MAC'})
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label><Text color="gray" size="2">2. Seleccionar Agricultor *</Text></label>
            <Select.Root value={assignUserId} onValueChange={(v) => { setAssignUserId(v); setAssignCropId(""); setAssignDeviceFuenteAguaId(""); }}>
              <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder="Elegir usuario..." />
              <Select.Content>
                {users.filter((u: any) => u.id_rol === 2).map((u: any) => (
                  <Select.Item key={u.id} value={u.id.toString()}>{u.nombre} {u.apellido || ''} ({u.correo})</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label><Text color="gray" size="2">3. Seleccionar Cultivo *</Text></label>
            <Select.Root value={assignCropId} onValueChange={setAssignCropId} disabled={!assignUserId}>
              <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder={assignUserId ? "Elegir cultivo..." : "Primero elija agricultor..."} />
              <Select.Content>
                {filteredCrops.map((c: any) => (
                  <Select.Item key={c.id} value={c.id.toString()}>{c.nombre_planta} ({c.lugar || 'Sin ubicación'})</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <label><Text color="gray" size="2">4. Vincular Componente Inicial (Opcional)</Text></label>
            <Select.Root 
              value={assignDeviceCompId} 
              onValueChange={(val) => { setAssignDeviceCompId(val); if (!val || val === "none") { setAssignDevicePinGpio(""); setAssignDeviceMetricIds([]); setAssignDeviceFuenteAguaId(""); } }}
              disabled={!assignDeviceId}
            >
              <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder={assignDeviceId ? "Elegir componente..." : "Primero seleccione dispositivo..."} />
              <Select.Content>
                <Select.Item value="none">Ninguno</Select.Item>
                {components.filter((c: any) => c.en_almacen === true && (c.estado === 'disponible' || c.estado === 'activo')).map((c: any) => (
                  <Select.Item key={c.id} value={c.id.toString()}>
                    {c.modelo?.nombre_modelo} (S/N: {c.numero_serie || 'Sin S/N'})
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            {assignDeviceCompId && assignDeviceCompId !== "none" && (
              <>
                <label><Text color="gray" size="2">5. Pin GPIO / Canal Físico *</Text></label>
                <TextField.Root 
                  placeholder="Ej: 17, 23, 26..." 
                  value={assignDevicePinGpio}
                  onChange={(e) => setAssignDevicePinGpio(e.target.value)}
                  style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
                />

                <label><Text color="gray" size="2">Métricas a Medir (Seleccione una o más) *</Text></label>
                <Flex direction="column" gap="2" style={{ background: 'var(--surface2-mockup)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-mockup)' }}>
                  {metricas.map((m: any) => {
                    const isChecked = assignDeviceMetricIds.includes(m.id.toString());
                    return (
                      <Flex key={m.id} gap="2" align="center" style={{ cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          id={`dev-metric-${m.id}`}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignDeviceMetricIds(prev => [...prev, m.id.toString()]);
                            } else {
                              setAssignDeviceMetricIds(prev => prev.filter(id => id !== m.id.toString()));
                            }
                          }}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--indigo-9)' }}
                        />
                        <label htmlFor={`dev-metric-${m.id}`} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Text size="2" style={{ color: 'white' }}>{m.nombre}</Text>
                          <Text size="1" color="gray">({m.unidad})</Text>
                        </label>
                      </Flex>
                    );
                  })}
                </Flex>

                {/* Mostrar selector de fuentes de agua solo si el dispositivo es un actuador (id_tipo === 2) */}
                {(() => {
                  const selectedStockDevice = devices.find((d: any) => d.id.toString() === assignDeviceId);
                  const isActuatorDevice = selectedStockDevice?.id_tipo === 2;
                  
                  if (!isActuatorDevice) return null;

                  const farmerFuentes = fuentesAgua.filter((f: any) => f.id_usuario.toString() === assignUserId);

                  return (
                    <>
                      <label><Text color="gray" size="2">6. Fuente de Agua Asociada (Requerido para Actuadores) *</Text></label>
                      <Select.Root value={assignDeviceFuenteAguaId} onValueChange={setAssignDeviceFuenteAguaId}>
                        <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder="Elegir fuente de agua..." />
                        <Select.Content>
                          {farmerFuentes.map((f: any) => (
                            <Select.Item key={f.id} value={f.id.toString()}>
                              {f.nombre} ({f.tipo})
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </>
                  );
                })()}
              </>
            )}
          </Flex>

          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" style={{ cursor: 'pointer' }} onClick={() => {
                setIsOpenAssignDevice(false);
                setAssignDeviceId("");
                setAssignUserId("");
                setAssignCropId("");
                setAssignDeviceCompId("");
                setAssignDevicePinGpio("");
                setAssignDeviceMetricIds([]);
                setAssignDeviceFuenteAguaId("");
              }}>
                Cancelar
              </Button>
            </Dialog.Close>
            <Button 
              color="green" 
              onClick={handleConfirmAssign} 
              style={{ cursor: 'pointer' }} 
              disabled={
                !assignDeviceId || 
                !assignUserId || 
                !assignCropId ||
                (assignDeviceCompId !== "" && assignDeviceCompId !== "none" && (
                  !assignDevicePinGpio || 
                  assignDeviceMetricIds.length === 0 ||
                  (() => {
                    const selectedComp = components.find((c: any) => c.id.toString() === assignDeviceCompId);
                    return selectedComp?.modelo?.categoria === 'actuador' && !assignDeviceFuenteAguaId;
                  })()
                ))
              }
            >
              Confirmar Asignación
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* DIALOGO DE REGISTRO DE PLANTA */}
      <Dialog.Root open={isOpenRegisterPlant} onOpenChange={setIsOpenRegisterPlant}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 450, background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)' }}>
          <Dialog.Title style={{ color: 'white' }}>Registrar Especie de Planta</Dialog.Title>
          <Text size="2" color="gray" mb="4">
            Añadir una nueva especie al catálogo botánico de Yaku.
          </Text>
          <form onSubmit={handleRegisterPlantSubmit}>
            <Flex direction="column" gap="3" mt="3">
              <label><Text color="gray" size="2">Nombre de la Especie *</Text></label>
              <TextField.Root 
                placeholder="Ej: Papa Huayro" 
                value={newPlantNombre}
                onChange={(e) => setNewPlantNombre(e.target.value)}
                style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
              />
              <label><Text color="gray" size="2">Tipo / Categoría *</Text></label>
              <TextField.Root 
                placeholder="Ej: Tubérculo" 
                value={newPlantTipo}
                onChange={(e) => setNewPlantTipo(e.target.value)}
                style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
              />
              <label><Text color="gray" size="2">Descripción / Requerimientos</Text></label>
              <TextField.Root 
                placeholder="Breve descripción..." 
                value={newPlantDesc}
                onChange={(e) => setNewPlantDesc(e.target.value)}
                style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
              />
            </Flex>
            <Flex gap="3" mt="6" justify="end">
              <Dialog.Close><Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cancelar</Button></Dialog.Close>
              <Button type="submit" color="green" style={{ cursor: 'pointer' }} disabled={!newPlantNombre || !newPlantTipo}>
                Agregar Planta
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      {/* DIALOGO DE REGISTRO GEOGRÁFICO */}
      <Dialog.Root open={isOpenRegisterGeo} onOpenChange={setIsOpenRegisterGeo}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 480, background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)' }}>
          <Dialog.Title style={{ color: 'white' }}>Registrar Ubicación Geográfica</Dialog.Title>
          <Text size="2" color="gray" mb="4">
            Añadir un departamento, provincia o distrito a la jerarquía geográfica del sistema.
          </Text>
          
          <Flex direction="column" gap="3" mt="3">
            <label><Text color="gray" size="2">Nivel Geográfico *</Text></label>
            <Select.Root value={newGeoLevel} onValueChange={setNewGeoLevel}>
              <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }} />
              <Select.Content>
                <Select.Item value="departamento">1. Departamento (Región)</Select.Item>
                <Select.Item value="provincia">2. Provincia</Select.Item>
                <Select.Item value="distrito">3. Distrito</Select.Item>
              </Select.Content>
            </Select.Root>

            {newGeoLevel === "departamento" && (
              <form onSubmit={handleRegisterRegionSubmit}>
                <Flex direction="column" gap="3" mt="2">
                  <label><Text color="gray" size="2">Nombre del Departamento *</Text></label>
                  <TextField.Root 
                    placeholder="Ej: Cusco" 
                    value={newRegionNombre}
                    onChange={(e) => setNewRegionNombre(e.target.value)}
                    style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
                  />
                  <Button type="submit" color="green" mt="2" style={{ cursor: 'pointer' }} disabled={!newRegionNombre}>
                    Registrar Departamento
                  </Button>
                </Flex>
              </form>
            )}

            {newGeoLevel === "provincia" && (
              <form onSubmit={handleRegisterProvinciaSubmit}>
                <Flex direction="column" gap="3" mt="2">
                  <label><Text color="gray" size="2">Seleccionar Departamento de origen *</Text></label>
                  <Select.Root value={selectedRegionId} onValueChange={setSelectedRegionId}>
                    <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }} placeholder="Elegir departamento..." />
                    <Select.Content>
                      {regiones.map((r: any) => (
                        <Select.Item key={r.id} value={r.id.toString()}>{r.nombre}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <label><Text color="gray" size="2">Nombre de la Provincia *</Text></label>
                  <TextField.Root 
                    placeholder="Ej: Urubamba" 
                    value={newProvinciaNombre}
                    onChange={(e) => setNewProvinciaNombre(e.target.value)}
                    style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
                    disabled={!selectedRegionId}
                  />
                  <Button type="submit" color="green" mt="2" style={{ cursor: 'pointer' }} disabled={!selectedRegionId || !newProvinciaNombre}>
                    Registrar Provincia
                  </Button>
                </Flex>
              </form>
            )}

            {newGeoLevel === "distrito" && (
              <form onSubmit={handleRegisterDistritoSubmit}>
                <Flex direction="column" gap="3" mt="2">
                  <label><Text color="gray" size="2">Seleccionar Provincia de origen *</Text></label>
                  <Select.Root value={selectedProvinciaId} onValueChange={setSelectedProvinciaId}>
                    <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }} placeholder="Elegir provincia..." />
                    <Select.Content>
                      {provincias.map((p: any) => {
                        const regName = regiones.find((r: any) => r.id === p.id_region)?.nombre || 'DB';
                        return (
                          <Select.Item key={p.id} value={p.id.toString()}>{p.nombre} ({regName})</Select.Item>
                        );
                      })}
                    </Select.Content>
                  </Select.Root>
                  <label><Text color="gray" size="2">Nombre del Distrito *</Text></label>
                  <TextField.Root 
                    placeholder="Ej: Machupicchu" 
                    value={newDistritoNombre}
                    onChange={(e) => setNewDistritoNombre(e.target.value)}
                    style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
                    disabled={!selectedProvinciaId}
                  />
                  <Button type="submit" color="green" mt="2" style={{ cursor: 'pointer' }} disabled={!selectedProvinciaId || !newDistritoNombre}>
                    Registrar Distrito
                  </Button>
                </Flex>
              </form>
            )}
          </Flex>
          
          <Flex gap="3" mt="6" justify="end">
            <Dialog.Close><Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cerrar</Button></Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* DIALOGO DE REGISTRO DE USUARIO */}
      <Dialog.Root open={isOpenRegisterUser} onOpenChange={setIsOpenRegisterUser}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 450, background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)' }}>
          <Dialog.Title style={{ color: 'white' }}>Registrar Nuevo Usuario</Dialog.Title>
          <Text size="2" color="gray" mb="4">
            Cree una nueva cuenta de usuario en el sistema. Los administradores administran la plataforma y los agricultores gestionan sus propios cultivos y dispositivos.
          </Text>
          <form onSubmit={handleRegisterUserSubmit}>
            <Flex direction="column" gap="3" mt="3">
              <Grid columns="2" gap="3">
                <Box>
                  <label><Text color="gray" size="2">Nombres *</Text></label>
                  <TextField.Root 
                    placeholder="Ej: Pedro" 
                    value={newUserNombre}
                    onChange={(e) => setNewUserNombre(e.target.value)}
                    required
                    style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
                  />
                </Box>
                <Box>
                  <label><Text color="gray" size="2">Apellidos</Text></label>
                  <TextField.Root 
                    placeholder="Ej: Supo" 
                    value={newUserApellido}
                    onChange={(e) => setNewUserApellido(e.target.value)}
                    style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
                  />
                </Box>
              </Grid>
              
              <Grid columns="2" gap="3">
                <Box>
                  <label><Text color="gray" size="2">Correo Electrónico *</Text></label>
                  <TextField.Root 
                    type="email"
                    placeholder="Ej: pedro.supo@yaku.com" 
                    value={newUserCorreo}
                    onChange={(e) => setNewUserCorreo(e.target.value)}
                    required
                    style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
                  />
                </Box>
                <Box>
                  <label><Text color="gray" size="2">Teléfono / Celular</Text></label>
                  <TextField.Root 
                    placeholder="Ej: +51 987654321" 
                    value={newUserTelefono}
                    onChange={(e) => setNewUserTelefono(e.target.value)}
                    style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
                  />
                </Box>
              </Grid>

              <label><Text color="gray" size="2">Contraseña *</Text></label>
              <TextField.Root 
                type="password"
                placeholder="Mínimo 6 caracteres" 
                value={newUserContrasena}
                onChange={(e) => setNewUserContrasena(e.target.value)}
                required
                style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
              />

              <label><Text color="gray" size="2">Rol del Usuario *</Text></label>
              <Select.Root value={newUserRolId} onValueChange={setNewUserRolId}>
                <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }} />
                <Select.Content>
                  <Select.Item value="1">Administrador</Select.Item>
                  <Select.Item value="2">Agricultor</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>
            <Flex gap="3" mt="6" justify="end">
              <Dialog.Close><Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cancelar</Button></Dialog.Close>
              <Button type="submit" color="green" style={{ cursor: 'pointer' }} disabled={!newUserNombre || !newUserCorreo || !newUserContrasena}>
                Crear Usuario
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      {/* DIALOGO DE REGISTRO DE ALMACÉN */}
      <Dialog.Root open={isOpenRegisterAlmacen} onOpenChange={setIsOpenRegisterAlmacen}>
        <Dialog.Content aria-describedby={undefined} style={{ maxWidth: 450, background: 'var(--surface-mockup)', border: '1px solid var(--border-mockup)' }}>
          <Dialog.Title style={{ color: 'white' }}>Registrar Nuevo Almacén</Dialog.Title>
          <Text size="2" color="gray" mb="4">
            Añadir una nueva locación física de inventario para almacenar dispositivos y componentes.
          </Text>
          <form onSubmit={handleRegisterAlmacenSubmit}>
            <Flex direction="column" gap="3" mt="3">
              <label><Text color="gray" size="2">Nombre del Almacén *</Text></label>
              <TextField.Root 
                placeholder="Ej: Almacén Cusco Norte" 
                value={newAlmacenNombre}
                onChange={(e) => setNewAlmacenNombre(e.target.value)}
                required
                style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
              />

              <label><Text color="gray" size="2">Región / Departamento *</Text></label>
              <Select.Root value={newAlmacenRegionId} onValueChange={(val) => { setNewAlmacenRegionId(val); setNewAlmacenProvinciaId(""); setNewAlmacenDistritoId(""); }}>
                <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder="Seleccione Región..." />
                <Select.Content style={{ background: '#0f172a', color: 'white' }}>
                  {regiones.map((reg: any) => (
                    <Select.Item key={reg.id} value={reg.id.toString()}>{reg.nombre}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              <label><Text color="gray" size="2">Provincia *</Text></label>
              <Select.Root value={newAlmacenProvinciaId} onValueChange={(val) => { setNewAlmacenProvinciaId(val); setNewAlmacenDistritoId(""); }} disabled={!newAlmacenRegionId}>
                <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder="Seleccione Provincia..." />
                <Select.Content style={{ background: '#0f172a', color: 'white' }}>
                  {filteredProvinciasForAlmacen.map((prov: any) => (
                    <Select.Item key={prov.id} value={prov.id.toString()}>{prov.nombre}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              <label><Text color="gray" size="2">Distrito *</Text></label>
              <Select.Root value={newAlmacenDistritoId} onValueChange={setNewAlmacenDistritoId} disabled={!newAlmacenProvinciaId}>
                <Select.Trigger style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white', width: '100%' }} placeholder="Seleccione Distrito..." />
                <Select.Content style={{ background: '#0f172a', color: 'white' }}>
                  {filteredDistritosForAlmacen.map((dist: any) => (
                    <Select.Item key={dist.id} value={dist.id.toString()}>{dist.nombre}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              <label><Text color="gray" size="2">Dirección Física</Text></label>
              <TextField.Root 
                placeholder="Ej: Av. Sol 456" 
                value={newAlmacenDireccion}
                onChange={(e) => setNewAlmacenDireccion(e.target.value)}
                style={{ background: 'var(--surface2-mockup)', border: '1px solid var(--border-mockup)', color: 'white' }}
              />
            </Flex>
            <Flex gap="3" mt="6" justify="end">
              <Dialog.Close><Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>Cancelar</Button></Dialog.Close>
              <Button type="submit" color="green" style={{ cursor: 'pointer' }} disabled={!newAlmacenNombre || !newAlmacenDistritoId}>
                Crear Almacén
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
}
