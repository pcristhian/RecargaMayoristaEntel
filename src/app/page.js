'use client';

import { useState, useMemo, useEffect } from 'react';
import FileUploader from '../components/FileUploader';
import Filters from '../components/Filters';
import ChatSimulator from '../components/ChatSimulator';
import FileTypeSelector from '../components/FileTypeSelector';
import ClientesRecargas from '../components/ClientesRecargas'; // NUEVO

// ---- Parser principal de WhatsApp (existente) ----
const parseWhatsAppChat = (text) => {
  const lines = text.split('\n');
  const parsedMessages = [];
  const remitentesSet = new Set();
  let formatoDetectado = '';
  let lineasProcesadas = 0;
  let lineasIgnoradas = 0;

  const regexWhatsApp = /^(\d{1,2}\/\d{1,2}\/\d{4}),\s+(\d{1,2}:\d{2})\s+-\s+([^:]+):\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    const match = line.match(regexWhatsApp);

    if (match) {
      let [, fecha, hora, remitente, texto] = match;
      remitente = remitente.trim();

      let textoCompleto = texto;
      let j = i + 1;
      while (j < lines.length && !lines[j].match(regexWhatsApp) && lines[j].trim() !== '') {
        textoCompleto += '\n' + lines[j].trim();
        j++;
      }
      if (j > i + 1) i = j - 1;

      const [dia, mes, año] = fecha.split('/');
      const fechaISO = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;

      parsedMessages.push({
        fecha: fechaISO,
        fechaOriginal: fecha,
        hora,
        remitente,
        texto: textoCompleto,
        timestamp: new Date(fechaISO).getTime(),
      });

      remitentesSet.add(remitente);
      lineasProcesadas++;

      if (!formatoDetectado) {
        formatoDetectado = 'WhatsApp estándar (formato: DD/MM/YYYY, HH:MM - Remitente: Mensaje)';
      }
    } else {
      if (
        line.length > 0 &&
        !line.includes('mensajes y las llamadas están cifrados') &&
        !line.includes('creó el grupo') &&
        !line.includes('Se te añadió')
      ) {
        lineasIgnoradas++;
      }
    }
  }

  parsedMessages.sort((a, b) => a.timestamp - b.timestamp);

  return {
    messages: parsedMessages,
    remitentes: Array.from(remitentesSet).sort(),
    stats: {
      formato: formatoDetectado,
      totalLineas: lines.length,
      procesadas: lineasProcesadas,
      ignoradas: lineasIgnoradas,
    },
  };
};

