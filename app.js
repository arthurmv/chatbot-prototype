const path = require( "path" );
const bodyParser = require( "body-parser" );
const winston = require( "winston" );
const isRoot = require( "is-root" );
const downgradeRoot = require( "downgrade-root" );
const express = require( "express" );
const ServerFactory = require( "vhost-easy" );

const model = require( "./lib/model" );
const deployCfg = require( "./deploy.json" );
const promiseHandler = require( "./lib/err" );
const api = require( "./lib/api" );

function buildOpts( hostname ) {
    return { hostname : hostname, port : 80, secure : false };
}

function attachAPI( app ) {
    app.post( "/api/sms", bodyParser.urlencoded({extended:true}), promiseHandler( api.sms ) );
    app.post( "/api/web", bodyParser.json(), promiseHandler( api.web.new ) );
    app.put( "/api/web/:id", bodyParser.json(), promiseHandler( api.web.receive ) );
}

// create a server that redirects naked domains to a www. prefix
function deployWwwRedir( factory ) {
    var wwwRedir = express();
    attachAPI( wwwRedir );
    wwwRedir.use( (rq,rs) => rs.redirect( rq.protocol + "://www." + deployCfg.host + rq.originalUrl ) );
    factory.attach( wwwRedir, buildOpts( deployCfg.host ) );
}

// deploy the actual application
function deployMain( factory ) {
    var app = express();
    attachAPI( app );
    app.use( express.static( path.join( __dirname, "www" ) ) );
    factory.attach( app, buildOpts( "www." + deployCfg.host ) );
}

async function deploy( env, factory ) {

    // initialize the database
    model.initDb();

    // deploy a naked -> www redirecter
    deployWwwRedir( factory );

    // deploy the main application
    deployMain( factory );

}

if( require.main == module ) {
    if( !isRoot() )
        // we won't be able to bind to ports 80 & 443 if we aren't root
        throw new Error( "need root privileges to bind to ports 80 & 443" );
    var factory = new ServerFactory();
    deploy( null, factory ).then( function() {
        // to stop an errant server from doing serious damage to the instance
        // best to remove priviliges ASAP...
        winston.info( "servers have been set up - removing root priviliges" );
        downgradeRoot();
    });
}
else
    module.exports = deploy;

