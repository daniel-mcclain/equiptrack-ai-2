# EquipTrack.AI - Fleet Management SaaS

EquipTrack.AI is a comprehensive fleet management SaaS platform designed to help businesses efficiently manage their vehicles, equipment, maintenance schedules, and work orders.

## Features

- **Vehicle Management**: Track and manage your entire fleet of vehicles with detailed information, status tracking, and grouping capabilities.
- **Equipment Tracking**: Monitor all your equipment assets, maintenance history, and technical specifications.
- **Maintenance Scheduling**: Create maintenance templates and schedule preventive maintenance for your vehicles and equipment.
- **Work Order Management**: Create, assign, and track work orders with parts and labor tracking.
- **Parts Inventory**: Manage your parts inventory, track stock levels, and monitor usage.
- **Technician Management**: Assign technicians to work orders and track their skills and certifications.
- **Reporting**: Generate comprehensive reports on fleet performance, maintenance costs, and more.
- **User Management**: Role-based access control with customizable permissions.
- **Multi-company Support**: Global admin capabilities for managing multiple companies.

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Custom components with Tailwind CSS
- **API Integration**: Supabase JS Client
- **Payments**: Stripe integration

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/equiptrack.ai.git
   cd equiptrack.ai
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## Project Structure

- `/src`: Source code
  - `/components`: Reusable UI components
  - `/hooks`: Custom React hooks
  - `/lib`: Utility functions and API clients
  - `/pages`: Application pages
  - `/store`: State management
  - `/types`: TypeScript type definitions
  - `/data`: Demo data and constants
- `/supabase`: Supabase configuration
  - `/functions`: Edge functions
  - `/migrations`: Database migrations

## Database Schema

The application uses a PostgreSQL database with the following main tables:

- `companies`: Company information
- `users`: User profiles and authentication
- `user_companies`: Junction table for user-company relationships
- `vehicles`: Vehicle information
- `equipment`: Equipment information
- `maintenance_templates`: Maintenance schedule templates
- `vehicle_maintenance_schedules`: Vehicle-specific maintenance schedules
- `work_orders`: Work order information
- `work_order_labor`: Labor tracking for work orders
- `work_order_parts`: Parts used in work orders
- `parts_inventory`: Parts inventory management
- `technicians`: Technician information and skills

## Deployment

The application can be deployed to any hosting service that supports Node.js applications. For Supabase functions, deployment is handled through GitHub Actions.

### Deploying to Netlify

1. Connect your GitHub repository to Netlify
2. Set up the build command: `npm run build`
3. Set the publish directory: `dist`
4. Add the required environment variables

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Supabase](https://supabase.io/) for the backend infrastructure
- [React](https://reactjs.org/) for the frontend framework
- [Tailwind CSS](https://tailwindcss.com/) for the styling
- [Lucide Icons](https://lucide.dev/) for the beautiful icons