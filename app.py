from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
import os
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.holtwinters import ExponentialSmoothing
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import plotly
import json
import io
import base64
from werkzeug.utils import secure_filename
import locale
from datetime import datetime
import re

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SESSION_SECRET', 'dev-secret-key')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create uploads directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Set matplotlib style
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

@app.route('/')
def dashboard():
    """Dashboard welcome page for time series analysis"""
    return render_template('dashboard.html')

@app.route('/decomposition')
def decomposition():
    """Holt-Winters decomposition page"""
    return render_template('decomposition.html')

@app.route('/analisis_comparativo')
def analisis_comparativo():
    """Comparative analysis page for decomposition methods"""
    return render_template('analisis_comparativo.html')

@app.route('/visualization')
def visualization():
    """Time series visualization page"""
    return render_template('visualization.html')

@app.route('/modelo_de_serie')
def modelo_de_serie():
    """Time series model analysis page"""
    return render_template('modelo_de_serie.html')

@app.route('/plot_series', methods=['POST'])
def plot_series():
    """Generate time series plots"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        date_column = data.get('date_column')
        value_column = data.get('value_column')
        plot_type = data.get('plot_type', 'line')
        
        if not all([filename, date_column, value_column]):
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        # Load the data safely
        df, error = safe_load_file(filename)
        if error:
            return jsonify({'error': error}), 400
        
        # Process the time series
        df[date_column] = parse_spanish_dates(df[date_column])
        df[date_column] = pd.to_datetime(df[date_column])
        df = df.sort_values(date_column)
        ts = df[[date_column, value_column]]
        
        # Create basic time series plot
        fig = go.Figure()
        
        # Set title based on plot type
        if plot_type == 'line':
            fig.add_trace(go.Scatter(
                x=ts[date_column],
                y=ts[value_column],
                mode='lines',
                name='Serie de Tiempo',
                line=dict(color='blue', width=2)
            ))
            title = 'Gráfico de Serie de Tiempo'
        elif plot_type == 'scatter':
            fig.add_trace(go.Scatter(
                x=ts[date_column],
                y=ts[value_column],
                mode='markers',
                name='Serie de Tiempo',
                marker=dict(color='blue', size=4)
            ))
            title = 'Gráfico de Dispersión de Serie de Tiempo'
        elif plot_type == 'both':
            fig.add_trace(go.Scatter(
                x=ts[date_column],
                y=ts[value_column],
                mode='lines+markers',
                name='Serie de Tiempo',
                line=dict(color='blue', width=2),
                marker=dict(color='red', size=3)
            ))
            title = 'Gráfico de Serie de Tiempo (Línea + Puntos)'
        else:
            title = 'Gráfico de Serie de Tiempo'
        
        fig.update_layout(
            title=title,
            xaxis_title='Fecha',
            yaxis_title=value_column,
            hovermode='x unified',
            template='plotly_white'
        )
        
        graphJSON = json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
        
        return jsonify({
            'success': True,
            'plot': graphJSON,
            'data_points': len(ts),
            'date_range': {
                'start': ts[date_column].min().strftime('%Y-%m-%d'),
                'end': ts[date_column].max().strftime('%Y-%m-%d')
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Error al graficar: {str(e)}'}), 500

@app.route('/plot_lag_series', methods=['POST'])
def plot_lag_series():
    """Generate lag plots for time series"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        date_column = data.get('date_column')
        value_column = data.get('value_column')
        max_lags = data.get('max_lags', 12)
        
        if not all([filename, date_column, value_column]):
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        # Load the data safely
        df, error = safe_load_file(filename)
        if error:
            return jsonify({'error': error}), 400
        
        # Process the time series
        df[date_column] = parse_spanish_dates(df[date_column])
        df[date_column] = pd.to_datetime(df[date_column])
        df = df.sort_values(date_column)
        df.set_index(date_column, inplace=True)
        ts = df[value_column].dropna()
        
        # Create lag plots
        n_lags = min(max_lags, len(ts) - 1)
        
        # Create subplots for lag plots
        rows = (n_lags + 3) // 4  # 4 plots per row
        fig = make_subplots(
            rows=rows, cols=4,
            subplot_titles=[f'Lag {i+1}' for i in range(n_lags)],
            horizontal_spacing=0.08,
            vertical_spacing=0.12
        )
        
        for lag in range(1, n_lags + 1):
            row = ((lag - 1) // 4) + 1
            col = ((lag - 1) % 4) + 1
            
            # Create lagged series
            ts_lag = ts.shift(lag)
            
            # Remove NaN values for plotting
            mask = ~(ts.isna() | ts_lag.isna())
            x_vals = ts_lag[mask]
            y_vals = ts[mask]
            
            fig.add_trace(go.Scatter(
                x=x_vals,
                y=y_vals,
                mode='markers',
                name=f'Lag {lag}',
                marker=dict(size=4, opacity=0.6),
                showlegend=False
            ), row=row, col=col)
        
        fig.update_layout(
            title=f'Gráficos de Series Retardadas (Lags 1-{n_lags})',
            height=300 * rows,
            template='plotly_white'
        )
        
        # Update all axes
        fig.update_xaxes(title_text='Valor t-k')
        fig.update_yaxes(title_text='Valor t')
        
        graphJSON = json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
        
        # Also create autocorrelation plot
        autocorr_fig = go.Figure()
        
        # Calculate autocorrelations
        autocorrs = [ts.autocorr(lag=lag) for lag in range(1, n_lags + 1)]
        
        autocorr_fig.add_trace(go.Bar(
            x=list(range(1, n_lags + 1)),
            y=autocorrs,
            name='Autocorrelación',
            marker_color=['red' if abs(ac) > 0.2 else 'blue' for ac in autocorrs]
        ))
        
        autocorr_fig.update_layout(
            title='Función de Autocorrelación',
            xaxis_title='Lag',
            yaxis_title='Autocorrelación',
            template='plotly_white'
        )
        
        autocorr_graphJSON = json.dumps(autocorr_fig, cls=plotly.utils.PlotlyJSONEncoder)
        
        return jsonify({
            'success': True,
            'lag_plot': graphJSON,
            'autocorr_plot': autocorr_graphJSON,
            'autocorrelations': autocorrs,
            'n_lags': n_lags
        })
        
    except Exception as e:
        return jsonify({'error': f'Error en gráficos retardados: {str(e)}'}), 500

@app.route('/get_data_table', methods=['POST'])
def get_data_table():
    """Get data table for display"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        
        if not filename:
            return jsonify({'error': 'Nombre de archivo requerido'}), 400
        
        # Load the data safely
        df, error = safe_load_file(filename)
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'success': True,
            'columns': df.columns.tolist(),
            'data': df.head(100).to_dict('records'),  # First 100 rows
            'total_rows': len(df),
            'dtypes': df.dtypes.astype(str).to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'Error al cargar tabla: {str(e)}'}), 500

@app.route('/upload_data', methods=['POST'])
def upload_data():
    """Handle file upload for time series data"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No se seleccionó ningún archivo'}), 400
        
        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'error': 'No se seleccionó ningún archivo'}), 400
        
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Read and process the file
            try:
                if filename.endswith('.csv'):
                    df = pd.read_csv(filepath)
                elif filename.endswith(('.xlsx', '.xls')):
                    df = pd.read_excel(filepath)
                elif filename.endswith('.txt'):
                    # Try different separators for MS-DOS .txt files
                    try:
                        df = pd.read_csv(filepath, sep='\t', encoding='latin-1')
                    except:
                        try:
                            df = pd.read_csv(filepath, sep=',', encoding='latin-1')
                        except:
                            df = pd.read_csv(filepath, sep=';', encoding='latin-1')
                else:
                    return jsonify({'error': 'Formato de archivo no soportado'}), 400
                
                # Basic validation
                if len(df.columns) < 2:
                    return jsonify({'error': 'El archivo debe tener al menos 2 columnas (fecha y valor)'}), 400
                
                return jsonify({
                    'success': True,
                    'filename': filename,
                    'columns': df.columns.tolist(),
                    'rows': len(df),
                    'sample_data': df.head().to_dict('records')
                })
                
            except Exception as e:
                return jsonify({'error': f'Error al procesar el archivo: {str(e)}'}), 400
        
        return jsonify({'error': 'Formato de archivo no permitido. Formatos soportados: CSV, Excel (.xlsx, .xls), TXT (MS-DOS)'}), 400
        
    except Exception as e:
        return jsonify({'error': f'Error en la carga: {str(e)}'}), 500

