// src/Components/DialogoHost.jsx — muestra los diálogos de services/dialogo.js
// con el mismo Modal del resto del sistema.
import React, { useEffect, useState } from "react";
import { FiCheck, FiAlertTriangle, FiCopy } from "react-icons/fi";
import Modal from "./Modal";
import { registrarHost } from "../services/dialogo";

export default function DialogoHost() {
  const [d, setD] = useState(null);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => registrarHost((nuevo) => { setCopiado(false); setD(nuevo); }), []);

  const cerrar = (valor) => { d?.resolve(valor); setD(null); };
  if (!d) return null;
  const confirma = d.tipo === "confirmar";
  const peligro = confirma && d.peligro !== false;

  return (
    <Modal abierto onClose={() => cerrar(false)} ancho={460}
      titulo={d.titulo || (confirma ? "Confirmar" : "Aviso")}
      onGuardar={() => cerrar(true)} labelGuardar={d.confirmarTexto || (confirma ? "Confirmar" : "Entendido")}
      iconGuardar={peligro ? FiAlertTriangle : FiCheck}>
      <p className="vp-sub" style={{ margin: 0, whiteSpace: "pre-line" }}>{d.mensaje}</p>
      {d.copiable && (
        <div className="dlg-copiable">
          <code>{d.copiable}</code>
          <button type="button" className="perfil-baja-btn" onClick={() => {
            navigator.clipboard?.writeText(d.copiable).then(() => setCopiado(true)).catch(() => {});
          }}>{copiado ? <><FiCheck aria-hidden="true" /> Copiado</> : <><FiCopy aria-hidden="true" /> Copiar</>}</button>
        </div>
      )}
    </Modal>
  );
}
