// CSV Handler Module - CSV import/export functionality for BESS Calculator
window.CsvHandler = (function() {
    'use strict';
    
    
    // Private variables
    let isProcessing = false;
    
    // CSV templates and formats
    const CSV_HEADERS = ['name', 'power', 'quantity', 'operatinghours', 'batteryhours', 'critical'];
    const TEMPLATE_DEVICES = [
        {
            name: 'Air Conditioner',
            power: 2000,
            quantity: 2,
            operatinghours: '08:00 - 18:00',
            batteryhours: '18:00 - 22:00',
            critical: 'false'
        },
        {
            name: 'Refrigerator',
            power: 150,
            quantity: 1,
            operatinghours: '00:00 - 24:00',
            batteryhours: '18:00 - 08:00',
            critical: 'true'
        },
        {
            name: 'LED Lights',
            power: 15,
            quantity: 10,
            operatinghours: '18:00 - 24:00',
            batteryhours: '18:00 - 24:00',
            critical: 'false'
        },
        {
            name: 'Television',
            power: 120,
            quantity: 1,
            operatinghours: '19:00 - 23:00',
            batteryhours: '19:00 - 23:00',
            critical: 'false'
        },
        {
            name: 'Washing Machine',
            power: 500,
            quantity: 1,
            operatinghours: '08:00 - 10:00',
            batteryhours: '',
            critical: 'false'
        },
        {
            name: 'Router',
            power: 10,
            quantity: 1,
            operatinghours: '00:00 - 24:00',
            batteryhours: '18:00 - 08:00',
            critical: 'true'
        }
    ];
    
    // Private utility functions
    function validateCsvData(data) {
        const errors = [];
        const warnings = [];
        
        if (!Array.isArray(data) || data.length === 0) {
            errors.push('CSV file contains no data');
            return { valid: false, errors, warnings };
        }
        
        // Check headers
        const headers = Object.keys(data[0]);
        const requiredHeaders = ['name', 'power', 'quantity'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
        }
        
        // Validate each row
        data.forEach((row, index) => {
            const rowNum = index + 1;
            
            // Validate required fields
            if (!row.name || row.name.trim() === '') {
                errors.push(`Row ${rowNum}: Device name is required`);
            }
            
            // Validate power
            const power = parseFloat(row.power);
            if (isNaN(power) || power <= 0) {
                errors.push(`Row ${rowNum}: Power must be a positive number`);
            } else if (power > 50000) {
                warnings.push(`Row ${rowNum}: Power seems very high (${power}W)`);
            }
            
            // Validate quantity
            const quantity = parseInt(row.quantity);
            if (isNaN(quantity) || quantity <= 0) {
                errors.push(`Row ${rowNum}: Quantity must be a positive integer`);
            } else if (quantity > 100) {
                warnings.push(`Row ${rowNum}: Quantity seems very high (${quantity})`);
            }
            
            // Validate critical field (optional)
            if (row.critical && row.critical !== 'true' && row.critical !== 'false' && row.critical !== '') {
                warnings.push(`Row ${rowNum}: Critical field should be 'true' or 'false' (found: '${row.critical}')`);
            }
            
            // Validate time blocks (optional)
            if (row.operatinghours && row.operatinghours.trim() !== '') {
                const operatingValid = validateTimeString(row.operatinghours);
                if (!operatingValid.valid) {
                    errors.push(`Row ${rowNum}: Invalid operating hours format. Use format like "08:00 - 18:00" or "18:00 - 22:00"`);
                }
            }
            
            if (row.batteryhours && row.batteryhours.trim() !== '') {
                const batteryValid = validateTimeString(row.batteryhours);
                if (!batteryValid.valid) {
                    errors.push(`Row ${rowNum}: Invalid battery hours format. Use format like "18:00 - 08:00" or leave empty`);
                }
            }
            
            // Warning if device has battery hours but no operating hours
            if (row.batteryhours && row.batteryhours.trim() !== '' && (!row.operatinghours || row.operatinghours.trim() === '')) {
                warnings.push(`Row ${rowNum}: Device has battery hours but no operating hours specified`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            rowCount: data.length
        };
    }
    
    function validateTimeString(timeStr) {
        if (!timeStr || timeStr.trim() === '') {
            return { valid: true, hours: [] };
        }
        
        try {
            return parseTimeRangesFromString(timeStr);
        } catch (error) {
            return { valid: false, hours: [] };
        }
    }
    
    function parseTimeRangesFromString(timeString) {
        const hours = [];
        
        // Split by comma to handle multiple ranges
        const parts = timeString.split(',');
        
        parts.forEach(part => {
            part = part.trim();
            
            // Check if it's a time range (e.g., "18:00 - 22:00" or "18:00-22:00")
            if (part.includes('-') && part.includes(':')) {
                const [startTime, endTime] = part.split('-').map(t => t.trim());
                const startHour = parseInt(startTime.split(':')[0]);
                let endHour = parseInt(endTime.split(':')[0]);
                
                if (!isNaN(startHour) && !isNaN(endHour)) {
                    // Special case: 00:00 - 24:00 means all hours
                    if (startTime.includes('00:00') && endTime.includes('24:00')) {
                        for (let h = 0; h < 24; h++) {
                            if (!hours.includes(h)) {
                                hours.push(h);
                            }
                        }
                    } else {
                        // Handle end time of 24:00 as next day 00:00
                        const originalEndHour = endHour;
                        if (endHour === 24) {
                            endHour = 0;
                        }
                        
                        if (startHour < originalEndHour && originalEndHour <= 24) {
                            // Normal range (e.g., 08:00 - 18:00 or 20:00 - 24:00)
                            for (let h = startHour; h < originalEndHour; h++) {
                                if (h >= 0 && h <= 23 && !hours.includes(h)) {
                                    hours.push(h);
                                }
                            }
                        } else if (startHour > endHour && originalEndHour < startHour) {
                            // Wraparound case (e.g., 22:00 - 02:00)
                            for (let h = startHour; h < 24; h++) {
                                if (!hours.includes(h)) {
                                    hours.push(h);
                                }
                            }
                            for (let h = 0; h < originalEndHour; h++) {
                                if (!hours.includes(h)) {
                                    hours.push(h);
                                }
                            }
                        }
                    }
                }
            } else {
                // Try to parse as hour number (legacy format)
                const hour = parseInt(part);
                if (!isNaN(hour) && hour >= 0 && hour <= 23 && !hours.includes(hour)) {
                    hours.push(hour);
                }
            }
        });
        
        return {
            valid: hours.length > 0,
            hours: hours.sort((a, b) => a - b)
        };
    }
    
    function convertCsvToDevices(csvData) {
        return csvData.map(row => {
            const device = {
                id: 'csv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                name: row.name.trim(),
                power: parseFloat(row.power),
                quantity: parseInt(row.quantity),
                operatingHours: [],
                batteryHours: [],
                critical: row.critical === 'true'
            };
            
            // Parse operating hours
            if (row.operatinghours) {
                const operatingValid = validateTimeString(row.operatinghours);
                if (operatingValid.valid) {
                    device.operatingHours = operatingValid.hours;
                }
            }
            
            // Parse battery hours
            if (row.batteryhours) {
                const batteryValid = validateTimeString(row.batteryhours);
                if (batteryValid.valid) {
                    device.batteryHours = batteryValid.hours;
                }
            }
            
            return device;
        });
    }
    
    function convertDevicesToCsv(devices) {
        return devices.map(device => ({
            name: device.name,
            power: device.power,
            quantity: device.quantity,
            operatinghours: device.operatingHours ? formatHoursToTimeRange(device.operatingHours) : '',
            batteryhours: device.batteryHours ? formatHoursToTimeRange(device.batteryHours) : '',
            critical: device.critical ? 'true' : 'false'
        }));
    }
    
    function formatHoursToTimeRange(hours) {
        if (!hours || hours.length === 0) return '';
        
        // Sort hours
        const sortedHours = [...hours].sort((a, b) => a - b);
        const ranges = [];
        let rangeStart = sortedHours[0];
        let rangeEnd = sortedHours[0];
        
        for (let i = 1; i < sortedHours.length; i++) {
            if (sortedHours[i] === rangeEnd + 1) {
                // Continue the current range
                rangeEnd = sortedHours[i];
            } else {
                // End current range and start a new one
                ranges.push(formatRange(rangeStart, rangeEnd));
                rangeStart = sortedHours[i];
                rangeEnd = sortedHours[i];
            }
        }
        
        // Add the last range
        ranges.push(formatRange(rangeStart, rangeEnd));
        
        return ranges.join(', ');
    }
    
    function formatRange(start, end) {
        const formatHour = (h) => `${h.toString().padStart(2, '0')}:00`;
        
        if (start === end) {
            return `${formatHour(start)} - ${formatHour(start + 1)}`;
        } else {
            return `${formatHour(start)} - ${formatHour(end + 1)}`;
        }
    }
    
    function arrayToCsv(data) {
        if (!data || data.length === 0) return '';
        
        // Use consistent header order that matches Papa Parse transformHeader
        const headers = CSV_HEADERS; // Ensure consistent column order
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                // Escape quotes and wrap in quotes if contains comma or quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    function downloadCsv(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            console.error('❌ Browser does not support file download');
            throw new Error('Browser does not support file download');
        }
    }
    
    // Public API
    const publicAPI = {
        // Parse CSV file content
        parseFile: function(file) {
            return new Promise((resolve, reject) => {
                if (isProcessing) {
                    reject(new Error('CSV processing already in progress. Please wait...'));
                    return;
                }
                
                if (!file) {
                    reject(new Error('No file provided for parsing'));
                    return;
                }
                
                // Validate file type
                if (!file.name.toLowerCase().endsWith('.csv')) {
                    reject(new Error('Please select a valid CSV file'));
                    return;
                }
                
                // Validate file size (limit to 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    reject(new Error('File size too large. Please select a file smaller than 5MB'));
                    return;
                }
                
                isProcessing = true;
                
                // Show loading indicator
                if (window.UIController) {
                    UIController.showLoading(true, `Processing ${file.name}...`);
                }
                
                // Debug logging
                console.log('🔍 Starting CSV parsing:', {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type
                });
                
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: function(header) {
                        const cleaned = header.toLowerCase().trim().replace(/\s+/g, '');
                        console.log('🔄 Header transformation:', header, '->', cleaned);
                        return cleaned;
                    },
                    complete: function(results) {
                        try {
                            // Debug logging for Papa Parse results
                            console.log('📊 Papa Parse results:', {
                                dataLength: results.data ? results.data.length : 0,
                                errors: results.errors,
                                meta: results.meta,
                                firstRow: results.data && results.data.length > 0 ? results.data[0] : null
                            });
                            
                            // Hide loading indicator
                            if (window.UIController) {
                                UIController.showLoading(false);
                            }
                            
                            // Check for parsing errors
                            if (results.errors && results.errors.length > 0) {
                                console.error('❌ Papa Parse errors:', results.errors);
                                reject(new Error(`CSV parsing failed: ${results.errors.map(e => e.message).join(', ')}`));
                                return;
                            }
                            
                            // Check if data exists
                            if (!results.data || results.data.length === 0) {
                                console.error('❌ No data found in CSV file');
                                reject(new Error('CSV file contains no data or all rows are empty'));
                                return;
                            }
                            
                            // Validate data
                            const validation = validateCsvData(results.data);
                            console.log('✅ CSV validation result:', validation);
                            
                            if (!validation.valid) {
                                const errorMessage = `CSV validation failed:\n${validation.errors.join('\n')}`;
                                reject(new Error(errorMessage));
                                return;
                            }
                            
                            // Convert to devices
                            const devices = convertCsvToDevices(results.data);
                            console.log('🔧 Converted devices:', devices);
                            
                            // Prepare success response with detailed information
                            const response = {
                                success: true,
                                devices: devices,
                                warnings: validation.warnings,
                                rowCount: validation.rowCount,
                                fileName: file.name,
                                fileSize: file.size,
                                processingTime: new Date().toLocaleTimeString()
                            };
                            
                            // Show success message with details
                            if (window.UIController) {
                                const message = `📊 Successfully processed ${devices.length} devices from ${file.name}`;
                                const details = validation.warnings.length > 0 ? 
                                    `${message}\n⚠️ ${validation.warnings.length} warnings found` : message;
                                UIController.showStatus(details, 'success');
                            }
                            
                            resolve(response);
                            
                        } catch (error) {
                            console.error('❌ Error in CSV processing complete handler:', error);
                            // Hide loading indicator on error
                            if (window.UIController) {
                                UIController.showLoading(false);
                                UIController.showStatus(`❌ Failed to process ${file.name}: ${error.message}`, 'error');
                            }
                            reject(error);
                        } finally {
                            isProcessing = false;
                        }
                    },
                    error: function(error) {
                        console.error('❌ Papa Parse error:', error);
                        isProcessing = false;
                        
                        // Hide loading indicator
                        if (window.UIController) {
                            UIController.showLoading(false);
                            UIController.showStatus(`❌ CSV parsing failed: ${error.message}`, 'error');
                        }
                        
                        reject(new Error(`CSV parsing failed: ${error.message}. Please check that your file is a valid CSV format.`));
                    }
                });
            });
        },
        
        // Export devices to CSV
        exportDevices: function(devices, filename) {
            return new Promise((resolve, reject) => {
                try {
                    if (!devices || devices.length === 0) {
                        reject(new Error('No devices to export. Please add some devices first.'));
                        return;
                    }
                    
                    // Show loading indicator
                    if (window.UIController) {
                        UIController.showLoading(true, 'Generating CSV export...');
                    }
                    
                    // Add processing delay for user feedback
                    setTimeout(() => {
                        try {
                            const csvData = convertDevicesToCsv(devices);
                            const csvContent = arrayToCsv(csvData);
                            
                            // Use timestamp for filename
                            const timestamp = new Date().toISOString().split('T')[0];
                            const exportFilename = filename || `bess-devices-export-${timestamp}.csv`;
                            downloadCsv(csvContent, exportFilename);
                            
                            // Hide loading indicator
                            if (window.UIController) {
                                UIController.showLoading(false);
                                UIController.showStatus(`📤 Successfully exported ${devices.length} devices to ${exportFilename}`, 'success');
                            }
                            
                            // Dispatch success event
                            const event = new CustomEvent('csvExported', {
                                detail: { 
                                    filename: exportFilename,
                                    deviceCount: devices.length,
                                    timestamp: new Date().toISOString()
                                }
                            });
                            document.dispatchEvent(event);
                            
                            resolve({
                                success: true,
                                filename: exportFilename,
                                deviceCount: devices.length,
                                timestamp: new Date().toISOString()
                            });
                            
                        } catch (error) {
                            // Hide loading indicator on error
                            if (window.UIController) {
                                UIController.showLoading(false);
                                UIController.showStatus(`❌ Export failed: ${error.message}`, 'error');
                            }
                            reject(error);
                        }
                    }, 200);
                    
                } catch (error) {
                    // Hide loading indicator on error
                    if (window.UIController) {
                        UIController.showLoading(false);
                        UIController.showStatus(`❌ Export failed: ${error.message}`, 'error');
                    }
                    reject(error);
                }
            });
        },
        
        // Download CSV template
        downloadTemplate: function() {
            return new Promise((resolve, reject) => {
                try {
                    // Show loading indicator if UIController is available
                    if (window.UIController) {
                        UIController.showLoading(true, 'Generating CSV template...');
                    }
                    
                    // Generate clean CSV without comments (Papa Parse friendly)
                    const csvContent = arrayToCsv(TEMPLATE_DEVICES);
                    const filename = 'bess-devices-template.csv';
                    
                    // Add small delay to show loading indicator
                    setTimeout(() => {
                        downloadCsv(csvContent, filename);
                        
                        // Hide loading indicator
                        if (window.UIController) {
                            UIController.showLoading(false);
                            UIController.showStatus('📥 CSV template downloaded successfully!', 'success');
                        }
                        
                        // Dispatch success event
                        const event = new CustomEvent('csvTemplateDownloaded', {
                            detail: { 
                                filename: filename,
                                sampleDevices: TEMPLATE_DEVICES.length
                            }
                        });
                        document.dispatchEvent(event);
                        
                        resolve({
                            success: true,
                            filename: filename,
                            sampleDevices: TEMPLATE_DEVICES.length
                        });
                    }, 300);
                    
                } catch (error) {
                    // Hide loading indicator on error
                    if (window.UIController) {
                        UIController.showLoading(false);
                        UIController.showStatus('❌ Failed to download CSV template', 'error');
                    }
                    reject(error);
                }
            });
        },
        
        // Validate CSV content before processing
        validateCsvContent: function(content) {
            try {
                return new Promise((resolve) => {
                    Papa.parse(content, {
                        header: true,
                        skipEmptyLines: true,
                        transformHeader: function(header) {
                            return header.toLowerCase().trim().replace(/\s+/g, '');
                        },
                        complete: function(results) {
                            const validation = validateCsvData(results.data);
                            resolve(validation);
                        },
                        error: function(error) {
                            resolve({
                                valid: false,
                                errors: [`CSV parsing failed: ${error.message}`],
                                warnings: []
                            });
                        }
                    });
                });
            } catch (error) {
                return Promise.resolve({
                    valid: false,
                    errors: [error.message],
                    warnings: []
                });
            }
        },
        
        // Get template info
        getTemplateInfo: function() {
            return {
                headers: CSV_HEADERS,
                sampleDevices: TEMPLATE_DEVICES.length,
                requiredFields: ['name', 'power', 'quantity'],
                optionalFields: ['operatinghours', 'batteryhours', 'critical']
            };
        },
        
        // Check if CSV processing is available
        isAvailable: function() {
            return typeof Papa !== 'undefined';
        },
        
        // Get processing status
        isProcessing: function() {
            return isProcessing;
        }
    };
    
    return publicAPI;
})(); 
