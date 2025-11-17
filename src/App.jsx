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

  // Inicializar Google Identity una sola vez
  useEffect(() => {
    if (!window.google) return;

    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:
        "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid",
      callback: async (resp) => {
        if (resp?.access_token) {
          const accessToken = resp.access_token;

          const expiresAt = Date.now() + 120 * 60 * 1000; // 2 HORAS
          localStorage.setItem(
            "googleSession",
            JSON.stringify({ token: accessToken, expiresAt })
          );

          setToken(accessToken);
          await fetchUserInfo(accessToken);
        }
      },
    });
  }, []);

  // Cargar sesión persistida
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

  function handleLogin() {
    if (!tokenClientRef.current) return;
    tokenClientRef.current.requestAccessToken();
  }

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

          {vista === "acreditacion" && (
            <AcreditacionForm
              token={token}
              onLogin={handleLogin}
              onLogout={handleLogout}
              userInfo={userInfo}
            />
          )}

          {vista === "hospedadores" && (
            <HospedadoresForm
              token={token}
              onLogin={handleLogin}
              onLogout={handleLogout}
              userInfo={userInfo}
            />
          )}
        </div>
      </div>
    </div>
  );
}
