# AWS Backend Setup Guide for BESS Calculator

## Prerequisites
- AWS Account with appropriate permissions
- GitHub repository ready
- Node.js and npm installed locally

## Phase 1: AWS Amplify Console Setup

### Step 1: Connect GitHub to Amplify
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Select "GitHub" as source
4. Authorize AWS Amplify to access your GitHub account
5. Select your BESS Calculator repository
6. Choose the main branch (usually `main` or `master`)
7. Accept default build settings
8. Click "Save and deploy"

### Step 2: Wait for Initial Deployment
- Wait for the initial deployment to complete (5-10 minutes)
- Verify your app is accessible via the provided Amplify URL
- Note down the Amplify App ID for later use

## Phase 2: Backend Services Setup

### Step 3: Initialize Amplify CLI in Your Project
```bash
# Install Amplify CLI globally
npm install -g @aws-amplify/cli

# Configure Amplify CLI (if not done before)
amplify configure

# Initialize Amplify in your project
amplify init
```

**Amplify Init Configuration:**
- Project name: `bess-calculator`
- Environment name: `prod`
- Default editor: `Visual Studio Code` (or your preference)
- App type: `javascript`
- Framework: `none`
- Source directory: `.`
- Distribution directory: `.`
- Build command: `npm run build`
- Start command: `npm start`
- AWS Profile: Select your configured profile

### Step 4: Add API and Database
```bash
# Add API with GraphQL
amplify add api
```

**API Configuration:**
- Service: `GraphQL`
- API name: `bessCalculatorAPI`
- Authorization type: `API key`
- API key description: `BESS Calculator Public API`
- API key expiration: `365` (days)
- Additional auth types: `No`
- Conflict resolution: `Auto Merge`
- Create GraphQL schema: `Yes`

### Step 5: Create GraphQL Schema

Replace the generated schema in `amplify/backend/api/bessCalculatorAPI/schema.graphql`:

```graphql
type SharedCalculation @model {
  id: ID!
  createdAt: AWSDateTime!
  expiresAt: AWSDateTime!
  creatorName: String!
  creatorEmail: String!
  creatorMobile: String!
  devices: [DeviceInput!]!
  calculations: CalculationResults!
  isActive: Boolean!
}

type DeviceInput {
  name: String!
  power: Float!
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

type CalculationResults {
  totalEnergy: String!
  batteryCapacity: String!
  recommendedSize: String!
  solarevoRecommendation: String!
}

type Query {
  getActiveSharedCalculation(id: ID!): SharedCalculation
}

type Mutation {
  createSharedCalculation(input: CreateSharedCalculationInput!): SharedCalculation
}

input CreateSharedCalculationInput {
  creatorName: String!
  creatorEmail: String!
  creatorMobile: String!
  devices: [DeviceInputInput!]!
  calculations: CalculationResultsInput!
}

input DeviceInputInput {
  name: String!
  power: Float!
  quantity: Int!
  operatingHours: Float!
  batteryHours: Float!
  operatingRanges: [TimeRangeInput!]!
  batteryRanges: [TimeRangeInput!]!
  critical: Boolean!
}

input TimeRangeInput {
  start: Int!
  end: Int!
}

input CalculationResultsInput {
  totalEnergy: String!
  batteryCapacity: String!
  recommendedSize: String!
  solarevoRecommendation: String!
}
```

### Step 6: Add Custom Lambda Resolver
```bash
# Add function for custom business logic
amplify add function
```

**Function Configuration:**
- Function name: `sharedCalculationResolver`
- Function template: `Hello World`
- Advanced settings: `No`

### Step 7: Deploy Backend
```bash
# Deploy all backend resources
amplify push
```

**Deployment Confirmation:**
- Review all resources to be created
- Confirm: `Yes`
- Generate GraphQL code: `Yes`
- Code generation language: `javascript`
- File pattern: `src/graphql/**/*.js`
- Generate all operations: `Yes`

## Phase 3: Frontend Integration

### Step 8: Install Amplify Libraries
```bash
npm install aws-amplify @aws-amplify/ui-react
```

### Step 9: Configure Amplify in Frontend

Add to the beginning of `script.js`:

```javascript
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import awsExports from './aws-exports';

Amplify.configure(awsExports);
const client = generateClient();
```

### Step 10: Update Shareable Link Functions

Replace the current shareable link functions in `script.js`:

