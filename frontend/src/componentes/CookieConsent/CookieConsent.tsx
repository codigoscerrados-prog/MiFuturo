"use client";

import { useEffect, useState } from "react";
import styles from "./CookieConsent.module.css";

const CONSENT_COOKIE = "lv_cookie_consent";
const PREFS_COOKIE = "lv_cookie_preferences";
const DEFAULT_CATEGORIES = { analytics: false, marketing: false };

type ConsentValue = "all" | "essential" | "custom";

type CategoryState = typeof DEFAULT_CATEGORIES;

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:(?:^|.*;\\s*)${name}\\s*\\=\\s*([^;]*).*$)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function parsePreferences(value: string | null): CategoryState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
      };
    }
  } catch (error) {
    console.warn("No se pudo leer preferencias de cookies", error);
  }
  return null;
}

export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentValue | null>(null);
  const [categories, setCategories] = useState<CategoryState>(DEFAULT_CATEGORIES);
  const [showBanner, setShowBanner] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const storedConsent = readCookie(CONSENT_COOKIE) as ConsentValue | null;
    const storedCategories = parsePreferences(readCookie(PREFS_COOKIE));
    if (storedCategories) {
      setCategories(storedCategories);
    }
    if (storedConsent) {
      setConsent(storedConsent);
    } else {
      setShowBanner(true);
    }
  }, []);

  useEffect(() => {
    const handler = () => setPanelOpen(true);
    window.addEventListener("lv-open-cookie-preferences", handler);
    return () => window.removeEventListener("lv-open-cookie-preferences", handler);
  }, []);

  const analyticsEnabled = consent === "all" || (consent === "custom" && categories.analytics);
  const marketingEnabled = consent === "all" || (consent === "custom" && categories.marketing);

  useEffect(() => {
    if (analyticsEnabled) {
      // Aquí podrías inicializar tus herramientas de analítica cuando corresponda.
    }
  }, [analyticsEnabled]);

  function persistConsent(value: ConsentValue, nextCategories: CategoryState) {
    setConsent(value);
    setCategories(value === "custom" ? nextCategories : DEFAULT_CATEGORIES);
    setShowBanner(false);
    setPanelOpen(false);
    writeCookie(CONSENT_COOKIE, value);
    writeCookie(PREFS_COOKIE, JSON.stringify(value === "custom" ? nextCategories : DEFAULT_CATEGORIES));
  }

  function handleAcceptAll() {
    persistConsent("all", { analytics: true, marketing: true });
  }

  function handleReject() {
    persistConsent("essential", DEFAULT_CATEGORIES);
  }

  function handleSavePreferences() {
    persistConsent("custom", categories);
  }

  if (!showBanner && !panelOpen) return null;

  return (
    <div className={styles.root} aria-live="polite">
      {showBanner && (
        <div className={styles.banner} role="region" aria-label="Preferencias de cookies">
          <div>
            <p className={styles.bannerTitle}>Tu privacidad, tu decisión.</p>
            <p className={styles.bannerCopy}>
              Usamos cookies esenciales para que el sitio funcione. Tú decides si habilitas analítica o marketing.
            </p>
          </div>
          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.primary}`} onClick={handleAcceptAll}>
              Aceptar todas
            </button>
            <button className={styles.button} onClick={handleReject}>
              Rechazar no esenciales
            </button>
            <button className={`${styles.button} ${styles.outline}`} onClick={() => setPanelOpen(true)}>
              Configurar
            </button>
          </div>
        </div>
      )}

      {panelOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Preferencias de cookies">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalKicker}>Preferencias de cookies</p>
                <h2 className={styles.modalTitle}>Elige lo que quieres compartir</h2>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setPanelOpen(false)} aria-label="Cerrar">
                ×
              </button>
            </div>

            <p className={styles.modalCopy}>
              Las cookies esenciales ya están activas. Puedes activar analítica o marketing cuando lo desees. Elige con calma; tu
              elección se recuerda en tu navegador.
            </p>

            <div className={styles.toggleGroup}>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={categories.analytics}
                  onChange={(event) =>
                    setCategories((prev) => ({ ...prev, analytics: event.target.checked }))
                  }
                />
                <span>
                  <strong>Analítica</strong>
                  <br /> Ayuda a entender cómo usamos la plataforma.
                </span>
              </label>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={categories.marketing}
                  onChange={(event) =>
                    setCategories((prev) => ({ ...prev, marketing: event.target.checked }))
                  }
                />
                <span>
                  <strong>Marketing</strong>
                  <br /> Solo si quieres recibir experiencias personalizadas.
                </span>
              </label>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={`${styles.button} ${styles.primary}`} onClick={handleSavePreferences}>
                Guardar preferencias
              </button>
              <button type="button" className={styles.button} onClick={() => persistConsent("essential", DEFAULT_CATEGORIES)}>
                Solo esenciales
              </button>
            </div>

            <p className={styles.smallCopy}>
              Cambia tu elección en cualquier momento desde el enlace “Preferencias de cookies” en el pie de página.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
