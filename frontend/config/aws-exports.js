// AWS Amplify Gen 2 Configuration
// This file provides the necessary configuration for AWS services
// Note: Actual values will be populated by AWS Amplify during deployment

// Safe environment variable access with comprehensive fallbacks
const getEnvVar = (key, fallback) => {
  try {
    // In Vite, environment variables are available through import.meta.env
    // Use string check to avoid syntax errors in different environments
    if (typeof globalThis !== 'undefined' && globalThis.import && globalThis.import.meta && globalThis.import.meta.env) {
      const value = globalThis.import.meta.env[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    
    // Direct access to import.meta.env (works in modern ES modules)
    try {
      const metaEnv = import.meta.env;
      if (metaEnv && metaEnv[key] !== undefined && metaEnv[key] !== null && metaEnv[key] !== '') {
        return metaEnv[key];
      }
    } catch (metaError) {
      // import.meta might not be available in all contexts
    }
    
    // Fallback to process.env for Node.js environments (SSR, build-time)
    if (typeof process !== 'undefined' && process.env) {
      const value = process.env[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    
    return fallback;
  } catch (error) {
    console.warn(`Environment variable access failed for ${key}, using fallback:`, error.message);
    return fallback;
  }
};

// Debug logging helper function (will be called after config creation)
const logEnvDebug = () => {
  try {
    const metaEnv = import.meta.env;
    if (metaEnv && metaEnv.DEV) {
      console.log('🔧 AWS Config Debug - Available env vars:', {
        VITE_API_ENDPOINT: metaEnv.VITE_API_ENDPOINT ? 'SET' : 'MISSING',
        VITE_API_KEY: metaEnv.VITE_API_KEY ? 'SET' : 'MISSING',
        AWS_REGION: metaEnv.AWS_REGION ? 'SET' : 'MISSING',
        MODE: metaEnv.MODE,
        // Don't log actual values for security
      });
    }
  } catch (error) {
    // Silently fail if import.meta is not available
  }
};

const awsExports = {
  // AWS Region
  aws_project_region: getEnvVar('AWS_REGION', 'us-east-1'),
  
  // API Configuration (GraphQL)
  aws_appsync_graphqlEndpoint: getEnvVar('VITE_API_ENDPOINT', 'https://placeholder-api-endpoint.appsync-api.region.amazonaws.com/graphql'),
  aws_appsync_region: getEnvVar('AWS_REGION', 'us-east-1'),
  aws_appsync_authenticationType: 'API_KEY',
  aws_appsync_apiKey: getEnvVar('VITE_API_KEY', 'placeholder-api-key'),
  
  // Authentication Configuration
  Auth: {
    // Currently using API Key for public access
    // Future: Configure Cognito when user auth is added
    identityPoolId: getEnvVar('IDENTITY_POOL_ID', ''),
    region: getEnvVar('AWS_REGION', 'us-east-1'),
    userPoolId: getEnvVar('USER_POOL_ID', ''),
    userPoolWebClientId: getEnvVar('USER_POOL_CLIENT_ID', ''),
  },
  
  // API Configuration
  API: {
    GraphQL: {
      endpoint: getEnvVar('VITE_API_ENDPOINT', 'https://placeholder-api-endpoint.appsync-api.region.amazonaws.com/graphql'),
      region: getEnvVar('AWS_REGION', 'us-east-1'),
      defaultAuthMode: 'apiKey',
      apiKey: getEnvVar('VITE_API_KEY', 'placeholder-api-key'),
    }
  },
  
  // Analytics (optional)
  Analytics: {
    disabled: true
  },
  
  // Storage (optional - for future file uploads)
  Storage: {
    disabled: true
  },
  
  // Amplify Gen 2 specific configuration
  amplify: {
    backend: {
      data: {
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
          apiKeyAuthorizationMode: {
            expiresInDays: 365,
          },
        },
      },
    },
  },
};

// Call debug logging after config is created
logEnvDebug();

export default awsExports; 