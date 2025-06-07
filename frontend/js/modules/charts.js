// Charts Module - Chart.js integration and chart management for BESS Calculator
window.Charts = (function() {
    'use strict';
    

    
    // Private variables
    let energyDistributionChart = null;
    let deviceEnergyChart = null;
    let costComparisonChart = null;
    let chartsInitialized = false;
    
    // Private utility functions
    function destroyChart(chart) {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
        return null;
    }
    
    function getChartColors() {
        return {
            energy: '#FF6B6B',
            solar: '#4ECDC4', 
            battery: '#FF8C00', // Changed to orange for better contrast
            devices: [
                '#FF6B6B', '#4ECDC4', '#FF8C00', '#96CEB4', '#FFEAA7',
                '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
            ],
            cost: {
                current: '#FF6B6B',
                withBess: '#4ECDC4',
                savings: '#28a745'
            }
        };
    }
    
    function createEnergyChart(ctx) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Energy Consumption (kW)',
                    data: Array(24).fill(0),
                    borderColor: getChartColors().energy,
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    tension: 0.1,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }, {
                    label: 'Solar Generation (kW)',
                    data: Array(24).fill(0),
                    borderColor: getChartColors().solar,
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    tension: 0.1,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }, {
                    label: 'BESS SOC (%)',
                    data: Array(24).fill(50),
                    borderColor: getChartColors().battery,
                    backgroundColor: 'rgba(255, 140, 0, 0.1)', // Updated to match orange color
                    tension: 0.1,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    datalabels: {
                        display: false // Remove data labels for energy chart
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: true,
                        callbacks: {
                            title: function(tooltipItems) {
                                // Show the time for the hovered point
                                return `Time: ${tooltipItems[0].label}`;
                            },
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                
                                // Format the value based on the dataset
                                if (context.datasetIndex === 2) {
                                    // BESS SOC - show percentage
                                    label += context.parsed.y.toFixed(1) + '%';
                                } else {
                                    // Energy Consumption and Solar Generation - show kW
                                    label += context.parsed.y.toFixed(2) + ' kW';
                                }
                                
                                return label;
                            },
                            afterBody: function(tooltipItems) {
                                // Add a summary line showing energy balance
                                const energyIndex = tooltipItems.findIndex(item => item.datasetIndex === 0);
                                const solarIndex = tooltipItems.findIndex(item => item.datasetIndex === 1);
                                
                                if (energyIndex >= 0 && solarIndex >= 0) {
                                    const consumption = tooltipItems[energyIndex].parsed.y;
                                    const generation = tooltipItems[solarIndex].parsed.y;
                                    const balance = generation - consumption;
                                    
                                    const balanceText = balance >= 0 
                                        ? `✅ Surplus: +${balance.toFixed(2)} kW`
                                        : `⚠️ Deficit: ${balance.toFixed(2)} kW`;
                                    
                                    return ['', balanceText];
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    y: {
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
                        title: {
                            display: true,
                            text: 'SOC (%)',
                            color: '#FF8C00' // Match BESS SOC curve color
                        },
                        min: 0,
                        max: 100,
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            color: '#FF8C00' // Match BESS SOC curve color
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time (24h)'
                        }
                    }
                }
            }
        });
    }
    
    function createDeviceChart(ctx) {
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: getChartColors().devices
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    datalabels: {
                        display: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? (value / total) * 100 : 0;
                            return percentage > 5; // Only show if > 5%
                        },
                        color: 'white',
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        formatter: function(value, context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return percentage + '%';
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#ffffff',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const dataset = context.dataset;
                                const currentValue = dataset.data[context.dataIndex];
                                const total = dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((currentValue / total) * 100).toFixed(1) : 0;
                                
                                return `${context.label}: ${percentage}% (${currentValue.toFixed(2)} kWh)`;
                            },
                            afterLabel: function(context) {
                                const dataset = context.dataset;
                                const total = dataset.data.reduce((a, b) => a + b, 0);
                                return `Total Daily Energy: ${total.toFixed(2)} kWh`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function createCostChart(ctx) {
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Current Cost', 'With BESS + Solar', '💰 Monthly Savings'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        getChartColors().cost.current,
                        getChartColors().cost.withBess,
                        getChartColors().cost.savings
                    ],
                    borderColor: [
                        getChartColors().cost.current,
                        getChartColors().cost.withBess,
                        getChartColors().cost.savings
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    datalabels: {
                        display: true,
                        color: 'white',
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        formatter: function(value) {
                            return 'RM ' + value.toFixed(0);
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Monthly Cost (RM)'
                        }
                    }
                }
            }
        });
    }
    
    // Public API
    const publicAPI = {
        // Initialize all charts
        initialize: function() {
            try {
                // If charts are already initialized, don't reinitialize
                if (chartsInitialized) {
                    console.log('📊 Charts already initialized, skipping...');
                    return true;
                }
                
                console.log('📊 Initializing charts...');
                
                // Destroy any existing charts before creating new ones
                this.destroy();
                
                // ChartDataLabels plugin is now registered globally in HTML
                
                // Get chart contexts
                const energyCtx = document.getElementById('energyDistributionChart')?.getContext('2d');
                const deviceCtx = document.getElementById('deviceEnergyChart')?.getContext('2d');
                const costCtx = document.getElementById('costComparisonChart')?.getContext('2d');
                
                // Initialize charts
                if (energyCtx) {
                    energyDistributionChart = createEnergyChart(energyCtx);
                    AppState.setChart('energy', energyDistributionChart);
                    console.log('✅ Energy chart created');
                }
                
                if (deviceCtx) {
                    deviceEnergyChart = createDeviceChart(deviceCtx);
                    AppState.setChart('device', deviceEnergyChart);
                    console.log('✅ Device chart created');
                }
                
                if (costCtx) {
                    costComparisonChart = createCostChart(costCtx);
                    AppState.setChart('cost', costComparisonChart);
                    console.log('✅ Cost chart created');
                }
                
                chartsInitialized = true;
                AppState.setFlag('chartsInitialized', true);
                console.log('📊 All charts initialized successfully');
                
                // Dispatch initialization complete event
                const event = new CustomEvent('chartsInitialized', {
                    detail: { 
                        energy: !!energyDistributionChart,
                        device: !!deviceEnergyChart,
                        cost: !!costComparisonChart
                    }
                });
                document.dispatchEvent(event);
                

                return true;
            } catch (error) {
                console.error('❌ Chart initialization failed:', error);
                return false;
            }
        },
        
        // Update energy distribution chart
        updateEnergyChart: function(chartData) {
            if (!energyDistributionChart || !chartData) return false;
            
            try {
                const { hourlyConsumption, hourlySolarGeneration, bessSOC } = chartData;
                
                energyDistributionChart.data.datasets[0].data = hourlyConsumption;
                energyDistributionChart.data.datasets[1].data = hourlySolarGeneration;
                energyDistributionChart.data.datasets[2].data = bessSOC;
                
                energyDistributionChart.update();

                return true;
            } catch (error) {
                console.error('❌ Error updating energy chart:', error);
                return false;
            }
        },
        
        // Update device energy chart
        updateDeviceChart: function(chartData) {
            if (!deviceEnergyChart || !chartData) return false;
            
            try {
                const { labels, data } = chartData;
                
                deviceEnergyChart.data.labels = labels;
                deviceEnergyChart.data.datasets[0].data = data;
                
                deviceEnergyChart.update();
                return true;
            } catch (error) {
                console.error('❌ Error updating device chart:', error);
                return false;
            }
        },
        
        // Update cost comparison chart
        updateCostChart: function(costData) {
            if (!costComparisonChart || !costData) return false;
            
            try {
                const { currentMonthlyCost, newMonthlyCost, monthlySavings } = costData;
                
                costComparisonChart.data.datasets[0].data = [
                    currentMonthlyCost,
                    newMonthlyCost,
                    monthlySavings
                ];
                
                costComparisonChart.update();
                return true;
            } catch (error) {
                console.error('❌ Error updating cost chart:', error);
                return false;
            }
        },
        
        // Update all charts at once
        updateAll: function(devices) {
            if (!Array.isArray(devices)) {
                console.warn('⚠️ Invalid devices data for chart update');
                return false;
            }
            
            try {
                // Get chart data from Calculations module
                const chartData = Calculations.generateChartData(devices);
                const deviceChartData = Calculations.generateDeviceChartData(devices);
                const costData = Calculations.calculateCostComparison(devices);
                
                // Update all charts
                this.updateEnergyChart(chartData);
                this.updateDeviceChart(deviceChartData);
                this.updateCostChart(costData);
                
                return true;
            } catch (error) {
                console.error('❌ Error updating all charts:', error);
                return false;
            }
        },
        
        // Get chart instances
        getCharts: function() {
            return {
                energy: energyDistributionChart,
                device: deviceEnergyChart,
                cost: costComparisonChart
            };
        },
        
        getChart: function(type) {
            const charts = this.getCharts();
            return charts[type] || null;
        },
        
        // Chart status
        isInitialized: function() {
            return chartsInitialized;
        },
        
        // Generate chart images for PDF
        generateChartImages: function() {
            return new Promise((resolve) => {
                const images = {};
                const charts = this.getCharts();
                
                try {
                    // Generate canvas images
                    if (charts.energy) {
                        images.energy = charts.energy.toBase64Image('image/png', 1.0);
                    }
                    
                    if (charts.device) {
                        images.device = charts.device.toBase64Image('image/png', 1.0);
                    }
                    
                    if (charts.cost) {
                        images.cost = charts.cost.toBase64Image('image/png', 1.0);
                    }
                    
                    resolve(images);
                } catch (error) {
                    console.error('❌ Error generating chart images:', error);
                    resolve({});
                }
            });
        },
        
        // Destroy all charts
        destroy: function() {
            console.log('🧹 Destroying existing charts...');
            
            if (energyDistributionChart) {
                energyDistributionChart = destroyChart(energyDistributionChart);
                console.log('🧹 Energy chart destroyed');
            }
            
            if (deviceEnergyChart) {
                deviceEnergyChart = destroyChart(deviceEnergyChart);
                console.log('🧹 Device chart destroyed');
            }
            
            if (costComparisonChart) {
                costComparisonChart = destroyChart(costComparisonChart);
                console.log('🧹 Cost chart destroyed');
            }
            
            chartsInitialized = false;
            AppState.setFlag('chartsInitialized', false);
            
            console.log('🧹 All charts destroyed');
        },
        
        // Resize charts (useful for responsive design)
        resize: function() {
            const charts = this.getCharts();
            Object.values(charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        },
        
        // Get chart colors (for external use)
        getColors: getChartColors
    };
    
    // Auto-initialize when DOM is ready (only once)
    let autoInitialized = false;
    
    function doAutoInitialize() {
        if (autoInitialized) {
            console.log('📊 Auto-initialization already done, skipping...');
            return;
        }
        autoInitialized = true;
        console.log('📊 Starting auto-initialization...');
        publicAPI.initialize();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Wait a bit for other modules to load
            setTimeout(doAutoInitialize, 100);
        });
    } else {
        // DOM is already ready
        setTimeout(doAutoInitialize, 100);
    }
    
    // Listen for device changes and update charts
    document.addEventListener('appStateChange', (event) => {
        if (event.detail.key === 'devices' && chartsInitialized) {
            const devices = event.detail.value;
            publicAPI.updateAll(devices);
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (chartsInitialized) {
            publicAPI.resize();
        }
    });
    
    return publicAPI;
})(); 
