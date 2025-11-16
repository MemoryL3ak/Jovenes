import { useState } from "react";
import AcreditacionForm from "./components/AcreditacionForm";
import HospedadoresForm from "./components/HospedadoresForm";
import "./acreditacion.css";

export default function App() {
  const [vista, setVista] = useState("acreditacion");

  return (
    <div className="main-center">
      <div className="form-layout">
        {/* Pestañas verticales */}
        <div className="tab-vertical">
          <button
            className={`tab-btn ${vista === "acreditacion" ? "activo" : ""}`}
            onClick={() => setVista("acreditacion")}
          >
            Acreditación
          </button>
          <button
            className={`tab-btn ${vista === "hospedadores" ? "activo" : ""}`}
            onClick={() => setVista("hospedadores")}
          >
            Hospedadores
          </button>
        </div>

        {/* Contenido principal */}
        <div className="form-content">
          {/* Banner superior */}
          <div className="top-image-container">
            <img
              src="https://i.ibb.co/DDvSqcWW/concentracion-jovenes-04.png"
              alt="Acreditación Jóvenes"
            />
          </div>

          <h1 className="form-title">Acreditación Jóvenes</h1>
        

          {vista === "acreditacion" && <AcreditacionForm />}
          {vista === "hospedadores" && <HospedadoresForm />}
        </div>
      </div>
    </div>
  );
}
