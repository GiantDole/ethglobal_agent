module.exports = {
  apps: [
    {
      name: 'bouncer-ai-dev',
      script: 'app.js',
      watch: true,
      ignore_watch: ['node_modules', 'logs'],
      env: {
        NODE_ENV: 'development',
        PORT: 8000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '1G',
      merge_logs: true,
      log_rotate: true,
      max_size: '10M',
      retain: '30'
    },
    {
      name: 'bouncer-ai-prod',
      script: 'app.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      max_memory_restart: '1G',
      merge_logs: true,
      log_rotate: true,
      max_size: '10M',
      retain: '30'
    }
  ]
}; 
