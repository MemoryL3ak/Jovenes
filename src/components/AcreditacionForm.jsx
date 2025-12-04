import { useEffect, useMemo, useState } from "react";
import Select from "react-select";

const SHEET_ID = "16RKXKDq_uZD6AbA9PX868hdNRNrIu_AB9ufXR3EzElQ";
const SHEET_NAME = "Acreditación";

const acreditaOptions = [
  { value: "Sí", label: "Sí" },
  { value: "No", label: "No" },
];

function ahoraSantiago() {
  return new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
}

export default function AcreditacionForm({ token, onLogin, onLogout, userInfo }) {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [selectedNombreEncargado, setSelectedNombreEncargado] = useState(null);
  const [selectedIglesia, setSelectedIglesia] = useState(null);

  const [registros, setRegistros] = useState([]);
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
    acreditaVisita: acreditaOptions[1],
    fechaHora: "",
    observaciones: "",
  });

  const camposObligatoriosOk = !!(
    form.acreditaVisita && form.acreditaVisita.value
  );

  /* 🔵 Toast desaparece automáticamente */
  useEffect(() => {
    if (mensaje) {
      const timeout = setTimeout(() => setMensaje(""), 3000);
      return () => clearTimeout(timeout);
    }
  }, [mensaje]);

  /* 🔵 Cargar registros al recibir token */
  useEffect(() => {
    if (!token) {
      setRegistros([]);
      setSelectedIglesia(null);
      setSelectedNombreEncargado(null);
      setRegistroSeleccionado(null);
      limpiarFormulario(false);
      return;
    }
    loadRegistros();
  }, [token]);

  /* 🔵 Autollenar fecha/hora acreditación */
  useEffect(() => {
    if (form.acreditaVisita?.value === "Sí") {
      setForm((f) => ({ ...f, fechaHora: ahoraSantiago() }));
    } else {
      setForm((f) => ({ ...f, fechaHora: "" }));
    }
  }, [form.acreditaVisita?.value]);

  /* 🔵 Opciones dinámicas de iglesia */
  const iglesiaOptions = useMemo(() => {
    const set = new Set(
      registros.map((r) => r.iglesia).filter((x) => x && x.trim())
    );
    return Array.from(set).map((ig) => ({ value: ig, label: ig }));
  }, [registros]);

  /* 🔵 Opciones dinámicas de nombre */
  const nombreEncargadoOptions = useMemo(() => {
    let data = registros;
    if (selectedIglesia) {
      data = data.filter((r) => r.iglesia === selectedIglesia.value);
    }
    const set = new Set(data.map((r) => r.nombre).filter((x) => x && x.trim()));
    return Array.from(set).map((n) => ({ value: n, label: n }));
  }, [registros, selectedIglesia]);

  async function loadRegistros() {
    if (!token) return;

    try {
      const range = encodeURIComponent(`${SHEET_NAME}!A2:L`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Error:", await res.text());
        setMensaje("No se pudieron cargar los registros.");
        return;
      }

      const data = await res.json();
      const rows = data.values || [];

      const mapped = rows.map((row, idx) => ({
        id: idx,
        rowNumber: idx + 2,
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
      setMensaje("");
    } catch (err) {
      console.error(err);
      setMensaje("Error al cargar registros.");
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleChangeIglesia(opt) {
    setSelectedIglesia(opt);
    if (!opt) return;

    const iglesia = opt.value;

    if (selectedNombreEncargado) {
      const nombre = selectedNombreEncargado.value;
      const row = registros.find(
        (r) => r.nombre === nombre && r.iglesia === iglesia
      );
      if (row) {
        setRegistroSeleccionado(row);
        llenarFormularioDesdeRegistro(row);
        return;
      }
    }

    setForm((f) => ({ ...f, iglesia }));
  }

  function handleChangeNombreEncargado(opt) {
    setSelectedNombreEncargado(opt);

    if (!opt) {
      setRegistroSeleccionado(null);
      limpiarFormulario(true);
      return;
    }

    let row = null;

    if (selectedIglesia) {
      row = registros.find(
        (r) => r.nombre === opt.value && r.iglesia === selectedIglesia.value
      );
    }

    if (!row) {
      row = registros.find((r) => r.nombre === opt.value);
    }

    if (row) {
      setRegistroSeleccionado(row);
      llenarFormularioDesdeRegistro(row);

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
      tipoMovilizacion: row.tipoMovilizacion,
      fechaHoraRetiro: row.fechaHoraRetiro,
      hospedador: row.hospedador,
      contactoHospedador: row.contactoHospedador,
      direccion: row.direccion,
      local: row.local,
      acreditaVisita: acreditaOpt,
      fechaHora: row.fechaHora,
      observaciones: row.observaciones,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!token) {
      setMensaje("Debes iniciar sesión con Google.");
      return;
    }
    if (!registroSeleccionado) {
      setMensaje("Debes seleccionar un registro antes de guardar.");
      return;
    }
    if (!camposObligatoriosOk) {
      setMensaje("Debes seleccionar si se acredita visita.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const updatedRow = {
        ...registroSeleccionado,
        contacto: form.contacto,
        tipoMovilizacion: form.tipoMovilizacion,
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
          updatedRow.contactto,
          updatedRow.tipoMovilizacion,
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
        console.error(await res.text());
        throw new Error();
      }

      setRegistros((prev) =>
        prev.map((r) => (r.rowNumber === rowNumber ? updatedRow : r))
      );
      setRegistroSeleccionado(updatedRow);

      setMensaje("✔ Cambios guardados correctamente.");
    } catch (err) {
      console.error(err);
      setMensaje("❌ Error al guardar los cambios.");
    } finally {
      setLoading(false);
    }
  }

  function limpiarFormulario(reset = true) {
    if (reset) {
      setSelectedNombreEncargado(null);
      setSelectedIglesia(null);
    }

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
            <button type="button" className="google-login-btn" onClick={onLogin}>
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

      {/* FILTROS */}
      <div className="filters-row">
        <div className="filter-group">
          <label>Buscar por Nombre</label>
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
                onChange={handleChange}
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
              <input name="hospedador" value={form.hospedador} type="text" readOnly />
            </div>

            <div className="form-group">
              <label>Dirección</label>
              <input name="direccion" value={form.direccion} type="text" readOnly />
            </div>

            <div className="form-group">
              <label>¿Se Acredita Visita?</label>
              <Select
                value={form.acreditaVisita}
                onChange={(opt) => setForm((p) => ({ ...p, acreditaVisita: opt }))}
                options={acreditaOptions}
              />
            </div>

          </div>

          {/* COLUMNA 2 */}
          <div className="form-column">

            <div className="form-group">
              <label>Iglesia</label>
              <input name="iglesia" value={form.iglesia} type="text" readOnly />
            </div>

            <div className="form-group">
              <label>Tipo de Movilización</label>
              <input
                name="tipoMovilizacion"
                value={form.tipoMovilizacion}
                type="text"
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>N° Contacto Hospedador</label>
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
              <input name="fechaHora" value={form.fechaHora} type="text" readOnly />
            </div>

            <div className="form-group">
              <label>Observaciones</label>
              <textarea
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                rows={4}
              />
            </div>

          </div>
        </div>

        {/* BOTONES */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !token}
          >
            {loading ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>

      {/* 🔵 TOAST FLOTANTE */}
      {mensaje && (
        <div className="toast-message">
          {mensaje}
        </div>
      )}

    </div>
  );
}
