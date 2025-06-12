module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: 'C:/Users/compact-01/Desktop/ning/project-fullstack/frontend_pm2',
      script: 'server.js',
      watch: true,
      autorestart: true,
      max_memory_restart: "1000M",
      env_production: {
        NODE_ENV: 'production',
        PORT: 5173
      }
    },
    {
      name: 'backend',
      cwd: 'C:/Users/compact-01/Desktop/ning/project-fullstack/backend',
      script: 'server.js',
      watch: true,
      autorestart: true,
      max_memory_restart: "1000M",
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
};
