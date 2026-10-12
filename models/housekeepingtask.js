"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class HousekeepingTask extends Model {
    static associate(models) {
      HousekeepingTask.belongsTo(models.Room, {
        foreignKey: "roomId",
        as: "room"
      });

      HousekeepingTask.belongsTo(models.Housekeeper, {
        foreignKey: "housekeeperId",
        as: "housekeeper"
      });
    }
  }

  HousekeepingTask.init(
    {
      // declared explicitly so the M:N association keeps "id" as the primary key
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },

      task: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Task description is required" },
          len: { args: [3, 200], msg: "Task must contain 3-200 characters" }
        }
      },

      priority: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "medium",
        validate: {
          isIn: {
            args: [["low", "medium", "high"]],
            msg: "Priority must be low, medium or high"
          }
        }
      },

      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
        validate: {
          isIn: {
            args: [["pending", "in-progress", "done"]],
            msg: "Status must be pending, in-progress or done"
          }
        }
      },

      completedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },

      roomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          isInt: { msg: "Room ID must be an integer" },
          min: { args: [1], msg: "Room ID must be positive" }
        }
      },

      // optional: a task can be created before it is assigned to anyone
      housekeeperId: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "HousekeepingTask"
    }
  );

  return HousekeepingTask;
};
