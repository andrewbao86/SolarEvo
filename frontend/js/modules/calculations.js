// Calculations Module - Energy calculations and BESS recommendations for BESS Calculator
window.Calculations = (function() {
    'use strict';
    
    
    // Private constants
    const TNB_RATE = 0.57; // RM per kWh (Malaysia TNB rate)
    const GRID_REDUCTION_FACTOR = 0.7; // 70% grid reduction with BESS+Solar
    const BATTERY_EFFICIENCY = 0.9; // 90% battery efficiency
    const SOLAR_EFFICIENCY = 0.85; // 85% solar panel efficiency
    
    // Private utility functions
    function roundToDecimal(value, decimals = 2) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
    
    function calculateDeviceEnergy(device) {
        if (!device || !device.operatingHours || !Array.isArray(device.operatingHours)) {
            return 0;
        }
        
        const hoursPerDay = device.operatingHours.length;
        const powerKW = device.power / 1000; // Convert W to kW
        const quantity = device.quantity || 1;
        
        return powerKW * hoursPerDay * quantity;
    }
    
    function calculateDeviceBatteryEnergy(device) {
        if (!device || !device.batteryHours || !Array.isArray(device.batteryHours)) {
            return 0;
        }
        
        const batteryHoursPerDay = device.batteryHours.length;
        const powerKW = device.power / 1000; // Convert W to kW
        const quantity = device.quantity || 1;
        
        return powerKW * batteryHoursPerDay * quantity;
    }
    
    function generateHourlyConsumption(devices) {
        const hourlyConsumption = Array(24).fill(0);
        
        devices.forEach(device => {
            if (device.operatingHours && Array.isArray(device.operatingHours)) {
                const powerKW = device.power / 1000 * (device.quantity || 1);
                device.operatingHours.forEach(hour => {
                    if (hour >= 0 && hour < 24) {
                        hourlyConsumption[hour] += powerKW;
                    }
                });
            }
        });
        
        return hourlyConsumption;
    }
    
    function generateSolarGeneration() {
        const hourlySolarGeneration = Array(24).fill(0);
        const totalSolarCapacity = 5; // kW - will be made configurable later
        
        // Solar generation with realistic Gaussian curve (7am to 7pm, 0 at boundaries)
        for (let hour = 7; hour <= 19; hour++) {
            if (hour === 7 || hour === 19) {
                hourlySolarGeneration[hour] = 0; // Exactly 0 at 7am and 7pm
            } else {
                // Gaussian curve centered at 13:00 (1pm) with good spread
                const center = 13;
                const sigma = 3;
                const gaussian = Math.exp(-0.5 * Math.pow((hour - center) / sigma, 2));
                hourlySolarGeneration[hour] = gaussian * totalSolarCapacity * SOLAR_EFFICIENCY;
            }
        }
        
        return hourlySolarGeneration;
    }
    
    function calculateBessSOC(hourlyConsumption, hourlySolarGeneration) {
        const bessSOC = Array(24).fill(50); // Start at 50% SOC
        const batteryCapacity = 10; // kWh - will be made configurable later
        let currentSOC = 50; // Start at 50%
        
        for (let hour = 0; hour < 24; hour++) {
            const consumption = hourlyConsumption[hour];
            const solarGen = hourlySolarGeneration[hour];
            const netPower = solarGen - consumption;
            
            // Update SOC based on net power flow
            const socChange = (netPower / batteryCapacity) * 100;
            currentSOC += socChange * BATTERY_EFFICIENCY;
            
            // Keep SOC between 20% and 100%
            currentSOC = Math.max(20, Math.min(100, currentSOC));
            bessSOC[hour] = currentSOC;
        }
        
        return bessSOC;
    }
    
    // Public API
    const publicAPI = {
        // Basic calculations
        calculateTotalEnergy: function(devices) {
            if (!Array.isArray(devices)) return 0;
            
            const totalEnergy = devices.reduce((total, device) => {
                return total + calculateDeviceEnergy(device);
            }, 0);
            
            return roundToDecimal(totalEnergy);
        },
        
        calculateTotalBatteryEnergy: function(devices) {
            if (!Array.isArray(devices)) return 0;
            
            const totalBatteryEnergy = devices.reduce((total, device) => {
                return total + calculateDeviceBatteryEnergy(device);
            }, 0);
            
            return roundToDecimal(totalBatteryEnergy);
        },
        
        // Device-specific calculations
        calculateDeviceEnergy: calculateDeviceEnergy,
        calculateDeviceBatteryEnergy: calculateDeviceBatteryEnergy,
        
        // Hourly data generation
        generateHourlyConsumption: generateHourlyConsumption,
        generateSolarGeneration: generateSolarGeneration,
        calculateBessSOC: calculateBessSOC,
        
        // Chart data generation
        generateChartData: function(devices) {
            const hourlyConsumption = this.generateHourlyConsumption(devices);
            const hourlySolarGeneration = this.generateSolarGeneration();
            const bessSOC = this.calculateBessSOC(hourlyConsumption, hourlySolarGeneration);
            
            return {
                hourlyConsumption,
                hourlySolarGeneration,
                bessSOC,
                hours: Array.from({length: 24}, (_, i) => `${i}:00`)
            };
        },
        
        // Device chart data
        generateDeviceChartData: function(devices) {
            if (!Array.isArray(devices) || devices.length === 0) {
                return { labels: [], data: [], percentages: [] };
            }
            
            const deviceData = devices.map(device => ({
                name: device.name,
                energy: calculateDeviceEnergy(device),
                device: device
            }));
            
            const totalEnergy = deviceData.reduce((sum, item) => sum + item.energy, 0);
            
            const labels = deviceData.map(item => item.name);
            const data = deviceData.map(item => roundToDecimal(item.energy));
            const percentages = deviceData.map(item => 
                totalEnergy > 0 ? roundToDecimal((item.energy / totalEnergy) * 100, 1) : 0
            );
            
            return { labels, data, percentages };
        },
        
        // Cost calculations
        calculateCostComparison: function(devices) {
            const totalEnergy = this.calculateTotalEnergy(devices);
            const monthlyEnergyKWh = totalEnergy * 30; // 30 days
            
            // Current cost (grid only)
            const currentMonthlyCost = monthlyEnergyKWh * TNB_RATE;
            
            // With BESS + Solar (70% reduction)
            const reducedEnergyFromGrid = monthlyEnergyKWh * (1 - GRID_REDUCTION_FACTOR);
            const newMonthlyCost = reducedEnergyFromGrid * TNB_RATE;
            
            // Monthly savings
            const monthlySavings = currentMonthlyCost - newMonthlyCost;
            
            return {
                currentMonthlyCost: roundToDecimal(currentMonthlyCost),
                newMonthlyCost: roundToDecimal(newMonthlyCost),
                monthlySavings: roundToDecimal(monthlySavings),
                savingsPercentage: currentMonthlyCost > 0 ? 
                    roundToDecimal((monthlySavings / currentMonthlyCost) * 100, 1) : 0
            };
        },
        
        // BESS recommendations
        calculateBatteryCapacity: function(devices) {
            const batteryEnergy = this.calculateTotalBatteryEnergy(devices);
            
            // Add 20% buffer for efficiency and safety
            const recommendedCapacity = batteryEnergy * 1.2;
            
            return roundToDecimal(recommendedCapacity);
        },
        
        calculateSolarSize: function(devices) {
            const totalEnergy = this.calculateTotalEnergy(devices);
            
            // Assume 5 hours of effective sunlight per day
            const effectiveSunHours = 5;
            
            // Account for system efficiency
            const requiredSolarCapacity = (totalEnergy / effectiveSunHours) / SOLAR_EFFICIENCY;
            
            return roundToDecimal(requiredSolarCapacity);
        },
        
        calculateRecommendedBessSize: function(devices) {
            const batteryCapacity = this.calculateBatteryCapacity(devices);
            const totalEnergy = this.calculateTotalEnergy(devices);
            
            // Consider total energy consumption for sizing
            const energyBasedSize = totalEnergy * 0.8; // 80% of daily consumption
            
            // Use the larger of the two calculations
            const recommendedSize = Math.max(batteryCapacity, energyBasedSize);
            
            return roundToDecimal(recommendedSize);
        },
        
        // SolarEvo product recommendations
        getSolarEvoRecommendation: function(devices) {
            const recommendedSize = this.calculateRecommendedBessSize(devices);
            
            if (recommendedSize === 0) {
                return "No devices added yet";
            } else if (recommendedSize <= 5) {
                return "SolarEvo Compact 5kWh BESS System";
            } else if (recommendedSize <= 10) {
                return "SolarEvo Standard 10kWh BESS System";
            } else if (recommendedSize <= 15) {
                return "SolarEvo Premium 15kWh BESS System";
            } else if (recommendedSize <= 25) {
                return "SolarEvo Industrial 25kWh BESS System";
            } else {
                return `SolarEvo Custom ${Math.ceil(recommendedSize / 5) * 5}kWh BESS System`;
            }
        },
        
        // Validation helpers
        validateDevice: function(device) {
            if (!device || typeof device !== 'object') return false;
            
            const requiredFields = ['name', 'power', 'operatingHours', 'batteryHours'];
            const hasRequiredFields = requiredFields.every(field => 
                device.hasOwnProperty(field)
            );
            
            if (!hasRequiredFields) return false;
            
            // Validate data types and values
            if (typeof device.name !== 'string' || device.name.trim() === '') return false;
            if (typeof device.power !== 'number' || device.power <= 0) return false;
            if (!Array.isArray(device.operatingHours)) return false;
            if (!Array.isArray(device.batteryHours)) return false;
            
            // Validate hour values
            const validHours = [...device.operatingHours, ...device.batteryHours];
            const hasInvalidHours = validHours.some(hour => 
                typeof hour !== 'number' || hour < 0 || hour > 23
            );
            
            return !hasInvalidHours;
        },
        
        // Utility functions
        roundToDecimal: roundToDecimal,
        
        // Constants access
        getConstants: function() {
            return {
                TNB_RATE,
                GRID_REDUCTION_FACTOR,
                BATTERY_EFFICIENCY,
                SOLAR_EFFICIENCY
            };
        },
        
        // Update constants (for future configurability)
        updateConstants: function(newConstants) {
            // For now, just log - in future versions this could be configurable
            // Implementation would go here for configurable rates/factors
        }
    };
    
    return publicAPI;
})(); 