```javascript
// Updated generateShareableLink function
async function generateShareableLink() {
    const name = prospectNameInput.value.trim();
    const email = prospectEmailInput.value.trim();
    const mobile = prospectMobileInput.value.trim();
    
    if (!name || !email || !mobile) {
        showErrorPopup('Please fill in all required fields (Name, Email, Mobile)');
        return;
    }
    
    if (!validateEmail() || !validateMobile()) {
        showErrorPopup('Please correct the validation errors before generating link');
        return;
    }
    
    if (!devices || devices.length === 0) {
        showErrorPopup('Please add at least one device before generating a shareable link');
        return;
    }
    
    try {
        generateShareLinkBtn.disabled = true;
        generateShareLinkBtn.textContent = 'Generating...';
        
        // Create shared calculation via GraphQL
        const input = {
            creatorName: name,
            creatorEmail: email,
            creatorMobile: mobile,
            devices: devices.map(device => ({
                name: device.name,
                power: device.power,
                quantity: device.quantity,
                operatingHours: device.operatingHours,
                batteryHours: device.batteryHours,
                operatingRanges: device.operatingRanges,
                batteryRanges: device.batteryRanges,
                critical: device.critical
            })),
            calculations: {
                totalEnergy: totalEnergyElement.textContent,
                batteryCapacity: batteryCapacityElement.textContent,
                recommendedSize: recommendedSizeElement.textContent,
                solarevoRecommendation: solarevoRecommendationElement.textContent
            }
        };
        
        const createSharedCalculation = `
            mutation CreateSharedCalculation($input: CreateSharedCalculationInput!) {
                createSharedCalculation(input: $input) {
                    id
                    createdAt
                    expiresAt
                    creatorName
                }
            }
        `;
        
        const result = await client.graphql({
            query: createSharedCalculation,
            variables: { input }
        });
        
        const calculationId = result.data.createSharedCalculation.id;
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=${calculationId}`;
        
        showShareModal(shareUrl, name);
        
    } catch (error) {
        console.error('Error generating shareable link:', error);
        showErrorPopup('Error generating shareable link. Please try again.');
    } finally {
        generateShareLinkBtn.disabled = false;
        generateShareLinkBtn.textContent = 'Generate Shareable Link';
    }
}

// Updated checkForSharedData function
async function checkForSharedData() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('share');
    
    if (sharedId) {
        try {
            const getSharedCalculation = `
                query GetActiveSharedCalculation($id: ID!) {
                    getActiveSharedCalculation(id: $id) {
                        id
                        createdAt
                        expiresAt
                        creatorName
                        devices
                        calculations
                        isActive
                    }
                }
            `;
            
            const result = await client.graphql({
                query: getSharedCalculation,
                variables: { id: sharedId }
            });
            
            const sharedData = result.data.getActiveSharedCalculation;
            
            if (!sharedData || !sharedData.isActive) {
                showErrorPopup('This shared link is no longer available or has expired.');
                return;
            }
            
            loadSharedData(sharedData);
            
        } catch (error) {
            console.error('Error loading shared data:', error);
            showErrorPopup('Invalid or corrupted shared link.');
        }
    }
}
```

## Phase 4: Environment Variables and Security

### Step 11: Add Environment Variables
In AWS Amplify Console:
1. Go to your app → "Environment variables"
2. Add the following variables:
   - `REACT_APP_AWS_REGION`: Your AWS region (e.g., `us-east-1`)
   - `REACT_APP_API_URL`: Your GraphQL endpoint (from `aws-exports.js`)

### Step 12: Update Build Settings
In Amplify Console → Build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: /
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## Phase 5: Testing and Monitoring

### Step 13: Test the Backend
1. Deploy your changes to GitHub
2. Wait for Amplify auto-deployment
3. Test shareable link generation
4. Test link opening functionality
5. Verify data persistence in DynamoDB

### Step 14: Monitor and Analytics
1. Go to AWS CloudWatch for logs
2. Monitor DynamoDB metrics
3. Set up CloudWatch alarms for errors
4. Review API Gateway metrics

## Phase 6: Production Optimizations

### Step 15: Add Data Cleanup Lambda
Create a scheduled Lambda function to clean up expired records:

```bash
amplify add function
```

**Configuration:**
- Function name: `cleanupExpiredCalculations`
- Template: `Scheduled trigger`
- Schedule: `rate(1 day)`

### Step 16: Configure CORS and Security
1. Update API Gateway CORS settings
2. Configure API rate limiting
3. Set up WAF rules if needed
4. Enable AWS Shield for DDoS protection

## Troubleshooting

### Common Issues:
1. **GraphQL Schema errors**: Ensure all types are properly defined
2. **CORS issues**: Check API Gateway CORS configuration
3. **Authentication errors**: Verify API key configuration
4. **Build failures**: Check Amplify build logs

### Useful Commands:
```bash
# Check Amplify status
amplify status

# View logs
amplify console api

# Update backend
amplify push

# Delete resources (if needed)
amplify delete
```

## Cost Optimization
- Use DynamoDB On-Demand billing for variable traffic
- Set TTL on DynamoDB items for automatic cleanup
- Monitor Lambda execution time and memory usage
- Use CloudWatch Logs retention policies

## Security Best Practices
- Enable CloudTrail for audit logging
- Use least privilege IAM policies
- Enable API Gateway throttling
- Implement input validation
- Use AWS Secrets Manager for sensitive data

This setup provides a scalable, secure backend for your BESS Calculator with professional shareable links! 