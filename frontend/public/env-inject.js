// Development Fallback Environment Injection
// This file will be overwritten by Amplify build process

window.__AMPLIFY_CONFIG__ = {
  VITE_API_ENDPOINT: "https://placeholder-api-endpoint.appsync-api.region.amazonaws.com/graphql",
  VITE_API_KEY: "placeholder-api-key",
  AWS_REGION: "us-east-1"
};

console.log('🔧 Development Environment Variables Loaded (will be replaced in production):', {
  endpoint: window.__AMPLIFY_CONFIG__.VITE_API_ENDPOINT ? 'SET' : 'MISSING',
  apiKey: window.__AMPLIFY_CONFIG__.VITE_API_KEY ? 'SET' : 'MISSING',
  region: window.__AMPLIFY_CONFIG__.AWS_REGION || 'us-east-1'
}); 