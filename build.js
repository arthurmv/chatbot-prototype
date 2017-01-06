const babel = require("babel-core");
const minimatch = require( "minimatch" );
const globby = require( "globby" );
const ejs = require( "ejs" );
const path = require( "path" );
const auto = require( "auto-builder" );
const fsp = require("fs-promise");
const ugly = require( "uglify-js" );
const browserify = require("browserify");
const winston = require("winston");
const pug = require("pug");

function compileToHtml( src, tgt ) {
    winston.debug( "compiling to html", src, tgt );
    return fsp.readFile( src )
        .then( data => pug.render( data, { filename : src, basedir : __dirname } ) )
        .then( data => fsp.writeFile( tgt, data ) );
}

function compileToES7( src, tgt ) {
    winston.debug( "compiling to es7", src, tgt );
    var opts = {  presets : [ require.resolve( "babel-preset-es2017" ) ] };
    return fsp.readFile( src )
        .then( data => babel.transform( data, opts ).code )
        .then( data => fsp.writeFile( tgt, data ) );
}

function compileToES5( src, tgt ) {
    winston.debug( "compiling to es5 via es6", src, tgt );
    var es6Opts = { presets : [ require.resolve( "babel-preset-es2016" ) ] };
    var es5Opts = {
        presets : [ require.resolve( "babel-preset-es2015" ) ],
        plugins : [ [ require.resolve( "babel-plugin-transform-runtime" ), { regenerator : true } ] ] 
    };
    return fsp.readFile( src )
        .then( data => babel.transform( data, es6Opts ).code )
        .then( data => babel.transform( data, es5Opts ).code )
        .then( data => fsp.writeFile( tgt, data ) );
}

function bundle( src, tgt ) {
    winston.debug( "bundling js", src, tgt );
    var base = new Promise( function( res, rej ) {
        var b = browserify();
        b.add( path.resolve( src ) );
        b.bundle( (err,code) => err ? rej( err ) : res( code ) );
    });
    return base
        .then( data => data.toString( "utf8" ) )
        .then( data => ugly.minify( data, { fromString : true } ).code )
        .then( data => fsp.writeFile( tgt, data ) );
}

function transform( p, templ ) {
    var ext = path.extname( p );
    var base = path.basename( p, ext );
    var dir = path.dirname( p );
    return ejs.render( templ, { ext, base, dir } );
}

function generate() {


    return Promise.resolve()
        .then( () => globby( [ "*.{js,json}", "lib/**/*.js", "www/**/*.{js,html}" ] ) )
        .then( function( paths ) {

            var base = {
                "dist/build" : { dependencies : [] },
                "dist/clean" : { dependencies : [ "dist/.clean" ], recipe : () => fsp.emptyDir( "dist" ) },
                "dist/.clean" : {}
            };

            var frontLibDeps = [];

            for( let src of paths ) {
                // is a dependency to front end main js files as could be required via browserify 
                if( minimatch( src, "www/js/**/*.js" ) )
                    frontLibDeps.push( transform( src, "dist/<%= dir %>/<%= base %>.js" ) );
            }

            for( let src of paths ) {
                // is a javascript file
                if( minimatch( src, "**/*.js" ) ) {
                    let tgt = transform( src, "dist/<%= dir %>/<%= base %>.js" );
                    base[ "dist/build" ].dependencies.push( tgt );
                    // is it a front end file - if so we must go from es7 -> es5 -> potentially bundle
                    if( minimatch( src, "www/**/*.js" ) ) {
                        let es7 = transform( src, "dist/<%= dir %>/<%= base %>.js.es7" );
                        base[ es7 ] = { dependencies : [ src ], recipe : () => compileToES7( src, es7 ) };
                        // is it a library file - if so just compile to es5 and finish
                        if( minimatch( src, "www/js/**/*.js" ) )
                            base[ tgt ] = { dependencies : [ es7 ], recipe : () => compileToES5( es7, tgt ) };
                        // otherwise, we must also bundle..
                        else {
                            let es5 = transform( src, "dist/<%= dir %>/<%= base %>.js.es5" );
                            base[ es5 ] = { dependencies : [ es7 ], recipe : () => compileToES5( es7, es5 ) };
                            base[ tgt ] = { dependencies : [ es5 ].concat( frontLibDeps ), recipe : () => bundle( es5, tgt ) };
                        }
                    // otherwise its a simple es7 compilation and we're done
                    } else
                        base[ tgt ] = { dependencies : [ src ], recipe : () => compileToES7( src, tgt ) };
                // is a pug file (to go to html)
                } else if( minimatch( src, "www/**/*.pug" ) ) {
                    let tgt = transform( src, "dist/<%= dir %>/<%= base %>.html" );
                    base[ "dist/build" ].dependencies.push( tgt );
                    base[ tgt ] = { dependencies : [ src ], recipe : () => compileToHtml( src, tgt ) };
                // is a remaining static asset to transfer
                } else {
                    let tgt = transform( src, "dist/<%= dir %>/<%= base %><%= ext %>" );
                    base[ "dist/build" ].dependencies.push( tgt );
                    base[ tgt ] = { dependencies : [ src ], recipe : () => fsp.copy( src, tgt ) };

                }
            }
            return base;
        });
}

if( require.main === module ) {

    winston.level = "debug";

    Promise.resolve()
        .then( () => generate() )
        .then( recipes => auto( recipes ) )
        .then( runner => runner( process.argv.slice(2) ) )
        .then( () => winston.info( "auto-build completed" ) )
        .catch( function( err ) {
            winston.error( err );
            process.exit(1);
        });
}
else
    module.exports = generate;
