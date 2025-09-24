import React, { useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as math from 'mathjs';
import * as Papa from 'papaparse';

const TimeSeriesAnalyzer = () => {
  const [csvData, setCsvData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [selectedTimeCol, setSelectedTimeCol] = useState('');
  const [selectedValueCol, setSelectedValueCol] = useState('');
  const [numSegmentos, setNumSegmentos] = useState(4);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');

  // Función para calcular varianza manualmente
  const calcularVarianza = (datos) => {
    if (datos.length === 0) return 0;
    const media = math.mean(datos);
    const sumaCuadrados = datos.reduce((sum, valor) => sum + Math.pow(valor - media, 2), 0);
    return sumaCuadrados / Math.max(datos.length - 1, 1);
  };

  // Manejar carga de archivo
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError('');
    setCsvData(null);
    setAnalysis(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error al parsear el archivo: ' + results.errors[0].message);
          return;
        }

        if (results.data.length === 0) {
          setError('El archivo está vacío');
          return;
        }

        const cleanHeaders = Object.keys(results.data[0]).map(h => h.trim());
        setHeaders(cleanHeaders);
        setCsvData(results.data);
        setSelectedTimeCol('');
        setSelectedValueCol('');
      },
      error: (error) => {
        setError('Error al leer el archivo: ' + error.message);
      }
    });
  }, []);

  // Procesar datos y realizar análisis
  const processData = useCallback(() => {
    if (!csvData || !selectedTimeCol || !selectedValueCol) return;

    try {
      // Filtrar y procesar datos
      const processedData = csvData
        .map((row, index) => {
          const value = parseFloat(row[selectedValueCol]);
          return {
            index: index + 1,
            time: row[selectedTimeCol],
            value: isNaN(value) ? null : value
          };
        })
        .filter(row => row.value !== null && row.value !== undefined);

      if (processedData.length < numSegmentos * 2) {
        setError(`Se necesitan al menos ${numSegmentos * 2} puntos de datos válidos para ${numSegmentos} segmentos`);
        return;
      }

      // Realizar análisis completo
      const resultado = realizarAnalisisCompleto(processedData);
      setAnalysis(resultado);
      setError('');

    } catch (err) {
      setError('Error en el procesamiento: ' + err.message);
    }
  }, [csvData, selectedTimeCol, selectedValueCol, numSegmentos]);

  // Función principal de análisis
  const realizarAnalisisCompleto = (datos) => {
    const valores = datos.map(d => d.value);
    const n = valores.length;

    // 1. Estadísticas básicas
    const media = math.mean(valores);
    const desviacion = math.std(valores);
    const varianza = calcularVarianza(valores);
    const coefVariacion = (desviacion / media) * 100;

    // 2. Análisis por segmentos (Media-Varianza)
    const segmentos = [];
    const tamSegmento = Math.floor(n / numSegmentos);

    for (let i = 0; i < numSegmentos; i++) {
      const inicio = i * tamSegmento;
      const fin = i === numSegmentos - 1 ? n : (i + 1) * tamSegmento;
      const segmento = valores.slice(inicio, fin);
      
      const mediaSegmento = math.mean(segmento);
      const varianzaSegmento = calcularVarianza(segmento);
      const desviacionSegmento = math.std(segmento);
      
      segmentos.push({
        segmento: i + 1,
        inicio: inicio + 1,
        fin: fin,
        tamaño: segmento.length,
        media: mediaSegmento,
        varianza: varianzaSegmento,
        desviacion: desviacionSegmento,
        cv: (desviacionSegmento / mediaSegmento) * 100,
        min: Math.min(...segmento),
        max: Math.max(...segmento)
      });
    }

    // 3. Correlación Media-Varianza
    const medias = segmentos.map(s => s.media);
    const varianzas = segmentos.map(s => s.varianza);
    
    const mediaDeMedias = math.mean(medias);
    const mediaDeVarianzas = math.mean(varianzas);
    
    const numerador = medias.reduce((sum, media, i) => 
      sum + (media - mediaDeMedias) * (varianzas[i] - mediaDeVarianzas), 0);
    const denominador = Math.sqrt(
      medias.reduce((sum, media) => sum + Math.pow(media - mediaDeMedias, 2), 0) *
      varianzas.reduce((sum, varianza) => sum + Math.pow(varianza - mediaDeVarianzas, 2), 0)
    );
    
    const correlacionMediaVarianza = denominador === 0 ? 0 : numerador / denominador;

    // 4. Análisis de tendencia (media móvil simple)
    const ventana = Math.min(4, Math.floor(n / 8));
    const tendencia = valores.map((_, i) => {
      if (i < ventana - 1) return null;
      const segmentoTendencia = valores.slice(i - ventana + 1, i + 1);
      return math.mean(segmentoTendencia);
    });

    // 5. Cambios consecutivos
    const cambiosAbsolutos = [];
    const cambiosRelativos = [];
    
    for (let i = 1; i < valores.length; i++) {
      const anterior = valores[i-1];
      const actual = valores[i];
      const cambioAbs = Math.abs(actual - anterior);
      const cambioRel = Math.abs((actual - anterior) / anterior) * 100;
      
      cambiosAbsolutos.push(cambioAbs);
      cambiosRelativos.push(cambioRel);
    }

    const mediaCambiosAbsolutos = math.mean(cambiosAbsolutos);
    const mediaCambiosRelativos = math.mean(cambiosRelativos);

    // 6. Decisión del modelo
    const criterios = {
      correlacionMediaVarianza: {
        valor: correlacionMediaVarianza,
        criterio: Math.abs(correlacionMediaVarianza) < 0.5 ? 'ADITIVO' : 'MULTIPLICATIVO',
        descripcion: 'Correlación entre medias y varianzas de segmentos'
      },
      coeficienteVariacion: {
        valor: coefVariacion,
        criterio: coefVariacion < 20 ? 'ADITIVO' : 'MULTIPLICATIVO',
        descripcion: 'Coeficiente de variación general'
      },
      cambiosRelativos: {
        valor: mediaCambiosRelativos,
        criterio: mediaCambiosRelativos < 15 ? 'ADITIVO' : 'MULTIPLICATIVO',
        descripcion: 'Promedio de cambios relativos consecutivos'
      }
    };

    // Voto mayoría
    const votos = Object.values(criterios).map(c => c.criterio);
    const votosAditivo = votos.filter(v => v === 'ADITIVO').length;
    const recomendacionFinal = votosAditivo >= 2 ? 'ADITIVO' : 'MULTIPLICATIVO';

    return {
      datosOriginales: datos,
      estadisticasBasicas: {
        n,
        media,
        desviacion,
        varianza,
        coefVariacion,
        min: Math.min(...valores),
        max: Math.max(...valores)
      },
      segmentos,
      correlacionMediaVarianza,
      tendencia: tendencia.filter(t => t !== null),
      cambios: {
        absolutos: mediaCambiosAbsolutos,
        relativos: mediaCambiosRelativos
      },
      criterios,
      recomendacionFinal,
      confianza: Math.max(votosAditivo, votos.length - votosAditivo) / votos.length
    };
  };

  // Datos para gráfico
  const chartData = analysis ? analysis.datosOriginales.map((d, i) => ({
    index: d.index,
    value: d.value,
    trend: i < analysis.tendencia.length ? analysis.tendencia[i] : null
  })) : [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">📊 Analizador de Series Temporales</h1>
        <p className="text-gray-600">Determina si usar descomposición aditiva o multiplicativa</p>
      </div>

      {/* Carga de archivo */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-xl font-semibold mb-4">1. Cargar Datos</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Seleccionar archivo CSV:
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {headers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Columna de Tiempo/Período:
                </label>
                <select
                  value={selectedTimeCol}
                  onChange={(e) => setSelectedTimeCol(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar columna...</option>
                  {headers.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Columna de Valores:
                </label>
                <select
                  value={selectedValueCol}
                  onChange={(e) => setSelectedValueCol(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar columna...</option>
                  {headers.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {headers.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Número de Segmentos para Análisis:
              </label>
              <div className="flex items-center space-x-4">
                <select
                  value={numSegmentos}
                  onChange={(e) => setNumSegmentos(parseInt(e.target.value))}
                  className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={3}>3 segmentos</option>
                  <option value={4}>4 segmentos (recomendado)</option>
                  <option value={5}>5 segmentos</option>
                  <option value={6}>6 segmentos</option>
                  <option value={8}>8 segmentos</option>
                  <option value={10}>10 segmentos</option>
                </select>
                <span className="text-sm text-gray-600">
                  {csvData ? `(${Math.floor(csvData.length / numSegmentos)} obs. aprox. por segmento)` : ''}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                📋 <strong>Guía:</strong> 3-4 segmentos para series cortas (&lt;50 obs.), 5-6 para series medianas (50-100 obs.), 8-10 para series largas (&gt;100 obs.)
              </p>
            </div>
          )}

          {selectedTimeCol && selectedValueCol && (
            <div className="flex items-center space-x-4">
              <button
                onClick={processData}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                🔍 Analizar Serie ({numSegmentos} segmentos)
              </button>
              <div className="text-sm text-gray-600">
                {csvData && `Datos cargados: ${csvData.length} observaciones`}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>
      </div>

      {analysis && (
        <>
          {/* Gráfico principal */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">2. Visualización de la Serie</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  name="Serie Original"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="trend" 
                  stroke="#dc2626" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Tendencia"
                  connectNulls={false}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico Media-Varianza */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">3. Análisis Gráfico Media-Varianza por Segmentos</h2>
            <div className="mb-4 p-4 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                <strong>📊 Interpretación:</strong> Si los puntos muestran una tendencia ascendente (correlación positiva fuerte), 
                indica que la varianza aumenta con la media → <strong>Modelo Multiplicativo</strong>.
                Si los puntos están dispersos sin patrón claro → <strong>Modelo Aditivo</strong>.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de líneas Media vs Varianza */}
              <div>
                <h3 className="font-semibold mb-3">Medias y Varianzas por Segmento</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analysis.segmentos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="segmento" 
                      label={{ value: 'Segmento', position: 'insideBottom', offset: -10 }}
                    />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name, props) => [
                        value.toFixed(3), 
                        name === 'media' ? 'Media' : 'Varianza'
                      ]}
                      labelFormatter={(label) => `Segmento ${label}`}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="media" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      name="Media"
                      dot={{ fill: '#2563eb', strokeWidth: 2, r: 6 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="varianza" 
                      stroke="#dc2626" 
                      strokeWidth={3}
                      name="Varianza"
                      dot={{ fill: '#dc2626', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de dispersión Media vs Varianza */}
              <div>
                <h3 className="font-semibold mb-3">
                  Correlación Media-Varianza 
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${
                    Math.abs(analysis.correlacionMediaVarianza) >= 0.5 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    r = {analysis.correlacionMediaVarianza.toFixed(3)}
                  </span>
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart 
                    data={analysis.segmentos}
                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="media" 
                      type="number"
                      domain={['dataMin - 5', 'dataMax + 5']}
                      label={{ value: 'Media del Segmento', position: 'insideBottom', offset: -10 }}
                    />
                    <YAxis 
                      dataKey="varianza"
                      label={{ value: 'Varianza', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${value.toFixed(2)}`, 
                        name === 'varianza' ? 'Varianza' : name
                      ]}
                      labelFormatter={(value) => `Media: ${value.toFixed(2)}`}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded shadow">
                              <p className="font-semibold">Segmento {data.segmento}</p>
                              <p>Media: {data.media.toFixed(2)}</p>
                              <p>Varianza: {data.varianza.toFixed(2)}</p>
                              <p>Obs.: {data.inicio}-{data.fin}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="linear"
                      dataKey="varianza" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Línea de Tendencia"
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 8 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-2 text-xs text-gray-600 text-center">
                  {Math.abs(analysis.correlacionMediaVarianza) >= 0.5 ? (
                    <span className="text-orange-700">
                      🔶 <strong>Correlación fuerte:</strong> La varianza tiende a aumentar con la media
                    </span>
                  ) : (
                    <span className="text-green-700">
                      🟢 <strong>Correlación débil:</strong> La varianza se mantiene relativamente constante
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de resultados completa */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">4. Tabla de Resultados del Análisis</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Categoría</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Métrica</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Valor</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Interpretación</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Recomendación</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Estadísticas básicas */}
                  <tr className="bg-blue-50">
                    <td rowSpan="6" className="border border-gray-300 px-4 py-2 font-semibold align-top bg-blue-100">
                      Estadísticas<br/>Básicas
                    </td>
                    <td className="border border-gray-300 px-4 py-2">Número de observaciones</td>
                    <td className="border border-gray-300 px-4 py-2 font-mono">{analysis.estadisticasBasicas.n}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">Tamaño de la muestra</td>
                    <td className="border border-gray-300 px-4 py-2">-</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="border border-gray-300 px-4 py-2">Media (μ)</td>
                    <td className="border border-gray-300 px-4 py-2 font-mono">{analysis.estadisticasBasicas.media.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">Valor promedio de la serie</td>
                    <td className="border border-gray-300 px-4 py-2">-</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="border border-gray-300 px-4 py-2">Desviación Estándar (σ)</td>
                    <td className="border border-gray-300 px-4 py-2 font-mono">{analysis.estadisticasBasicas.desviacion.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">Dispersión absoluta de los datos</td>
                    <td className="border border-gray-300 px-4 py-2">-</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="border border-gray-300 px-4 py-2">Varianza (σ²)</td>
                    <td className="border border-gray-300 px-4 py-2 font-mono">{analysis.estadisticasBasicas.varianza.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">Cuadrado de la desviación estándar</td>
                    <td className="border border-gray-300 px-4 py-2">-</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="border border-gray-300 px-4 py-2">Rango</td>
                    <td className="border border-gray-300 px-4 py-2 font-mono">{(analysis.estadisticasBasicas.max - analysis.estadisticasBasicas.min).toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">Diferencia entre máximo y mínimo</td>
                    <td className="border border-gray-300 px-4 py-2">-</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td className="border border-gray-300 px-4 py-2">Coeficiente de Variación (CV)</td>
                    <td className="border border-gray-300 px-4 py-2 font-mono">{analysis.estadisticasBasicas.coefVariacion.toFixed(2)}%</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">Variabilidad relativa (σ/μ × 100)</td>
                    <td className={`border border-gray-300 px-4 py-2 font-semibold ${
                      analysis.criterios.coeficienteVariacion.criterio === 'ADITIVO' ? 'text-green-700' : 'text-orange-700'
                    }`}>
                      {analysis.criterios.coeficienteVariacion.criterio}
                    </td>
                  </tr>

                  {/* Análisis por segmentos */}
                  {analysis.segmentos.map((seg, i) => (
                    <tr key={i} className={i === 0 ? "bg-green-50" : "bg-green-25"}>
                      {i === 0 && (
                        <td rowSpan={analysis.segmentos.length} className="border border-gray-300 px-4 py-2 font-semibold align-top bg-green-100">
                          Análisis por<br/>Segmentos
                        </td>
                      )}
                      <td className="border border-gray-300 px-4 py-2">
                        Segmento {seg.segmento} (obs. {seg.inicio}-{seg.fin})
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">
                        <div>Media: <span className="font-mono">{seg.media.toFixed(2)}</span></div>
                        <div>Varianza: <span className="font-mono">{seg.varianza.toFixed(2)}</span></div>
                        <div>CV: <span className="font-mono">{seg.cv.toFixed(1)}%</span></div>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">
                        Estadísticas del segmento {seg.segmento} de {seg.tamaño} observaciones
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {i === 0 ? 'Ver correlación' : '-'}
                      </td>
                    </tr>
                  ))}

                  {/* Test principal */}
                  <tr className="bg-yellow-50">
                    <td className="border border-gray-300 px-4 py-2 font-semibold bg-yellow-100">
                      Test Principal<br/>(Media-Varianza)
                    </td>
                    <td className="border border-gray-300 px-4 py-2">Correlación Media-Varianza (r)</td>
                    <td className="border border-gray-300 px-4 py-2 font-mono text-lg font-bold">
                      {analysis.correlacionMediaVarianza.toFixed(3)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      Correlación entre las medias y varianzas de los segmentos.<br/>
                      Si |r| ≥ 0.5 → varianza crece con media → multiplicativo
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 font-bold text-lg ${
                      analysis.criterios.correlacionMediaVarianza.criterio === 'ADITIVO' ? 'text-green-700' : 'text-orange-700'
                    }`}>
                      {analysis.criterios.correlacionMediaVarianza.criterio}
                    </td>
                  </tr>

                  {/* Análisis de cambios */}
                  <tr className="bg-purple-50">
                    <td rowSpan="2" className="border border-gray-300 px-4 py-2 font-semibold align-top bg-purple-100">
                      Análisis de<br/>Cambios
                    </td>
                    <td className="border border-gray-300 px-4 py-2">Cambio Absoluto Promedio</td>
                    <td className="border border-gray-300 px-4 py-2 font-mono">{analysis.cambios.absolutos.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">Media de |Y(t) - Y(t-1)|</td>
                    <td className="border border-gray-300 px-4 py-2">-</td>
                  </tr>
                  <tr className="bg-purple-50">
                    <td className="border border-gray-300 px-4 py-2">Cambio Relativo Promedio (%)</td>
                    <td className="border border-gray-300 px-4 py-2 font-mono">{analysis.cambios.relativos.toFixed(2)}%</td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">Media de |(Y(t) - Y(t-1))/Y(t-1)| × 100</td>
                    <td className={`border border-gray-300 px-4 py-2 font-semibold ${
                      analysis.criterios.cambiosRelativos.criterio === 'ADITIVO' ? 'text-green-700' : 'text-orange-700'
                    }`}>
                      {analysis.criterios.cambiosRelativos.criterio}
                    </td>
                  </tr>

                  {/* Decisión final */}
                  <tr className="bg-gray-100 border-t-2 border-gray-400">
                    <td className="border border-gray-300 px-4 py-2 font-bold bg-gray-200">
                      DECISIÓN<br/>FINAL
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-bold">
                      Modelo Recomendado
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 font-bold text-xl ${
                      analysis.recomendacionFinal === 'ADITIVO' ? 'text-green-700' : 'text-orange-700'
                    }`}>
                      {analysis.recomendacionFinal}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      Basado en votación mayoritaria de los 3 criterios.<br/>
                      Confianza: {(analysis.confianza * 100).toFixed(0)}%
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                      {analysis.recomendacionFinal === 'ADITIVO' 
                        ? 'Y(t) = T(t) + S(t) + ε(t)' 
                        : 'Y(t) = T(t) × S(t) × ε(t)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Explicación detallada de cálculos */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">5. Explicación Detallada de los Cálculos</h2>
            
            <div className="space-y-6">
              <div className="bg-white p-4 rounded border">
                <h3 className="font-semibold text-lg mb-2">🧮 Estadísticas Básicas</h3>
                <ul className="space-y-2 text-sm">
                  <li><strong>Media (μ):</strong> μ = (Σ Yi) / n = suma de todos los valores dividida entre el número de observaciones</li>
                  <li><strong>Varianza (σ²):</strong> σ² = Σ(Yi - μ)² / (n-1) = promedio de las desviaciones cuadráticas respecto a la media</li>
                  <li><strong>Desviación Estándar (σ):</strong> σ = √σ² = raíz cuadrada de la varianza</li>
                  <li><strong>Coeficiente de Variación (CV):</strong> CV = (σ/μ) × 100 = medida de variabilidad relativa</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded border">
                <h3 className="font-semibold text-lg mb-2">📊 Análisis por Segmentos (Método Tradicional)</h3>
                <ul className="space-y-2 text-sm">
                  <li><strong>División:</strong> La serie se divide en {analysis.segmentos.length} segmentos de tamaño aproximadamente igual</li>
                  <li><strong>Tamaño por segmento:</strong> ~{Math.floor(analysis.estadisticasBasicas.n / analysis.segmentos.length)} observaciones cada uno</li>
                  <li><strong>Cálculo por segmento:</strong> Se calcula la media y varianza de cada segmento por separado</li>
                  <li><strong>Correlación r:</strong> r = Σ[(Mi - M̄)(Vi - V̄)] / √[Σ(Mi - M̄)² × Σ(Vi - V̄)²]</li>
                  <li className="ml-4">Donde Mi = media del segmento i, Vi = varianza del segmento i</li>
                  <li className="ml-4">M̄ = media de las medias, V̄ = media de las varianzas</li>
                  <li><strong>Interpretación:</strong> Si la varianza aumenta cuando la media aumenta → r positiva fuerte → modelo multiplicativo</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded border">
                <h3 className="font-semibold text-lg mb-2">⚖️ Criterios de Decisión</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-green-700">Modelo ADITIVO si:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• |r| &lt; 0.5 (correlación débil media-varianza)</li>
                      <li>• CV &lt; 20% (variabilidad relativa baja)</li>
                      <li>• Cambios relativos &lt; 15%</li>
                      <li>• Varianza constante en el tiempo</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-700">Modelo MULTIPLICATIVO si:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• |r| ≥ 0.5 (correlación fuerte media-varianza)</li>
                      <li>• CV ≥ 20% (variabilidad relativa alta)</li>
                      <li>• Cambios relativos ≥ 15%</li>
                      <li>• Varianza crece con el nivel</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded border">
                <h3 className="font-semibold text-lg mb-2">🎯 Interpretación del Resultado</h3>
                <div className={`p-3 rounded ${
                  analysis.recomendacionFinal === 'ADITIVO' ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  <p className="text-sm">
                    <strong>Tu serie es apta para descomposición {analysis.recomendacionFinal}:</strong><br/>
                    {analysis.recomendacionFinal === 'ADITIVO' ? (
                      <>La variabilidad se mantiene relativamente constante independientemente del nivel de la serie.
                      Los componentes se suman: Y(t) = Tendencia + Estacionalidad + Error</>
                    ) : (
                      <>La variabilidad aumenta proporcionalmente con el nivel de la serie.
                      Los componentes se multiplican: Y(t) = Tendencia × Estacionalidad × Error</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TimeSeriesAnalyzer;