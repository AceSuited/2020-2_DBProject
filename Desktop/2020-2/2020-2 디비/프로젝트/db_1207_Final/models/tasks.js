module.exports = (sequelize, Datatypes) => {
    return {
        'task': sequelize.define('task', {

            TName:
            {
              type: Datatypes.STRING,
              primaryKey: true,
              allowNull: false
              
            },
            Explanation:
            {
                type: Datatypes.STRING,
                primaryKey: false,
                allowNull: true
            },
            Upload_Interval:
            {
                type: Datatypes.STRING,
                primaryKey: false,
                allowNull: true
            },
            TD_ID:
            {
                type: Datatypes.STRING,
                primaryKey: false,
                allowNull: false
            },
            TDT_SChema:
            {
                type: Datatypes.STRING,
                primaryKey: false,
                allowNull: true
            },
            Guideline:
            {
                type: Datatypes.STRING,
                primaryKey: false,
                allowNull: true
            }
          },
          {
            freezeTableName: true,
            timestamps: false,
            onDelete: 'cascade'
          }),
    }
  };