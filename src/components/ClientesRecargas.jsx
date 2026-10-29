'use client';
import * as XLSX from 'xlsx';
import { useMemo, useState } from 'react';

// ---- Utilidades de parsing ----
const REGEX_NUMERO = /\b\d{8}\b/;
const REGEX_MONTO = /\b\d{1,4}\b/g;
const REGEX_NOMBRE = /NOMBRE\s*:\s*([^\n]+)/i;

const TIPO = {
    RV: 'RV',
    PAQUETE: 'PAQUETE',
    CREDITO: 'CREDITO',
};

const PALABRAS_RV = [/\brv\b/i];
const PALABRAS_PAQUETE = [/paq/i, /paquete/i, /paquetes/i, /megas?/i, /mb\b/i];

function clasificarTipo(texto) {
    const t = texto.toLowerCase();
    if (PALABRAS_RV.some((r) => r.test(t))) return TIPO.RV;
    if (PALABRAS_PAQUETE.some((r) => r.test(t))) return TIPO.PAQUETE;
    return TIPO.CREDITO;
}

function extraerMonto(texto, numeroCliente) {
    const candidatos = [];
    let m;
    REGEX_MONTO.lastIndex = 0;
    while ((m = REGEX_MONTO.exec(texto)) !== null) {
        const valor = parseInt(m[0], 10);
        if (numeroCliente && m[0] === numeroCliente) continue;
        if (valor > 0 && valor <= 9999 && valor % 10 === 0) {
            candidatos.push(valor);
        }
    }
    return candidatos.length > 0 ? candidatos[0] : null;
}

function extraerNombre(texto) {
    const m = texto.match(REGEX_NOMBRE);
    if (m) return m[1].trim().replace(/\s+/g, ' ');
    return null;
}

// ✅ NUEVO: extrae el origen de la recarga (D1, D2, D-2, ...) o "Tienda"
const REGEX_ORIGEN = /^\s*(D[-\s]?\d+)\b/i;

function extraerOrigen(texto) {
    const primeraLinea = (texto || '').split('\n')[0].trim();
    const m = primeraLinea.match(REGEX_ORIGEN);
    if (m) {
        return m[1].toUpperCase().replace(/\s+/g, '');
    }
    return 'Tienda';
}

function extraerRecargas(messages) {
    const recargas = [];

    for (const msg of messages) {
        const texto = msg.texto || '';
        const numeroMatch = texto.match(REGEX_NUMERO);
        if (!numeroMatch) continue;

        const numero = numeroMatch[0];
        const monto = extraerMonto(texto, numero);
        if (!monto) continue;

        const nombre = extraerNombre(texto);
        const tipo = clasificarTipo(texto);
        const origen = extraerOrigen(texto);

        recargas.push({
            fecha: msg.fecha,
            fechaOriginal: msg.fechaOriginal,
            hora: msg.hora,
            numero,
            nombre,
            monto,
            tipo,
            origen,
            texto,
        });
    }

    return recargas;
}

function getMesesDisponibles(recargas) {
    const set = new Set(recargas.map((r) => r.fecha.slice(0, 7)));
    return Array.from(set).sort().reverse();
}

const NOMBRES_MES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatearMes(yyyymm) {
    const [y, m] = yyyymm.split('-');
    return `${NOMBRES_MES[parseInt(m, 10) - 1]} ${y}`;
}

// ✅ NUEVO: etiqueta legible para los tipos de recarga de un cliente
function etiquetaTipos(c) {
    const tipos = [];
    if (c.porTipo.RV > 0) tipos.push('RV');
    if (c.porTipo.PAQUETE > 0) tipos.push('PAQUETE');
    if (c.porTipo.CREDITO > 0) tipos.push('CREDITO');
    return tipos.join(', ') || '—';
}

// ---- Exportación a Excel real (.xlsx) con SheetJS ----
// Columnas de cada hoja
const EXCEL_HEADERS = [
    'N°',
    'Nombre cliente / Puesto / Lugar',
    'Origen',
    'Tipos de recarga',
    'Número de celular',
    'Monto total del mes (Bs.)',
    'Cantidad de recargas',
];

