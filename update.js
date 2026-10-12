const {
  Room,
  Booking,
  Guest,
  HousekeepingTask,
  Housekeeper,
  sequelize
} = require("./models");

async function retrieveAndUpdate() {
  try {
    // 1. Retrieve all rooms
    const rooms = await Room.findAll();
    console.log("All Rooms:");
    console.log(rooms.map((room) => room.toJSON()));

    // 2. Retrieve a room using primary key
    const roomById = await Room.findByPk(1);
    console.log("Room by ID:");
    console.log(roomById ? roomById.toJSON() : "Room not found");

    // 3. Retrieve bookings with their guest and room (association include)
    const bookings = await Booking.findAll({
      include: [
        { model: Guest, as: "guest" },
        { model: Room, as: "room" }
      ]
    });
    console.log("Bookings with Guest and Room:");
    console.log(bookings.map((b) => b.toJSON()));

    // 4. Retrieve tasks with room and housekeeper
    const tasks = await HousekeepingTask.findAll({
      include: [
        { model: Room, as: "room" },
        { model: Housekeeper, as: "housekeeper" }
      ]
    });
    console.log("Housekeeping Tasks:");
    console.log(tasks.map((t) => t.toJSON()));

    // 5. Update a room's status
    if (roomById) {
      await roomById.update({ status: "cleaning" });
      console.log("Room status updated to:", roomById.status);
    }
  } catch (error) {
    console.error("Error retrieving/updating records:", error);
  } finally {
    await sequelize.close();
  }
}

retrieveAndUpdate();