@app.route('/analyze_series', methods=['POST'])
def analyze_series():
    """Analyze time series to determine if it's additive or multiplicative"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        date_column = data.get('date_column')
        value_column = data.get('value_column')
        
        if not all([filename, date_column, value_column]):
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        # Load the data safely
        df, error = safe_load_file(filename)
        if error:
            return jsonify({'error': error}), 400
        
        # Process the time series
        df[date_column] = parse_spanish_dates(df[date_column])
        df[date_column] = pd.to_datetime(df[date_column])
        df = df.sort_values(date_column)
        df.set_index(date_column, inplace=True)
        
        # Ensure we have enough data points
        if len(df) < 24:  # Minimum for seasonal decomposition
            return jsonify({'error': 'Se necesitan al menos 24 puntos de datos para la descomposición'}), 400
        
        # Perform decomposition analysis
        ts = df[value_column].dropna()
        
        # Try both additive and multiplicative decomposition
        try:
            decomp_add = seasonal_decompose(ts, model='additive', period=12)
            decomp_mult = seasonal_decompose(ts, model='multiplicative', period=12)
            
            # Calculate variance ratios to determine model type
            add_residual_var = np.var(decomp_add.resid.dropna())
            mult_residual_var = np.var(decomp_mult.resid.dropna())
            
            # Determine model type based on residual variance
            is_additive = add_residual_var < mult_residual_var
            model_type = 'additive' if is_additive else 'multiplicative'
            
            # Create visualization
            fig = make_subplots(
                rows=4, cols=1,
                subplot_titles=('Serie Original', 'Tendencia', 'Estacionalidad', 'Residuos'),
                vertical_spacing=0.08
            )
            
            decomp = decomp_add if is_additive else decomp_mult
            
            # Original series
            fig.add_trace(go.Scatter(
                x=ts.index, y=ts.values,
                mode='lines', name='Original',
                line=dict(color='blue')
            ), row=1, col=1)
            
            # Trend
            fig.add_trace(go.Scatter(
                x=decomp.trend.index, y=decomp.trend.values,
                mode='lines', name='Tendencia',
                line=dict(color='red')
            ), row=2, col=1)
            
            # Seasonal
            fig.add_trace(go.Scatter(
                x=decomp.seasonal.index, y=decomp.seasonal.values,
                mode='lines', name='Estacionalidad',
                line=dict(color='green')
            ), row=3, col=1)
            
            # Residuals
            fig.add_trace(go.Scatter(
                x=decomp.resid.index, y=decomp.resid.values,
                mode='lines', name='Residuos',
                line=dict(color='orange')
            ), row=4, col=1)
            
            fig.update_layout(
                height=800,
                title_text=f"Descomposición de Series de Tiempo - Modelo {model_type.capitalize()}",
                showlegend=False
            )
            
            # Convert to JSON
            graphJSON = json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
            
            return jsonify({
                'success': True,
                'model_type': model_type,
                'is_additive': bool(is_additive),
                'explanation': get_model_explanation(is_additive),
                'plot': graphJSON,
                'residual_variance': {
                    'additive': float(add_residual_var),
                    'multiplicative': float(mult_residual_var)
                }
            })
            
        except Exception as e:
            return jsonify({'error': f'Error en la descomposición: {str(e)}'}), 400
        
    except Exception as e:
        return jsonify({'error': f'Error en el análisis: {str(e)}'}), 500

@app.route('/holt_winters_forecast', methods=['POST'])
def holt_winters_forecast():
    """Apply Holt-Winters forecasting"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        date_column = data.get('date_column')
        value_column = data.get('value_column')
        model_type = data.get('model_type', 'additive')
        periods = data.get('periods', 12)
        
        # Load and process data safely
        df, error = safe_load_file(filename)
        if error:
            return jsonify({'error': error}), 400
        
        df[date_column] = parse_spanish_dates(df[date_column])
        df[date_column] = pd.to_datetime(df[date_column])
        df = df.sort_values(date_column)
        df.set_index(date_column, inplace=True)
        ts = df[value_column].dropna()
        
        # Apply Holt-Winters
        trend = 'add' if model_type == 'additive' else 'mul'
        seasonal = 'add' if model_type == 'additive' else 'mul'
        
        model = ExponentialSmoothing(
            ts, 
            trend=trend, 
            seasonal=seasonal, 
            seasonal_periods=12
        )
        fitted_model = model.fit()
        
        # Generate forecast
        forecast = fitted_model.forecast(periods)
        fitted_values = fitted_model.fittedvalues
        
        # Create forecast visualization
        fig = go.Figure()
        
        # Historical data
        fig.add_trace(go.Scatter(
            x=ts.index,
            y=ts.values,
            mode='lines',
            name='Datos Históricos',
            line=dict(color='blue')
        ))
        
        # Fitted values
        fig.add_trace(go.Scatter(
            x=fitted_values.index,
            y=fitted_values.values,
            mode='lines',
            name='Valores Ajustados',
            line=dict(color='red', dash='dash')
        ))
        
        # Forecast
        forecast_dates = pd.date_range(
            start=ts.index[-1] + pd.DateOffset(1),
            periods=periods,
            freq='M'
        )
        
        fig.add_trace(go.Scatter(
            x=forecast_dates,
            y=forecast.values,
            mode='lines+markers',
            name='Pronóstico',
            line=dict(color='green')
        ))
        
        fig.update_layout(
            title=f'Pronóstico Holt-Winters - Modelo {model_type.capitalize()}',
            xaxis_title='Fecha',
            yaxis_title='Valor',
            hovermode='x unified'
        )
        
        graphJSON = json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
        
        # Calculate metrics
        mse = np.mean((ts - fitted_values) ** 2)
        mae = np.mean(np.abs(ts - fitted_values))
        
        return jsonify({
            'success': True,
            'plot': graphJSON,
            'forecast_values': forecast.tolist(),
            'forecast_dates': forecast_dates.strftime('%Y-%m-%d').tolist(),
            'metrics': {
                'mse': float(mse),
                'mae': float(mae),
                'rmse': float(np.sqrt(mse))
            },
            'model_params': {
                'alpha': fitted_model.params['smoothing_level'],
                'beta': fitted_model.params.get('smoothing_trend', None),
                'gamma': fitted_model.params.get('smoothing_seasonal', None)
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Error en el pronóstico: {str(e)}'}), 500

def allowed_file(filename):
    """Check if file extension is allowed"""
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'txt'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def safe_load_file(filename):
    """Safely load a file with security checks"""
    if not filename:
        return None, "Nombre de archivo requerido"
    
    # Sanitize filename
    secure_name = secure_filename(os.path.basename(filename))
    
    # Check if allowed extension
    if not allowed_file(secure_name):
        return None, "Formato de archivo no soportado. Formatos permitidos: CSV, Excel (.xlsx, .xls), TXT"
    
    # Build secure filepath
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], secure_name)
    
    # Verify path containment (prevent path traversal)
    upload_realpath = os.path.realpath(app.config['UPLOAD_FOLDER'])
    file_realpath = os.path.realpath(filepath)
    
    if not file_realpath.startswith(upload_realpath):
        return None, "Ruta de archivo no válida"
    
    # Check if file exists
    if not os.path.exists(filepath):
        return None, "Archivo no encontrado"
    
    # Load the file
    try:
        if secure_name.endswith('.csv'):
            df = pd.read_csv(filepath)
        elif secure_name.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(filepath)
        elif secure_name.endswith('.txt'):
            # Try different separators for MS-DOS .txt files
            try:
                df = pd.read_csv(filepath, sep='\t', encoding='latin-1')
            except:
                try:
                    df = pd.read_csv(filepath, sep=',', encoding='latin-1')
                except:
                    df = pd.read_csv(filepath, sep=';', encoding='latin-1')
        else:
            return None, "Formato de archivo no soportado"
        
        return df, None
        
    except Exception as e:
        return None, f"Error al cargar el archivo: {str(e)}"

def parse_spanish_dates(date_series):
    """
    Parse Spanish date formats robustly.
    Handles formats like '6-Ene', '13-Feb-2023', '6-Ene 2023', '1/Ene/2022 00:00:00', etc.
    Tries to detect year from context or sequence, handles timestamps correctly.
    """
    # Comprehensive Spanish month mapping (all common variants)
    spanish_months = {
        # Standard 3-letter abbreviations (title case)
        'Ene': '01', 'Feb': '02', 'Mar': '03', 'Abr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Ago': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dic': '12',
        # Lowercase variants
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
        # Uppercase variants
        'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04',
        'MAY': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
        'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12',
        # 4-letter variants
        'Sept': '09', 'sept': '09', 'SEPT': '09',
        'Abril': '04', 'abril': '04', 'ABRIL': '04'
    }
    
    def detect_base_year(series):
        """Try to detect the base year from the data context or use intelligent default"""
        current_year = datetime.now().year
        
        # Check if any entries already have year information
        for date_str in series.dropna():
            if isinstance(date_str, str):
                # Look for 4-digit years in the string
                year_match = re.search(r'\b(19|20)\d{2}\b', str(date_str))
                if year_match:
                    return int(year_match.group())
        
        # If no year found, use a reasonable default based on current year
        # For historical data analysis, assume recent years
        return current_year - 1  # Default to last year for time series data
    
    base_year = detect_base_year(date_series)
    
    def convert_date(date_str):
        try:
            if not isinstance(date_str, str):
                return date_str
            
            # Clean the string
            date_str = str(date_str).strip()
            
            # Remove only trailing timestamp (time patterns at the end)
            # Look for time patterns like "00:00:00", "12:34:56", "23:59" at the end
            time_pattern = r'\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?$'
            date_part = re.sub(time_pattern, '', date_str, flags=re.IGNORECASE)
            
            # Use comprehensive regex to extract date components
            # Pattern: day + any separator + spanish_month + any separator + optional year
            # This handles: "6-Ene", "6 ene 2023", "6/Sept/2023", "6.abril.2023", etc.
            pattern = r'(\d{1,2})[\s\-\/\.]+([A-Za-z]{3,5})(?:[\s\-\/\.]+(\d{2,4}))?'
            match = re.match(pattern, date_part)
            
            if match:
                day, month_abbr, year_part = match.groups()
                
                # Check if month is Spanish abbreviation
                if month_abbr in spanish_months:
                    # Determine year
                    if year_part:
                        # Sanitize year part (keep only digits)
                        year_clean = re.sub(r'[^\d]', '', year_part.strip())
                        if year_clean:
                            # Handle 2-digit years
                            if len(year_clean) == 2:
                                year_num = int(year_clean)
                                year = f"20{year_clean}" if year_num <= 50 else f"19{year_clean}"
                            else:
                                year = year_clean[:4]  # Take only first 4 digits
                        else:
                            year = str(base_year)
                    else:
                        # Use detected base year
                        year = str(base_year)
                    
                    return f"{year}-{spanish_months[month_abbr]}-{day.zfill(2)}"
            
            # If no Spanish date pattern found, return as-is
            return date_str
            
        except Exception as e:
            # If any error occurs, return original string
            return date_str
    
    return date_series.apply(convert_date)

def get_model_explanation(is_additive):
    """Get explanation for model type selection"""
    if is_additive:
        return ("Modelo Aditivo: Los componentes estacionales permanecen constantes a lo largo del tiempo. "
                "La serie se puede expresar como: Serie = Tendencia + Estacionalidad + Error")
    else:
        return ("Modelo Multiplicativo: Los componentes estacionales cambian proporcionalmente con la tendencia. "
                "La serie se puede expresar como: Serie = Tendencia × Estacionalidad × Error")

@app.route('/comparative_analysis', methods=['POST'])
def comparative_analysis():
    """Execute comparative analysis of exponential smoothing methods"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        date_column = data.get('date_column')
        value_column = data.get('value_column')
        
        if not all([filename, date_column, value_column]):
            return jsonify({'error': 'Faltan parámetros requeridos'}), 400
        
        # Load and process data safely
        df, error = safe_load_file(filename)
        if error:
            return jsonify({'error': error}), 400
        
        df[date_column] = parse_spanish_dates(df[date_column])
        df[date_column] = pd.to_datetime(df[date_column])
        df = df.sort_values(date_column)
        df.set_index(date_column, inplace=True)
        ts = df[value_column].dropna()
        
        if len(ts) < 12:
            return jsonify({'error': 'Se necesitan al menos 12 puntos de datos para el análisis comparativo'}), 400
        
        # Execute all three methods
        exponential_results = execute_exponential_smoothing(ts)
        holt_results = execute_holt_method(ts)
        winter_results = execute_winter_method(ts)
        
        # Create comparison plot
        comparison_plot = create_comparison_plot(ts, exponential_results, holt_results, winter_results)
        
        return jsonify({
            'success': True,
            'exponential': exponential_results,
            'holt': holt_results,
            'winter': winter_results,
            'comparison_plot': comparison_plot
        })
        
    except Exception as e:
        return jsonify({'error': f'Error en el análisis comparativo: {str(e)}'}), 500

def execute_exponential_smoothing(ts):
    """Execute simple exponential smoothing"""
    from statsmodels.tsa.holtwinters import SimpleExpSmoothing
    
    try:
        # Fit simple exponential smoothing
        model = SimpleExpSmoothing(ts)
        fitted_model = model.fit()
        
        # Get fitted values and parameters
        fitted_values = fitted_model.fittedvalues
        alpha = fitted_model.params['smoothing_level']
        
        # Calculate step-by-step smoothing
        calculations = []
        smoothed_values = []
        
        # Initial value (first observation)
        s_t = ts.iloc[0]
        smoothed_values.append(s_t)
        
        for i in range(1, len(ts)):
            actual = ts.iloc[i]
            error = actual - s_t
            error_squared = error ** 2
            
            calculations.append({
                'actual': float(actual),
                'smoothed': float(s_t),
                'error': float(error),
                'error_squared': float(error_squared)
            })
            
            # Update smoothed value
            s_t = alpha * actual + (1 - alpha) * s_t
            smoothed_values.append(s_t)
        
        # Calculate metrics
        fitted_array = np.array(smoothed_values[1:])  # Skip first value
        actual_array = ts.iloc[1:].values  # Skip first value
        
        mae = np.mean(np.abs(actual_array - fitted_array))
        mse = np.mean((actual_array - fitted_array) ** 2)
        rmse = np.sqrt(mse)
        mape = np.mean(np.abs((actual_array - fitted_array) / actual_array)) * 100
        
        # Create plot
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=ts.index, y=ts.values, mode='lines', name='Serie Original', line=dict(color='blue')))
        fig.add_trace(go.Scatter(x=ts.index[1:], y=fitted_array, mode='lines', name='Suavizado Exponencial', line=dict(color='red', dash='dash')))
        
        fig.update_layout(
            title='Suavizado Exponencial Simple',
            xaxis_title='Fecha',
            yaxis_title='Valor',
            template='plotly_white'
        )
        
        plot_json = json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
        
        return {
            'alpha': float(alpha),
            'calculations': calculations,
            'metrics': {
                'mae': float(mae),
                'mse': float(mse), 
                'rmse': float(rmse),
                'mape': float(mape)
            },
            'plot': plot_json
        }
        
    except Exception as e:
        raise Exception(f"Error en suavizado exponencial: {str(e)}")

def execute_holt_method(ts):
    """Execute Holt's double exponential smoothing"""
    try:
        # Fit Holt's method
        model = ExponentialSmoothing(ts, trend='add', seasonal=None)
        fitted_model = model.fit()
        
        # Get parameters
        alpha = fitted_model.params['smoothing_level']
        beta = fitted_model.params['smoothing_trend']
        
        # Calculate step-by-step
        calculations = []
        levels = []
        trends = []
        forecasts = []
        
        # Initial values
        l_0 = ts.iloc[0]
        b_0 = (ts.iloc[1] - ts.iloc[0])  # Initial trend
        levels.append(l_0)
        trends.append(b_0)
        
        for i in range(1, len(ts)):
            actual = ts.iloc[i]
            
            # Previous level and trend
            l_prev = levels[-1]
            b_prev = trends[-1]
            
            # Forecast
            forecast = l_prev + b_prev
            forecasts.append(forecast)
            error = actual - forecast
            
            # Update level and trend
            l_t = alpha * actual + (1 - alpha) * (l_prev + b_prev)
            b_t = beta * (l_t - l_prev) + (1 - beta) * b_prev
            
            levels.append(l_t)
            trends.append(b_t)
            
            calculations.append({
                'actual': float(actual),
                'level': float(l_t),
                'trend': float(b_t), 
                'forecast': float(forecast),
                'error': float(error)
            })
        
        # Calculate metrics
        actual_array = ts.iloc[1:].values
        forecast_array = np.array(forecasts)
        
        mae = np.mean(np.abs(actual_array - forecast_array))
        mse = np.mean((actual_array - forecast_array) ** 2)
        rmse = np.sqrt(mse)
        mape = np.mean(np.abs((actual_array - forecast_array) / actual_array)) * 100
        
        # Create plot
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=ts.index, y=ts.values, mode='lines', name='Serie Original', line=dict(color='blue')))
        fig.add_trace(go.Scatter(x=ts.index[1:], y=forecast_array, mode='lines', name='Método de Holt', line=dict(color='orange', dash='dash')))
        
        fig.update_layout(
            title='Método de Holt (Suavizado Exponencial Doble)',
            xaxis_title='Fecha',
            yaxis_title='Valor',
            template='plotly_white'
        )
        
        plot_json = json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
        
        return {
            'alpha': float(alpha),
            'beta': float(beta),
            'calculations': calculations,
            'metrics': {
                'mae': float(mae),
                'mse': float(mse),
                'rmse': float(rmse),
                'mape': float(mape)
            },
            'plot': plot_json
        }
        
    except Exception as e:
        raise Exception(f"Error en método de Holt: {str(e)}")