const EXCEL_COLS = [
    { wch: 6 },   // N°
    { wch: 30 },  // Nombre
    { wch: 10 },  // Origen
    { wch: 22 },  // Tipos
    { wch: 16 },  // Celular
    { wch: 22 },  // Monto total
    { wch: 20 },  // Cantidad
];

// Construye el array de datos (una fila por cliente) para una lista dada
function construirFilasExcel(lista) {
    return lista.map((c, idxCliente) => [
        idxCliente + 1,
        c.nombre,
        c.origen,
        etiquetaTipos(c),
        c.numero,
        c.total,
        c.cantidad,
    ]);
}

// Aplica formato (anchos, celular como texto) a una hoja
function formatearHoja(worksheet) {
    worksheet['!cols'] = EXCEL_COLS;

    // Forzar celular como texto (columna índice 4)
    const rango = XLSX.utils.decode_range(worksheet['!ref']);
    for (let R = 1; R <= rango.e.r; R++) {
        const celda = worksheet[XLSX.utils.encode_cell({ r: R, c: 4 })];
        if (celda) {
            celda.t = 's';
            celda.z = '@';
        }
    }
}

function exportarExcel(clientes, mesSeleccionado) {
    const workbook = XLSX.utils.book_new();

    // ---- Hoja 1: General (con fila de total) ----
    const filasGeneral = construirFilasExcel(clientes);

    // Fila de TOTAL GENERAL
    const totalGeneral = clientes.reduce((acc, c) => acc + c.total, 0);
    const cantidadGeneral = clientes.reduce((acc, c) => acc + c.cantidad, 0);

    const filaTotal = [
        '',
        'TOTAL GENERAL',
        '',
        '',
        '',
        totalGeneral,
        cantidadGeneral,
    ];

    const wsGeneral = XLSX.utils.aoa_to_sheet([
        EXCEL_HEADERS,
        ...filasGeneral,
        filaTotal, // fila de total al final
    ]);
    formatearHoja(wsGeneral);
    XLSX.utils.book_append_sheet(workbook, wsGeneral, 'General');

    // ---- Hojas por tipo ----
    const hojas = [
        { tipo: TIPO.RV, nombre: 'RV' },
        { tipo: TIPO.PAQUETE, nombre: 'Paquetes' },
        { tipo: TIPO.CREDITO, nombre: 'Crédito' },
    ];

    for (const { tipo, nombre } of hojas) {
        // Clientes que tengan monto > 0 en ese tipo
        const lista = clientes.filter((c) => (c.porTipo[tipo] || 0) > 0);

        // Filas: una por cliente, pero con el monto SOLO de ese tipo
        const filas = lista.map((c, idxCliente) => {
            const cantidadTipo = c.fechas.filter((r) => r.tipo === tipo).length;
            return [
                idxCliente + 1,
                c.nombre,
                c.origen,
                tipo,
                c.numero,
                c.porTipo[tipo],       // monto solo de este tipo
                cantidadTipo,
            ];
        });

        // Fila de total de la hoja
        const totalHoja = lista.reduce((acc, c) => acc + (c.porTipo[tipo] || 0), 0);
        const cantidadHoja = lista.reduce(
            (acc, c) => acc + c.fechas.filter((r) => r.tipo === tipo).length,
            0
        );

        const filaTotalHoja = ['', 'TOTAL', '', '', '', totalHoja, cantidadHoja];

        const ws = XLSX.utils.aoa_to_sheet([
            EXCEL_HEADERS,
            ...filas,
            filaTotalHoja,
        ]);
        formatearHoja(ws);
        XLSX.utils.book_append_sheet(workbook, ws, nombre);
    }

    // Descargar
    XLSX.writeFile(workbook, `Recargas_${mesSeleccionado}.xlsx`);
}

