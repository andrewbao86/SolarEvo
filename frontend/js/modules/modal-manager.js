// Modal Manager Module - Modal dialogs and animations for BESS Calculator
window.ModalManager = (function() {
    'use strict';
    
    
    // Private variables
    let isInitialized = false;
    let activeModals = new Set();
    let animationTimeouts = [];
    
    // Modal configurations
    const MODAL_CONFIG = {
        csvUpload: {
            id: 'csv-upload-modal',
            backdrop: true,
            keyboard: true,
            focus: true
        },
        shareLink: {
            id: 'share-link-modal',
            backdrop: true,
            keyboard: true,
            focus: true
        },
        confirmation: {
            id: 'confirmation-modal',
            backdrop: true,
            keyboard: true,
            focus: true
        }
    };
    
    // Private utility functions
    function createModalHtml(modalId, config) {
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.setAttribute('aria-hidden', 'true');
        
        if (config.backdrop) {
            modal.setAttribute('data-bs-backdrop', 'static');
        }
        if (config.keyboard) {
            modal.setAttribute('data-bs-keyboard', 'true');
        }
        
        return modal;
    }
    
    function ensureCsvUploadModal() {
        let modal = document.getElementById(MODAL_CONFIG.csvUpload.id);
        
        if (!modal) {
            modal = createModalHtml(MODAL_CONFIG.csvUpload.id, MODAL_CONFIG.csvUpload);
            modal.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">📊 Import Devices from CSV</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <p class="text-muted">
                                    Import device configurations from a CSV file. You can download a template to see the expected format.
                                </p>
                            </div>
                            
                            <div class="mb-3">
                                <label for="csv-file-input" class="form-label">Select CSV File</label>
                                <input type="file" id="csv-file-input" class="form-control" accept=".csv" />
                                <div class="form-text">Maximum file size: 1MB. Supported format: CSV with headers.</div>
                            </div>
                            
                            <div id="csv-validation-results" class="mb-3" style="display: none;">
                                <div class="alert" role="alert">
                                    <div id="csv-validation-message"></div>
                                    <div id="csv-validation-details" class="small mt-2"></div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <button type="button" id="download-csv-template" class="btn btn-outline-primary btn-sm">
                                    📥 Download Template
                                </button>
                                <span class="text-muted ms-2">Download a sample CSV file to see the expected format</span>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" id="import-csv-btn" class="btn btn-primary" disabled>
                                <span class="spinner-border spinner-border-sm d-none me-2" role="status"></span>
                                Import Devices
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            setupCsvUploadModalHandlers(modal);
        }
        
        return modal;
    }
    
    function setupCsvUploadModalHandlers(modal) {
        const fileInput = modal.querySelector('#csv-file-input');
        const importBtn = modal.querySelector('#import-csv-btn');
        const downloadTemplateBtn = modal.querySelector('#download-csv-template');
        const validationResults = modal.querySelector('#csv-validation-results');
        const validationMessage = modal.querySelector('#csv-validation-message');
        const validationDetails = modal.querySelector('#csv-validation-details');
        
        let selectedFile = null;
        let validationResult = null;
        
        // File selection handler
        fileInput.addEventListener('change', function(e) {
            selectedFile = e.target.files[0];
            
            if (selectedFile) {
                validateCsvFile(selectedFile);
            } else {
                clearValidation();
            }
        });
        
        // Download template handler
        downloadTemplateBtn.addEventListener('click', function() {
            CsvHandler.downloadTemplate()
                .then(() => {
                    showModalStatus('Template downloaded successfully!', 'success');
                })
                .catch(error => {
                    showModalStatus(`Template download failed: ${error.message}`, 'error');
                });
        });
        
        // Import button handler
        importBtn.addEventListener('click', function() {
            if (selectedFile && validationResult && validationResult.valid) {
                importCsvFile(selectedFile);
            }
        });
        
        // Validation functions
        function validateCsvFile(file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                CsvHandler.validateCsvContent(e.target.result)
                    .then(validation => {
                        validationResult = validation;
                        showValidationResults(validation);
                        importBtn.disabled = !validation.valid;
                    })
                    .catch(error => {
                        showValidationResults({ 
                            valid: false, 
                            errors: [error.message], 
                            warnings: [] 
                        });
                        importBtn.disabled = true;
                    });
            };
            
            reader.onerror = function() {
                showValidationResults({ 
                    valid: false, 
                    errors: ['Failed to read file'], 
                    warnings: [] 
                });
                importBtn.disabled = true;
            };
            
            reader.readAsText(file);
        }
        
        function showValidationResults(validation) {
            validationResults.style.display = 'block';
            const alert = validationResults.querySelector('.alert');
            
            if (validation.valid) {
                alert.className = 'alert alert-success';
                validationMessage.textContent = '✅ CSV file is valid and ready to import';
                
                if (validation.warnings && validation.warnings.length > 0) {
                    validationDetails.innerHTML = '<strong>Warnings:</strong><br>' + 
                        validation.warnings.map(w => `• ${w}`).join('<br>');
                } else {
                    validationDetails.innerHTML = `<strong>Ready to import ${validation.rowCount || 0} devices</strong>`;
                }
            } else {
                alert.className = 'alert alert-danger';
                validationMessage.textContent = '❌ CSV file has errors';
                
                if (validation.errors && validation.errors.length > 0) {
                    validationDetails.innerHTML = '<strong>Errors:</strong><br>' + 
                        validation.errors.map(e => `• ${e}`).join('<br>');
                }
            }
        }
        
        function clearValidation() {
            validationResults.style.display = 'none';
            importBtn.disabled = true;
            validationResult = null;
        }
        
        function importCsvFile(file) {
            const spinner = importBtn.querySelector('.spinner-border');
            const originalText = importBtn.textContent;
            
            // Show loading state
            spinner.classList.remove('d-none');
            importBtn.disabled = true;
            importBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Importing...';
            
            CsvHandler.parseFile(file)
                .then(result => {
                    // Add devices to app state
                    result.devices.forEach(device => {
                        AppState.addDevice(device);
                    });
                    
                    // Show success message
                    showModalStatus(`Successfully imported ${result.devices.length} devices!`, 'success');
                    
                    // Close modal after short delay
                    setTimeout(() => {
                        const modalInstance = bootstrap.Modal.getInstance(modal);
                        if (modalInstance) {
                            modalInstance.hide();
                        }
                    }, 1500);
                    
                    // Trigger celebration
                    showCelebration(`🎉 ${result.devices.length} devices imported!`);
                    
                })
                .catch(error => {
                    showModalStatus(`Import failed: ${error.message}`, 'error');
                })
                .finally(() => {
                    // Reset button state
                    spinner.classList.add('d-none');
                    importBtn.disabled = !validationResult?.valid;
                    importBtn.textContent = originalText;
                });
        }
        
        function showModalStatus(message, type) {
            // Simple status display in modal
            const existingStatus = modal.querySelector('.modal-status');
            if (existingStatus) {
                existingStatus.remove();
            }
            
            const statusDiv = document.createElement('div');
            statusDiv.className = `modal-status alert alert-${type === 'success' ? 'success' : 'danger'} mt-2`;
            statusDiv.textContent = message;
            
            modal.querySelector('.modal-body').appendChild(statusDiv);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (statusDiv.parentNode) {
                    statusDiv.remove();
                }
            }, 3000);
        }
        
        // Reset modal when hidden
        modal.addEventListener('hidden.bs.modal', function() {
            fileInput.value = '';
            selectedFile = null;
            clearValidation();
            
            // Remove any status messages
            const statusElements = modal.querySelectorAll('.modal-status');
            statusElements.forEach(el => el.remove());
        });
    }
    
    function showCelebration(message, duration = 3000) {
        // Create celebration overlay
        const celebration = document.createElement('div');
        celebration.className = 'celebration-overlay';
        celebration.innerHTML = `
            <div class="celebration-content">
                <div class="celebration-message">${message}</div>
                <div class="celebration-animation">
                    <div class="celebration-particle"></div>
                    <div class="celebration-particle"></div>
                    <div class="celebration-particle"></div>
                    <div class="celebration-particle"></div>
                    <div class="celebration-particle"></div>
                </div>
            </div>
        `;
        
        // Add styles if not already present
        if (!document.querySelector('#celebration-styles')) {
            const styles = document.createElement('style');
            styles.id = 'celebration-styles';
            styles.textContent = `
                .celebration-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: celebrationFadeIn 0.3s ease-out;
                }
                
                .celebration-content {
                    text-align: center;
                    color: white;
                }
                
                .celebration-message {
                    font-size: 2rem;
                    font-weight: bold;
                    margin-bottom: 1rem;
                    animation: celebrationPulse 1s ease-in-out infinite alternate;
                }
                
                .celebration-animation {
                    position: relative;
                    height: 100px;
                }
                
                .celebration-particle {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: #ffd700;
                    border-radius: 50%;
                    animation: celebrationFloat 2s infinite;
                }
                
                .celebration-particle:nth-child(1) { left: 20%; animation-delay: 0s; }
                .celebration-particle:nth-child(2) { left: 40%; animation-delay: 0.4s; }
                .celebration-particle:nth-child(3) { left: 60%; animation-delay: 0.8s; }
                .celebration-particle:nth-child(4) { left: 80%; animation-delay: 1.2s; }
                .celebration-particle:nth-child(5) { left: 50%; animation-delay: 1.6s; }
                
                @keyframes celebrationFadeIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                
                @keyframes celebrationPulse {
                    from { transform: scale(1); }
                    to { transform: scale(1.1); }
                }
                
                @keyframes celebrationFloat {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    25% { transform: translateY(-20px) rotate(90deg); }
                    50% { transform: translateY(-40px) rotate(180deg); }
                    75% { transform: translateY(-20px) rotate(270deg); }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(celebration);
        
        // Auto-remove after duration
        const timeout = setTimeout(() => {
            if (celebration.parentNode) {
                celebration.style.animation = 'celebrationFadeIn 0.3s ease-out reverse';
                setTimeout(() => {
                    if (celebration.parentNode) {
                        celebration.remove();
                    }
                }, 300);
            }
        }, duration);
        
        animationTimeouts.push(timeout);
        
        // Click to dismiss
        celebration.addEventListener('click', function() {
            clearTimeout(timeout);
            if (celebration.parentNode) {
                celebration.style.animation = 'celebrationFadeIn 0.3s ease-out reverse';
                setTimeout(() => {
                    if (celebration.parentNode) {
                        celebration.remove();
                    }
                }, 300);
            }
        });
    }
    
    // Public API
    const publicAPI = {
        // Initialize modal manager
        init: function() {
            if (isInitialized) {
                return;
            }
            
            try {
                // Ensure Bootstrap is available
                if (typeof bootstrap === 'undefined') {
                    console.warn('⚠️ Bootstrap not found, modal functionality may be limited');
                }
                
                isInitialized = true;
                
            } catch (error) {
                console.error('❌ ModalManager initialization failed:', error);
                throw error;
            }
        },
        
        // Legacy CSV upload modal (deprecated - now using direct file selector + choice modal)
        showCsvUploadModal: function() {
            console.warn('⚠️ showCsvUploadModal is deprecated. Use direct file selector instead.');
            // Kept for backward compatibility but does nothing
        },
        
        // Show confirmation dialog
        showConfirmDialog: function(title, message, onConfirm, onCancel) {
            return new Promise((resolve) => {
                try {
                    // Create confirmation modal
                    const modalId = 'confirmation-modal-' + Date.now();
                    const modal = document.createElement('div');
                    modal.id = modalId;
                    modal.className = 'modal fade';
                    modal.tabIndex = -1;
                    modal.innerHTML = `
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">${title}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <p>${message}</p>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="button" class="btn btn-danger confirm-btn">Confirm</button>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    document.body.appendChild(modal);
                    
                    const confirmBtn = modal.querySelector('.confirm-btn');
                    const cancelBtns = modal.querySelectorAll('[data-bs-dismiss="modal"]');
                    
                    // Confirm handler
                    confirmBtn.addEventListener('click', function() {
                        if (onConfirm) onConfirm();
                        hideModal();
                        resolve(true);
                    });
                    
                    // Cancel handlers
                    cancelBtns.forEach(btn => {
                        btn.addEventListener('click', function() {
                            if (onCancel) onCancel();
                            hideModal();
                            resolve(false);
                        });
                    });
                    
                    function hideModal() {
                        if (typeof bootstrap !== 'undefined') {
                            const modalInstance = bootstrap.Modal.getInstance(modal);
                            if (modalInstance) {
                                modalInstance.hide();
                            }
                        }
                        
                        setTimeout(() => {
                            if (modal.parentNode) {
                                modal.remove();
                            }
                        }, 300);
                    }
                    
                    // Show modal
                    if (typeof bootstrap !== 'undefined') {
                        const modalInstance = new bootstrap.Modal(modal);
                        modalInstance.show();
                    } else {
                        modal.style.display = 'block';
                        modal.classList.add('show');
                    }
                    
                } catch (error) {
                    console.error('❌ Error showing confirmation dialog:', error);
                    resolve(false);
                }
            });
        },
        
        // Show CSV import choice dialog
        showCsvImportChoice: function(devices) {
            return new Promise((resolve) => {
                try {
                    const modalId = 'csv-import-choice-' + Date.now();
                    const modal = document.createElement('div');
                    modal.id = modalId;
                    modal.className = 'modal fade';
                    modal.tabIndex = -1;
                    modal.innerHTML = `
                        <div class="modal-dialog modal-dialog-centered">
                            <div class="modal-content border-0 shadow-lg">
                                <div class="modal-header bg-primary text-white border-0">
                                    <h5 class="modal-title fw-bold">
                                        <i class="bi bi-download me-2"></i>Import ${devices.length} Device(s)
                                    </h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body p-4">
                                    <div class="text-center mb-4">
                                        <div class="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                                            <i class="bi bi-check-circle-fill text-success" style="font-size: 2.5rem;"></i>
                                        </div>
                                    </div>
                                    
                                    <div class="text-center mb-4">
                                        <h6 class="fw-bold text-success mb-2">Successfully Parsed!</h6>
                                        <p class="text-muted mb-0">Found <strong class="text-primary">${devices.length}</strong> valid device(s) in your CSV file.</p>
                                    </div>
                                    
                                    <div class="mb-4">
                                        <h6 class="fw-bold mb-3 text-center">How would you like to proceed?</h6>
                                        
                                        <div class="row g-3">
                                            <div class="col-6">
                                                <button type="button" class="btn btn-outline-warning btn-lg w-100 h-100 replace-btn d-flex flex-column align-items-center justify-content-center p-3">
                                                    <i class="bi bi-arrow-repeat mb-2" style="font-size: 1.5rem;"></i>
                                                    <span class="fw-bold">Replace Existing</span>
                                                    <small class="text-muted mt-1">Clear all & import new</small>
                                                </button>
                                            </div>
                                            <div class="col-6">
                                                <button type="button" class="btn btn-outline-success btn-lg w-100 h-100 add-btn d-flex flex-column align-items-center justify-content-center p-3">
                                                    <i class="bi bi-plus-circle mb-2" style="font-size: 1.5rem;"></i>
                                                    <span class="fw-bold">Add to Existing</span>
                                                    <small class="text-muted mt-1">Keep current & add new</small>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="bg-light rounded p-3">
                                        <small class="text-muted">
                                            <i class="bi bi-info-circle me-1"></i>
                                            <strong>Replace:</strong> Removes all current devices and imports the new ones<br>
                                            <strong>Add:</strong> Keeps current devices and adds the new ones to your list
                                        </small>
                                    </div>
                                </div>
                                <div class="modal-footer border-0 pt-0">
                                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">
                                        <i class="bi bi-x-circle me-1"></i>Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    document.body.appendChild(modal);
                    
                    const replaceBtn = modal.querySelector('.replace-btn');
                    const addBtn = modal.querySelector('.add-btn');
                    const cancelBtns = modal.querySelectorAll('[data-bs-dismiss="modal"]');
                    
                    // Replace handler
                    replaceBtn.addEventListener('click', function() {
                        hideModal();
                        resolve({ action: 'replace', devices: devices });
                    });
                    
                    // Add handler
                    addBtn.addEventListener('click', function() {
                        hideModal();
                        resolve({ action: 'add', devices: devices });
                    });
                    
                    // Cancel handlers
                    cancelBtns.forEach(btn => {
                        btn.addEventListener('click', function() {
                            hideModal();
                            resolve({ action: 'cancel', devices: [] });
                        });
                    });
                    
                    function hideModal() {
                        if (typeof bootstrap !== 'undefined') {
                            const modalInstance = bootstrap.Modal.getInstance(modal);
                            if (modalInstance) {
                                modalInstance.hide();
                            }
                        }
                        
                        setTimeout(() => {
                            if (modal.parentNode) {
                                modal.remove();
                            }
                        }, 300);
                    }
                    
                    // Show modal
                    if (typeof bootstrap !== 'undefined') {
                        const modalInstance = new bootstrap.Modal(modal);
                        modalInstance.show();
                    } else {
                        modal.style.display = 'block';
                        modal.classList.add('show');
                    }
                    
                } catch (error) {
                    console.error('❌ Error showing CSV import choice dialog:', error);
                    resolve({ action: 'cancel', devices: [] });
                }
            });
        },
        
        // Show celebration animation
        showCelebration: showCelebration,
        
        // Hide all modals
        hideAllModals: function() {
            activeModals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (modal && typeof bootstrap !== 'undefined') {
                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                }
            });
            
            activeModals.clear();
        },
        
        // Clear all animations
        clearAnimations: function() {
            animationTimeouts.forEach(timeout => clearTimeout(timeout));
            animationTimeouts = [];
            
            // Remove celebration overlays
            const celebrations = document.querySelectorAll('.celebration-overlay');
            celebrations.forEach(celebration => {
                if (celebration.parentNode) {
                    celebration.remove();
                }
            });
        },
        
        // Status checks
        isInitialized: function() {
            return isInitialized;
        },
        
        hasActiveModals: function() {
            return activeModals.size > 0;
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', publicAPI.init);
    } else {
        setTimeout(publicAPI.init, 0);
    }
    
    return publicAPI;
})(); 
