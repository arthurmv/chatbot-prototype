const pgp = require( "pg-promise" );
const moment = require( "moment" );

var db = null;

function initDb() {
    var connStr = "postgres://dbuser:dbuser@localhost:5432/todo_list_example_app";
    db = pgp( connStr );
}

async function newConversation() {
    const sql = "INSERT INTO conversation VALUES ( DEFAULT, DEFAULT, DEFAULT, DEFAULT ) RETURNING id";
    var returned = await db.one( sql );
    return returned.id;
}

async function getConversation( id ) {
    const sql = "SELECT * FROM conversation WHERE id = $1";
    return await db.one( sql, [ id ] );
}

async function updateConversation( conv ) {
    const sql = "UPDATE conversation SET state = ${state}, data = ${data}, lastUpdate = ${lastUpdate}";
    conv.lastUpdate = moment();
    await db.none( sql, conv );
}

async function newSMS( mobileNumber, conversationId ) {
    const sql = "INSERT INTO sms VALUES ( $1, $2 ) RETURNING id";
    var returned = await db.one( sql, [ mobileNumber, conversationId ] );
    return returned.id;
}

async function getSMS( id ) {
    const sql = "SELECT * FROM sms WHERE id = $1"; 
    return await db.oneOrNone( sql, [ id ] );
}

async function newWeb( conversationId ) {
    const sql = "INSERT INTO web VALUES ( DEFAULT, 1 ) RETURNING id";
    var returned = await db.one( sql, [ conversationId ] );
    return returned.id;
}

async function getWeb( id ) {
    const sql = "SELECT * FROM web WHERE id = $1";
    return await db.oneOrNone( sql, [ id ] );
}

async function expire() {
    var cutOff = moment().subtract( 8, "hours" );
    const sql = "UPDATE conversation SET state = NULL where lastUpdate < $1";
    await db.none( sql, [ cutOff ] );
}

async function purge() {
    const sql = "DELETE FROM $1~ WHERE conversation_id NOT IN ( SELECT id FROM conversation WHERE state IS NOT NULL )";
    await db.none( sql, [ "web" ] );
    await db.none( sql, [ "sms" ] );
}

module.exports = {
    initDb,
    purge : purge,
    expire : expire,
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
