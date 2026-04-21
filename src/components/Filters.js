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
        <div className="bg-white rounded-lg shadow-md p-1 space-y-1">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Filtro por remitente */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <User size={16} />
                        Filtrar por remitente
                    </label>
                    <select
                        value={selectedRemitente}
                        onChange={(e) => onRemitenteChange(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Calendar size={16} />
                        Desde fecha
                    </label>
                    <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => onFechaChange('inicio', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>

                {/* Filtro por fecha fin */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Calendar size={16} />
                        Hasta fecha
                    </label>
                    <input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => onFechaChange('fin', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>

                {/* Filtro por paquetes */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Package size={16} />
                        Filtrar por "paquetes"
                    </label>
                    <select
                        value={filtroPaquetes}
                        onChange={(e) => onFiltroPaquetesChange(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                        <option value="todos">📦 Todos los mensajes</option>
                        <option value="con-paquetes">✅ Solo mensajes con "paquetes"</option>
                        <option value="sin-paquetes">❌ Mensajes sin "paquetes"</option>
                    </select>
                </div>
            </div>

            {/* Botón reset y estadísticas rápidas */}
            <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                    <Filter size={12} />
                    <span>Mostrando mensajes con filtros activos</span>
                </div>
                <button
                    onClick={onReset}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <RefreshCw size={16} />
                    Resetear filtros
                </button>
            </div>
        </div>
    );
}