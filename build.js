const isRoot = require( "is-root" );
const babel = require("babel-core");
const fsp = require("fs-promise");
const path = require("path");
const globby = require("globby");
const _ = require( "underscore" );
const ugly = require( "uglify-js" );
const browserify = require("browserify");
const winston = require("winston");
const replaceExt = require("replace-ext");
const mkdirp = require("mkdirp-promise");
const pug = require("pug");

// ensure regardless of where the buildFn is called from, our cwd is set to *this* directory
const globbyOpts = { cwd : __dirname, absolute : true };
const cfg = {
    dist : "dist", 
    backend : [ "*.js", "lib/**.js" ],
    frontend : [ "www/js/**.js" ] ,
    mains : [ "www/js/*.js" ],
    pug : [ "www/**.pug" ],
    assets : [ "www/css/**.css", "www/img/**.*", "www/json/**.json", "deploy.json" ]
};

// take an absolute path, and resolve its "staging path" (usually within a /dist folder)
// copy the file to said staging path and return the path
function stageFile( filePath, newExt ) {
    var relPath = path.relative( __dirname, filePath );
    var stagePath = path.join( __dirname, cfg.dist, relPath );
    if( newExt !== undefined )
        stagePath = replaceExt( stagePath, newExt );
    winston.info( "staging file: " + filePath + " to location: " + stagePath );
    return mkdirp( path.dirname( stagePath ) )
        .then( () => fsp.readFile( filePath ) )
        .then( x => fsp.writeFile( stagePath, x ) )
        .then( () => stagePath );
}

// perform some specified transformation on a staged file - overwriting the contents as we go...
function transformFile( filePath, tFn ) {
    return tFn( filePath ).then( data => fsp.writeFile( filePath, data ) );
}

// transform our pug files into html
function compilePug( filePath ) {
    winston.info( "compiling pug file: " + filePath );
    return fsp.readFile( filePath )
        .then( data => Promise.resolve( pug.render( data, {} ) ) );
}

// perform babel compilation from es17 -> es16
// this is sufficient for node to run - so backend doesn't need to be compiled down further
function compileES17ES16( filePath ) {
    winston.info( "compiling (ES17->ES16) file: " + filePath );
    var opts = { 
        presets : [ require.resolve( "babel-preset-es2017" ) ]
    };
    return fsp.readFile( filePath )
        .then( data => Promise.resolve( babel.transform( data, opts ).code ) );
}

// perform babel compilation from es16 -> es5 in two steps
// we can run our front-end js on all browsers at this point
function compileES16ES5( filePath ) {
    winston.info( "compiling (ES16->ES5) file: " + filePath );
    return fsp.readFile( filePath )
        .then( function( data ) {
            var es15 = babel.transform( data, { 
                presets : [ require.resolve( "babel-preset-es2016" ) ] 
            } ).code;
            var es5 = babel.transform( es15, { 
                presets : [ require.resolve( "babel-preset-es2015" ) ],
                plugins : [ [ require.resolve( "babel-plugin-transform-runtime" ), { regenerator : true } ] ] 
            } ).code;
            return Promise.resolve( es5 );
        } );
}

// minification (for front-end code)
function uglify( filePath ) {
    winston.info( "uglifying file: " + filePath );
    return Promise.resolve( ugly.minify( filePath ).code );
}

// browserification (condense all requires into a single file -> only a single js file dependency per page)
function bundle( filePath ) {
    winston.info( "bundling file: " + filePath );
    return new Promise( function( r ) {
        var b = browserify();
        b.add( filePath );
        b.bundle( (err,res) => r(res) );
    });
}

function buildBackend() {
    return Promise.resolve()
        .then( () => globby( cfg.backend, globbyOpts ) )
        .then( paths => Promise.all( _.map( paths, function( path ) {
            return stageFile( path ).then( function( staged ) {
                return transformFile( staged, compileES17ES16 );
            });
        } ) ) );
}

function buildFrontend() {
    return Promise.resolve()
        .then( () => globby( cfg.frontend, globbyOpts ) )
        .then( paths => Promise.all( _.map( paths, function( path ) {
            return stageFile( path ).then( function( staged ) {
                Promise.resolve()
                    .then( () => transformFile( staged, compileES17ES16 ) )
                    .then( () => transformFile( staged, compileES16ES5 ) );
            } );
        } ) ) )
        .then( () => globby( _.map( cfg.mains, x => path.join( cfg.dist, x ) ), globbyOpts ) )
        .then( paths => Promise.all( _.map( paths, function( path ) {
            return transformFile( path, bundle )
                .then( () => transformFile( path, uglify ) );
        } ) ) )
        .then( () => globby( cfg.pug, globbyOpts ) )
        .then( paths => Promise.all( _.map( paths, function( path ) {
            return stageFile( path, ".html" ).then( function( staged ) {
                return transformFile( staged, compilePug );
            });
        } ) ) )
        .then( () => globby( cfg.assets, globbyOpts ) )
        .then( paths => Promise.all( _.map( paths, function( path ) {
            return stageFile( path );
        } ) ) );
}

// clear dist directory
function clearDist() {
    return fsp.emptyDir( path.join( __dirname, cfg.dist ) );
}

function build() { 
    return Promise.resolve()
        .then( clearDist )
        .then( buildBackend )
        .then( buildFrontend );
}

if( require.main == module ) {
    if( isRoot() ) 
        // if we run as root, all created files will have nasty permissions which means we
        // won't be able to rerun the build script not as root - which sucks
        throw new Error( "you don't want to build as root" );
    build();
}
else
    module.exports = build;
