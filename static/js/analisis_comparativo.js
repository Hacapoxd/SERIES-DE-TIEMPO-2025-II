// Análisis Comparativo de Métodos de Descomposición - JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeComparativeAnalysis();
});

let currentData = {
    filename: null,
    columns: [],
    results: null
};

function initializeComparativeAnalysis() {
    setupEventListeners();
    console.log('Comparative analysis page initialized');
}

function setupEventListeners() {
    // File upload form
    document.getElementById('uploadForm').addEventListener('submit', handleFileUpload);
    
    // Analysis button
    document.getElementById('analyzeBtn').addEventListener('click', executeComparativeAnalysis);
    
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

async function executeComparativeAnalysis() {
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
        const response = await fetch('/comparative_analysis', {
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
            currentData.results = result;
            showAnalysisResults(result);
            showAnalysisStep();
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error en el análisis: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

function showAnalysisResults(results) {
    // Show exponential smoothing results
    displayExponentialResults(results.exponential);
    
    // Show Holt method results  
    displayHoltResults(results.holt);
    
    // Show Winter method results
    displayWinterResults(results.winter);
    
    // Show comparison results
    displayComparisonResults(results);
}

function displayExponentialResults(exponentialData) {
    const resultsDiv = document.getElementById('exponencialResults');
    
    let html = `
        <div class="row">
            <div class="col-12">
                <div class="alert alert-info">
                    <h6><i class="fas fa-info-circle me-2"></i>Suavizado Exponencial Simple</h6>
                    <p>El suavizado exponencial simple es adecuado para series de tiempo que no presentan tendencia o estacionalidad clara. 
                    Asigna pesos decrecientes exponencialmente a las observaciones pasadas.</p>
                    <p><strong>Fórmula:</strong> S<sub>t</sub> = α × X<sub>t</sub> + (1-α) × S<sub>t-1</sub></p>
                    <p><strong>Donde:</strong> α = ${exponentialData.alpha.toFixed(4)} (parámetro de suavizado)</p>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6><i class="fas fa-table me-2"></i>Cálculos Detallados</h6>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive" style="max-height: 400px;">
                            <table class="table table-sm table-striped mb-0">
                                <thead class="table-dark sticky-top">
                                    <tr>
                                        <th>Período</th>
                                        <th>Valor Real</th>
                                        <th>Valor Suavizado</th>
                                        <th>Error</th>
                                        <th>Error²</th>
                                    </tr>
                                </thead>
                                <tbody>
    `;
    
    exponentialData.calculations.forEach((calc, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${calc.actual.toFixed(2)}</td>
                <td>${calc.smoothed.toFixed(2)}</td>
                <td>${calc.error.toFixed(2)}</td>
                <td>${calc.error_squared.toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6><i class="fas fa-chart-bar me-2"></i>Métricas de Rendimiento</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <div class="metric-card">
                                    <div class="metric-value">${exponentialData.metrics.mae.toFixed(4)}</div>
                                    <div class="metric-label">MAE</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="metric-card">
                                    <div class="metric-value">${exponentialData.metrics.mse.toFixed(4)}</div>
                                    <div class="metric-label">MSE</div>
                                </div>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-6">
                                <div class="metric-card">
                                    <div class="metric-value">${exponentialData.metrics.rmse.toFixed(4)}</div>
                                    <div class="metric-label">RMSE</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="metric-card">
                                    <div class="metric-value">${exponentialData.metrics.mape.toFixed(2)}%</div>
                                    <div class="metric-label">MAPE</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Plot -->
                <div class="card mt-3">
                    <div class="card-header">
                        <h6><i class="fas fa-chart-line me-2"></i>Visualización</h6>
                    </div>
                    <div class="card-body p-0">
                        <div id="exponentialPlot"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
    
    // Render plot
    if (exponentialData.plot) {
        Plotly.newPlot('exponentialPlot', JSON.parse(exponentialData.plot).data, JSON.parse(exponentialData.plot).layout);
    }
}

function displayHoltResults(holtData) {
    const resultsDiv = document.getElementById('holtResults');
    
    let html = `
        <div class="row">
            <div class="col-12">
                <div class="alert alert-warning">
                    <h6><i class="fas fa-trending-up me-2"></i>Método de Holt (Suavizado Exponencial Doble)</h6>
                    <p>El método de Holt es adecuado para series de tiempo con tendencia pero sin estacionalidad. 
                    Utiliza dos ecuaciones de suavizado: una para el nivel y otra para la tendencia.</p>
                    <p><strong>Fórmulas:</strong></p>
                    <p>Nivel: L<sub>t</sub> = α × X<sub>t</sub> + (1-α) × (L<sub>t-1</sub> + b<sub>t-1</sub>)</p>
                    <p>Tendencia: b<sub>t</sub> = β × (L<sub>t</sub> - L<sub>t-1</sub>) + (1-β) × b<sub>t-1</sub></p>
                    <p><strong>Parámetros:</strong> α = ${holtData.alpha.toFixed(4)}, β = ${holtData.beta.toFixed(4)}</p>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6><i class="fas fa-table me-2"></i>Cálculos Detallados</h6>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive" style="max-height: 400px;">
                            <table class="table table-sm table-striped mb-0">
                                <thead class="table-dark sticky-top">
                                    <tr>
                                        <th>Período</th>
                                        <th>Valor Real</th>
                                        <th>Nivel</th>
                                        <th>Tendencia</th>
                                        <th>Pronóstico</th>
                                        <th>Error</th>
                                    </tr>
                                </thead>
                                <tbody>
    `;
    
    holtData.calculations.forEach((calc, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${calc.actual.toFixed(2)}</td>
                <td>${calc.level.toFixed(2)}</td>
                <td>${calc.trend.toFixed(2)}</td>
                <td>${calc.forecast.toFixed(2)}</td>
                <td>${calc.error.toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6><i class="fas fa-chart-bar me-2"></i>Métricas de Rendimiento</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <div class="metric-card">
                                    <div class="metric-value">${holtData.metrics.mae.toFixed(4)}</div>
                                    <div class="metric-label">MAE</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="metric-card">
                                    <div class="metric-value">${holtData.metrics.mse.toFixed(4)}</div>
                                    <div class="metric-label">MSE</div>
                                </div>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-6">
                                <div class="metric-card">
                                    <div class="metric-value">${holtData.metrics.rmse.toFixed(4)}</div>
                                    <div class="metric-label">RMSE</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="metric-card">
                                    <div class="metric-value">${holtData.metrics.mape.toFixed(2)}%</div>
                                    <div class="metric-label">MAPE</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Plot -->
                <div class="card mt-3">
                    <div class="card-header">
                        <h6><i class="fas fa-chart-line me-2"></i>Visualización</h6>
                    </div>
                    <div class="card-body p-0">
                        <div id="holtPlot"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
    
    // Render plot
    if (holtData.plot) {
        Plotly.newPlot('holtPlot', JSON.parse(holtData.plot).data, JSON.parse(holtData.plot).layout);
    }
}

function displayWinterResults(winterData) {
    const resultsDiv = document.getElementById('winterResults');
    
    let html = `
        <div class="row">
            <div class="col-12">
                <div class="alert alert-success">
                    <h6><i class="fas fa-snowflake me-2"></i>Método de Winter (Suavizado Exponencial Triple)</h6>
                    <p>El método de Winter es adecuado para series de tiempo con tendencia y estacionalidad. 
                    Utiliza tres ecuaciones de suavizado: nivel, tendencia y estacionalidad.</p>
                    <p><strong>Fórmulas:</strong></p>
                    <p>Nivel: L<sub>t</sub> = α × (X<sub>t</sub>/S<sub>t-s</sub>) + (1-α) × (L<sub>t-1</sub> + b<sub>t-1</sub>)</p>
                    <p>Tendencia: b<sub>t</sub> = β × (L<sub>t</sub> - L<sub>t-1</sub>) + (1-β) × b<sub>t-1</sub></p>
                    <p>Estacionalidad: S<sub>t</sub> = γ × (X<sub>t</sub>/L<sub>t</sub>) + (1-γ) × S<sub>t-s</sub></p>
                    <p><strong>Parámetros:</strong> α = ${winterData.alpha.toFixed(4)}, β = ${winterData.beta.toFixed(4)}, γ = ${winterData.gamma.toFixed(4)}</p>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6><i class="fas fa-table me-2"></i>Cálculos Detallados</h6>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive" style="max-height: 400px;">
                            <table class="table table-sm table-striped mb-0">
                                <thead class="table-dark sticky-top">
                                    <tr>
                                        <th>Período</th>
                                        <th>Valor Real</th>
                                        <th>Nivel</th>
                                        <th>Tendencia</th>
                                        <th>Estacional</th>
                                        <th>Pronóstico</th>
                                        <th>Error</th>
                                    </tr>
                                </thead>
                                <tbody>
    `;
    
    winterData.calculations.forEach((calc, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${calc.actual.toFixed(2)}</td>
                <td>${calc.level.toFixed(2)}</td>
                <td>${calc.trend.toFixed(2)}</td>
                <td>${calc.seasonal.toFixed(3)}</td>
                <td>${calc.forecast.toFixed(2)}</td>
                <td>${calc.error.toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6><i class="fas fa-chart-bar me-2"></i>Métricas de Rendimiento</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <div class="metric-card">
                                    <div class="metric-value">${winterData.metrics.mae.toFixed(4)}</div>
                                    <div class="metric-label">MAE</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="metric-card">
                                    <div class="metric-value">${winterData.metrics.mse.toFixed(4)}</div>
                                    <div class="metric-label">MSE</div>
                                </div>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-6">
                                <div class="metric-card">
                                    <div class="metric-value">${winterData.metrics.rmse.toFixed(4)}</div>
                                    <div class="metric-label">RMSE</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="metric-card">
                                    <div class="metric-value">${winterData.metrics.mape.toFixed(2)}%</div>
                                    <div class="metric-label">MAPE</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Plot -->
                <div class="card mt-3">
                    <div class="card-header">
                        <h6><i class="fas fa-chart-line me-2"></i>Visualización</h6>
                    </div>
                    <div class="card-body p-0">
                        <div id="winterPlot"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
    
    // Render plot
    if (winterData.plot) {
        Plotly.newPlot('winterPlot', JSON.parse(winterData.plot).data, JSON.parse(winterData.plot).layout);
    }
}

function displayComparisonResults(allResults) {
    const resultsDiv = document.getElementById('comparisonResults');
    
    let html = `
        <div class="row">
            <div class="col-12">
                <div class="alert alert-primary">
                    <h6><i class="fas fa-balance-scale me-2"></i>Comparación de Métodos</h6>
                    <p>La siguiente tabla compara el rendimiento de los tres métodos de suavizado exponencial aplicados a tu serie de tiempo.</p>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header">
                        <h6><i class="fas fa-table me-2"></i>Resumen Comparativo de Métricas</h6>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Método</th>
                                        <th>MAE</th>
                                        <th>MSE</th>
                                        <th>RMSE</th>
                                        <th>MAPE</th>
                                        <th>Parámetros</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr class="${getBestMethodClass('exponential', allResults)}">
                                        <td><strong>Suavizado Exponencial Simple</strong></td>
                                        <td>${allResults.exponential.metrics.mae.toFixed(4)}</td>
                                        <td>${allResults.exponential.metrics.mse.toFixed(4)}</td>
                                        <td>${allResults.exponential.metrics.rmse.toFixed(4)}</td>
                                        <td>${allResults.exponential.metrics.mape.toFixed(2)}%</td>
                                        <td>α = ${allResults.exponential.alpha.toFixed(4)}</td>
                                    </tr>
                                    <tr class="${getBestMethodClass('holt', allResults)}">
                                        <td><strong>Método de Holt</strong></td>
                                        <td>${allResults.holt.metrics.mae.toFixed(4)}</td>
                                        <td>${allResults.holt.metrics.mse.toFixed(4)}</td>
                                        <td>${allResults.holt.metrics.rmse.toFixed(4)}</td>
                                        <td>${allResults.holt.metrics.mape.toFixed(2)}%</td>
                                        <td>α = ${allResults.holt.alpha.toFixed(4)}, β = ${allResults.holt.beta.toFixed(4)}</td>
                                    </tr>
                                    <tr class="${getBestMethodClass('winter', allResults)}">
                                        <td><strong>Método de Winter</strong></td>
                                        <td>${allResults.winter.metrics.mae.toFixed(4)}</td>
                                        <td>${allResults.winter.metrics.mse.toFixed(4)}</td>
                                        <td>${allResults.winter.metrics.rmse.toFixed(4)}</td>
                                        <td>${allResults.winter.metrics.mape.toFixed(2)}%</td>
                                        <td>α = ${allResults.winter.alpha.toFixed(4)}, β = ${allResults.winter.beta.toFixed(4)}, γ = ${allResults.winter.gamma.toFixed(4)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">
                        <h6><i class="fas fa-trophy me-2"></i>Mejor Método</h6>
                    </div>
                    <div class="card-body">
                        <div class="text-center">
                            <div class="best-method-display">
                                <i class="fas fa-medal fa-3x text-warning mb-3"></i>
                                <h5>${getBestMethodName(allResults)}</h5>
                                <p class="text-muted">Basado en el menor RMSE</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card mt-3">
                    <div class="card-header">
                        <h6><i class="fas fa-info-circle me-2"></i>Recomendación</h6>
                    </div>
                    <div class="card-body">
                        <p><strong>Cuándo usar cada método:</strong></p>
                        <ul class="small">
                            <li><strong>Exponencial Simple:</strong> Series sin tendencia ni estacionalidad</li>
                            <li><strong>Holt:</strong> Series con tendencia pero sin estacionalidad</li>
                            <li><strong>Winter:</strong> Series con tendencia y estacionalidad</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h6><i class="fas fa-chart-line me-2"></i>Comparación Visual</h6>
                    </div>
                    <div class="card-body p-0">
                        <div id="comparisonPlot"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
    
    // Render comparison plot
    if (allResults.comparison_plot) {
        Plotly.newPlot('comparisonPlot', JSON.parse(allResults.comparison_plot).data, JSON.parse(allResults.comparison_plot).layout);
    }
}

function getBestMethodClass(method, allResults) {
    const bestMethod = getBestMethod(allResults);
    return method === bestMethod ? 'table-success' : '';
}

function getBestMethod(allResults) {
    const methods = ['exponential', 'holt', 'winter'];
    let bestMethod = methods[0];
    let bestRMSE = allResults[methods[0]].metrics.rmse;
    
    methods.forEach(method => {
        if (allResults[method].metrics.rmse < bestRMSE) {
            bestRMSE = allResults[method].metrics.rmse;
            bestMethod = method;
        }
    });
    
    return bestMethod;
}

function getBestMethodName(allResults) {
    const bestMethod = getBestMethod(allResults);
    const methodNames = {
        'exponential': 'Suavizado Exponencial Simple',
        'holt': 'Método de Holt',
        'winter': 'Método de Winter'
    };
    return methodNames[bestMethod];
}

function showAnalysisStep() {
    document.getElementById('analysisStep').style.display = 'block';
    document.getElementById('analysisStep').scrollIntoView({ behavior: 'smooth' });
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

// Utility functions
function formatNumber(num) {
    return num.toLocaleString('es-ES', { maximumFractionDigits: 4 });
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('es-ES');
}