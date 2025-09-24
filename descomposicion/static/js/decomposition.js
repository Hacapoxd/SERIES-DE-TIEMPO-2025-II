// Decomposition page JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeDecomposition();
});

let currentData = {
    filename: null,
    columns: [],
    modelType: null,
    isAdditive: null
};

function initializeDecomposition() {
    setupEventListeners();
    console.log('Decomposition page initialized');
}

function setupEventListeners() {
    // File upload form
    document.getElementById('uploadForm').addEventListener('submit', handleFileUpload);
    
    // Analysis button
    document.getElementById('analyzeBtn').addEventListener('click', analyzeTimeSeries);
    
    // Forecast button
    document.getElementById('forecastBtn').addEventListener('click', generateForecast);
    
    // Table view button
    document.getElementById('showTableBtn').addEventListener('click', toggleDataTable);
    
    // Column selection changes
    document.getElementById('dateColumn').addEventListener('change', updateDataPreview);
    document.getElementById('valueColumn').addEventListener('change', updateDataPreview);
}

async function handleFileUpload(event) {
    event.preventDefault();
    
    const formData = new FormData();
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('Por favor selecciona un archivo', 'warning');
        return;
    }
    
    formData.append('file', file);
    
    showLoading(true);
    
    try {
        const response = await fetch('/upload_data', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentData.filename = result.filename;
            currentData.columns = result.columns;
            
            populateColumnSelectors(result.columns);
            showColumnSelection();
            showDataPreview(result.sample_data, result.rows);
            showTableButton();
            showAlert(`Archivo cargado exitosamente: ${result.rows} filas`, 'success');
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error al cargar el archivo: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

function populateColumnSelectors(columns) {
    const dateSelect = document.getElementById('dateColumn');
    const valueSelect = document.getElementById('valueColumn');
    
    // Clear existing options
    dateSelect.innerHTML = '<option value="">Seleccionar columna...</option>';
    valueSelect.innerHTML = '<option value="">Seleccionar columna...</option>';
    
    // Add column options
    columns.forEach(column => {
        const option1 = new Option(column, column);
        const option2 = new Option(column, column);
        dateSelect.add(option1);
        valueSelect.add(option2);
    });
}

function showColumnSelection() {
    document.getElementById('columnSelectionStep').style.display = 'block';
    document.getElementById('columnSelectionStep').scrollIntoView({ behavior: 'smooth' });
}

function showDataPreview(sampleData = null, totalRows = 0) {
    const previewDiv = document.getElementById('dataPreview');
    
    if (sampleData && sampleData.length > 0) {
        let html = `
            <div class="mt-3">
                <h6>Vista previa de datos (${totalRows} filas totales):</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-striped">
                        <thead>
                            <tr>
        `;
        
        // Add headers
        Object.keys(sampleData[0]).forEach(key => {
            html += `<th>${key}</th>`;
        });
        html += `</tr></thead><tbody>`;
        
        // Add sample rows
        sampleData.slice(0, 5).forEach(row => {
            html += '<tr>';
            Object.values(row).forEach(value => {
                html += `<td>${value}</td>`;
            });
            html += '</tr>';
        });
        
        html += `</tbody></table></div></div>`;
        previewDiv.innerHTML = html;
    }
}

function updateDataPreview() {
    const dateColumn = document.getElementById('dateColumn').value;
    const valueColumn = document.getElementById('valueColumn').value;
    
    if (dateColumn && valueColumn) {
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.disabled = false;
        analyzeBtn.classList.remove('btn-secondary');
        analyzeBtn.classList.add('btn-success');
    }
}

async function analyzeTimeSeries() {
    const dateColumn = document.getElementById('dateColumn').value;
    const valueColumn = document.getElementById('valueColumn').value;
    
    if (!dateColumn || !valueColumn) {
        showAlert('Selecciona las columnas de fecha y valor', 'warning');
        return;
    }
    
    if (!currentData.filename) {
        showAlert('Primero debes cargar un archivo', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/analyze_series', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: currentData.filename,
                date_column: dateColumn,
                value_column: valueColumn
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentData.modelType = result.model_type;
            currentData.isAdditive = result.is_additive;
            
            showAnalysisResults(result);
            showAnalysisStep();
            showForecastStep();
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error en el análisis: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

function showAnalysisResults(result) {
    const resultsDiv = document.getElementById('analysisResults');
    const plotDiv = document.getElementById('decompositionPlot');
    
    // Show results
    const alertClass = result.is_additive ? 'alert-info' : 'alert-warning';
    const icon = result.is_additive ? 'fas fa-plus' : 'fas fa-times';
    const modelTypeDisplay = result.model_type === 'additive' ? 'ADITIVO' : 'MULTIPLICATIVO';
    
    resultsDiv.innerHTML = `
        <div class="alert ${alertClass}">
            <h6><i class="${icon} me-2"></i>Resultado del Análisis</h6>
            <p><strong>Tipo de Modelo Detectado:</strong> ${modelTypeDisplay}</p>
            <p><strong>Explicación:</strong> ${result.explanation}</p>
            <div class="row mt-3">
                <div class="col-md-6">
                    <small><strong>Varianza Residual Aditivo:</strong> ${result.residual_variance.additive.toFixed(6)}</small>
                </div>
                <div class="col-md-6">
                    <small><strong>Varianza Residual Multiplicativo:</strong> ${result.residual_variance.multiplicative.toFixed(6)}</small>
                </div>
            </div>
        </div>
    `;
    
    // Show plot
    Plotly.newPlot('decompositionPlot', JSON.parse(result.plot).data, JSON.parse(result.plot).layout);
}

function showAnalysisStep() {
    document.getElementById('analysisStep').style.display = 'block';
    document.getElementById('analysisStep').scrollIntoView({ behavior: 'smooth' });
}

function showForecastStep() {
    document.getElementById('forecastStep').style.display = 'block';
}

async function generateForecast() {
    const dateColumn = document.getElementById('dateColumn').value;
    const valueColumn = document.getElementById('valueColumn').value;
    const periods = parseInt(document.getElementById('forecastPeriods').value);
    
    if (!currentData.filename || !currentData.modelType) {
        showAlert('Primero completa el análisis de la serie', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/holt_winters_forecast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: currentData.filename,
                date_column: dateColumn,
                value_column: valueColumn,
                model_type: currentData.modelType,
                periods: periods
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showForecastResults(result);
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error en el pronóstico: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

function showForecastResults(result) {
    const resultsDiv = document.getElementById('forecastResults');
    const plotDiv = document.getElementById('forecastPlot');
    
    // Show metrics
    resultsDiv.innerHTML = `
        <div class="alert alert-success">
            <h6><i class="fas fa-check-circle me-2"></i>Pronóstico Generado Exitosamente</h6>
            <div class="row">
                <div class="col-md-4">
                    <strong>MSE:</strong> ${result.metrics.mse.toFixed(4)}
                </div>
                <div class="col-md-4">
                    <strong>MAE:</strong> ${result.metrics.mae.toFixed(4)}
                </div>
                <div class="col-md-4">
                    <strong>RMSE:</strong> ${result.metrics.rmse.toFixed(4)}
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-md-4">
                    <strong>Alpha (α):</strong> ${result.model_params.alpha.toFixed(4)}
                </div>
                <div class="col-md-4">
                    <strong>Beta (β):</strong> ${result.model_params.beta ? result.model_params.beta.toFixed(4) : 'N/A'}
                </div>
                <div class="col-md-4">
                    <strong>Gamma (γ):</strong> ${result.model_params.gamma ? result.model_params.gamma.toFixed(4) : 'N/A'}
                </div>
            </div>
        </div>
        
        <div class="mt-3">
            <h6>Valores Pronosticados:</h6>
            <div class="table-responsive">
                <table class="table table-sm table-striped">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Valor Pronosticado</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    // Add forecast values to table
    result.forecast_dates.forEach((date, index) => {
        resultsDiv.innerHTML += `
            <tr>
                <td>${date}</td>
                <td>${result.forecast_values[index].toFixed(2)}</td>
            </tr>
        `;
    });
    
    resultsDiv.innerHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Show forecast plot
    Plotly.newPlot('forecastPlot', JSON.parse(result.plot).data, JSON.parse(result.plot).layout);
    
    // Scroll to results
    document.getElementById('forecastStep').scrollIntoView({ behavior: 'smooth' });
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = show ? 'block' : 'none';
}

function showAlert(message, type) {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = statusDiv.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

function showTableButton() {
    document.getElementById('showTableBtn').style.display = 'inline-block';
}

async function toggleDataTable() {
    const tableDiv = document.getElementById('dataTable');
    const button = document.getElementById('showTableBtn');
    
    if (tableDiv.style.display === 'none') {
        // Show table
        if (tableDiv.innerHTML === '') {
            // Load table data
            await loadDataTable();
        }
        tableDiv.style.display = 'block';
        button.innerHTML = '<i class="fas fa-eye-slash me-2"></i>Ocultar Tabla';
        tableDiv.scrollIntoView({ behavior: 'smooth' });
    } else {
        // Hide table
        tableDiv.style.display = 'none';
        button.innerHTML = '<i class="fas fa-table me-2"></i>Ver Tabla Completa';
    }
}

async function loadDataTable() {
    if (!currentData.filename) {
        showAlert('No hay datos cargados', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/get_data_table', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: currentData.filename
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayDataTable(result);
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error al cargar tabla: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

function displayDataTable(result) {
    const tableDiv = document.getElementById('dataTable');
    
    let html = `
        <div class="card">
            <div class="card-header">
                <h6 class="mb-0">
                    <i class="fas fa-table me-2"></i>
                    Vista de Tabla de Datos (Mostrando primeras 100 filas de ${formatNumber(result.total_rows)})
                </h6>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive" style="max-height: 400px;">
                    <table class="table table-striped table-sm mb-0">
                        <thead class="table-dark sticky-top">
                            <tr>
    `;
    
    // Add headers
    result.columns.forEach(column => {
        html += `<th>${column}</th>`;
    });
    html += `</tr></thead><tbody>`;
    
    // Add data rows
    result.data.forEach(row => {
        html += '<tr>';
        result.columns.forEach(column => {
            const value = row[column];
            html += `<td>${value !== null && value !== undefined ? value : ''}</td>`;
        });
        html += '</tr>';
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
        <div class="mt-2 text-muted small">
            <div class="row">
                <div class="col-md-6">
                    <strong>Columnas:</strong> ${result.columns.length}
                </div>
                <div class="col-md-6">
                    <strong>Filas totales:</strong> ${formatNumber(result.total_rows)}
                </div>
            </div>
        </div>
    `;
    
    tableDiv.innerHTML = html;
}

// Utility functions
function formatNumber(num) {
    return num.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES');
}