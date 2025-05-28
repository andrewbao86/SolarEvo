document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const deviceInput = document.getElementById('device');
    const powerInput = document.getElementById('power');
    const quantityInput = document.getElementById('quantity');
    const operatingHoursInput = document.getElementById('operating-hours');
    const batteryHoursInput = document.getElementById('battery-hours');
    const addDeviceButton = document.getElementById('add-device');
    const devicesContainer = document.getElementById('devices-container');
    const totalEnergyElement = document.getElementById('total-energy');
    const batteryCapacityElement = document.getElementById('battery-capacity');
    const recommendedSizeElement = document.getElementById('recommended-size');
    const solarevoRecommendationElement = document.getElementById('solarevo-recommendation');
    const deviceSuggestions = document.getElementById('device-suggestions');
    const downloadPdfButton = document.getElementById('download-pdf');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    const clearAllButton = document.getElementById('clear-all');

    // Common devices with their typical power consumption
    const commonDevices = [
        { name: 'Fridge', power: 250 },
        { name: 'Lamp', power: 40 },
        { name: 'TV', power: 120 },
        { name: 'Laptop', power: 65 },
        { name: 'Air Conditioner', power: 1500 },
        { name: 'Microwave', power: 1000 },
        { name: 'Washing Machine', power: 500 },
        { name: 'Dishwasher', power: 1200 },
        { name: 'Water Heater', power: 4000 },
        { name: 'Computer', power: 150 },
        { name: 'Router', power: 10 },
        { name: 'Ceiling Fan', power: 75 },
        { name: 'Toaster', power: 850 },
        { name: 'Coffee Maker', power: 800 },
        { name: 'Hair Dryer', power: 1500 }
    ];

    // Populate device suggestions
    populateDeviceSuggestions();

    // Store devices
    let devices = [];

    // Add example devices on load (as shown in the image)
    addExampleDevices();

    // Add device event listener
    addDeviceButton.addEventListener('click', addDevice);

    // Function to add example devices
    function addExampleDevices() {
        // Add fridge example
        devices.push({
            id: generateId(),
            name: 'Fridge',
            power: 250,
            quantity: 1,
            operatingHours: 24,
            batteryHours: 12
        });

        // Add lamp example
        devices.push({
            id: generateId(),
            name: 'Lamp',
            power: 40,
            quantity: 10,
            operatingHours: 12,
            batteryHours: 10
        });

        // Add TV example
        devices.push({
            id: generateId(),
            name: 'TV',
            power: 120,
            quantity: 1,
            operatingHours: 6,
            batteryHours: 4
        });

        // Add laptop example
        devices.push({
            id: generateId(),
            name: 'Laptop',
            power: 65,
            quantity: 2,
            operatingHours: 8,
            batteryHours: 6
        });

        // Render devices and update calculations
        renderDevices();
        updateCalculations();
    }

    // Function to add a new device
    function addDevice() {
        // Validate inputs
        if (!validateInputs()) {
            return;
        }

        // Create new device object
        const newDevice = {
            id: generateId(),
            name: deviceInput.value.trim(),
            power: parseFloat(powerInput.value),
            quantity: parseInt(quantityInput.value),
            operatingHours: parseFloat(operatingHoursInput.value),
            batteryHours: parseFloat(batteryHoursInput.value)
        };

        // Add to devices array
        devices.push(newDevice);
        saveToLocalStorage();

        // Clear inputs
        clearInputs();

        // Render devices and update calculations
        renderDevices();
        updateCalculations();
    }

    // Function to validate inputs
    function validateInputs() {
        if (!deviceInput.value.trim()) {
            alert('Please enter a device name');
            deviceInput.focus();
            return false;
        }

        if (!powerInput.value || isNaN(powerInput.value) || parseFloat(powerInput.value) <= 0) {
            alert('Please enter a valid power value (greater than 0)');
            powerInput.focus();
            return false;
        }

        if (!quantityInput.value || isNaN(quantityInput.value) || parseInt(quantityInput.value) <= 0) {
            alert('Please enter a valid quantity (greater than 0)');
            quantityInput.focus();
            return false;
        }

        const operatingHours = parseFloat(operatingHoursInput.value);
        if (!operatingHoursInput.value || isNaN(operatingHours) || 
            operatingHours <= 0 || operatingHours > 24) {
            alert('Please enter valid operating hours (between 0 and 24)');
            operatingHoursInput.focus();
            return false;
        }

        const batteryHours = parseFloat(batteryHoursInput.value);
        if (!batteryHoursInput.value || isNaN(batteryHours) || 
            batteryHours < 0 || batteryHours > operatingHours) {
            alert('Please enter valid battery hours (between 0 and operating hours)');
            batteryHoursInput.focus();
            return false;
        }

        return true;
    }

    // Function to clear input fields
    function clearInputs() {
        deviceInput.value = '';
        powerInput.value = '';
        quantityInput.value = '1';
        operatingHoursInput.value = '';
        batteryHoursInput.value = '';
        deviceInput.focus();
    }

    // Function to render devices
    function renderDevices() {
        devicesContainer.innerHTML = '';

        devices.forEach(device => {
            const deviceElement = document.createElement('div');
            deviceElement.className = 'device-item';
            
            // Add fade-in animation for newly added devices
            if (device.id === devices[devices.length - 1].id && devices.length > 0) {
                deviceElement.classList.add('fade-in');
            }
            
            // Create individual elements instead of using innerHTML for better event handling
            const nameElement = document.createElement('p');
            nameElement.textContent = device.name;
            
            const powerElement = document.createElement('p');
            powerElement.textContent = `${device.power}W × ${device.quantity} ${device.quantity > 1 ? 'sets' : 'set'}`;
            
            const spacerElement = document.createElement('p');
            spacerElement.textContent = device.quantity > 1 ? '' : '';
            
            const operatingHoursElement = document.createElement('p');
            operatingHoursElement.textContent = `${device.operatingHours} hours daily`;
            
            const batteryHoursElement = document.createElement('p');
            batteryHoursElement.textContent = `${device.batteryHours} hours on battery`;
            
            const editButton = document.createElement('button');
            editButton.className = 'edit-btn';
            editButton.textContent = '✏️';
            editButton.setAttribute('data-id', device.id);
            editButton.addEventListener('click', editDevice);
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = '✕';
            deleteButton.setAttribute('data-id', device.id);
            deleteButton.addEventListener('click', deleteDevice);
            
            // Append all elements to the device item
            deviceElement.appendChild(nameElement);
            deviceElement.appendChild(powerElement);
            deviceElement.appendChild(spacerElement);
            deviceElement.appendChild(operatingHoursElement);
            deviceElement.appendChild(batteryHoursElement);
            deviceElement.appendChild(editButton);
            deviceElement.appendChild(deleteButton);

            devicesContainer.appendChild(deviceElement);
        });
    }

    // Function to edit a device
    function editDevice(e) {
        e.stopPropagation(); // Prevent event bubbling
        const deviceId = e.currentTarget.getAttribute('data-id');
        const device = devices.find(d => d.id === deviceId);
        const deviceElement = e.currentTarget.parentNode;

        if (device) {
            // Populate form with device data
            deviceInput.value = device.name;
            powerInput.value = device.power;
            quantityInput.value = device.quantity;
            operatingHoursInput.value = device.operatingHours;
            batteryHoursInput.value = device.batteryHours;

            // Add fade-out animation
            deviceElement.classList.add('fade-out');
            
            // Wait for animation to complete before removing
            setTimeout(() => {
                // Remove the device from the array
                devices = devices.filter(d => d.id !== deviceId);
                saveToLocalStorage();

                // Update UI
                renderDevices();
                updateCalculations();
            }, 300); // Match animation duration
        }
    }

    // Function to delete a device
    function deleteDevice(e) {
        e.stopPropagation(); // Prevent event bubbling
        const deviceId = e.currentTarget.getAttribute('data-id');
        const deviceElement = e.currentTarget.parentNode;
        
        // Add fade-out animation
        deviceElement.classList.add('fade-out');
        
        // Wait for animation to complete before removing
        setTimeout(() => {
            // Remove the device from the array
            devices = devices.filter(device => device.id !== deviceId);
            saveToLocalStorage();
            
            // Update UI
            renderDevices();
            updateCalculations();
        }, 300); // Match animation duration
    }

    // Function to update calculations
    function updateCalculations() {
        // Calculate total daily energy consumption (kWh)
        const totalEnergy = devices.reduce((total, device) => {
            return total + (device.power * device.quantity * device.operatingHours / 1000);
        }, 0);

        // Calculate battery capacity required (kWh)
        const batteryCapacity = devices.reduce((total, device) => {
            return total + (device.power * device.quantity * device.batteryHours / 1000);
        }, 0);

        // Calculate recommended BESS size with 20% buffer
        const recommendedSize = batteryCapacity * 1.2;

        // Update UI
        totalEnergyElement.textContent = `${totalEnergy.toFixed(2)} kWh`;
        batteryCapacityElement.textContent = `${batteryCapacity.toFixed(2)} kWh`;
        recommendedSizeElement.textContent = `${recommendedSize.toFixed(2)} kWh`;
        
        // Generate SolarEvo BESS product recommendation
        updateSolarEvoRecommendation(recommendedSize);
    }
    
    // Function to recommend SolarEvo BESS products
    function updateSolarEvoRecommendation(recommendedSize) {
        // SolarEvo BESS product capacities
        const solarEvoProducts = {
            small: { name: "SolarEvo S5", capacity: 5 },
            medium: { name: "SolarEvo M10", capacity: 10 },
            large: { name: "SolarEvo L15", capacity: 15 }
        };
        
        let recommendation = "";
        
        if (recommendedSize <= 0) {
            recommendation = "Add devices to get a recommendation";
        } else if (recommendedSize <= 5) {
            recommendation = `1 × ${solarEvoProducts.small.name} (${solarEvoProducts.small.capacity} kWh)`;
        } else if (recommendedSize <= 10) {
            recommendation = `1 × ${solarEvoProducts.medium.name} (${solarEvoProducts.medium.capacity} kWh)`;
        } else if (recommendedSize <= 15) {
            recommendation = `1 × ${solarEvoProducts.large.name} (${solarEvoProducts.large.capacity} kWh)`;
        } else if (recommendedSize <= 20) {
            recommendation = `1 × ${solarEvoProducts.medium.name} (${solarEvoProducts.medium.capacity} kWh) + ` +
                           `1 × ${solarEvoProducts.small.name} (${solarEvoProducts.small.capacity} kWh)`;
        } else if (recommendedSize <= 25) {
            recommendation = `1 × ${solarEvoProducts.large.name} (${solarEvoProducts.large.capacity} kWh) + ` +
                           `1 × ${solarEvoProducts.small.name} (${solarEvoProducts.small.capacity} kWh)`;
        } else if (recommendedSize <= 30) {
            recommendation = `2 × ${solarEvoProducts.large.name} (${solarEvoProducts.large.capacity} kWh)`;
        } else {
            // For very large capacities, recommend multiple units
            const largeUnits = Math.floor(recommendedSize / solarEvoProducts.large.capacity);
            const remainingCapacity = recommendedSize - (largeUnits * solarEvoProducts.large.capacity);
            
            recommendation = `${largeUnits} × ${solarEvoProducts.large.name} (${solarEvoProducts.large.capacity} kWh)`;
            
            if (remainingCapacity > 0) {
                if (remainingCapacity <= 5) {
                    recommendation += ` + 1 × ${solarEvoProducts.small.name} (${solarEvoProducts.small.capacity} kWh)`;
                } else if (remainingCapacity <= 10) {
                    recommendation += ` + 1 × ${solarEvoProducts.medium.name} (${solarEvoProducts.medium.capacity} kWh)`;
                } else {
                    recommendation += ` + 1 × ${solarEvoProducts.large.name} (${solarEvoProducts.large.capacity} kWh)`;
                }
            }
        }
        
        solarevoRecommendationElement.textContent = recommendation;
    }

    // Helper function to generate a unique ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // Function to populate device suggestions datalist
    function populateDeviceSuggestions() {
        // Clear existing options
        deviceSuggestions.innerHTML = '';
        
        // Add options for each common device
        commonDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.name;
            option.setAttribute('data-power', device.power);
            deviceSuggestions.appendChild(option);
        });
    }

    // Add input event listener to device input for auto-filling power
    deviceInput.addEventListener('input', function() {
        const selectedDevice = commonDevices.find(device => device.name === this.value);
        if (selectedDevice) {
            powerInput.value = selectedDevice.power;
        }
    });
    
    // Add input event listeners for hours validation
    operatingHoursInput.addEventListener('input', function() {
        const operatingHours = parseFloat(this.value);
        const batteryHours = parseFloat(batteryHoursInput.value);

        // Update max attribute of battery hours input
        if (!isNaN(operatingHours) && operatingHours >= 0 && operatingHours <= 24) {
            batteryHoursInput.max = operatingHours;
            
            // If current battery hours exceeds new operating hours, adjust it
            if (!isNaN(batteryHours) && batteryHours > operatingHours) {
                batteryHoursInput.value = operatingHours;
            }
        }

        validateHours();
    });

    batteryHoursInput.addEventListener('input', function() {
        validateHours();
    });

    // Function to validate hours relationship
    function validateHours() {
        const operatingHours = parseFloat(operatingHoursInput.value);
        const batteryHours = parseFloat(batteryHoursInput.value);

        if (!isNaN(operatingHours) && !isNaN(batteryHours)) {
            if (batteryHours > operatingHours) {
                batteryHoursInput.setCustomValidity('Battery hours cannot exceed operating hours');
                // Add error class to input group
                batteryHoursInput.closest('.input-group').classList.add('error');
            } else {
                batteryHoursInput.setCustomValidity('');
                // Remove error class from input group
                batteryHoursInput.closest('.input-group').classList.remove('error');
            }
        }
    }

    // Function to generate PDF report
    function generatePDFReport() {
        try {
            // Initialize jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Add company name as header (temporary replacement for logo)
            doc.setFontSize(16);
            doc.setTextColor(0, 113, 227); // SolarEvo blue
            doc.text('BAO SERVICE', 150, 20, { align: 'center' });

            // Add title
            doc.setFontSize(24);
            doc.setTextColor(0, 113, 227); // SolarEvo blue
            doc.text('BESS Capacity Calculator Report', 20, 30);

            // Add date
            doc.setFontSize(12);
            doc.setTextColor(51, 51, 51); // Dark gray
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);

            // Add results summary
            doc.setFontSize(16);
            doc.setTextColor(0, 113, 227); // SolarEvo blue
            doc.text('Results Summary', 20, 60);
            
            doc.setFontSize(12);
            doc.setTextColor(51, 51, 51); // Dark gray
            doc.text(`Total Daily Energy: ${totalEnergyElement.textContent}`, 20, 75);
            doc.text(`Battery Capacity Required: ${batteryCapacityElement.textContent}`, 20, 85);
            doc.text(`Recommended BESS Size: ${recommendedSizeElement.textContent}`, 20, 95);
            doc.text(`SolarEvo BESS Recommendation: ${solarevoRecommendationElement.textContent}`, 20, 105);

            // Add devices table with improved styling
            doc.autoTable({
                startY: 120,
                head: [['Device', 'Power (W)', 'Quantity', 'Operating Hours', 'Battery Hours']],
                body: devices.map(device => [
                    device.name,
                    device.power,
                    device.quantity,
                    device.operatingHours,
                    device.batteryHours
                ]),
                styles: { 
                    fontSize: 10,
                    textColor: [51, 51, 51],
                    cellPadding: 5
                },
                headStyles: { 
                    fillColor: [0, 113, 227],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 'auto', halign: 'center' },
                    2: { cellWidth: 'auto', halign: 'center' },
                    3: { cellWidth: 'auto', halign: 'center' },
                    4: { cellWidth: 'auto', halign: 'center' }
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 247]
                },
                margin: { top: 20 },
                didDrawPage: function(data) {
                    // Add header text
                    doc.setFontSize(10);
                    doc.setTextColor(128, 128, 128);
                    doc.text('BESS Calculator - Device List', data.settings.margin.left, 20);
                }
            });

            // Add footer with copyright
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(128, 128, 128); // Medium gray

                // Add copyright text
                const copyright = '© 2025 SolarEvo | Bao Service - Professional BESS Solutions';
                const pageSize = doc.internal.pageSize;
                const pageWidth = pageSize.getWidth();
                const pageHeight = pageSize.getHeight();

                // Center the copyright text
                const textWidth = doc.getStringUnitWidth(copyright) * 10 / doc.internal.scaleFactor;
                const textX = (pageWidth - textWidth) / 2;

                doc.text(copyright, textX, pageHeight - 10);

                // Add page number if there are multiple pages
                if (pageCount > 1) {
                    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
                }
            }

            // Save the PDF
            doc.save('bess-calculator-report.pdf');

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('An error occurred while generating the PDF. Please try again.');
        }
    }

    // Event listeners
    downloadPdfButton.addEventListener('click', generatePDFReport);

    // Theme toggle
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // Clear all devices
    clearAllButton.addEventListener('click', () => {
        devices = [];
        saveToLocalStorage();
        renderDevices();
        updateCalculations();
    });

    // Load theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    // Load saved devices
    loadFromLocalStorage();

    // Function to set theme
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    // Function to save to localStorage
    function saveToLocalStorage() {
        localStorage.setItem('devices', JSON.stringify(devices));
    }

    // Function to load from localStorage
    function loadFromLocalStorage() {
        const savedDevices = localStorage.getItem('devices');
        if (savedDevices) {
            devices = JSON.parse(savedDevices);
            renderDevices();
            updateCalculations();
        }
    }
});