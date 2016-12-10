const twilio = require( "twilio" );
const model = require( ".model" );
const core = require( ".core" );

async function newSMS( req, res ) {
    var twiml = new twilio.TwimlResponse();
    var conv = model.conversation.new();
    var resp = await core.respondToAnswer( conv, null );
    await model.vectors.sms.new( req.body.From, conv.id );
    twiml.message( resp );
    res.send( twiml );
}

async function receiveSMS( req, res ) {
    var twiml = new twilio.TwimlResponse();
    var sms = await model.vectors.sms.get( req.body.From );
    if( sms === null )
        return await newSMS( req, res );
    var conv = await model.conversation.get( sms.conversation_id );
    var resp = await core.respondToAnswer( conv, req.body.Body );
    twiml.message( resp );
    res.send( twiml );
}

async function newWeb( _req, res ) {
    var conv = model.conversation.new();
    var resp = await core.respondToAnswer( conv, null );
    var web = await model.vectors.web.new( conv.id );
    res.json( { id : web.id, reply : resp } );
}

async function receiveWeb( req, res ) {
    var web = await model.vectors.sms.get( req.params.id );
    if( web === null )
        return await newWeb( req, res );
    var conv = await model.conversation.get( web.conversation_id );
    var resp = await core.respondToAnswer( conv, req.body.answer );
    res.json( { reply : resp } );
}

module.exports = {
    sms : receiveSMS,
    web : {
        receieve : receiveWeb,
        new : newWeb
    }
};

