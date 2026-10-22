/* ==========================================================================
   AQUASORT MASTER DELUXE - FIREBASE CONFIGURATION
   Configuración de Firebase para Autenticación de Google y Cloud Firestore
   ========================================================================== */

/**
 * Configuración predeterminada de Firebase.
 * 
 * Si tienes tu propio proyecto en https://console.firebase.google.com:
 * 1. Crea un proyecto (es 100% gratuito).
 * 2. En "Autenticación" -> "Sign-in method" -> Activa "Google".
 * 3. En "Firestore Database" -> Crea una base de datos en modo producción o prueba.
 * 4. En "Configuración del proyecto" -> "Tus apps" -> Copia los valores aquí
 *    o ingrésalos directamente desde la ventana "Guardado en la Nube" en el juego.
 */
window.DEFAULT_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

/**
 * Obtiene la configuración activa de Firebase, priorizando cualquier
 * configuración guardada por el usuario en localStorage.
 */
window.getFirebaseConfig = function() {
  try {
    const savedConfig = localStorage.getItem('aquasort_firebase_config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error leyendo configuración guardada de Firebase:', e);
  }
  return window.DEFAULT_FIREBASE_CONFIG;
};

/**
 * Guarda una nueva configuración de Firebase en localStorage.
 */
window.saveFirebaseConfig = function(config) {
  try {
    if (!config || !config.apiKey || !config.projectId) {
      throw new Error('La configuración debe contener al menos apiKey y projectId.');
    }
    localStorage.setItem('aquasort_firebase_config', JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('Error guardando configuración de Firebase:', e);
    return false;
  }
};

/**
 * Elimina la configuración personalizada de Firebase de localStorage.
 */
window.clearFirebaseConfig = function() {
  try {
    localStorage.removeItem('aquasort_firebase_config');
  } catch (e) {}
};
