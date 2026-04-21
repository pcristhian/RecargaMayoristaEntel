'use client';

import { useState, useEffect } from 'react';

export default function ChatSimulator({ messages, selectedRemitente, fechaInicio, fechaFin, filtroPaquetes }) {
    const [filteredMessages, setFilteredMessages] = useState([]);
    const [stats, setStats] = useState({ total: 0, conPaquetes: 0, sinPaquetes: 0 });
    const palabrasClave = ['paq', 'paquete', 'paquetes', 'paquetería', 'paquetero'];

    useEffect(() => {
        let filtered = [...messages];

        // Filtrar por remitente
        if (selectedRemitente !== 'todos') {
            filtered = filtered.filter(msg => msg.remitente === selectedRemitente);
        }

        // Filtrar por fechas
        if (fechaInicio) {
            filtered = filtered.filter(msg => msg.fecha >= fechaInicio);
        }
        if (fechaFin) {
            filtered = filtered.filter(msg => msg.fecha <= fechaFin);
        }

        // Definir palabras clave relacionadas con paquetes

        // Filtrar por paquetes (búsqueda insensible a mayúsculas/minúsculas)
        if (filtroPaquetes === 'con-paquetes') {
            filtered = filtered.filter(msg =>
                palabrasClave.some(palabra => msg.texto.toLowerCase().includes(palabra))
            );
        } else if (filtroPaquetes === 'sin-paquetes') {
            filtered = filtered.filter(msg =>
                !palabrasClave.some(palabra => msg.texto.toLowerCase().includes(palabra))
            );
        }

        // Calcular estadísticas usando las palabras clave
        const contienePalabraClave = (texto) => {
            const textoLower = texto.toLowerCase();
            return palabrasClave.some(palabra =>
                palabra && textoLower.includes(palabra.toLowerCase())
            );
        };

        const totalConPaquetes = filtered.filter(msg => contienePalabraClave(msg.texto)).length;
        const totalSinPaquetes = filtered.filter(msg => !contienePalabraClave(msg.texto)).length;

        setStats({
            total: filtered.length,
            conPaquetes: totalConPaquetes,
            sinPaquetes: totalSinPaquetes
        });

        setFilteredMessages(filtered);
    }, [messages, selectedRemitente, fechaInicio, fechaFin, filtroPaquetes]);

    if (filteredMessages.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                No hay mensajes con los filtros seleccionados
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Barra de estadísticas mejorada */}
            <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-green-50 to-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center md:text-left">
                        <span className="text-gray-500">Total mensajes:</span>
                        <span className="ml-2 font-bold text-gray-800">{stats.total}</span>
                    </div>
                    <div className="text-center">
                        <span className="text-gray-500">Recarga con "paquetes":</span>
                        <span className="ml-2 font-bold text-green-600">{stats.conPaquetes}</span>
                    </div>
                    <div className="text-center md:text-right">
                        <span className="text-gray-500">Recarga sin "paquetes":</span>
                        <span className="ml-2 font-bold text-orange-600">{stats.sinPaquetes}</span>
                    </div>
                </div>
            </div>

            {/* Mensajes */}
            <div className="h-[600px] overflow-y-auto p-4 space-y-3 bg-gray-50">
                {filteredMessages.map((msg, idx) => {
                    const isOwnMessage = msg.remitente === 'Tú' || msg.remitente === 'Yo' || msg.remitente === 'Mi';
                    const tienePaquetes = msg.texto.toLowerCase().includes('paquetes');

                    return (
                        <div
                            key={idx}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[70%] ${isOwnMessage ? 'bg-green-100 rounded-2xl rounded-tr-none px-4 py-2 shadow-sm' : 'bg-white rounded-2xl rounded-tl-none px-4 py-2 shadow-sm'} ${tienePaquetes ? 'border-l-4 border-green-500' : ''}`}>
                                {!isOwnMessage && (
                                    <div className="text-xs font-semibold text-gray-600 mb-1">
                                        {msg.remitente}
                                    </div>
                                )}
                                <div className="text-gray-800 whitespace-pre-wrap">
                                    {msg.texto}
                                    {tienePaquetes && (
                                        <span className="inline-flex items-center ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            📦 {palabrasClave.filter(p => msg.texto.toLowerCase().includes(p.toLowerCase())).join(', ')}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-red-600 mt-1 text-right">
                                    {msg.hora} • {msg.fechaOriginal}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}