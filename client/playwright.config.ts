import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  ],
  // Start both servers before running E2E tests
  webServer: [
    {
      command: 'npm run start --workspace=server',
      url:     'http://localhost:3001/api/roms',
      reuseExistingServer: !process.env.CI,
      timeout: 20_000,
    },
    {
      command: 'npm run dev --workspace=client',
      url:     'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 20_000,
    },
  ],
});
