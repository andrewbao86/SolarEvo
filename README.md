# BESS Calculator with Backend

This project includes a Battery Energy Storage System (BESS) calculator with a backend server for collecting customer data and report information.

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm (Node Package Manager)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following content:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/bess_calculator
NODE_ENV=development
```

3. Start MongoDB service on your system:
- Windows: MongoDB should be running as a service
- macOS: `brew services start mongodb-community`
- Linux: `sudo systemctl start mongod`

### Running the Application

1. Start the backend server:
```bash
npm run dev
```

2. The server will start on `http://localhost:3000`

### Features
- Customer information collection
- Report data storage in MongoDB
- API endpoint for saving reports
- Error handling and validation
- CORS enabled for frontend communication

### API Endpoints

#### POST /api/reports
Saves a new BESS calculation report with customer information.

Request body example:
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerMobile": "+1234567890",
  "totalEnergy": 15.5,
  "batteryCapacity": 12.8,
  "recommendedSize": 15.36,
  "solarevoRecommendation": "1 × SolarEvo L15 (15 kWh)",
  "devices": [
    {
      "name": "Fridge",
      "power": 250,
      "quantity": 1,
      "operatingHours": 24,
      "batteryHours": 12
    }
  ]
}
```

Response example:
```json
{
  "success": true,
  "message": "Report saved successfully",
  "reportId": "5f9b2c1b3e7a8d1234567890"
}
```

### Error Handling
The backend includes comprehensive error handling for:
- Invalid data formats
- Missing required fields
- Database connection issues
- Server errors

### Security
- Uses Helmet.js for security headers
- CORS enabled for frontend communication
- Input validation and sanitization
- Environment variables for sensitive data