// ---- Parser SMS (existente, sin cambios) ----
const parseSMSXml = (xmlText) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const smsElements = xmlDoc.getElementsByTagName('sms');
  const parsedMessages = [];
  const remitentesSet = new Set();

  for (let i = 0; i < smsElements.length; i++) {
    const sms = smsElements[i];
    const address = sms.getAttribute('address');
    const body = sms.getAttribute('body');
    const readableDate = sms.getAttribute('readable_date');
    const type = sms.getAttribute('type');

    if (body && body.trim()) {
      let fechaISO = '';
      let hora = '';
      let fechaOriginal = '';

      if (readableDate) {
        const [fechaPart, horaPart] = readableDate.split(' ');
        const [dia, mes, año] = fechaPart.split('/');
        fechaISO = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        hora = horaPart.substring(0, 5);
        fechaOriginal = fechaPart;
      }

      const remitente = type === '1' ? address : 'Yo';
      remitentesSet.add(remitente);

      parsedMessages.push({
        fecha: fechaISO,
        fechaOriginal,
        hora,
        remitente,
        texto: body,
        timestamp: new Date(fechaISO).getTime(),
      });
    }
  }

  parsedMessages.sort((a, b) => a.timestamp - b.timestamp);

  return {
    messages: parsedMessages,
    remitentes: Array.from(remitentesSet).sort(),
    stats: {
      formato: 'SMS Backup XML',
      totalLineas: smsElements.length,
      procesadas: parsedMessages.length,
      ignoradas: smsElements.length - parsedMessages.length,
    },
  };
};

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [remitentes, setRemitentes] = useState([]);
  const [selectedRemitente, setSelectedRemitente] = useState('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroPaquetes, setFiltroPaquetes] = useState('todos');
  const [debugInfo, setDebugInfo] = useState('');
  const [tipoArchivo, setTipoArchivo] = useState('whatsapp');
  const [palabrasClave, setPalabrasClave] = useState(['paq', 'paquete', 'paquetes']);

  // NUEVO: vista activa
  const [vistaActiva, setVistaActiva] = useState('clientes'); // 'clientes' | 'mensajes'

  // 🔥 Remitentes que interactuaron dentro del rango de fechas seleccionado
  const remitentesFiltradosPorFecha = useMemo(() => {
    if (!fechaInicio && !fechaFin) return remitentes;

    const set = new Set();
    for (const msg of messages) {
      const cumpleInicio = !fechaInicio || msg.fecha >= fechaInicio;
      const cumpleFin = !fechaFin || msg.fecha <= fechaFin;
      if (cumpleInicio && cumpleFin) set.add(msg.remitente);
    }
    return Array.from(set).sort();
  }, [messages, remitentes, fechaInicio, fechaFin]);

  // 🔥 Si el remitente seleccionado ya no existe en el rango, volver a "todos"
  useEffect(() => {
    if (
      selectedRemitente !== 'todos' &&
      !remitentesFiltradosPorFecha.includes(selectedRemitente)
    ) {
      setSelectedRemitente('todos');
    }
  }, [remitentesFiltradosPorFecha, selectedRemitente]);


  const handleFileUpload = (fileContent) => {
    try {
      let result;
      if (tipoArchivo === 'whatsapp') result = parseWhatsAppChat(fileContent);
      else if (tipoArchivo === 'sms') result = parseSMSXml(fileContent);
      else throw new Error('Tipo de archivo no soportado');

      const { messages: parsedMessages, remitentes: parsedRemitentes, stats } = result;

      if (parsedMessages.length === 0) {
        setDebugInfo(`
          ❌ No se encontraron mensajes.
          Formato: ${tipoArchivo === 'whatsapp' ? 'WhatsApp' : 'SMS'}
          Líneas totales: ${stats.totalLineas}
          Mensajes encontrados: ${parsedMessages.length}
        `);
        alert(`No se encontraron mensajes en el archivo ${tipoArchivo === 'whatsapp' ? '.txt' : '.xml'}`);
      } else {
        setMessages(parsedMessages);
        setRemitentes(parsedRemitentes);
        setSelectedRemitente('todos');
        setFechaInicio('');
        setFechaFin('');
        setFiltroPaquetes('todos');
        setDebugInfo('');
        setVistaActiva('clientes'); // por defecto arrancamos en clientes

        const mensajesConPaquetes = parsedMessages.filter((msg) =>
          palabrasClave.some((p) => msg.texto.toLowerCase().includes(p.toLowerCase()))
        ).length;

        alert(
          `✅ Archivo ${tipoArchivo === 'whatsapp' ? 'WhatsApp' : 'SMS'} cargado!\n` +
          `📊 ${parsedMessages.length} mensajes\n` +
          `👥 ${parsedRemitentes.length} participantes\n` +
          `📦 ${mensajesConPaquetes} mensajes con palabras clave`
        );
      }
    } catch (error) {
      console.error('Error:', error);
      alert(`Error al procesar el archivo: ${error.message}`);
    }
  };

  const handleReset = () => {
    setSelectedRemitente('todos');
    setFechaInicio('');
    setFechaFin('');
    setFiltroPaquetes('todos');
  };

  const handleFechaChange = (tipo, fecha) => {
    if (tipo === 'inicio') setFechaInicio(fecha);
    else setFechaFin(fecha);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {messages.length === 0 && (
        <header className="bg-green-600 text-white shadow-lg mb-1">
          <div className="container mx-auto px-4 py-1">
            <h1 className="text-3xl font-bold">Revisión de Recargas</h1>
            <p className="text-green-100 mt-1">Conversaciones exportadas</p>
          </div>
        </header>
      )}

      <main className="container mx-auto px-4 py-1">
        <div className="space-y-1">
          {messages.length === 0 ? (
            <>
              <FileTypeSelector selectedType={tipoArchivo} onTypeChange={setTipoArchivo} />
              <FileUploader onFileUpload={handleFileUpload} />
              {debugInfo && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <h3 className="text-yellow-800 font-semibold mb-2">Información:</h3>
                  <pre className="text-xs text-yellow-700 whitespace-pre-wrap">{debugInfo}</pre>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Tabs de vista */}
              <div className="flex gap-2 mb-3 bg-white rounded-lg p-2 shadow">
                <button
                  onClick={() => setVistaActiva('clientes')}
                  className={`px-4 py-2 rounded-md font-medium transition ${vistaActiva === 'clientes'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  📊 Clientes y Recargas
                </button>
                <button
                  onClick={() => setVistaActiva('mensajes')}
                  className={`px-4 py-2 rounded-md font-medium transition ${vistaActiva === 'mensajes'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  💬 Mensajes
                </button>
              </div>

              {vistaActiva === 'clientes' ? (
                <ClientesRecargas messages={messages} />
              ) : (
                <>
                  <Filters
                    remitentes={remitentesFiltradosPorFecha}
                    selectedRemitente={selectedRemitente}
                    onRemitenteChange={setSelectedRemitente}
                    fechaInicio={fechaInicio}
                    fechaFin={fechaFin}
                    onFechaChange={handleFechaChange}
                    onReset={handleReset}
                    filtroPaquetes={filtroPaquetes}
                    onFiltroPaquetesChange={setFiltroPaquetes}
                    palabrasClave={palabrasClave}
                    onPalabrasClaveChange={setPalabrasClave}
                  />
                  <ChatSimulator
                    messages={messages}
                    selectedRemitente={selectedRemitente}
                    fechaInicio={fechaInicio}
                    fechaFin={fechaFin}
                    filtroPaquetes={filtroPaquetes}
                    palabrasClave={palabrasClave}
                  />
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}