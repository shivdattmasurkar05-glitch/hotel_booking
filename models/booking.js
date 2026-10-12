"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      Booking.belongsTo(models.Guest, {
        foreignKey: "guestId",
        as: "guest"
      });

      Booking.belongsTo(models.Room, {
        foreignKey: "roomId",
        as: "room"
      });
    }
  }

  Booking.init(
    {
      checkIn: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: { msg: "Enter a valid check-in date" }
        }
      },

      checkOut: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: { msg: "Enter a valid check-out date" }
        }
      },

      numberOfGuests: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          isInt: { msg: "Number of guests must be an integer" },
          min: { args: [1], msg: "At least 1 guest is required" },
          max: { args: [6], msg: "A room can hold at most 6 guests" }
        }
      },

      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "reserved",
        validate: {
          isIn: {
            args: [["reserved", "checked-in", "checked-out", "cancelled"]],
            msg: "Status must be reserved, checked-in, checked-out or cancelled"
          }
        }
      },

      guestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: { msg: "Guest ID must be an integer" },
          min: { args: [1], msg: "Guest ID must be positive" }
        }
      },

      roomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: { msg: "Room ID must be an integer" },
          min: { args: [1], msg: "Room ID must be positive" }
        }
      }
    },
    {
      sequelize,
      modelName: "Booking",
      validate: {
        // model-wide validation: check-out must be after check-in
        checkOutAfterCheckIn() {
          if (this.checkIn && this.checkOut && this.checkOut <= this.checkIn) {
            throw new Error("Check-out date must be after check-in date");
          }
        }
      }
    }
  );

  return Booking;
};
