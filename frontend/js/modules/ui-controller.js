// UI Controller Module - Form validation, button states, and display updates for BESS Calculator
window.UIController = (function() {
    'use strict';
    
    
    // Private variables
    let isInitialized = false;
    let validationTimers = {};
    
    // DOM element cache
    let domElements = {};
    
    // Private utility functions
    function cacheElements() {
        domElements = {
            // Forms and inputs
            prospectName: document.getElementById('prospect-name'),
            prospectEmail: document.getElementById('prospect-email'),
            deviceForm: document.getElementById('device-form'),
            deviceName: document.getElementById('device-name'),
            devicePower: document.getElementById('device-power'),
            deviceQuantity: document.getElementById('device-quantity'),
            
            // Buttons
            addDeviceBtn: document.getElementById('add-device-btn'),
            exportCsvBtn: document.getElementById('export-csv-btn'),
            importCsvBtn: document.getElementById('import-csv-btn'),
            downloadTemplateBtn: document.getElementById('download-template-btn'),
            generatePdfBtn: document.getElementById('generate-pdf-btn'),
            shareBtn: document.getElementById('share-btn'),
            clearAllBtn: document.getElementById('clear-all-btn'),
            
            // Display elements
            devicesList: document.getElementById('devices-list'),
            totalEnergyDisplay: document.getElementById('total-energy'),
            batteryCapacityDisplay: document.getElementById('battery-capacity'),
            solarSizeDisplay: document.getElementById('solar-size'),
            recommendationDisplay: document.getElementById('recommendation'),
            
            // Status elements
            statusBar: document.getElementById('status-bar'),
            loadingIndicator: document.getElementById('loading-indicator'),
            
            // Validation feedback
            nameValidation: document.getElementById('name-validation'),
            emailValidation: document.getElementById('email-validation'),
            deviceValidation: document.getElementById('device-validation')
        };
        
    }
    
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function validateDeviceName(name) {
        return name && name.trim().length >= 2 && name.trim().length <= 50;
    }
    
    function validatePower(power) {
        const powerNum = parseFloat(power);
        return !isNaN(powerNum) && powerNum > 0 && powerNum <= 50000;
    }
    
    function validateQuantity(quantity) {
        const quantityNum = parseInt(quantity);
        return !isNaN(quantityNum) && quantityNum > 0 && quantityNum <= 1000;
    }
    
    function showValidationMessage(element, message, isValid) {
        if (!element) return;
        
        element.textContent = message;
        element.className = isValid ? 'validation-message valid' : 'validation-message invalid';
        element.style.display = message ? 'block' : 'none';
    }
    
    function updateButtonStates() {
        const devices = AppState.getDevices();
        const hasDevices = devices && devices.length > 0;
        const userInfo = PdfGenerator.validateUserInfo();
        
        // Update export buttons
        if (domElements.exportCsvBtn) {
            domElements.exportCsvBtn.disabled = !hasDevices;
            domElements.exportCsvBtn.title = hasDevices ? 'Export devices to CSV' : 'Add devices to enable export';
        }
        
        // Update PDF generation button
        if (domElements.generatePdfBtn) {
            const canGeneratePdf = hasDevices && userInfo.valid;
            domElements.generatePdfBtn.disabled = !canGeneratePdf;
            
            if (!hasDevices) {
                domElements.generatePdfBtn.title = 'Add devices to generate PDF';
            } else if (!userInfo.valid) {
                domElements.generatePdfBtn.title = 'Enter prospect name and email to generate PDF';
            } else {
                domElements.generatePdfBtn.title = 'Generate PDF report';
            }
        }
        
        // Update share button
        if (domElements.shareBtn) {
            domElements.shareBtn.disabled = !hasDevices;
            domElements.shareBtn.title = hasDevices ? 'Generate shareable link' : 'Add devices to share';
        }
        
        // Update clear all button
        if (domElements.clearAllBtn) {
            domElements.clearAllBtn.disabled = !hasDevices;
            domElements.clearAllBtn.title = hasDevices ? 'Clear all devices' : 'No devices to clear';
        }
    }
    
    function updateCalculationDisplays() {
        const devices = AppState.getDevices();
        
        if (!devices || devices.length === 0) {
            // Clear displays when no devices
            if (domElements.totalEnergyDisplay) domElements.totalEnergyDisplay.textContent = '0 kWh';
            if (domElements.batteryCapacityDisplay) domElements.batteryCapacityDisplay.textContent = '0 kWh';
            if (domElements.solarSizeDisplay) domElements.solarSizeDisplay.textContent = '0 kWp';
            if (domElements.recommendationDisplay) domElements.recommendationDisplay.textContent = 'Add devices to see recommendations';
            return;
        }
        
        try {
            // Calculate values
            const totalEnergy = Calculations.calculateTotalEnergy(devices);
            const batteryCapacity = Calculations.calculateBatteryCapacity(devices);
            const solarSize = Calculations.calculateSolarSize(devices);
            const recommendation = Calculations.getSolarEvoRecommendation(devices);
            
            // Update displays
            if (domElements.totalEnergyDisplay) {
                domElements.totalEnergyDisplay.textContent = `${totalEnergy} kWh`;
            }
            
            if (domElements.batteryCapacityDisplay) {
                domElements.batteryCapacityDisplay.textContent = `${batteryCapacity} kWh`;
            }
            
            if (domElements.solarSizeDisplay) {
                domElements.solarSizeDisplay.textContent = `${solarSize} kWp`;
            }
            
            if (domElements.recommendationDisplay) {
                domElements.recommendationDisplay.textContent = recommendation;
            }
            
        } catch (error) {
            console.error('❌ Error updating calculation displays:', error);
        }
    }
    
    function showStatus(message, type = 'info', duration = 3000) {
        if (!domElements.statusBar) return;
        
        domElements.statusBar.textContent = message;
        domElements.statusBar.className = `status-bar ${type}`;
        domElements.statusBar.style.display = 'block';
        
        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => {
                if (domElements.statusBar) {
                    domElements.statusBar.style.display = 'none';
                }
            }, duration);
        }
    }
    
    function showLoading(show = true, message = 'Processing...') {
        if (!domElements.loadingIndicator) return;
        
        if (show) {
            domElements.loadingIndicator.textContent = message;
            domElements.loadingIndicator.style.display = 'block';
        } else {
            domElements.loadingIndicator.style.display = 'none';
        }
    }
    
    function setupEventListeners() {
        // Real-time validation for prospect name
        if (domElements.prospectName) {
            domElements.prospectName.addEventListener('input', function() {
                clearTimeout(validationTimers.name);
                validationTimers.name = setTimeout(() => {
                    const value = this.value.trim();
                    const isValid = value.length >= 2;
                    
                    if (value.length === 0) {
                        showValidationMessage(domElements.nameValidation, '', true);
                    } else if (isValid) {
                        showValidationMessage(domElements.nameValidation, 'Valid name', true);
                    } else {
                        showValidationMessage(domElements.nameValidation, 'Name must be at least 2 characters', false);
                    }
                    
                    updateButtonStates();
                }, 500);
            });
        }
        
        // Real-time validation for prospect email
        if (domElements.prospectEmail) {
            domElements.prospectEmail.addEventListener('input', function() {
                clearTimeout(validationTimers.email);
                validationTimers.email = setTimeout(() => {
                    const value = this.value.trim();
                    const isValid = validateEmail(value);
                    
                    if (value.length === 0) {
                        showValidationMessage(domElements.emailValidation, '', true);
                    } else if (isValid) {
                        showValidationMessage(domElements.emailValidation, 'Valid email address', true);
                    } else {
                        showValidationMessage(domElements.emailValidation, 'Please enter a valid email address', false);
                    }
                    
                    updateButtonStates();
                }, 500);
            });
        }
        
        // Device form validation
        if (domElements.deviceForm) {
            domElements.deviceForm.addEventListener('input', function(e) {
                clearTimeout(validationTimers.device);
                validationTimers.device = setTimeout(() => {
                    validateDeviceForm();
                }, 300);
            });
        }
        
        // Listen for app state changes
        document.addEventListener('appStateChange', function() {
            updateButtonStates();
            updateCalculationDisplays();
        });
        
        // Listen for device modifications
        document.addEventListener('deviceModified', function() {
            updateButtonStates();
            updateCalculationDisplays();
        });
        
        // Listen for PDF generation events
        document.addEventListener('pdfGenerated', function(e) {
            showStatus(`PDF report generated successfully: ${e.detail.filename}`, 'success');
            showLoading(false);
        });
        
        document.addEventListener('pdfGenerationError', function(e) {
            showStatus(`PDF generation failed: ${e.detail.error}`, 'error');
            showLoading(false);
        });
        
        // Listen for CSV events
        document.addEventListener('csvExported', function(e) {
            showStatus(`CSV exported successfully: ${e.detail.filename}`, 'success');
        });
        
        document.addEventListener('csvTemplateDownloaded', function(e) {
            showStatus(`CSV template downloaded: ${e.detail.filename}`, 'success');
        });
    }
    
    function validateDeviceForm() {
        if (!domElements.deviceForm) return { valid: false };
        
        const name = domElements.deviceName?.value?.trim() || '';
        const power = domElements.devicePower?.value || '';
        const quantity = domElements.deviceQuantity?.value || '';
        
        const validations = {
            name: validateDeviceName(name),
            power: validatePower(power),
            quantity: validateQuantity(quantity)
        };
        
        const isValid = Object.values(validations).every(v => v);
        
        // Update add button state
        if (domElements.addDeviceBtn) {
            domElements.addDeviceBtn.disabled = !isValid;
        }
        
        // Show validation messages
        let message = '';
        if (name && !validations.name) {
            message += 'Device name must be 2-50 characters. ';
        }
        if (power && !validations.power) {
            message += 'Power must be 1-50,000 W. ';
        }
        if (quantity && !validations.quantity) {
            message += 'Quantity must be 1-1,000. ';
        }
        
        showValidationMessage(domElements.deviceValidation, message.trim(), isValid || message === '');
        
        return { valid: isValid, validations };
    }
    
    // Public API
    const publicAPI = {
        // Initialize the UI controller
        init: function() {
            if (isInitialized) {
                return;
            }
            
            try {
                cacheElements();
                setupEventListeners();
                updateButtonStates();
                updateCalculationDisplays();
                
                isInitialized = true;
                
            } catch (error) {
                console.error('❌ UIController initialization failed:', error);
                throw error;
            }
        },
        
        // Validation methods
        validateProspectInfo: function() {
            const name = domElements.prospectName?.value?.trim() || '';
            const email = domElements.prospectEmail?.value?.trim() || '';
            
            return {
                name: { value: name, valid: name.length >= 2 },
                email: { value: email, valid: validateEmail(email) },
                valid: name.length >= 2 && validateEmail(email)
            };
        },
        
        validateDeviceForm: validateDeviceForm,
        
        // UI state management
        updateButtonStates: updateButtonStates,
        updateCalculationDisplays: updateCalculationDisplays,
        
        // Status and feedback
        showStatus: showStatus,
        showLoading: showLoading,
        
        // Form helpers
        clearDeviceForm: function() {
            if (domElements.deviceName) domElements.deviceName.value = '';
            if (domElements.devicePower) domElements.devicePower.value = '';
            if (domElements.deviceQuantity) domElements.deviceQuantity.value = '';
            
            showValidationMessage(domElements.deviceValidation, '', true);
            
            if (domElements.addDeviceBtn) {
                domElements.addDeviceBtn.disabled = true;
            }
        },
        
        focusDeviceForm: function() {
            if (domElements.deviceName) {
                domElements.deviceName.focus();
            }
        },
        
        // DOM element access
        getElements: function() {
            return { ...domElements };
        },
        
        // Status checks
        isInitialized: function() {
            return isInitialized;
        },
        
        // Refresh cached elements (useful after DOM changes)
        refreshElements: function() {
            cacheElements();
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', publicAPI.init);
    } else {
        // DOM already ready
        setTimeout(publicAPI.init, 0);
    }
    
    return publicAPI;
})(); 
