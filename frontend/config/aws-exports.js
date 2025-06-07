// AWS Amplify Gen 2 Configuration
// This file provides the necessary configuration for AWS services
// Note: Actual values will be populated by AWS Amplify during deployment

// Safe environment variable access with comprehensive fallbacks
const getEnvVar = (key, fallback) => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || fallback;
    }
    return fallback;
  } catch (error) {
    console.warn(`Environment variable access failed for ${key}, using fallback`);
    return fallback;
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

export default awsExports; 