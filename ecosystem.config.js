module.exports = {
  apps: [
    {
      name: 'kava-bar',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/home/master/applications/YOUR_APP_FOLDER/public_html',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};

