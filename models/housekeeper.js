"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Housekeeper extends Model {
    static associate(models) {
      // 1 Housekeeper : M HousekeepingTasks
      Housekeeper.hasMany(models.HousekeepingTask, {
        foreignKey: "housekeeperId",
        as: "tasks"
      });

      // M:N  Housekeeper <-> Room through HousekeepingTask
      Housekeeper.belongsToMany(models.Room, {
        through: { model: models.HousekeepingTask, unique: false },
        foreignKey: "housekeeperId",
        otherKey: "roomId",
        as: "cleanedRooms"
      });
    }
  }

  Housekeeper.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Housekeeper name is required" },
          len: { args: [2, 100], msg: "Name must contain 2-100 characters" }
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
      },

      shift: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Morning",
        validate: {
          isIn: {
            args: [["Morning", "Evening", "Night"]],
            msg: "Shift must be Morning, Evening or Night"
          }
        }
      }
    },
    {
      sequelize,
      modelName: "Housekeeper"
    }
  );

  return Housekeeper;
};
