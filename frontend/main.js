// BESS Calculator - Working Implementation

console.log('📜 main.js script loaded');

// Chart variables now handled by Charts module
// let energyDistributionChart;
// let deviceEnergyChart;
// let costComparisonChart;
// let chartsInitialized = false;
// let chartsReady = false;
let domReady = false;

// Optimization dictionaries (shared with share-service.js)
const DEVICE_DICTIONARY = {
    // Common device names → indices for compression
    'Air Conditioner': 1, 'AC': 1, 'Aircon': 1,
    'Refrigerator': 2, 'Fridge': 2, 'Ref': 2,
    'LED Lights': 3, 'LED': 3, 'Lights': 3, 'Light': 3,
    'Television': 4, 'TV': 4, 'Telly': 4,
    'Washing Machine': 5, 'Washer': 5, 'WM': 5,
    'Router': 6, 'WiFi Router': 6, 'Modem': 6,
    'Laptop': 7, 'Computer': 7, 'PC': 7,
    'Fan': 8, 'Ceiling Fan': 8, 'Table Fan': 8,
    'Microwave': 9, 'Microwave Oven': 9,
    'Water Heater': 10, 'Heater': 10, 'Geyser': 10,
    'Iron': 11, 'Steam Iron': 11,
    'Hair Dryer': 12, 'Dryer': 12,
    'Blender': 13, 'Mixer': 13,
    'Rice Cooker': 14, 'Cooker': 14,
    'Kettle': 15, 'Electric Kettle': 15,
    'Toaster': 16, 'Bread Toaster': 16,
    'Coffee Maker': 17, 'Coffee Machine': 17,
    'Dishwasher': 18, 'DW': 18,
    'Vacuum Cleaner': 19, 'Vacuum': 19,
    'Security System': 20, 'CCTV': 20, 'Alarm': 20
};

const REVERSE_DEVICE_DICTIONARY = Object.fromEntries(
    Object.entries(DEVICE_DICTIONARY).map(([name, id]) => [id, name])
);

const POWER_DICTIONARY = {
    // Common power values → indices
    50: 1, 75: 2, 100: 3, 150: 4, 200: 5, 250: 6, 300: 7, 400: 8, 
    500: 9, 600: 10, 800: 11, 1000: 12, 1200: 13, 1500: 14, 
    1800: 15, 2000: 16, 2500: 17, 3000: 18
};

const REVERSE_POWER_DICTIONARY = Object.fromEntries(
    Object.entries(POWER_DICTIONARY).map(([power, id]) => [id, parseInt(power)])
);

// Compression helper functions
function compressHourArray(hours) {
    if (!hours || hours.length === 0) return 0;
    
    let bitFlag = 0;
    hours.forEach(hour => {
        if (hour >= 0 && hour <= 23) {
            bitFlag |= (1 << hour);
        }
    });
    
    return bitFlag.toString(36); // Base36 is more compact than hex
}

function decompressHourArray(compressed) {
    if (!compressed || compressed === '0') return [];
    
    try {
        const bitFlag = parseInt(compressed, 36);
        const hours = [];
        
        for (let hour = 0; hour < 24; hour++) {
            if (bitFlag & (1 << hour)) {
                hours.push(hour);
            }
        }
        
        return hours;
    } catch (error) {
        console.warn('Failed to decompress hour array:', compressed);
        return [];
    }
}

function compressDeviceName(name) {
    const dictId = DEVICE_DICTIONARY[name];
    if (dictId) {
        return dictId;
    }
    return name.length > 20 ? name.substring(0, 20) + '…' : name;
}

function decompressDeviceName(compressed) {
    if (typeof compressed === 'number' && REVERSE_DEVICE_DICTIONARY[compressed]) {
        return REVERSE_DEVICE_DICTIONARY[compressed];
    }
    return compressed;
}

function compressPowerValue(power) {
    const dictId = POWER_DICTIONARY[power];
    return dictId || power;
}

function decompressPowerValue(compressed) {
    if (typeof compressed === 'number' && REVERSE_POWER_DICTIONARY[compressed]) {
        return REVERSE_POWER_DICTIONARY[compressed];
    }
    return compressed;
}

function tryLZStringCompression(jsonString) {
    try {
        if (typeof LZString !== 'undefined' && LZString.compressToBase64) {
            const compressed = LZString.compressToBase64(jsonString);
            if (compressed && compressed.length < jsonString.length * 0.8) {
                console.log('✅ LZ-String compression effective:', 
                    Math.round((1 - compressed.length / jsonString.length) * 100) + '% reduction');
                return { compressed, usedLZ: true };
            }
        }
    } catch (error) {
        console.warn('⚠️ LZ-String compression failed, using fallback:', error);
    }
    
    return { compressed: jsonString, usedLZ: false };
}

function tryLZStringDecompression(compressed, isLZCompressed) {
    if (!isLZCompressed) return compressed;
    
    try {
        if (typeof LZString !== 'undefined' && LZString.decompressFromBase64) {
            const decompressed = LZString.decompressFromBase64(compressed);
            if (decompressed) {
                return decompressed;
            }
        }
    } catch (error) {
        console.warn('⚠️ LZ-String decompression failed:', error);
    }
    
    throw new Error('LZ-String decompression failed');
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 DOM ready, starting initialization...');
    domReady = true;
    
    // Initialize backend service first (async)
    await initializeBackendService();
    
    // Then wait for modules and initialize application
    waitForModules();
});

