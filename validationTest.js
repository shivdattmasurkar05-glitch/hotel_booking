const {
  Guest,
  Housekeeper,
  Room,
  Booking,
  HousekeepingTask,
  sequelize
} = require("./models");

async function testValidations() {
  try {
    await Guest.create({
      name: "",
      email: "invalid-email",
      phone: "123"
    });
  } catch (error) {
    console.log("Guest validation:", error.message);
  }

  try {
    await Housekeeper.create({
      name: "A",
      shift: "Afternoon"
    });
  } catch (error) {
    console.log("Housekeeper validation:", error.message);
  }

  try {
    await Room.create({
      number: "",
      type: "penthouse",
      floor: -1,
      price: 0,
      status: "broken"
    });
  } catch (error) {
    console.log("Room validation:", error.message);
  }

  try {
    await Booking.create({
      checkIn: "2026-10-20",
      checkOut: "2026-10-18",
      numberOfGuests: 10,
      guestId: 999999,
      roomId: 999999
    });
  } catch (error) {
    console.log("Booking validation:", error.message);
  }

  try {
    await HousekeepingTask.create({
      task: "",
      priority: "urgent",
      status: "finished",
      roomId: 999999
    });
  } catch (error) {
    console.log("HousekeepingTask validation:", error.message);
  }
}

testValidations()
  .catch(console.error)
  .finally(() => sequelize.close());
