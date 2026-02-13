module.exports = {
    apps: [{
        name: 'smart-helper',
        script: './server.js',
        instances: 'max', // Use all CPU cores
        exec_mode: 'cluster',

        // Environment
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000
        },

        // Logging
        error_file: './logs/pm2-error.log',
        out_file: './logs/pm2-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,

        // Auto-restart configuration
        watch: false,
        max_memory_restart: '1G',
        min_uptime: '10s',
        max_restarts: 10,
        autorestart: true,

        // Graceful shutdown
        kill_timeout: 5000,
        listen_timeout: 3000,
        shutdown_with_message: true,

        // Advanced features
        instance_var: 'INSTANCE_ID',

        // Monitoring
        monitoring: true,

        // Cron restart (optional - restart daily at 3 AM)
        cron_restart: '0 3 * * *',

        // Environment file
        env_file: '.env.production'
    }],

    // Deployment configuration
    deploy: {
        production: {
            user: 'deploy',
            host: ['your-server-ip'],
            ref: 'origin/main',
            repo: 'git@github.com:yourusername/smart-helper.git',
            path: '/var/www/smart-helper',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
            'pre-setup': 'apt-get install git -y'
        }
    }
};
