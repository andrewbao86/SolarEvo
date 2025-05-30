// Add debug log at the very top of the script
console.debug('[DEBUG] Script loaded');

let energyDistributionChart;
let deviceEnergyChart;
let costComparisonChart;
let chartsInitialized = false;
let chartsReady = false;

// Wait for DOMContentLoaded before any chart/plugin logic
let domReady = false;
document.addEventListener('DOMContentLoaded', () => {
    console.debug('[DEBUG] DOMContentLoaded event fired');
    domReady = true;
    console.debug('[DEBUG] DOMContentLoaded fired');
    // tryInitChartsWithPlugin(); // <-- Removed, handled by new robust pattern

    // DOM elements
    const deviceInput = document.getElementById('device');
    const powerInput = document.getElementById('power');
    const quantityInput = document.getElementById('quantity');
    const operatingHoursStart = document.getElementById('operating-hours-start');
    const operatingHoursEnd = document.getElementById('operating-hours-end');
    const batteryHoursStart = document.getElementById('battery-hours-start');
    const batteryHoursEnd = document.getElementById('battery-hours-end');
    const operatingHoursDisplay = document.getElementById('operating-hours-display');
    const batteryHoursDisplay = document.getElementById('battery-hours-display');
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
    const prospectNameInput = document.getElementById('prospect-name');
    const prospectEmailInput = document.getElementById('prospect-email');

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

    // Add device event listener (after charts are initialized)
    addDeviceButton.addEventListener('click', addDevice);

    // Function to format time for display (30-min steps)
    function formatTime(value) {
        const hour = Math.floor(value / 2);
        const minute = (value % 2) * 30;
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    // Function to create time markers
    function createTimeMarkers() {
        const markers = document.querySelectorAll('.time-markers');
        markers.forEach(markerContainer => {
            markerContainer.innerHTML = '';
            for (let i = 0; i < 24; i++) {
                const marker = document.createElement('div');
                marker.className = 'time-marker' + (i % 6 === 0 ? ' major' : '');
                marker.style.left = `${(i / 23) * 100}%`;
                markerContainer.appendChild(marker);
            }
        });
    }

    // Function to update time range display with animation
    function updateTimeDisplay(start, end, displayElement) {
        displayElement.textContent = `${formatTime(start)} - ${formatTime(end)}`;
        displayElement.classList.add('time-range-update');
        setTimeout(() => displayElement.classList.remove('time-range-update'), 300);
    }

    // Function to calculate hours between start and end (30-min steps)
    function calculateHours(start, end) {
        if (end < start) {
            end += 48;
        }
        return ((end - start) * 0.5); // 0.5 hour per step
    }

    // Function to validate and update time ranges
    function updateTimeRange(startSlider, endSlider, displayElement, isOperatingHours = false) {
        let start = parseInt(startSlider.value);
        let end = parseInt(endSlider.value);

        // Ensure end is always after start
        if (end < start) {
            end = start;
            endSlider.value = start;
        }

        // If this is operating hours, ensure battery hours don't exceed it
        if (isOperatingHours) {
            const batteryStart = parseInt(batteryHoursStart.value);
            const batteryEnd = parseInt(batteryHoursEnd.value);
            
            // Calculate the valid range for battery hours
            const operatingHours = calculateHours(start, end);
            const batteryHours = calculateHours(batteryStart, batteryEnd);

            // If battery hours exceed operating hours, adjust battery end time
            if (batteryHours > operatingHours) {
                // Calculate new battery end time
                let newBatteryEnd = (batteryStart + operatingHours) % 48;
                
                // Ensure the new end time is within operating hours
                if (start <= end) {
                    // Normal case (same day)
                    if (newBatteryEnd < batteryStart) {
                        newBatteryEnd = end;
                    }
                } else {
                    // Overnight case
                    if (newBatteryEnd < batteryStart && newBatteryEnd > end) {
                        newBatteryEnd = end;
                    }
                }
                
                batteryHoursEnd.value = newBatteryEnd;
                updateTimeDisplay(batteryStart, newBatteryEnd, batteryHoursDisplay);
            }

            // Ensure battery hours are within operating hours
            if (start <= end) {
                // Normal case (same day)
                if (batteryStart < start) {
                    batteryHoursStart.value = start;
                    updateTimeDisplay(start, batteryEnd, batteryHoursDisplay);
                }
                if (batteryEnd > end) {
                    batteryHoursEnd.value = end;
                    updateTimeDisplay(batteryStart, end, batteryHoursDisplay);
                }
            } else {
                // Overnight case
                if (batteryStart < start && batteryStart > end) {
                    batteryHoursStart.value = start;
                    updateTimeDisplay(start, batteryEnd, batteryHoursDisplay);
                }
                if (batteryEnd > end && batteryEnd < start) {
                    batteryHoursEnd.value = end;
                    updateTimeDisplay(batteryStart, end, batteryHoursDisplay);
                }
            }
        }

        updateTimeDisplay(start, end, displayElement);
        return calculateHours(start, end);
    }

    // --- Time Block Picker Implementation ---
    function createTimeBlockPicker(containerId, displayId, onChange, options = {}) {
        const container = document.getElementById(containerId);
        const display = document.getElementById(displayId);
        const blocks = [];
        let isMouseDown = false;
        let selectMode = true; // true: select, false: deselect
        const BLOCK_COUNT = 48; // 30min steps

        // Render 48 blocks
        for (let i = 0; i < BLOCK_COUNT; i++) {
            const block = document.createElement('div');
            block.className = 'time-block';
            block.dataset.index = i;
            block.addEventListener('mousedown', (e) => {
                if (block.classList.contains('disabled')) return;
                isMouseDown = true;
                selectMode = !block.classList.contains('selected');
                block.classList.toggle('selected', selectMode);
                onChange(getSelectedRanges());
            });
            block.addEventListener('mouseenter', (e) => {
                if (isMouseDown && !block.classList.contains('disabled')) {
                    block.classList.toggle('selected', selectMode);
                    onChange(getSelectedRanges());
                }
            });
            block.addEventListener('mouseup', (e) => {
                isMouseDown = false;
            });
            blocks.push(block);
            container.appendChild(block);
        }
        document.addEventListener('mouseup', () => { isMouseDown = false; });

        // Get selected ranges as array of [start, end] (inclusive, exclusive)
        function getSelectedRanges() {
            const ranges = [];
            let rangeStart = null;
            for (let i = 0; i <= BLOCK_COUNT; i++) {
                const selected = i < BLOCK_COUNT && blocks[i].classList.contains('selected');
                if (selected && rangeStart === null) {
                    rangeStart = i;
                } else if ((!selected || i === BLOCK_COUNT) && rangeStart !== null) {
                    ranges.push([rangeStart, i]);
                    rangeStart = null;
                }
            }
            return ranges;
        }

        // Display selected ranges as time strings
        function displayRanges(ranges) {
            if (ranges.length === 0) {
                display.textContent = 'No time selected';
                return;
            }
            display.textContent = ranges.map(([start, end]) => `${formatTime(start)} - ${formatTime(end-1+1)}`).join(', ');
        }

        // Initial display
        displayRanges(getSelectedRanges());

        // Clear all blocks
        function clearBlocks() {
            blocks.forEach(b => b.classList.remove('selected'));
            displayRanges(getSelectedRanges());
            onChange(getSelectedRanges());
        }

        // For battery picker: update disabled state based on allowedIndices
        function setDisabledBlocks(allowedIndices) {
            blocks.forEach((block, i) => {
                if (allowedIndices && !allowedIndices.includes(i)) {
                    block.classList.add('disabled');
                    block.classList.remove('selected');
                } else {
                    block.classList.remove('disabled');
                }
            });
            displayRanges(getSelectedRanges());
            onChange(getSelectedRanges());
        }

        // Expose API
        return {
            getRanges: getSelectedRanges,
            setRanges: (ranges) => {
                blocks.forEach(b => b.classList.remove('selected'));
                ranges.forEach(([start, end]) => {
                    for (let i = start; i < end; i++) {
                        blocks[i].classList.add('selected');
                    }
                });
                displayRanges(getSelectedRanges());
            },
            displayRanges,
            blocks,
            clearBlocks,
            setDisabledBlocks
        };
    }

    // Create pickers for both operating hours and battery hours
    const operatingBlockPicker = createTimeBlockPicker('operating-hours-blocks', 'operating-hours-blocks-display', (ranges) => {
        operatingBlockPicker.displayRanges(ranges);
        // Update battery picker allowed blocks
        const allowed = [];
        operatingBlockPicker.blocks.forEach((block, i) => {
            if (block.classList.contains('selected')) allowed.push(i);
        });
        batteryBlockPicker.setDisabledBlocks(allowed);
    });
    const batteryBlockPicker = createTimeBlockPicker('battery-hours-blocks', 'battery-hours-blocks-display', (ranges) => {
        batteryBlockPicker.displayRanges(ranges);
    });

    // Add clear button functionality
    document.getElementById('clear-operating-blocks').addEventListener('click', () => {
        operatingBlockPicker.clearBlocks();
    });
    document.getElementById('clear-battery-blocks').addEventListener('click', () => {
        batteryBlockPicker.clearBlocks();
    });

    // --- Update charts with new data ---
    function updateCharts(devices) {
        if (!energyDistributionChart || !deviceEnergyChart || !costComparisonChart) {
            console.warn('Charts not initialized yet');
            return;
        }
        // Calculate recommended BESS size
        const batteryCapacity = devices.reduce((total, device) => {
            return total + (device.power * device.quantity * device.batteryHours / 1000);
        }, 0);
        const recommendedSize = batteryCapacity * 1.2; // 20% buffer
        // 48 half-hour slots in a day
        const halfHourlyEnergy = Array(48).fill(0);
        const halfHourlyBESSEnergy = Array(48).fill(0);
        devices.forEach(device => {
            const powerPerBlock = (device.power * device.quantity) / 1000 * 0.5; // kWh per 30min block
            if (device.operatingRanges) {
                device.operatingRanges.forEach(([start, end]) => {
                    for (let i = start; i < end; i++) {
                        halfHourlyEnergy[i] += powerPerBlock;
                    }
                });
            }
            if (device.batteryRanges) {
                device.batteryRanges.forEach(([start, end]) => {
                    for (let i = start; i < end; i++) {
                        halfHourlyBESSEnergy[i] += powerPerBlock;
                    }
                });
            }
        });
        // Aggregate to hourly for chart.js (24 values)
        const hourlyEnergy = Array(24).fill(0);
        const hourlyBESSEnergy = Array(24).fill(0);
        for (let i = 0; i < 48; i++) {
            hourlyEnergy[Math.floor(i / 2)] += halfHourlyEnergy[i];
            hourlyBESSEnergy[Math.floor(i / 2)] += halfHourlyBESSEnergy[i];
        }
        // Calculate cumulative values
        const cumulativeEnergy = hourlyEnergy.reduce((acc, val, i) => {
            acc.push((acc[i - 1] || 0) + val);
            return acc;
        }, []);
        const cumulativeBESS = hourlyBESSEnergy.reduce((acc, val, i) => {
            acc.push((acc[i - 1] || 0) + val);
            return acc;
        }, []);
        // Calculate remaining BESS energy level as percentage
        const bessRemaining = Array(24).fill(100); // Start at 100%
        for (let i = 0; i < 24; i++) {
            if (i > 0) {
                const remainingEnergy = Math.max(0, recommendedSize - cumulativeBESS[i]);
                bessRemaining[i] = (remainingEnergy / recommendedSize) * 100;
            }
        }
        // Update chart data for energyDistributionChart
        try {
            energyDistributionChart.data.datasets[0].data = cumulativeEnergy;
            energyDistributionChart.data.datasets[1].data = cumulativeBESS;
            energyDistributionChart.data.datasets[2].data = bessRemaining;
            console.debug('[updateCharts] energyDistributionChart data:', {
                cumulativeEnergy,
                cumulativeBESS,
                bessRemaining
            });
            energyDistributionChart.update();
        } catch (err) {
            console.error('[updateCharts] Error updating energyDistributionChart:', err);
        }
        // Update device-wise energy usage (doughnut chart)
        try {
            updateDeviceEnergyChart(devices);
        } catch (err) {
            console.error('[updateCharts] Error updating deviceEnergyChart:', err);
        }
        // Update cost comparison with new rates and logic
        const totalDailyEnergy = devices.reduce((total, device) => {
            return total + (device.power * device.quantity * device.operatingHours / 1000);
        }, 0);
        const electricityRate = 0.5; // MYR 0.5/kWh
        const bessRate = electricityRate * 0.7; // 30% savings for BESS usage
        const bessCoveredEnergy = devices.reduce((total, device) => {
            return total + (device.power * device.quantity * device.batteryHours / 1000);
        }, 0);
        const gridEnergy = totalDailyEnergy - bessCoveredEnergy;
        const currentCost = totalDailyEnergy * electricityRate * 30;
        const bessCost = (bessCoveredEnergy * bessRate + gridEnergy * electricityRate) * 30;
        const solarBessCost = (gridEnergy * 0.5 * electricityRate) * 30;
        try {
            costComparisonChart.data.datasets[0].data = [
                Math.round(currentCost),
                Math.round(bessCost),
                Math.round(solarBessCost)
            ];
            console.debug('[updateCharts] costComparisonChart data:', costComparisonChart.data.datasets[0].data);
            costComparisonChart.update();
        } catch (err) {
            console.error('[updateCharts] Error updating costComparisonChart:', err);
        }
        // Validate download button after device changes
        validateProspectInputs();
    }

    // Update addDevice to use selected time slots
    function addDevice() {
        if (!chartsReady) {
            alert('Charts are not ready yet. Please wait a moment and try again.');
            console.warn('[DEBUG] Tried to add device before charts were ready');
            return;
        }
        console.debug('[DEBUG] addDevice called');
        if (!validateInputs()) return;
        const operatingRanges = operatingBlockPicker.getRanges();
        const batteryRanges = batteryBlockPicker.getRanges();
        // Calculate total hours from ranges
        const operatingHours = operatingRanges.reduce((sum, [start, end]) => sum + (end - start) * 0.5, 0);
        const batteryHours = batteryRanges.reduce((sum, [start, end]) => sum + (end - start) * 0.5, 0);
        const newDevice = {
            id: generateId(),
            name: deviceInput.value.trim(),
            power: parseFloat(powerInput.value),
            quantity: parseInt(quantityInput.value),
            operatingHours,
            batteryHours,
            operatingRanges,
            batteryRanges
        };
        devices.push(newDevice);
        console.log('[addDevice] Device added:', newDevice);
        console.log('[addDevice] Devices array:', devices);
        saveToLocalStorage();
        clearInputs();
        renderDevices();
        updateCalculations();
        updateCharts(devices);
        
        // Call validateProspectInputs after a short delay to ensure DOM is updated
        setTimeout(validateProspectInputs, 0);
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

        const operatingRanges = operatingBlockPicker.getRanges();
        const batteryRanges = batteryBlockPicker.getRanges();

        if (operatingRanges.length === 0) {
            alert('Please select at least one operating hour block');
            return false;
        }

        if (batteryRanges.length > 0) {
            // All battery blocks must be within operating blocks (should be enforced by UI)
            for (const [start, end] of batteryRanges) {
                for (let i = start; i < end; i++) {
                    if (!operatingBlockPicker.blocks[i].classList.contains('selected')) {
                        alert('Battery hours must be within operating hours');
                        return false;
                    }
                }
            }
        }

        return true;
    }

    // Function to clear input fields
    function clearInputs() {
        deviceInput.value = '';
        powerInput.value = '';
        quantityInput.value = '1';
        operatingBlockPicker.clearBlocks();
        batteryBlockPicker.clearBlocks();
        deviceInput.focus();
    }

    // Function to render devices
    function renderDevices() {
        devicesContainer.innerHTML = '';
        devices.forEach(device => {
            const deviceElement = document.createElement('div');
            deviceElement.className = 'device-item';
            if (device.id === devices[devices.length - 1].id && devices.length > 0) {
                deviceElement.classList.add('fade-in');
            }
            const nameElement = document.createElement('p');
            nameElement.textContent = device.name;
            const powerElement = document.createElement('p');
            powerElement.textContent = `${device.power}W × ${device.quantity} ${device.quantity > 1 ? 'sets' : 'set'}`;
            const spacerElement = document.createElement('p');
            spacerElement.textContent = device.quantity > 1 ? '' : '';
            const operatingHoursElement = document.createElement('p');
            operatingHoursElement.textContent = device.operatingRanges && device.operatingRanges.length > 0
                ? device.operatingRanges.map(([start, end]) => `${formatTime(start)} - ${formatTime(end-1+1)}`).join(', ')
                : '-';
            const batteryHoursElement = document.createElement('p');
            batteryHoursElement.textContent = device.batteryRanges && device.batteryRanges.length > 0
                ? device.batteryRanges.map(([start, end]) => `${formatTime(start)} - ${formatTime(end-1+1)}`).join(', ')
                : '-';
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
            deviceElement.appendChild(nameElement);
            deviceElement.appendChild(powerElement);
            deviceElement.appendChild(spacerElement);
            deviceElement.appendChild(operatingHoursElement);
            deviceElement.appendChild(batteryHoursElement);
            deviceElement.appendChild(editButton);
            deviceElement.appendChild(deleteButton);
            devicesContainer.appendChild(deviceElement);
        });
        attachDownloadListener(); // Ensure download button is always active
    }

    // Attach download PDF event listener after rendering
    function attachDownloadListener() {
        const downloadPdfButton = document.getElementById('download-pdf');
        if (downloadPdfButton) {
            // Remove any previous listeners to avoid duplicates
            downloadPdfButton.replaceWith(downloadPdfButton.cloneNode(true));
            const newDownloadPdfButton = document.getElementById('download-pdf');
            newDownloadPdfButton.addEventListener('click', debugGeneratePDFReport);
            console.debug('[attachDownloadListener] Attached click event to download-pdf button');
        } else {
            console.warn('[attachDownloadListener] download-pdf button not found in DOM');
        }
    }

    // Debug wrapper for PDF generation
    function debugGeneratePDFReport(event) {
        console.debug('[debugGeneratePDFReport] Download PDF button clicked', event);
        try {
            generatePDFReport();
        } catch (err) {
            console.error('[debugGeneratePDFReport] Error in generatePDFReport:', err);
            alert('An error occurred while generating the PDF. Please try again.');
        }
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
            operatingBlockPicker.setRanges(device.operatingRanges);
            batteryBlockPicker.setRanges(device.batteryRanges);

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
            validateProspectInputs();
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

    // Theme toggle
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // Clear all devices
    clearAllButton.addEventListener('click', () => {
        devices = [];
        console.log('All devices cleared');
        
        saveToLocalStorage();
        renderDevices();
        updateCalculations();
        
        // Call validateProspectInputs after a short delay to ensure DOM is updated
        setTimeout(validateProspectInputs, 0);
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
            // Do NOT call updateCharts here; defer until charts are ready
        }
    }

    // Function to generate PDF report
    function generatePDFReport() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const prospectName = prospectNameInput ? prospectNameInput.value.trim() : '';

            // Add prospect name at the top left corner
            if (prospectName) {
                doc.setFontSize(12);
                doc.setTextColor(0, 113, 227);
                doc.text(`Prospect: ${prospectName}`, 10, 10, { align: 'left' });
            }

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

            // Add devices table with correct time slot formatting (on page 1)
            doc.autoTable({
                startY: 115,
                head: [['Device', 'Power (W)', 'Quantity', 'Operating Hours', 'Battery Hours']],
                body: devices.map(device => [
                    device.name,
                    device.power,
                    device.quantity,
                    device.operatingRanges && device.operatingRanges.length > 0
                        ? device.operatingRanges.map(([start, end]) => `${formatTime(start)} - ${formatTime(end-1+1)}`).join(', ')
                        : '-',
                    device.batteryRanges && device.batteryRanges.length > 0
                        ? device.batteryRanges.map(([start, end]) => `${formatTime(start)} - ${formatTime(end-1+1)}`).join(', ')
                        : '-'
                ])
            });

            // --- Add charts from page 2 onwards ---
            async function addChartToPDF(doc, chartId, title) {
                const chartCanvas = document.getElementById(chartId);
                if (!chartCanvas) return;
                const imgData = chartCanvas.toDataURL('image/png', 1.0);
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const maxWidth = pageWidth - 40;
                const maxHeight = pageHeight - 60;
                const aspect = chartCanvas.width / chartCanvas.height;
                let imgWidth = maxWidth;
                let imgHeight = imgWidth / aspect;
                if (imgHeight > maxHeight) {
                    imgHeight = maxHeight;
                    imgWidth = imgHeight * aspect;
                }
                const x = (pageWidth - imgWidth) / 2;
                const y = 30;
                doc.addPage();
                doc.setFontSize(18);
                doc.setTextColor(0, 113, 227);
                doc.text(title, pageWidth / 2, 20, { align: 'center' });
                doc.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            }

            // Add charts (each on its own page)
            Promise.resolve()
                .then(() => addChartToPDF(doc, 'energyDistributionChart', 'Cumulative Daily Energy Consumption'))
                .then(() => addChartToPDF(doc, 'deviceEnergyChart', 'Device-wise Energy Usage'))
                .then(() => addChartToPDF(doc, 'costComparisonChart', 'Estimated Cost Savings'))
                .then(() => {
                    // Save the PDF after all charts are added
                    let fileName = 'BESS_Capacity_Calculator_Report';
                    if (prospectName) {
                        // Sanitize prospectName for filename (remove special chars, spaces to underscores)
                        const safeName = prospectName.replace(/[^a-zA-Z0-9]/g, '_');
                        fileName += `_${safeName}`;
                    }
                    fileName += '.pdf';
                    doc.save(fileName);
                });
        } catch (err) {
            console.error('[generatePDFReport] Error:', err);
            alert('An error occurred while generating the PDF. Please try again.');
        }
    }

    function initializeChartsWhenReady() {
        if (chartsInitialized) return;
        chartsInitialized = true;
        console.debug('[DEBUG] initializeChartsWhenReady called');
        initializeCharts();
    }

    console.debug('[DEBUG] ChartDataLabels at script start:', window.ChartDataLabels);
    console.debug('[DEBUG] Chart at script start:', window.Chart);

    if (window.ChartDataLabels) {
        Chart.register(window.ChartDataLabels);
        console.debug('[Chart.js] datalabels plugin registered (immediate)');
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeChartsWhenReady);
        } else {
            initializeChartsWhenReady();
        }
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js';
        script.onload = () => {
            console.debug('[DEBUG] datalabels plugin script onload');
            Chart.register(window.ChartDataLabels);
            console.debug('[Chart.js] datalabels plugin registered (onload)');
            initializeChartsWhenReady();
        };
        document.head.appendChild(script);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {});
        }
    }

    function initializeCharts() {
        console.debug('[DEBUG] initializeCharts called');
        const energyCanvas = document.getElementById('energyDistributionChart');
        const deviceCanvas = document.getElementById('deviceEnergyChart');
        const costCanvas = document.getElementById('costComparisonChart');
        console.debug('[DEBUG] energyCanvas:', energyCanvas);
        console.debug('[DEBUG] deviceCanvas:', deviceCanvas);
        console.debug('[DEBUG] costCanvas:', costCanvas);
        if (!energyCanvas || !deviceCanvas || !costCanvas) {
            console.error('[initializeCharts] One or more chart canvas elements are missing:', {
                energyCanvas, deviceCanvas, costCanvas
            });
            return;
        }
        // 24 hourly labels
        const hourlyLabels = Array.from({length: 24}, (_, i) => `${i.toString().padStart(2, '0')}:00`);
        const energyCtx = energyCanvas.getContext('2d');
        energyDistributionChart = new Chart(energyCtx, {
            type: 'line',
            data: {
                labels: hourlyLabels,
                datasets: [
                    { label: 'Cumulative Energy', data: Array(24).fill(0), borderColor: '#0071e3', fill: false },
                    { label: 'BESS Energy', data: Array(24).fill(0), borderColor: '#ff9800', fill: false },
                    { label: 'BESS Remaining (%)', data: Array(24).fill(100), borderColor: '#4caf50', fill: false, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: true }, datalabels: { display: false } },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'kWh' } },
                    y1: { beginAtZero: true, position: 'right', title: { display: true, text: '%' }, min: 0, max: 100 }
                }
            }
        });
        const deviceCtx = deviceCanvas.getContext('2d');
        deviceEnergyChart = new Chart(deviceCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [ { data: [], backgroundColor: [ '#0071e3', '#ff9800', '#4caf50', '#f44336', '#9c27b0' ] } ]
            },
            options: {
                responsive: true,
                cutout: '0%',
                circumference: 360,
                plugins: {
                    legend: { display: true },
                    datalabels: {
                        display: true,
                        formatter: (value, ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = (value / total * 100).toFixed(1) + '%';
                            return pct;
                        }
                    }
                }
            }
        });
        const costCtx = costCanvas.getContext('2d');
        costComparisonChart = new Chart(costCtx, {
            type: 'bar',
            data: {
                labels: [ 'Current', 'BESS', 'Solar + BESS' ],
                datasets: [ { label: 'Monthly Cost (MYR)', data: [ 0, 0, 0 ], backgroundColor: [ '#0071e3', '#ff9800', '#4caf50' ] } ]
            },
             options: { responsive: true, plugins: { legend: { display: false }, datalabels: { display: false } } }
        });
        // Only now, after all chart objects are created:
        chartsReady = true;
        document.getElementById('add-device').disabled = false;
        console.debug('[DEBUG] Charts initialized, Add button enabled');
        // If devices are preloaded, update charts now
        if (Array.isArray(devices) && devices.length > 0) {
            updateCharts(devices);
        }
    }

    // (If updateDeviceEnergyChart is called, define it.)
    // (Below is a stub – update doughnut chart (deviceEnergyChart) with device–wise energy usage.)
    function updateDeviceEnergyChart(devices) {
        const labels = devices.map(d => d.name);
        const data = devices.map(d => (d.power * d.quantity * (d.operatingHours) / 1000));
        deviceEnergyChart.data.labels = labels;
        deviceEnergyChart.data.datasets[0].data = data;
        deviceEnergyChart.update();
    }

    // Replace the existing validateProspectInputs function with this version
    function validateProspectInputs() {
        // Always get the latest references in case the DOM changed
        const downloadPdfButton = document.getElementById('download-pdf');
        const prospectNameInput = document.getElementById('prospect-name');

        // Debug: Log the current state of everything
        console.log('Validating inputs:', {
            devicesExists: !!devices,
            devicesIsArray: Array.isArray(devices),
            devicesLength: devices ? devices.length : 0,
            prospectNameExists: !!prospectNameInput,
            prospectNameValue: prospectNameInput ? prospectNameInput.value : 'no input',
            prospectNameTrimmed: prospectNameInput ? prospectNameInput.value.trim() : 'no input',
            downloadButtonExists: !!downloadPdfButton,
            currentButtonState: downloadPdfButton ? downloadPdfButton.disabled : 'no button'
        });

        // First, verify our elements exist
        if (!prospectNameInput || !downloadPdfButton) {
            console.error('Required elements not found:', {
                prospectNameInput: !!prospectNameInput,
                downloadPdfButton: !!downloadPdfButton
            });
            return;
        }

        // Get current state
        const hasDevices = Array.isArray(devices) && devices.length > 0;
        const hasProspectName = prospectNameInput.value.trim().length > 0;

        // Debug: Log the conditions
        console.log('Conditions:', {
            hasDevices,
            hasProspectName,
            shouldEnable: hasDevices && hasProspectName
        });

        // Update button state
        const newState = !(hasDevices && hasProspectName);
        downloadPdfButton.disabled = newState;

        // Debug: Log the button state change
        console.log('Button state updated:', {
            from: downloadPdfButton.disabled,
            to: newState,
            actual: downloadPdfButton.disabled
        });

        // Update tooltip
        if (downloadPdfButton.disabled) {
            downloadPdfButton.title = hasDevices ? 'Please enter prospect name' : 'Please add at least one device';
        } else {
            downloadPdfButton.title = 'Download PDF Report';
        }
    }

    // Add initial validation call after a short delay to ensure everything is loaded
    setTimeout(validateProspectInputs, 100);
});