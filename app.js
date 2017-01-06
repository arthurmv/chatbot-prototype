const path = require( "path" );
const schedule = require( "node-schedule" );
const winston = require( "winston" );
const isRoot = require( "is-root" );
const downgradeRoot = require( "downgrade-root" );
const express = require( "express" );
const ServerFactory = require( "vhost-easy" );

const model = require( "./lib/model" );
const deployCfg = require( "./deploy.json" );
const api = require( "./lib/api" );

// redirect all trafic to www.hostname on either http/https
function wwwRedirect( req, res ) {
    var url = req.protocol + "://www." + deployCfg.hostname + req.originalUrl;
    res.redirect( url );
}

// deploy a naked -> www redirecter
function deployWwwRedir( factory ) {
    factory.attach( express().use( wwwRedirect ), {
        port : deployCfg.port,
        hostname : deployCfg.hostname,
        secure : false
    } );
}

// deploy the static site content
function deployMain( factory ) {
    var app = express()
        .use( express.static( path.join( __dirname, "www" ) ) )
        .use( "/api", api() );
    factory.attach( app, {
        port : deployCfg.port,
        hostname : "www." + deployCfg.hostname,
        secure : false
    });
}

// deploy the whole bloody lot
async function deploy( factory ) {
    model.initDb();
    deployWwwRedir( factory );
    deployMain( factory );
    schedule.scheduleJob( "0 * * * *", model.purge );
}

if( require.main == module ) {
    winston.level = deployCfg.logLevel;
    if( !isRoot() )
        // we won't be able to bind to ports 80 & 443 if we aren't root
        throw new Error( "need root privileges to bind to ports 80 & 443" );
    var factory = new ServerFactory();
    deploy( factory ).then( function() {
        // to stop an errant server from doing serious damage to the instance
        // best to remove priviliges ASAP...
        winston.info( "servers have been set up - removing root priviliges" );
        downgradeRoot();
    });
}
else
    module.exports = deploy;

