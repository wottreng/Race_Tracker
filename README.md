# Race Tracker

Race Tracker is a Progressive Web Application (PWA) designed for tracking speed, distance, g-forces, and other telemetry data during track racing. It provides real-time data visualization, offline capabilities, and post-race analysis tools.

## Live Demo

Access the production version here:  
[https://tracker.ironcloud.us/](https://tracker.ironcloud.us/)

<img src=ref/Screenshot_20250525.jpg style="width: 300px;" >

## Features

- Real-time tracking of speed, distance, time, and g-forces
- Local data storage for offline use
- Export data to CSV format
- Import data from CSV files
- PWA support for offline access and installation
- Video overlay creation from recorded data
- Calculate lap times and average speeds
- Tracks maximum speed and g-forces
- Plot data points on the map
- Set automatic start for logging

## Installation

To run the application locally:

1. Clone this repository:
    ```bash
    git clone <repository-url>
    ```
2. Run http server in root directory:
    ```bash
    npx http-server .
    ```
3. Grant location access when prompted for full functionality.

## Usage

- Open the app.
- View real-time telemetry data on the dashboard.
- Start logging data in the logging menu.
- Export your session data as CSV for further analysis.
- Use the video overlay feature to combine telemetry with race footage.

## Testing

To run unit tests:
```bash
npm test
```

to develope front end tests:
```bash
npx cypress open
```

to run front end tests headless:
```bash
 npx http-server . & wait-on http://127.0.0.1:8080/race_tracker.html && npx cypress run && kill -9 $(ps -a | grep 'http-server' | awk '{print $1}')
 ```

## License

[MIT License](LICENSE)

## Contact

For questions or support, please contact [Mark](mailto:mwottreng@yahoo.com).
