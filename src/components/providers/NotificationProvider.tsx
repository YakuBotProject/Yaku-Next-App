'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import FloatingToast from '@/components/ui/FloatingToast';

interface Alerta {
  id: string;
  titulo: string;
  mensaje: string;
  severidad: 'info' | 'advertencia' | 'critica';
  valor?: number;
}

const NotificationContext = createContext<{ activeAlert: Alerta | null }>({ activeAlert: null });

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [activeAlert, setActiveAlert] = useState<Alerta | null>(null);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let autoHideTimeout: NodeJS.Timeout | null = null;

    const connectWS = () => {
      let wsUrl = '';
      if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;
        const envUrl = process.env.NEXT_PUBLIC_WS_URL;
        
        if (envUrl) {
          try {
            let tempUrl = envUrl;
            // Only substitute localhost/127.0.0.1 if the page is being accessed from a different hostname (e.g. mobile device on LAN)
            if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
              if (tempUrl.includes('127.0.0.1') || tempUrl.includes('localhost')) {
                tempUrl = tempUrl.replace('127.0.0.1', hostname).replace('localhost', hostname);
              }
            }
            // Force WSS if the frontend is loaded over HTTPS to prevent mixed content blocking
            if (window.location.protocol === 'https:') {
              tempUrl = tempUrl.replace(/^ws:\/\//i, 'wss://');
            } else {
              tempUrl = tempUrl.replace(/^wss:\/\//i, 'ws://');
            }
            wsUrl = tempUrl;
          } catch {
            wsUrl = envUrl;
          }
        } else {
          wsUrl = `${protocol}//${hostname}:8000/ws/alertas`;
        }
      } else {
        wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000/ws/alertas';
      }
      console.log(`[WS] Conectando a ${wsUrl}...`);
      
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('[WS] Conectado exitosamente al backend de alertas.');
        };

        socket.onmessage = (event) => {
          try {
            const alertaData: Alerta = JSON.parse(event.data);
            console.log('[WS] Alerta recibida:', alertaData);
            
            // Mostrar alerta flotante
            setActiveAlert(alertaData);

            // Auto-ocultar después de 6 segundos
            if (autoHideTimeout) clearTimeout(autoHideTimeout);
            autoHideTimeout = setTimeout(() => {
              setActiveAlert(null);
            }, 6000);

          } catch (err) {
            console.error('[WS] Error parseando datos de alerta:', err);
          }
        };

        socket.onclose = (event) => {
          console.warn('[WS] Conexión de WebSocket cerrada, intentando reconectar en 5s...');
          reconnectTimeout = setTimeout(connectWS, 5000);
        };

        socket.onerror = (err) => {
          console.error('[WS] Error de conexión WebSocket:', err);
          socket?.close();
        };

      } catch (err) {
        console.error('[WS] Error inicializando WebSocket:', err);
        reconnectTimeout = setTimeout(connectWS, 5000);
      }
    };

    connectWS();

    return () => {
      if (socket) {
        socket.onclose = null; // Evitar reconexión al desmontar
        socket.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (autoHideTimeout) clearTimeout(autoHideTimeout);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ activeAlert }}>
      {children}
      {activeAlert && (
        <FloatingToast 
          alerta={activeAlert} 
          onClose={() => setActiveAlert(null)} 
        />
      )}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
