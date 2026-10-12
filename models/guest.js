"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Guest extends Model {
    static associate(models) {
      // 1 Guest : M Bookings
      Guest.hasMany(models.Booking, {
        foreignKey: "guestId",
        as: "bookings"
      });
    }
  }

  Guest.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Guest name is required" },
          len: { args: [2, 100], msg: "Name must contain 2-100 characters" }
        }
      },

      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: {
          name: "guests_email_unique",
          msg: "A guest with this email already exists"
        },
        validate: {
          isEmail: { msg: "Enter a valid email address" }
        }
      },

      phone: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isValidPhone(value) {
            if (value != null && !/^[6-9]\d{9}$/.test(value)) {
              throw new Error("Phone must be a valid 10-digit Indian number");
            }
          }
        }
      }
    },
    {
      sequelize,
      modelName: "Guest"
    }
  );

  return Guest;
};
