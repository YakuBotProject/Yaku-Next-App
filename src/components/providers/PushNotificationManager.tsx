'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { getVapidPublicKey, registrarSuscripcionPush } from '@/actions/alertas';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Verificar si el navegador soporta Service Workers y Notificaciones Push
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Las notificaciones Push no son soportadas en este navegador.');
      return;
    }

    // Registrar el Service Worker
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[Service Worker] Registrado con éxito:', registration);
        setSwRegistration(registration);

        // Si ya tenemos permisos, asegurar que la suscripción esté activa en el backend
        if (Notification.permission === 'granted') {
          suscripcionDeSeguridad(registration);
        }
      })
      .catch((err) => {
        console.error('[Service Worker] Registro fallido:', err);
      });
  }, []);

  const suscripcionDeSeguridad = async (registration: ServiceWorkerRegistration) => {
    try {
      const existingSub = await registration.pushManager.getSubscription();
      if (!existingSub) {
        await crearNuevaSuscripcion(registration);
      }
    } catch (err) {
      console.error('[Push] Error en suscripción de seguridad:', err);
    }
  };

  const crearNuevaSuscripcion = async (registration: ServiceWorkerRegistration) => {
    try {
      const resKey = await getVapidPublicKey();
      if (!resKey.success || !resKey.publicKey) {
        console.error('[Push] Error al obtener llave VAPID:', resKey.error);
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(resKey.publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('[Push] Suscripción creada en el navegador:', subscription);

      // Enviar la suscripción al backend BFF
      const subJSON = subscription.toJSON();
      const resReg = await registrarSuscripcionPush(subJSON);
      if (resReg.success) {
        console.log('[Push] Suscripción registrada en el servidor con éxito.');
      } else {
        console.error('[Push] Falló el registro de suscripción en el servidor:', resReg.error);
      }
    } catch (err) {
      console.error('[Push] Error durante la creación de la suscripción:', err);
    }
  };

  return null;
}
