import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { PostHogProvider } from 'posthog-js/react'

const root = createRoot(document.getElementById('root')!)

const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const posthogHost = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://app.posthog.com'

const appTree = posthogKey ? (
  <PostHogProvider
    apiKey={posthogKey}
    options={{
      api_host: posthogHost,
      capture_pageview: true,
      capture_performance: true,
      capture_exceptions: true,
      debug: import.meta.env.MODE === 'development'
    }}
  >
    <App />
  </PostHogProvider>
) : (
  <App />
)

root.render(
  <React.StrictMode>
    {appTree}
  </React.StrictMode>
)
