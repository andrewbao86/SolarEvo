# BESS Calculator

A Battery Energy Storage System (BESS) capacity calculator web application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

## Deployment

This project is configured for deployment on AWS Amplify. The deployment process includes:

1. Automatic deployment on push to the main branch
2. Static site hosting with build process
3. Files are copied to a `dist` directory during build

### Manual Deployment

To deploy manually:

1. Install dependencies:
```bash
npm install
```

2. Run linting:
```bash
npm run lint
```

3. Build the project:
```bash
npm run build
```

4. The built files will be in the `dist` directory

## Project Structure

- `dist/` - Build output directory
- `index.html` - Main entry point
- `script.js` - Application logic
- `styles.css` - Styling
- `thank-you.html` - Thank you page
- `bao-service-logo.svg` - Logo asset

## Requirements

- Node.js >= 14.0.0
- npm >= 6.0.0

## License

See [LICENSE](LICENSE) file for details.

## Features
- Calculate total daily energy consumption
- Determine required battery capacity
- Get recommended BESS size
- Generate detailed PDF reports
- Dark mode support
- Local storage for saving calculations
- Device suggestions with common power ratings
- Input validation and error handling

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/bess-calculator.git
```

2. Navigate to the project directory:
```bash
cd bess-calculator
```

3. Open `index.html` in your web browser or serve it using a local server.

For development, you can use any local server. For example, with Python:
```bash
# Python 3
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Usage
1. Open `index.html` in a modern web browser
2. Add devices with their power consumption and usage patterns
3. View real-time calculations of your energy needs
4. Generate and download a detailed PDF report

## Technologies Used
- HTML5
- CSS3
- JavaScript
- jsPDF for PDF generation
- Local Storage for data persistence

## Project Structure
```
bess-calculator/
├── index.html          # Main application page
├── styles.css          # Stylesheet
├── script.js          # Main JavaScript file
├── assets/            # Images and other assets
├── screenshots/       # Project screenshots
└── README.md         # Project documentation
```

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgments
- Icons and design inspiration from various open-source projects
- jsPDF library for PDF generation
- Contributors and users of the BESS Calculator