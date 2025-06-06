# 🛡️ SolarEvo BESS Admin Dashboard Setup Guide

## 📋 Overview

This guide explains how to set up an admin dashboard to view, filter, sort, and manage all customer BESS calculation records.

## 🔍 **1. Data Saving Trigger**

**Data is saved when users click "Generate Shareable Link"** in the main calculator around line 2114 in script.js:

```javascript
const result = await client.graphql({
    query: createSharedCalculationMutation,
    variables: { input }
});
```

**Data includes:**
- ✅ Customer info (name, email, mobile)
- ✅ Device configurations with time ranges
- ✅ Calculated results (energy, battery capacity, recommendations)
- ✅ Timestamp and expiration date

## 🔍 **2. Where to View Stored Data**

### AWS DynamoDB Console
1. Go to https://console.aws.amazon.com/dynamodb/
2. Navigate to "Tables" → "SharedCalculation"
3. Click "Explore table items"
4. View all records with filtering capabilities

### AWS AppSync Console
1. Go to https://console.aws.amazon.com/appsync/
2. Select your GraphQL API
3. Go to "Queries" tab
4. Run GraphQL queries to fetch data

## 🛡️ **3. Mobile Validation Update (COMPLETED)**

✅ **Updated mobile validation in script.js to support international numbers**

The validation now accepts formats like:
- +60123456789 (Malaysia)
- +1234567890 (US)
- +442071234567 (UK)
- +86138000138000 (China)

## 🖥️ **4. Next Steps: Create Admin Dashboard**

### Step 1: Create admin.html
Create a separate admin page with authentication, data display, and management features.

### Step 2: Add GraphQL Queries
Set up queries to fetch all SharedCalculation records from DynamoDB.

### Step 3: Implement Features
- User authentication
- Data filtering and sorting
- CSV/Excel export
- Record management (view, delete)

### Step 4: Deploy
Add the admin page to your existing Amplify deployment.

## 🔐 **5. Security Considerations**

- Use proper authentication (AWS Cognito recommended)
- Implement rate limiting
- Add input validation
- Use HTTPS for all communications
- Restrict admin access to authorized users only

## 📊 **6. Features to Implement**

1. **Authentication System** - Secure login for admin users
2. **Data Table** - Display all records with pagination
3. **Filtering** - Search by name, email, mobile, date range
4. **Sorting** - Sort by any column
5. **Export** - Download data as CSV or Excel
6. **Management** - View, delete, or bulk operations
7. **Analytics** - Usage statistics and trends
8. **Real-time Updates** - Live data refresh

Would you like me to create the complete admin dashboard files next? 