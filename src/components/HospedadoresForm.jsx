import { useEffect, useState } from "react";
import Select from "react-select";

const SHEET_ID = "16RKXKDq_uZD6AbA9PX868hdNRNrIu_AB9ufXR3EzElQ";
const SHEET_NAME_HOSPEDADORES = "Hospedadores";

export default function HospedadoresForm({ token, onLogin, onLogout, userInfo }) {
  const [mensaje, setMensaje] = useState("");
  const [hospedadores, setHospedadores] = useState([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroLocal, setFiltroLocal] = useState(null);
  const [loading, setLoading] = useState(false);

  // Cargar hospedadores cuando haya token
  useEffect(() => {
    if (!token) {
      setHospedadores([]);
      return;
    }
    loadHospedadores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadHospedadores() {
    if (!token) return;

    try {
      setLoading(true);
      const range = encodeURIComponent(`${SHEET_NAME_HOSPEDADORES}!A2:E`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Error al leer hospedadores:", res.status, txt);
        setMensaje("No se pudieron cargar los hospedadores.");
        return;
      }

      const data = await res.json();
      const rows = data.values || [];

      const mapped = rows.map((row, idx) => ({
        id: idx,
        nombre: row[0] || "",
        direccion: row[1] || "",
        contacto: row[2] || "",
        local: row[3] || "",
        visitasAsignadas: row[4] || "",
      }));

      setHospedadores(mapped);
      setMensaje("");
    } catch (err) {
      console.error("Error al cargar hospedadores:", err);
      setMensaje("Ocurrió un error al cargar los hospedadores.");
    } finally {
      setLoading(false);
    }
  }

  // Opciones de Local para filtro
  const localOptions = Array.from(
    new Set(hospedadores.map((h) => h.local).filter(Boolean))
  ).map((local) => ({ value: local, label: local }));

  // Filtro aplicado
  const hospedadoresFiltrados = hospedadores.filter((h) => {
    const matchNombre = filtroNombre
      ? h.nombre.toLowerCase().includes(filtroNombre.toLowerCase())
      : true;

    const matchLocal = filtroLocal ? h.local === filtroLocal.value : true;

    return matchNombre && matchLocal;
  });

  return (
    <div className="form-section">
      {/* Cabecera + login, mismo estilo que antes */}
      <div className="header-section">
        <p className="header-subtitle">
          Consulta el detalle de los hospedadores y sus visitas asignadas.
        </p>

        <div className="google-login-wrapper">
          {!token ? (
            <button
              type="button"
              className="google-login-btn"
              onClick={onLogin}
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="google-icon"
              />
              <span>Continuar con Google</span>
            </button>
          ) : (
            <div className="google-session-bar">
              <div className="google-session-info">
                <span className="google-session-title">
                  Sesión iniciada como
                </span>
                <span className="google-session-email">
                  {userInfo?.email || "Usuario autenticado"}
                </span>
              </div>

              <button className="logout-btn" onClick={onLogout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      {token && (
        <div className="filters-row">
          <div className="filter-group">
            <label>Buscar por Nombre</label>
            <input
              type="text"
              value={filtroNombre}
              onChange={(e) => setFiltroNombre(e.target.value)}
              placeholder="Ej: Juan, María..."
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>Filtrar por Local</label>
            <Select
              value={filtroLocal}
              onChange={setFiltroLocal}
              options={localOptions}
              placeholder="Todos los locales"
              isClearable
              classNamePrefix="rs"
            />
          </div>
        </div>
      )}

      {/* Tabla de Hospedadores */}
      {token && (
        <div className="hospedadores-table-wrapper">
          {loading ? (
            <p>Cargando hospedadores...</p>
          ) : (
            <table className="hospedadores-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Dirección</th>
                  <th>N° Contacto</th>
                  <th>Local</th>
                  <th>Visitas Asignadas</th>
                </tr>
              </thead>
              <tbody>
                {hospedadoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center" }}>
                      No hay registros que coincidan con el filtro.
                    </td>
                  </tr>
                ) : (
                  hospedadoresFiltrados.map((h) => (
                    <tr key={h.id}>
                      <td>{h.nombre}</td>
                      <td>{h.direccion}</td>
                      <td>{h.contacto}</td>
                      <td>{h.local}</td>
                      <td>{h.visitasAsignadas}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {mensaje && <div className="form-message">{mensaje}</div>}
    </div>
  );
}
