import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import awsExports from './src/aws-exports.js';
import { 
    createSharedCalculation as createSharedCalculationMutation,
    getSharedCalculation as getSharedCalculationQuery 
} from './src/graphql/operations.js';

// Configure Amplify with fallback handling
let client = null;
let isAmplifyConfigured = false;

try {
    // Only configure if we have a valid GraphQL endpoint
    if (awsExports.aws_appsync_graphqlEndpoint && awsExports.aws_appsync_graphqlEndpoint.trim() !== '') {
        Amplify.configure(awsExports);
        client = generateClient();
        isAmplifyConfigured = true;
        console.log('✅ AWS Amplify configured successfully');
    } else {
        console.warn('⚠️ AWS Amplify not configured - using fallback mode (URL encoding)');
    }
} catch (error) {
    console.warn('⚠️ AWS Amplify configuration failed - using fallback mode:', error.message);
}


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
        const BLOCK_COUNT = 48;
    
        let isMouseDown = false;
        let selectMode = true;
    
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        let touchStartIndex = null;
        let lastTouchedIndex = null;
    
        function formatTime(value) {
            const hour = Math.floor(value / 2);
            const minute = (value % 2) * 30;
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
    
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
    
        function displayRanges(ranges) {
            if (ranges.length === 0) {
                display.textContent = 'No time selected';
            } else {
                display.textContent = ranges.map(([start, end]) =>
                    `${formatTime(start)} - ${formatTime(end - 1 + 1)}`
                ).join(', ');
            }
        }
    
        function clearBlocks() {
            blocks.forEach(b => b.classList.remove('selected'));
            displayRanges(getSelectedRanges());
            onChange(getSelectedRanges());
        }
    
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
    
       // Render 48 blocks
        for (let i = 0; i < BLOCK_COUNT; i++) {
            const block = document.createElement('div');
            block.className = 'time-block';
            block.dataset.index = i;
    
            // --- Mouse Events ---
            block.addEventListener('mousedown', (e) => {
                if (block.classList.contains('disabled')) return;
                e.preventDefault();
                isMouseDown = true;
                selectMode = !block.classList.contains('selected');
                block.classList.toggle('selected', selectMode);
                onChange(getSelectedRanges());
            });
    
            block.addEventListener('mouseenter', (e) => {
                if (!isMouseDown || block.classList.contains('disabled')) return;
                block.classList.toggle('selected', selectMode);
                onChange(getSelectedRanges());
            });
    
            // --- Touch Events ---
            block.addEventListener('touchstart', (e) => {
                if (!isTouchDevice || block.classList.contains('disabled')) return;
                e.preventDefault();
                const index = parseInt(block.dataset.index);
                touchStartIndex = index;
                lastTouchedIndex = index;
                selectMode = !block.classList.contains('selected');
                block.classList.toggle('selected', selectMode);
                onChange(getSelectedRanges());
            }, { passive: false });
    
            block.addEventListener('touchmove', (e) => {
                if (!isTouchDevice || touchStartIndex === null) return;
                e.preventDefault();
                const touch = e.touches[0];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                if (target && target.classList.contains('time-block') && !target.classList.contains('disabled')) {
                    const index = parseInt(target.dataset.index);
                    if (index !== lastTouchedIndex) {
                        lastTouchedIndex = index;
                        target.classList.toggle('selected', selectMode);
                        onChange(getSelectedRanges());
                    }
                }
            }, { passive: false });
    
            block.addEventListener('touchend', () => {
                touchStartIndex = null;
                lastTouchedIndex = null;
            });
    
            blocks.push(block);
            container.appendChild(block);
        }
    
        // --- Global Mouse Release Listener ---
        document.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
    
        // Initial display
        displayRanges(getSelectedRanges());
    
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
        
    /* 
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
    */

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
        const recommendedSize = batteryCapacity * 1.15; // 15% buffer

        // Calculate total daily energy for solar sizing
        const totalEnergy = devices.reduce((total, device) => {
            return total + (device.power * device.quantity * device.operatingHours / 1000);
        }, 0);
        const recommendedSolarSize = totalEnergy / (4.5 * 0.8); // kWp

        // 48 half-hour slots in a day
        const halfHourlyEnergy = Array(48).fill(0);
        const halfHourlyBESSEnergy = Array(48).fill(0);
        const halfHourlySolarGeneration = Array(48).fill(0);

        // Calculate solar generation for each half-hour slot
        for (let i = 0; i < 48; i++) {
            const hour = i / 2;
            halfHourlySolarGeneration[i] = calculateSolarGeneration(hour, recommendedSolarSize) * 0.5; // 30-min generation
        }

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
        const hourlySolarGeneration = Array(24).fill(0);

        for (let i = 0; i < 48; i++) {
            const hourIndex = Math.floor(i / 2);
            hourlyEnergy[hourIndex] += halfHourlyEnergy[i];
            hourlyBESSEnergy[hourIndex] += halfHourlyBESSEnergy[i];
            hourlySolarGeneration[hourIndex] += halfHourlySolarGeneration[i];
        }

        // Calculate cumulative values
        const cumulativeEnergy = hourlyEnergy.reduce((acc, val, i) => {
            acc.push((acc[i - 1] || 0) + val);
            return acc;
        }, []);

        const cumulativeSolar = hourlySolarGeneration.reduce((acc, val, i) => {
            acc.push((acc[i - 1] || 0) + val);
            return acc;
        }, []);

        // --- Robust BESS remaining simulation (closed cycle, physical limits) ---
        function simulateBESS(initialBESS, hourlySolar, hourlyLoad, maxBESS) {
                        
            let bess = initialBESS;
            const bessArr = [bess];
            for (let i = 0; i < 24; i++) {
                bess += hourlySolar[i] - hourlyLoad[i];
                bess = Math.max(0, Math.min(maxBESS, bess));
                bessArr.push(bess);
            }
            return bessArr;
        }
        
        const totalSolar = hourlySolarGeneration.reduce((a,b) => a+b, 0);
        const totalLoad = hourlyBESSEnergy.reduce((a,b) => a+b, 0);
        const energyImbalance = totalSolar - totalLoad;

        // Start with an initial SOC that accounts for the imbalance
        let bessInit = recommendedSize * 0.5 + energyImbalance;
        let bessArr = simulateBESS(bessInit, hourlySolarGeneration, hourlyBESSEnergy, recommendedSize);
        let iter = 0;
        while (Math.abs(bessArr[0] - bessArr[24]) > 0.1 && iter < 20) {
            let error = bessArr[24] - bessArr[0];
            bessInit -= error / 2;
            bessArr = simulateBESS(bessInit, hourlySolarGeneration, hourlyBESSEnergy, recommendedSize);
            iter++;
            
        }
        const bessRemaining = bessArr.slice(1); // 24-hour chart
        

        // Update chart data for energyDistributionChart
        try {
            energyDistributionChart.data.datasets = [
                { label: 'Cumulative Energy Consumption', data: cumulativeEnergy, borderColor: '#0071e3', fill: false, pointRadius: 0, pointHoverRadius: 6 },
                { label: 'Cumulative Solar Generation', data: cumulativeSolar, borderColor: '#4caf50', fill: false, pointRadius: 0, pointHoverRadius: 6 },
                { label: 'BESS State-of-Charge (kWh)', data: bessRemaining, borderColor: '#9c27b0', fill: false, pointRadius: 0, pointHoverRadius: 6 }
            ];
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
        const solarBessCost = (gridEnergy * 0.2 * electricityRate) * 30;
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
            batteryRanges,
            critical: criticalDeviceCheckbox && criticalDeviceCheckbox.checked
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
        if (criticalDeviceCheckbox) criticalDeviceCheckbox.checked = false;
        operatingBlockPicker.clearBlocks();
        batteryBlockPicker.clearBlocks();
        deviceInput.focus();
    }

    // Function to render devices
    function renderDevices() {
        devicesContainer.innerHTML = '';
        devices.forEach(device => {
            const row = document.createElement('div');
            row.className = 'device-list-row';

            // Device cell (with critical icon if needed)
            const deviceCell = document.createElement('div');
            if (device.critical) {
                deviceCell.innerHTML = '<span class="critical-icon" title="Critical Device" style="color:#34c759;">&#10003;</span> ' + device.name;
            } else {
                deviceCell.textContent = device.name;
            }

            // Power cell
            const powerCell = document.createElement('div');
            powerCell.textContent = `${device.power}W`;

            // Quantity cell
            const quantityCell = document.createElement('div');
            quantityCell.textContent = `${device.quantity} ${device.quantity > 1 ? 'sets' : 'set'}`;

            // Operating Hours cell (multi-line)
            const opHoursCell = document.createElement('div');
            if (device.operatingRanges && device.operatingRanges.length > 0) {
                try {
                    opHoursCell.textContent = device.operatingRanges.map(([start, end]) => 
                        `${formatTime(start)} - ${formatTime(end)}`
                    ).join(',\n');
                } catch (error) {
                    console.error('Error formatting operating ranges:', device.operatingRanges, error);
                    opHoursCell.textContent = 'Error';
                }
            } else {
                opHoursCell.textContent = '-';
            }
            opHoursCell.style.whiteSpace = 'pre-line';

            // Battery Hours cell (multi-line)
            const battHoursCell = document.createElement('div');
            if (device.batteryRanges && device.batteryRanges.length > 0) {
                try {
                    battHoursCell.textContent = device.batteryRanges.map(([start, end]) => 
                        `${formatTime(start)} - ${formatTime(end)}`
                    ).join(',\n');
                } catch (error) {
                    console.error('Error formatting battery ranges:', device.batteryRanges, error);
                    battHoursCell.textContent = 'Error';
                }
            } else {
                battHoursCell.textContent = '-';
            }
            battHoursCell.style.whiteSpace = 'pre-line';

            // Actions cell
            const actionsCell = document.createElement('div');
            actionsCell.className = 'device-list-actions';
            const editButton = document.createElement('button');
            editButton.className = 'edit-btn';
            editButton.innerHTML = '&#9998;';
            editButton.setAttribute('data-id', device.id);
            editButton.addEventListener('click', editDevice);
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.innerHTML = '&times;';
            deleteButton.setAttribute('data-id', device.id);
            deleteButton.addEventListener('click', deleteDevice);
            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);

            // Append all cells to row
            row.appendChild(deviceCell);
            row.appendChild(powerCell);
            row.appendChild(quantityCell);
            row.appendChild(opHoursCell);
            row.appendChild(battHoursCell);
            row.appendChild(actionsCell);

            devicesContainer.appendChild(row);
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
            generatePDFReport().then(() => {
                // Redirect to thank-you.html after PDF is generated
                window.location.href = 'thank-you.html';
            });
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

        // Calculate recommended solar size (kWp) based on total daily energy
        // Assuming 4.5 peak sun hours in Malaysia and 80% system efficiency
        const recommendedSolarSize = (totalEnergy / (4.5 * 0.8)).toFixed(2);

        // Update UI
        totalEnergyElement.textContent = `${totalEnergy.toFixed(2)} kWh`;
        batteryCapacityElement.textContent = `${batteryCapacity.toFixed(2)} kWh`;
        recommendedSizeElement.textContent = `${recommendedSize.toFixed(2)} kWh`;
        
        // Add solar size to UI if element exists
        const solarSizeElement = document.getElementById('solar-size');
        if (solarSizeElement) {
            solarSizeElement.textContent = `${recommendedSolarSize} kWp`;
        }
        
        // Generate SolarEvo BESS product recommendation
        updateSolarEvoRecommendation(recommendedSize);
    }

    // Function to calculate solar generation for a given hour
    function calculateSolarGeneration(hour, solarSize) {
        
        // Malaysia solar radiation model (7AM-7PM)
        const sunrise = 7;
        const sunset = 19;
        
        if (hour < sunrise || hour > sunset) return 0;
        
        // Normalized hour (0 at sunrise, 1 at sunset)
        const normalized = (hour - sunrise) / (sunset - sunrise);
        
        // Half-sine wave radiation pattern
        const radiation = Math.sin(Math.PI * normalized);
        
        // Scale to ensure total daily energy = solarSize * 4.5 * 0.8
        const scalingFactor = 4.5 * Math.PI / 24; 
        
        return solarSize * radiation * scalingFactor * 0.8;
        
        /*
        // Malaysia solar generation curve (approximate)
        // Peak at noon (12:00), zero at night
        const peakHour = 12;
        const sigma = 3; // Controls the width of the curve
        const generation = solarSize * Math.exp(-Math.pow(hour - peakHour, 2) / (2 * Math.pow(sigma, 2)));
        return Math.max(0, generation * 0.8); // 80% system efficiency
        */
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
            recommendation = `2 × ${solarEvoProducts.medium.name} (${solarEvoProducts.medium.capacity} kWh)`;
        } else if (recommendedSize <= 25) {
            recommendation = `1 × ${solarEvoProducts.large.name} (${solarEvoProducts.large.capacity} kWh) + ` +
                           `1 × ${solarEvoProducts.medium.name} (${solarEvoProducts.medium.capacity} kWh)`;
        } else if (recommendedSize <= 30) {
            recommendation = `2 × ${solarEvoProducts.large.name} (${solarEvoProducts.large.capacity} kWh)`;
        } else if (recommendedSize <= 35) {
            recommendation = `1 × ${solarEvoProducts.large.name} (${solarEvoProducts.large.capacity} kWh) + ` +
                           `2 × ${solarEvoProducts.medium.name} (${solarEvoProducts.medium.capacity} kWh)`;
        } else if (recommendedSize <= 40) {
            recommendation = `2 × ${solarEvoProducts.large.name} (${solarEvoProducts.large.capacity} kWh) + ` +
                           `1 × ${solarEvoProducts.medium.name} (${solarEvoProducts.medium.capacity} kWh)`;
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

    // Add input event listener to prospect name input for validating download button
    if (prospectNameInput) {
        prospectNameInput.addEventListener('input', function() {
            validateProspectInputs();
        });
    }

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

    // === CSV BULK UPLOAD FUNCTIONALITY ===
    
    // CSV Template and Bulk Upload Event Listeners  
    const csvElements = {
        downloadBtn: document.getElementById('download-csv-template'),
        uploadBtn: document.getElementById('upload-csv-btn'),
        fileInput: document.getElementById('csv-file-input')
    };
    
    if (csvElements.downloadBtn) {
        csvElements.downloadBtn.addEventListener('click', downloadCsvTemplate);
    }
    
    if (csvElements.uploadBtn) {
        csvElements.uploadBtn.addEventListener('click', () => csvElements.fileInput.click());
    }
    
    if (csvElements.fileInput) {
        csvElements.fileInput.addEventListener('change', handleCsvFileUpload);
    }

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
                head: [['Device', 'Power (W)', 'Quantity', 'Operating Hours', 'Hours on Battery']],
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
            return Promise.resolve()
                .then(() => addChartToPDF(doc, 'energyDistributionChart', 'Cumulative Daily Energy Consumption'))
                .then(() => addChartToPDF(doc, 'deviceEnergyChart', 'Device-wise Energy Usage'))
                .then(() => addChartToPDF(doc, 'costComparisonChart', 'Estimated Monthly Cost Savings (Malaysia)'))
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
                    { label: 'Cumulative Energy Consumption', data: Array(24).fill(0), borderColor: '#0071e3', fill: false, pointRadius: 0, pointHoverRadius: 6 },
                    { label: 'Cumulative Solar Generation', data: Array(24).fill(0), borderColor: '#4caf50', fill: false, pointRadius: 0, pointHoverRadius: 6 },
                    { label: 'BESS State-of-Charge (kWh)', data: Array(24).fill(0), borderColor: '#9c27b0', fill: false, pointRadius: 0, pointHoverRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: { 
                    legend: { display: true }, 
                    datalabels: { display: false },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#ddd',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.parsed.y.toFixed(2) + ' kWh';
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        title: { display: true, text: 'kWh' },
                        position: 'left'
                    }
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
        const shareButton = document.getElementById('generate-share-link');
        const prospectNameInput = document.getElementById('prospect-name');
        const prospectEmailInput = document.getElementById('prospect-email');
        const prospectMobileInput = document.getElementById('prospect-mobile');

        // Debug: Log the current state of everything
        console.log('Validating inputs:', {
            devicesExists: !!devices,
            devicesIsArray: Array.isArray(devices),
            devicesLength: devices ? devices.length : 0,
            prospectNameExists: !!prospectNameInput,
            prospectNameValue: prospectNameInput ? prospectNameInput.value : 'no input',
            prospectNameTrimmed: prospectNameInput ? prospectNameInput.value.trim() : 'no input',
            downloadButtonExists: !!downloadPdfButton,
            shareButtonExists: !!shareButton,
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
        const hasProspectEmail = prospectEmailInput ? prospectEmailInput.value.trim().length > 0 : false;
        const hasProspectMobile = prospectMobileInput ? prospectMobileInput.value.trim().length > 0 : false;

        // Debug: Log the conditions
        console.log('Conditions:', {
            hasDevices,
            hasProspectName,
            hasProspectEmail,
            hasProspectMobile,
            shouldEnablePDF: hasDevices && hasProspectName,
            shouldEnableShare: hasDevices && hasProspectName && hasProspectEmail && hasProspectMobile
        });

        // Update PDF button state
        const pdfButtonState = !(hasDevices && hasProspectName);
        downloadPdfButton.disabled = pdfButtonState;

        // Update share button state
        if (shareButton) {
            const shareButtonState = !(hasDevices && hasProspectName && hasProspectEmail && hasProspectMobile);
            shareButton.disabled = shareButtonState;
            
            // Update share button tooltip
            if (shareButton.disabled) {
                if (!hasDevices) {
                    shareButton.title = 'Please add at least one device';
                } else if (!hasProspectName) {
                    shareButton.title = 'Please enter your name';
                } else if (!hasProspectEmail) {
                    shareButton.title = 'Please enter your email';
                } else if (!hasProspectMobile) {
                    shareButton.title = 'Please enter your mobile number';
                }
            } else {
                shareButton.title = 'Generate Shareable Link';
            }
        }

        // Debug: Log the button state change
        console.log('Button state updated:', {
            pdfFrom: downloadPdfButton.disabled,
            pdfTo: pdfButtonState,
            pdfActual: downloadPdfButton.disabled
        });

        // Update PDF button tooltip
        if (downloadPdfButton.disabled) {
            downloadPdfButton.title = hasDevices ? 'Please enter prospect name' : 'Please add at least one device';
        } else {
            downloadPdfButton.title = 'Download PDF Report';
        }
    }

    // Add initial validation call after a short delay to ensure everything is loaded
    setTimeout(validateProspectInputs, 100);

    const addDeviceForm = document.getElementById('add-device-form');
    if (addDeviceForm) {
        addDeviceForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent page reload on form submit
        });
    }

    // Function to calculate electricity cost based on Malaysian tiered tariff (sen/kWh converted to MYR/kWh)
    function calculateElectricityCost(monthlyKWh) {
        let totalCost = 0;
        let remainingKWh = monthlyKWh;

        // Tier 1: First 200 kWh at 21.80 sen/kWh (0.2180 MYR/kWh)
        if (remainingKWh > 0) {
            const tier1 = Math.min(remainingKWh, 200);
            totalCost += tier1 * 0.2180;
            remainingKWh -= tier1;
        }

        // Tier 2: Next 100 kWh (201-300) at 33.40 sen/kWh (0.3340 MYR/kWh)
        if (remainingKWh > 0) {
            const tier2 = Math.min(remainingKWh, 100);
            totalCost += tier2 * 0.3340;
            remainingKWh -= tier2;
        }

        // Tier 3: Next 300 kWh (301-600) at 51.60 sen/kWh (0.5160 MYR/kWh)
        if (remainingKWh > 0) {
            const tier3 = Math.min(remainingKWh, 300);
            totalCost += tier3 * 0.5160;
            remainingKWh -= tier3;
        }

        // Tier 4: Next 300 kWh (601-900) at 54.60 sen/kWh (0.5460 MYR/kWh)
        if (remainingKWh > 0) {
            const tier4 = Math.min(remainingKWh, 300);
            totalCost += tier4 * 0.5460;
            remainingKWh -= tier4;
        }

        // Tier 5: Above 900 kWh at 57.10 sen/kWh (0.5710 MYR/kWh)
        if (remainingKWh > 0) {
            totalCost += remainingKWh * 0.5710;
        }

        return totalCost;
    }

    // Update cost comparison with Malaysian tiered electricity rates
    const totalDailyEnergy = devices.reduce((total, device) => {
        return total + (device.power * device.quantity * device.operatingHours / 1000);
    }, 0);
    
    const monthlyEnergyConsumption = totalDailyEnergy * 30; // Monthly consumption in kWh
    const bessCoveredEnergy = devices.reduce((total, device) => {
        return total + (device.power * device.quantity * device.batteryHours / 1000);
    }, 0);
    const monthlyCoveredByBESS = bessCoveredEnergy * 30; // Monthly BESS coverage in kWh
    const monthlyGridEnergy = monthlyEnergyConsumption - monthlyCoveredByBESS;

    // Calculate costs using tiered electricity rates
    const currentCost = calculateElectricityCost(monthlyEnergyConsumption);
    
    // BESS scenario: BESS covers some energy with 30% savings, rest from grid
    const bessGridCost = calculateElectricityCost(monthlyGridEnergy);
    const bessSavedCost = calculateElectricityCost(monthlyCoveredByBESS) * 0.7; // 30% savings on BESS portion
    const bessCost = bessGridCost + bessSavedCost;
    
    // Solar + BESS scenario: Assume 80% reduction in grid usage
    const solarBessGridEnergy = monthlyGridEnergy * 0.2;
    const solarBessCost = calculateElectricityCost(solarBessGridEnergy);

    // Function to generate and download CSV template
    function downloadCsvTemplate() {
        const headers = [
            'Device Name',
            'Power (W)',
            'Quantity',
            'Operating Hours',
            'Hours on Battery',
            'Critical Device'
        ];
        
        // Example device data
        const exampleData = [
            'Air Conditioner',
            '1200',
            '1',
            '18:00-22:00',
            '19:00-22:00',
            'No'
        ];
        
        // Create CSV content
        const csvContent = [
            headers.join(','),
            exampleData.join(',')
        ].join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'BESS_Device_List_Template.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Function to handle CSV file upload
    function handleCsvFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showErrorPopup('Please select a CSV file.');
            return;
        }
        
        // Validate file size (max 1MB)
        if (file.size > 1024 * 1024) {
            showErrorPopup('File size must be less than 1MB.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const csvData = e.target.result;
                const parsedDevices = parseCsvData(csvData);
                
                if (parsedDevices.errors.length > 0) {
                    showCsvPreview(parsedDevices, true);
                } else {
                    showCsvPreview(parsedDevices, false);
                }
            } catch (error) {
                showErrorPopup('Error reading CSV file: ' + error.message);
            }
        };
        
        reader.onerror = function() {
            showErrorPopup('Error reading the file. Please try again.');
        };
        
        reader.readAsText(file);
        
        // Reset file input
        event.target.value = '';
    }

    // Function to parse CSV data
    function parseCsvData(csvText) {
        const lines = csvText.trim().split('\n');
        const devices = [];
        const errors = [];
        
        if (lines.length < 2) {
            errors.push('CSV file must contain at least a header row and one data row.');
            return { devices, errors };
        }
        
        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const expectedHeaders = [
            'Device Name',
            'Power (W)',
            'Quantity', 
            'Operating Hours',
            'Hours on Battery',
            'Critical Device'
        ];
        
        // Validate headers
        const headerMismatch = expectedHeaders.some((expected, index) => {
            return !headers[index] || headers[index].toLowerCase() !== expected.toLowerCase();
        });
        
        if (headerMismatch) {
            errors.push(`CSV headers don't match template. Expected: ${expectedHeaders.join(', ')}`);
            return { devices, errors };
        }
        
        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            const rowData = parseCsvRow(line);
            const rowErrors = [];
            
            if (rowData.length !== expectedHeaders.length) {
                rowErrors.push(`Row ${i}: Incorrect number of columns (expected ${expectedHeaders.length}, got ${rowData.length})`);
                errors.push(...rowErrors);
                continue;
            }
            
            const [deviceName, powerStr, quantityStr, operatingHoursStr, batteryHoursStr, criticalStr] = rowData;
            
            // Validate device data
            const deviceValidation = validateCsvDevice(
                deviceName, powerStr, quantityStr, operatingHoursStr, batteryHoursStr, criticalStr, i
            );
            
            if (deviceValidation.errors.length > 0) {
                errors.push(...deviceValidation.errors);
                devices.push({
                    ...deviceValidation.device,
                    _rowNumber: i,
                    _hasErrors: true,
                    _errors: deviceValidation.errors
                });
            } else {
                devices.push({
                    ...deviceValidation.device,
                    _rowNumber: i,
                    _hasErrors: false
                });
            }
        }
        
        return { devices, errors };
    }

    // Function to parse a CSV row (handles quoted fields)
    function parseCsvRow(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result.map(field => field.replace(/^"|"$/g, ''));
    }

    // Function to validate individual device from CSV
    function validateCsvDevice(deviceName, powerStr, quantityStr, operatingHoursStr, batteryHoursStr, criticalStr, rowNumber) {
        const errors = [];
        
        // Validate device name
        if (!deviceName || deviceName.trim().length === 0) {
            errors.push(`Row ${rowNumber}: Device name is required`);
        }
        
        // Validate power
        const power = parseFloat(powerStr);
        if (isNaN(power) || power <= 0) {
            errors.push(`Row ${rowNumber}: Power must be a number greater than 0`);
        }
        
        // Validate quantity
        const quantity = parseInt(quantityStr);
        if (isNaN(quantity) || quantity <= 0) {
            errors.push(`Row ${rowNumber}: Quantity must be a positive integer`);
        }
        
        // Validate and parse operating hours
        const operatingRanges = parseTimeRanges(operatingHoursStr);
        if (!operatingRanges) {
            errors.push(`Row ${rowNumber}: Invalid operating hours format. Use format like "08:00-12:00,18:00-22:00"`);
        }
        
        // Validate and parse battery hours
        let batteryRanges = [];
        if (batteryHoursStr && batteryHoursStr.trim() !== '' && batteryHoursStr.toLowerCase() !== 'none') {
            batteryRanges = parseTimeRanges(batteryHoursStr);
            if (!batteryRanges) {
                errors.push(`Row ${rowNumber}: Invalid battery hours format. Use format like "08:00-12:00,18:00-22:00"`);
            } else if (operatingRanges) {
                // Validate battery hours are within operating hours
                const batteryWithinOperating = validateBatteryWithinOperating(batteryRanges, operatingRanges);
                if (!batteryWithinOperating) {
                    errors.push(`Row ${rowNumber}: Battery hours must be within operating hours`);
                }
            }
        }
        
        // Validate critical device
        const critical = ['yes', 'true', '1'].includes(criticalStr.toLowerCase().trim());
        
        // Calculate total hours
        const operatingHours = operatingRanges ? operatingRanges.reduce((sum, [start, end]) => sum + (end - start) * 0.5, 0) : 0;
        const batteryHours = batteryRanges ? batteryRanges.reduce((sum, [start, end]) => sum + (end - start) * 0.5, 0) : 0;
        
        const device = {
            id: generateId(),
            name: deviceName.trim(),
            power: power || 0,
            quantity: quantity || 1,
            operatingHours,
            batteryHours,
            operatingRanges: operatingRanges || [],
            batteryRanges: batteryRanges || [],
            critical
        };
        
        return { device, errors };
    }

    // Function to parse time ranges from string format
    function parseTimeRanges(timeStr) {
        if (!timeStr || timeStr.trim() === '' || timeStr.toLowerCase() === 'none') {
            return [];
        }
        
        try {
            const ranges = [];
            const parts = timeStr.split(',');
            
            for (const part of parts) {
                const trimmed = part.trim();
                if (!trimmed) continue;
                
                const match = trimmed.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
                if (!match) {
                    return null; // Invalid format
                }
                
                const [, startHour, startMin, endHour, endMin] = match;
                const startHourNum = parseInt(startHour);
                const startMinNum = parseInt(startMin);
                const endHourNum = parseInt(endHour);
                const endMinNum = parseInt(endMin);
                
                // Validate time components
                if (startHourNum < 0 || startHourNum > 23 || endHourNum < 0 || endHourNum > 23 ||
                    startMinNum < 0 || startMinNum > 59 || endMinNum < 0 || endMinNum > 59 ||
                    (startMinNum !== 0 && startMinNum !== 30) || (endMinNum !== 0 && endMinNum !== 30)) {
                    return null; // Invalid time values
                }
                
                // Convert to 30-minute block indices
                const startIndex = startHourNum * 2 + (startMinNum === 30 ? 1 : 0);
                let endIndex = endHourNum * 2 + (endMinNum === 30 ? 1 : 0);
                
                // Handle case where end time is exactly on the hour (e.g., 12:00 should include the 11:30-12:00 block)
                if (endMinNum === 0 && endIndex > 0) {
                    // Don't modify endIndex - 12:00 means up to but not including 12:00
                }
                
                if (startIndex >= endIndex) {
                    return null; // Invalid range
                }
                
                ranges.push([startIndex, endIndex]);
            }
            
            return ranges;
        } catch (error) {
            return null;
        }
    }

    // Function to validate battery hours are within operating hours
    function validateBatteryWithinOperating(batteryRanges, operatingRanges) {
        for (const [battStart, battEnd] of batteryRanges) {
            let isValid = false;
            
            for (const [opStart, opEnd] of operatingRanges) {
                if (battStart >= opStart && battEnd <= opEnd) {
                    isValid = true;
                    break;
                }
            }
            
            if (!isValid) {
                return false;
            }
        }
        
        return true;
    }

    // Function to show CSV preview modal
    function showCsvPreview(parsedData, hasErrors) {
        const { devices, errors } = parsedData;
        
        if (hasErrors) {
            // Show error popup and don't proceed with preview
            const errorMessage = `CSV file contains errors:\n\n${errors.slice(0, 10).join('\n')}` + 
                               (errors.length > 10 ? `\n\n... and ${errors.length - 10} more errors.` : '');
            showErrorPopup(errorMessage);
            return;
        }
        
        // Create modal HTML
        const modalHtml = `
            <div class="csv-preview-modal" id="csv-preview-modal">
                <div class="csv-preview-content">
                    <div class="csv-preview-header">
                        <h2 class="csv-preview-title">Preview CSV Import (${devices.length} devices)</h2>
                        <button class="csv-close-btn" onclick="closeCsvPreview()">&times;</button>
                    </div>
                    
                    <div class="csv-preview-table-container">
                        <table class="csv-preview-table">
                            <thead>
                                <tr>
                                    <th>Device Name</th>
                                    <th>Power (W)</th>
                                    <th>Quantity</th>
                                    <th>Operating Hours</th>
                                    <th>Hours on Battery</th>
                                    <th>Critical</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${devices.map(device => `
                                    <tr class="${device._hasErrors ? 'csv-error-row' : ''}">
                                        <td class="${device._hasErrors ? 'csv-error-cell' : ''}">${device.name}</td>
                                        <td class="${device._hasErrors ? 'csv-error-cell' : ''}">${device.power}W</td>
                                        <td class="${device._hasErrors ? 'csv-error-cell' : ''}">${device.quantity}</td>
                                        <td class="${device._hasErrors ? 'csv-error-cell' : ''}">${formatTimeRanges(device.operatingRanges)}</td>
                                        <td class="${device._hasErrors ? 'csv-error-cell' : ''}">${formatTimeRanges(device.batteryRanges)}</td>
                                        <td class="${device._hasErrors ? 'csv-error-cell' : ''}">${device.critical ? 'Yes' : 'No'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="csv-preview-actions">
                        <button class="csv-action-btn csv-cancel-btn" onclick="closeCsvPreview()">Cancel</button>
                        <button class="csv-action-btn csv-replace-btn" onclick="importCsvDevices(true)">Replace All Devices</button>
                        <button class="csv-action-btn csv-add-btn" onclick="importCsvDevices(false)">Add to Existing</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Store parsed devices globally for import
        window._csvDevicesForImport = devices.filter(d => !d._hasErrors);
    }

    // Function to format time ranges for display
    function formatTimeRanges(ranges) {
        if (!ranges || ranges.length === 0) {
            return '-';
        }
        
        return ranges.map(([start, end]) => {
            const startHour = Math.floor(start / 2);
            const startMin = (start % 2) * 30;
            const endHour = Math.floor(end / 2);
            const endMin = (end % 2) * 30;
            
            return `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}-${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
        }).join(', ');
    }

    // Global functions for modal actions (accessible from onclick handlers)
    window.closeCsvPreview = function() {
        const modal = document.getElementById('csv-preview-modal');
        if (modal) {
            modal.remove();
        }
        window._csvDevicesForImport = null;
    };

    window.importCsvDevices = function(replace) {
        const devicesToImport = window._csvDevicesForImport;
        if (!devicesToImport) {
            showErrorPopup('No devices to import.');
            return;
        }
        
        try {
            if (replace) {
                // Replace all existing devices
                devices = devicesToImport.map(device => {
                    // Remove temporary properties
                    const { _rowNumber, _hasErrors, _errors, ...cleanDevice } = device;
                    return cleanDevice;
                });
            } else {
                // Add to existing devices
                const newDevices = devicesToImport.map(device => {
                    const { _rowNumber, _hasErrors, _errors, ...cleanDevice } = device;
                    return cleanDevice;
                });
                devices.push(...newDevices);
            }
            
            // Update UI and calculations
            saveToLocalStorage();
            renderDevices();
            updateCalculations();
            if (chartsReady) {
                updateCharts(devices);
            }
            
            // Show success message
            const action = replace ? 'replaced' : 'added';
            const message = `Successfully ${action} ${devicesToImport.length} device${devicesToImport.length !== 1 ? 's' : ''}!`;
            showSuccessPopup(message);
            
            // Close modal
            closeCsvPreview();
            
            // Validate prospect inputs
            setTimeout(validateProspectInputs, 0);
            
        } catch (error) {
            showErrorPopup('Error importing devices: ' + error.message);
        }
    };

    // Function to show error popup
    function showErrorPopup(message) {
        alert('Error: ' + message);
    }

    // Function to show success popup  
    function showSuccessPopup(message) {
        alert(message);
    }

    // === SHAREABLE LINK FUNCTIONALITY ===
    
    // Get additional prospect input elements (reuse existing prospectEmailInput if available)
    const prospectMobileInput = document.getElementById('prospect-mobile');
    const generateShareLinkBtn = document.getElementById('generate-share-link');
    
    // Add event listeners for validation
    if (prospectEmailInput) {
        prospectEmailInput.addEventListener('input', validateProspectInputs);
        prospectEmailInput.addEventListener('blur', validateEmail);
    }
    
    if (prospectMobileInput) {
        prospectMobileInput.addEventListener('input', validateProspectInputs);
        prospectMobileInput.addEventListener('blur', validateMobile);
    }
    
    if (generateShareLinkBtn) {
        generateShareLinkBtn.addEventListener('click', generateShareableLink);
    }

    // Email validation function
    function validateEmail() {
        const email = prospectEmailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        clearFieldError(prospectEmailInput);
        
        if (email && !emailRegex.test(email)) {
            showFieldError(prospectEmailInput, 'Please enter a valid email address');
            return false;
        }
        
        return true;
    }

    // Mobile validation function (International format)
    function validateMobile() {
        const mobile = prospectMobileInput.value.trim();
        
        clearFieldError(prospectMobileInput);
        
        if (!mobile) {
            showFieldError(prospectMobileInput, 'Mobile number is required');
            return false;
        }
        
        // Remove spaces, dashes, and parentheses for validation
        const cleanMobile = mobile.replace(/[\s\-\(\)]/g, '');
        
        // International format: must start with + and be 8-15 digits total
        const internationalRegex = /^\+[1-9]\d{6,14}$/;
        
        if (!internationalRegex.test(cleanMobile)) {
            showFieldError(prospectMobileInput, 'Please enter a valid international mobile number (e.g., +60123456789, +1234567890, +442071234567)');
            return false;
        }
        
        return true;
    }

    // Show field error
    function showFieldError(inputElement, message) {
        inputElement.classList.add('error');
        
        // Remove existing error message
        const existingError = inputElement.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        inputElement.parentNode.appendChild(errorDiv);
    }

    // Clear field error
    function clearFieldError(inputElement) {
        inputElement.classList.remove('error');
        const errorMessage = inputElement.parentNode.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    // Generate shareable link
    async function generateShareableLink() {
        const name = prospectNameInput.value.trim();
        const email = prospectEmailInput.value.trim();
        const mobile = prospectMobileInput.value.trim();
        
        if (!name || !email || !mobile) {
            showErrorPopup('Please fill in all required fields (Name, Email, Mobile)');
            return;
        }
    
        if (!validateEmail() || !validateMobile()) {
            showErrorPopup('Please correct the validation errors before generating link');
            return;
        }
    
        if (!devices || devices.length === 0) {
            showErrorPopup('Please add at least one device before generating a shareable link');
            return;
        }
    
        try {
            generateShareLinkBtn.disabled = true;
            generateShareLinkBtn.textContent = 'Generating...';
    
            const input = {
                creatorName: name,
                creatorEmail: email,
                creatorMobile: mobile,
                devices: devices.map(device => ({
                    name: device.name,
                    power: device.power,
                    quantity: device.quantity,
                    operatingHours: device.operatingHours,
                    batteryHours: device.batteryHours,
                    operatingRanges: device.operatingRanges.map(range => ({
                        start: range[0],
                        end: range[1]
                    })),
                    batteryRanges: device.batteryRanges.map(range => ({
                        start: range[0],
                        end: range[1]
                    })),
                    critical: device.critical
                })),
                calculations: {
                    totalEnergy: totalEnergyElement.textContent,
                    batteryCapacity: batteryCapacityElement.textContent,
                    recommendedSize: recommendedSizeElement.textContent,
                    solarevoRecommendation: solarevoRecommendationElement.textContent
                }
            };
    
            // Try backend only if configured
            if (isAmplifyConfigured && client) {
                const result = await client.graphql({
                    query: createSharedCalculationMutation,
                    variables: { input }
                });
        
                const calculationId = result.data.createSharedCalculation.id;
                const shareUrl = `${window.location.origin}${window.location.pathname}?share=${calculationId}`;
                showShareModal(shareUrl, name);
                return;
            } else {
                // No backend configured, skip to fallback
                throw new Error('Backend not configured');
            }
    
        } catch (error) {
            console.error('Error generating shareable link:', error);
            
            // Fallback to URL encoding if backend fails
            try {
                const shareData = {
                    id: generateUniqueId(),
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    creatorName: name,
                    devices: devices.map(device => ({
                        name: device.name,
                        power: device.power,
                        quantity: device.quantity,
                        operatingHours: device.operatingHours,
                        batteryHours: device.batteryHours,
                        operatingRanges: device.operatingRanges,
                        batteryRanges: device.batteryRanges,
                        critical: device.critical
                    })),
                    calculations: {
                        totalEnergy: totalEnergyElement.textContent,
                        batteryCapacity: batteryCapacityElement.textContent,
                        recommendedSize: recommendedSizeElement.textContent,
                        solarevoRecommendation: solarevoRecommendationElement.textContent
                    }
                };
                
                const encodedData = btoa(JSON.stringify(shareData));
                const fallbackUrl = `${window.location.origin}${window.location.pathname}?shared=${encodedData}`;
                showShareModal(fallbackUrl, name);
                
            } catch (fallbackError) {
                showErrorPopup('Error generating shareable link. Please try again.');
            }
        } finally {
            generateShareLinkBtn.disabled = false;
            generateShareLinkBtn.textContent = 'Generate Shareable Link';
        }
    }
    

    // Generate unique ID
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // Show share modal
    function showShareModal(shareUrl, creatorName) {
        const modalHtml = `
            <div class="share-modal" id="share-modal">
                <div class="share-modal-content">
                    <div class="share-modal-header">
                        <h2 class="share-modal-title">Share Your BESS Calculation</h2>
                        <button class="share-close-btn" onclick="closeShareModal()">&times;</button>
                    </div>
                    
                    <div class="share-info">
                        <strong>📋 Your calculation is ready to share!</strong><br>
                        This link will expire in 2 weeks and shows your device configuration to anyone who opens it.
                    </div>
                    
                    <div class="share-link-container">
                        <label for="share-link-input">Shareable Link:</label>
                        <input type="text" id="share-link-input" class="share-link-input" value="${shareUrl}" readonly>
                    </div>
                    
                    <div class="share-actions">
                        <button class="share-action-btn copy-link-btn" onclick="copyShareLink()">📋 Copy Link</button>
                        <button class="share-action-btn whatsapp-btn" onclick="sendToWhatsApp('${shareUrl}')">📱 Send via WhatsApp</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Global functions for share modal
    window.closeShareModal = function() {
        const modal = document.getElementById('share-modal');
        if (modal) {
            modal.remove();
        }
    };

    window.copyShareLink = function() {
        const linkInput = document.getElementById('share-link-input');
        if (linkInput) {
            linkInput.select();
            linkInput.setSelectionRange(0, 99999); // For mobile devices
            
            try {
                document.execCommand('copy');
                showSuccessPopup('Link copied to clipboard!');
            } catch (err) {
                // Fallback for modern browsers
                navigator.clipboard.writeText(linkInput.value).then(() => {
                    showSuccessPopup('Link copied to clipboard!');
                }).catch(() => {
                    showErrorPopup('Failed to copy link. Please copy manually.');
                });
            }
        }
    };

    window.sendToWhatsApp = function(shareUrl) {
        const message = `Hi, I've created a Solar BESS calculation using SolarEvo's BESS Calculator, please review: ${shareUrl}`;
        const whatsappUrl = `https://wa.me/60163016170?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    // Check for shared data on page load
    async function checkForSharedData() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedId = urlParams.get('share');
        const sharedData = urlParams.get('shared'); // Fallback for URL-encoded data
    
        if (sharedId && isAmplifyConfigured && client) {
            try {
                const result = await client.graphql({
                    query: getSharedCalculationQuery,
                    variables: { id: sharedId }
                });
    
                const sharedData = result.data.getSharedCalculation;
    
                if (!sharedData || !sharedData.isActive) {
                    showErrorPopup('This shared link is no longer available or has expired.');
                    return;
                }
    
                loadSharedData(sharedData);
    
            } catch (error) {
                console.error('Error loading shared data:', error);
                
                // Fallback to URL-encoded data if backend fails
                if (sharedData) {
                    try {
                        const decodedData = JSON.parse(atob(sharedData));
                        if (new Date() > new Date(decodedData.expiresAt)) {
                            showErrorPopup('This shared link has expired.');
                            return;
                        }
                        loadSharedData(decodedData);
                    } catch (fallbackError) {
                        showErrorPopup('Invalid or corrupted shared link.');
                    }
                } else {
                    showErrorPopup('Error loading shared calculation.');
                }
            }
        } 
        // Fallback to URL-encoded data
        else if (sharedData) {
            try {
                const decodedData = JSON.parse(atob(sharedData));
                
                if (new Date() > new Date(decodedData.expiresAt)) {
                    showErrorPopup('This shared link has expired.');
                    return;
                }
                
                loadSharedData(decodedData);
                
            } catch (error) {
                console.error('Error loading shared data:', error);
                showErrorPopup('Invalid or corrupted shared link.');
            }
        }
    }
    
    

    // Load shared data into the calculator
    function loadSharedData(sharedData) {
        try {
            // Show info about shared calculation
            const infoMessage = `📋 Viewing shared calculation from: ${sharedData.creatorName}\nCreated: ${new Date(sharedData.createdAt).toLocaleDateString()}`;
            alert(infoMessage);
            
            console.debug('Loading shared data:', sharedData);
            
            // Load devices - handle both backend format and URL-encoded format
            devices = sharedData.devices.map(device => {
                console.debug('Processing device:', device.name, 'operatingRanges:', device.operatingRanges, 'batteryRanges:', device.batteryRanges);
                
                // Convert ranges based on their current format
                let operatingRanges = device.operatingRanges || [];
                let batteryRanges = device.batteryRanges || [];
                
                // Check if ranges are in backend format (objects) or frontend format (arrays)
                if (operatingRanges.length > 0 && typeof operatingRanges[0] === 'object' && operatingRanges[0].start !== undefined) {
                    console.debug('Converting backend format to frontend format for:', device.name);
                    // Backend format: convert objects to arrays
                    operatingRanges = operatingRanges.map(range => [range.start, range.end]);
                    batteryRanges = batteryRanges.map(range => [range.start, range.end]);
                } else if (operatingRanges.length > 0) {
                    console.debug('Using existing array format for:', device.name);
                }
                
                console.debug('Final ranges for', device.name, '- operating:', operatingRanges, 'battery:', batteryRanges);
                
                return {
                    ...device,
                    id: generateId(), // Generate new IDs for the current session
                    operatingRanges: operatingRanges,
                    batteryRanges: batteryRanges
                };
            });
            
            // Update UI
            renderDevices();
            updateCalculations();
            
            // Update charts when ready
            if (chartsReady) {
                updateCharts(devices);
            }
            
            // Clear the URL parameters to avoid reloading on refresh
            const url = new URL(window.location);
            url.searchParams.delete('share');
            url.searchParams.delete('shared');
            window.history.replaceState({}, document.title, url);
            
        } catch (error) {
            console.error('Error loading shared data:', error);
            showErrorPopup('Error loading shared calculation.');
        }
    }

    // Check for shared data when page loads
    checkForSharedData();
});