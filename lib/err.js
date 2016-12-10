const winston = require( "winston" );

module.exports = function( fn ){
    return async function( req,res ) {
        try {
            return await fn( req,res );
        }
        catch( e ) {
            winston.error( e );
            res.json( { error : {
                msg : e.msg || "Something unexpected happened",
                code : -1
            } } );
        }
    };
};

