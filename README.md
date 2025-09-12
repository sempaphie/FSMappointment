# FSM Appointment Manager

A modern React application for managing SAP Field Service Management (FSM) appointments with a clean, responsive interface.

## Features

- 📅 Appointment management and scheduling
- 👥 Customer and technician management
- 🗺️ Location-based appointment tracking
- 📊 Real-time dashboard with statistics
- 🔄 Real-time updates and notifications
- 📱 Responsive design for mobile and desktop

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + Lucide React icons
- **HTTP Client**: Axios
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd FSMappointment
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

Edit `.env.local` with your FSM API credentials:
```env
VITE_FSM_BASE_URL=https://api.sap.com/fsm
VITE_FSM_CLIENT_ID=your_client_id_here
VITE_FSM_CLIENT_VERSION=1.0.0
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # Reusable UI components
├── lib/                # Utility functions and API client
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

## API Integration

The application is configured to work with SAP FSM APIs. All API calls include the required headers:
- `X-Client-ID`: Your FSM client ID
- `X-Client-Version`: Client version for API compatibility

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

The project uses ESLint for code quality and consistency. Make sure to run `npm run lint` before committing changes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.