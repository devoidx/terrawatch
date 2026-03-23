import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      50:  '#e6f6ff',
      100: '#bae3ff',
      200: '#7cc4fa',
      300: '#47a3f3',
      400: '#2186eb',
      500: '#0967d2',
      600: '#0552b5',
      700: '#03449e',
      800: '#01337d',
      900: '#002159',
    },
    seismic: {
      minor:    '#48bb78', // green  - mag < 4
      light:    '#ecc94b', // yellow - mag 4-5
      moderate: '#ed8936', // orange - mag 5-6
      strong:   '#f56565', // red    - mag 6-7
      major:    '#9b2c2c', // dark red - mag 7+
    },
    volcano: {
      normal:   '#48bb78',
      advisory: '#ecc94b',
      watch:    '#ed8936',
      warning:  '#f56565',
    },
  },
  fonts: {
    heading: `'Syne', 'DM Sans', sans-serif`,
    body:    `'DM Sans', sans-serif`,
    mono:    `'JetBrains Mono', monospace`,
  },
  styles: {
    global: {
      body: {
        bg: 'gray.900',
        color: 'gray.100',
      },
    },
  },
  components: {
    Button: {
      defaultProps: { colorScheme: 'brand' },
    },
    Badge: {
      baseStyle: { borderRadius: 'full', fontFamily: 'mono', fontWeight: '600' },
    },
  },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <App />
        </ChakraProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
