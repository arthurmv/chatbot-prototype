const pgp = require( "pg-promise" )();
const uuid = require( "node-uuid" );
const moment = require( "moment" );
const deployCfg = require( "../deploy.json" );

var db = null;

function initDb() {
    db = pgp( deployCfg.db );
}

async function newConversation() {
    const sql = "INSERT INTO conversation VALUES ( DEFAULT, $1, $2, $3 ) RETURNING id";
    var returned = await db.one( sql, [ "init", JSON.stringify({}), moment() ] );
    return returned.id;
}

async function getConversation( id ) {
    const sql = "SELECT * FROM conversation WHERE id = $1";
    var convo = await db.one( sql, [ id ] );
    return convo;
}

async function updateConversation( conv ) {
    const sql = "UPDATE conversation SET state = ${state}, data = ${data}, last_update = ${last_update}";
    conv.last_update = moment();
    await db.none( sql, conv );
}

async function newSMS( mobileNumber, conversationId ) {
    const sql = "INSERT INTO sms VALUES ( $1, $2 )";
    await db.none( sql, [ mobileNumber, conversationId ] );
}

async function getSMS( id ) {
    const sql = "SELECT * FROM sms WHERE .id = $1";
    return await db.oneOrNone( sql, [ id ] );
}

async function newWeb( conversationId ) {
    var id = uuid.v4();
    const sql = "INSERT INTO web VALUES ( $1, $2 )";
    await db.none( sql, [ id, conversationId ] );
    return id;
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
