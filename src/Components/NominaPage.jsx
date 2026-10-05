// src/Components/NominaPage.jsx
// Nómina en pestañas: recibos del sistema externo, el motor de cálculo con
// sus parámetros, el aguinaldo del año y las horas extra.
import React, { useState } from "react";
import { FiDollarSign, FiFileText, FiSliders, FiGift, FiClock } from "react-icons/fi";
import PayrollTable from "./PayrollTable";
import NominaConfig from "./NominaConfig";
import { Aguinaldo, HorasExtra } from "./NominaPrestaciones";
import "./OrgSettings.css";
import "./NominaConfig.css";

const TABS = [
  { id: "recibos",  label: "Recibos",     icon: FiFileText },
  { id: "calculo",  label: "Cálculo",     icon: FiSliders },
  { id: "aguinaldo", label: "Aguinaldo",  icon: FiGift },
  { id: "horas",    label: "Horas extra", icon: FiClock },
];

export default function NominaPage() {
  const [tab, setTab] = useState(() => {
    try { return sessionStorage.getItem("nomina_tab") || "recibos"; } catch { return "recibos"; }
  });
  const cambiar = (id) => { setTab(id); try { sessionStorage.setItem("nomina_tab", id); } catch { /* sin storage */ } };

  return (
    <div className="orgs-root">
      <div className="hr-page-header">
        <div>
          <h2 className="hr-title"><FiDollarSign style={{ marginRight: 8, verticalAlign: "-3px" }} />Nómina</h2>
          <p className="hr-subtitle">Recibos, cálculo de referencia, aguinaldo y horas extra.</p>
        </div>
      </div>
      <div className="orgs-tabs" role="tablist" aria-label="Secciones de nómina">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={`orgs-tab ${tab === t.id ? "orgs-tab--active" : ""}`} onClick={() => cambiar(t.id)}>
            <t.icon style={{ marginRight: 6, verticalAlign: "-2px" }} aria-hidden="true" />{t.label}
          </button>
        ))}
      </div>
      {tab === "recibos" && <PayrollTable embebido />}
      {tab === "calculo" && <NominaConfig embebido />}
      {tab === "aguinaldo" && <Aguinaldo />}
      {tab === "horas" && <HorasExtra />}
    </div>
  );
}
