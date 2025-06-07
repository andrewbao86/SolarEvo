// Working BESS Calculator Implementation

// Core application variables
let energyDistributionChart;
let deviceEnergyChart;
let costComparisonChart;
let chartsReady = false;
let devices = [];


// Register Chart.js plugins
if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeApplication();
});

function initializeApplication() {
    // Initialize features
    initializeDeviceSuggestions();
    initializeTimeBlocks();
    initializeCharts();
    initializeEventListeners();
    loadFromLocalStorage();
    
}

function initializeDeviceSuggestions() {
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

    const deviceSuggestions = document.getElementById('device-suggestions');
    if (deviceSuggestions) {
        deviceSuggestions.innerHTML = '';
        commonDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.name;
            option.setAttribute('data-power', device.power);
            deviceSuggestions.appendChild(option);
        });

        // Auto-fill power when device is selected
        const deviceInput = document.getElementById('device');
        const powerInput = document.getElementById('power');
        
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
    // Initialize time block pickers
    const operatingHoursContainer = document.getElementById('operating-hours-blocks');
    const batteryHoursContainer = document.getElementById('battery-hours-blocks');
    
    if (operatingHoursContainer) {
        createTimeBlockPicker(operatingHoursContainer, 'operating', [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    }
    
    if (batteryHoursContainer) {
        createTimeBlockPicker(batteryHoursContainer, 'battery', [18, 19, 20, 21, 22, 23, 0, 1]);
    }
}

function createTimeBlockPicker(container, type, defaultSelected) {
    // Create 48 half-hour time blocks (24 hours * 2)
    const timeBlocks = [];
    for (let halfHour = 0; halfHour < 48; halfHour++) {
        const hour = Math.floor(halfHour / 2);
        const minute = (halfHour % 2) * 30;
        const isDefaultSelected = defaultSelected.includes(hour);
        
        const block = document.createElement('div');
        block.className = `time-block ${isDefaultSelected ? 'selected' : ''}`;
        block.dataset.hour = hour;
        block.dataset.halfhour = halfHour;
        block.title = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Only show text on full hours for cleaner look
        if (minute === 0) {
            block.textContent = `${hour.toString().padStart(2, '0')}`;
        }
        
        block.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Toggle selection for the entire hour (both half-hour blocks)
            const hourBlocks = container.querySelectorAll(`[data-hour="${hour}"]`);
            const isCurrentlySelected = block.classList.contains('selected');
            
            hourBlocks.forEach(hourBlock => {
                if (isCurrentlySelected) {
                    hourBlock.classList.remove('selected');
                } else {
                    hourBlock.classList.add('selected');
                }
            });
            
            updateTimeDisplay(container, type);
        });
        
        timeBlocks.push(block);
    }
    
    container.innerHTML = '';
    timeBlocks.forEach(block => container.appendChild(block));
    
    updateTimeDisplay(container, type);
}

function updateTimeDisplay(container, type) {
    const selectedBlocks = container.querySelectorAll('.time-block.selected');
    // Get unique hours from selected blocks
    const selectedHours = [...new Set(Array.from(selectedBlocks).map(block => parseInt(block.dataset.hour)))];
    
    // Update display
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
    const formatHour = (h) => `${h.toString().padStart(2, '0')}:00`;
    return start === end ? formatHour(start) : `${formatHour(start)}-${formatHour(end)}`;
}