def execute_winter_method(ts):
    """Execute Winter's triple exponential smoothing"""
    try:
        # Determine seasonality period (try 12 months, 4 quarters, or auto-detect)
        seasonal_period = min(12, len(ts) // 3)
        if seasonal_period < 4:
            seasonal_period = 4
        
        # Fit Winter's method
        model = ExponentialSmoothing(ts, trend='add', seasonal='mul', seasonal_periods=seasonal_period)
        fitted_model = model.fit()
        
        # Get parameters
        alpha = fitted_model.params['smoothing_level'] 
        beta = fitted_model.params['smoothing_trend']
        gamma = fitted_model.params['smoothing_seasonal']
        
        # Get fitted values for calculations display
        fitted_values = fitted_model.fittedvalues
        
        # Calculate step-by-step (simplified for display)
        calculations = []
        for i in range(seasonal_period, len(ts)):
            actual = ts.iloc[i]
            fitted = fitted_values.iloc[i] if i < len(fitted_values) else actual
            error = actual - fitted
            
            calculations.append({
                'actual': float(actual),
                'level': float(fitted * 0.9),  # Simplified level approximation
                'trend': float((fitted - fitted_values.iloc[i-1]) if i > 0 else 0),
                'seasonal': float(actual / fitted if fitted != 0 else 1),
                'forecast': float(fitted),
                'error': float(error)
            })
        
        # Calculate metrics
        actual_array = ts.iloc[seasonal_period:].values
        fitted_array = fitted_values.iloc[seasonal_period:].values
        
        mae = np.mean(np.abs(actual_array - fitted_array))
        mse = np.mean((actual_array - fitted_array) ** 2)
        rmse = np.sqrt(mse)
        mape = np.mean(np.abs((actual_array - fitted_array) / actual_array)) * 100
        
        # Create plot
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=ts.index, y=ts.values, mode='lines', name='Serie Original', line=dict(color='blue')))
        fig.add_trace(go.Scatter(x=ts.index[seasonal_period:], y=fitted_array, mode='lines', name='Método de Winter', line=dict(color='green', dash='dash')))
        
        fig.update_layout(
            title='Método de Winter (Suavizado Exponencial Triple)',
            xaxis_title='Fecha', 
            yaxis_title='Valor',
            template='plotly_white'
        )
        
        plot_json = json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
        
        return {
            'alpha': float(alpha),
            'beta': float(beta), 
            'gamma': float(gamma),
            'calculations': calculations,
            'metrics': {
                'mae': float(mae),
                'mse': float(mse),
                'rmse': float(rmse),
                'mape': float(mape)
            },
            'plot': plot_json
        }
        
    except Exception as e:
        raise Exception(f"Error en método de Winter: {str(e)}")

