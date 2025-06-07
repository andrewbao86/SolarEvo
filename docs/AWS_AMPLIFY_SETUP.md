# AWS Amplify Backend Setup Guide

This guide will help you set up the AWS Amplify backend for the BESS Calculator with GraphQL API and DynamoDB database.

## Prerequisites

1. AWS Account with appropriate permissions
2. GitHub repository with your code
3. AWS CLI installed (optional but recommended)
4. Node.js and npm installed

## Part 1: Initial GitHub Setup

### Step 1: Commit and Push Your Code

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit: BESS Calculator with shared links functionality"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git

# Push to GitHub
git push -u origin main
```

## Part 2: AWS Amplify Console Setup

### Step 1: Access AWS Amplify Console

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Search for "Amplify" and select "AWS Amplify"
3. Click "Create new app"

### Step 2: Connect GitHub Repository

1. Select "Host web app"
2. Choose "GitHub" as your Git provider
3. Click "Continue"
4. Sign in to GitHub if prompted
5. Select your repository and branch (usually `main`)
6. Click "Next"

### Step 3: Configure Build Settings

1. **App name**: Enter "BESS-Calculator" or your preferred name
2. **Environment**: Select "production" or create new
3. **Build and test settings**: The system should auto-detect your `amplify.yml` file
4. If not auto-detected, use this configuration:

```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci
        - npx ampx generate graphql-client-code --format=graphql-codegen --out=./src/graphql
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
    appRoot: .
```

5. Click "Next"
6. Review settings and click "Save and deploy"

## Part 3: Configure Backend API

### Step 1: Add Backend to Amplify App

1. In your Amplify app dashboard, click "Backend environments"
2. Click "Create backend environment"
3. Name it "production" (or your preferred name)
4. Click "Create"

### Step 2: Configure API (GraphQL)

1. Click "Set up backend"
2. Select "API" from the services
3. Choose "GraphQL"
4. **API name**: "BESSCalculatorAPI"
5. **Schema**: Use the following schema:

```graphql
type SharedCalculation @model {
  id: ID!
  creatorName: String!
  creatorEmail: String!
  creatorMobile: String!
  devices: [Device!]!
  calculations: Calculations!
  createdAt: AWSDateTime!
  expiresAt: AWSDateTime!
  isActive: Boolean!
}

type Device {
  name: String!
  power: Int!
  quantity: Int!
  operatingHours: Float!
  batteryHours: Float!
  operatingRanges: [TimeRange!]!
  batteryRanges: [TimeRange!]!
  critical: Boolean!
}

type TimeRange {
  start: Int!
  end: Int!
}

type Calculations {
  totalEnergy: String!
  batteryCapacity: String!
  recommendedSize: String!
  solarevoRecommendation: String!
}
```

6. Click "Create API"

### Step 3: Configure Authentication (Optional but Recommended)

1. Click "Authentication" in backend services
2. Choose "Cognito" 
3. **How do you want users to sign in?**: Email
4. **Multifactor authentication**: OFF (for simplicity)
5. Click "Create"

## Part 4: Deploy Backend

### Step 1: Deploy Backend Environment

1. Go to "Backend environments"
2. Click "Deploy" on your environment
3. This will take 10-15 minutes
4. Wait for deployment to complete

### Step 2: Update Frontend Configuration

After backend deployment:

1. In Amplify console, go to "Backend environments"
2. Click "View in Admin UI" or "Edit backend"
3. Copy the GraphQL endpoint URL
4. Copy the API Key (if using API Key auth)

## Part 5: Configure Frontend Environment Variables

### Step 1: Set Environment Variables in Amplify

1. Go to your Amplify app
2. Click "Environment variables" in the left sidebar
3. Add these variables:

| Variable | Value |
|----------|--------|
| `VITE_AWS_REGION` | `us-east-1` (or your region) |
| `VITE_AWS_GRAPHQL_URL` | Your GraphQL endpoint URL |
| `VITE_AWS_API_KEY` | Your API Key |

### Step 2: Update Build Configuration

Ensure your `amplify.yml` includes environment variable handling:

```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci
        - npx ampx generate graphql-client-code --format=graphql-codegen --out=./src/graphql
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - echo "Building with backend integration"
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
    appRoot: .
```

## Part 6: Verification and Testing

### Step 1: Verify Deployment

1. Check that your app builds successfully
2. Visit your Amplify app URL
3. Test the shareable links functionality
4. Check browser console for any errors

### Step 2: Test Backend Integration

1. Add a device to your calculator
2. Fill in prospect information
3. Generate a shareable link
4. Open the link in an incognito window
5. Verify that device data loads correctly

## Part 7: Monitor Database (DynamoDB)

### Step 1: Access DynamoDB Console

1. Go to AWS Console
2. Search for "DynamoDB"
3. Click "Tables"
4. Find your table (should be named like "SharedCalculation-xxxxx-production")

### Step 2: View Stored Data

1. Click on your table name
2. Click "Explore table items"
3. You'll see all shared calculations stored
4. Click on any item to view full details

### Step 3: Query Data

You can query data using:
```sql
-- Get all active shared calculations
SELECT * FROM YourTableName WHERE isActive = true

-- Get calculations by creator email
SELECT * FROM YourTableName WHERE creatorEmail = 'user@example.com'

-- Get calculations created in last 24 hours  
SELECT * FROM YourTableName WHERE createdAt > '2024-12-19T00:00:00.000Z'
```

## Part 8: Troubleshooting

### Common Issues:

1. **Build Failures**: Check build logs in Amplify console
2. **API Errors**: Verify GraphQL schema matches your operations
3. **Environment Variables**: Ensure all required variables are set
4. **CORS Issues**: Check API Gateway CORS settings

### Debug Steps:

1. **Check Amplify Build Logs**:
   - Go to your app → Build settings → View build history
   - Click on failed build to see detailed logs

2. **Check CloudWatch Logs**:
   - Go to CloudWatch → Log groups
   - Find logs related to your API

3. **Test GraphQL API**:
   - Use AWS AppSync console to test queries
   - Go to AppSync → Your API → Queries

## Part 9: Monitoring and Maintenance

### Step 1: Set Up CloudWatch Monitoring

1. Go to CloudWatch
2. Create alarms for:
   - API Gateway errors
   - DynamoDB throttling  
   - Lambda function errors

### Step 2: Regular Maintenance

1. **Clean up expired records**: Set up a Lambda function to delete expired shared calculations
2. **Monitor costs**: Check AWS billing for DynamoDB and API Gateway usage
3. **Update dependencies**: Regularly update npm packages

### Step 3: Backup Strategy

1. Enable DynamoDB point-in-time recovery
2. Set up automated backups
3. Document your infrastructure as code

## Security Considerations

1. **API Rate Limiting**: Configure appropriate rate limits
2. **Input Validation**: Ensure all user inputs are validated
3. **Data Encryption**: Enable encryption at rest and in transit
4. **Access Control**: Use IAM roles with minimal required permissions

## Production Checklist

- [ ] Backend deployed successfully
- [ ] Frontend connects to backend API
- [ ] Environment variables configured
- [ ] Database accessible and storing data
- [ ] Shareable links working correctly
- [ ] Error handling implemented
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Security measures in place

## Need Help?

If you encounter issues:
1. Check AWS Amplify documentation
2. Review CloudWatch logs
3. Test API endpoints directly
4. Verify environment variables
5. Check network connectivity

Your BESS Calculator should now be fully deployed with a working backend! 