import { useEffect, useMemo, useState } from "react";
import Select from "react-select";

const SHEET_ID = "16RKXKDq_uZD6AbA9PX868hdNRNrIu_AB9ufXR3EzElQ";
const SHEET_NAME = "Servidumbre";

const acreditaOptions = [
  { value: "Sí", label: "Sí" },
  { value: "No", label: "No" },
];

function ahoraSantiago() {
  return new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
}

function useDebounce(callback, delay = 600) {
  const [timer, setTimer] = useState(null);

  return (value) => {
    if (timer) clearTimeout(timer);
    const id = setTimeout(() => callback(value), delay);
    setTimer(id);
  };
}

export default function AcreditacionSanBernardo({ token, userInfo, onLogin, onLogout }) {
  const [registros, setRegistros] = useState([]);
  const [mensaje, setMensaje] = useState("");

  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroSeccion, setFiltroSeccion] = useState("");

  // Cantidad inicial visible
  const [visibleCount, setVisibleCount] = useState(10);

  // ================================
  // Cargar registros
  // ================================
  useEffect(() => {
    if (token) loadRegistros();
  }, [token]);

  useEffect(() => {
    if (mensaje) {
      const t = setTimeout(() => setMensaje(""), 2500);
      return () => clearTimeout(t);
    }
  }, [mensaje]);

  async function loadRegistros() {
    try {
      const range = encodeURIComponent(`${SHEET_NAME}!A2:F`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const rows = data.values || [];

      setRegistros(
        rows.map((row, idx) => ({
          id: idx,
          rowNumber: idx + 2,
          nombre: row[0] || "",
          seccion: row[1] || "",
          mesa: row[2] || "",
          acredita: row[3] || "No",
          fechaHora: row[4] || "",
          observaciones: row[5] || "",
        }))
      );

      setVisibleCount(10); // reset carga inicial

    } catch (err) {
      console.error(err);
      setMensaje("Error al cargar Servidumbre.");
    }
  }

  // ================================
  // Filtrado
  // ================================
  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) =>
      r.nombre.toLowerCase().includes(filtroNombre.toLowerCase()) &&
      r.seccion.toLowerCase().includes(filtroSeccion.toLowerCase())
    );
  }, [registros, filtroNombre, filtroSeccion]);

  // ================================
  // Guardado automático
  // ================================
  async function guardarFila(r) {
    const fechaFinal = r.acredita === "Sí" ? ahoraSantiago() : "";

    const values = [[
      r.nombre,
      r.seccion,
      r.mesa,
      r.acredita,
      fechaFinal,
      r.observaciones
    ]];

    try {
      const range = encodeURIComponent(`${SHEET_NAME}!A${r.rowNumber}:F${r.rowNumber}`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

      await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      });

      setMensaje("✔ Registro actualizado");
      loadRegistros();

    } catch (e) {
      console.error(e);
      setMensaje("❌ Error al guardar");
    }
  }

  const debouncedGuardar = useDebounce(guardarFila, 500);

  // ================================
  // UI
  // ================================
  return (
    <div className="form-section">

      {/* HEADER */}
      <div className="header-section">
        <p className="header-subtitle">Acreditación — San Bernardo (Servidumbre)</p>

        <div className="google-login-wrapper">
          {!token ? (
            <button className="google-login-btn" onClick={onLogin}>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                className="google-icon"
              />
              <span>Continuar con Google</span>
            </button>
          ) : (
            <div className="google-session-bar">
              <div className="google-session-info">
                <span className="google-session-title">Sesión iniciada como</span>
                <span className="google-session-email">{userInfo?.email}</span>
              </div>
              <button className="logout-btn" onClick={onLogout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FILTROS */}
      <div className="sanb-filters-row">
        <input
          className="sanb-filter-input"
          placeholder="Filtrar por nombre"
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
        />

        <input
          className="sanb-filter-input"
          placeholder="Filtrar por sección"
          value={filtroSeccion}
          onChange={(e) => setFiltroSeccion(e.target.value)}
        />
      </div>

      {/* TABLA CON SCROLL INFINITO */}
      <div
        className="sanb-table-wrapper"
        onScroll={(e) => {
          const el = e.target;
          const bottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;

          if (bottom) {
            setVisibleCount((prev) => prev + 10);
          }
        }}
      >
        <table className="sanb-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Sección</th>
              <th>Mesa</th>
              <th>¿Se acredita?</th>
              <th>Observaciones</th>
            </tr>
          </thead>

          <tbody>
            {registrosFiltrados.slice(0, visibleCount).map((r) => (
              <tr key={r.id}>
                <td>{r.nombre}</td>
                <td>{r.seccion}</td>
                <td>{r.mesa}</td>

                <td className="sanb-select-container">
                  <Select
                    classNamePrefix="react-select"
                    value={acreditaOptions.find((o) => o.value === r.acredita)}
                    options={acreditaOptions}
                    onChange={(opt) => {
                      const actualizado = { ...r, acredita: opt.value };
                      guardarFila(actualizado);
                    }}
                  />
                </td>

                <td>
                  <input
                    type="text"
                    className="obs-input"
                    defaultValue={r.observaciones}
                    onChange={(e) => {
                      const actualizado = { ...r, observaciones: e.target.value };
                      debouncedGuardar(actualizado);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mensaje && <div className="toast-message">{mensaje}</div>}
    </div>
  );
}
