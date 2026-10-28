const userAgent = process.env.npm_config_user_agent ?? ''

if (!userAgent.startsWith('pnpm/12.3.4')) {
  console.error('This project requires pnpm@12.3.4. Use Corepack or Docker Compose to run it.')
  process.exit(1)
}