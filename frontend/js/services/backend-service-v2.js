// Backend Service V2 for Database-Stored Shared Links
// Enhanced with robust fallback and debug alerts

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';

class BackendServiceV2 {
    constructor() {
        this.client = null;
        this.isConfigured = false;
        this.awsConfig = null;
        this.fallbackMode = false;
        this.debugMode = true; // Enable debug alerts as requested
    }

    async init() {
        try {
            // Import AWS config
            const { default: awsExports } = await import('../config/aws-exports.js');
            this.awsConfig = awsExports;

            this.debugLog('🔧 Backend Service V2 Initializing...', {
                region: awsExports.aws_project_region,
                graphqlEndpoint: awsExports.aws_appsync_graphqlEndpoint ? 'SET' : 'MISSING',
                apiKey: awsExports.aws_appsync_apiKey ? 'SET' : 'MISSING'
            });

            // Only configure if we have a valid GraphQL endpoint
            if (awsExports.aws_appsync_graphqlEndpoint && 
                awsExports.aws_appsync_graphqlEndpoint.trim() !== '' &&
                awsExports.aws_appsync_apiKey && 
                awsExports.aws_appsync_apiKey.trim() !== '') {
                
                Amplify.configure(awsExports);
                this.client = generateClient();
                this.isConfigured = true;
                this.fallbackMode = false;
                
                this.debugAlert('✅ Backend Connected', 'Database-stored sharing enabled', 'success');
            } else {
                this.fallbackMode = true;
                this.debugAlert('⚠️ Backend Fallback Mode', 'Using URL encoding (backend unavailable)', 'warning');
            }
        } catch (error) {
            this.fallbackMode = true;
            this.debugAlert('❌ Backend Connection Failed', `Error: ${error.message}\nUsing fallback mode`, 'error');
        }
    }

    debugLog(message, data = null) {
        if (this.debugMode) {
            console.log(message, data || '');
        }
    }

    debugAlert(title, message, type = 'info') {
        if (this.debugMode) {
            console.log(`${title}: ${message}`);
            
            // Visual debug alert for easier debugging
            if (window.UIController && window.UIController.showStatus) {
                window.UIController.showStatus(`${title}: ${message}`, type);
            }
        }
    }

    generateShareId() {
        // Generate 8-character unique ID (similar to backend utility)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async createSharedCalculation(data) {
        if (this.fallbackMode) {
            // Fallback to URL encoding
            return this.createFallbackShare(data);
        }

        if (!this.isConfigured) {
            throw new Error('Backend not configured');
        }

        try {
            const { createSharedCalculation } = await import('./operations.js');
            
            // Generate unique share ID
            const shareId = this.generateShareId();
            
            // Set expiration to 30 days from now
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const variables = {
                ...data,
                shareId: shareId,
                expiresAt: expiresAt.toISOString(),
            };

            this.debugLog('🚀 Creating shared calculation:', { shareId, variables });

            const response = await this.client.graphql({
                query: createSharedCalculation,
                variables: variables
            });

            const result = response.data.createSharedCalculation;
            
            this.debugAlert('✅ Share Link Created', `Database ID: ${shareId}`, 'success');
            
            return {
                success: true,
                shareId: result.shareId,
                id: result.id,
                url: `${window.location.origin}${window.location.pathname}?share=${result.shareId}`,
                expiresAt: result.expiresAt,
                method: 'database'
            };

        } catch (error) {
            this.debugAlert('❌ Database Share Failed', `Error: ${error.message}\nTrying fallback...`, 'error');
            
            // Fallback to URL encoding if database fails
            return this.createFallbackShare(data);
        }
    }

    async getSharedCalculation(shareId) {
        if (this.fallbackMode) {
            throw new Error('Cannot load database shares in fallback mode');
        }

        if (!this.isConfigured) {
            throw new Error('Backend not configured');
        }

        try {
            const { getSharedCalculationByShareId } = await import('./operations.js');
            
            this.debugLog('🔍 Loading shared calculation:', shareId);

            const response = await this.client.graphql({
                query: getSharedCalculationByShareId,
                variables: { shareId: shareId }
            });

            const items = response.data.listSharedCalculations.items;
            
            if (!items || items.length === 0) {
                throw new Error('Shared calculation not found or expired');
            }

            const sharedData = items[0];
            
            // Check if expired
            if (new Date(sharedData.expiresAt) < new Date()) {
                throw new Error('Shared link has expired');
            }

            if (!sharedData.isActive) {
                throw new Error('Shared link is no longer active');
            }

            this.debugAlert('✅ Share Link Loaded', `From database: ${shareId}`, 'success');

            return {
                success: true,
                data: sharedData,
                method: 'database'
            };

        } catch (error) {
            this.debugAlert('❌ Database Load Failed', `ShareID: ${shareId}\nError: ${error.message}`, 'error');
            throw error;
        }
    }

    createFallbackShare(data) {
        try {
            // Fallback to URL encoding (current working method)
            const shareData = {
                devices: data.devices,
                timestamp: new Date().toISOString(),
                version: 'fallback'
            };

            const encodedData = btoa(JSON.stringify(shareData))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const url = `${window.location.origin}${window.location.pathname}?s=${encodedData}`;
            
            this.debugAlert('🔄 Fallback Share Created', 'Using URL encoding method', 'info');

            return {
                success: true,
                shareId: 'URL_ENCODED',
                url: url,
                method: 'fallback',
                note: 'Created using URL encoding fallback'
            };

        } catch (error) {
            this.debugAlert('❌ Fallback Failed', `Error: ${error.message}`, 'error');
            throw error;
        }
    }

    isInFallbackMode() {
        return this.fallbackMode;
    }

    getStatus() {
        return {
            configured: this.isConfigured,
            fallbackMode: this.fallbackMode,
            hasClient: !!this.client,
            debugMode: this.debugMode
        };
    }
}

// Create singleton instance
const backendServiceV2 = new BackendServiceV2();

// Export for use in modules
export default backendServiceV2;

// Also attach to window for global access
window.BackendServiceV2 = backendServiceV2; 