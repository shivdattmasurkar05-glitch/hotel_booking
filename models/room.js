"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    static associate(models) {
      // 1 Room : M Bookings
      Room.hasMany(models.Booking, {
        foreignKey: "roomId",
        as: "bookings"
      });

      // 1 Room : M HousekeepingTasks
      Room.hasMany(models.HousekeepingTask, {
        foreignKey: "roomId",
        as: "tasks"
      });

      // M:N  Room <-> Housekeeper through HousekeepingTask
      Room.belongsToMany(models.Housekeeper, {
        through: { model: models.HousekeepingTask, unique: false },
        foreignKey: "roomId",
        otherKey: "housekeeperId",
        as: "housekeepers"
      });
    }
  }

  Room.init(
    {
      number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          name: "rooms_number_unique",
          msg: "Room number must be unique"
        },
        validate: {
          notEmpty: { msg: "Room number is required" },
          len: { args: [1, 10], msg: "Room number must contain 1-10 characters" }
        }
      },

      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: {
            args: [["single", "double", "suite"]],
            msg: "Type must be single, double or suite"
          }
        }
      },

      floor: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: { msg: "Floor must be an integer" },
          min: { args: [0], msg: "Floor cannot be negative" },
          max: { args: [50], msg: "Floor cannot be above 50" }
        }
      },

      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: { msg: "Price must be a whole number" },
          min: { args: [1], msg: "Price per night must be greater than 0" }
        }
      },

      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "available",
        validate: {
          isIn: {
            args: [["available", "occupied", "cleaning", "maintenance"]],
            msg: "Status must be available, occupied, cleaning or maintenance"
          }
        }
      }
    },
    {
      sequelize,
      modelName: "Room"
    }
  );

  return Room;
};
