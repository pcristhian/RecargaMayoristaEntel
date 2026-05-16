'use client';

import { Calendar, User, RefreshCw, Package, Filter } from 'lucide-react';

export default function Filters({
    remitentes,
    selectedRemitente,
    onRemitenteChange,
    fechaInicio,
    fechaFin,
    onFechaChange,
    onReset,
    filtroPaquetes,
    onFiltroPaquetesChange
}) {
    return (
        <div className="bg-white rounded-lg shadow-md p-2">
            <div className="flex flex-wrap gap-2 items-end">
                {/* Filtro por remitente */}
                <div className="flex-1 min-w-[150px]">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                        <User size={14} />
                        Remitente
                    </label>
                    <select
                        value={selectedRemitente}
                        onChange={(e) => onRemitenteChange(e.target.value)}
                        className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                        <option value="todos">Todos los remitentes</option>
                        {remitentes.map((remitente, idx) => (
                            <option key={idx} value={remitente}>
                                {remitente}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Filtro por fecha inicio */}
                <div className="flex-1 min-w-[130px]">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                        <Calendar size={14} />
                        Desde
                    </label>
                    <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => onFechaChange('inicio', e.target.value)}
                        className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>

                {/* Filtro por fecha fin */}
                <div className="flex-1 min-w-[130px]">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                        <Calendar size={14} />
                        Hasta
                    </label>
                    <input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => onFechaChange('fin', e.target.value)}
                        className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>

                {/* Filtro por paquetes */}
                <div className="flex-1 min-w-[160px]">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                        <Package size={14} />
                        Paquetes
                    </label>
                    <select
                        value={filtroPaquetes}
                        onChange={(e) => onFiltroPaquetesChange(e.target.value)}
                        className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                        <option value="todos">📦 Todos</option>
                        <option value="con-paquetes">✅ Solo con paquetes</option>
                        <option value="sin-paquetes">❌ Sin paquetes</option>
                    </select>
                </div>

                {/* Botón reset */}
                <div>
                    <button
                        onClick={onReset}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 rounded-md mt-5"
                    >
                        <RefreshCw size={14} />
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}