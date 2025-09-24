# Time Series Dashboard

## Overview

Esta es una aplicación web basada en Flask para análisis y visualización de series de tiempo. La aplicación proporciona un dashboard interactivo con navegación para análisis avanzado de series temporales, incluyendo descomposición estacional, pronósticos Holt-Winters, gráficos de retraso y análisis de autocorrelación.

## Características del Proyecto

### Funcionalidades Principales
- **Carga de Datos**: Soporte para archivos CSV, Excel (.xlsx, .xls) y TXT con diferentes separadores
- **Visualización de Series**: Gráficos interactivos de líneas, dispersión y combinados
- **Análisis de Retraso**: Gráficos lag plots para identificar patrones de correlación serial
- **Descomposición Estacional**: Análisis automático aditivo vs multiplicativo usando statsmodels
- **Pronósticos Holt-Winters**: Generación de predicciones con visualización de intervalos de confianza
- **Autocorrelación**: Análisis de función de autocorrelación para modelado

### Análisis Soportados
- Detección automática de modelo (aditivo/multiplicativo)
- Descomposición en tendencia, estacionalidad y residuos
- Análisis de correlación serial mediante lag plots
- Pronósticos con intervalos de confianza
- Visualización interactiva con Plotly

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Template Engine**: Flask's Jinja2 templating system para renderizado del lado servidor
- **UI Framework**: Bootstrap 5.3.0 para diseño responsivo y componentes
- **Icons**: Font Awesome 6.4.0 para iconografía consistente
- **Visualización**: Plotly.js para gráficos interactivos de series de tiempo
- **JavaScript**: Vanilla JavaScript para interactividad del dashboard
- **Styling**: CSS personalizado con diseños gradientes y transiciones suaves

### Backend Architecture
- **Web Framework**: Flask con CORS habilitado para requests cross-origin
- **Data Processing**: Pandas para manipulación de datos, NumPy para cálculos numéricos
- **Time Series Analysis**: Statsmodels para descomposición estacional y Holt-Winters
- **Visualization**: Plotly y Matplotlib para generación de gráficos
- **File Handling**: Werkzeug para carga segura de archivos
- **WSGI Interface**: Configuración dedicada para deployment en producción

### API Endpoints
- `GET /` - Dashboard principal
- `GET /visualization` - Página de visualización de series
- `GET /decomposition` - Página de descomposición Holt-Winters
- `GET /analisis_comparativo` - Página de análisis comparativo de métodos
- `GET /modelo_de_serie` - **NUEVO**: Página de análisis de modelo de serie (React)
- `POST /upload_data` - Carga de archivos de datos
- `POST /plot_series` - Generación de gráficos básicos
- `POST /plot_lag_series` - Generación de gráficos de retraso
- `POST /analyze_series` - Análisis de descomposición estacional
- `POST /comparative_analysis` - Análisis comparativo de métodos de suavizado
- `POST /holt_winters_forecast` - Generación de pronósticos
- `POST /get_data_table` - Obtención de datos tabulares
- `GET /health` - Endpoint de verificación de salud

### Deployment Configuration
- **Production Server**: Gunicorn con 4 worker processes y sync worker class
- **Process Management**: Reinicio automático de workers y prevención de memory leaks
- **Logging**: Registro estructurado de acceso y errores a stdout/stderr
- **Performance**: Connection pooling y configuraciones de timeout

### Development Setup
- **Debug Mode**: Habilitado para desarrollo con hot reloading
- **Host Binding**: Configurado para deployment container-friendly (0.0.0.0:5000)
- **Static Assets**: Archivos CSS y JavaScript organizados en estructura de directorios

## Dependencies

