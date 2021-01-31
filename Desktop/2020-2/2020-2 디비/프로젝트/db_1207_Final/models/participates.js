module.exports = (sequelize, Datatypes) => {
    return {
        'participates': sequelize.define('participates', {

            Sub_ID:
            {
              type: Datatypes.STRING,
              primaryKey: false,
              allowNull: false
              
            },
            POS_ID:
            {
                type: Datatypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            Eval_Time:
            {
                type: Datatypes.STRING,
                primaryKey: true,
                allowNull: false
            }
          },
          {
            freezeTableName: true,
            timestamps: false,
            onDelete: 'cascade'
          }),
    }
  };