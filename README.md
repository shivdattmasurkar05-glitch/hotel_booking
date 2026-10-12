# Hotel Room Booking & Housekeeping Dashboard - Backend (ISA-II)

Node.js + Express + Sequelize + MySQL.

## Tables and associations
| Table | Key columns |
|---|---|
| Guests | name, email (unique), phone |
| Rooms | number (unique), type, floor, price, status |
| Bookings | checkIn, checkOut, numberOfGuests, status, guestId (FK), roomId (FK) |
| Housekeepers | name, phone, shift |
| HousekeepingTasks | task, priority, status, completedAt, roomId (FK), housekeeperId (FK, nullable) |

- Guest 1:M Booking (RESTRICT)
- Room 1:M Booking (RESTRICT)
- Room 1:M HousekeepingTask (CASCADE)
- Housekeeper 1:M HousekeepingTask (SET NULL)
- Room M:N Housekeeper through HousekeepingTask

## Setup
```bash
npm install
mysql -u root -p -e "CREATE DATABASE hotel_db;"
# check username/password in config/config.json
npx sequelize-cli db:migrate
node create.js          # insert sample rows
node validationTest.js  # see validation messages
node update.js          # retrieve + update demo
node app.js             # API on http://localhost:5000
```
