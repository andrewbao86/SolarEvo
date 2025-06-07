// Runtime Configuration for Environment Variables
// This ensures proper environment variable access in all scenarios

class RuntimeConfig {
    constructor() {
        this.config = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return this.config;
        
        console.log('🔧 Initializing Runtime Config...');
        
        // Method 1: Vite environment variables (preferred)
        try {
            const viteEnv = import.meta.env;
            if (viteEnv && viteEnv.VITE_API_ENDPOINT && viteEnv.VITE_API_KEY) {
                this.config = {
                    aws_appsync_graphqlEndpoint: viteEnv.VITE_API_ENDPOINT,
                    aws_appsync_apiKey: viteEnv.VITE_API_KEY,
                    aws_project_region: viteEnv.AWS_REGION || 'us-east-1',
                    source: 'vite-env'
                };
                
                const isValid = !this.config.aws_appsync_graphqlEndpoint.includes('placeholder') &&
                               !this.config.aws_appsync_apiKey.includes('placeholder');
                
                if (isValid) {
                    console.log('✅ Runtime Config: Using Vite environment variables');
                    this.initialized = true;
                    return this.config;
                }
            }
        } catch (error) {
            console.warn('⚠️ Vite env access failed:', error.message);
        }

        // Method 2: Window global variables (Amplify injection)
        try {
            if (window.__AMPLIFY_CONFIG__) {
                this.config = {
                    aws_appsync_graphqlEndpoint: window.__AMPLIFY_CONFIG__.VITE_API_ENDPOINT,
                    aws_appsync_apiKey: window.__AMPLIFY_CONFIG__.VITE_API_KEY,
                    aws_project_region: window.__AMPLIFY_CONFIG__.AWS_REGION || 'us-east-1',
                    source: 'amplify-global'
                };
                
                console.log('✅ Runtime Config: Using Amplify global variables');
                this.initialized = true;
                return this.config;
            }
        } catch (error) {
            console.warn('⚠️ Amplify global access failed:', error.message);
        }

        // Method 3: Runtime fetch from Amplify-generated config
        try {
            const response = await fetch('/amplify-config.json');
            if (response.ok) {
                const config = await response.json();
                if (config.VITE_API_ENDPOINT && config.VITE_API_KEY) {
                    this.config = {
                        aws_appsync_graphqlEndpoint: config.VITE_API_ENDPOINT,
                        aws_appsync_apiKey: config.VITE_API_KEY,
                        aws_project_region: config.AWS_REGION || 'us-east-1',
                        source: 'amplify-runtime-fetch'
                    };
                    
                    const isValid = !this.config.aws_appsync_graphqlEndpoint.includes('placeholder') &&
                                   !this.config.aws_appsync_apiKey.includes('placeholder');
                    
                    if (isValid) {
                        console.log('✅ Runtime Config: Using Amplify runtime fetch');
                        this.initialized = true;
                        return this.config;
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Amplify runtime fetch failed:', error.message);
        }

        // Fallback: Use placeholder values (fallback mode)
        if (!this.config) {
            this.config = {
                aws_appsync_graphqlEndpoint: 'https://placeholder-api-endpoint.appsync-api.region.amazonaws.com/graphql',
                aws_appsync_apiKey: 'placeholder-api-key',
                aws_project_region: 'us-east-1',
                source: 'fallback'
            };
            
            console.log('⚠️ Runtime Config: Using fallback mode');
        }

        this.initialized = true;
        return this.config;
    }

    async isConfigured() {
        const config = await this.init();
        return config && 
               config.source !== 'fallback' &&
               !config.aws_appsync_graphqlEndpoint.includes('placeholder') &&
               !config.aws_appsync_apiKey.includes('placeholder');
    }

    async getConfig() {
        return await this.init();
    }

    async getDebugInfo() {
        const config = await this.init();
        return {
            source: config.source,
            hasValidEndpoint: !config.aws_appsync_graphqlEndpoint.includes('placeholder'),
            hasValidApiKey: !config.aws_appsync_apiKey.includes('placeholder'),
            endpointPreview: config.aws_appsync_graphqlEndpoint.substring(0, 50) + '...',
            apiKeyPreview: config.aws_appsync_apiKey.substring(0, 20) + '...',
            region: config.aws_project_region
        };
    }
}

// Create singleton instance
const runtimeConfig = new RuntimeConfig();

// Export for use
export default runtimeConfig;

// Also make available globally for debugging
if (typeof window !== 'undefined') {
    window.__RUNTIME_CONFIG__ = runtimeConfig;
} 