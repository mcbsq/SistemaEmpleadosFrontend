// ErrorBoundary — captura errores de render de React para que un componente
// roto no deje la pantalla en blanco: registra el incidente (categoría
// "render", visible en /monitor) y muestra un fallback con opción de reintento.
import React from "react";
import { FiHome } from "react-icons/fi";
import IconButton from "./IconButton";
import { logRenderError } from "../utils/incidentLogger";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logRenderError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "60vh", gap: 12,
          padding: 24, textAlign: "center",
        }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Algo salió mal en esta pantalla</h2>
          <p style={{ opacity: 0.7, maxWidth: 420 }}>
            El error quedó registrado en el monitor del sistema.
            Puedes reintentar o volver al inicio.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <IconButton accion="refrescar" size="lg" label="Reintentar" onClick={() => this.setState({ hasError: false })} />
            <IconButton icon={FiHome} tone="save" size="lg" label="Ir al inicio" onClick={() => { window.location.href = "/Dashboard"; }} />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
