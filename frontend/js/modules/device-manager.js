// Device Manager Module - Device CRUD operations and form handling for BESS Calculator
window.DeviceManager = (function() {
    'use strict';
    
    
    // Private variables
    let editingIndex = -1;
    
    // Private utility functions
    function validateInputs() {
        const deviceInput = AppState.getDomElement('deviceInput');
        const powerInput = AppState.getDomElement('powerInput');
        const quantityInput = AppState.getDomElement('quantityInput');
        
        if (!deviceInput || !powerInput || !quantityInput) return false;
        
        const deviceName = deviceInput.value.trim();
        const power = parseInt(powerInput.value);
        const quantity = parseInt(quantityInput.value);
        
        return deviceName && power > 0 && quantity > 0;
    }
    
    function clearInputs() {
        const elements = AppState.getDomElements();
        
        if (elements.deviceInput) elements.deviceInput.value = '';
        if (elements.powerInput) elements.powerInput.value = '';
        if (elements.quantityInput) elements.quantityInput.value = '1';
        if (elements.criticalDeviceCheckbox) elements.criticalDeviceCheckbox.checked = false;
        
        // Clear time blocks
        TimeBlocks.clear('operating-hours-blocks');
        TimeBlocks.clear('battery-hours-blocks');
        
        // Reset editing state
        editingIndex = -1;
        updateAddButton();
    }
    
    function updateAddButton() {
        const addButton = AppState.getDomElement('addButton');
        if (!addButton) return;
        
        const isValid = validateInputs();
        const operatingHours = TimeBlocks.getSelected('operating-hours-blocks');
        const hasOperatingHours = operatingHours.length > 0;
        
        addButton.disabled = !(isValid && hasOperatingHours);
        addButton.textContent = editingIndex >= 0 ? 'Update' : 'Add';
    }
    
    function populateDeviceSuggestions() {
        const datalist = document.getElementById('device-suggestions');
        if (!datalist) return;
        
        const commonDevices = AppState.getCommonDevices();
        datalist.innerHTML = '';
        
        commonDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.name;
            option.setAttribute('data-power', device.power);
            datalist.appendChild(option);
        });
    }
    
    function handleDeviceInputChange() {
        const deviceInput = AppState.getDomElement('deviceInput');
        const powerInput = AppState.getDomElement('powerInput');
        
        if (!deviceInput || !powerInput) return;
        
        const selectedDevice = AppState.findCommonDevice(deviceInput.value);
        if (selectedDevice && !powerInput.value) {
            powerInput.value = selectedDevice.power;
        }
        
        updateAddButton();
    }
    
    function renderDevices() {
        const container = document.getElementById('devices-container');
        if (!container) return;
        
        const devices = AppState.getDevices();
        container.innerHTML = '';
        
        if (devices.length === 0) {
            container.innerHTML = '<div class="no-devices">No devices added yet</div>';
            return;
        }
        
        // Use innerHTML with join for better performance and consistent layout with main.js
        container.innerHTML = devices.map((device, index) => {
            // Format operating hours for display (consistent with main.js)
            const operatingRanges = device.operatingHours && device.operatingHours.length > 0
                ? TimeBlocks.getTimeRanges(device.operatingHours)
                : [];
            const operatingDisplay = operatingRanges.length > 0 ? operatingRanges.join(', ') : 'No hours selected';
            
            // Format battery hours for display (consistent with main.js)
            const batteryRanges = device.batteryHours && device.batteryHours.length > 0
                ? TimeBlocks.getTimeRanges(device.batteryHours)
                : [];
            const batteryDisplay = batteryRanges.length > 0 ? batteryRanges.join(', ') : 'No hours selected';
            
            return `
                <div class="device-list-row">
                    <div class="device-name">${device.name} ${device.critical ? '✓' : ''}</div>
                    <div>${device.power}W</div>
                    <div>${device.quantity}</div>
                    <div>${operatingDisplay}</div>
                    <div>${batteryDisplay}</div>
                    <div class="device-actions">
                        <button onclick="DeviceManager.editDevice(${index})" class="edit-btn" title="Edit" style="transform: scaleX(-1) rotate(-90deg);">✏️</button>
                        <button onclick="DeviceManager.deleteDevice(${index})" class="delete-btn" title="Delete">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Dispatch device list updated event
        const event = new CustomEvent('deviceListUpdated', {
            detail: { count: devices.length }
        });
        document.dispatchEvent(event);
    }
    
    function createDeviceFromInputs() {
        const elements = AppState.getDomElements();
        
        const device = {
            id: StorageManager.generateId(),
            name: elements.deviceInput?.value.trim() || '',
            power: parseInt(elements.powerInput?.value) || 0,
            quantity: parseInt(elements.quantityInput?.value) || 1,
            critical: elements.criticalDeviceCheckbox?.checked || false,
            operatingHours: TimeBlocks.getSelected('operating-hours-blocks'),
            batteryHours: TimeBlocks.getSelected('battery-hours-blocks')
        };
        
        // Validate device
        if (!Calculations.validateDevice(device)) {
            throw new Error('Invalid device data');
        }
        
        return device;
    }
    
    // Public API
    const publicAPI = {
        // Initialize device manager
        initialize: function() {
            
            // Cache DOM elements
            const elements = {
                deviceInput: document.getElementById('device'),
                powerInput: document.getElementById('power'),
                quantityInput: document.getElementById('quantity'),
                criticalDeviceCheckbox: document.getElementById('critical-device'),
                addButton: document.getElementById('add-device'),
                clearAllButton: document.getElementById('clear-all'),
                addDeviceForm: document.getElementById('add-device-form')
            };
            
            AppState.setDomElements(elements);
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Populate device suggestions
            populateDeviceSuggestions();
            
            // Initial render
            renderDevices();
            updateAddButton();
            
        },
        
        // Set up event listeners
        setupEventListeners: function() {
            const elements = AppState.getDomElements();
            
            // Device input change (for auto-fill power)
            if (elements.deviceInput) {
                elements.deviceInput.addEventListener('input', handleDeviceInputChange);
            }
            
            // Power and quantity input changes
            if (elements.powerInput) {
                elements.powerInput.addEventListener('input', updateAddButton);
            }
            
            if (elements.quantityInput) {
                elements.quantityInput.addEventListener('input', updateAddButton);
            }
            
            // Add device form submission
            if (elements.addDeviceForm) {
                elements.addDeviceForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.addDevice();
                });
            }
            
            // Add device button
            if (elements.addButton) {
                elements.addButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.addDevice();
                });
            }
            
            // Clear all button
            if (elements.clearAllButton) {
                elements.clearAllButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.clearAll();
                });
            }
            
            // Listen for time selection changes
            document.addEventListener('timeSelectionChange', () => {
                updateAddButton();
            });
            
        },
        
        // Add device
        addDevice: function() {
            try {
                const device = createDeviceFromInputs();
                
                if (editingIndex >= 0) {
                    // Update existing device
                    AppState.updateDevice(editingIndex, device);
                } else {
                    // Add new device
                    AppState.addDevice(device);
                }
                
                // Clear inputs and render
                clearInputs();
                renderDevices();
                
                // Dispatch device added/updated event
                const event = new CustomEvent('deviceModified', {
                    detail: { 
                        action: editingIndex >= 0 ? 'updated' : 'added',
                        device: device,
                        index: editingIndex >= 0 ? editingIndex : AppState.getDevices().length - 1
                    }
                });
                document.dispatchEvent(event);
                
            } catch (error) {
                console.error('❌ Error adding/updating device:', error);
                alert('Error: ' + error.message);
            }
        },
        
        // Edit device
        editDevice: function(index) {
            const devices = AppState.getDevices();
            if (index < 0 || index >= devices.length) return;
            
            const device = devices[index];
            const elements = AppState.getDomElements();
            
            // Populate form with device data
            if (elements.deviceInput) elements.deviceInput.value = device.name;
            if (elements.powerInput) elements.powerInput.value = device.power;
            if (elements.quantityInput) elements.quantityInput.value = device.quantity;
            if (elements.criticalDeviceCheckbox) elements.criticalDeviceCheckbox.checked = device.critical || false;
            
            // Set time blocks
            TimeBlocks.setSelected('operating-hours-blocks', device.operatingHours || []);
            TimeBlocks.setSelected('battery-hours-blocks', device.batteryHours || []);
            
            // Set editing state
            editingIndex = index;
            updateAddButton();
            
            // Scroll to form
            elements.addDeviceForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
        },
        
        // Delete device
        deleteDevice: function(index) {
            const devices = AppState.getDevices();
            
            // Prevent dual deletion with comprehensive checks
            if (typeof index !== 'number' || index < 0 || index >= devices.length) {
                console.warn('⚠️ DeviceManager: Invalid delete index or device already deleted:', index);
                return;
            }
            
            const device = devices[index];
            if (!device) {
                console.warn('⚠️ DeviceManager: Device not found at index:', index);
                return;
            }
            
            // Add deletion guard to prevent rapid successive deletions
            if (device._deleting) {
                console.warn('⚠️ DeviceManager: Device deletion already in progress');
                return;
            }
            
            if (confirm(`Are you sure you want to delete "${device.name}"?`)) {
                // Mark device as being deleted
                device._deleting = true;
                
                // Validate index again before deletion (in case array changed)
                const currentDevices = AppState.getDevices();
                if (index >= currentDevices.length || currentDevices[index] !== device) {
                    console.warn('⚠️ DeviceManager: Device index changed during deletion, aborting');
                    device._deleting = false;
                    return;
                }
                
                const deletedDevice = AppState.removeDevice(index);
                renderDevices();
                
                // If we were editing this device, clear the form
                if (editingIndex === index) {
                    clearInputs();
                } else if (editingIndex > index) {
                    editingIndex--;
                }
                
                // Dispatch device deleted event
                const event = new CustomEvent('deviceModified', {
                    detail: { 
                        action: 'deleted',
                        device: deletedDevice,
                        index: index
                    }
                });
                document.dispatchEvent(event);
                
            } else {
                // User cancelled, remove deletion flag
                device._deleting = false;
            }
        },
        
        // Clear all devices
        clearAll: function() {
            const devices = AppState.getDevices();
            if (devices.length === 0) return;
            
            if (confirm('Are you sure you want to clear all devices?')) {
                AppState.setDevices([]);
                clearInputs();
                renderDevices();
                
                // Dispatch all devices cleared event
                const event = new CustomEvent('allDevicesCleared');
                document.dispatchEvent(event);
                
            }
        },
        
        // CSV handling
        handleCsvUpload: function(csvData, action = 'replace') {
            try {
                let devices = [];
                
                if (action === 'add') {
                    devices = [...AppState.getDevices()];
                }
                
                // Parse CSV data
                const lines = csvData.trim().split('\n');
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                
                // Expected headers
                const expectedHeaders = ['device', 'power', 'quantity', 'operating_hours', 'battery_hours'];
                const headerMapping = {};
                
                expectedHeaders.forEach(expected => {
                    const index = headers.findIndex(h => h.includes(expected.replace('_', '')));
                    if (index >= 0) headerMapping[expected] = index;
                });
                
                // Process data rows
                for (let i = 1; i < lines.length; i++) {
                    const row = lines[i].split(',').map(cell => cell.trim());
                    if (row.length < 3) continue; // Skip incomplete rows
                    
                    const device = {
                        id: StorageManager.generateId(),
                        name: row[headerMapping.device] || '',
                        power: parseInt(row[headerMapping.power]) || 0,
                        quantity: parseInt(row[headerMapping.quantity]) || 1,
                        critical: false,
                        operatingHours: this.parseHoursList(row[headerMapping.operating_hours] || ''),
                        batteryHours: this.parseHoursList(row[headerMapping.battery_hours] || '')
                    };
                    
                    if (Calculations.validateDevice(device)) {
                        devices.push(device);
                    }
                }
                
                AppState.setDevices(devices);
                renderDevices();
                
                // Dispatch CSV imported event
                const event = new CustomEvent('csvImported', {
                    detail: { 
                        action: action,
                        count: devices.length,
                        newDevices: devices.length - (action === 'add' ? AppState.getDevices().length : 0)
                    }
                });
                document.dispatchEvent(event);
                
                return devices;
                
            } catch (error) {
                console.error('❌ CSV upload error:', error);
                throw error;
            }
        },
        
        // Parse hours list from CSV (e.g., "8,9,10,11,12")
        parseHoursList: function(hoursString) {
            if (!hoursString) return [];
            
            try {
                return hoursString.split(',')
                    .map(h => parseInt(h.trim()))
                    .filter(h => h >= 0 && h <= 23);
            } catch (error) {
                return [];
            }
        },
        
        // Generate CSV template
        generateCsvTemplate: function() {
            const csvContent = [
                'Device,Power,Quantity,Operating_Hours,Battery_Hours',
                'Fridge,250,1,"0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23","18,19,20,21,22,23"',
                'Air Conditioner,1200,1,"22,23,0,1,2,3,4,5,6","22,23,0,1,2,3,4,5,6"',
                'TV,120,1,"18,19,20,21,22,23",""',
                'Laptop,65,1,"9,10,11,12,13,14,15,16,17",""'
            ].join('\n');
            
            return csvContent;
        },
        
        // Utility methods
        renderDevices: renderDevices,
        updateAddButton: updateAddButton,
        clearInputs: clearInputs,
        
        // Get current editing index
        getEditingIndex: function() {
            return editingIndex;
        },
        
        // Cancel editing
        cancelEditing: function() {
            editingIndex = -1;
            clearInputs();
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            publicAPI.initialize();
        });
    } else {
        // DOM is already ready
        publicAPI.initialize();
    }
    
    return publicAPI;
})(); 
