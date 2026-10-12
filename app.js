const express = require("express");
const { Op } = require("sequelize");
const db = require("./models");

const { Guest, Housekeeper, Room, Booking, HousekeepingTask, sequelize } = db;

const app = express();

app.use(express.json());

// Allow the React frontend (different port) to call this API
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// req.body is undefined in Express 5 when no body is sent
app.use((req, res, next) => {
  req.body = req.body || {};
  next();
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const parseId = (value, label = "ID") => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, `${label} must be a positive integer`);
  }
  return id;
};

const findOr404 = async (Model, id, options = {}, label = Model.name) => {
  const row = await Model.findByPk(parseId(id, `${label} ID`), options);
  if (!row) throw new HttpError(404, `${label} not found`);
  return row;
};

const pick = (obj, keys) =>
  keys.reduce((acc, k) => (obj[k] !== undefined ? { ...acc, [k]: obj[k] } : acc), {});

const BOOKING_STATUSES = ["reserved", "checked-in", "checked-out", "cancelled"];
const TASK_STATUSES = ["pending", "in-progress", "done"];

// allowed status changes
const BOOKING_FLOW = {
  reserved: ["checked-in", "cancelled"],
  "checked-in": ["checked-out"],
  "checked-out": [],
  cancelled: []
};
const TASK_FLOW = {
  pending: ["in-progress", "done"],
  "in-progress": ["done"],
  done: []
};

const bookingInclude = [
  { model: Guest, as: "guest" },
  { model: Room, as: "room", attributes: ["id", "number", "type"] }
];

const taskInclude = [
  { model: Room, as: "room", attributes: ["id", "number", "type"] },
  { model: Housekeeper, as: "housekeeper" }
];

// flatten names so the frontend can show them directly
const bookingDto = (b) => ({ ...b.toJSON(), guestName: b.guest ? b.guest.name : null });
const taskDto = (t) => ({
  ...t.toJSON(),
  assignedTo: t.housekeeper ? t.housekeeper.name : "Unassigned"
});

/* ------------------------------------------------------------------ */
/* Test route                                                          */
/* ------------------------------------------------------------------ */

app.get("/", (req, res) => {
  res.send("Hotel Booking & Housekeeping API is running");
});

/* ------------------------------------------------------------------ */
/* Rooms                                                               */
/* ------------------------------------------------------------------ */

// Get rooms (optional filters: ?status=available&type=double)
app.get("/api/rooms", async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.type) where.type = req.query.type;

  const rooms = await Room.findAll({ where, order: [["number", "ASC"]] });
  res.json(rooms);
});

// Get one room with its bookings (and guests) and housekeeping tasks
app.get("/api/rooms/:id", async (req, res) => {
  const room = await findOr404(Room, req.params.id, {
    include: [
      { model: Booking, as: "bookings", include: [{ model: Guest, as: "guest" }] },
      { model: HousekeepingTask, as: "tasks", include: [{ model: Housekeeper, as: "housekeeper" }] }
    ],
    order: [[{ model: Booking, as: "bookings" }, "checkIn", "DESC"]]
  });

  const data = room.toJSON();
  data.bookings = room.bookings.map(bookingDto);
  data.tasks = room.tasks.map(taskDto);
  res.json(data);
});

// Create a room
app.post("/api/rooms", async (req, res) => {
  const room = await Room.create(pick(req.body, ["number", "type", "floor", "price", "status"]));
  res.status(201).json(room);
});

// Update a room
app.put("/api/rooms/:id", async (req, res) => {
  const room = await findOr404(Room, req.params.id);
  await room.update(pick(req.body, ["number", "type", "floor", "price", "status"]));
  res.json(room);
});

// Delete a room (blocked by the database if it has bookings)
app.delete("/api/rooms/:id", async (req, res) => {
  const room = await findOr404(Room, req.params.id);
  await room.destroy();
  res.status(204).end();
});

/* ------------------------------------------------------------------ */
/* Guests                                                              */
/* ------------------------------------------------------------------ */