def create_comparison_plot(ts, exp_results, holt_results, winter_results):
    """Create comparison plot for all three methods"""
    try:
        fig = go.Figure()
        
        # Original series
        fig.add_trace(go.Scatter(
            x=ts.index, y=ts.values,
            mode='lines', name='Serie Original',
            line=dict(color='blue', width=3)
        ))
        
        # Extract fitted values from each method (simplified)
        # For exponential smoothing
        exp_fitted = [ts.iloc[0]] + [calc['smoothed'] for calc in exp_results['calculations']]
        fig.add_trace(go.Scatter(
            x=ts.index[:len(exp_fitted)], y=exp_fitted,
            mode='lines', name='Suavizado Exponencial Simple',
            line=dict(color='red', dash='dash', width=2)
        ))
        
        # For Holt method  
        holt_fitted = [ts.iloc[0]] + [calc['forecast'] for calc in holt_results['calculations']]
        fig.add_trace(go.Scatter(
            x=ts.index[:len(holt_fitted)], y=holt_fitted,
            mode='lines', name='Método de Holt',
            line=dict(color='orange', dash='dot', width=2)
        ))
        
        # For Winter method
        winter_fitted = [calc['forecast'] for calc in winter_results['calculations']]
        seasonal_period = min(12, len(ts) // 3) if len(ts) // 3 >= 4 else 4
        fig.add_trace(go.Scatter(
            x=ts.index[seasonal_period:seasonal_period+len(winter_fitted)], y=winter_fitted,
            mode='lines', name='Método de Winter',
            line=dict(color='green', dash='dashdot', width=2)
        ))
        
        fig.update_layout(
            title='Comparación de Métodos de Descomposición',
            xaxis_title='Fecha',
            yaxis_title='Valor',
            hovermode='x unified',
            template='plotly_white',
            legend=dict(x=0, y=1, bgcolor='rgba(255,255,255,0.8)')
        )
        
        return json.dumps(fig, cls=plotly.utils.PlotlyJSONEncoder)
        
    except Exception as e:
        raise Exception(f"Error creando gráfico de comparación: {str(e)}")

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return {'status': 'healthy', 'service': 'time-series-dashboard'}

if __name__ == '__main__':
    # Development server configuration (use gunicorn for production)
    import os
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)