### Python Packages (requirements.txt)
- **flask>=3.1.2**: Framework web principal
- **flask-cors>=6.0.1**: Soporte para cross-origin resource sharing
- **gunicorn>=23.0.0**: Servidor WSGI para producción
- **pandas>=2.3.2**: Manipulación y análisis de datos
- **numpy>=2.3.3**: Computación numérica
- **matplotlib>=3.10.6**: Generación de gráficos estáticos
- **plotly>=6.3.0**: Gráficos interactivos
- **seaborn>=0.13.2**: Visualización estadística
- **statsmodels>=0.14.5**: Análisis estadístico y econométrico
- **werkzeug>=3.1.3**: Utilidades WSGI
- **kaleido>=1.1.0**: Generación de imágenes estáticas desde Plotly

### Frontend Libraries (CDN)
- **Bootstrap 5.3.0**: Framework CSS para UI responsiva
- **Font Awesome 6.4.0**: Biblioteca de iconos
- **Plotly.js**: Incluido automáticamente para visualización interactiva

## Project Structure

```
/
├── app.py                    # Aplicación Flask principal
├── wsgi.py                   # Configuración WSGI
├── gunicorn.conf.py         # Configuración Gunicorn
├── requirements.txt         # Dependencias Python
├── pyproject.toml          # Configuración del proyecto
├── replit.md               # Documentación del proyecto
├── templates/              # Templates HTML
│   ├── dashboard.html      # Página principal
│   ├── visualization.html  # Página de visualización
│   ├── decomposition.html  # Página de descomposición
│   ├── analisis_comparativo.html # Página de análisis comparativo
│   └── modelo_de_serie.html # **NUEVO**: Página de análisis de modelo (React)
├── static/                 # Archivos estáticos
│   ├── css/
│   │   └── dashboard.css   # Estilos personalizados
│   └── js/
│       ├── dashboard.js    # JavaScript del dashboard
│       ├── visualization.js # JavaScript de visualización
│       └── decomposition.js # JavaScript de descomposición
└── uploads/               # Directorio para archivos cargados
    ├── *.csv              # Archivos CSV de datos
    ├── *.xlsx             # Archivos Excel
    └── *.txt              # Archivos de texto
```

## Recent Changes (Septiembre 2025)

- **2025-09-24**: **NUEVA FUNCIONALIDAD**: Implementación completa de la sección "Modelo de Serie" 
  - Integración exitosa del componente TypeScript React time_series_analysis.tsx
  - Nueva ruta `/modelo_de_serie` con análisis avanzado de series temporales
  - Funcionalidad para determinar automáticamente modelo aditivo vs multiplicativo
  - Análisis por segmentos con correlación media-varianza
  - Interfaz React completa con gráficos interactivos (Recharts)
  - Navegación actualizada en todos los templates del dashboard
- **2025-09-24**: Configuración corregida del workflow para ejecutar Flask con Gunicorn (producción)
- **2025-09-24**: Instalación de todas las dependencias Python necesarias (openpyxl, xlrd para Excel)
- **2025-09-24**: Creación de requirements.txt con versiones específicas
- **2025-09-24**: Implementación de validación segura de archivos (prevención de path traversal)
- **2025-09-24**: Verificación completa de endpoints API para funcionalidad de series de tiempo
- **2025-09-24**: Correcciones de seguridad en todos los endpoints de carga de datos
- **2025-09-24**: Migración a servidor Gunicorn para entorno de producción seguro
- **2025-09-24**: Documentación expandida del proyecto con detalles técnicos completos

## Security Features

- **File Upload Security**: Validación de extensiones permitidas (csv, xlsx, xls, txt)
- **Path Traversal Protection**: Verificación de rutas y nombres de archivo seguros
- **Production Server**: Gunicorn con workers configurados, sin debug mode
- **Input Validation**: Validación de parámetros requeridos en todos los endpoints
- **Error Handling**: Manejo robusto de errores sin exposición de información sensible

## Infrastructure

- **Environment Variables**: SESSION_SECRET para manejo seguro de sesiones
- **Static File Serving**: Servicio built-in de Flask para assets CSS/JS
- **Health Monitoring**: Endpoint de verificación de salud built-in
- **File Upload**: Directorio uploads/ para almacenamiento temporal de datos
- **Error Handling**: Manejo robusto de errores con mensajes en español