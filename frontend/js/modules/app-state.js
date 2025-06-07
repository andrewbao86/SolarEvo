// App State Module - Shared state management for BESS Calculator
window.AppState = (function() {
    'use strict';
    
    
    // Shared application state
    const state = {
        devices: [],
        commonDevices: [
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
        ],
        domElements: {},
        charts: {
            energy: null,
            device: null,
            cost: null
        },
        flags: {
            chartsReady: false,
            domReady: false,
            chartsInitialized: false
        }
    };
    
    // Private methods
    function notifyStateChange(key, value) {
        // Dispatch custom events for state changes
        const event = new CustomEvent('appStateChange', {
            detail: { key, value, state: state }
        });
        document.dispatchEvent(event);
    }
    
    // Public API
    const publicAPI = {
        // Generic getters/setters
        get: function(key) {
            return state[key];
        },
        
        set: function(key, value) {
            state[key] = value;
            notifyStateChange(key, value);
        },
        
        // Device management
        getDevices: function() {
            return state.devices;
        },
        
        setDevices: function(devices) {
            state.devices = devices;
            notifyStateChange('devices', devices);
        },
        
        addDevice: function(device) {
            state.devices.push(device);
            notifyStateChange('devices', state.devices);
        },
        
        removeDevice: function(index) {
            const removed = state.devices.splice(index, 1);
            notifyStateChange('devices', state.devices);
            return removed[0];
        },
        
        updateDevice: function(index, device) {
            if (index >= 0 && index < state.devices.length) {
                state.devices[index] = device;
                notifyStateChange('devices', state.devices);
            }
        },
        
        // DOM elements management
        getDomElements: function() {
            return state.domElements;
        },
        
        setDomElements: function(elements) {
            state.domElements = { ...state.domElements, ...elements };
        },
        
        getDomElement: function(key) {
            return state.domElements[key];
        },
        
        setDomElement: function(key, element) {
            state.domElements[key] = element;
        },
        
        // Charts management
        getCharts: function() {
            return state.charts;
        },
        
        getChart: function(type) {
            return state.charts[type];
        },
        
        setChart: function(type, chart) {
            state.charts[type] = chart;
            notifyStateChange('charts', state.charts);
        },
        
        // Flags management
        getFlag: function(flag) {
            return state.flags[flag];
        },
        
        setFlag: function(flag, value) {
            state.flags[flag] = value;
            notifyStateChange('flags', state.flags);
        },
        
        // Common devices
        getCommonDevices: function() {
            return state.commonDevices;
        },
        
        findCommonDevice: function(name) {
            return state.commonDevices.find(d => 
                d.name.toLowerCase() === name.toLowerCase()
            );
        },
        
        // State debugging
        debug: function() {
            return state;
        }
    };
    
    return publicAPI;
})(); 
