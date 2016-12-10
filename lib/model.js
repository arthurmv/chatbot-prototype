const pgp = require( "pg-promise" );
var db = null;

function initDb() {
    var connStr = "postgres://dbuser:dbuser@localhost:5432/todo_list_example_app";
    db = pgp( connStr );
}

async function newConversation() {
    var returned = await db.query( "insert into conversation values (default,'init',default,'{}') returning id" );
    return returned[0].id;
}

async function getConversation( id ) {
    var returned = await db.query( "select * from conversation where id = $1", id );
    return returned[0];
}

async function updateConversation() {

}

async function newSMS() {
}

async function getSMS() {

}

async function newWeb() {

}

async function getWeb() {

}

async function purge() {
}

module.exports = {
    initDb,
    purge : purge,
    conversation : {
        new : newConversation,
        get : getConversation,
        put : updateConversation
    },
    vectors : {
        sms : {
            new : newSMS,
            get : getSMS
        },
        web : {
            new : newWeb,
            get : getWeb
        }
    }
};
