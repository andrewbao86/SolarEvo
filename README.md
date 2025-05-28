# BESS Calculator

A simple and efficient Battery Energy Storage System (BESS) calculator that helps users determine their energy storage needs.

![BESS Calculator Screenshot](screenshots/calculator.png)

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

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
- Icons and design inspiration from various open-source projects
- jsPDF library for PDF generation
- Contributors and users of the BESS Calculator