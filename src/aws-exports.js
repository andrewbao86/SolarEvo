// AWS Amplify configuration
const awsconfig = {
    "aws_project_region": import.meta.env.VITE_AWS_REGION || "ap-southeast-1",
    "aws_appsync_graphqlEndpoint": import.meta.env.VITE_AWS_GRAPHQL_URL || "",
    "aws_appsync_region": import.meta.env.VITE_AWS_REGION || "ap-southeast-1", 
    "aws_appsync_authenticationType": "API_KEY",
    "aws_appsync_apiKey": import.meta.env.VITE_AWS_API_KEY || "",
    "aws_cognito_identity_pool_id": import.meta.env.VITE_AWS_IDENTITY_POOL_ID || "",
    "aws_cognito_region": import.meta.env.VITE_AWS_REGION || "ap-southeast-1",
    "aws_user_pools_id": import.meta.env.VITE_AWS_USER_POOL_ID || "",
    "aws_user_pools_web_client_id": import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID || "",
    "oauth": {},
    "aws_cognito_username_attributes": [],
    "aws_cognito_social_providers": [],
    "aws_cognito_signup_attributes": ["EMAIL"],
    "aws_cognito_mfa_configuration": "OFF",
    "aws_cognito_mfa_types": ["SMS"],
    "aws_cognito_password_protection_settings": {
        "passwordPolicyMinLength": 8,
        "passwordPolicyCharacters": []
    },
    "aws_cognito_verification_mechanisms": ["EMAIL"]
};

export default awsconfig; 