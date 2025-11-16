import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";

const CLIENT_ID =
  "995432520839-ihrvku3700816ddu6rs96ekovire3cce.apps.googleusercontent.com";

const SHEET_ID = "16RKXKDq_uZD6AbA9PX868hdNRNrIu_AB9ufXR3EzElQ";
const SHEET_NAME = "Acreditación";

const acreditaOptions = [
  { value: "Sí", label: "Sí" },
  { value: "No", label: "No" },
];

function ahoraSantiago() {
  return new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
}

export default function AcreditacionForm() {
  const [token, setToken] = useState(null);
  const tokenClientRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [userInfo, setUserInfo] = useState(null);

  const [selectedNombreEncargado, setSelectedNombreEncargado] =
    useState(null);
  const [selectedIglesia, setSelectedIglesia] = useState(null);

  // Registros leídos desde la hoja "Acreditación"
  const [registros, setRegistros] = useState([]);

  // Registro actualmente seleccionado (para saber qué fila actualizar)
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    iglesia: "",
    contacto: "",
    tipoMovilizacion: "",
    fechaHoraRetiro: "",
    hospedador: "",
    contactoHospedador: "",
    direccion: "",
    local: "",
    acreditaVisita: acreditaOptions[1], // No
    fechaHora: "",
    observaciones: "",
  });

  // Único obligatorio: ¿Se acredita visita?
  const camposObligatoriosOk = !!(
    form.acreditaVisita && form.acreditaVisita.value
  );

  // Inicializa Google Identity Services
  useEffect(() => {
    if (!window.google) return;

    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:
        "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid",
      callback: async (resp) => {
        if (resp && resp.access_token) {
          setToken(resp.access_token);
          setMensaje("");
          await fetchUserInfo(resp.access_token);
        }
      },
    });
  }, []);

  // Cuando hay token, cargamos los registros desde la hoja
  useEffect(() => {
    if (!token) return;
    loadRegistros(token);
  }, [token]);

  // Autollenar fecha/hora acreditación cuando pasa a "Sí"
  useEffect(() => {
    if (form.acreditaVisita?.value === "Sí") {
      setForm((f) => ({ ...f, fechaHora: ahoraSantiago() }));
    } else {
      setForm((f) => ({ ...f, fechaHora: "" }));
    }
  }, [form.acreditaVisita?.value]);

  // Opciones dinámicas de Iglesia
  const iglesiaOptions = useMemo(() => {
    const set = new Set(
      registros.map((r) => r.iglesia).filter((ig) => ig && ig.trim())
    );
    return Array.from(set).map((ig) => ({ value: ig, label: ig }));
  }, [registros]);

  // Opciones dinámicas de Nombre, filtrando por iglesia si corresponde
  const nombreEncargadoOptions = useMemo(() => {
    let data = registros;
    if (selectedIglesia) {
      data = data.filter((r) => r.iglesia === selectedIglesia.value);
    }

    const set = new Set(data.map((r) => r.nombre).filter((n) => n && n.trim()));
    return Array.from(set).map((n) => ({ value: n, label: n }));
  }, [registros, selectedIglesia]);

  async function fetchUserInfo(accessToken) {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUserInfo({
        name: data.name || "",
        email: data.email || "",
      });
    } catch (err) {
      console.error("Error al obtener userinfo", err);
    }
  }

  // Carga registros y guarda número de fila (rowNumber)
  async function loadRegistros(accessToken) {
    try {
      const range = encodeURIComponent(`${SHEET_NAME}!A2:L`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Error al leer registros:", res.status, txt);
        return;
      }

      const data = await res.json();
      const rows = data.values || [];

      const mapped = rows.map((row, idx) => ({
        id: idx,
        rowNumber: idx + 2, // fila real en la hoja (parte en A2)
        nombre: row[0] || "",
        iglesia: row[1] || "",
        contacto: row[2] || "",
        tipoMovilizacion: row[3] || "",
        fechaHoraRetiro: row[4] || "",
        hospedador: row[5] || "",
        contactoHospedador: row[6] || "",
        direccion: row[7] || "",
        local: row[8] || "",
        acreditaVisita: row[9] || "No",
        fechaHora: row[10] || "",
        observaciones: row[11] || "",
      }));

      setRegistros(mapped);
    } catch (err) {
      console.error("Error al cargar registros:", err);
    }
  }

  function handleLogin() {
    if (!tokenClientRef.current) {
      setMensaje(
        "No se pudo inicializar Google. Revisa el script de GIS en index.html."
      );
      return;
    }
    tokenClientRef.current.requestAccessToken();
  }

  function handleLogout() {
    setToken(null);
    setUserInfo(null);
    setMensaje("");
    setRegistros([]);
    setSelectedIglesia(null);
    setSelectedNombreEncargado(null);
    setRegistroSeleccionado(null);
    limpiarFormulario();

    if (
      window.google &&
      window.google.accounts &&
      window.google.accounts.oauth2
    ) {
      try {
        window.google.accounts.oauth2.revoke(CLIENT_ID, () => {});
      } catch (e) {
        console.warn("No se pudo revocar el token:", e);
      }
    }
  }

  // Solo para campos editables: fechaHoraRetiro y observaciones
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Cambio de iglesia en el filtro
  function handleChangeIglesia(opt) {
    setSelectedIglesia(opt);

    if (!opt) {
      return;
    }

    const iglesia = opt.value;

    if (selectedNombreEncargado) {
      const nombre = selectedNombreEncargado.value;
      const row = registros.find(
        (r) => r.nombre === nombre && r.iglesia === iglesia
      );
      if (row) {
        llenarFormularioDesdeRegistro(row);
        setRegistroSeleccionado(row);
        return;
      }
    }

    setForm((prev) => ({ ...prev, iglesia }));
  }

  // Cambio de nombre en el filtro
  function handleChangeNombreEncargado(opt) {
    setSelectedNombreEncargado(opt);

    if (!opt) {
      setRegistroSeleccionado(null);
      limpiarFormulario();
      return;
    }

    const nombre = opt.value;
    let row = null;

    if (selectedIglesia) {
      row = registros.find(
        (r) =>
          r.nombre === nombre && r.iglesia === selectedIglesia.value
      );
    }

    if (!row) {
      row = registros.find((r) => r.nombre === nombre);
    }

    if (row) {
      llenarFormularioDesdeRegistro(row);
      setRegistroSeleccionado(row);

      const igOpt = iglesiaOptions.find((o) => o.value === row.iglesia);
      setSelectedIglesia(igOpt || null);
    }
  }

  function llenarFormularioDesdeRegistro(row) {
    const acreditaOpt =
      acreditaOptions.find((o) => o.value === row.acreditaVisita) ||
      acreditaOptions[1];

    setForm({
      nombre: row.nombre,
      iglesia: row.iglesia,
      contacto: row.contacto,
      tipoMovilizacion: row.tipoMovilizacion || "",
      fechaHoraRetiro: row.fechaHoraRetiro || "",
      hospedador: row.hospedador || "",
      contactoHospedador: row.contactoHospedador || "",
      direccion: row.direccion || "",
      local: row.local || "",
      acreditaVisita: acreditaOpt,
      fechaHora: row.fechaHora || "",
      observaciones: row.observaciones || "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!token) {
      setMensaje("Debes iniciar sesión con Google antes de guardar.");
      return;
    }
    if (!registroSeleccionado) {
      setMensaje("Debes seleccionar un registro desde los filtros antes de guardar.");
      return;
    }
    if (!camposObligatoriosOk) {
      setMensaje("Debes seleccionar una opción en '¿Se Acredita Visita?' antes de guardar.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      // Tomamos el registro original y actualizamos solo los campos requeridos
      const updatedRow = {
        ...registroSeleccionado,
        fechaHoraRetiro: form.fechaHoraRetiro,
        acreditaVisita: form.acreditaVisita?.value || "No",
        fechaHora: form.fechaHora,
        observaciones: form.observaciones,
      };

      const rowNumber = registroSeleccionado.rowNumber;

      const values = [
        [
          updatedRow.nombre,
          updatedRow.iglesia,
          updatedRow.contacto,
          updatedRow.tipoMovilizacion || "",
          updatedRow.fechaHoraRetiro,
          updatedRow.hospedador,
          updatedRow.contactoHospedador,
          updatedRow.direccion,
          updatedRow.local,
          updatedRow.acreditaVisita,
          updatedRow.fechaHora,
          updatedRow.observaciones,
        ],
      ];

      const range = encodeURIComponent(`${SHEET_NAME}!A${rowNumber}:L${rowNumber}`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error al guardar: ${res.status} ${txt}`);
      }

      // Actualizamos también en memoria para que los filtros queden al día
      setRegistros((prev) =>
        prev.map((r) =>
          r.rowNumber === rowNumber ? updatedRow : r
        )
      );
      setRegistroSeleccionado(updatedRow);

      setMensaje("✅ Registro actualizado correctamente.");
    } catch (err) {
      console.error(err);
      setMensaje(
        "Ocurrió un error al actualizar. Revisa la consola, el CLIENT_ID y el SHEET_ID."
      );
    } finally {
      setLoading(false);
    }
  }

  function limpiarFormulario() {
    setForm({
      nombre: "",
      iglesia: "",
      contacto: "",
      tipoMovilizacion: "",
      fechaHoraRetiro: "",
      hospedador: "",
      contactoHospedador: "",
      direccion: "",
      local: "",
      acreditaVisita: acreditaOptions[1],
      fechaHora: "",
      observaciones: "",
    });
  }

  return (
    <div className="form-section">
      {/* CABECERA */}
      <div className="header-section">
        <p className="header-subtitle">
          Selecciona un registro y completa la acreditación.
        </p>

        <div className="google-login-wrapper">


       {!token ? (
  <button
    type="button"
    className="google-login-btn"
    onClick={handleLogin}
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
      <span className="google-session-title">Sesión iniciada como</span>
      <span className="google-session-email">{userInfo?.email}</span>
    </div>
    <button
      type="button"
      className="btn btn-secondary google-logout-btn"
      onClick={handleLogout}
    >
      Cerrar sesión
    </button>
  </div>
)}




        </div>
      </div>

      {/* FILTROS */}
      <div className="filters-row">
        <div className="filter-group">
          <label>Buscar por Nombre Encargado</label>
          <Select
            value={selectedNombreEncargado}
            onChange={handleChangeNombreEncargado}
            options={nombreEncargadoOptions}
            placeholder="Buscar nombre..."
            isClearable
          />
        </div>
        <div className="filter-group">
          <label>Buscar por Iglesia</label>
          <Select
            value={selectedIglesia}
            onChange={handleChangeIglesia}
            options={iglesiaOptions}
            placeholder="Buscar iglesia..."
            isClearable
          />
        </div>
      </div>

      {/* FORMULARIO PRINCIPAL */}
      <form onSubmit={handleSubmit}>
        <div className="form-row two-columns">
          {/* COLUMNA 1 */}
          <div className="form-column">
            <div className="form-group">
              <label>Nombre</label>
              <input name="nombre" value={form.nombre} type="text" readOnly />
            </div>

            <div className="form-group">
              <label>N° Contacto Encargado</label>
              <input
                name="contacto"
                value={form.contacto}
                type="text"
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Fecha/Hora Retiro</label>
              <input
                name="fechaHoraRetiro"
                value={form.fechaHoraRetiro}
                onChange={handleChange}
                type="datetime-local"
              />
            </div>

            <div className="form-group">
              <label>Hospedador</label>
              <input
                name="hospedador"
                value={form.hospedador}
                type="text"
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Dirección</label>
              <input
                name="direccion"
                value={form.direccion}
                type="text"
                readOnly
              />
            </div>

            <div className="form-group">
              <label>¿Se Acredita Visita?</label>
              <Select
                value={form.acreditaVisita}
                onChange={(opt) =>
                  setForm((prev) => ({ ...prev, acreditaVisita: opt }))
                }
                options={acreditaOptions}
              />
            </div>
          </div>

          {/* COLUMNA 2 */}
          <div className="form-column">
            <div className="form-group">
              <label>Iglesia</label>
              <input
                name="iglesia"
                value={form.iglesia}
                type="text"
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Tipo de Movilización</label>
              <input
                name="tipoMovilizacion"
                value={form.tipoMovilizacion}
                type="text"
                readOnly
              />
            </div>

            <div className="form-group">
              <label>N°Contacto Hospedador</label>
              <input
                name="contactoHospedador"
                value={form.contactoHospedador}
                type="text"
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Local</label>
              <input name="local" value={form.local} type="text" readOnly />
            </div>

            <div className="form-group">
              <label>Fecha y Hora Acreditación</label>
              <input
                name="fechaHora"
                value={form.fechaHora}
                type="text"
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Observaciones y/o Modificaciones</label>
              <textarea
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="form-actions">
      
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !token}
          >
            {loading ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>

        {mensaje && <div className="form-message">{mensaje}</div>}
      </form>
    </div>
  );
}
