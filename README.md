# Website Monitoring Application

## 📋 Description
This project is a monitoring tool for websites. It allows you to monitor the status and performance of your websites in real time. It is composed of a modern user interface (frontend) and a robust server (backend) that performs periodic checks of the monitored sites.

## 🚀 Features

- **Real-Time Monitoring**
  - Check the status of your websites (up/down)
  - Measure the response time
  - Track the availability (uptime)
  - Count the visitors

- **Dashboard**
  - Visualize the real-time statistics
  - History of performances
  - Alerts in case of problem
  - Detailed daily statistics

- **Security**
  - Authentication of users
  - Token system for tracking
  - Protection CORS
  - Secure data management

## 🛠 Technical Architecture

### Frontend
- React.js
- Nginx for the web server

### Backend
- Node.js with Express
- MongoDB for data storage
- Logging system

## 📦 Installation

### Configuration

1. **Backend**
   ```bash
   cd backend
   cp .env.example .env
   ```
   Configure the .env file with your environment variables

   if you use docker, you can configure the dockerfile with your port
   ```bash
   cp dockerfile.exemple dockerfile
   ```

2. **Frontend**
   ```bash
   cd frontend
   cp .env.example .env
   
   ```
   Configure the .env file with your environment variables

   if you use nginx for the web server, you can configure the nginx/nginx.conf file with your nginx configuration
   ```bash
   mkdir nginx/nginx.conf
   ```

## 🚀 Start

### With Docker
```bash
docker-compose build
docker-compose up -d
```

### Without Docker
1. **Backend**
   ```bash
   cd backend
   npm install
   npm run start
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run start
   ```

## 📊 Integration of the Tracking

To integrate the tracking on a website:

1. Create a file `.well-known/monitoring-allowed` at the root of the website you want to monitor
2. Add your monitoring token: `MONITOR_TOKEN=your_token`
3. Once the site is added, you will have a tracking script to integrate on your site
**The steps are detailed when adding the site**

## 🤝 Support

For any questions or issues:
- Open an issue on GitHub
- Email: contact@logandelmairedev.com
- Website: [logandelmairedev.com](https://logandelmairedev.com)

## 📄 License

MIT © Logan DELMAIRE