function initializeApplication() {
    console.log('🚀 initializeApplication() started');
    try {
        // Get DOM elements
        const deviceInput = document.getElementById('device');
        const powerInput = document.getElementById('power');
        const quantityInput = document.getElementById('quantity');
        const addDeviceButton = document.getElementById('add-device');
        const devicesContainer = document.getElementById('devices-container');
        const totalEnergyElement = document.getElementById('total-energy');
        const batteryCapacityElement = document.getElementById('battery-capacity');
        const recommendedSizeElement = document.getElementById('recommended-size');
        const solarevoRecommendationElement = document.getElementById('solarevo-recommendation');
        const deviceSuggestions = document.getElementById('device-suggestions');
        const downloadPdfButton = document.getElementById('download-pdf');
        const clearAllButton = document.getElementById('clear-all');
        const prospectNameInput = document.getElementById('prospect-name');
        const prospectEmailInput = document.getElementById('prospect-email');
        const prospectMobileInput = document.getElementById('prospect-mobile');
        const criticalDeviceCheckbox = document.getElementById('critical-device');
        
        // Common devices with their typical power consumption
        const commonDevices = [
            { name: 'Air Conditioner', power: 1200 },
            { name: 'Ceiling Fan', power: 75 },
            { name: 'Coffee Maker', power: 800 },
            { name: 'Desktop Computer', power: 150 },
            { name: 'Dishwasher', power: 1200 },
            { name: 'Fridge', power: 250 },
            { name: 'Hair Dryer', power: 1500 },
            { name: 'Lamp', power: 25 },
            { name: 'Laptop', power: 65 },
            { name: 'Microwave', power: 1000 },
            { name: 'Router', power: 10 },
            { name: 'Toaster', power: 950 },
            { name: 'TV', power: 120 },
            { name: 'Washing Machine', power: 500 },
            { name: 'Water Kettle', power: 2000 }
        ];

        // Store devices - now managed by AppState module but keep for compatibility
        let devices = [];
        
        // Set up integration with new modules
        function setupModuleIntegration() {
            // Listen for device changes from modules and sync with main.js
            document.addEventListener('appStateChange', (event) => {
                if (event.detail.key === 'devices') {
                    devices = event.detail.value;
                    renderDevices();
                    updateCalculations();
                    saveToLocalStorage();
                }
            });
            
            // Listen for device modifications
            document.addEventListener('deviceModified', (event) => {
                renderDevices();
                updateCalculations();
                saveToLocalStorage();
            });
            
            // Listen for charts initialization completion
            document.addEventListener('chartsInitialized', (event) => {
                console.log('🎯 Charts initialized, updating with current devices...');
                if (devices.length > 0) {
                    updateCharts();
                }
            });
            
            // Load initial data from modules
            if (window.AppState) {
                devices = AppState.getDevices();
            }
        }

        // Initialize features - most now handled by modules
        // populateDeviceSuggestions(); // Now handled by DeviceManager module
        // initializeTimeBlocks(); // Now handled by TimeBlocks module
        // initializeCharts(); // Now handled by Charts module
        initializeEventListeners();
        setupModuleIntegration();
        
        // Ensure TimeBlocks are initialized for cases where DOM was ready before module loaded
        if (window.TimeBlocks) {
            TimeBlocks.init();
        }
        
        // Initialize Phase 3 modules
        if (window.UIController) {
            UIController.init();
        }
        
        // Initialize Charts module
        if (window.Charts) {
            console.log('🎯 Initializing Charts module...');
            Charts.initialize();
        }
        
                                 // Load saved devices from localStorage
        console.log('💾 Loading devices from localStorage...');
        loadFromLocalStorage();
        
        // Debug: Check device synchronization
        setTimeout(() => {
            const mainDevices = devices.length;
            const appStateDevices = window.AppState ? AppState.getDevices().length : 'N/A';
            console.log('🔍 Device sync check:', { 
                main: mainDevices, 
                appState: appStateDevices,
                synced: mainDevices === appStateDevices 
            });
        }, 1000);
        
        // Enhanced shared data loading with database and URL support
        loadSharedData();
        
        // loadFromLocalStorage(); // Now handled by StorageManager module
        
        // New enhanced shared data loader
        async function loadSharedData() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                
                // Check for database-stored share (new format: ?share=ABC123)
                const shareId = urlParams.get('share');
                if (shareId) {
                    console.log('🔍 Found database share ID:', shareId);
                    await loadDatabaseSharedData(shareId);
                    return;
                }
                
                // Check for URL-encoded share (existing format: ?s=encoded_data)
                const urlData = urlParams.get('s');
                if (urlData) {
                    console.log('🔍 Found URL-encoded share data');
                    loadUrlEncodedSharedData(urlData);
                    return;
                }
                
                // Check for legacy ShareService format
                if (window.ShareService) {
                    const config = await ShareService.loadFromUrl();
                    if (config.hasSharedData) {
                        const result = await ShareService.applySharedConfiguration(config);
                        if (result && result.applied) {
                            if (window.ModalManager) {
                                ModalManager.showCelebration(`🔗 Loaded shared configuration with ${result.deviceCount} devices!`);
                            }
                        }
                    }
                }
                
            } catch (error) {
                console.error('❌ Error loading shared data:', error);
                if (window.UIController) {
                    UIController.showStatus('❌ Failed to load shared data', 'error');
                }
            }
        }
        
        async function loadDatabaseSharedData(shareId) {
            try {
                if (!window.BackendServiceV2) {
                    throw new Error('Backend service not available');
                }
                
                console.log('🔍 Loading database shared data:', shareId);
                
                if (window.UIController) {
                    UIController.showLoading(true, 'Loading shared calculation...');
                }
                
                const result = await BackendServiceV2.getSharedCalculation(shareId);
                
                if (result.success && result.data) {
                    const sharedData = result.data;
                    
                    // Load devices
                    if (sharedData.devices && Array.isArray(sharedData.devices)) {
                        devices = sharedData.devices.map(device => ({
                            ...device,
                            id: device.id || 'shared_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                        }));
                        
                        // Sync with AppState
                        if (window.AppState) {
                            AppState.setDevices(devices);
                        }
                        
                        renderDevices();
                        updateCalculations();
                    }
                    
                    // Load prospect information
                    if (prospectNameInput && sharedData.creatorName) {
                        prospectNameInput.value = sharedData.creatorName;
                    }
                    if (prospectEmailInput && sharedData.creatorEmail) {
                        prospectEmailInput.value = sharedData.creatorEmail;
                    }
                    if (prospectMobileInput && sharedData.creatorMobile) {
                        prospectMobileInput.value = sharedData.creatorMobile;
                    }
                    
                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    // Show success message
                    if (window.ModalManager) {
                        ModalManager.showCelebration(`🗄️ Loaded shared calculation with ${devices.length} devices from database!`);
                    }
                    
                    console.log('✅ Database shared data loaded successfully');
                    
                } else {
                    throw new Error('Invalid shared data received');
                }
                
            } catch (error) {
                console.error('❌ Failed to load database shared data:', error);
                
                if (window.UIController) {
                    UIController.showStatus(`❌ Failed to load shared link: ${error.message}`, 'error');
                }
                
                // Clean up URL on error
                window.history.replaceState({}, document.title, window.location.pathname);
                
            } finally {
                if (window.UIController) {
                    UIController.showLoading(false);
                }
            }
        }
        
        function loadUrlEncodedSharedData(urlData) {
            try {
                console.log('🔍 Loading URL-encoded shared data');
                
                const decompressedDevices = decompressSharedData(urlData);
                if (decompressedDevices && decompressedDevices.length > 0) {
                    devices = decompressedDevices;
                    
                    // Sync with AppState
                    if (window.AppState) {
                        AppState.setDevices(devices);
                    }
                    
                    renderDevices();
                    updateCalculations();
                    
                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    // Show success message
                    if (window.ModalManager) {
                        ModalManager.showCelebration(`🔗 Loaded shared configuration with ${devices.length} devices!`);
                    }
                    
                    console.log('✅ URL-encoded shared data loaded successfully');
                }
                
            } catch (error) {
                console.error('❌ Failed to load URL-encoded shared data:', error);
                if (window.UIController) {
                    UIController.showStatus('❌ Invalid share link format', 'error');
                }
            }
        }
        
        
        
        // Functions
        function populateDeviceSuggestions() {
            if (deviceSuggestions) {
                deviceSuggestions.innerHTML = '';
                commonDevices.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.name;
                    option.setAttribute('data-power', device.power);
                    deviceSuggestions.appendChild(option);
                });

                // Auto-fill power when device is selected
                if (deviceInput && powerInput) {
                    deviceInput.addEventListener('input', () => {
                        const selectedDevice = commonDevices.find(d => 
                            d.name.toLowerCase() === deviceInput.value.toLowerCase()
                        );
                        if (selectedDevice && !powerInput.value) {
                            powerInput.value = selectedDevice.power;
                        }
                    });
                }
            }
        }

        function initializeTimeBlocks() {
            // Time blocks now handled by TimeBlocks module
        }

        function createTimeBlockPicker(container, type, defaultSelected) {
            // Time block picker now handled by TimeBlocks module
        }
        
        function toggleHourSelection(hour, container, type) {
            // Time block selection now handled by TimeBlocks module
        }

        function updateTimeDisplay(container, type) {
            const selectedBlocks = container.querySelectorAll('.time-block.selected');
            const selectedHours = [...new Set(Array.from(selectedBlocks).map(block => parseInt(block.dataset.hour)))];
            
            const displayContainer = document.getElementById(`${type}-hours-blocks-display`);
            if (displayContainer && selectedHours.length > 0) {
                const ranges = getTimeRanges(selectedHours);
                displayContainer.textContent = `Selected: ${ranges.join(', ')} (${selectedHours.length} hours)`;
            } else if (displayContainer) {
                displayContainer.textContent = 'No hours selected';
            }
        }

        function getTimeRanges(hours) {
            if (hours.length === 0) return [];
            
            hours.sort((a, b) => a - b);
            const ranges = [];
            let start = hours[0];
            let end = hours[0];
            
            for (let i = 1; i < hours.length; i++) {
                if (hours[i] === end + 1) {
                    end = hours[i];
                } else {
                    ranges.push(formatTimeRange(start, end));
                    start = end = hours[i];
                }
            }
            ranges.push(formatTimeRange(start, end));
            
            return ranges;
        }

        function formatTimeRange(start, end) {
            const formatHour = (h) => `${(h % 24).toString().padStart(2, '0')}:00`;
            
            if (start === end) {
                // Single hour: show as range (e.g., "00:00-01:00")
                const endHour = (start + 1) % 24;
                return `${formatHour(start)}-${formatHour(endHour)}`;
            } else {
                // Multiple hours: show range
                const endHour = (end + 1) % 24;
                return `${formatHour(start)}-${formatHour(endHour)}`;
            }
        }

        function initializeCharts() {
            // Charts now handled by Charts module
        }

        function initializeEventListeners() {
            // Add listeners for prospect info inputs to update calculations
            [prospectNameInput, prospectEmailInput, prospectMobileInput].forEach(input => {
                if (input) {
                    input.addEventListener('input', updateCalculations);
                }
            });
            
            // Phase 3 module integration - CSV handling
            const downloadCsvBtn = document.getElementById('download-csv-template');
            const uploadCsvBtn = document.getElementById('upload-csv-btn');
            const csvFileInput = document.getElementById('csv-file-input');
            
            console.log('🔍 CSV Debug Info:', {
                downloadBtn: !!downloadCsvBtn,
                uploadBtn: !!uploadCsvBtn,
                fileInput: !!csvFileInput,
                CsvHandler: !!window.CsvHandler,
                ModalManager: !!window.ModalManager,
                AppState: !!window.AppState
            });
            
            if (downloadCsvBtn && window.CsvHandler) {
                console.log('✅ Setting up download CSV button');
                downloadCsvBtn.addEventListener('click', () => {
                    console.log('📥 Download CSV button clicked');
                    CsvHandler.downloadTemplate()
                        .catch(error => console.error('❌ CSV template download failed:', error));
                });
            } else {
                console.warn('⚠️ Download CSV setup failed:', { btn: !!downloadCsvBtn, handler: !!window.CsvHandler });
            }
            
            // Upload CSV button triggers native file selector
            if (uploadCsvBtn && csvFileInput) {
                console.log('✅ Setting up upload CSV button');
                uploadCsvBtn.addEventListener('click', () => {
                    console.log('📤 Upload CSV button clicked');
                    csvFileInput.click();
                });
            } else {
                console.warn('⚠️ Upload CSV setup failed:', { btn: !!uploadCsvBtn, input: !!csvFileInput });
            }
            
            // Handle CSV file selection
            if (csvFileInput && window.CsvHandler && window.ModalManager && window.AppState) {
                console.log('✅ Setting up CSV file handler');
                csvFileInput.addEventListener('change', (e) => {
                    console.log('📂 CSV file selected:', e.target.files[0]?.name);
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    
                    
                    // Show loading if UIController is available
                    if (window.UIController) {
                        UIController.showLoading(true, 'Processing CSV file...');
                    }
                    
                    // Parse the CSV file
                    CsvHandler.parseFile(file)
                        .then(result => {

                            
                            // Hide loading
                            if (window.UIController) {
                                UIController.showLoading(false);
                            }
                            
                            // Show choice modal
                            return ModalManager.showCsvImportChoice(result.devices);
                        })
                        .then(choice => {
                            if (choice.action === 'replace') {
                                // Replace existing devices
                                AppState.setDevices([]);
                                choice.devices.forEach(device => {
                                    // Ensure arrays are properly formatted
                                    if (device.operatingHours && !Array.isArray(device.operatingHours)) {
                                        device.operatingHours = [];
                                    }
                                    if (device.batteryHours && !Array.isArray(device.batteryHours)) {
                                        device.batteryHours = [];
                                    }
                                    AppState.addDevice(device);
                                });
                                
                                if (window.ModalManager) {
                                    ModalManager.showCelebration(`🔄 Replaced with ${choice.devices.length} devices from CSV!`);
                                }
                                
                                if (window.UIController) {
                                    UIController.showStatus(`Replaced ${choice.devices.length} devices from CSV`, 'success');
                                }
                                
                                // Force sync with AppState and refresh display
                                devices = AppState.getDevices();
                                renderDevices();
                                updateCalculations();
                                
                            } else if (choice.action === 'add') {
                                // Add to existing devices
                                choice.devices.forEach(device => {
                                    // Ensure arrays are properly formatted
                                    if (device.operatingHours && !Array.isArray(device.operatingHours)) {
                                        device.operatingHours = [];
                                    }
                                    if (device.batteryHours && !Array.isArray(device.batteryHours)) {
                                        device.batteryHours = [];
                                    }
                                    AppState.addDevice(device);
                                });
                                
                                if (window.UIController) {
                                    UIController.showStatus(`Added ${choice.devices.length} devices from CSV`, 'success');
                                }
                                
                                // Force sync with AppState and refresh display
                                devices = AppState.getDevices();
                                renderDevices();
                                updateCalculations();
                            }
                        })
                        .catch(error => {
                            console.error('❌ CSV processing failed:', error);
                            
                            // Hide loading
                            if (window.UIController) {
                                UIController.showLoading(false);
                                UIController.showStatus(`CSV import failed: ${error.message}`, 'error');
                            }
                            
                            // Show detailed error alert
                            let errorMessage = 'CSV file could not be processed.\n\n';
                            errorMessage += `Error: ${error.message}\n\n`;
                            errorMessage += 'Please check:\n';
                            errorMessage += '• File is a valid CSV format\n';
                            errorMessage += '• Required columns: name, power, quantity\n';
                            errorMessage += '• Power values are positive numbers\n';
                            errorMessage += '• Quantity values are positive integers\n';
                            errorMessage += '• Time ranges are in correct format (e.g., "08:00 - 18:00")';
                            
                            alert(errorMessage);
                        })
                        .finally(() => {
                            // Clear the file input so the same file can be selected again
                            csvFileInput.value = '';
                        });
                });
            } else {
                console.warn('⚠️ CSV file handler setup failed:', {
                    fileInput: !!csvFileInput,
                    CsvHandler: !!window.CsvHandler,
                    ModalManager: !!window.ModalManager,
                    AppState: !!window.AppState
                });
            }
            
            // Phase 3 module integration - PDF generation
            if (downloadPdfButton) {
                downloadPdfButton.addEventListener('click', () => {
                    console.log('📄 PDF download button clicked');
                    
                    if (window.UIController) {
                        UIController.showLoading(true, 'Generating PDF report...');
                    }
                    
                    // Try PdfGenerator module first, then fallback to inline generation
                    if (window.PdfGenerator && typeof PdfGenerator.generateReport === 'function') {
                        console.log('🔧 Using PdfGenerator module');
                        PdfGenerator.generateReport()
                            .then(result => {
                                console.log('✅ PDF generation completed via module');
                                if (window.UIController) {
                                    UIController.showLoading(false);
                                }
                            })
                            .catch(error => {
                                console.error('❌ PdfGenerator failed, using fallback:', error);
                                if (window.UIController) {
                                    UIController.showStatus('Using fallback PDF generation...', 'info');
                                }
                                generatePDFReport(); // Fallback to inline function
                            });
                    } else {
                        console.log('🔧 PdfGenerator module not available, using fallback PDF generation');
                        generatePDFReport(); // Use inline function
                    }
                });
            } else {
                console.warn('⚠️ PDF download button not found');
            }
            
            // Phase 3 module integration - Share functionality with Database Storage
            const shareBtn = document.getElementById('generate-share-link');
            if (shareBtn) {
                shareBtn.addEventListener('click', async () => {
                    console.log('🔗 Share link button clicked');
                    
                    // Check if devices exist
                    if (!devices || devices.length === 0) {
                        if (window.UIController) {
                            UIController.showStatus('❌ Please add at least one device before sharing', 'error');
                        } else {
                            alert('Please add at least one device before generating a shareable link.');
                        }
                        return;
                    }
                    
                    // Get prospect information
                    const prospectName = prospectNameInput?.value?.trim() || 'User';
                    const prospectEmail = prospectEmailInput?.value?.trim() || '';
                    const prospectMobile = prospectMobileInput?.value?.trim() || '';
                    
                    // Show loading state
                    if (window.UIController) {
                        UIController.showLoading(true, 'Generating share link...');
                    }
                    
                    try {
                        // Try Backend Service V2 first (database-stored)
                        if (window.BackendServiceV2) {
                            console.log('🔧 Using Backend Service V2 for database-stored sharing');
                            
                            // Get current calculations
                            const calculations = {
                                totalEnergy: totalEnergyElement?.textContent || '0',
                                batteryCapacity: batteryCapacityElement?.textContent || '0',
                                recommendedSize: recommendedSizeElement?.textContent || '0',
                                solarevoRecommendation: solarevoRecommendationElement?.textContent || ''
                            };
                            
                            // Prepare data for backend
                            const shareData = {
                                creatorName: prospectName,
                                creatorEmail: prospectEmail,
                                creatorMobile: prospectMobile,
                                devices: devices,
                                calculations: calculations,
                                title: `${prospectName}'s BESS Calculation`,
                                description: `Battery calculation with ${devices.length} devices`
                            };
                            
                            const result = await BackendServiceV2.createSharedCalculation(shareData);
                            
                            if (result.success) {
                                console.log('✅ Database share link created:', result);
                                showSharePopup(result.url, result.method);
                            } else {
                                throw new Error('Failed to create database share link');
                            }
                            
                        } else {
                            // Fallback to URL encoding if BackendServiceV2 not available
                            console.log('🔄 BackendServiceV2 not available, using URL encoding fallback');
                            generateShareableLink();
                        }
                        
                    } catch (error) {
                        console.error('❌ Database sharing failed, using fallback:', error);
                        
                        // Fallback to existing methods
                        if (window.ShareService && typeof ShareService.generateShareLink === 'function') {
                            console.log('🔧 Using ShareService module as fallback');
                            try {
                                const result = await ShareService.generateShareLink(false); // Don't include prospect info for privacy
                                if (result && result.url) {
                                    showSharePopup(result.url, 'url-encoding');
                                } else {
                                    generateShareableLink();
                                }
                            } catch (shareServiceError) {
                                console.error('❌ ShareService also failed:', shareServiceError);
                                generateShareableLink();
                            }
                        } else {
                            console.log('🔧 Using inline share generation as final fallback');
                            generateShareableLink();
                        }
                    } finally {
                        // Hide loading state
                        if (window.UIController) {
                            UIController.showLoading(false);
                        }
                    }
                });
            } else {
                console.warn('⚠️ Share button not found');
            }            
            // Auto-save prospect data on input
            [prospectNameInput, prospectEmailInput, prospectMobileInput].forEach(input => {
                if (input) {
                    input.addEventListener('input', () => {
                        // Debounce the save operation
                        clearTimeout(window.autoSaveTimeout);
                        window.autoSaveTimeout = setTimeout(() => {
                            saveToLocalStorage();
                        }, 500); // 500ms delay to avoid excessive saves
                    });
                }
            });
            
            console.log('✅ Event listeners initialized');

        }

        function addDevice() {
            const deviceName = deviceInput?.value?.trim();
            const powerValue = parseFloat(powerInput?.value || 0);
            const quantityValue = parseInt(quantityInput?.value || 1);
            const isCritical = criticalDeviceCheckbox?.checked || false;
            
            if (!deviceName || powerValue <= 0) {
                alert('Please enter a valid device name and power consumption.');
                return;
            }
            
            const operatingHours = getSelectedHours('operating-hours-blocks');
            const batteryHours = getSelectedHours('battery-hours-blocks');
            
            if (operatingHours.length === 0) {
                alert('Please select operating hours for the device.');
                return;
            }
            
            if (batteryHours.length === 0) {
                alert('Please select battery hours for the device.');
                return;
            }
            
            const device = {
                id: generateId(),
                name: deviceName,
                power: powerValue,
                quantity: quantityValue,
                operatingHours: operatingHours,
                batteryHours: batteryHours,
                critical: isCritical
            };
            
            devices.push(device);
            
            // Sync with AppState if available
            if (window.AppState) {
                AppState.addDevice(device);
                console.log('✅ Synced new device with AppState');
            }
            
            renderDevices();
            updateCalculations();
            clearInputs();
            saveToLocalStorage();
            

        }

        function getSelectedHours(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return [];
            
            const selectedBlocks = container.querySelectorAll('.time-block.selected');
            return [...new Set(Array.from(selectedBlocks).map(block => parseInt(block.dataset.hour)))];
        }

        function clearTimeBlocks(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const blocks = container.querySelectorAll('.time-block');
            blocks.forEach(block => {
                block.classList.remove('selected');
                block.classList.remove('disabled'); // Also remove disabled state
            });
            
            const type = containerId.includes('operating') ? 'operating' : 'battery';
            updateTimeDisplay(container, type);
            
            // If clearing operating hours, also clear battery constraints
            if (type === 'operating') {
                const batteryContainer = document.getElementById('battery-hours-blocks');
                if (batteryContainer) {
                    const batteryBlocks = batteryContainer.querySelectorAll('.time-block');
                    batteryBlocks.forEach(block => {
                        block.classList.remove('disabled');
                        block.classList.remove('selected');
                    });
                    updateTimeDisplay(batteryContainer, 'battery');
                }
            }
            
            // Validate inputs after clearing time blocks
            validateInputs();
        }
        
        function applyBatteryConstraints(batteryContainer) {
            const operatingContainer = document.getElementById('operating-hours-blocks');
            if (!operatingContainer) return;
            
            const operatingBlocks = operatingContainer.querySelectorAll('.time-block.selected');
            const selectedOperatingHours = Array.from(operatingBlocks).map(block => parseInt(block.dataset.hour));
            
            const batteryBlocks = batteryContainer.querySelectorAll('.time-block');
            batteryBlocks.forEach(block => {
                const hour = parseInt(block.dataset.hour);
                
                if (selectedOperatingHours.includes(hour)) {
                    // This hour is available for battery use
                    block.classList.remove('disabled');
                } else {
                    // This hour is not available for battery use
                    block.classList.add('disabled');
                    block.classList.remove('selected');
                }
            });
            
            updateTimeDisplay(batteryContainer, 'battery');
        }

        function validateInputs() {
            const deviceName = deviceInput?.value?.trim();
            const powerValue = parseFloat(powerInput?.value || 0);
            const quantityValue = parseInt(quantityInput?.value || 1);
            
            // Check if time selections are made
            const operatingHours = getSelectedHours('operating-hours-blocks');
            const batteryHours = getSelectedHours('battery-hours-blocks');
            
            const isValid = deviceName && powerValue > 0 && quantityValue > 0 && 
                           operatingHours.length > 0 && batteryHours.length > 0;
            
            if (addDeviceButton) {
                addDeviceButton.disabled = !isValid;
                addDeviceButton.style.opacity = isValid ? '1' : '0.5';
            }
        }

        function clearInputs() {
            const inputs = ['device', 'power', 'quantity'];
            inputs.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = id === 'quantity' ? '1' : '';
                }
            });
            
            if (criticalDeviceCheckbox) {
                criticalDeviceCheckbox.checked = false;
            }
            
            clearTimeBlocks('operating-hours-blocks');
            clearTimeBlocks('battery-hours-blocks');
            validateInputs();
        }
        
        function editDevice(index) {
            const device = devices[index];
            if (!device) return;
            
            // Populate form with device data
            if (deviceInput) deviceInput.value = device.name;
            if (powerInput) powerInput.value = device.power;
            if (quantityInput) quantityInput.value = device.quantity;
            if (criticalDeviceCheckbox) criticalDeviceCheckbox.checked = device.critical || false;
            
            // Set time blocks
            setSelectedHours('operating-hours-blocks', device.operatingHours || []);
            setSelectedHours('battery-hours-blocks', device.batteryHours || []);
            
            // Remove device from array (will be re-added when form is submitted)
            devices.splice(index, 1);
            renderDevices();
            updateCalculations();
            saveToLocalStorage();
            

        }
        
        function deleteDevice(index) {
            // Prevent dual deletion by checking if device exists and adding deletion guard
            if (typeof index !== 'number' || index < 0 || index >= devices.length) {
                console.warn('⚠️ Invalid delete index or device already deleted:', index);
                return;
            }
            
            const device = devices[index];
            if (!device) {
                console.warn('⚠️ Device not found at index:', index);
                return;
            }
            
            // Add deletion guard to prevent rapid successive deletions
            if (device._deleting) {
                console.warn('⚠️ Device deletion already in progress');
                return;
            }
            
            if (confirm(`Are you sure you want to delete "${device.name}"?`)) {
                // Mark device as being deleted
                device._deleting = true;
                
                // Validate index again before deletion (in case array changed)
                if (index >= devices.length || devices[index] !== device) {
                    console.warn('⚠️ Device index changed during deletion, aborting');
                    device._deleting = false;
                    return;
                }
                
                devices.splice(index, 1);
                
                // Sync with AppState if available
                if (window.AppState) {
                    AppState.removeDevice(index);
                    console.log('✅ Synced device deletion with AppState');
                }
                
                renderDevices();
                updateCalculations();
                saveToLocalStorage();
            } else {
                // User cancelled, remove deletion flag
                device._deleting = false;
            }
        }
        
        function setSelectedHours(containerId, hours) {
            const container = document.getElementById(containerId);
            if (!container || !Array.isArray(hours)) return;
            
            // Clear all selections first
            const blocks = container.querySelectorAll('.time-block');
            blocks.forEach(block => block.classList.remove('selected'));
            
            // Select the specified hours
            hours.forEach(hour => {
                const block = container.querySelector(`[data-hour="${hour}"]`);
                if (block) {
                    block.classList.add('selected');
                }
            });
            
            const type = containerId.includes('operating') ? 'operating' : 'battery';
            updateTimeDisplay(container, type);
            
            // If this is operating hours, update battery constraints
            if (type === 'operating') {
                const batteryContainer = document.getElementById('battery-hours-blocks');
                if (batteryContainer) {
                    applyBatteryConstraints(batteryContainer);
                }
            }
            
            // Validate inputs after setting hours
            validateInputs();
        }

        function renderDevices() {
            if (!devicesContainer) return;
            
            // Check if DeviceManager module is handling rendering
            if (window.DeviceManager && typeof DeviceManager.renderDevices === 'function') {
                // Let DeviceManager handle rendering to avoid conflicts
                console.log('🎯 Delegating rendering to DeviceManager module');
                DeviceManager.renderDevices();
                return;
            }
            
            if (devices.length === 0) {
                devicesContainer.innerHTML = '<div class="no-devices">No devices added yet</div>';
                return;
            }
            
            devicesContainer.innerHTML = devices.map((device, index) => {
                // Format operating hours for display
                const operatingRanges = device.operatingHours && device.operatingHours.length > 0
                    ? getTimeRanges(device.operatingHours)
                    : [];
                const operatingDisplay = operatingRanges.length > 0 ? operatingRanges.join(', ') : 'No hours selected';
                
                // Format battery hours for display
                const batteryRanges = device.batteryHours && device.batteryHours.length > 0
                    ? getTimeRanges(device.batteryHours)
                    : [];
                const batteryDisplay = batteryRanges.length > 0 ? batteryRanges.join(', ') : 'No hours selected';
                
                return `
                    <div class="device-list-row">
                        <div class="device-name">${device.name} ${device.critical ? '✅' : ''}</div>
                        <div>${device.power}W</div>
                        <div>${device.quantity}</div>
                        <div>${operatingDisplay}</div>
                        <div>${batteryDisplay}</div>
                        <div class="device-actions">
                            <button onclick="editDevice(${index})" class="edit-btn" title="Edit" style="transform: scaleX(-1) rotate(-90deg);">✏️</button>
                            <button onclick="deleteDevice(${index})" class="delete-btn" title="Delete">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function updateCalculations() {
            let totalDailyEnergy = 0;
            let totalBatteryEnergy = 0;
            
            devices.forEach(device => {
                const devicePower = (device.power * device.quantity) / 1000;
                totalDailyEnergy += devicePower * device.operatingHours.length;
                totalBatteryEnergy += devicePower * device.batteryHours.length;
            });
            
            const batteryCapacity = totalBatteryEnergy * 1.2;
            const solarSize = totalDailyEnergy / 4.5;
            const recommendedBESS = batteryCapacity / 0.8;
            
            if (totalEnergyElement) totalEnergyElement.textContent = `${totalDailyEnergy.toFixed(2)} kWh`;
            if (batteryCapacityElement) batteryCapacityElement.textContent = `${batteryCapacity.toFixed(2)} kWh`;
            if (document.getElementById('solar-size')) document.getElementById('solar-size').textContent = `${solarSize.toFixed(2)} kWp`;
            if (recommendedSizeElement) recommendedSizeElement.textContent = `${recommendedBESS.toFixed(2)} kWh`;
            
            updateSolarEvoRecommendation(recommendedBESS);
            
            // Check if user info is complete and devices exist
            const hasDevices = devices.length > 0;
            const prospectName = prospectNameInput?.value?.trim();
            const prospectEmail = prospectEmailInput?.value?.trim();
            const prospectMobile = prospectMobileInput?.value?.trim();
            const isUserInfoComplete = prospectName && prospectEmail && prospectMobile;
            const canDownload = hasDevices && isUserInfoComplete;
            
            if (downloadPdfButton) {
                downloadPdfButton.disabled = !canDownload;
                downloadPdfButton.style.opacity = canDownload ? '1' : '0.5';
            }
            
            const shareBtn = document.getElementById('generate-share-link');
            if (shareBtn) {
                shareBtn.disabled = !canDownload;
                shareBtn.style.opacity = canDownload ? '1' : '0.5';
            }
            
            updateCharts();
            

        }

        function updateSolarEvoRecommendation(recommendedBESS) {
            if (!solarevoRecommendationElement) return;
            
            let recommendation = '';
            
            if (recommendedBESS <= 5) {
                recommendation = 'SolarEvo Compact 5kWh BESS System';
            } else if (recommendedBESS <= 10) {
                recommendation = 'SolarEvo Home 10kWh BESS System';
            } else if (recommendedBESS <= 15) {
                recommendation = 'SolarEvo Plus 15kWh BESS System';
            } else if (recommendedBESS <= 20) {
                recommendation = 'SolarEvo Pro 20kWh BESS System';
            } else {
                recommendation = 'SolarEvo Enterprise Solution (Custom)';
            }
            
            solarevoRecommendationElement.textContent = recommendation;
        }

        function updateCharts() {
            // Chart updates now handled by Charts module
            if (window.Charts && window.Charts.isInitialized()) {
                Charts.updateAll(devices);
            }

        }

        function generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }

        function saveToLocalStorage() {
            try {
                // Save devices
                localStorage.setItem('bessCalculatorDevices', JSON.stringify(devices));
                
                // Save prospect information
                const prospectData = {
                    name: prospectNameInput?.value || '',
                    email: prospectEmailInput?.value || '',
                    mobile: prospectMobileInput?.value || ''
                };
                localStorage.setItem('bessCalculatorProspectData', JSON.stringify(prospectData));
            } catch (error) {
                console.error('Failed to save to localStorage:', error);
            }
        }

        function loadFromLocalStorage() {
            try {
                // First check for shared data from URL
                const urlParams = new URLSearchParams(window.location.search);
                const sharedData = urlParams.get('s');
                
                if (sharedData) {
                    console.log('🔗 Found shared data in URL, attempting to load...');
                    try {
                        const decompressedDevices = decompressSharedData(sharedData);
                        if (decompressedDevices && decompressedDevices.length > 0) {
                            devices = decompressedDevices;
                            console.log('✅ Loaded shared devices:', devices.length);
                            
                            // Sync with AppState if available
                            if (window.AppState) {
                                AppState.setDevices(devices);
                                console.log('✅ Synced shared devices with AppState');
                            }
                            
                            renderDevices();
                            updateCalculations();
                            
                            // Clean up URL
                            window.history.replaceState({}, document.title, window.location.pathname);
                            
                            // Show success message
                            if (window.ModalManager) {
                                ModalManager.showCelebration(`🔗 Loaded shared configuration with ${devices.length} devices!`);
                            }
                            
                            return; // Don't load from localStorage if we successfully loaded from URL
                        }
                    } catch (error) {
                        console.error('❌ Failed to decompress shared data:', error);
                        if (window.UIController) {
                            UIController.showStatus('❌ Invalid share link', 'error');
                        }
                    }
                }
                
                // Load devices from localStorage if no shared data
                const savedDevices = localStorage.getItem('bessCalculatorDevices');
                if (savedDevices) {
                    devices = JSON.parse(savedDevices);
                    
                    // Sync with AppState if available
                    if (window.AppState) {
                        AppState.setDevices(devices);
                        console.log('✅ Synced loaded devices with AppState:', devices.length);
                    }
                    
                    renderDevices();
                    updateCalculations();
                    
                    // Ensure charts are updated after loading (in case charts were initialized later)
                    setTimeout(() => {
                        if (window.Charts && window.Charts.isInitialized() && devices.length > 0) {
                            console.log('🎯 Updating charts after device load...');
                            Charts.updateAll(devices);
                        }
                    }, 100);
                }
                
                // Load prospect information
                const savedProspectData = localStorage.getItem('bessCalculatorProspectData');
                if (savedProspectData) {
                    const prospectData = JSON.parse(savedProspectData);
                    if (prospectNameInput && prospectData.name) {
                        prospectNameInput.value = prospectData.name;
                    }
                    if (prospectEmailInput && prospectData.email) {
                        prospectEmailInput.value = prospectData.email;
                    }
                    if (prospectMobileInput && prospectData.mobile) {
                        prospectMobileInput.value = prospectData.mobile;
                    }
                }
            } catch (error) {
                console.error('Failed to load from localStorage:', error);
            }
        }
        
        function decompressSharedData(compressed) {
            try {
                // Handle base64url decoding (restore padding if needed)
                let base64 = compressed
                    .replace(/-/g, '+')
                    .replace(/_/g, '/');
                
                // Add padding if needed
                while (base64.length % 4) {
                    base64 += '=';
                }
                
                // Base64 decode
                const jsonString = atob(base64);
                
                // Parse JSON
                const wrapper = JSON.parse(jsonString);
                
                // Check if this uses LZ-String compression (v3)
                let data;
                if (wrapper.z) {
                    // LZ-String compressed data
                    data = JSON.parse(tryLZStringDecompression(wrapper.z, true));
                } else if (wrapper.j) {
                    // JSON data without LZ compression
                    data = JSON.parse(wrapper.j);
                } else {
                    // Legacy format - wrapper is the data itself
                    data = wrapper;
                }
                
                // Handle different versions
                if (data.v === 3 && Array.isArray(data.d)) {
                    // Version 3: Ultra-compressed format with all optimizations
                    const devices = data.d.map(deviceArray => {
                        return {
                            id: 'shared_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            name: decompressDeviceName(deviceArray[0]),
                            power: decompressPowerValue(deviceArray[1]),
                            quantity: deviceArray[2] || 1,
                            operatingHours: decompressHourArray(deviceArray[3]),
                            batteryHours: decompressHourArray(deviceArray[4]),
                            critical: deviceArray[5] === 1 || false
                        };
                    });
                    
                    console.log('📦 Decompressed v3 ultra-format (main.js):', devices.length, 'devices');
                    return devices;
                    
                } else if (data.v === 2 && Array.isArray(data.d)) {
                    // Version 2: Compact format
                    const devices = data.d.map(deviceArray => {
                        return {
                            id: 'shared_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            name: deviceArray[0],
                            power: deviceArray[1],
                            quantity: deviceArray[2] || 1,
                            operatingHours: deviceArray[3] || [],
                            batteryHours: deviceArray[4] || [],
                            critical: deviceArray[5] === 1 || false
                        };
                    });
                    
                    console.log('📦 Decompressed v2 format (main.js):', devices.length, 'devices');
                    return devices;
                    
                } else if (Array.isArray(data)) {
                    // Legacy format (array of devices with n,p,q,o,b)
                    const devices = data.map(device => {
                        return {
                            id: 'shared_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            name: device.n,
                            power: device.p,
                            quantity: device.q || 1,
                            operatingHours: device.o || [],
                            batteryHours: device.b || [],
                            critical: device.c || false
                        };
                    });
                    
                    console.log('📦 Decompressed legacy format (main.js):', devices.length, 'devices');
                    return devices;
                    
                } else if (data.d && Array.isArray(data.d)) {
                    // Legacy wrapper format
                    const devices = data.d.map(device => {
                        return {
                            id: 'shared_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            name: device.n,
                            power: device.p,
                            quantity: device.q || 1,
                            operatingHours: device.o || [],
                            batteryHours: device.b || [],
                            critical: device.c || false
                        };
                    });
                    
                    console.log('📦 Decompressed legacy wrapper format (main.js):', devices.length, 'devices');
                    return devices;
                    
                } else {
                    throw new Error('Unrecognized data format');
                }
            } catch (error) {
                console.error('❌ Error decompressing shared data (main.js):', error);
                throw new Error('Invalid or corrupted share data');
            }
        }

        function clearAllDevices() {
            if (devices.length === 0) return;
            
            if (confirm('Are you sure you want to clear all devices?')) {
                devices = [];
                
                // Sync with AppState if available
                if (window.AppState) {
                    AppState.setDevices([]);
                    console.log('✅ Synced clear all devices with AppState');
                }
                
                renderDevices();
                updateCalculations();
                saveToLocalStorage();
            }
        }

        function downloadCsvTemplate() {
            // CSV template download now handled by CsvHandler module
        }

        function handleCsvUpload(event) {
            // CSV upload now handled by ModalManager and CsvHandler modules
        }
        

        


        function generatePDFReport() {
            if (devices.length === 0) {
                alert('Please add some devices before generating a PDF report.');
                if (window.UIController) {
                    UIController.showLoading(false);
                }
                return;
            }

            // Check if jsPDF is available - try multiple ways it might be exposed
            let jsPDFClass = null;
            if (typeof window.jsPDF !== 'undefined') {
                jsPDFClass = window.jsPDF;
            } else if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
                jsPDFClass = window.jspdf.jsPDF;
            } else if (typeof jsPDF !== 'undefined') {
                jsPDFClass = jsPDF;
            }

            if (!jsPDFClass) {
                console.error('❌ jsPDF library not loaded');
                const message = 'PDF generation library not available. Please refresh the page and try again.';
                if (window.UIController) {
                    UIController.showLoading(false);
                    UIController.showStatus(message, 'error');
                } else {
                    alert(message);
                }
                return;
            }
            
            console.log('✅ jsPDF found, creating document...');
            const doc = new jsPDFClass();
            
            // First page - Report details
            doc.setFontSize(20);
            doc.text('BESS Capacity Calculator Report', 20, 20);
            
            // Try to add Bao Service logo to top right corner, but continue if it fails
            try {
                const logoImg = new Image();
                logoImg.crossOrigin = 'anonymous';
                
                logoImg.onload = function() {
                    try {
                        // Convert SVG to canvas first, then to image for better PDF compatibility
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = 200;
                        canvas.height = 200;
                        
                        // Draw a simple blue circle with white text as fallback
                        ctx.fillStyle = '#00B7FF';
                        ctx.beginPath();
                        ctx.arc(100, 100, 90, 0, 2 * Math.PI);
                        ctx.fill();
                        
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 36px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('BAO', 100, 80);
                        ctx.font = 'bold 28px Arial';
                        ctx.fillText('SERVICE', 100, 120);
                        
                        const logoDataUrl = canvas.toDataURL('image/png');
                        doc.addImage(logoDataUrl, 'PNG', 150, 10, 40, 40);
                        

                    } catch (e) {

                    }
                    generateRestOfPDF();
                };
                
                logoImg.onerror = function() {
                    try {
                        // Generate a simple fallback logo
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = 200;
                        canvas.height = 200;
                        
                        ctx.fillStyle = '#00B7FF';
                        ctx.beginPath();
                        ctx.arc(100, 100, 90, 0, 2 * Math.PI);
                        ctx.fill();
                        
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 36px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('BAO', 100, 80);
                        ctx.font = 'bold 28px Arial';
                        ctx.fillText('SERVICE', 100, 120);
                        
                        const logoDataUrl = canvas.toDataURL('image/png');
                        doc.addImage(logoDataUrl, 'PNG', 150, 10, 40, 40);
                        

                    } catch (e) {

                    }
                    generateRestOfPDF();
                };
                
                logoImg.src = 'assets/bao-service-logo.svg';
                
                // Set a timeout in case logo loading hangs
                setTimeout(() => {
                    if (!logoImg.complete) {

                        generateRestOfPDF();
                    }
                }, 3000);
            } catch (error) {

                generateRestOfPDF();
            }
            
            // Function to add disclaimer footer to any page
            function addDisclaimerFooter(doc) {
                try {
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const footerY = pageHeight - 25;
                    
                    // Add disclaimer text
                    doc.setFontSize(8);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(100, 100, 100); // Gray color
                    
                    const disclaimerText = 'DISCLAIMER: Bao Service and SolarEvo are not liable for any consequences arising from the use of this BESS Calculator. ' +
                                         'This report provides estimates only. Actual performance may vary. Please consult with qualified professionals before making any investment decisions.';
                    
                    // Split text to fit within page margins
                    const splitText = doc.splitTextToSize(disclaimerText, pageWidth - 40);
                    
                    // Calculate starting Y position for disclaimer
                    const lineHeight = 10;
                    const textHeight = splitText.length * lineHeight;
                    const startY = footerY - textHeight + 5;
                    
                    // Add disclaimer text
                    doc.text(splitText, 20, startY);
                    
                    // Add page border line above disclaimer
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.5);
                    doc.line(20, startY - 8, pageWidth - 20, startY - 8);
                    
                    // Reset text color to black for other content
                    doc.setTextColor(0, 0, 0);
                    
                } catch (error) {
                    console.warn('⚠️ Could not add disclaimer footer:', error);
                }
            }
            
            function generateRestOfPDF() {
                const prospectName = prospectNameInput?.value || 'N/A';
                
                function continueGeneratingPDF() {
                    doc.setFontSize(12);
                    doc.text(`Name: ${prospectName}`, 20, 60);
                    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 20, 70);
                
                    doc.setFontSize(14);
                    doc.text('Calculation Results:', 20, 90);
                
                const totalEnergy = totalEnergyElement?.textContent || '0 kWh';
                    const batteryCapacity = batteryCapacityElement?.textContent || '0 kWh';
                    const solarSize = document.getElementById('solar-size')?.textContent || '0 kWp';
                    const recommendedSize = recommendedSizeElement?.textContent || '0 kWh';
                    
                    doc.setFontSize(12);
                    doc.text(`Total Daily Energy: ${totalEnergy}`, 20, 105);
                    doc.text(`Battery Capacity Required: ${batteryCapacity}`, 20, 115);
                    doc.text(`Recommended Solar Size: ${solarSize}`, 20, 125);
                    doc.text(`Recommended BESS Size: ${recommendedSize}`, 20, 135);
                    
                    doc.setFontSize(14);
                    doc.text('Device List:', 20, 155);
                    
                    const tableData = devices.map(device => [
                        device.name,
                        `${device.power}W`,
                        device.quantity.toString(),
                        `${device.operatingHours.length}h`,
                        `${device.batteryHours.length}h`,
                        device.critical ? 'Yes' : 'No'
                    ]);
                    
                    doc.autoTable({
                        head: [['Device', 'Power', 'Qty', 'Op Hours', 'Bat Hours', 'Critical']],
                        body: tableData,
                        startY: 165,
                        theme: 'grid',
                        styles: { fontSize: 10 }
                    });
                    
                    const finalY = doc.lastAutoTable.finalY || 210;
                    
                    const recommendation = solarevoRecommendationElement?.textContent || 'Custom Solution Required';
                    doc.text(`SolarEvo Recommendation: ${recommendation}`, 20, finalY + 15);
                    
                    // Add disclaimer to first page
                    addDisclaimerFooter(doc);
                    
                    // Add charts on subsequent pages
                    addChartsToPages(doc);
                }
                
                continueGeneratingPDF();
            }
            
            function addChartsToPages(doc) {
                // Get chart canvases
                const energyChart = document.getElementById('energyDistributionChart');
                const deviceChart = document.getElementById('deviceEnergyChart');
                const costChart = document.getElementById('costComparisonChart');
                
                const chartPromises = [];
                
                if (energyChart) {
                    chartPromises.push(
                        html2canvas(energyChart, { backgroundColor: '#ffffff', scale: 2 })
                        .then(canvas => ({ canvas, title: 'Daily Energy Consumption' }))
                    );
                }
                
                if (deviceChart) {
                    chartPromises.push(
                        html2canvas(deviceChart, { backgroundColor: '#ffffff', scale: 2 })
                        .then(canvas => ({ canvas, title: 'Device-wise Energy Usage' }))
                    );
                }
                
                if (costChart) {
                    chartPromises.push(
                        html2canvas(costChart, { backgroundColor: '#ffffff', scale: 2 })
                        .then(canvas => ({ canvas, title: 'Estimated Monthly Cost Savings (Malaysia)' }))
                    );
                }
                
                Promise.all(chartPromises).then(chartData => {
                    chartData.forEach((chart, index) => {
                        // Add new page for each chart
                        doc.addPage();
                        
                        // Add chart title
                        doc.setFontSize(16);
                        doc.text(chart.title, 20, 30);
                        
                        // Calculate chart dimensions to fit page
                        const pageWidth = doc.internal.pageSize.getWidth();
                        const pageHeight = doc.internal.pageSize.getHeight();
                        const maxWidth = pageWidth - 40; // 20px margin on each side
                        const maxHeight = pageHeight - 80; // Leave space for title and margins
                        
                        const canvas = chart.canvas;
                        const aspectRatio = canvas.width / canvas.height;
                        
                        let chartWidth = maxWidth;
                        let chartHeight = chartWidth / aspectRatio;
                        
                        if (chartHeight > maxHeight) {
                            chartHeight = maxHeight;
                            chartWidth = chartHeight * aspectRatio;
                        }
                        
                        // Center the chart horizontally
                        const xPosition = (pageWidth - chartWidth) / 2;
                        
                        // Add chart image
                        doc.addImage(
                            canvas.toDataURL('image/png'),
                            'PNG',
                            xPosition,
                            50,
                            chartWidth,
                            chartHeight
                                                );
                    });
                    
                    // Add disclaimer to all pages
                    const totalPages = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        doc.setPage(i);
                        addDisclaimerFooter(doc);
                    }
                    
                    // Save the PDF
                    const filename = `BESS-Report-${prospectName.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
                    doc.save(filename);

                    // Hide loading and show success
                    if (window.UIController) {
                        UIController.showLoading(false);
                        UIController.showStatus('📄 PDF report downloaded successfully!', 'success');
                    }
                    
                    // Show celebration animation instead of redirect
                    showCelebrationAnimation();
                    
                    console.log('✅ PDF generated successfully:', filename);
                }).catch(error => {
                    console.error('❌ Error generating chart images:', error);
                    
                    // Add disclaimer to all pages (even without charts)
                    const totalPages = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        doc.setPage(i);
                        addDisclaimerFooter(doc);
                    }
                    
                    // Save PDF without charts if there's an error
                    const filename = `BESS-Report-${prospectName.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
                    doc.save(filename);
                    
                    // Hide loading and show warning
                    if (window.UIController) {
                        UIController.showLoading(false);
                        UIController.showStatus('📄 PDF generated (charts unavailable)', 'warning');
                    }
                    
                    // Show celebration animation even if there's an error
                    showCelebrationAnimation();
                    
                    console.log('⚠️ PDF generated without charts:', filename);
                });
            }
        }

        function showCelebrationAnimation() {
            // Create celebration modal
            const celebrationModal = document.createElement('div');
            celebrationModal.id = 'celebration-modal';
            celebrationModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                animation: fadeIn 0.3s ease-out;
            `;
            
            const celebrationContent = document.createElement('div');
            celebrationContent.style.cssText = `
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px;
                padding: 3rem 2rem;
                text-align: center;
                color: white;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                transform: scale(0.8);
                animation: bounceIn 0.6s ease-out forwards;
                max-width: 400px;
                width: 90%;
                position: relative;
            `;
            
            celebrationContent.innerHTML = `
                <div style="font-size: 4rem; margin-bottom: 1rem; animation: bounce 1s infinite;">🎉</div>
                <h2 style="margin: 0 0 1rem 0; font-size: 1.8rem; font-weight: 600;">Congratulations!</h2>
                <p style="margin: 0 0 2rem 0; font-size: 1.1rem; opacity: 0.9; line-height: 1.5;">
                    Your BESS Calculator report has been successfully generated and downloaded!
                </p>
                <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 2rem; color: #4ECDC4;">
                    <span style="font-size: 1.2rem;">📄</span>
                    <span style="font-size: 1rem; font-weight: 500;">PDF Report Ready</span>
                </div>
                <button id="celebration-close" style="
                    background: white;
                    color: #667eea;
                    border: none;
                    border-radius: 25px;
                    padding: 0.75rem 2rem;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
                ">Close</button>
            `;
            
            // Add confetti animation
            for (let i = 0; i < 50; i++) {
                const confetti = document.createElement('div');
                confetti.style.cssText = `
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: ${['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'][Math.floor(Math.random() * 5)]};
                    top: -10px;
                    left: ${Math.random() * 100}%;
                    animation: confettiFall ${2 + Math.random() * 3}s linear infinite;
                    transform: rotate(${Math.random() * 360}deg);
                `;
                celebrationContent.appendChild(confetti);
            }
            
            celebrationModal.appendChild(celebrationContent);
            document.body.appendChild(celebrationModal);
            
            // Close button functionality
            const closeButton = celebrationContent.querySelector('#celebration-close');
            closeButton.addEventListener('click', () => {
                celebrationModal.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => {
                    document.body.removeChild(celebrationModal);
                }, 300);
            });
            
            // Close on backdrop click
            celebrationModal.addEventListener('click', (e) => {
                if (e.target === celebrationModal) {
                    celebrationModal.style.animation = 'fadeOut 0.3s ease-out';
                    setTimeout(() => {
                        document.body.removeChild(celebrationModal);
                    }, 300);
                }
            });
            

        }

        function showSharePopup(shareUrl, method = 'unknown') {
            const prospectName = prospectNameInput?.value || 'User';
            const whatsappMessage = `Hi, I've created a Solar BESS calculation using SolarEvo's BESS Calculator, please review: ${shareUrl}`;
            const whatsappUrl = `https://api.whatsapp.com/send?phone=60163016170&text=${encodeURIComponent(whatsappMessage)}`;

            // Determine method info for display
            const methodInfo = {
                'database': { icon: '🗄️', text: 'Database-stored (Secure)', color: '#48bb78' },
                'url-encoding': { icon: '🔗', text: 'URL-encoded (Compact)', color: '#4299e1' },
                'fallback': { icon: '🔄', text: 'Fallback method', color: '#ed8936' },
                'unknown': { icon: '📤', text: 'Share method', color: '#6b46c1' }
            };
            const currentMethod = methodInfo[method] || methodInfo['unknown'];

            const shareContent = `
                <div style="padding: 2rem; font-family: 'Inter', sans-serif;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; width: 60px; height: 60px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            🔗
                        </div>
                        <h2 style="margin: 0 0 0.5rem 0; color: #2d3748; font-size: 1.5rem; font-weight: 600;">Share Your BESS Analysis</h2>
                        <p style="margin: 0; color: #718096; font-size: 0.9rem;">Share your battery energy storage calculation with others</p>
                    </div>
                    
                    <!-- Summary Info -->
                    <div style="background: #f7fafc; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid #e2e8f0;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: center;">
                            <div>
                                <div style="font-size: 1.2rem; font-weight: 600; color: #2d3748; margin-bottom: 0.25rem;">${prospectName}</div>
                                <div style="font-size: 0.8rem; color: #718096;">Created by</div>
                            </div>
                            <div>
                                <div style="font-size: 1.2rem; font-weight: 600; color: #2d3748; margin-bottom: 0.25rem;">${devices.length}</div>
                                <div style="font-size: 0.8rem; color: #718096;">Devices configured</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Shareable Link Section -->
                    <div style="margin-bottom: 2rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                            <label style="font-weight: 500; color: #2d3748; font-size: 0.9rem;">📋 Shareable Link</label>
                            <span style="background: ${currentMethod.color}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 500;">
                                ${currentMethod.icon} ${currentMethod.text}
                            </span>
                        </div>
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
                            <input type="text" id="share-url" value="${shareUrl}" readonly style="
                                flex: 1; 
                                padding: 0.75rem; 
                                border: 2px solid #e2e8f0; 
                                border-radius: 8px; 
                                font-size: 0.85rem; 
                                background: #f8fafc;
                                font-family: monospace;
                                color: #4a5568;
                            ">
                            <button onclick="copyShareUrl()" style="
                                padding: 0.75rem 1.25rem; 
                                background: #4299e1; 
                                color: white; 
                                border: none; 
                                border-radius: 8px; 
                                cursor: pointer; 
                                font-weight: 500;
                                font-size: 0.85rem;
                                transition: all 0.2s;
                                box-shadow: 0 2px 4px rgba(66, 153, 225, 0.3);
                            " onmouseover="this.style.background='#3182ce'" onmouseout="this.style.background='#4299e1'">
                                📋 Copy
                            </button>
                        </div>
                        <p style="font-size: 0.75rem; color: #718096; margin: 0;">Anyone with this link can view your BESS calculation</p>
                    </div>
                    
                    <!-- Share Options -->
                    <div style="margin-bottom: 2rem;">
                        <label style="display: block; font-weight: 500; color: #2d3748; margin-bottom: 1rem; font-size: 0.9rem;">📤 Share Options</label>
                        <div style="display: grid; gap: 0.75rem;">
                            <a href="${whatsappUrl}" target="_blank" style="
                                display: flex; 
                                align-items: center; 
                                justify-content: center;
                                gap: 0.75rem;
                                background: #25d366; 
                                color: white; 
                                padding: 1rem 1.5rem; 
                                text-decoration: none; 
                                border-radius: 10px; 
                                font-weight: 500;
                                font-size: 0.9rem;
                                transition: all 0.2s;
                                box-shadow: 0 3px 6px rgba(37, 211, 102, 0.3);
                            " onmouseover="this.style.background='#20ba5a'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='#25d366'; this.style.transform='translateY(0)'">
                                <span style="font-size: 1.2rem;">📱</span>
                                Send to SolarEvo via WhatsApp
                            </a>
                            <button onclick="shareViaEmail()" style="
                                display: flex; 
                                align-items: center; 
                                justify-content: center;
                                gap: 0.75rem;
                                background: #5a67d8; 
                                color: white; 
                                padding: 1rem 1.5rem; 
                                border: none; 
                                border-radius: 10px; 
                                cursor: pointer; 
                                font-weight: 500;
                                font-size: 0.9rem;
                                transition: all 0.2s;
                                box-shadow: 0 3px 6px rgba(90, 103, 216, 0.3);
                            " onmouseover="this.style.background='#4c51bf'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='#5a67d8'; this.style.transform='translateY(0)'">
                                <span style="font-size: 1.2rem;">✉️</span>
                                Share via Email
                            </button>
                        </div>
                    </div>
                    
                    <!-- Close Button -->
                    <div style="text-align: center; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
                        <button onclick="closeShareModal()" style="
                            padding: 0.75rem 2rem; 
                            background: #e2e8f0; 
                            color: #4a5568; 
                            border: none; 
                            border-radius: 8px; 
                            cursor: pointer; 
                            font-weight: 500;
                            font-size: 0.9rem;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='#cbd5e0'" onmouseout="this.style.background='#e2e8f0'">
                            Close
                        </button>
                    </div>
                </div>
            `;

            const modal = document.createElement('div');
            modal.id = 'share-modal';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.5); display: flex; justify-content: center; 
                align-items: center; z-index: 1000;
            `;
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: white; border-radius: 10px; max-width: 500px; width: 90%; 
                max-height: 80vh; overflow-y: auto;
            `;
            modalContent.innerHTML = shareContent;
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // Close modal on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeShareModal();
                }
            });
            
            // Prevent modal content clicks from closing modal
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            console.log('✅ Share modal created successfully');
        }

        function generateShareableLink() {
            if (devices.length === 0) {
                const message = 'Please add some devices before generating a shareable link.';
                if (window.UIController) {
                    UIController.showStatus(message, 'warning');
                } else {
                    alert(message);
                }
                return;
            }

            try {
                // Phase 3: Ultra-advanced compression with all optimizations
                const compactData = {
                    v: 3, // Version 3 for new ultra-compressed format
                    d: devices.map(device => {
                        const compressed = [
                            compressDeviceName(device.name), // Phase 2: Device name dictionary
                            compressPowerValue(device.power), // Phase 2: Power value dictionary
                            device.quantity || 1,
                            compressHourArray(device.operatingHours || []), // Phase 1: Hour array compression
                            compressHourArray(device.batteryHours || []) // Phase 1: Hour array compression
                        ];
                        
                        // Add critical flag only if true (saves space)
                        if (device.critical) {
                            compressed.push(1);
                        }
                        
                        return compressed;
                    })
                    // Phase 1: Remove timestamp for additional space savings
                };
                
                // Convert to JSON
                const jsonString = JSON.stringify(compactData);
                
                // Phase 3: Try LZ-String compression first
                const { compressed: lzCompressed, usedLZ } = tryLZStringCompression(jsonString);
                
                // Create final data structure
                const finalData = usedLZ ? { z: lzCompressed } : { j: lzCompressed };
                const finalJson = JSON.stringify(finalData);
                
                // Apply base64url encoding
                const encodedData = btoa(finalJson)
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, ''); // Remove padding for shorter URLs
                
                const shareUrl = `${window.location.origin}${window.location.pathname}?s=${encodedData}`;
                
                console.log('🚀 Ultra-compression stats (main.js):', {
                    original: JSON.stringify(devices).length,
                    compressed: encodedData.length,
                    reduction: Math.round((1 - encodedData.length / JSON.stringify(devices).length) * 100) + '%',
                    usedLZ: usedLZ,
                    version: 3
                });

                // Show the popup with the generated URL
                showSharePopup(shareUrl);
                
            } catch (error) {
                console.error('❌ Error in ultra-compression, falling back to v2:', error);
                
                // Fallback to v2 compression
                try {
                    const compactData = {
                        v: 2,
                        d: devices.map(device => {
                            const compressed = [
                                device.name,
                                device.power,
                                device.quantity || 1,
                                device.operatingHours || [],
                                device.batteryHours || []
                            ];
                            
                            if (device.critical) {
                                compressed.push(1);
                            }
                            
                            return compressed;
                        }),
                        t: Math.floor(Date.now() / 86400000)
                    };
                    
                    const encodedData = btoa(JSON.stringify(compactData))
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_')
                        .replace(/=/g, '');
                    
                    const shareUrl = `${window.location.origin}${window.location.pathname}?s=${encodedData}`;
                    
                    console.log('📦 Fallback v2 compression used (main.js)');
                    showSharePopup(shareUrl);
                    
                } catch (fallbackError) {
                    console.error('❌ Fallback compression also failed:', fallbackError);
                    if (window.UIController) {
                        UIController.showStatus('❌ Failed to generate share link', 'error');
                    } else {
                        alert('Failed to generate share link');
                    }
                }
            }
        }



        // Global functions for onclick handlers
        window.editDevice = editDevice;
        window.deleteDevice = deleteDevice;

        window.copyShareUrl = function() {
            const urlInput = document.getElementById('share-url');
            if (urlInput) {
                urlInput.select();
                urlInput.setSelectionRange(0, 99999);
                
                // Try modern clipboard API first, then fallback
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(urlInput.value).then(() => {
                        if (window.UIController) {
                            UIController.showStatus('🔗 Link copied to clipboard!', 'success');
                        } else {
                            alert('Link copied to clipboard!');
                        }
                    }).catch(() => {
                        // Fallback to older method
                        document.execCommand('copy');
                        if (window.UIController) {
                            UIController.showStatus('🔗 Link copied to clipboard!', 'success');
                        } else {
                            alert('Link copied to clipboard!');
                        }
                    });
                } else {
                    // Fallback for older browsers
                    document.execCommand('copy');
                    if (window.UIController) {
                        UIController.showStatus('🔗 Link copied to clipboard!', 'success');
                    } else {
                        alert('Link copied to clipboard!');
                    }
                }
            }
        };

        window.shareViaEmail = function() {
            const shareUrl = document.getElementById('share-url')?.value;
            const prospectName = prospectNameInput?.value || 'User';
            
            const subject = encodeURIComponent(`BESS Calculation from ${prospectName}`);
            const body = encodeURIComponent(`Hi,

I've created a Battery Energy Storage System (BESS) calculation using SolarEvo's BESS Calculator.

View my calculation here: ${shareUrl}

This calculation includes ${devices.length} configured devices and provides recommendations for solar and battery sizing.

Best regards,
${prospectName}`);
            
            const emailUrl = `mailto:info@baoservice.net?subject=${subject}&body=${body}`;
            window.open(emailUrl, '_blank');
            
            if (window.UIController) {
                UIController.showStatus('📧 Email client opened with share link', 'info');
            }
        };

        window.closeShareModal = function() {
            const modal = document.getElementById('share-modal');
            if (modal) {
                modal.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => {
                    modal.remove();
                }, 300);
            }
        };

        window.csvModalAction = function(action) {
            const modal = document.getElementById('csv-upload-modal');
            const pendingDevices = window.pendingCsvDevices;
            
            if (action === 'replace') {
                devices.length = 0; // Clear existing devices
                devices.push(...pendingDevices);
                alert(`${pendingDevices.length} devices replaced successfully!`);

            } else if (action === 'add') {
                devices.push(...pendingDevices);
                alert(`${pendingDevices.length} devices added successfully!`);

            }
            
            if (action !== 'cancel') {
                renderDevices();
                updateCalculations();
                saveToLocalStorage();
            }
            
            // Clean up
            if (modal) {
                modal.remove();
            }
            delete window.pendingCsvDevices;
        };

    } catch (error) {
        console.error('❌ Error initializing application:', error);
    }
}

