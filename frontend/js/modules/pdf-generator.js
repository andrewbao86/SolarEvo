// PDF Generator Module - PDF report generation with charts for BESS Calculator
window.PdfGenerator = (function() {
    'use strict';
    
    
    // Private variables
    let isGenerating = false;
    
    // Private utility functions
    function validateRequirements() {
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
            throw new Error('jsPDF library not found');
        }
        
        // Store the jsPDF class globally for use in other functions
        window._pdfJsPDFClass = jsPDFClass;
        
        // Check if devices exist
        const devices = AppState.getDevices();
        if (!devices || devices.length === 0) {
            throw new Error('No devices found');
        }
        
        // Check if user info is complete
        const prospectName = document.getElementById('prospect-name')?.value?.trim();
        const prospectEmail = document.getElementById('prospect-email')?.value?.trim();
        
        if (!prospectName || !prospectEmail) {
            throw new Error('Prospect name and email are required');
        }
        
        return { devices, prospectName, prospectEmail };
    }
    
    function createPdfDocument() {
        const jsPDFClass = window._pdfJsPDFClass || window.jsPDF || (window.jspdf && window.jspdf.jsPDF) || jsPDF;
        const doc = new jsPDFClass();
        
        // Set document properties
        doc.setProperties({
            title: 'BESS Calculator Report',
            subject: 'Battery Energy Storage System Analysis',
            author: 'SolarEvo - Bao Service',
            creator: 'BESS Calculator'
        });
        
        return doc;
    }
    
    function addHeaderAndLogo(doc) {
        return new Promise((resolve) => {
            // Add title
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('BESS Calculator Report', 20, 30);
            
            // Try to add logo
            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            
            logoImg.onload = function() {
                try {
                    doc.addImage(logoImg, 'PNG', 150, 10, 40, 40);
                } catch (error) {
                    console.warn('⚠️ Could not add logo to PDF:', error);
                }
                resolve(doc);
            };
            
            logoImg.onerror = function() {
                console.warn('⚠️ Logo failed to load, creating fallback');
                // Create fallback logo using canvas
                createFallbackLogo(doc);
                resolve(doc);
            };
            
            // Set timeout for logo loading
            setTimeout(() => {
                console.warn('⚠️ Logo loading timeout, continuing without logo');
                resolve(doc);
            }, 3000);
            
            logoImg.src = 'assets/bao-service-logo.svg';
        });
    }
    
    function createFallbackLogo(doc) {
        try {
            // Create a simple text-based logo as fallback
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('BAO SERVICE', 150, 25);
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text('SolarEvo', 150, 32);
        } catch (error) {
            console.warn('⚠️ Could not create fallback logo:', error);
        }
    }
    
    function addBasicInfo(doc, prospectName, prospectEmail) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        
        // Add prospect information
        doc.text(`Name: ${prospectName}`, 20, 60);
        doc.text(`Email: ${prospectEmail}`, 20, 70);
        doc.text(`Report Generated: ${new Date().toLocaleString()}`, 20, 80);
        
        // Add summary calculations
        const devices = AppState.getDevices();
        const totalEnergy = Calculations.calculateTotalEnergy(devices);
        const batteryCapacity = Calculations.calculateBatteryCapacity(devices);
        const solarSize = Calculations.calculateSolarSize(devices);
        const recommendedSize = Calculations.calculateRecommendedBessSize(devices);
        const recommendation = Calculations.getSolarEvoRecommendation(devices);
        
        doc.setFontSize(12);
        doc.text(`Total Daily Energy: ${totalEnergy} kWh`, 20, 100);
        doc.text(`Battery Capacity Required: ${batteryCapacity} kWh`, 20, 110);
        doc.text(`Recommended Solar Size: ${solarSize} kWp`, 20, 120);
        doc.text(`Recommended BESS Size: ${recommendedSize} kWh`, 20, 130);
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('SolarEvo BESS Recommendation:', 20, 150);
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(recommendation, 20, 160);
        
        return 170; // Return next Y position
    }
    
    function addDeviceTable(doc, startY) {
        const devices = AppState.getDevices();
        
        // Create device table data
        const tableData = devices.map(device => [
            device.name,
            `${device.power}W`,
            device.quantity.toString(),
            TimeBlocks.getTimeRanges(device.operatingHours || []).join(', ') || 'None',
            TimeBlocks.getTimeRanges(device.batteryHours || []).join(', ') || 'None'
        ]);
        
        // Add table
        doc.autoTable({
            head: [['Device', 'Power', 'Qty', 'Operating Hours', 'Battery Hours']],
            body: tableData,
            startY: startY,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [70, 130, 180] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 20, right: 20 }
        });
        
        return doc.lastAutoTable.finalY + 20;
    }
    
    function addDisclaimerFooter(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.height;
        
        // Disclaimer text
        const disclaimerText = [
            'DISCLAIMER: This report is generated by BESS Calculator for estimation purposes only. Actual system requirements may vary',
            'based on individual usage patterns, local conditions, and equipment specifications. Please consult with certified professionals',
            'for detailed system design and installation. SolarEvo and Bao Service are not liable for any decisions made based on this report.'
        ];
        
        // Add disclaimer to each page
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100, 100, 100); // Gray color
            
            const footerY = pageHeight - 20;
            disclaimerText.forEach((line, index) => {
                doc.text(line, 20, footerY + (index * 4));
            });
            
            // Reset text color for next content
            doc.setTextColor(0, 0, 0);
        }
    }

    function addChartsToPages(doc) {
        return new Promise((resolve) => {
            if (!Charts.isInitialized()) {
                console.warn('⚠️ Charts not initialized, skipping chart generation');
                resolve(doc);
                return;
            }
            
            Charts.generateChartImages().then(chartImages => {
                try {
                    // Add energy distribution chart
                    if (chartImages.energy) {
                        doc.addPage();
                        doc.setFontSize(16);
                        doc.setFont(undefined, 'bold');
                        doc.text('Daily Energy Analysis', 20, 30);
                        doc.addImage(chartImages.energy, 'PNG', 20, 40, 170, 100);
                    }
                    
                    // Add device usage chart
                    if (chartImages.device) {
                        doc.addPage();
                        doc.setFontSize(16);
                        doc.setFont(undefined, 'bold');
                        doc.text('Device-wise Energy Usage', 20, 30);
                        doc.addImage(chartImages.device, 'PNG', 20, 40, 170, 100);
                    }
                    
                    // Add cost comparison chart
                    if (chartImages.cost) {
                        doc.addPage();
                        doc.setFontSize(16);
                        doc.setFont(undefined, 'bold');
                        doc.text('Monthly Cost Analysis', 20, 30);
                        doc.addImage(chartImages.cost, 'PNG', 20, 40, 170, 100);
                    }
                    
                } catch (error) {
                    console.error('❌ Error adding charts to PDF:', error);
                }
                
                resolve(doc);
            }).catch(error => {
                console.error('❌ Error generating chart images:', error);
                resolve(doc);
            });
        });
    }
    
    // Public API
    const publicAPI = {
        // Generate complete PDF report
        generateReport: function() {
            if (isGenerating) {
                console.warn('⚠️ PDF generation already in progress');
                return Promise.reject(new Error('PDF generation already in progress'));
            }
            
            return new Promise(async (resolve, reject) => {
                try {
                    isGenerating = true;
                    
                    // Validate requirements
                    const { devices, prospectName, prospectEmail } = validateRequirements();
                    
                    // Create PDF document
                    const doc = createPdfDocument();
                    
                    // Add header and logo
                    await addHeaderAndLogo(doc);
                    
                    // Add basic information
                    const nextY = addBasicInfo(doc, prospectName, prospectEmail);
                    
                    // Add device table
                    addDeviceTable(doc, nextY);
                    
                    // Add charts to separate pages
                    await addChartsToPages(doc);
                    
                    // Add disclaimer footer to all pages
                    addDisclaimerFooter(doc);
                    
                    // Save the PDF
                    const filename = `BESS-Report-${prospectName.replace(/[^a-zA-Z0-9]/g, '')}-${new Date().toISOString().split('T')[0]}.pdf`;
                    doc.save(filename);
                    
                    
                    // Dispatch success event
                    const event = new CustomEvent('pdfGenerated', {
                        detail: { 
                            filename: filename,
                            devices: devices.length,
                            prospectName: prospectName
                        }
                    });
                    document.dispatchEvent(event);
                    
                    resolve({
                        success: true,
                        filename: filename,
                        devices: devices.length
                    });
                    
                } catch (error) {
                    console.error('❌ PDF generation failed:', error);
                    
                    // Dispatch error event
                    const event = new CustomEvent('pdfGenerationError', {
                        detail: { error: error.message }
                    });
                    document.dispatchEvent(event);
                    
                    reject(error);
                } finally {
                    isGenerating = false;
                }
            });
        },
        
        // Check if PDF generation is available
        isAvailable: function() {
            try {
                validateRequirements();
                return true;
            } catch (error) {
                return false;
            }
        },
        
        // Get PDF generation status
        isGenerating: function() {
            return isGenerating;
        },
        
        // Validate user information for PDF
        validateUserInfo: function() {
            try {
                const prospectName = document.getElementById('prospect-name')?.value?.trim();
                const prospectEmail = document.getElementById('prospect-email')?.value?.trim();
                
                return {
                    valid: !!(prospectName && prospectEmail),
                    name: !!prospectName,
                    email: !!prospectEmail
                };
            } catch (error) {
                return { valid: false, name: false, email: false };
            }
        },
        
        // Get requirements status
        getRequirements: function() {
            const devices = AppState.getDevices();
            const userInfo = this.validateUserInfo();
            const hasJsPDF = typeof window.jsPDF !== 'undefined';
            
            return {
                devices: devices.length > 0,
                deviceCount: devices.length,
                userInfo: userInfo.valid,
                jsPDF: hasJsPDF,
                canGenerate: devices.length > 0 && userInfo.valid && hasJsPDF
            };
        }
    };
    
    return publicAPI;
})(); 
