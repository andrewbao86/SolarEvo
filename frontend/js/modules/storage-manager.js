// Storage Manager Module - Local storage operations for BESS Calculator
window.StorageManager = (function() {
    'use strict';
    
    
    // Private constants
    const STORAGE_KEY = 'bessCalculatorDevices';
    
    // Private methods
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    function validateDeviceData(devices) {
        if (!Array.isArray(devices)) {
            console.warn('⚠️ Invalid device data: not an array');
            return [];
        }
        
        return devices.filter(device => {
            const isValid = device && 
                           typeof device.name === 'string' && 
                           typeof device.power === 'number' && 
                           device.power > 0 &&
                           Array.isArray(device.operatingHours) &&
                           Array.isArray(device.batteryHours);
            
            if (!isValid) {
                console.warn('⚠️ Invalid device data filtered out:', device);
            }
            
            return isValid;
        });
    }
    
    // Public API
    const publicAPI = {
        // Generate unique ID
        generateId: generateId,
        
        // Save devices to localStorage
        save: function() {
            try {
                const devices = AppState.getDevices();
                localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
                return true;
            } catch (error) {
                console.error('❌ Failed to save to localStorage:', error);
                return false;
            }
        },
        
        // Load devices from localStorage
        load: function() {
            try {
                const savedData = localStorage.getItem(STORAGE_KEY);
                if (savedData) {
                    const devices = JSON.parse(savedData);
                    const validDevices = validateDeviceData(devices);
                    
                    AppState.setDevices(validDevices);
                    
                    // Notify that devices have been loaded
                    const event = new CustomEvent('devicesLoaded', {
                        detail: { devices: validDevices }
                    });
                    document.dispatchEvent(event);
                    
                    return validDevices;
                } else {
                    return [];
                }
            } catch (error) {
                console.error('❌ Failed to load from localStorage:', error);
                AppState.setDevices([]);
                return [];
            }
        },
        
        // Clear all data
        clear: function() {
            try {
                localStorage.removeItem(STORAGE_KEY);
                AppState.setDevices([]);
                
                // Notify that storage has been cleared
                const event = new CustomEvent('storageCleared');
                document.dispatchEvent(event);
                
                return true;
            } catch (error) {
                console.error('❌ Failed to clear localStorage:', error);
                return false;
            }
        },
        
        // Export data as JSON
        export: function() {
            const devices = AppState.getDevices();
            return {
                timestamp: new Date().toISOString(),
                version: '1.0',
                devices: devices
            };
        },
        
        // Import data from JSON
        import: function(data) {
            try {
                let devices = [];
                
                if (data.devices && Array.isArray(data.devices)) {
                    devices = data.devices;
                } else if (Array.isArray(data)) {
                    devices = data;
                } else {
                    throw new Error('Invalid data format');
                }
                
                const validDevices = validateDeviceData(devices);
                AppState.setDevices(validDevices);
                this.save();
                
                return validDevices;
            } catch (error) {
                console.error('❌ Failed to import data:', error);
                return null;
            }
        },
        
        // Get storage info
        getStorageInfo: function() {
            try {
                const savedData = localStorage.getItem(STORAGE_KEY);
                const size = savedData ? new Blob([savedData]).size : 0;
                const devices = AppState.getDevices();
                
                return {
                    hasData: !!savedData,
                    deviceCount: devices.length,
                    sizeBytes: size,
                    sizeKB: Math.round(size / 1024 * 100) / 100,
                    lastModified: devices.length > 0 ? new Date().toISOString() : null
                };
            } catch (error) {
                console.error('❌ Failed to get storage info:', error);
                return null;
            }
        },
        
        // Auto-save functionality
        enableAutoSave: function() {
            // Listen for device changes and auto-save
            document.addEventListener('appStateChange', (event) => {
                if (event.detail.key === 'devices') {
                    this.save();
                }
            });
            
        },
        
        // Check if localStorage is available
        isAvailable: function() {
            try {
                const test = '__localStorage_test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (error) {
                console.error('❌ localStorage not available:', error);
                return false;
            }
        }
    };
    
    // Initialize auto-save if AppState is available
    if (window.AppState) {
        publicAPI.enableAutoSave();
    }
    
    return publicAPI;
})(); 
