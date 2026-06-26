module.exports = {
  apps: [
    {
      name: 'mystical-bot',
      script: 'index.js',
      cwd: '/root/Mystical/chatbot-mvp',
      restart_delay: 5000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'render-keepalive',
      script: 'keepalive.js',
      cwd: '/root/Mystical/chatbot-mvp',
      restart_delay: 60000,
    },
  ],
};
