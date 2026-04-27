{
  name: 'dashboard-server',
  script: './dashboard/server.js',
  watch: false,
  env: {
    NODE_ENV: 'production',
    PORT: 5000,
    GITHUB_TOKEN: 'process.env.GITHUB_TOKEN || '''
  }
}