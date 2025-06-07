// Backend Service for AWS Amplify/GraphQL operations
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';

export class BackendService {
    constructor() {
        this.client = null;
        this.isConfigured = false;
        this.awsConfig = null;
    }

    async init() {
        try {
            // Import AWS config
            const { default: awsExports } = await import('../config/aws-exports.js');
            this.awsConfig = awsExports;

            console.log('🔧 Backend Service Initializing...', {
                region: awsExports.aws_project_region,
                graphqlEndpoint: awsExports.aws_appsync_graphqlEndpoint ? 'SET' : 'MISSING',
                apiKey: awsExports.aws_appsync_apiKey ? 'SET' : 'MISSING'
            });

            // Only configure if we have a valid GraphQL endpoint
            if (awsExports.aws_appsync_graphqlEndpoint && awsExports.aws_appsync_graphqlEndpoint.trim() !== '') {
                Amplify.configure(awsExports);
                this.client = generateClient();
                this.isConfigured = true;
            } else {
                console.warn('⚠️ AWS Amplify not configured - using fallback mode (URL encoding)');
                console.warn('🔍 Missing GraphQL endpoint. Check environment variables:');
                console.warn('- VITE_AWS_GRAPHQL_URL');
                console.warn('- VITE_AWS_API_KEY');
                console.warn('- VITE_AWS_REGION');
            }
        } catch (error) {
            console.warn('⚠️ AWS Amplify configuration failed - using fallback mode:', error.message);
            console.error('🔍 Full error:', error);
        }
    }

    async createSharedCalculation(data) {
        if (!this.isConfigured) {
            throw new Error('Backend not configured - using fallback URL encoding');
        }

        try {
            const { createSharedCalculation } = await import('./operations.js');
            
            const response = await this.client.graphql({
                query: createSharedCalculation,
                variables: data
            });

            return response.data.createSharedCalculation;
        } catch (error) {
            console.error('Failed to create shared calculation:', error);
            throw error;
        }
    }

    async getSharedCalculation(id) {
        if (!this.isConfigured) {
            throw new Error('Backend not configured');
        }

        try {
            const { getSharedCalculation } = await import('./operations.js');
            
            const response = await this.client.graphql({
                query: getSharedCalculation,
                variables: { id }
            });

            return response.data.getSharedCalculation;
        } catch (error) {
            console.error('Failed to get shared calculation:', error);
            throw error;
        }
    }

    isBackendAvailable() {
        return this.isConfigured;
    }

    generateFallbackUrl(data) {
        // Fallback URL encoding for when backend is not available
        const encodedData = btoa(JSON.stringify(data));
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('shared', encodedData);
        return currentUrl.toString();
    }
} 