app.get("/api/guests", async (req, res) => {
  res.json(await Guest.findAll({ order: [["name", "ASC"]] }));
});

app.get("/api/guests/:id", async (req, res) => {
  const guest = await findOr404(Guest, req.params.id, {
    include: [{ model: Booking, as: "bookings", include: [{ model: Room, as: "room" }] }]
  });
  res.json(guest);
});

app.post("/api/guests", async (req, res) => {
  const guest = await Guest.create(pick(req.body, ["name", "email", "phone"]));
  res.status(201).json(guest);
});

/* ------------------------------------------------------------------ */
/* Housekeepers                                                        */
/* ------------------------------------------------------------------ */

app.get("/api/housekeepers", async (req, res) => {
  const staff = await Housekeeper.findAll({
    include: [{ model: HousekeepingTask, as: "tasks" }],
    order: [["name", "ASC"]]
  });
  res.json(staff);
});

app.post("/api/housekeepers", async (req, res) => {
  const staff = await Housekeeper.create(pick(req.body, ["name", "phone", "shift"]));
  res.status(201).json(staff);
});

/* ------------------------------------------------------------------ */
/* Bookings                                                            */
/* ------------------------------------------------------------------ */

// Get bookings with guest and room (optional filter: ?status=reserved)
app.get("/api/bookings", async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;

  const bookings = await Booking.findAll({
    where,
    include: bookingInclude,
    order: [["checkIn", "DESC"]]
  });
  res.json(bookings.map(bookingDto));
});

// Create a booking. Send either guestId, or guestName (guest is found/created by name)
app.post("/api/bookings", async (req, res) => {
  const { guestId, guestName, guestEmail, guestPhone, roomId, checkIn, checkOut, numberOfGuests } = req.body;

  const bookingId = await sequelize.transaction(async (t) => {
    // 1. guest
    let guest;
    if (guestId) {
      guest = await findOr404(Guest, guestId, { transaction: t });
    } else {
      if (!guestName || !String(guestName).trim()) {
        throw new HttpError(400, "guestId or guestName is required");
      }
      [guest] = await Guest.findOrCreate({
        where: { name: String(guestName).trim() },
        defaults: { email: guestEmail || null, phone: guestPhone || null },
        transaction: t
      });
    }

    // 2. room
    const room = await findOr404(Room, roomId, { transaction: t }, "Room");
    if (room.status === "maintenance") {
      throw new HttpError(409, `Room ${room.number} is under maintenance`);
    }

    // 3. validate the booking fields (dates, guests count, check-out after check-in)
    const booking = Booking.build({
      guestId: guest.id,
      roomId: room.id,
      checkIn,
      checkOut,
      numberOfGuests
    });
    await booking.validate();

    // 4. no overlapping active booking for the same room
    const clash = await Booking.findOne({
      where: {
        roomId: room.id,
        status: { [Op.in]: ["reserved", "checked-in"] },
        checkIn: { [Op.lt]: booking.checkOut },
        checkOut: { [Op.gt]: booking.checkIn }
      },
      transaction: t
    });
    if (clash) {
      throw new HttpError(409, `Room ${room.number} is already booked for these dates`);
    }

    await booking.save({ transaction: t });
    return booking.id;
  });

  const booking = await Booking.findByPk(bookingId, { include: bookingInclude });
  res.status(201).json(bookingDto(booking));
});

