const winston = require( "winston" );
const twilio = require( "twilio" );
const model = require( "./model" );
const reply = require( "./reply" );

async function newSMS( req, res ) {
    var twiml = new twilio.TwimlResponse();
    var id = await model.conversation.new();
    var conv = await model.conversation.get( id );
    var resp = await reply( conv, null );
    await model.vectors.sms.new( req.body.From, id );
    twiml.message( resp );
    winston.info( "new sms conversation started", { id, num : req.body.From } );
    res.send( twiml.toString() );
}

async function receiveSMS( req, res ) {
    var twiml = new twilio.TwimlResponse();
    var sms = await model.vectors.sms.get( req.body.From );
    if( sms === null )
        return await newSMS( req, res );
    var conv = await model.conversation.get( sms.conversation_id );
    var resp = await reply( conv, req.body.Body );
    twiml.message( resp );
    winston.info( "existing sms conversation continued", { id : conv.id, num : req.body.From } );
    res.send( twiml.toString() );
}

async function newWeb( _req, res ) {
    var id = await model.conversation.new();
    var webId = await model.vectors.web.new( id );
    winston.info( "new web conversation started", { id, webId } );
    res.json( { id : webId } );
}

async function receiveWeb( req, res ) {
    var web = await model.vectors.web.get( req.params.id );
    if( web === null )
        return await newWeb( req, res );
    var conv = await model.conversation.get( web.conversation_id );
    var resp = await reply( conv, req.body.answer );
    winston.info( "existing web conversation continued", { id : conv.id, webId : web.id } );
    res.json( { reply : resp } );
}

module.exports = {
    sms : receiveSMS,
    web : {
        receive : receiveWeb,
        new : newWeb
    }
};

