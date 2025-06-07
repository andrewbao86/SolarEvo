// AWS Amplify Gen 2 Configuration
// This file provides the necessary configuration for AWS services
// Note: Actual values will be populated by AWS Amplify during deployment

const awsExports = {
  // AWS Region
  aws_project_region: process.env.AWS_REGION || 'us-east-1',
  
  // API Configuration (GraphQL)
  aws_appsync_graphqlEndpoint: process.env.VITE_API_ENDPOINT || 'https://placeholder-api-endpoint.appsync-api.region.amazonaws.com/graphql',
  aws_appsync_region: process.env.AWS_REGION || 'us-east-1',
  aws_appsync_authenticationType: 'API_KEY',
  aws_appsync_apiKey: process.env.VITE_API_KEY || 'placeholder-api-key',
  
  // Authentication Configuration
  Auth: {
    // Currently using API Key for public access
    // Future: Configure Cognito when user auth is added
    identityPoolId: process.env.IDENTITY_POOL_ID || '',
    region: process.env.AWS_REGION || 'us-east-1',
    userPoolId: process.env.USER_POOL_ID || '',
    userPoolWebClientId: process.env.USER_POOL_CLIENT_ID || '',
  },
  
  // API Configuration
  API: {
    GraphQL: {
      endpoint: process.env.VITE_API_ENDPOINT || 'https://placeholder-api-endpoint.appsync-api.region.amazonaws.com/graphql',
      region: process.env.AWS_REGION || 'us-east-1',
      defaultAuthMode: 'apiKey',
      apiKey: process.env.VITE_API_KEY || 'placeholder-api-key',
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