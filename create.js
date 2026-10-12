const {
  Guest,
  Housekeeper,
  Room,
  Booking,
  HousekeepingTask,
  sequelize
} = require("./models");

async function createHotelRecords() {
  try {
    // 1. Create Guest
    const guest = await Guest.create({
      name: "Rahul Naik",
      email: "rahul@example.com",
      phone: "9876543210"
    });

    console.log("Guest Created:");
    console.log(guest.toJSON());

    // 2. Create Room
    const room = await Room.create({
      number: "101",
      type: "double",
      floor: 1,
      price: 3500
    });

    console.log("Room Created:");
    console.log(room.toJSON());

    // 3. Create Booking (Guest 1:M Booking, Room 1:M Booking)
    const booking = await Booking.create({
      checkIn: "2026-10-15",
      checkOut: "2026-10-18",
      numberOfGuests: 2,
      guestId: guest.id,
      roomId: room.id
    });

    console.log("Booking Created:");
    console.log(booking.toJSON());

    // 4. Create Housekeeper
    const housekeeper = await Housekeeper.create({
      name: "Sunita Kamble",
      phone: "9123456780",
      shift: "Morning"
    });

    console.log("Housekeeper Created:");
    console.log(housekeeper.toJSON());

    // 5. Create Housekeeping Task (Room 1:M Task, Housekeeper 1:M Task)
    const task = await HousekeepingTask.create({
      task: "Deep clean and change linen",
      priority: "high",
      roomId: room.id,
      housekeeperId: housekeeper.id
    });

    console.log("Housekeeping Task Created:");
    console.log(task.toJSON());
  } catch (error) {
    console.error("Error creating hotel records:", error);
  } finally {
    await sequelize.close();
  }
}

createHotelRecords();
