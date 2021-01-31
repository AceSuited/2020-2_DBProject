module.exports = (sequelize, Datatypes) => {
    return {
        'evaluating': sequelize.define('evaluating', {

            Evaluator_ID:
            {
              type: Datatypes.STRING,
              primaryKey: true,
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