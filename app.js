const path = require( "path" );
const winston = require( "winston" );
const isRoot = require( "is-root" );
const downgradeRoot = require( "downgrade-root" );
const fsp = require( "fs-promise" );
const express = require( "express" );
const ServerFactory = require( "vhost-easy" );
const args = require( "yargs" )
    .default( "env", "local" )
    .argv;

const cfg = {
    hostname : {
        local : "pleasesend.pizza.devlop",
        prod : "pleasesend.pizza"
    },
    certRoot : {
        prod :  "/etc/letsencrypt/live/pleasesend.pizza"
    }
};

// build http connection options
function buildHttpOpts( host ) {
    return { port : 80, secure : false, hostname : host };
}

// build https connection options by reading the cert and key files into memory
function buildHttpsOpts( host, key, cert ) {

    return {
        hostname : host,
        port : 443,
        secure : true,
        key : key,
        cert : cert
    };
}

// create a server that redirects all http traffic of the form foobar and *.foobar to https
function deployHttpRedir( host, factory ) {
    var httpRedir = express();
    httpRedir.use( function( req, res ) {
        var fullUrl = "https://" + req.hostname + req.originalUrl;
        res.redirect( fullUrl );
    });
    var httpRedirOpts = buildHttpOpts( [ "*." + host, host ] );
    factory.attach( httpRedir, httpRedirOpts );
}

// create a server that redirects naked domains to a www. prefix
function deployWwwRedir( host, factory, optsFn ) {
    var wwwRedir = express();
    wwwRedir.use( (rq,rs) => rs.redirect( rq.protocol + "://www." + host + rq.originalUrl ) );
    var wwwRedirOpts = optsFn( host );
    factory.attach( wwwRedir, wwwRedirOpts );
}

// deploy the actual static application
function deployStatic( host, factory, optsFn ) {
    var staticApp = express.static( path.join( __dirname, "www" ) );
    var staticOpts = optsFn( "www." + host );
    factory.attach( staticApp, staticOpts );
}

async function deploy( env, factory ) {

    // the default options function should build http opts
    var optsFn = buildHttpOpts;

    // if we are using https, override the options fn appropriately and deploy an http -> https redirect
    if( cfg.certRoot[ env ] ) {
        deployHttpRedir( env, factory );
        // must read the key & cert details from disk..
        var key = await fsp.readFile( path.join( cfg.certRoot[env], "privkey.pem" ) );
        var cert = await fsp.readFile( path.join( cfg.certRoot[env], "fullchain.pem" ) );
        optsFn = (host) => buildHttpsOpts( host, key, cert );
    }

    // deploy a naked -> www redirecter
    deployWwwRedir( cfg.hostname[env], factory, optsFn );

    // deploy a static file server
    deployStatic( cfg.hostname[env], factory, optsFn );

}

if( require.main == module ) {
    if( !isRoot() )
        // we won't be able to bind to ports 80 & 443 if we aren't root
        throw new Error( "need root privileges to bind to ports 80 & 443" );
    var factory = new ServerFactory();
    deploy( args.env, factory ).then( function() {
        // to stop an errant server from doing serious damage to the instance
        // best to remove priviliges ASAP...
        winston.info( "servers have been set up - removing root priviliges" );
        downgradeRoot();
    });
}
else
    module.exports = deploy;

