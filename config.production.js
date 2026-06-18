module.exports = {
    server: {
        port: process.env.PORT || 3003,
        allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://yourdomain.com'],
        rateLimitWindow: 15 * 60 * 1000, // 15 minutes
        rateLimitMax: 100
    },
    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'labadmin',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'lab_management',
        ssl: process.env.DB_SSL === 'true',
        connectionLimit: 10
    },
    security: {
        jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',
        sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
        cookieSecret: process.env.COOKIE_SECRET || 'your-cookie-secret',
        bcryptRounds: 12
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: '/var/log/lab-management/app.log'
    }
}; 