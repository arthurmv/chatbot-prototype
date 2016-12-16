const winston = require( "winston" );
const connectPromiser = require( "connect-promiser" );
const bodyParser = require( "body-parser" );
const express = require( "express" );
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
    res.send( twiml.toString() );
}

async function receiveSMS( req, res, next ) {
    res.promise( next, async function() {
        var twiml = new twilio.TwimlResponse();
        var sms = await model.vectors.sms.get( req.body.From );
        if( sms === null ) {
            await newSMS( req, res );
            return;
        }
        var conv = await model.conversation.get( sms.conversation_id );
        var resp = await reply( conv, req.body.Body );
        twiml.message( resp );
        res.send( twiml.toString() );
    });
}

async function newWeb( _req, res, next ) {
    res.promise( next, async function() {
        var id = await model.conversation.new();
        var webId = await model.vectors.web.new( id );
        res.json( { result : webId } );
    });
}

async function receiveWeb( req, res, next ) {
    res.promise( next, async function() {
        var web = await model.vectors.web.get( req.params.id );
        if( web === null )
            return await newWeb( req, res );
        var conv = await model.conversation.get( web.conversation_id );
        var resp = await reply( conv, req.body.answer );
        res.json( { result : resp } );
    });
}

function errHandler( error, req, res, _next ) {
    winston.error( error );
    res.json( { error : error.message.toString() } );
}

module.exports = function() {
    return express.Router()
        .use( connectPromiser )
        .post( "/sms", bodyParser.urlencoded({ extended : true }), receiveSMS )
        .post( "/web", newWeb )
        .put( "/web/:id", bodyParser.json(), receiveWeb )
        .use( errHandler );
};
