import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./styles.css"
import { BrowserRouter } from "react-router-dom"
import ErrorBoundary from "./Components/ErrorBoundary"
import { installIncidentCapture } from "./utils/incidentLogger"

// Captura global de errores (fetch, JS, promesas) catalogados para /monitor.
// Debe instalarse ANTES del primer render para no perder errores tempranos.
installIncidentCapture()

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
)