// Change booking status: check-in, check-out or cancel
// check-in  -> room becomes "occupied"
// check-out -> room becomes "cleaning" and a housekeeping task is created
app.patch("/api/bookings/:id", async (req, res) => {
  const { status } = req.body;
  if (!BOOKING_STATUSES.includes(status)) {
    throw new HttpError(400, `Status must be one of: ${BOOKING_STATUSES.join(", ")}`);
  }

  await sequelize.transaction(async (t) => {
    const booking = await findOr404(Booking, req.params.id, { transaction: t });

    if (!BOOKING_FLOW[booking.status].includes(status)) {
      throw new HttpError(409, `Cannot change a ${booking.status} booking to ${status}`);
    }

    const room = await findOr404(Room, booking.roomId, { transaction: t });

    if (status === "checked-in") {
      if (room.status !== "available") {
        throw new HttpError(409, `Room ${room.number} is not ready (status: ${room.status})`);
      }
      await room.update({ status: "occupied" }, { transaction: t });
    }

    if (status === "checked-out") {
      await room.update({ status: "cleaning" }, { transaction: t });
      await HousekeepingTask.create(
        { roomId: room.id, task: "Full cleaning after checkout", priority: "high" },
        { transaction: t }
      );
    }

    await booking.update({ status }, { transaction: t });
  });

  const booking = await Booking.findByPk(req.params.id, { include: bookingInclude });
  res.json(bookingDto(booking));
});

/* ------------------------------------------------------------------ */
/* Housekeeping tasks                                                  */
/* ------------------------------------------------------------------ */

// Get tasks with room and housekeeper (optional filter: ?status=pending)
app.get("/api/housekeeping", async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;

  const tasks = await HousekeepingTask.findAll({
    where,
    include: taskInclude,
    order: [["createdAt", "DESC"]]
  });
  res.json(tasks.map(taskDto));
});

// Create a task. Send housekeeperId, or assignedTo (housekeeper found/created by name)
app.post("/api/housekeeping", async (req, res) => {
  const { roomId, task, priority, housekeeperId, assignedTo } = req.body;

  const room = await findOr404(Room, roomId, {}, "Room");

  let assigneeId = null;
  if (housekeeperId) {
    assigneeId = (await findOr404(Housekeeper, housekeeperId, {}, "Housekeeper")).id;
  } else if (assignedTo && String(assignedTo).trim() && assignedTo !== "Unassigned") {
    const [staff] = await Housekeeper.findOrCreate({ where: { name: String(assignedTo).trim() } });
    assigneeId = staff.id;
  }

  const created = await HousekeepingTask.create({
    roomId: room.id,
    housekeeperId: assigneeId,
    task,
    priority
  });

  const full = await HousekeepingTask.findByPk(created.id, { include: taskInclude });
  res.status(201).json(taskDto(full));
});

// Change task status (pending -> in-progress -> done)
// done -> room goes back to "available" if it was being cleaned
app.patch("/api/housekeeping/:id", async (req, res) => {
  const { status, housekeeperId, priority } = req.body;
  if (!TASK_STATUSES.includes(status)) {
    throw new HttpError(400, `Status must be one of: ${TASK_STATUSES.join(", ")}`);
  }

  await sequelize.transaction(async (t) => {
    const task = await findOr404(HousekeepingTask, req.params.id, { transaction: t }, "Task");

    if (!TASK_FLOW[task.status].includes(status)) {
      throw new HttpError(409, `Cannot change a ${task.status} task to ${status}`);
    }

    const changes = { status, ...pick({ housekeeperId, priority }, ["housekeeperId", "priority"]) };

    if (status === "done") {
      changes.completedAt = new Date();
      const room = await findOr404(Room, task.roomId, { transaction: t });
      if (room.status === "cleaning") {
        await room.update({ status: "available" }, { transaction: t });
      }
    }

    await task.update(changes, { transaction: t });
  });

  const task = await HousekeepingTask.findByPk(req.params.id, { include: taskInclude });
  res.json(taskDto(task));
});

/* ------------------------------------------------------------------ */
/* 404 + central error handler                                         */
/* ------------------------------------------------------------------ */

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Express 5 forwards errors from async handlers here automatically
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({
      error: err.errors.map((e) => e.message).join(", "),
      errors: err.errors.map((e) => ({ field: e.path, msg: e.message }))
    });
  }
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({ error: err.errors[0] ? err.errors[0].message : "Duplicate value" });
  }
  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(409).json({ error: "Invalid reference, or this record is still used by other records" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = 5000;

db.sequelize.authenticate()
  .then(() => {
    console.log("MySQL connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
  });
