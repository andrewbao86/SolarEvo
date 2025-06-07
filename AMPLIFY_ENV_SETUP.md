# Amplify Environment Variables Setup Guide

## 🔧 Setting Up Environment Variables in AWS Amplify

To enable database-stored sharing, you need to configure environment variables in the Amplify console.

### **Step 1: Access Amplify Console**
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Select your app: **SolarEvo BESS Calculator**
3. Go to **App settings** → **Environment variables**

### **Step 2: Add Required Environment Variables**

Add these environment variables in the Amplify console:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_API_ENDPOINT` | `https://your-api-id.appsync-api.us-east-1.amazonaws.com/graphql` | GraphQL API endpoint |
| `VITE_API_KEY` | `da2-xxxxxxxxxxxxxxxxxxxxxxxxxx` | API Key for GraphQL |
| `AWS_REGION` | `us-east-1` | AWS region |

### **Step 3: Get the Actual Values**

#### **Method A: From AWS AppSync Console**
1. Go to [AWS AppSync Console](https://console.aws.amazon.com/appsync)
2. Select your API: **SolarEvo BESS API**
3. Copy the **GraphQL endpoint URL**
4. Go to **Settings** → **API Keys**
5. Copy the **API Key**

#### **Method B: From Amplify Backend**
```bash
cd backend
npx ampx configure list-outputs
```

### **Step 4: Verify Variables in Amplify**
1. In Amplify Console → **Environment variables**
2. Ensure all variables are set for the correct environment (main/production)
3. **Redeploy** your app after setting variables

### **Step 5: Test Configuration**

Add this diagnostic page to test your setup:

1. Access `yoursite.com/debug-env.html`
2. Check that all sections show **green (success)**
3. Test the "Test Share Creation" button

## 🔍 **Troubleshooting**

### **Issue: Variables Not Available**
**Symptoms:** Still seeing fallback mode
**Solutions:**
1. Check variable names are exactly: `VITE_API_ENDPOINT`, `VITE_API_KEY`
2. Ensure they're set for the correct branch/environment
3. Redeploy after setting variables

### **Issue: Build-time vs Runtime**
**Symptoms:** Variables work in dev but not production
**Solutions:**
1. Use Amplify environment variables (not .env files)
2. Ensure variables are available during build process
3. Use runtime configuration (already implemented)

### **Issue: API Key Format**
**Symptoms:** API connection fails
**Solutions:**
1. Ensure API key starts with `da2-`
2. Check API key hasn't expired
3. Verify permissions for public access

## 🧪 **Alternative Solutions (If Amplify Env Vars Don't Work)**

### **Option 1: Runtime Configuration Injection**
Create an Amplify build hook that injects config at build time:

```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - echo "Creating runtime config..."
        - |
          cat > frontend/public/amplify-config.json << EOF
          {
            "VITE_API_ENDPOINT": "$VITE_API_ENDPOINT",
            "VITE_API_KEY": "$VITE_API_KEY",
            "AWS_REGION": "$AWS_REGION"
          }
          EOF
    build:
      commands:
        - npm run build
```

### **Option 2: Global Variable Injection**
Add to your build process:

```yaml
# amplify.yml - in preBuild
- |
  cat > frontend/env-inject.js << EOF
  window.__AMPLIFY_CONFIG__ = {
    VITE_API_ENDPOINT: "$VITE_API_ENDPOINT",
    VITE_API_KEY: "$VITE_API_KEY",
    AWS_REGION: "$AWS_REGION"
  };
  EOF
- echo '<script src="/env-inject.js"></script>' >> frontend/index.html
```

### **Option 3: Server-Side Environment**
Use AWS Parameter Store or Secrets Manager for runtime config.

## ✅ **Verification Steps**

1. **Check Amplify Console:** Variables are set
2. **Check Build Logs:** No environment variable errors
3. **Check Browser Console:** 
   - `✅ Runtime Config: Using Vite environment variables`
   - `✅ Backend Connected: Database-stored sharing enabled`
4. **Test Share Button:** Creates short links like `yoursite.com/?share=ABC12345`

## 📞 **Support**

If you continue having issues:
1. Check the diagnostic page: `/debug-env.html`
2. Export diagnostic data using the "Export Diagnostic Data" button
3. Review the console logs for specific error messages 