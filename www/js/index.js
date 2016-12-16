const $ = require( "jquery" );
const qwest = require( "qwest" );
const toastr = require( "toastr" );
qwest.setDefaultDataType("json");

var sessionId = null;

function postYou( msg ) {
    $("#history").append( $("<div></div>")
        .text( "You: " + msg )
        .css( "color", "red" )
    );
}

function postBot( msg ) {
    $("#history").append( $("<div></div>")
        .text( "Bot: " + msg )
        .css( "color", "blue" )
    );
}

function unwrap( _xhr, res ) {
    if( res.error )
        return Promise.reject( res.error );
    else if( res.result )
        return Promise.resolve( res.result );
    return Promise.resolve();
}

$(document).ready( function() {

    // start a new conversation
    qwest.post( "/api/web" )
        .then( unwrap )
        .then( (id) => { sessionId = id; } )
        .catch( (e) => toastr.error( e ) );

    $("#btn").on( "click", function() {

        // add your message to the chat log
        var msg = $("#msg").val();
        $("#msg").val("");
        postYou( msg );

        // send your message and get the response
        qwest.put( "/api/web/" + sessionId, { answer : msg } )
            .then( unwrap )
            .then( resp => postBot( resp ) )
            .catch( (e) => toastr.error( e ) );
    });

});