// Wait for all modules to be available before initializing
function waitForModules() {
    console.log('🔍 waitForModules() called');
    const requiredModules = [
        'AppState', 'TimeBlocks', 'UIController', 'CsvHandler', 'ModalManager', 'Charts',
        'StorageManager', 'Calculations', 'PdfGenerator', 'ShareService', 'DeviceManager'
    ];
    
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    const checkModules = () => {
        attempts++;
        const missing = requiredModules.filter(module => !window[module]);
        
        console.log(`🔍 Module check ${attempts}/${maxAttempts}:`, {
            available: requiredModules.filter(module => window[module]),
            missing: missing
        });
        
        if (missing.length === 0) {
            console.log('✅ All modules loaded successfully:', requiredModules);
            initializeApplication();
        } else if (attempts >= maxAttempts) {
            console.warn(`⚠️ Timeout waiting for modules. Missing: ${missing.join(', ')}`);
            console.log('🚀 Initializing with available modules...');
            initializeApplication();
        } else {
            console.log(`⏳ Waiting for modules (${attempts}/${maxAttempts}): ${missing.join(', ')}`);
            setTimeout(checkModules, 100);
        }
    };
    
    checkModules();
}

// Initialize Backend Service V2 (async initialization)
async function initializeBackendService() {
    try {
        console.log('🔧 Initializing Backend Service V2...');
        
        // Import the backend service
        const BackendServiceV2 = (await import('./js/services/backend-service-v2.js')).default;
        
        // Initialize the service
        await BackendServiceV2.init();
        
        // Make it globally available
        window.BackendServiceV2 = BackendServiceV2;
        
        const status = BackendServiceV2.getStatus();
        console.log('🔧 Backend Service V2 Status:', status);
        
        if (status.fallbackMode) {
            console.log('⚠️ Backend Service in fallback mode - sharing will use URL encoding');
        } else {
            console.log('✅ Backend Service ready - database sharing available');
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize Backend Service V2:', error);
        console.log('🔄 Continuing without backend service - fallback mode only');
    }
}