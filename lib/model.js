const pgp = require( "pg-promise" )();
const winston = require( "winston" );
const uuid = require( "node-uuid" );
const moment = require( "moment" );
const deployCfg = require( "../deploy.json" );

var db = null;

function initDb() {
    db = pgp( deployCfg.db );
}

async function newConversation() {
    winston.debug( "creating new abstract conversation" );
    const sql = "INSERT INTO conversation VALUES ( DEFAULT, $1, $2, $3 ) RETURNING id";
    var returned = await db.one( sql, [ "init", JSON.stringify({}), moment() ] );
    return returned.id;
}

async function getConversation( id ) {
    winston.debug( "getting conversation", id );
    const sql = "SELECT * FROM conversation WHERE id = $1";
    var convo = await db.one( sql, [ id ] );
    return convo;
}

async function updateConversation( conv ) {
    winston.debug( "updating conversation", conv.id );
    const sql = "UPDATE conversation SET state = ${state}, data = ${data}, last_update = ${last_update}";
    conv.last_update = moment();
    await db.none( sql, conv );
}

async function newSMS( mobileNumber, conversationId ) {
    winston.debug( "creating new sms conversation", mobileNumber );
    const sql = "INSERT INTO sms VALUES ( $1, $2 )";
    await db.none( sql, [ mobileNumber, conversationId ] );
}

async function getSMS( id ) {
    winston.debug( "getting sms conversation", id );
    const sql = "SELECT * FROM sms WHERE id = $1";
    return await db.oneOrNone( sql, [ id ] );
}

async function newWeb( conversationId ) {
    winston.debug( "creating new web conversation" );
    var id = uuid.v4();
    const sql = "INSERT INTO web VALUES ( $1, $2 )";
    await db.none( sql, [ id, conversationId ] );
    return id;
}

async function getWeb( id ) {
    winston.debug( "getting web conversation", id  );
    const sql = "SELECT * FROM web WHERE id = $1";
    return await db.oneOrNone( sql, [ id ] );
}

async function purge() {
    winston.debug( "purging old conversations.." );
    var cutOff = moment().subtract( 4, "hours" );
    const sql = "DELETE FROM conversation WHERE last_update < $1";
    await db.none( sql, [ cutOff ] );
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
