import { useState, useEffect, useRef } from "react";
import AcreditacionForm from "./components/AcreditacionForm";
import HospedadoresForm from "./components/HospedadoresForm";
import "./acreditacion.css";

const CLIENT_ID =
  "995432520839-ihrvku3700816ddu6rs96ekovire3cce.apps.googleusercontent.com";

export default function App() {
  const [vista, setVista] = useState("acreditacion");
  const [token, setToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  const tokenClientRef = useRef(null);

  // 🔵 Inicializar Google Identity Services esperando a que cargue el script
  useEffect(() => {
    function initializeGSI() {
      if (
        window.google &&
        window.google.accounts &&
        window.google.accounts.oauth2
      ) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope:
            "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid",
          callback: async (resp) => {
            if (resp?.access_token) {
              const accessToken = resp.access_token;

              const expiresAt = Date.now() + 120 * 60 * 1000; // 2 horas
              localStorage.setItem(
                "googleSession",
                JSON.stringify({ token: accessToken, expiresAt })
              );

              setToken(accessToken);
              await fetchUserInfo(accessToken);
            }
          },
        });

        console.log("GSI cargado correctamente.");
        return true;
      }
      return false;
    }

    // 1. Intento inmediato
    if (initializeGSI()) return;

    // 2. Intento cada 200ms hasta que el script cargue
    const interval = setInterval(() => {
      if (initializeGSI()) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // 🔵 Cargar sesión persistida del localStorage
  useEffect(() => {
    const stored = localStorage.getItem("googleSession");
    if (!stored) return;

    const { token, expiresAt } = JSON.parse(stored);

    if (Date.now() < expiresAt) {
      setToken(token);
      fetchUserInfo(token);
    } else {
      localStorage.removeItem("googleSession");
    }
  }, []);

  // 🔵 Obtener info del usuario Google
  async function fetchUserInfo(accessToken) {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      setUserInfo({ name: data.name, email: data.email });
    } catch (e) {
      console.error("Error al cargar userinfo", e);
    }
  }

  // 🔵 Iniciar sesión
  function handleLogin() {
    if (!tokenClientRef.current) {
      console.error("Google aún no está listo.");
      return;
    }
    tokenClientRef.current.requestAccessToken();
  }

  // 🔵 Cerrar sesión
  function handleLogout() {
    setToken(null);
    setUserInfo(null);
    localStorage.removeItem("googleSession");

    if (window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(CLIENT_ID, () => {});
    }
  }

  return (
    <div className="main-center">
      <div className="form-layout">

        {/* Tabs laterales */}
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

        {/* Contenido */}
        <div className="form-content">
          <div className="top-image-container">
            <img
              src="https://i.ibb.co/DDvSqcWW/concentracion-jovenes-04.png"
              alt="Acreditación Jóvenes"
            />
          </div>

          <h1 className="form-title">Acreditación Jóvenes</h1>

          {/* FORMULARIOS */}
          {vista === "acreditacion" && (
            <AcreditacionForm
              token={token}
              userInfo={userInfo}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          )}

          {vista === "hospedadores" && (
            <HospedadoresForm
              token={token}
              userInfo={userInfo}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>
    </div>
  );
}
