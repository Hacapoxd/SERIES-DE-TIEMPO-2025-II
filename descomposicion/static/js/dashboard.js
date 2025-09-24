// Dashboard JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard functionality
    initializeDashboard();
});

function initializeDashboard() {
    // Handle navigation clicks
    setupNavigation();
    
    // Add smooth scrolling
    setupSmoothScrolling();
    
    // Initialize tooltips if needed
    initializeTooltips();
    
    console.log('Dashboard initialized successfully');
}

function setupNavigation() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            
            // Remove active class from all links
            document.querySelectorAll('.nav-link').forEach(nav => {
                nav.classList.remove('active');
            });
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Handle section navigation (placeholder for future functionality)
            console.log(`Navigating to section: ${section}`);
            
            // Show notification for now
            if (section !== 'decomposition') {
                showNotification(`Funcionalidad "${section}" será implementada próximamente`, 'info');
            }
        });
    });
}

function setupSmoothScrolling() {
    // Add smooth scrolling to anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function initializeTooltips() {
    // Initialize Bootstrap tooltips if any exist
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 100px; right: 20px; z-index: 1050; min-width: 300px;';
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Utility functions for future features
function formatNumber(num) {
    return num.toLocaleString('es-ES');
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('es-ES');
}

// Export functions for global access
window.dashboardUtils = {
    showNotification,
    formatNumber,
    formatDate
};