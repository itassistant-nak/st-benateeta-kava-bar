# 🥥 Kava Bar Income Tracker

A modern, responsive web application for tracking daily income, expenses, and profit for your kava bar business.

## Features

- **Daily Entry Tracking**: Record cash in hand, credits, and detailed expense breakdown
- **Cashflow Management**:
  - Track powder purchases from factory
  - Separate expenses from daily operations
  - Visualize income vs expenses
- **Inventory Monitoring (Stok)**:
  - Track total powder purchased
  - Monitor daily powder usage (packets and cups)
  - View real-time remaining stock
  - Low stock alerts
- **Expense Categories**:
  - Te tia roti expenses
  - Servers (Taan serve) expenses
  - Book keeping (booki) expenses
  - Other miscellaneous expenses
- **Automatic Profit Calculation**: Real-time profit calculation based on your inputs
- **Powder Cost Calculator**: Track packets and cups used with automatic cost calculation
  - 1 packet = AUD $63
  - 1 cup = AUD $7.875 (1/8 of a packet)
- **Reports & Analytics**: View daily, weekly, and monthly performance reports
- **User Management**: Admin panel for managing multiple users
- **Role-Based Access**: Admin and regular user roles with appropriate permissions
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark Theme**: Modern, kava-inspired color palette

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: SQLite (sql.js)
- **Authentication**: bcrypt for password hashing, cookie-based sessions
- **Styling**: Custom CSS with modern design system
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone or navigate to the project directory:
```bash
cd /home/user/Documents/Projects/Benateeta-Kava-bar
```

2. Install dependencies:
```bash
npm install
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

> ⚠️ **Important**: Change the default admin password after first login by creating a new admin user and deleting the default one.

## Usage

### For Regular Users

1. **Login**: Use your credentials to access the dashboard
2. **Daily Entry**: Fill out the daily entry form to record sales and usage
3. **Cashflow**:
   - Record powder purchases from the factory
   - Monitor remaining powder stock
   - View cashflow analysis
4. **Reports**: Navigate to the Reports page to view detailed analytics

### For Administrators

All regular user features, plus:

1. **User Management**: Access the Admin panel to:
   - View all users
   - Create new users (regular or admin)
   - Delete users (except default admin)
2. **System-wide Reports**: View aggregated data across all users

## Profit Calculation

The application uses the following formula:

```
Total Expenses = Te tia roti + Servers + Bookkeeping + Other Expenses
Profit = Cash in Hand + Credits + Total Expenses - Powder Cost

Where:
Powder Cost = (Packets × $63) + (Cups × $7.875)
```

## Inventory Logic

The system tracks inventory using the formula:

```
Total Stock = Total Purchased - Total Used

Where:
Total Purchased = Sum of packets from "Powder Purchases"
Total Used = Sum of packets/cups from "Daily Entries"
Remaining = Displayed in Packets and Cups (e.g. 5p 3c)
```

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── cashflow/     # Cashflow analysis endpoints
│   │   ├── entries/      # Daily entries CRUD
│   │   ├── inventory/    # Inventory monitoring
│   │   ├── powder-purchases/ # Purchase tracking
│   │   ├── reports/      # Reports generation
│   │   └── admin/        # Admin user management
│   ├── cashflow/         # Cashflow management page
│   ├── dashboard/        # User dashboard page
│   ├── reports/          # Reports page
│   ├── admin/            # Admin panel page
│   ├── globals.css       # Global styles and design system
│   └── layout.tsx        # Root layout with navigation
├── components/           # React components
│   ├── DailyEntryForm.tsx
│   ├── EntryList.tsx
│   ├── CashflowDashboard.tsx
│   ├── InventoryDashboard.tsx
│   ├── PowderPurchaseForm.tsx
│   ├── PowderPurchaseList.tsx
│   ├── ReportsDashboard.tsx
│   ├── AdminPanel.tsx
│   └── Navigation.tsx
├── lib/                  # Utility libraries
│   ├── db.ts            # Database connection and queries
│   ├── auth.ts          # Authentication utilities
│   └── session.ts       # Session management
├── scripts/
│   ├── migrate-cashflow.ts # Database migration script
│   └── test-cashflow.sh    # Testing script
└── database/
    ├── schema.sql       # Database schema
    └── kava-bar.db      # SQLite database (auto-generated)
```

## Database Schema

### Users Table
- `id`: Primary key
- `username`: Unique username
- `password_hash`: Bcrypt hashed password
- `role`: 'admin' or 'user'
- `created_at`: Timestamp

### Daily Entries Table
- `id`: Primary key
- `user_id`: Foreign key to users
- `date`: Entry date (unique per user)
- `cash_in_hand`: Cash collected
- `credits`: Money owed
- `expenses`: Daily expenses
- `packets_used`: Number of packets used
- `cups_used`: Number of cups used
- `powder_cost`: Calculated powder cost
- `profit`: Calculated profit
- `notes`: Optional notes
- `created_at`: Timestamp

### Powder Purchases Table
- `id`: Primary key
- `user_id`: Foreign key to users
- `purchase_date`: Date of purchase
- `supplier_name`: Name of factory/supplier
- `packets_purchased`: Quantity bought
- `cost_per_packet`: Unit cost
- `total_cost`: Total expense
- `payment_method`: Cash/Credit/Transfer
- `invoice_number`: Optional reference
- `notes`: Optional notes
- `created_at`: Timestamp

## Development

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## Security Notes

- Passwords are hashed using bcrypt before storage
- Sessions are stored in HTTP-only cookies
- Role-based access control prevents unauthorized access
- Default admin account should be replaced in production

## License

This project is created for personal/business use.

## Support

For issues or questions, please contact your system administrator.
