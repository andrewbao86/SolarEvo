// Time Blocks Module - Time block picker functionality for BESS Calculator
window.TimeBlocks = (function() {
    'use strict';
    
    
    // Private variables
    let mouseState = {
        isDown: false,
        isDragging: false,
        startHour: null
    };
    
    // Private methods
    function formatHour(hour) {
        return `${(hour % 24).toString().padStart(2, '0')}:00`;
    }
    
    function formatTimeRange(start, end) {
        if (start === end) {
            // Single hour: show as range (e.g., "00:00-01:00")
            const endHour = (start + 1) % 24;
            return `${formatHour(start)}-${formatHour(endHour)}`;
        } else {
            // Multiple hours: show range
            const endHour = (end + 1) % 24;
            return `${formatHour(start)}-${formatHour(endHour)}`;
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
    
    function updateTimeDisplay(container, type) {
        const selectedBlocks = container.querySelectorAll('.time-block.selected');
        const selectedHours = [...new Set(Array.from(selectedBlocks).map(block => parseInt(block.dataset.hour)))];
        
        const displayContainer = document.getElementById(`${type}-hours-blocks-display`);
        if (displayContainer && selectedHours.length > 0) {
            const ranges = getTimeRanges(selectedHours);
            displayContainer.textContent = `Selected: ${ranges.join(', ')} (${selectedHours.length} hours)`;
        } else if (displayContainer) {
            displayContainer.textContent = 'No hours selected';
        }
    }
    
    function toggleHourSelection(hour, container, type) {
        const block = container.querySelector(`[data-hour="${hour}"]`);
        if (!block) return;
        
        // Check if this hour is disabled (for battery hours)
        if (block.classList.contains('disabled')) return;
        
        block.classList.toggle('selected');
        updateTimeDisplay(container, type);
        
        // If this is operating hours, update battery constraints
        if (type === 'operating') {
            const batteryContainer = document.getElementById('battery-hours-blocks');
            if (batteryContainer) {
                applyBatteryConstraints(batteryContainer);
            }
        }
        
        // Dispatch time selection change event
        const event = new CustomEvent('timeSelectionChange', {
            detail: { 
                type: type, 
                selectedHours: getSelectedHours(container.id),
                container: container.id
            }
        });
        document.dispatchEvent(event);
    }
    
    function applyBatteryConstraints(batteryContainer) {
        const operatingContainer = document.getElementById('operating-hours-blocks');
        if (!operatingContainer) return;
        
        const operatingBlocks = operatingContainer.querySelectorAll('.time-block.selected');
        const selectedOperatingHours = Array.from(operatingBlocks).map(block => parseInt(block.dataset.hour));
        
        const batteryBlocks = batteryContainer.querySelectorAll('.time-block');
        batteryBlocks.forEach(block => {
            const hour = parseInt(block.dataset.hour);
            
            if (selectedOperatingHours.includes(hour)) {
                // This hour is available for battery use
                block.classList.remove('disabled');
            } else {
                // This hour is not available for battery use
                block.classList.add('disabled');
                block.classList.remove('selected');
            }
        });
        
        updateTimeDisplay(batteryContainer, 'battery');
    }
    
    function getSelectedHours(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];
        
        const selectedBlocks = container.querySelectorAll('.time-block.selected');
        return [...new Set(Array.from(selectedBlocks).map(block => parseInt(block.dataset.hour)))];
    }
    
    function createTimeBlockPicker(container, type, defaultSelected) {
        mouseState.isDown = false;
        mouseState.isDragging = false;
        mouseState.startHour = null;
        
        container.innerHTML = '';
        container.className = 'time-block-container';
        
        // Create 24 hour blocks (00-23)
        for (let hour = 0; hour < 24; hour++) {
            const block = document.createElement('div');
            block.className = `time-block ${defaultSelected.includes(hour) ? 'selected' : ''}`;
            block.dataset.hour = hour;
            block.textContent = hour.toString().padStart(2, '0');
            block.title = `${hour.toString().padStart(2, '0')}:00`;
            
            // Mouse events for desktop
            block.addEventListener('mousedown', (e) => {
                e.preventDefault();
                mouseState.isDown = true;
                mouseState.startHour = hour;
                toggleHourSelection(hour, container, type);
            });
            
            block.addEventListener('mouseenter', (e) => {
                if (mouseState.isDown) {
                    mouseState.isDragging = true;
                    toggleHourSelection(hour, container, type);
                }
            });
            
            block.addEventListener('mouseup', () => {
                mouseState.isDown = false;
                mouseState.isDragging = false;
            });
            
            // Touch events for mobile
            block.addEventListener('touchstart', (e) => {
                e.preventDefault();
                mouseState.startHour = hour;
                toggleHourSelection(hour, container, type);
            }, { passive: false });
            
            block.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                if (element && element.classList.contains('time-block')) {
                    const touchHour = parseInt(element.dataset.hour);
                    if (touchHour !== hour) {
                        toggleHourSelection(touchHour, container, type);
                    }
                }
            }, { passive: false });
            
            container.appendChild(block);
        }
        
        // Global mouse up to handle drag end
        document.addEventListener('mouseup', () => {
            mouseState.isDown = false;
            mouseState.isDragging = false;
        });
        
        updateTimeDisplay(container, type);
        
        // Apply battery hour constraints if this is a battery picker
        if (type === 'battery') {
            applyBatteryConstraints(container);
        }
    }
    
    // Public API
    const publicAPI = {
        // Initialize time blocks
        init: function() {
            const operatingContainer = document.getElementById('operating-hours-blocks');
            const batteryContainer = document.getElementById('battery-hours-blocks');
            
            if (operatingContainer) {
                createTimeBlockPicker(operatingContainer, 'operating', []);
            }
            
            if (batteryContainer) {
                createTimeBlockPicker(batteryContainer, 'battery', []);
            }
            
            // Setup clear button event listeners
            this.initializeClearButtons();
        },
        
        // Create a time block picker
        createPicker: createTimeBlockPicker,
        
        // Toggle hour selection
        toggle: toggleHourSelection,
        
        // Get selected hours for a container
        getSelected: getSelectedHours,
        
        // Clear time blocks
        clear: function(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const blocks = container.querySelectorAll('.time-block');
            blocks.forEach(block => {
                block.classList.remove('selected');
                block.classList.remove('disabled'); // Also remove disabled state
            });
            
            const type = containerId.includes('operating') ? 'operating' : 'battery';
            updateTimeDisplay(container, type);
            
            // If clearing operating hours, also clear battery constraints
            if (type === 'operating') {
                const batteryContainer = document.getElementById('battery-hours-blocks');
                if (batteryContainer) {
                    const batteryBlocks = batteryContainer.querySelectorAll('.time-block');
                    batteryBlocks.forEach(block => {
                        block.classList.remove('disabled');
                        block.classList.remove('selected');
                    });
                    updateTimeDisplay(batteryContainer, 'battery');
                }
            }
            
            // Dispatch clear event
            const event = new CustomEvent('timeSelectionCleared', {
                detail: { containerId: containerId, type: type }
            });
            document.dispatchEvent(event);
        },
        
        // Set selected hours for a container
        setSelected: function(containerId, hours) {
            const container = document.getElementById(containerId);
            if (!container || !Array.isArray(hours)) return;
            
            // Clear all selections first
            const blocks = container.querySelectorAll('.time-block');
            blocks.forEach(block => block.classList.remove('selected'));
            
            // Select the specified hours
            hours.forEach(hour => {
                const block = container.querySelector(`[data-hour="${hour}"]`);
                if (block) {
                    block.classList.add('selected');
                }
            });
            
            const type = containerId.includes('operating') ? 'operating' : 'battery';
            updateTimeDisplay(container, type);
            
            // If this is operating hours, update battery constraints
            if (type === 'operating') {
                const batteryContainer = document.getElementById('battery-hours-blocks');
                if (batteryContainer) {
                    applyBatteryConstraints(batteryContainer);
                }
            }
            
            // Dispatch selection change event
            const event = new CustomEvent('timeSelectionSet', {
                detail: { containerId: containerId, type: type, hours: hours }
            });
            document.dispatchEvent(event);
        },
        
        // Apply battery constraints
        applyConstraints: applyBatteryConstraints,
        
        // Initialize clear buttons
        initializeClearButtons: function() {
            const clearOperatingBtn = document.getElementById('clear-operating-blocks');
            const clearBatteryBtn = document.getElementById('clear-battery-blocks');
            
            if (clearOperatingBtn) {
                clearOperatingBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.clear('operating-hours-blocks');
                });
            }
            
            if (clearBatteryBtn) {
                clearBatteryBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.clear('battery-hours-blocks');
                });
            }
        },
        
        // Get time ranges for display
        getTimeRanges: getTimeRanges,
        
        // Utility methods
        formatHour: formatHour,
        formatTimeRange: formatTimeRange
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            publicAPI.init();
        });
    } else {
        // DOM is already ready
        publicAPI.init();
    }
    
    return publicAPI;
})(); 
