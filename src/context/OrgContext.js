// src/context/OrgContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "../services/apiConfig";

// Config por defecto — siempre tiene valores, nunca undefined
export const DEFAULT_ORG_CONFIG = {
  org_id:   "default",
  name:     "CibercomHR",
  logo:     null,
  branding: {
    primaryColor:   "#5B8AF0",
    secondaryColor: "#4ECAAC",
    accentColor:    "#9B7FE8",
  },
  modules: {
    home_carousel:         true,
    organigrama:           true,
    empleados_table:       true,
    dashboard_admin:       true,
    dashboard_rh:          true,
    dashboard_medico:      false,
    dashboard_pm:          false,
    dashboard_contador:    false,
    dashboard_jefe_area:   false,
    incident_monitor:      false,
    global_search:         true,
  },
  kpis: [
    { id: "total_empleados",   label: "Total empleados",     visible: true,  color: "#5B8AF0" },
    { id: "areas_registradas", label: "Áreas registradas",   visible: true,  color: "#4ECAAC" },
    { id: "cumpleanos_mes",    label: "Cumpleaños este mes", visible: true,  color: "#F5A623" },
    { id: "sin_expediente",    label: "Sin expediente",      visible: true,  color: "#E86B5F" },
    { id: "sin_puesto",        label: "Sin puesto asignado", visible: false, color: "#9B7FE8" },
  ],
  customFields: [],
  roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"],
};

const OrgContext = createContext({
  orgConfig: DEFAULT_ORG_CONFIG,
  loadOrgConfig: async () => {},
  updateOrgConfig: async () => {},
  isModuleActive: () => true,
  getActiveKpis: () => DEFAULT_ORG_CONFIG.kpis.filter(k => k.visible),
});

export const OrgProvider = ({ children }) => {
  const [orgConfig, setOrgConfig] = useState(() => {
    // Recuperar del sessionStorage pero siempre mergear con defaults
    try {
      const stored = sessionStorage.getItem("hr_org_config");
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_ORG_CONFIG, ...parsed };
      }
    } catch { /* ignorar */ }
    return DEFAULT_ORG_CONFIG;
  });

  const applyBranding = useCallback((branding = {}) => {
    const root = document.documentElement;
    if (branding.primaryColor) {
      root.style.setProperty("--hr-accent", branding.primaryColor);
      const hex = branding.primaryColor.replace("#", "");
      const r = parseInt(hex.substring(0,2), 16);
      const g = parseInt(hex.substring(2,4), 16);
      const b = parseInt(hex.substring(4,6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        root.style.setProperty("--hr-accent-rgb", `${r}, ${g}, ${b}`);
      }
    }
    if (branding.secondaryColor)
      root.style.setProperty("--hr-accent-2", branding.secondaryColor);
  }, []);

  const loadOrgConfig = useCallback(async (orgId) => {
    if (!orgId) return;
    try {
      const data = await apiFetch(`/org/${orgId}/config`);
      if (data && typeof data === "object") {
        const merged = { ...DEFAULT_ORG_CONFIG, ...data };
        setOrgConfig(merged);
        applyBranding(merged.branding);
        sessionStorage.setItem("hr_org_config", JSON.stringify(merged));
      }
    } catch {
      // Si el endpoint no existe aún, usar defaults — sin error
      applyBranding(DEFAULT_ORG_CONFIG.branding);
    }
  }, [applyBranding]);

  const updateOrgConfig = useCallback(async (updates) => {
    try {
      await apiFetch(`/org/${orgConfig.org_id}/config`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    } catch {
      // Guardar localmente aunque falle el backend
    }
    const updated = { ...orgConfig, ...updates };
    setOrgConfig(updated);
    applyBranding(updated.branding || {});
    sessionStorage.setItem("hr_org_config", JSON.stringify(updated));
  }, [orgConfig, applyBranding]);

  // Aplicar branding al montar
  useEffect(() => {
    applyBranding(orgConfig.branding || {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isModuleActive = useCallback(
    (key) => {
      if (!key) return false;
      return orgConfig.modules?.[key] ?? true; // default: activo si no está definido
    },
    [orgConfig]
  );

  const getActiveKpis = useCallback(
    () => (orgConfig.kpis || []).filter(k => k.visible),
    [orgConfig]
  );

  return (
    <OrgContext.Provider value={{ orgConfig, loadOrgConfig, updateOrgConfig, isModuleActive, getActiveKpis }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => useContext(OrgContext);