function initializeCharts() {
    // Initialize Chart.js charts
    try {
        const energyCtx = document.getElementById('energyDistributionChart');
        const deviceCtx = document.getElementById('deviceEnergyChart');
        const costCtx = document.getElementById('costComparisonChart');

        if (energyCtx) {
            energyDistributionChart = new Chart(energyCtx, {
                type: 'line',
                data: {
                    labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                    datasets: [{
                        label: 'Energy Consumption (kW)',
                        data: Array(24).fill(0),
                        borderColor: '#FF6B6B',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        tension: 0.1,
                        fill: false
                    }, {
                        label: 'Solar Generation (kW)',
                        data: Array(24).fill(0),
                        borderColor: '#FFD93D',
                        backgroundColor: 'rgba(255, 217, 61, 0.1)',
                        tension: 0.1,
                        fill: false
                    }, {
                        label: 'BESS State of Charge (%)',
                        data: Array(24).fill(50),
                        borderColor: '#6BCF7F',
                        backgroundColor: 'rgba(107, 207, 127, 0.1)',
                        tension: 0.1,
                        fill: false,
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Daily Energy System Analysis'
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Time of Day'
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Power (kW)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Battery SOC (%)'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                        }
                    }
                }
            });
        }

        if (deviceCtx) {
            deviceEnergyChart = new Chart(deviceCtx, {
                type: 'doughnut',
                data: {
                    labels: ['No devices added'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e0e0e0']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Energy Distribution by Device'
                        },
                        legend: {
                            display: true,
                            position: 'right'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${label}: ${value.toFixed(2)} kWh (${percentage}%)`;
                                }
                            }
                        },
                        datalabels: {
                            display: true,
                            formatter: (value, context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return percentage > 5 ? `${percentage}%` : '';
                            },
                            color: '#fff',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        }
                    }
                }
            });
        }

        if (costCtx) {
            costComparisonChart = new Chart(costCtx, {
                type: 'bar',
                data: {
                    labels: ['Current Cost\n(Without BESS)', 'Estimated Cost\n(With BESS)', 'Monthly Savings'],
                    datasets: [{
                        label: 'Amount (RM)',
                        data: [0, 0, 0],
                        backgroundColor: ['#FF6384', '#36A2EB', '#4BC0C0'],
                        borderColor: ['#FF4757', '#2196F3', '#26D0CE'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Monthly Electricity Cost Analysis (Malaysia)'
                        },
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    if (context.dataIndex === 0) {
                                        return `Current monthly cost: RM ${value.toFixed(0)}`;
                                    } else if (context.dataIndex === 1) {
                                        return `Estimated cost with BESS: RM ${value.toFixed(0)}`;
                                    } else {
                                        return `Potential monthly savings: RM ${value.toFixed(0)}`;
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Cost (RM)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return 'RM ' + value.toFixed(0);
                                }
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 0,
                                minRotation: 0
                            }
                        }
                    }
                }
            });
        }

        chartsReady = true;
    } catch (error) {
        console.error('? Failed to initialize charts:', error);
    }
}

function initializeEventListeners() {
    // Add Device Button
    const addDeviceButton = document.getElementById('add-device');
    if (addDeviceButton) {
        addDeviceButton.addEventListener('click', addDevice);
    }

    // Clear All Button
    const clearAllButton = document.getElementById('clear-all');
    if (clearAllButton) {
        clearAllButton.addEventListener('click', clearAllDevices);
    }

    // CSV Download Template
    const downloadCsvButton = document.getElementById('download-csv-template');
    if (downloadCsvButton) {
        downloadCsvButton.addEventListener('click', downloadCsvTemplate);
    }

    // CSV Upload
    const uploadCsvButton = document.getElementById('upload-csv-btn');
    const csvFileInput = document.getElementById('csv-file-input');
    if (uploadCsvButton && csvFileInput) {
        uploadCsvButton.addEventListener('click', () => csvFileInput.click());
        csvFileInput.addEventListener('change', handleCsvUpload);
    }

    // Clear time blocks buttons
    const clearOperatingButton = document.getElementById('clear-operating-blocks');
    const clearBatteryButton = document.getElementById('clear-battery-blocks');
    
    if (clearOperatingButton) {
        clearOperatingButton.addEventListener('click', () => clearTimeBlocks('operating-hours-blocks'));
    }
    
    if (clearBatteryButton) {
        clearBatteryButton.addEventListener('click', () => clearTimeBlocks('battery-hours-blocks'));
    }

    // PDF Download
    const downloadPdfButton = document.getElementById('download-pdf');
    if (downloadPdfButton) {
        downloadPdfButton.addEventListener('click', generatePDFReport);
    }

    // Share Link
    const generateShareButton = document.getElementById('generate-share-link');
    if (generateShareButton) {
        generateShareButton.addEventListener('click', generateShareableLink);
    }

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Input validation
    const deviceInput = document.getElementById('device');
    const powerInput = document.getElementById('power');
    const quantityInput = document.getElementById('quantity');

    [deviceInput, powerInput, quantityInput].forEach(input => {
        if (input) {
            input.addEventListener('input', validateInputs);
        }
    });

}

function addDevice() {
    const deviceInput = document.getElementById('device');
    const powerInput = document.getElementById('power');
    const quantityInput = document.getElementById('quantity');
    const criticalCheckbox = document.getElementById('critical-device');

    if (!validateInputs()) {
        alert('Please fill in all required fields with valid values.');
        return;
    }

    // Get selected time blocks
    const operatingHours = getSelectedHours('operating-hours-blocks');
    const batteryHours = getSelectedHours('battery-hours-blocks');

    const newDevice = {
        id: generateId(),
        name: deviceInput.value.trim(),
        power: parseFloat(powerInput.value),
        quantity: parseInt(quantityInput.value),
        operatingHours: operatingHours.length || 12, // Use selected hours or default 12
        batteryHours: batteryHours.length || 8,      // Use selected hours or default 8
        operatingSchedule: operatingHours,
        batterySchedule: batteryHours,
        critical: criticalCheckbox ? criticalCheckbox.checked : false
    };

    devices.push(newDevice);
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
    
    const selectedBlocks = container.querySelectorAll('.time-block.selected');
    selectedBlocks.forEach(block => block.classList.remove('selected'));
    
    // Update display
    const type = containerId.includes('operating') ? 'operating' : 'battery';
    updateTimeDisplay(container, type);
}

function validateInputs() {
    const deviceInput = document.getElementById('device');
    const powerInput = document.getElementById('power');
    const quantityInput = document.getElementById('quantity');
    const addButton = document.getElementById('add-device');

    let isValid = true;

    if (!deviceInput.value.trim()) {
        isValid = false;
    }

    if (!powerInput.value || isNaN(powerInput.value) || parseFloat(powerInput.value) <= 0) {
        isValid = false;
    }

    if (!quantityInput.value || isNaN(quantityInput.value) || parseInt(quantityInput.value) <= 0) {
        isValid = false;
    }

    if (addButton) {
        addButton.disabled = !isValid;
    }

    return isValid;
}

function clearInputs() {
    document.getElementById('device').value = '';
    document.getElementById('power').value = '';
    document.getElementById('quantity').value = '1';
    const criticalCheckbox = document.getElementById('critical-device');
    if (criticalCheckbox) criticalCheckbox.checked = false;
    
    document.getElementById('device').focus();
}

function renderDevices() {
    const devicesContainer = document.getElementById('devices-container');
    if (!devicesContainer) return;

    devicesContainer.innerHTML = '';
    
    devices.forEach((device, index) => {
        const row = document.createElement('div');
        row.className = 'device-list-row';

        row.innerHTML = `
            <div>${device.critical ? '? ' : ''}${device.name}</div>
            <div>${device.power}W</div>
            <div>${device.quantity} ${device.quantity > 1 ? 'sets' : 'set'}</div>
            <div>${device.operatingHours}h</div>
            <div>${device.batteryHours}h</div>
            <div class="device-list-actions">
                <button class="edit-btn" onclick="editDevice(${index})" title="Edit Device">??</button>
                <button class="delete-btn" onclick="deleteDevice(${index})" title="Delete Device">?</button>
            </div>
        `;

        devicesContainer.appendChild(row);
    });
}

function deleteDevice(index) {
    if (confirm('Are you sure you want to delete this device?')) {
        devices.splice(index, 1);
        renderDevices();
        updateCalculations();
        saveToLocalStorage();
    }
}

function editDevice(index) {
    const device = devices[index];
    if (!device) return;

    document.getElementById('device').value = device.name;
    document.getElementById('power').value = device.power;
    document.getElementById('quantity').value = device.quantity;
    
    const criticalCheckbox = document.getElementById('critical-device');
    if (criticalCheckbox) criticalCheckbox.checked = device.critical || false;

    devices.splice(index, 1);
    renderDevices();
    updateCalculations();
    saveToLocalStorage();
}

function clearAllDevices() {
    if (devices.length === 0) {
        alert('No devices to clear.');
        return;
    }
    
    if (confirm('Are you sure you want to remove all devices?')) {
        devices = [];
        renderDevices();
        updateCalculations();
        saveToLocalStorage();
    }
}

function updateCalculations() {
    let totalEnergy = 0;
    let batteryCapacity = 0;

    devices.forEach(device => {
        const deviceTotalEnergy = (device.power * device.quantity * device.operatingHours) / 1000;
        const deviceBatteryEnergy = (device.power * device.quantity * device.batteryHours) / 1000;
        
        totalEnergy += deviceTotalEnergy;
        batteryCapacity += deviceBatteryEnergy;
    });

    const recommendedSolarSize = totalEnergy / 4; // Assuming 4 peak sun hours
    const recommendedBessSize = batteryCapacity * 1.2; // 20% buffer

    // Update UI
    const totalEnergyElement = document.getElementById('total-energy');
    const batteryCapacityElement = document.getElementById('battery-capacity');
    const solarSizeElement = document.getElementById('solar-size');
    const recommendedSizeElement = document.getElementById('recommended-size');
    const solarevoRecommendationElement = document.getElementById('solarevo-recommendation');

    if (totalEnergyElement) totalEnergyElement.textContent = `${totalEnergy.toFixed(2)} kWh`;
    if (batteryCapacityElement) batteryCapacityElement.textContent = `${batteryCapacity.toFixed(2)} kWh`;
    if (solarSizeElement) solarSizeElement.textContent = `${recommendedSolarSize.toFixed(2)} kWp`;
    if (recommendedSizeElement) recommendedSizeElement.textContent = `${recommendedBessSize.toFixed(2)} kWh`;

    // Update recommendation
    if (solarevoRecommendationElement) {
        let recommendation = 'Add devices to see recommendations';
        if (devices.length > 0) {
            if (recommendedBessSize <= 5.12) {
                recommendation = 'SE-BES-5.12 (5.12 kWh)';
            } else if (recommendedBessSize <= 10.24) {
                recommendation = 'SE-BES-10.24 (10.24 kWh)';
            } else if (recommendedBessSize <= 15.36) {
                recommendation = 'SE-BES-15.36 (15.36 kWh)';
            } else {
                recommendation = 'Custom Solution Required';
            }
        }
        solarevoRecommendationElement.textContent = recommendation;
    }

    // Enable buttons if we have devices
    const downloadPdfButton = document.getElementById('download-pdf');
    const generateShareButton = document.getElementById('generate-share-link');
    
    if (downloadPdfButton) downloadPdfButton.disabled = devices.length === 0;
    if (generateShareButton) generateShareButton.disabled = devices.length === 0;

    updateCharts();
}

function updateCharts() {
    if (!chartsReady) return;

    // Update device energy chart
    if (deviceEnergyChart) {
        if (devices.length > 0) {
            const labels = devices.map(d => d.name);
            const data = devices.map(d => (d.power * d.quantity * d.operatingHours) / 1000);
            const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'];

            deviceEnergyChart.data.labels = labels;
            deviceEnergyChart.data.datasets[0].data = data;
            deviceEnergyChart.data.datasets[0].backgroundColor = colors.slice(0, devices.length);
        } else {
            deviceEnergyChart.data.labels = ['No devices added'];
            deviceEnergyChart.data.datasets[0].data = [1];
            deviceEnergyChart.data.datasets[0].backgroundColor = ['#e0e0e0'];
        }
        deviceEnergyChart.update();
    }

    // Update cost comparison chart
    if (costComparisonChart) {
        const totalEnergy = devices.reduce((sum, d) => sum + (d.power * d.quantity * d.operatingHours) / 1000, 0);
        const monthlyEnergy = totalEnergy * 30;
        const costWithoutBess = monthlyEnergy * 0.57; // RM per kWh
        const costWithBess = costWithoutBess * 0.3; // 70% savings
        const savings = costWithoutBess - costWithBess;

        costComparisonChart.data.datasets[0].data = [
            costWithoutBess.toFixed(0), 
            costWithBess.toFixed(0),
            savings.toFixed(0)
        ];
        costComparisonChart.update();
    }

    // Update energy distribution chart
    if (energyDistributionChart) {
        const hourlyConsumption = Array(24).fill(0);
        const solarGeneration = Array(24).fill(0);
        const batterySOC = Array(24).fill(0);
        
        if (devices.length > 0) {
            devices.forEach(device => {
                const powerKw = (device.power * device.quantity) / 1000;
                
                // Use actual operating schedule if available
                const schedule = device.operatingSchedule || [];
                if (schedule.length > 0) {
                    schedule.forEach(hour => {
                        hourlyConsumption[hour] += powerKw;
                    });
                } else {
                    // Fallback to 6-18 hours
                    for (let hour = 6; hour < 18; hour++) {
                        hourlyConsumption[hour] += powerKw;
                    }
                }
            });

            // Simulate solar generation (6 AM to 6 PM)
            for (let hour = 6; hour < 18; hour++) {
                const peakSolar = Math.max(...hourlyConsumption) * 1.2;
                const solarFactor = Math.sin(((hour - 6) / 12) * Math.PI);
                solarGeneration[hour] = peakSolar * solarFactor;
            }

            // Simulate battery SOC
            let currentSOC = 50; // Start at 50%
            for (let hour = 0; hour < 24; hour++) {
                const consumption = hourlyConsumption[hour];
                const solar = solarGeneration[hour];
                const netEnergy = solar - consumption;
                
                if (netEnergy > 0) {
                    // Charging
                    currentSOC = Math.min(100, currentSOC + (netEnergy * 10));
                } else if (netEnergy < 0) {
                    // Discharging
                    currentSOC = Math.max(0, currentSOC + (netEnergy * 10));
                }
                
                batterySOC[hour] = currentSOC;
            }
        }

        energyDistributionChart.data.datasets[0].data = hourlyConsumption;
        energyDistributionChart.data.datasets[1].data = solarGeneration;
        energyDistributionChart.data.datasets[2].data = batterySOC;
        energyDistributionChart.update();
    }
}

function downloadCsvTemplate() {
    const csvContent = `Device Name,Power (W),Quantity,Operating Hours,Hours on Battery,Critical Device
Air Conditioner,1200,1,12,8,Yes
Fridge,250,1,24,12,Yes
TV,120,2,8,4,No
Router,10,1,24,24,Yes`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bess_calculator_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert('CSV template downloaded successfully!');
}

function handleCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const newDevices = [];

            // Skip header row
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const columns = line.split(',');
                if (columns.length >= 6) {
                    const device = {
                        id: generateId(),
                        name: columns[0].trim(),
                        power: parseFloat(columns[1]) || 0,
                        quantity: parseInt(columns[2]) || 1,
                        operatingHours: parseFloat(columns[3]) || 12,
                        batteryHours: parseFloat(columns[4]) || 8,
                        critical: columns[5].toLowerCase().includes('yes')
                    };

                    if (device.name && device.power > 0) {
                        newDevices.push(device);
                    }
                }
            }

            if (newDevices.length > 0) {
                const action = confirm(`Found ${newDevices.length} devices in CSV. Click OK to replace existing devices, or Cancel to add to existing devices.`);
                
                if (action) {
                    devices = newDevices; // Replace
                } else {
                    devices = devices.concat(newDevices); // Add
                }

                renderDevices();
                updateCalculations();
                saveToLocalStorage();
                
                alert(`Successfully ${action ? 'replaced with' : 'added'} ${newDevices.length} devices from CSV!`);
            } else {
                alert('No valid devices found in CSV file.');
            }
        } catch (error) {
            console.error('? CSV processing error:', error);
            alert('Error processing CSV file. Please check the format and try again.');
        }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

function generatePDFReport() {
    if (typeof window.jsPDF === 'undefined') {
        alert('PDF library not loaded. Please refresh the page and try again.');
        return;
    }

    if (devices.length === 0) {
        alert('Please add some devices before generating a report.');
        return;
    }

    const { jsPDF } = window;
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('BESS Calculator Report', 20, 30);

    // Add timestamp
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 40);

    // Add devices table
    doc.setFontSize(14);
    doc.text('Device List:', 20, 55);

    const tableData = devices.map(device => [
        device.name,
        `${device.power}W`,
        device.quantity.toString(),
        `${device.operatingHours}h`,
        `${device.batteryHours}h`,
        device.critical ? 'Yes' : 'No'
    ]);

    doc.autoTable({
        head: [['Device', 'Power', 'Qty', 'Op Hours', 'Batt Hours', 'Critical']],
        body: tableData,
        startY: 65,
        styles: { fontSize: 10 }
    });

    // Add calculations
    const finalY = doc.lastAutoTable.finalY + 20;
    
    const totalEnergy = devices.reduce((sum, d) => sum + (d.power * d.quantity * d.operatingHours) / 1000, 0);
    const batteryCapacity = devices.reduce((sum, d) => sum + (d.power * d.quantity * d.batteryHours) / 1000, 0);
    const recommendedSolarSize = totalEnergy / 4;
    const recommendedBessSize = batteryCapacity * 1.2;
    
    doc.setFontSize(12);
    doc.text('Calculation Results:', 20, finalY);
    doc.setFontSize(10);
    doc.text(`Total Daily Energy: ${totalEnergy.toFixed(2)} kWh`, 20, finalY + 10);
    doc.text(`Battery Capacity Required: ${batteryCapacity.toFixed(2)} kWh`, 20, finalY + 20);
    doc.text(`Recommended Solar Size: ${recommendedSolarSize.toFixed(2)} kWp`, 20, finalY + 30);
    doc.text(`Recommended BESS Size: ${recommendedBessSize.toFixed(2)} kWh`, 20, finalY + 40);

    // Add recommendation
    let recommendation = '';
    if (recommendedBessSize <= 5.12) {
        recommendation = 'SE-BES-5.12 (5.12 kWh)';
    } else if (recommendedBessSize <= 10.24) {
        recommendation = 'SE-BES-10.24 (10.24 kWh)';
    } else if (recommendedBessSize <= 15.36) {
        recommendation = 'SE-BES-15.36 (15.36 kWh)';
    } else {
        recommendation = 'Custom Solution Required';
    }
    
    doc.text(`SolarEvo Recommendation: ${recommendation}`, 20, finalY + 55);

    doc.save('bess-calculator-report.pdf');
    
    // Redirect to thank you page
    setTimeout(() => {
        window.location.href = 'thank-you.html';
    }, 1000);
}

function generateShareableLink() {
    if (devices.length === 0) {
        alert('Please add some devices before generating a shareable link.');
        return;
    }

    const prospectName = document.getElementById('prospect-name')?.value || 'User';
    const prospectEmail = document.getElementById('prospect-email')?.value || '';
    const prospectMobile = document.getElementById('prospect-mobile')?.value || '';

    const shareData = {
        name: prospectName,
        email: prospectEmail,
        mobile: prospectMobile,
        devices: devices,
        timestamp: new Date().toISOString()
    };

    // Create shareable URL with encoded data
    const encodedData = btoa(JSON.stringify(shareData));
    const shareUrl = `${window.location.origin}${window.location.pathname}?shared=${encodedData}`;

    // Create WhatsApp message
    const whatsappMessage = `Hi, I've created a Solar BESS calculation using SolarEvo's BESS Calculator, please review: ${shareUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=60163016170&text=${encodeURIComponent(whatsappMessage)}`;

    // Show share modal
    const shareContent = `
        <div style="text-align: center; padding: 20px;">
            <h3>Share Your BESS Calculation</h3>
            <p><strong>Created by:</strong> ${prospectName}</p>
            <p><strong>Devices:</strong> ${devices.length} devices configured</p>
            
            <div style="margin: 20px 0;">
                <label>Shareable Link:</label>
                <div style="display: flex; gap: 10px; margin-top: 5px;">
                    <input type="text" id="share-url" value="${shareUrl}" readonly style="flex: 1; padding: 8px; border: 1px solid #ddd;">
                    <button onclick="copyShareUrl()" style="padding: 8px 16px; background: #007bff; color: white; border: none; cursor: pointer;">Copy</button>
                </div>
            </div>
            
            <div style="margin: 20px 0;">
                <a href="${whatsappUrl}" target="_blank" style="background: #25d366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    ?? Share via WhatsApp
                </a>
            </div>
            
            <button onclick="closeShareModal()" style="margin-top: 10px; padding: 8px 16px; background: #6c757d; color: white; border: none; cursor: pointer;">Close</button>
        </div>
    `;

    // Create modal
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

}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = newTheme === 'dark' ? '??' : '??';
    }
    
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('bessCalculatorDevices', JSON.stringify(devices));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedDevices = localStorage.getItem('bessCalculatorDevices');
        if (savedDevices) {
            devices = JSON.parse(savedDevices);
            renderDevices();
            updateCalculations();
        }
        
        // Load theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = savedTheme === 'dark' ? '??' : '??';
        }

        // Check for shared data in URL
        checkForSharedData();
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
    }
}

function checkForSharedData() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('shared');
    
    if (sharedData) {
        try {
            const data = JSON.parse(atob(sharedData));
            if (data.devices && Array.isArray(data.devices)) {
                const confirmLoad = confirm(`Load shared calculation from ${data.name || 'Unknown'}?\n\nThis will replace your current devices.`);
                
                if (confirmLoad) {
                    devices = data.devices.map(d => ({
                        ...d,
                        id: generateId() // Generate new IDs
                    }));
                    
                    // Fill prospect info if available
                    if (data.name && document.getElementById('prospect-name')) {
                        document.getElementById('prospect-name').value = data.name;
                    }
                    
                    renderDevices();
                    updateCalculations();
                    saveToLocalStorage();
                    
                    alert('Shared calculation loaded successfully!');
                }
            }
        } catch (error) {
            console.error('Error loading shared data:', error);
        }
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Global functions for onclick handlers
window.editDevice = editDevice;
window.deleteDevice = deleteDevice;
window.copyShareUrl = function() {
    const urlInput = document.getElementById('share-url');
    if (urlInput) {
        urlInput.select();
        urlInput.setSelectionRange(0, 99999);
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    }
};
window.closeShareModal = function() {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.remove();
    }
};

