// Visualization page JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeVisualization();
});

let currentData = {
    filename: null,
    columns: []
};

function initializeVisualization() {
    setupEventListeners();
    console.log('Visualization page initialized');
}

function setupEventListeners() {
    // File upload form
    document.getElementById('uploadForm').addEventListener('submit', handleFileUpload);
    
    // Plot buttons
    document.getElementById('plotBtn').addEventListener('click', generateBasicPlot);
    document.getElementById('lagPlotsBtn').addEventListener('click', generateLagPlots);
    
    // Column selection changes
    document.getElementById('dateColumn').addEventListener('change', updatePlotButton);
    document.getElementById('valueColumn').addEventListener('change', updatePlotButton);
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

function updatePlotButton() {
    const dateColumn = document.getElementById('dateColumn').value;
    const valueColumn = document.getElementById('valueColumn').value;
    
    const plotBtn = document.getElementById('plotBtn');
    if (dateColumn && valueColumn) {
        plotBtn.disabled = false;
        plotBtn.classList.remove('btn-secondary');
        plotBtn.classList.add('btn-success');
    } else {
        plotBtn.disabled = true;
        plotBtn.classList.remove('btn-success');
        plotBtn.classList.add('btn-secondary');
    }
}

async function generateBasicPlot() {
    const dateColumn = document.getElementById('dateColumn').value;
    const valueColumn = document.getElementById('valueColumn').value;
    const plotType = document.getElementById('plotType').value;
    
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
        const response = await fetch('/plot_series', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: currentData.filename,
                date_column: dateColumn,
                value_column: valueColumn,
                plot_type: plotType
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showBasicPlotResults(result);
            showBasicPlotStep();
            showLagPlotsStep();
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error al generar gráfico: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

function showBasicPlotResults(result) {
    const infoDiv = document.getElementById('basicPlotInfo');
    const plotDiv = document.getElementById('basicPlot');
    
    // Show info
    infoDiv.innerHTML = `
        <div class="alert alert-info">
            <div class="row">
                <div class="col-md-4">
                    <strong>Puntos de datos:</strong> ${formatNumber(result.data_points)}
                </div>
                <div class="col-md-4">
                    <strong>Fecha inicial:</strong> ${result.date_range.start}
                </div>
                <div class="col-md-4">
                    <strong>Fecha final:</strong> ${result.date_range.end}
                </div>
            </div>
        </div>
    `;
    
    // Show plot
    Plotly.newPlot('basicPlot', JSON.parse(result.plot).data, JSON.parse(result.plot).layout);
}

function showBasicPlotStep() {
    document.getElementById('basicPlotStep').style.display = 'block';
    document.getElementById('basicPlotStep').scrollIntoView({ behavior: 'smooth' });
}

function showLagPlotsStep() {
    document.getElementById('lagPlotsStep').style.display = 'block';
}

async function generateLagPlots() {
    const dateColumn = document.getElementById('dateColumn').value;
    const valueColumn = document.getElementById('valueColumn').value;
    const maxLags = parseInt(document.getElementById('maxLags').value);
    
    if (!currentData.filename) {
        showAlert('Primero debes cargar datos y generar el gráfico básico', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/plot_lag_series', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: currentData.filename,
                date_column: dateColumn,
                value_column: valueColumn,
                max_lags: maxLags
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showLagPlotsResults(result);
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error en gráficos retardados: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

function showLagPlotsResults(result) {
    const resultsDiv = document.getElementById('lagPlotsResults');
    const lagPlotsDiv = document.getElementById('lagPlots');
    const autocorrDiv = document.getElementById('autocorrPlot');
    
    // Show info
    resultsDiv.innerHTML = `
        <div class="alert alert-success">
            <h6><i class="fas fa-check-circle me-2"></i>Gráficos Retardados Generados</h6>
            <p><strong>Lags analizados:</strong> ${result.n_lags}</p>
            <p class="mb-0"><strong>Interpretación:</strong> Los gráficos retardados muestran la relación entre los valores actuales y los valores pasados de la serie. Patrones claros indican correlación serial.</p>
        </div>
    `;
    
    // Show lag plots
    Plotly.newPlot('lagPlots', JSON.parse(result.lag_plot).data, JSON.parse(result.lag_plot).layout);
    
    // Show autocorrelation plot
    Plotly.newPlot('autocorrPlot', JSON.parse(result.autocorr_plot).data, JSON.parse(result.autocorr_plot).layout);
    
    // Scroll to results
    document.getElementById('lagPlotsStep').scrollIntoView({ behavior: 'smooth' });
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
    return num.toLocaleString('es-ES');
}