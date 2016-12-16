const isRoot = require( "is-root" );
const ejs = require( "ejs" );
const babel = require("babel-core");
const fsp = require("fs-promise");
const path = require("path");
const globby = require("globby");
const _ = require( "underscore" );
const ugly = require( "uglify-js" );
const browserify = require("browserify");
const winston = require("winston");
const pug = require("pug");

const cfg = {
    dist : "dist",
    workSet : [
        {
            pipeline : [ compileToES7 ],
            filter : [ "*.js", "lib/**/*.js" ],
            target : "<%= dist %>/<%= dir %>/<%= base %><%= ext %>"
        },
        {
            pipeline : [ compileToES7, compileToES6, compileToES5 ],
            filter : [ "www/js/*.js" ],
            target : "<%= dist %>/<%= dir %>/<%= base %><%= ext %>"
        },
        {
            pipeline : [ compileToHtml ],
            filter : [ "www/**/*.pug" ],
            target : "<%= dist %>/<%= dir %>/<%= base %>.html"
        },
        {
            pipeline : [],
            filter : [ "deploy.json" ],
            target : "<%= dist %>/<%= dir %>/<%= base %><%= ext %>"
        },
        {
            pipeline : [ bundle, uglify ],
            filter : [ "<%= dist %>/www/js/*.js" ],
            target : "<%= dir %>/<%= base %><%= ext %>"
        }
    ]
};

// transform our pug files into html
function compileToHtml( filePath ) {
    winston.info( "compiling pug file: " + filePath );
    return fsp.readFile( filePath )
        .then( data => Promise.resolve( pug.render( data, { basedir : __dirname } ) ) );
}

// perform babel compilation from es17 -> es16
// this is sufficient for node to run - so backend doesn't need to be compiled down further
function compileToES7( filePath ) {
    winston.info( "compiling ES8 to ES7 file: " + filePath );
    var opts = { 
        presets : [ require.resolve( "babel-preset-es2017" ) ]
    };
    return fsp.readFile( filePath )
        .then( data => Promise.resolve( babel.transform( data, opts ).code ) );
}

// perform babel compilation from es16 -> es5 in two steps
// we can run our front-end js on all browsers at this point
function compileToES6( filePath ) {
    winston.info( "compiling ES7 -> ES6 file: " + filePath );
    return fsp.readFile( filePath )
        .then( function( data ) {
            return Promise.resolve( babel.transform( data, { 
                presets : [ require.resolve( "babel-preset-es2016" ) ] 
            } ).code );
        });
}

function compileToES5( filePath ) {
    winston.info( "compiling ES7 -> ES6 file: " + filePath );
    return fsp.readFile( filePath )
        .then( function( data ) {
            return Promise.resolve( babel.transform( data, { 
                presets : [ require.resolve( "babel-preset-es2015" ) ],
                plugins : [ [ require.resolve( "babel-plugin-transform-runtime" ), { regenerator : true } ] ] 
            } ).code );
        });
}

// minification (for front-end code)
function uglify( filePath ) {
    winston.info( "uglifying file: " + filePath );
    return Promise.resolve( ugly.minify( filePath ).code );
}

// browserification (condense all requires into a single file -> only a single js file dependency per page)
function bundle( filePath ) {
    winston.info( "bundling file: " + filePath );
    return new Promise( function( res, rej ) {
        var b = browserify();
        b.add( filePath );
        b.bundle( function( err, result ) {
            if( err )
                rej( err );
            else
                res( result );
        });
    });
}

function processFile( set, src ) {
    var absSrc = path.join( __dirname, src );
    var destPath = path.join( __dirname, ejs.render( set.target, {
        dir : path.dirname( src ),
        base : path.basename( src, path.extname( src ) ),
        dist : cfg.dist,
        ext : path.extname( src )
    }));
    return _.reduce( set.pipeline, function(promise,transform) {
        return promise
            .then( () => transform( destPath ) )
            .then( (data) => fsp.writeFile( destPath, data ) );
    }, absSrc === destPath ? Promise.resolve() : fsp.copy( absSrc, destPath ) );
}

function processWorkSet( set ) {
    var instanced = _.map( set.filter, x => ejs.render( x, { dist : cfg.dist } ) );
    return globby( instanced, { cwd : __dirname } )
        .then( function( allPaths ) {
            return _.reduce( allPaths, (l,r) => l.then( () => processFile( set, r ) ), Promise.resolve() );
        });
}

function processWorkSets() {
    return _.reduce( cfg.workSet, (l,r) => l.then( () => processWorkSet( r ) ), Promise.resolve() );
}

function build() {
    return Promise.resolve()
        .then( () => fsp.emptyDir( path.join( __dirname, cfg.dist ) ) )
        .then( () => processWorkSets() );
}

if( require.main == module ) {
    if( isRoot() ) 
        // if we run as root, all created files will have nasty permissions which means we
        // won't be able to rerun the build script not as root - which sucks
        throw new Error( "you don't want to build as root" );
    build()
        .catch( e => winston.error(e) );
}
else
    module.exports = build;
