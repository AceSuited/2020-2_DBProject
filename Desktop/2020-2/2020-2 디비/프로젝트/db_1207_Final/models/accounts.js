module.exports = (sequelize, Datatypes) => { 
    return {
      'account': sequelize.define('account', {
        AccID:
        {
          type: Datatypes.STRING,
          primaryKey: true,
          allowNull: false
          
        },
        Password:
        {
          type: Datatypes.STRING,
          allowNull: false
        },
        Name:
        {
          type: Datatypes.STRING
        },
        Gender:
        {
          type: Datatypes.STRING
        },
        Phone_Number:
        {
          type: Datatypes.STRING
        },
        Address:
        {
          type: Datatypes.STRING
        },
        DOB:
        {
          type:Datatypes.DATE
        }
      },
      {
        freezeTableName: true,
        timestamps: false,
        onDelete: 'cascade'
      }),
      'administrator': sequelize.define('administrator', {
        AccID_Admin:
        {
          type: Datatypes.STRING,
          primaryKey: true,
          allowNull: false
        }
      },
      {
        freezeTableName: true,
        timestamps: false,
        onDelete: 'cascade',
        references: {
          model: 'account',
          key: 'AccID'
        },
      }),
      'evaluator': sequelize.define('evaluator', {

        AccID_Eval:
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
      'submitter': sequelize.define('submitter', {
        AccID_Submit:
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