export default function ClientesRecargas({ messages }) {
    const recargas = useMemo(() => extraerRecargas(messages), [messages]);
    const mesesDisponibles = useMemo(() => getMesesDisponibles(recargas), [recargas]);

    const mesActual = useMemo(() => {
        const hoy = new Date();
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    const [mesSeleccionado, setMesSeleccionado] = useState(
        mesesDisponibles.includes(mesActual) ? mesActual : mesesDisponibles[0] || mesActual
    );

    const [filtroTipo, setFiltroTipo] = useState('TODOS');
    const [filtroOrigen, setFiltroOrigen] = useState('TODOS');
    const [busqueda, setBusqueda] = useState('');

    const recargasFiltradas = useMemo(() => {
        return recargas.filter((r) => {
            if (r.fecha.slice(0, 7) !== mesSeleccionado) return false;
            if (filtroTipo !== 'TODOS' && r.tipo !== filtroTipo) return false;
            if (filtroOrigen !== 'TODOS' && r.origen !== filtroOrigen) return false;
            if (busqueda) {
                const q = busqueda.toLowerCase();
                const nombreTexto = (r.nombre || '').toLowerCase();
                if (!r.numero.includes(q) && !nombreTexto.includes(q)) return false;
            }
            return true;
        });
    }, [recargas, mesSeleccionado, filtroTipo, filtroOrigen, busqueda]);

    const clientes = useMemo(() => {
        const map = new Map();

        for (const r of recargasFiltradas) {
            if (!map.has(r.numero)) {
                map.set(r.numero, {
                    numero: r.numero,
                    nombre: r.nombre,
                    origen: r.origen,
                    total: 0,
                    cantidad: 0,
                    porTipo: { RV: 0, PAQUETE: 0, CREDITO: 0 },
                    fechas: [],
                });
            }
            const c = map.get(r.numero);

            if (!c.nombre && r.nombre) {
                c.nombre = r.nombre;
            }

            if ((!c.origen || c.origen === 'Tienda') && r.origen && r.origen !== 'Tienda') {
                c.origen = r.origen;
            }

            c.total += r.monto;
            c.cantidad += 1;
            c.porTipo[r.tipo] = (c.porTipo[r.tipo] || 0) + r.monto;
            c.fechas.push(r);
        }

        return Array.from(map.values())
            .map((c) => ({
                ...c,
                nombre: c.nombre || 'Sin nombre',
            }))
            .sort((a, b) => b.total - a.total);
    }, [recargasFiltradas]);

    const origenesDisponibles = useMemo(() => {
        const set = new Set(recargas.map((r) => r.origen));
        return Array.from(set).sort((a, b) => {
            if (a === 'Tienda') return 1;
            if (b === 'Tienda') return -1;
            return a.localeCompare(b);
        });
    }, [recargas]);

    const totalesMes = useMemo(() => {
        let total = 0;
        const porTipo = { RV: 0, PAQUETE: 0, CREDITO: 0 };
        for (const c of clientes) {
            total += c.total;
            porTipo.RV += c.porTipo.RV;
            porTipo.PAQUETE += c.porTipo.PAQUETE;
            porTipo.CREDITO += c.porTipo.CREDITO;
        }
        return { total, porTipo, clientes: clientes.length, recargas: recargasFiltradas.length };
    }, [clientes, recargasFiltradas]);

    if (recargas.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
                <p className="text-lg font-medium">No se encontraron recargas válidas en el archivo.</p>
                <p className="text-sm mt-2">
                    Se requiere que el mensaje contenga un número de 8 dígitos y un monto redondo (ej. 100, 50, 200).
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Controles */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Mes</label>
                        <select
                            value={mesSeleccionado}
                            onChange={(e) => setMesSeleccionado(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            {mesesDisponibles.map((m) => (
                                <option key={m} value={m}>{formatearMes(m)}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de recarga</label>
                        <select
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="TODOS">Todas</option>
                            <option value="RV">Recarga Viva (RV)</option>
                            <option value="PAQUETE">Paquetes / Megas</option>
                            <option value="CREDITO">Crédito</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Origen</label>
                        <select
                            value={filtroOrigen}
                            onChange={(e) => setFiltroOrigen(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="TODOS">Todos</option>
                            {origenesDisponibles.map((o) => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Buscar por número o nombre
                        </label>
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Ej: 73295108 o Yenifer"
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                </div>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-700 font-semibold">TOTAL DEL MES</p>
                    <p className="text-2xl font-bold text-green-800">Bs. {totalesMes.total}</p>
                    <p className="text-xs text-green-600">{totalesMes.recargas} recargas</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700 font-semibold">RV</p>
                    <p className="text-2xl font-bold text-blue-800">Bs. {totalesMes.porTipo.RV}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-xs text-purple-700 font-semibold">PAQUETES</p>
                    <p className="text-2xl font-bold text-purple-800">Bs. {totalesMes.porTipo.PAQUETE}</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-orange-700 font-semibold">CRÉDITO</p>
                    <p className="text-2xl font-bold text-orange-800">Bs. {totalesMes.porTipo.CREDITO}</p>
                </div>
            </div>

            {/* Lista */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-gray-800">
                        Clientes ({clientes.length}) — ordenados por total
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{formatearMes(mesSeleccionado)}</span>
                        <button
                            onClick={() => exportarExcel(clientes, mesSeleccionado)}
                            disabled={clientes.length === 0}
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-3 py-2 rounded-md transition"
                            title="Descargar listado en Excel"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                            </svg>
                            Descargar Excel
                        </button>
                    </div>
                </div>

                {clientes.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                        No hay recargas que coincidan con los filtros seleccionados.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {clientes.map((c, idx) => (
                            <li key={c.numero} className="px-4 py-3 hover:bg-gray-50">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span
                                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0
                                                ? 'bg-yellow-400 text-yellow-900'
                                                : idx === 1
                                                    ? 'bg-gray-300 text-gray-800'
                                                    : idx === 2
                                                        ? 'bg-orange-300 text-orange-900'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            {idx + 1}
                                        </span>

                                        <div className="min-w-0">
                                            <p className={`font-semibold truncate ${c.nombre === 'Sin nombre' ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                                                {c.nombre}
                                            </p>
                                            <p className="text-sm text-gray-500 font-mono">
                                                {c.numero}
                                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${c.origen === 'Tienda'
                                                        ? 'bg-gray-200 text-gray-700'
                                                        : 'bg-indigo-100 text-indigo-800'
                                                    }`}>
                                                    {c.origen}
                                                </span>
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-1 text-xs">
                                                {c.porTipo.RV > 0 && (
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                        RV: Bs. {c.porTipo.RV}
                                                    </span>
                                                )}
                                                {c.porTipo.PAQUETE > 0 && (
                                                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                                        Paq: Bs. {c.porTipo.PAQUETE}
                                                    </span>
                                                )}
                                                {c.porTipo.CREDITO > 0 && (
                                                    <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                                                        Créd: Bs. {c.porTipo.CREDITO}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xl font-bold text-green-700">Bs. {c.total}</p>
                                        <p className="text-xs text-gray-500">
                                            {c.cantidad} recarga{c.cantidad !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>

                                <details className="mt-2">
                                    <summary className="text-xs text-green-600 cursor-pointer hover:underline">
                                        Ver detalle ({c.fechas.length})
                                    </summary>
                                    <ul className="mt-2 ml-11 text-xs text-gray-600 space-y-1">
                                        {c.fechas
                                            .slice()
                                            .sort((a, b) => (a.fecha + a.hora > b.fecha + b.hora ? 1 : -1))
                                            .map((r, i) => (
                                                <li key={i} className="flex justify-between gap-2">
                                                    <span>
                                                        {r.fechaOriginal} {r.hora} — <span className="font-semibold">{r.tipo}</span>
                                                        <span className="ml-2 text-indigo-600">[{r.origen}]</span>
                                                    </span>
                                                    <span className="font-mono">Bs. {r.monto}</span>
                                                </li>
                                            ))}
                                    </ul>
                                </details>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}