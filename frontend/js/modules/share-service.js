// Share Service Module - Shareable link generation for BESS Calculator
window.ShareService = (function() {
    'use strict';
    
    
    // Private variables
    let isGenerating = false;
    
    // Optimization dictionaries
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
    
    // URL configuration
    const URL_CONFIG = {
        maxLength: 2000, // Maximum URL length for compatibility
        baseUrl: window.location.origin + window.location.pathname,
        paramPrefix: 'bess_', // Keep for backward compatibility detection
        version: '1.0'
    };
    
    // Advanced compression utility functions
    function compressHourArray(hours) {
        if (!hours || hours.length === 0) return 0;
        
        // Convert hour array to 24-bit integer using bit flags
        let bitFlag = 0;
        hours.forEach(hour => {
            if (hour >= 0 && hour <= 23) {
                bitFlag |= (1 << hour);
            }
        });
        
        // Convert to hex for compact representation
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
        // Check if device name exists in dictionary
        const dictId = DEVICE_DICTIONARY[name];
        if (dictId) {
            return dictId; // Return dictionary index
        }
        
        // For uncommon devices, return name as-is but try to shorten
        return name.length > 20 ? name.substring(0, 20) + '…' : name;
    }
    
    function decompressDeviceName(compressed) {
        // Check if it's a dictionary index
        if (typeof compressed === 'number' && REVERSE_DEVICE_DICTIONARY[compressed]) {
            return REVERSE_DEVICE_DICTIONARY[compressed];
        }
        
        // Return as-is if it's a string
        return compressed;
    }
    
    function compressPowerValue(power) {
        // Check if power value exists in dictionary
        const dictId = POWER_DICTIONARY[power];
        return dictId || power; // Return dictionary index or original value
    }
    
    function decompressPowerValue(compressed) {
        // Check if it's a dictionary index
        if (typeof compressed === 'number' && REVERSE_POWER_DICTIONARY[compressed]) {
            return REVERSE_POWER_DICTIONARY[compressed];
        }
        
        // Return as-is
        return compressed;
    }
    
    function tryLZStringCompression(jsonString) {
        try {
            if (typeof LZString !== 'undefined' && LZString.compressToBase64) {
                const compressed = LZString.compressToBase64(jsonString);
                // Only use LZ compression if it's actually smaller
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

    // Private utility functions
    function compressDeviceData(devices) {
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
            const encoded = btoa(finalJson)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, ''); // Remove padding for shorter URLs
            
            console.log('🚀 Ultra-compression stats:', {
                original: JSON.stringify(devices).length,
                compressed: encoded.length,
                reduction: Math.round((1 - encoded.length / JSON.stringify(devices).length) * 100) + '%',
                usedLZ: usedLZ,
                version: 3
            });
            
            return encoded;
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
                
                const jsonString = JSON.stringify(compactData);
                const encoded = btoa(jsonString)
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '');
                
                console.log('📦 Fallback v2 compression used');
                return encoded;
            } catch (fallbackError) {
                console.error('❌ Fallback compression also failed:', fallbackError);
                throw new Error('Failed to compress device data');
            }
        }
    }
    
    function decompressDeviceData(compressed) {
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
                
                console.log('📦 Decompressed v3 ultra-format:', devices.length, 'devices');
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
                
                console.log('📦 Decompressed v2 format:', devices.length, 'devices');
                return devices;
                
            } else if (Array.isArray(data)) {
                // Old format from main.js (array of devices with n,p,q,o,b)
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
                
                console.log('📦 Decompressed legacy array format:', devices.length, 'devices');
                return devices;
                
            } else if (data.d && Array.isArray(data.d)) {
                // Main.js format with wrapper object
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
                
                console.log('📦 Decompressed legacy wrapper format:', devices.length, 'devices');
                return devices;
                
            } else {
                throw new Error('Unrecognized data format');
            }
        } catch (error) {
            console.error('❌ Error decompressing device data:', error);
            throw new Error('Invalid or corrupted share data');
        }
    }
    
    function generateShareUrl(devices, prospectInfo = null) {
        try {
            // Use single parameter approach for maximum URL compression
            const compressedData = compressDeviceData(devices);
            const fullUrl = `${URL_CONFIG.baseUrl}?s=${compressedData}`;
            
            // Check URL length
            if (fullUrl.length > URL_CONFIG.maxLength) {
                console.warn('⚠️ Generated URL is very long:', fullUrl.length);
            } else {
                console.log('✅ Generated compact URL:', fullUrl.length, 'characters');
            }
            
            return fullUrl;
        } catch (error) {
            console.error('❌ Error generating share URL:', error);
            throw error;
        }
    }
    
    function copyToClipboard(text) {
        return new Promise((resolve, reject) => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                // Modern clipboard API
                navigator.clipboard.writeText(text)
                    .then(() => resolve(true))
                    .catch(err => {
                        console.warn('⚠️ Clipboard API failed, trying fallback');
                        copyToClipboardFallback(text) ? resolve(true) : reject(err);
                    });
            } else {
                // Fallback method
                copyToClipboardFallback(text) ? resolve(true) : reject(new Error('Clipboard not supported'));
            }
        });
    }
    
    function copyToClipboardFallback(text) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            return successful;
        } catch (error) {
            console.error('❌ Fallback clipboard copy failed:', error);
            return false;
        }
    }
    
    // Public API
    const publicAPI = {
        // Generate shareable link
        generateShareLink: function(includeProspectInfo = false) {
            if (isGenerating) {
                return Promise.reject(new Error('Share link generation already in progress'));
            }
            
            return new Promise((resolve, reject) => {
                try {
                    isGenerating = true;
                    
                    // Get devices
                    const devices = AppState.getDevices();
                    if (!devices || devices.length === 0) {
                        throw new Error('No devices to share');
                    }
                    
                    // Note: Never include prospect personal info in shared links for privacy
                    const prospectInfo = null;
                    
                    // Generate URL (only with device data, no personal info)
                    const shareUrl = generateShareUrl(devices, prospectInfo);
                    
                    
                    // Dispatch success event
                    const event = new CustomEvent('shareLinkGenerated', {
                        detail: { 
                            url: shareUrl,
                            deviceCount: devices.length,
                            includeProspectInfo: !!prospectInfo
                        }
                    });
                    document.dispatchEvent(event);
                    
                    resolve({
                        success: true,
                        url: shareUrl,
                        deviceCount: devices.length,
                        urlLength: shareUrl.length
                    });
                    
                } catch (error) {
                    console.error('❌ Share link generation failed:', error);
                    
                    // Dispatch error event
                    const event = new CustomEvent('shareLinkError', {
                        detail: { error: error.message }
                    });
                    document.dispatchEvent(event);
                    
                    reject(error);
                } finally {
                    isGenerating = false;
                }
            });
        },
        
        // Copy share link to clipboard
        copyShareLink: function() {
            return this.generateShareLink()
                .then(result => {
                    return copyToClipboard(result.url)
                        .then(() => {
                            
                            // Dispatch copy success event
                            const event = new CustomEvent('shareLinkCopied', {
                                detail: { url: result.url }
                            });
                            document.dispatchEvent(event);
                            
                            return {
                                ...result,
                                copied: true
                            };
                        });
                });
        },
        
        // Load configuration from URL
        loadFromUrl: function() {
            return new Promise((resolve, reject) => {
                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    
                    // Check for new compact format first (single parameter 's')
                    let data = urlParams.get('s');
                    let isNewFormat = !!data;
                    
                    // Fall back to old format for backward compatibility
                    if (!data) {
                        data = urlParams.get(`${URL_CONFIG.paramPrefix}data`);
                        const version = urlParams.get(`${URL_CONFIG.paramPrefix}v`);
                        
                        if (!version || !data) {
                            resolve({ hasSharedData: false });
                            return;
                        }
                    }
                    
                    if (!data) {
                        resolve({ hasSharedData: false });
                        return;
                    }
                    
                    console.log(`🔗 Loading ${isNewFormat ? 'new compact' : 'legacy'} shared configuration...`);
                    
                    // Decompress device data
                    const devices = decompressDeviceData(data);
                    
                    // Get metadata (for legacy format only)
                    const timestamp = isNewFormat ? null : urlParams.get(`${URL_CONFIG.paramPrefix}t`);
                    
                    
                    resolve({
                        hasSharedData: true,
                        devices: devices,
                        metadata: {
                            version: isNewFormat ? '2.0' : URL_CONFIG.version,
                            timestamp: timestamp ? parseInt(timestamp) : null,
                            deviceCount: devices.length,
                            format: isNewFormat ? 'compact' : 'legacy'
                        }
                    });
                    
                } catch (error) {
                    console.error('❌ Error loading from URL:', error);
                    reject(error);
                }
            });
        },
        
        // Apply shared configuration
        applySharedConfiguration: function(config) {
            return new Promise((resolve, reject) => {
                try {
                    
                    if (!config.hasSharedData) {
                        resolve({ applied: false });
                        return;
                    }
                    
                    // Clear existing devices
                    AppState.setDevices([]);
                    
                    // Add shared devices
                    config.devices.forEach(device => {
                        AppState.addDevice(device);
                    });
                    
                    // Note: Personal information is never shared in URLs for privacy
                    
                    // Trigger UI updates
                    const event = new CustomEvent('appStateChange');
                    document.dispatchEvent(event);
                    
                    
                    // Dispatch success event
                    const successEvent = new CustomEvent('sharedConfigurationApplied', {
                        detail: { 
                            deviceCount: config.devices.length,
                            hasProspectInfo: false
                        }
                    });
                    document.dispatchEvent(successEvent);
                    
                    resolve({
                        applied: true,
                        deviceCount: config.devices.length,
                        hasProspectInfo: false
                    });
                    
                } catch (error) {
                    console.error('❌ Error applying shared configuration:', error);
                    reject(error);
                }
            });
        },
        
        // Check if current URL has shared data
        hasSharedData: function() {
            const urlParams = new URLSearchParams(window.location.search);
            return !!(urlParams.get(`${URL_CONFIG.paramPrefix}v`) && urlParams.get(`${URL_CONFIG.paramPrefix}data`));
        },
        
        // Get share URL info without generating
        getShareInfo: function() {
            const devices = AppState.getDevices();
            const validation = UIController.validateProspectInfo();
            
            return {
                canShare: devices && devices.length > 0,
                deviceCount: devices ? devices.length : 0,
                hasValidProspectInfo: validation.valid,
                estimatedUrlLength: devices ? compressDeviceData(devices).length + 200 : 0 // rough estimate
            };
        },
        
        // Check if generation is in progress
        isGenerating: function() {
            return isGenerating;
        }
    };
    
    return publicAPI;
})(); 
