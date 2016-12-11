const $ = require( "jquery" );
const qwest = require( "qwest" );
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

$(document).ready( function() {

    qwest.post( "/api/web" )
        .then( function( _xhr, data ) {
            sessionId = data.id;
            postBot( data.reply );
        });

    $("#btn").on( "click", function() {
        var msg = $("#msg").val();
        $("#msg").val("");
        postYou( msg );
        qwest.put( "/api/web/" + sessionId, { answer : msg } )
            .then( function( _xhr, data ) {
                postBot( data.reply );
            });
    });

});
