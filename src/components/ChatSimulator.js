'use client';

import { useState, useEffect } from 'react';

export default function ChatSimulator({
    messages,
    selectedRemitente,
    fechaInicio,
    fechaFin,
    filtroPaquetes,
    palabrasClave = ['paq', 'paquete', 'paquetes']
}) {
    const [filteredMessages, setFilteredMessages] = useState([]);
    const [stats, setStats] = useState({ total: 0, conPaquetes: 0, sinPaquetes: 0, conRecargos: 0 });

    // Palabras clave ampliadas para recargos/bonificaciones/saldo
    const palabrasRecargo = [
        'recargo', 'recargos', 'recarg',
        'bonificación', 'bonificacion', 'bonif', 'bono',
        'saldo', 'saldos'
    ];

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

        // Filtrar por paquetes
        if (filtroPaquetes === 'con-paquetes') {
            filtered = filtered.filter(msg =>
                palabrasClave.some(palabra => msg.texto.toLowerCase().includes(palabra.toLowerCase()))
            );
        } else if (filtroPaquetes === 'sin-paquetes') {
            filtered = filtered.filter(msg =>
                !palabrasClave.some(palabra => msg.texto.toLowerCase().includes(palabra.toLowerCase()))
            );
        }

        // Calcular estadísticas
        const contienePalabraClave = (texto) => {
            const textoLower = texto.toLowerCase();
            return palabrasClave.some(palabra =>
                palabra && textoLower.includes(palabra.toLowerCase())
            );
        };

        const contieneRecargo = (texto) => {
            const textoLower = texto.toLowerCase();
            return palabrasRecargo.some(palabra =>
                textoLower.includes(palabra.toLowerCase())
            );
        };

        const totalConPaquetes = filtered.filter(msg => contienePalabraClave(msg.texto)).length;
        const totalSinPaquetes = filtered.filter(msg => !contienePalabraClave(msg.texto)).length;
        const totalConRecargos = filtered.filter(msg => contieneRecargo(msg.texto)).length;

        setStats({
            total: filtered.length,
            conPaquetes: totalConPaquetes,
            sinPaquetes: totalSinPaquetes,
            conRecargos: totalConRecargos
        });

        setFilteredMessages(filtered);
    }, [messages, selectedRemitente, fechaInicio, fechaFin, filtroPaquetes, palabrasClave]);

    if (filteredMessages.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                No hay mensajes con los filtros seleccionados
            </div>
        );
    }

    // Función para determinar el color del borde según el tipo de mensaje
    // Función para determinar el color de fondo y borde según el contenido
    const getMessageStyle = (texto, isOwnMessage) => {
        const textoLower = texto.toLowerCase();
        const tienePaquetes = palabrasClave.some(p => textoLower.includes(p.toLowerCase()));
        const tieneRecargo = palabrasRecargo.some(p => textoLower.includes(p.toLowerCase()));

        // 📦 Paquetes → VERDE (prioridad alta)
        if (tienePaquetes && tieneRecargo) return 'bg-purple-100 border-l-4 border-purple-500';
        if (tienePaquetes) {
            return 'bg-green-100 border-l-4 border-green-500';
        }
        // 💰 Recargos/Saldo → AZUL
        if (tieneRecargo) {
            return 'bg-blue-50 border-l-4 border-blue-500';
        }
        // 💬 Predeterminado → gris suave (ajeno) o verde muy claro (propio)
        return isOwnMessage
            ? 'bg-emerald-50 border-l-4 border-emerald-200'
            : 'bg-gray-100 border-l-4 border-gray-300';
    };

    // Función para obtener las etiquetas del mensaje
    const getMessageTags = (texto) => {
        const textoLower = texto.toLowerCase();
        const tags = [];

        // Detectar paquetes (ya incluye 'paq', 'paquete', 'paquetes')
        if (palabrasClave.some(p => textoLower.includes(p.toLowerCase()))) {
            tags.push({ text: '📦 Paquetes', color: 'bg-green-100 text-green-800' });
        }

        // Detectar recargos/saldo/bonificaciones
        if (palabrasRecargo.some(p => textoLower.includes(p.toLowerCase()))) {
            tags.push({ text: '💰 Recargo/Saldo', color: 'bg-blue-100 text-blue-800' });
        }

        return tags;
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Barra de estadísticas compacta con nuevos indicadores */}
            <div className="border-b border-gray-200 px-3 py-1.5 bg-gradient-to-r from-green-50 to-white">
                <div className="flex flex-wrap gap-4 text-xs">
                    <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-1 font-bold text-gray-800">{stats.total}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">📦 Paquetes:</span>
                        <span className="ml-1 font-bold text-green-600">{stats.conPaquetes}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">💰 Recargos/Saldo:</span>
                        <span className="ml-1 font-bold text-blue-600">{stats.conRecargos}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Sin etiquetas:</span>
                        <span className="ml-1 font-bold text-orange-600">{stats.sinPaquetes}</span>
                    </div>
                </div>
            </div>

            {/* Mensajes - altura reducida */}
            <div className="h-[600px] overflow-y-auto p-3 space-y-2 bg-gray-50">
                {filteredMessages.map((msg, idx) => {
                    const isOwnMessage = msg.remitente === 'Tú' || msg.remitente === 'Yo' || msg.remitente === 'Mi';
                    const tags = getMessageTags(msg.texto);
                    const messageStyle = getMessageStyle(msg.texto, isOwnMessage);

                    return (
                        <div
                            key={idx}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[75%] rounded-xl px-3 py-1.5 shadow-sm ${isOwnMessage ? 'rounded-tr-none' : 'rounded-tl-none'} ${messageStyle}`}>  {!isOwnMessage && (
                                <div className="text-xs font-semibold text-gray-600 mb-0.5">
                                    {msg.remitente}
                                </div>
                            )}
                                <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                    {msg.texto}
                                    {/* Mostrar todas las etiquetas */}
                                    {tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {tags.map((tag, i) => (
                                                <span key={i} className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${tag.color}`}>
                                                    {tag.text}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5 text-right">
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