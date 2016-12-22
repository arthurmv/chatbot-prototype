const babel = require("babel-core");
const path = require( "path" );
const auto = require( "auto-builder" );
const _ = require( "underscore" );
const fsp = require("fs-promise");
const ugly = require( "uglify-js" );
const browserify = require("browserify");
const winston = require("winston");
const pug = require("pug");

const operations = [
    {
        pipeline : [],
        filter : [ "deploy.json" ],
        target : "dist/<%= dir %>/<%= base %><%= ext %>"
    },
    {
        pipeline : [ compileToES7 ],
        filter : [ "*.js", "lib/**/*.js" ],
        target : "dist/<%= dir %>/<%= base %><%= ext %>"
    },
    {
        pipeline : [ compileToES7, compileToES6, compileToES5 ],
        filter : [ "www/**/*.js" ],
        target : "dist/<%= dir %>/<%= base %><%= ext %>"
    },
    {
        pipeline : [ compileToHtml ],
        filter : [ "www/**/*.pug" ],
        target : "dist/<%= dir %>/<%= base %>.html"
    },
    {
        pipeline : [ bundle, uglify ],
        filter : [ "dist/www/**/*.js" ],
        target : "<%= dir %>/<%= base %><%= ext %>"
    }
];

// transform our pug files into html
function compileToHtml( filePath ) {
    winston.debug( "compiling pug file", filePath );
    return fsp.readFile( filePath )
        .then( data => pug.render( data, { filename : filePath, basedir : __dirname } ) )
        .then( data => fsp.writeFile( filePath, data ) );
}

// perform babel compilation from es17 -> es16
// this is sufficient for node to run - so backend doesn't need to be compiled down further
function compileToES7( filePath ) {
    winston.debug( "compiling ES8 to ES7 file", filePath );
    var opts = {  presets : [ require.resolve( "babel-preset-es2017" ) ] };
    return fsp.readFile( filePath )
        .then( data => babel.transform( data, opts ).code )
        .then( data => fsp.writeFile( filePath, data ) );
}

// perform babel compilation from es16 -> es5 in two steps
// we can run our front-end js on all browsers at this point
function compileToES6( filePath ) {
    winston.debug( "compiling ES7 -> ES6 file", filePath );
    var opts = { presets : [ require.resolve( "babel-preset-es2016" ) ] };
    return fsp.readFile( filePath )
        .then( data => babel.transform( data, opts ).code )
        .then( data => fsp.writeFile( filePath, data ) );
}

function compileToES5( filePath ) {
    winston.debug( "compiling ES6 -> ES5 file", filePath );
    var opts = {
        presets : [ require.resolve( "babel-preset-es2015" ) ],
        plugins : [ [ require.resolve( "babel-plugin-transform-runtime" ), { regenerator : true } ] ] 
    };
    return fsp.readFile( filePath )
        .then( data => babel.transform( data, opts ).code )
        .then( data => fsp.writeFile( filePath, data ) );
}

// minification (for front-end code)
function uglify( filePath ) {
    winston.debug( "uglifying file", filePath );
    return fsp.readFile( filePath, "utf-8" )
        .then( data => ugly.minify( data, { fromString : true } ).code )
        .then( data => fsp.writeFile( filePath, data ) );
}

// browserification (condense all requires into a single file -> only a single js file dependency per page)
function bundle( filePath ) {
    filePath = path.resolve( filePath );
    winston.debug( "bundling file", filePath );
    var base = new Promise( function( res, rej ) {
        var b = browserify();
        b.add( filePath );
        b.bundle( (err,code) => err ? rej( err ) : res( code ) );
    });
    return base.then( data => fsp.writeFile( filePath, data ) );
}

if( require.main === module ) {
    winston.level = "debug";
    _.reduce( operations, (l,op) => l.then( () => auto( op, {} ) ), Promise.resolve() );
}
else
    module.exports = operations;
